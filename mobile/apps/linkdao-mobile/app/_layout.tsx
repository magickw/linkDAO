/**
 * LinkDAO Mobile App Layout
 * Root layout with navigation and providers
 */

import { useEffect, useState } from 'react';
import { Stack, router, useSegments, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { useAuthStore } from '../src/store';
import { WalletLoginBridge } from '../src/components/WalletLoginBridge';
import { walletService } from '../src/services/walletConnectService';
import { socialMediaService } from '../src/services/socialMediaService';
import { setWalletAdapter } from '@linkdao/shared';
import ErrorBoundary from '../src/components/ErrorBoundary';

export default function RootLayout() {
  const { isAuthenticated } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const { walletAddress, signature, connector } = useLocalSearchParams();

  useEffect(() => {
    // Initialize wallet adapter
    setWalletAdapter({
      signMessage: async (message: string, address: string) => {
        return await walletService.signMessage(message, address);
      },
      getAccounts: () => {
        return walletService.getAccounts();
      },
      isConnected: () => {
        return walletService.isConnected();
      },
    });

    // Initialize wallet service
    const initWalletService = async () => {
      try {
        await walletService.initialize();
        console.log('✅ Wallet service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize wallet service:', error);
      }
    };

    initWalletService();

    // Enable mock authentication in development mode
    if (__DEV__ && !isAuthenticated) {
      console.log('🧪 Development mode: Enabling mock authentication');
      useAuthStore.getState().setMockAuth();
    }

    // Set up deep link listener for OAuth callbacks
    const handleDeepLink = async (event: { url: string }) => {
      const { path, queryParams } = Linking.parse(event.url);

      if (path === 'oauth-callback') {
        const result = await socialMediaService.handleOAuthCallback(event.url);

        if (result.success) {
          Alert.alert(
            'Connected!',
            `Successfully connected to ${result.platform}`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Connection Failed',
            result.error || 'Failed to connect account',
            [{ text: 'OK' }]
          );
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Mark as ready after initial render
    setIsReady(true);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';

    // Navigate only after root layout is ready
    // Redirect to auth if not authenticated and trying to access tabs
    if (!isAuthenticated && inTabsGroup) {
      router.replace('/auth');
    }
    // Redirect to tabs if authenticated and on auth screen
    else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isReady, segments]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          {/* Auto-authentication bridge for wallet connections */}
          <WalletLoginBridge
            autoLogin={true}
            walletAddress={walletAddress as string}
            connector={connector as any}
            onLoginSuccess={({ user }) => {
              console.log('✅ Auto-login successful for:', user.address);
            }}
            onLoginError={(error) => {
              console.error('❌ Auto-login failed:', error);
            }}
          />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
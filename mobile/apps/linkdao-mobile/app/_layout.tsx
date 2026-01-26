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
import { notificationService } from '../src/services/notificationService';
import { setWalletAdapter, setStorageProvider } from '@linkdao/shared';
import { enhancedAuthService } from '@linkdao/shared/services/enhancedAuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ErrorBoundary from '../src/components/ErrorBoundary';

import { StripeProvider } from '@stripe/stripe-react-native';

import { MetaMaskProvider, useSDK } from '@metamask/sdk-react-native';

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_PLACEHOLDER';

// Component to inject SDK state into the singleton service
function MetaMaskInjector() {
  const sdkState = useSDK();

  useEffect(() => {
    if (sdkState) {
      walletService.setMetaMaskSDK(sdkState);
    }
  }, [sdkState]);

  return null;
}

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

    // Initialize Storage Provider
    const initStorage = async () => {
      try {
        setStorageProvider(AsyncStorage);
        // Reload session now that storage is available
        if (enhancedAuthService.reloadSession) {
          await enhancedAuthService.reloadSession();
        }
        console.log('✅ Storage provider initialized');
      } catch (error) {
        console.error('❌ Failed to initialize storage provider:', error);
      }
    };
    initStorage();

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

    // Initialize notification service
    const initNotificationService = async () => {
      try {
        await notificationService.initialize();
        console.log('✅ Notification service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize notification service:', error);
      }
    };

    initNotificationService();

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
      notificationService.cleanup();
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
          <StripeProvider publishableKey={STRIPE_KEY}>
            <MetaMaskProvider
              debug={false}
              sdkOptions={{
                dappMetadata: {
                  name: "LinkDAO Mobile",
                  url: "https://linkdao.io", // Must match your deep link url scheme if possible but generic is fine for now
                }
              }}
            >
              <MetaMaskInjector />
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
            </MetaMaskProvider>
          </StripeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
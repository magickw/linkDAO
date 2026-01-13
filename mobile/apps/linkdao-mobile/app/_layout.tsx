/**
 * LinkDAO Mobile App Layout
 * Root layout with navigation and providers
 */

import { useEffect, useState } from 'react';
import { Stack, router, useSegments, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/store';
import { WalletLoginBridge } from '../src/components/WalletLoginBridge';

export default function RootLayout() {
  const { isAuthenticated } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const { walletAddress, signature, connector } = useLocalSearchParams();

  useEffect(() => {
    // Mark as ready after initial render
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(tabs)';

    // Navigate only after root layout is ready
    if (!isAuthenticated && inAuthGroup) {
      router.replace('/auth');
    } else if (isAuthenticated && !inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isReady, segments]);

  return (
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
          <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
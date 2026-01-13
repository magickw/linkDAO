/**
 * LinkDAO Mobile App Layout
 * Root layout with navigation and providers
 */

import { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/store';
import { authService } from '@linkdao/shared';

export default function RootLayout() {
  const { isAuthenticated, user, token, setUser, setToken, setLoading } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const segments = useSegments();

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        // Try to restore session from storage
        const response = await authService.restoreSession();
        if (response.success && response.data) {
          setToken(response.data.token);
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [setToken, setUser, setLoading]);

  useEffect(() => {
    // Only redirect after initialization is complete
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(tabs)';

    // If not authenticated and trying to access protected routes, redirect to auth
    if (!isAuthenticated && inAuthGroup) {
      router.replace('/auth');
    }

    // If authenticated and on auth page, redirect to tabs
    if (isAuthenticated && !inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isInitialized, segments]);

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
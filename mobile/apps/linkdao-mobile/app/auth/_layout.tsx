/**
 * Auth Layout
 * Authentication screens (login, register, wallet connect)
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="wallet-connect" options={{ headerShown: false }} />
    </Stack>
  );
}
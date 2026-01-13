/**
 * Modal Layout
 * Modal screens for create post, etc.
 */

import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create-post" options={{ headerShown: false }} />
    </Stack>
  );
}
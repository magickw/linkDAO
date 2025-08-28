import React from 'react';
import { View, Text } from 'react-native';

// This file is needed for Expo to find the entry point for the mobile app
// It re-exports the App component from app/mobile/src/App.tsx
export { default } from './mobile/src/App';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>LinkDAO Mobile App</Text>
    </View>
  );
}
import 'react-native-get-random-values';
import '@expo/standard-web-crypto';
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { initStorage } from './src/utils/storageImpl';

export default function App() {
  useEffect(() => {
    initStorage();
  }, []);

  return <AppNavigator />;
}

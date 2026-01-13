import 'react-native-reanimated';
import 'react-native-get-random-values';
import '@expo/standard-web-crypto';
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { initStorage } from './src/utils/storageImpl';
import { setupNotificationHandlers, registerForPushNotificationsAsync } from './src/utils/notifications';
import { initializePhishingDetector } from '@linkdao/shared/utils/phishingDetector';

export default function App() {
  useEffect(() => {
    initStorage();
    setupNotificationHandlers();
    registerForPushNotificationsAsync();
    initializePhishingDetector();
  }, []);

  return <AppNavigator />;
}

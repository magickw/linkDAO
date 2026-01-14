import React, { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import BiometricLockScreen from '../screens/settings/BiometricLockScreen';
import { BiometricService } from '../utils/biometrics';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkBiometricLockOnMount();
    setupAppStateListener();
  }, []);

  const checkBiometricLockOnMount = async () => {
    try {
      const enabled = await BiometricService.isEnabled();
      if (enabled) {
        // Check if we're within grace period
        const withinGrace = await BiometricService.isWithinGracePeriod();
        if (!withinGrace) {
          setIsLocked(true);
        }
      }
    } catch (error) {
      console.error('Error checking biometric lock on mount:', error);
    }
  };

  const setupAppStateListener = () => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      try {
        const enabled = await BiometricService.isEnabled();
        if (enabled && isAuthenticated) {
          // Check if we're within grace period
          const withinGrace = await BiometricService.isWithinGracePeriod();
          if (!withinGrace) {
            setIsLocked(true);
          }
        }
      } catch (error) {
        console.error('Error checking biometric lock on app state change:', error);
      }
    }
  };

  const handleUnlock = () => {
    setIsLocked(false);
    setIsAuthenticated(true);
  };

  const handleLockCancel = () => {
    // User cancelled - they can still access the app but will be locked again
    setIsLocked(false);
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Main" component={MainNavigator} />
        <Stack.Screen
          name="BiometricLock"
          component={BiometricLockScreen}
          options={{
            gestureEnabled: false,
            animationTypeForReplace: 'push',
          }}
          initialParams={{
            onUnlock: handleUnlock,
            onCancel: handleLockCancel,
          }}
        />
      </Stack.Navigator>

      {/* Render BiometricLockScreen as an overlay when locked */}
      {isLocked && (
        <BiometricLockScreen
          onUnlock={handleUnlock}
          onCancel={handleLockCancel}
        />
      )}
    </NavigationContainer>
  );
}

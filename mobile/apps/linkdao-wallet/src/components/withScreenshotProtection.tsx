import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { ScreenshotProtection } from '../utils/screenshotProtection';

/**
 * Higher-Order Component to add screenshot protection to a screen
 * 
 * Usage:
 * ```tsx
 * export default withScreenshotProtection(MySensitiveScreen);
 * ```
 */
export function withScreenshotProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> {
  const WithScreenshotProtection = (props: P) => {
    useEffect(() => {
      // Enable screenshot protection when component mounts
      if (Platform.OS === 'android') {
        ScreenshotProtection.enable();
      }

      // Disable screenshot protection when component unmounts
      return () => {
        if (Platform.OS === 'android') {
          ScreenshotProtection.disable();
        }
      };
    }, []);

    return <WrappedComponent {...props} />;
  };

  // Display name for debugging
  const wrappedComponentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  WithScreenshotProtection.displayName = `withScreenshotProtection(${wrappedComponentName})`;

  return WithScreenshotProtection;
}

/**
 * Hook to manually control screenshot protection
 * 
 * Usage:
 * ```tsx
 * function MyScreen() {
 *   const { enableProtection, disableProtection } = useScreenshotProtection();
 *   
 *   useEffect(() => {
 *     enableProtection();
 *     return () => disableProtection();
 *   }, []);
 *   
 *   return <View>...</View>;
 * }
 * ```
 */
export function useScreenshotProtection() {
  const enableProtection = () => {
    if (Platform.OS === 'android') {
      ScreenshotProtection.enable();
    }
  };

  const disableProtection = () => {
    if (Platform.OS === 'android') {
      ScreenshotProtection.disable();
    }
  };

  return {
    enableProtection,
    disableProtection,
    isSupported: Platform.OS === 'android',
  };
}
import { Platform } from 'react-native';
import { NativeModules } from 'react-native';

const { UIManager } = NativeModules;

/**
 * Screenshot Protection Utility
 * 
 * On Android: Uses FLAG_SECURE to prevent screenshots and screen recording
 * On iOS: Screenshot protection is limited, but we can detect when screenshots are taken
 */

export class ScreenshotProtection {
  private static isProtected: boolean = false;

  /**
   * Enable screenshot protection (Android only)
   * On iOS, this has no effect as iOS doesn't provide a programmatic way to prevent screenshots
   */
  static enable(): void {
    if (Platform.OS === 'android' && UIManager && UIManager.setLayoutFlagSecure) {
      try {
        UIManager.setLayoutFlagSecure(true);
        this.isProtected = true;
      } catch (error) {
        console.error('Error enabling screenshot protection:', error);
      }
    }
  }

  /**
   * Disable screenshot protection (Android only)
   */
  static disable(): void {
    if (Platform.OS === 'android' && UIManager && UIManager.setLayoutFlagSecure) {
      try {
        UIManager.setLayoutFlagSecure(false);
        this.isProtected = false;
      } catch (error) {
        console.error('Error disabling screenshot protection:', error);
      }
    }
  }

  /**
   * Check if screenshot protection is currently enabled
   */
  static isEnabled(): boolean {
    return this.isProtected;
  }

  /**
   * Check if screenshot protection is supported on the current platform
   */
  static isSupported(): boolean {
    return Platform.OS === 'android';
  }
}
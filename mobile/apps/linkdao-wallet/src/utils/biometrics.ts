import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@linkdao_biometric_enabled';
const BIOMETRIC_LAST_SUCCESS_KEY = '@linkdao_biometric_last_success';
const BIOMETRIC_GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

export interface BiometricConfig {
  enabled: boolean;
  lastSuccess?: number;
}

export class BiometricService {
  /**
   * Check if device supports biometric authentication
   */
  static async isSupported(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      return compatible;
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return false;
    }
  }

  /**
   * Check if biometric authentication is enrolled
   */
  static async isEnrolled(): Promise<boolean> {
    try {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('Error checking biometric enrollment:', error);
      return false;
    }
  }

  /**
   * Get available authentication types
   */
  static async getAuthenticationTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types;
    } catch (error) {
      console.error('Error getting authentication types:', error);
      return [];
    }
  }

  /**
   * Get human-readable authentication type name
   */
  static getAuthenticationTypeName(type: LocalAuthentication.AuthenticationType): string {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'Face ID';
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'Touch ID';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'Iris';
      default:
        return 'Biometric';
    }
  }

  /**
   * Enable biometric authentication for the app
   */
  static async enable(): Promise<boolean> {
    try {
      // First verify biometrics work
      const success = await this.authenticate('Enable biometric authentication');
      if (success) {
        await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error enabling biometrics:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  static async disable(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_LAST_SUCCESS_KEY);
    } catch (error) {
      console.error('Error disabling biometrics:', error);
    }
  }

  /**
   * Check if biometric authentication is enabled
   */
  static async isEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Get biometric configuration
   */
  static async getConfig(): Promise<BiometricConfig> {
    try {
      const enabled = await this.isEnabled();
      const lastSuccessStr = await AsyncStorage.getItem(BIOMETRIC_LAST_SUCCESS_KEY);
      const lastSuccess = lastSuccessStr ? parseInt(lastSuccessStr, 10) : undefined;
      
      return {
        enabled,
        lastSuccess,
      };
    } catch (error) {
      console.error('Error getting biometric config:', error);
      return { enabled: false };
    }
  }

  /**
   * Check if we're within the grace period after a successful authentication
   */
  static async isWithinGracePeriod(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      if (!config.lastSuccess) {
        return false;
      }
      
      const now = Date.now();
      const timeSinceLastSuccess = now - config.lastSuccess;
      return timeSinceLastSuccess < BIOMETRIC_GRACE_PERIOD_MS;
    } catch (error) {
      console.error('Error checking grace period:', error);
      return false;
    }
  }

  /**
   * Perform biometric authentication
   */
  static async authenticate(reason: string = 'Authenticate to access your wallet'): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Record successful authentication
        await AsyncStorage.setItem(BIOMETRIC_LAST_SUCCESS_KEY, Date.now().toString());
      }

      return result.success;
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      
      // Handle specific error codes
      if (error?.code === 'LOCKOUT') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else if (error?.code === 'NOT_ENROLLED') {
        throw new Error('No biometric data enrolled. Please set up Face ID or Touch ID in your device settings.');
      } else if (error?.code === 'NOT_AVAILABLE') {
        throw new Error('Biometric authentication is not available on this device.');
      }
      
      return false;
    }
  }

  /**
   * Authenticate with grace period check
   * Returns true if authenticated or within grace period
   */
  static async authenticateWithGrace(reason: string = 'Authenticate to access your wallet'): Promise<boolean> {
    try {
      // Check if we're within the grace period
      const withinGrace = await this.isWithinGracePeriod();
      if (withinGrace) {
        return true;
      }

      // Otherwise, require authentication
      return await this.authenticate(reason);
    } catch (error) {
      console.error('Error in authenticateWithGrace:', error);
      return false;
    }
  }

  /**
   * Reset the grace period (call when user manually locks the app)
   */
  static async resetGracePeriod(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_LAST_SUCCESS_KEY);
    } catch (error) {
      console.error('Error resetting grace period:', error);
    }
  }
}
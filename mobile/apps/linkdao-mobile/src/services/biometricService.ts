/**
 * Biometric Authentication Service
 * Handles Face ID, Touch ID, and fingerprint authentication
 */

import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import * as Keychain from 'react-native-keychain';

const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true,
  passcodeFallback: true,
});

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometryType?: BiometryTypes;
}

export interface BiometricConfig {
  enableBiometrics: boolean;
  biometryType?: BiometryTypes;
  lastUsed?: string;
}

const BIOMETRIC_KEY = 'linkdao_biometric_config';

/**
 * Check if biometric authentication is available
 */
export async function isBiometricAvailable(): Promise<{
  available: boolean;
  biometryType?: BiometryTypes;
}> {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return { available, biometryType };
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return { available: false };
  }
}

/**
 * Check if user has enabled biometric authentication
 */
export async function getBiometricConfig(): Promise<BiometricConfig | null> {
  try {
    // Check if Keychain module is available
    if (!Keychain) {
      console.warn('Keychain module is not available');
      return null;
    }

    // Check if getGenericPassword method exists
    if (typeof Keychain.getGenericPassword !== 'function') {
      console.warn('Keychain.getGenericPassword is not available');
      return null;
    }

    const config = await Keychain.getGenericPassword({
      service: 'linkdao',
    });

    if (config && config.password) {
      return JSON.parse(config.password) as BiometricConfig;
    }

    return null;
  } catch (error) {
    console.error('Error getting biometric config:', error);
    return null;
  }
}

/**
 * Enable biometric authentication
 */
export async function enableBiometrics(): Promise<BiometricAuthResult> {
  try {
    const { available, biometryType } = await isBiometricAvailable();

    if (!available) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
      };
    }

    // Prompt user to authenticate
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: 'Enable biometric authentication for LinkDAO',
      cancelButtonText: 'Cancel',
    });

    if (success) {
      // Save biometric config
      const config: BiometricConfig = {
        enableBiometrics: true,
        biometryType,
        lastUsed: new Date().toISOString(),
      };

      // Check if Keychain module is available
      if (!Keychain) {
        console.warn('Keychain module is not available');
        return {
          success: false,
          error: 'Keychain is not available on this platform',
        };
      }

      // Check if setGenericPassword method exists
      if (typeof Keychain.setGenericPassword !== 'function') {
        console.warn('Keychain.setGenericPassword is not available');
        return {
          success: false,
          error: 'Keychain.setGenericPassword is not available on this platform',
        };
      }

      await Keychain.setGenericPassword(
        BIOMETRIC_KEY,
        JSON.stringify(config),
        {
          service: 'linkdao',
          accessControl: Keychain.ACCESS_CONTROL?.BIOMETRY_ANY,
        }
      );

      return {
        success: true,
        biometryType,
      };
    }

    return {
      success: false,
      error: 'Authentication failed or was cancelled',
    };
  } catch (error: any) {
    console.error('Error enabling biometrics:', error);
    return {
      success: false,
      error: error.message || 'Failed to enable biometric authentication',
    };
  }
}

/**
 * Disable biometric authentication
 */
export async function disableBiometrics(): Promise<boolean> {
  try {
    // Check if Keychain module is available
    if (!Keychain) {
      console.warn('Keychain module is not available');
      return false;
    }

    // Check if resetGenericPassword method exists
    if (typeof Keychain.resetGenericPassword !== 'function') {
      console.warn('Keychain.resetGenericPassword is not available');
      return false;
    }

    await Keychain.resetGenericPassword({
      service: 'linkdao',
    });
    return true;
  } catch (error) {
    console.error('Error disabling biometrics:', error);
    return false;
  }
}

/**
 * Authenticate with biometrics
 */
export async function authenticateWithBiometrics(
  promptMessage: string = 'Authenticate to continue'
): Promise<BiometricAuthResult> {
  try {
    const config = await getBiometricConfig();

    if (!config || !config.enableBiometrics) {
      return {
        success: false,
        error: 'Biometric authentication is not enabled',
      };
    }

    const { success } = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Cancel',
    });

    if (success) {
      // Update last used timestamp
      config.lastUsed = new Date().toISOString();
      await Keychain.setGenericPassword(
        BIOMETRIC_KEY,
        JSON.stringify(config),
        {
          service: 'linkdao',
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        }
      );

      return {
        success: true,
        biometryType: config.biometryType,
      };
    }

    return {
      success: false,
      error: 'Authentication failed or was cancelled',
    };
  } catch (error: any) {
    console.error('Error authenticating with biometrics:', error);
    
    // Handle specific error cases
    if (error.name === 'LAErrorUserFallback' || error.name === 'LAErrorUserCancel') {
      return {
        success: false,
        error: 'Authentication was cancelled',
      };
    }

    if (error.name === 'LAErrorBiometryNotAvailable') {
      return {
        success: false,
        error: 'Biometric authentication is not available',
      };
    }

    if (error.name === 'LAErrorBiometryLockout') {
      return {
        success: false,
        error: 'Too many failed attempts. Please use passcode to unlock.',
      };
    }

    if (error.name === 'LAErrorBiometryNotEnrolled') {
      return {
        success: false,
        error: 'Biometric authentication is not enrolled',
      };
    }

    return {
      success: false,
      error: error.message || 'Authentication failed',
    };
  }
}

/**
 * Check if user can authenticate with biometrics (available and enabled)
 */
export async function canAuthenticateWithBiometrics(): Promise<boolean> {
  const { available } = await isBiometricAvailable();
  if (!available) return false;

  const config = await getBiometricConfig();
  return !!(config && config.enableBiometrics);
}

/**
 * Get biometry type name for display
 */
export function getBiometryTypeName(biometryType?: BiometryTypes): string {
  switch (biometryType) {
    case BiometryTypes.TouchID:
      return 'Touch ID';
    case BiometryTypes.FaceID:
      return 'Face ID';
    case BiometryTypes.Biometrics:
      return 'Fingerprint';
    default:
      return 'Biometrics';
  }
}

/**
 * Create biometric keys for secure storage
 */
export async function createBiometricKeys(): Promise<boolean> {
  try {
    const { success } = await rnBiometrics.createKeys('LinkDAO Biometric Keys');
    return success;
  } catch (error) {
    console.error('Error creating biometric keys:', error);
    return false;
  }
}

/**
 * Delete biometric keys
 */
export async function deleteBiometricKeys(): Promise<boolean> {
  try {
    const { success } = await rnBiometrics.deleteKeys('LinkDAO Biometric Keys');
    return success;
  } catch (error) {
    console.error('Error deleting biometric keys:', error);
    return false;
  }
}

/**
 * Sign data with biometric keys
 */
export async function signWithBiometrics(
  payload: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const { success, signature } = await rnBiometrics.createSignature({
      promptMessage: 'Sign to authenticate',
      payload,
    });

    if (success && signature) {
      return { success: true, signature };
    }

    return {
      success: false,
      error: 'Failed to sign with biometrics',
    };
  } catch (error: any) {
    console.error('Error signing with biometrics:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign with biometrics',
    };
  }
}
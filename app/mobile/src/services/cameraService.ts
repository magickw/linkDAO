import { Camera, CameraType } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export class CameraService {
  private static instance: CameraService;

  private constructor() {}

  public static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  /**
   * Check camera permissions
   */
  async checkCameraPermission(): Promise<boolean> {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return false;
    }
  }

  /**
   * Check media library permissions
   */
  async checkMediaLibraryPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const { status } = await Camera.requestMediaLibraryPermissionsAsync();
        return status === 'granted';
      }
      return true;
    } catch (error) {
      console.error('Error checking media library permission:', error);
      return false;
    }
  }

  /**
   * Capture photo from camera
   */
  async capturePhoto(cameraRef: any): Promise<string | null> {
    try {
      if (!cameraRef) {
        console.error('Camera reference is null');
        return null;
      }

      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      console.log('Photo captured:', photo.uri);
      return photo.uri;
    } catch (error) {
      console.error('Error capturing photo:', error);
      return null;
    }
  }

  /**
   * Compress image
   */
  async compressImage(uri: string, quality: number = 0.8): Promise<string | null> {
    try {
      // For now, we'll just return the original URI
      // In a real implementation, you might use an image manipulation library
      return uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return null;
    }
  }

  /**
   * Save image to device
   */
  async saveImageToDevice(uri: string): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const permission = await this.checkMediaLibraryPermission();
        if (!permission) {
          console.log('Media library permission not granted');
          return false;
        }
      }

      // On iOS, the photo is already saved to the camera roll
      // On Android, we need to copy it
      if (Platform.OS === 'android') {
        const filename = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
        const destination = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.copyAsync({ from: uri, to: destination });
        console.log('Image saved to:', destination);
      }

      return true;
    } catch (error) {
      console.error('Error saving image to device:', error);
      return false;
    }
  }

  /**
   * Upload image to backend/IPFS
   */
  async uploadImage(uri: string, userAddress: string): Promise<string | null> {
    try {
      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to backend
      const response = await fetch('/api/mobile/upload/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          imageData: base64,
          filename: `photo_${Date.now()}.jpg`,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Image uploaded successfully:', result.cid);
        return result.cid;
      } else {
        console.error('Failed to upload image:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  /**
   * Get camera types available
   */
  getAvailableCameraTypes(): CameraType[] {
    return [CameraType.back, CameraType.front];
  }
}

// Biometric Authentication Service
export class BiometricService {
  private static instance: BiometricService;

  private constructor() {}

  public static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticateUser(reason: string = 'Authenticate to proceed'): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        console.log('Biometric authentication not available');
        return false;
      }
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use PIN',
      });
      
      return result.success;
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      return false;
    }
  }

  /**
   * Get supported authentication types
   */
  async getSupportedAuthTypes(): Promise<string[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'face';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'iris';
          default:
            return 'unknown';
        }
      });
    } catch (error) {
      console.error('Error getting supported auth types:', error);
      return [];
    }
  }
}

export default CameraService.getInstance();
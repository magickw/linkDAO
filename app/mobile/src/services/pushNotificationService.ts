import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class PushNotificationService {
  private static instance: PushNotificationService;
  private expoPushToken: string | null = null;

  private constructor() {}

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if we already have a token stored
      const storedToken = await AsyncStorage.getItem('expoPushToken');
      if (storedToken) {
        this.expoPushToken = storedToken;
        return storedToken;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get the token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;
      
      // Store the token
      await AsyncStorage.setItem('expoPushToken', token);
      
      // Also store the platform
      await AsyncStorage.setItem('devicePlatform', Platform.OS);
      
      console.log('Expo Push Token:', token);
      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Unregister from push notifications
   */
  async unregisterFromPushNotifications(): Promise<boolean> {
    try {
      // Remove the token from storage
      await AsyncStorage.removeItem('expoPushToken');
      await AsyncStorage.removeItem('devicePlatform');
      this.expoPushToken = null;
      return true;
    } catch (error) {
      console.error('Error unregistering from push notifications:', error);
      return false;
    }
  }

  /**
   * Send token to backend for registration
   */
  async registerTokenWithBackend(userAddress: string): Promise<boolean> {
    if (!this.expoPushToken) {
      console.log('No push token available');
      return false;
    }

    try {
      const platform = await AsyncStorage.getItem('devicePlatform') || Platform.OS;
      
      const response = await fetch('/api/mobile/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          token: this.expoPushToken,
          platform,
        }),
      });

      if (response.ok) {
        console.log('Push token registered with backend');
        return true;
      } else {
        console.error('Failed to register push token with backend');
        return false;
      }
    } catch (error) {
      console.error('Error registering token with backend:', error);
      return false;
    }
  }

  /**
   * Remove token from backend
   */
  async unregisterTokenFromBackend(userAddress: string): Promise<boolean> {
    if (!this.expoPushToken) {
      return false;
    }

    try {
      const response = await fetch('/api/mobile/push/unregister', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          token: this.expoPushToken,
        }),
      });

      if (response.ok) {
        console.log('Push token unregistered from backend');
        return true;
      } else {
        console.error('Failed to unregister push token from backend');
        return false;
      }
    } catch (error) {
      console.error('Error unregistering token from backend:', error);
      return false;
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    triggerSeconds: number
  ): Promise<string | null> {
    try {
      const trigger = new Date(Date.now() + triggerSeconds * 1000);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
        },
        trigger,
      });

      console.log('Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return null;
    }
  }

  /**
   * Handle notification response
   */
  async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    const { notification } = response;
    const { data } = notification.request.content;
    
    console.log('Notification received:', notification);
    
    // Handle navigation based on notification data
    if (data?.actionUrl) {
      // Navigate to the specified URL
      // This would typically integrate with your navigation system
      console.log('Navigate to:', data.actionUrl);
    }
  }

  /**
   * Get the current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

export default PushNotificationService.getInstance();
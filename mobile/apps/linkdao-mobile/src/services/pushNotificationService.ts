/**
 * Push Notifications Service
 * Handles push notification registration, handling, and management
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationConfig {
  enabled: boolean;
  token: string | null;
  permissions: NotificationPermissions;
}

export interface NotificationPermissions {
  ios?: {
    allowsAlert: boolean;
    allowsBadge: boolean;
    allowsSound: boolean;
  };
  android?: {
    permission: 'granted' | 'denied' | 'undetermined';
  };
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private config: PushNotificationConfig = {
    enabled: false,
    token: null,
    permissions: {},
  };
  private listeners: Set<(notification: Notifications.Notification) => void> = new Set();

  private constructor() {
    this.initialize();
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // Load saved config
      const savedConfig = await AsyncStorage.getItem('pushNotificationConfig');
      if (savedConfig) {
        this.config = JSON.parse(savedConfig);
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      // Check if notifications are enabled
      if (this.config.enabled) {
        await this.registerForPushNotifications();
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  private setupNotificationListeners() {
    // Handle notification received while app is in foreground
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      this.listeners.forEach(listener => listener(notification));
    });

    // Handle notification response when user taps on it
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response received:', response);
      const data = response.notification.request.content.data;
      // Handle navigation or other actions based on notification data
    });

    return () => {
      subscription.remove();
    };
  }

  public async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if device is physical
      if (!Device.isDevice) {
        console.warn('Push notifications are not supported on simulators');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
      }

      // Get push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push token:', token);

      // Update config
      this.config.enabled = true;
      this.config.token = token;
      await this.saveConfig();

      // Send token to backend
      await this.sendTokenToBackend(token);

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  public async unregisterFromPushNotifications(): Promise<void> {
    try {
      // Remove token from backend
      if (this.config.token) {
        await this.removeTokenFromBackend(this.config.token);
      }

      // Update config
      this.config.enabled = false;
      this.config.token = null;
      await this.saveConfig();
    } catch (error) {
      console.error('Error unregistering from push notifications:', error);
    }
  }

  public async sendLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  public async scheduleNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: any
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger,
      });
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  public async cancelScheduledNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Error canceling scheduled notification:', error);
    }
  }

  public async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all scheduled notifications:', error);
    }
  }

  public async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  public async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  public addNotificationListener(
    listener: (notification: Notifications.Notification) => void
  ): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async checkPermissions(): Promise<NotificationPermissions> {
    try {
      const { status, ios, android } = await Notifications.getPermissionsAsync();
      return {
        ios,
        android: { permission: status as any },
      };
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return {};
    }
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public getToken(): string | null {
    return this.config.token;
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('pushNotificationConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving push notification config:', error);
    }
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    // In production, send token to your backend API
    console.log('Sending push token to backend:', token);
    // Example:
    // await api.post('/notifications/register', { token });
  }

  private async removeTokenFromBackend(token: string): Promise<void> {
    // In production, remove token from your backend API
    console.log('Removing push token from backend:', token);
    // Example:
    // await api.post('/notifications/unregister', { token });
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();

// Export convenience functions
export const registerForPushNotifications = () =>
  pushNotificationService.registerForPushNotifications();

export const unregisterFromPushNotifications = () =>
  pushNotificationService.unregisterFromPushNotifications();

export const sendLocalNotification = (title: string, body: string, data?: any) =>
  pushNotificationService.sendLocalNotification(title, body, data);

export const scheduleNotification = (
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: any
) => pushNotificationService.scheduleNotification(title, body, trigger, data);

export const cancelScheduledNotification = (identifier: string) =>
  pushNotificationService.cancelScheduledNotification(identifier);

export const cancelAllScheduledNotifications = () =>
  pushNotificationService.cancelAllScheduledNotifications();

export const setBadgeCount = (count: number) =>
  pushNotificationService.setBadgeCount(count);

export const getBadgeCount = () => pushNotificationService.getBadgeCount();

export const checkPermissions = () => pushNotificationService.checkPermissions();

export const requestPermissions = () => pushNotificationService.requestPermissions();

export const isEnabled = () => pushNotificationService.isEnabled();

export const getToken = () => pushNotificationService.getToken();
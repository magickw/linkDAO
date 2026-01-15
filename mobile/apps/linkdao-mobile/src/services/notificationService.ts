/**
 * Push Notification Service
 * Handles push notifications and user engagement
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from './apiClient';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export interface NotificationData {
    title: string;
    body: string;
    data?: Record<string, any>;
}

export interface NotificationPreferences {
    comments: boolean;
    reactions: boolean;
    tips: boolean;
    mentions: boolean;
    communityUpdates: boolean;
    moderation: boolean;
}

class NotificationService {
    private expoPushToken: string | null = null;
    private notificationListener: any = null;
    private responseListener: any = null;

    /**
     * Initialize notification service
     */
    async initialize() {
        // Set up notification listeners
        this.notificationListener = Notifications.addNotificationReceivedListener(
            this.handleNotificationReceived
        );

        this.responseListener = Notifications.addNotificationResponseReceivedListener(
            this.handleNotificationResponse
        );

        // Request permissions and register token
        await this.requestPermissions();
    }

    /**
     * Request notification permissions
     */
    async requestPermissions(): Promise<boolean> {
        if (!Device.isDevice) {
            console.log('[Notifications] Not a physical device, skipping');
            return false;
        }

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('[Notifications] Permission not granted');
                return false;
            }

            // Get push token
            const token = await Notifications.getExpoPushTokenAsync({
                projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
            });

            this.expoPushToken = token.data;
            console.log('[Notifications] Push token:', this.expoPushToken);

            // Register token with backend
            await this.registerToken();

            return true;
        } catch (error) {
            console.error('[Notifications] Error requesting permissions:', error);
            return false;
        }
    }

    /**
     * Register device token with backend
     */
    async registerToken() {
        if (!this.expoPushToken) {
            console.log('[Notifications] No push token to register');
            return;
        }

        try {
            await apiClient.post('/api/notifications/register', {
                token: this.expoPushToken,
                platform: Platform.OS,
                deviceInfo: {
                    brand: Device.brand,
                    model: Device.modelName,
                    osVersion: Device.osVersion,
                },
            });

            console.log('[Notifications] Token registered successfully');
        } catch (error) {
            console.error('[Notifications] Error registering token:', error);
        }
    }

    /**
     * Handle notification received while app is in foreground
     */
    private handleNotificationReceived = (notification: Notifications.Notification) => {
        console.log('[Notifications] Received:', notification);

        // You can show a custom in-app notification here
        // or update app state
    };

    /**
     * Handle notification tap
     */
    private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
        console.log('[Notifications] Tapped:', response);

        const data = response.notification.request.content.data;

        // Handle deep linking based on notification data
        this.handleDeepLink(data);
    };

    /**
     * Handle deep linking from notifications
     */
    private handleDeepLink(data: any) {
        if (!data) return;

        // Navigate based on notification type
        switch (data.type) {
            case 'comment':
                // Navigate to post with comment
                console.log('[Notifications] Navigate to post:', data.postId);
                break;

            case 'reaction':
                // Navigate to post
                console.log('[Notifications] Navigate to post:', data.postId);
                break;

            case 'tip':
                // Navigate to tips screen
                console.log('[Notifications] Navigate to tips');
                break;

            case 'mention':
                // Navigate to mentioned post
                console.log('[Notifications] Navigate to post:', data.postId);
                break;

            case 'community':
                // Navigate to community
                console.log('[Notifications] Navigate to community:', data.communityId);
                break;

            case 'moderation':
                // Navigate to moderation tools
                console.log('[Notifications] Navigate to moderation:', data.communityId);
                break;

            default:
                console.log('[Notifications] Unknown notification type:', data.type);
        }
    }

    /**
     * Schedule a local notification
     */
    async scheduleNotification(data: NotificationData, delaySeconds: number = 0) {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: data.title,
                    body: data.body,
                    data: data.data || {},
                },
                trigger: delaySeconds > 0 ? { seconds: delaySeconds } : null,
            });
        } catch (error) {
            console.error('[Notifications] Error scheduling notification:', error);
        }
    }

    /**
     * Get notification preferences
     */
    async getPreferences(): Promise<NotificationPreferences> {
        try {
            const response = await apiClient.get('/api/notifications/preferences');
            return response.data;
        } catch (error) {
            console.error('[Notifications] Error getting preferences:', error);
            // Return default preferences
            return {
                comments: true,
                reactions: true,
                tips: true,
                mentions: true,
                communityUpdates: true,
                moderation: true,
            };
        }
    }

    /**
     * Update notification preferences
     */
    async updatePreferences(preferences: Partial<NotificationPreferences>) {
        try {
            await apiClient.post('/api/notifications/preferences', preferences);
            console.log('[Notifications] Preferences updated');
        } catch (error) {
            console.error('[Notifications] Error updating preferences:', error);
            throw error;
        }
    }

    /**
     * Clear all notifications
     */
    async clearAll() {
        await Notifications.dismissAllNotificationsAsync();
    }

    /**
     * Get badge count
     */
    async getBadgeCount(): Promise<number> {
        return await Notifications.getBadgeCountAsync();
    }

    /**
     * Set badge count
     */
    async setBadgeCount(count: number) {
        await Notifications.setBadgeCountAsync(count);
    }

    /**
     * Clean up listeners
     */
    cleanup() {
        if (this.notificationListener) {
            Notifications.removeNotificationSubscription(this.notificationListener);
        }
        if (this.responseListener) {
            Notifications.removeNotificationSubscription(this.responseListener);
        }
    }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;

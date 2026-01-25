/**
 * Notification Service
 * Frontend service for managing notifications
 * Implements requirements 6.1, 6.3, 6.4, 6.5 from the interconnected social platform spec
 */

import { API_BASE_URL } from '../config/api';
import type {
  AppNotification,
  NotificationPreferences,
  GetNotificationsOptions,
  GetNotificationsResponse
} from '../types/notifications';

class NotificationService {
  private static instance: NotificationService;
  private baseUrl = `${API_BASE_URL}/api/notifications`;
  private preferencesUrl = `${API_BASE_URL}/api/notification-preferences`;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Get a single notification by ID
   */
  async getNotificationById(notificationId: string): Promise<AppNotification | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${notificationId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch notification');
      }

      const data = await response.json();
      return this.transformNotification(data);
    } catch (error) {
      console.error('Error fetching notification:', error);
      return null;
    }
  }

  /**
   * Get user's notifications
   */
  async getNotifications(options: GetNotificationsOptions = {}): Promise<GetNotificationsResponse> {
    try {
      const params = new URLSearchParams();

      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.includeRead !== undefined) params.append('includeRead', options.includeRead.toString());
      if (options.category) params.append('category', options.category);
      if (options.type) params.append('type', options.type);

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 503) {
          // Service unavailable - return empty response instead of throwing to prevent UI crashes
          console.warn('Notification service unavailable (503), returning empty response');
          return {
            notifications: [],
            unreadCount: 0,
            totalCount: 0,
            hasMore: false
          };
        }
        if (response.status === 429) {
          // Rate limited - return empty response instead of throwing to prevent UI crashes
          console.warn('Notification service rate limited (429), returning empty response');
          return {
            notifications: [],
            unreadCount: 0,
            totalCount: 0,
            hasMore: false
          };
        }
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();

      // Validate data structure
      if (!data || !Array.isArray(data.notifications)) {
        console.error('Invalid notifications data received:', data);
        return {
          notifications: [],
          unreadCount: 0,
          totalCount: 0,
          hasMore: false
        };
      }

      return {
        notifications: data.notifications.map((notification: any) => {
          try {
            return this.transformNotification(notification);
          } catch (error) {
            console.error('Error transforming notification:', notification, error);
            // Return a minimal valid notification to prevent complete failure
            return {
              id: notification.id || 'unknown',
              type: notification.type || 'system',
              category: 'system_alert',
              title: 'Notification',
              message: notification.message || 'Unable to display notification',
              data: {},
              priority: 'low',
              isRead: notification.isRead || false,
              createdAt: new Date(notification.createdAt || Date.now())
            };
          }
        }),
        unreadCount: data.unreadCount || 0,
        totalCount: data.totalCount || 0,
        hasMore: data.hasMore || false
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/unread-count`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 503) {
          // Service unavailable - return 0 instead of throwing to prevent UI crashes
          console.warn('Notification service unavailable (503), returning 0 count');
          return 0;
        }
        if (response.status === 429) {
          // Rate limited - return 0 instead of throwing to prevent UI crashes
          console.warn('Notification service rate limited (429), returning 0 count');
          return 0;
        }
        throw new Error('Failed to fetch unread count');
      }

      const data = await response.json();
      return data.count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 503) {
          // Service unavailable - silently fail instead of throwing to prevent UI crashes
          console.warn('Notification service unavailable (503), silently failing mark as read');
          return;
        }
        if (response.status === 429) {
          // Rate limited - silently fail instead of throwing to prevent UI crashes
          console.warn('Notification service rate limited (429), silently failing mark as read');
          return;
        }
        throw new Error('Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/read-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 503) {
          // Service unavailable - silently fail instead of throwing to prevent UI crashes
          console.warn('Notification service unavailable (503), silently failing mark all as read');
          return;
        }
        if (response.status === 429) {
          // Rate limited - silently fail instead of throwing to prevent UI crashes
          console.warn('Notification service rate limited (429), silently failing mark all as read');
          return;
        }
        throw new Error('Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 503) {
          // Service unavailable - silently fail instead of throwing to prevent UI crashes
          console.warn('Notification service unavailable (503), silently failing delete notification');
          return;
        }
        if (response.status === 429) {
          // Rate limited - silently fail instead of throwing to prevent UI crashes
          console.warn('Notification service rate limited (429), silently failing delete notification');
          return;
        }
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await fetch(`${this.preferencesUrl}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 503) {
          // Service unavailable - return default preferences instead of throwing to prevent UI crashes
          console.warn('Notification service unavailable (503), returning default preferences');
          return {
            email: true,
            push: true,
            inApp: true,
            enablePush: true,
            enableSound: true,
            enableDesktop: true,
            categories: {
              direct_message: { enabled: true, push: true, sound: true },
              post_reaction: { enabled: true, push: true, sound: true },
              comment_mention: { enabled: true, push: true, sound: true },
              community_invite: { enabled: true, push: true, sound: true },
              governance_proposal: { enabled: true, push: true, sound: true },
              system_alert: { enabled: true, push: true, sound: true },
              marketplace: { enabled: true, push: true, sound: true }
            },
            quietHours: {
              enabled: false,
              startTime: '22:00',
              endTime: '08:00'
            }
          };
        }
        if (response.status === 429) {
          // Rate limited - return default preferences instead of throwing to prevent UI crashes
          console.warn('Notification service rate limited (429), returning default preferences');
          return {
            email: true,
            push: true,
            inApp: true,
            enablePush: true,
            enableSound: true,
            enableDesktop: true,
            categories: {
              direct_message: { enabled: true, push: true, sound: true },
              post_reaction: { enabled: true, push: true, sound: true },
              comment_mention: { enabled: true, push: true, sound: true },
              community_invite: { enabled: true, push: true, sound: true },
              governance_proposal: { enabled: true, push: true, sound: true },
              system_alert: { enabled: true, push: true, sound: true },
              marketplace: { enabled: true, push: true, sound: true }
            },
            quietHours: {
              enabled: false,
              startTime: '22:00',
              endTime: '08:00'
            }
          };
        }
        throw new Error('Failed to fetch notification preferences');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      const response = await fetch(`${this.preferencesUrl}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        if (response.status === 503) {
          // Service unavailable - silently fail instead of throwing to prevent UI crashes
          console.warn('Notification service unavailable (503), silently failing update preferences');
          return;
        }
        if (response.status === 429) {
          // Rate limited - silently fail instead of throwing to prevent UI crashes
          console.warn('Notification service rate limited (429), silently failing update preferences');
          return;
        }
        throw new Error('Failed to update notification preferences');
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
      }

      if (Notification.permission === 'granted') {
        return true;
      }

      if (Notification.permission === 'denied') {
        return false;
      }

      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Show message notification
   */
  showMessageNotification(messageData: {
    id: string;
    fromAddress: string;
    toAddress: string;
    content: string;
    messageType?: string;
    timestamp: Date;
    conversationId?: string;
  }): void {
    try {
      if (Notification.permission === 'granted') {
        const notification = new Notification(`New message from ${messageData.fromAddress}`, {
          body: messageData.content,
          icon: '/icons/message-icon.png',
          tag: `message-${messageData.id}`,
        });

        notification.onclick = () => {
          window.focus();
          // Navigate to message or conversation
          notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    } catch (error) {
      console.error('Error showing message notification:', error);
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch(`${this.preferencesUrl}/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe to push notifications');
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<void> {
    try {
      const response = await fetch(`${this.preferencesUrl}/push-token`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to unsubscribe from push notifications');
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification(type: AppNotification['type']): Promise<void> {
    try {
      const response = await fetch(`${this.preferencesUrl}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  /**
   * Get notification analytics
   */
  async getAnalytics(timeRange: '24h' | '7d' | '30d' = '7d'): Promise<{
    totalNotifications: number;
    readRate: number;
    categoryBreakdown: Record<string, number>;
    engagementRate: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching notification analytics:', error);
      throw error;
    }
  }

  /**
   * Create notification (for system use)
   */
  async createNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): Promise<AppNotification> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        throw new Error('Failed to create notification');
      }

      const data = await response.json();
      return this.transformNotification(data);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Register service worker for push notifications
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw-notifications.js');
      console.log('Service worker registered for notifications');
      return registration;
    } catch (error) {
      console.error('Error registering service worker:', error);
      return null;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications are not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  // Private helper methods

  private getAuthToken(): string {
    // Get auth token from localStorage or context
    // Check for the key used by enhancedAuthService first
    return (
      localStorage.getItem('linkdao_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('auth_token') ||
      ''
    );
  }

  private transformNotification(data: any): AppNotification {
    // Derive category if not provided
    let category = data.category;
    if (!category) {
      const type = data.type;
      if (['new_order', 'cancellation_request', 'dispute_opened', 'review_received', 'order_update', 'payment_received', 'return_requested', 'shipped', 'delivered'].includes(type)) {
        category = 'marketplace';
      } else if (['tip', 'award'].includes(type)) {
        category = 'financial';
      } else if (['post_upvote', 'post_downvote', 'comment_upvote', 'comment_downvote', 'new_comment', 'comment_reply', 'post_reply', 'bookmark', 'reaction'].includes(type)) {
        category = 'social_interaction';
      } else if (type === 'message') {
        category = 'direct_message';
      } else if (type === 'mention') {
        category = 'comment_mention';
      } else if (['community', 'community_join'].includes(type)) {
        category = 'community_invite';
      } else if (['governance', 'governance_proposal'].includes(type)) {
        category = 'governance_proposal';
      } else {
        category = 'system_alert';
      }
    }

    let metadata: any = {};
    if (data.metadata) {
      try {
        metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
      } catch (e) {
        console.warn('Failed to parse notification metadata:', e);
        metadata = {};
      }
    }

    return {
      id: data.id || 'unknown',
      type: data.type || 'system',
      category: category,
      title: data.title || metadata.title || 'Notification',
      message: data.message || (typeof data.message === 'object' ? JSON.stringify(data.message) : String(data.message)),
      data: data.data || {},
      fromAddress: data.fromAddress,
      fromName: data.fromName,
      avatarUrl: data.avatarUrl,
      actionUrl: data.actionUrl || metadata.actionUrl,
      priority: data.priority || metadata.priority || 'medium',
      isRead: data.isRead || false,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    };
  }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;
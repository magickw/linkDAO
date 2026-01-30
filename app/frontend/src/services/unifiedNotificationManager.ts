import { useEffect, useCallback, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { useConsolidatedWebSocket, useWebSocketEvent } from '@/hooks/useConsolidatedWebSocket';

// Notification types
export type NotificationType = 
  | 'chat_message'
  | 'chat_mention'
  | 'chat_channel'
  | 'system_alert'
  | 'order_update'
  | 'support_ticket'
  | 'achievement_unlocked'
  | 'community_invite';

// Priority levels
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

// Base notification interface
export interface BaseNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: Date;
  read: boolean;
  source: 'chat' | 'system' | 'order' | 'support';
  metadata?: Record<string, any>;
}

// Chat-specific notification
export interface ChatNotification extends BaseNotification {
  type: 'chat_message' | 'chat_mention' | 'chat_channel';
  source: 'chat';
  conversationId: string;
  senderAddress: string;
  senderName?: string;
  avatarUrl?: string;
}

// System notification
export interface SystemNotification extends BaseNotification {
  type: 'system_alert';
  source: 'system';
  actionUrl?: string;
  category: 'maintenance' | 'security' | 'feature' | 'announcement';
}

// Order notification
export interface OrderNotification extends BaseNotification {
  type: 'order_update';
  source: 'order';
  orderId: string;
  orderStatus: string;
  amount?: number;
}

// Support notification
export interface SupportNotification extends BaseNotification {
  type: 'support_ticket';
  source: 'support';
  ticketId: string;
  ticketStatus: string;
  assignee?: string;
}

// Achievement notification
export interface AchievementNotification extends BaseNotification {
  type: 'achievement_unlocked';
  source: 'system';
  achievementId: string;
  achievementName: string;
  reward?: string;
}

// Community notification
export interface CommunityNotification extends BaseNotification {
  type: 'community_invite';
  source: 'system';
  communityId: string;
  communityName: string;
  inviterAddress: string;
  inviterName?: string;
}

export type Notification = 
  | ChatNotification
  | SystemNotification
  | OrderNotification
  | SupportNotification
  | AchievementNotification
  | CommunityNotification;

// Notification preferences
export interface NotificationPreferences {
  desktop: boolean;
  sound: boolean;
  vibration: boolean;
  email: boolean;
  push: boolean;
  perConversationSettings: Map<string, ConversationNotificationSettings>;
  mutedCategories: Set<NotificationType>;
  doNotDisturbUntil?: Date;
}

export interface ConversationNotificationSettings {
  showNotifications: boolean;
  sound: boolean;
  muted: boolean;
  doNotDisturbUntil?: Date;
  customSound?: string;
}

// Listener types
export type NotificationListener = (notification: Notification | null) => void;
export type PreferenceChangeListener = (preferences: NotificationPreferences) => void;

class UnifiedNotificationManager {
  private static instance: UnifiedNotificationManager;
  private notifications: Map<string, Notification> = new Map();
  private notificationListeners = new Set<NotificationListener>();
  private preferenceListeners = new Set<PreferenceChangeListener>();
  private preferences: NotificationPreferences;
  private maxNotifications = 100;
  private storageKey = 'linkdao_unified_notification_preferences';
  private conversationSettingsStorageKey = 'linkdao_conversation_notification_settings';

  private constructor() {
    this.preferences = this.loadPreferences();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): UnifiedNotificationManager {
    if (!UnifiedNotificationManager.instance) {
      UnifiedNotificationManager.instance = new UnifiedNotificationManager();
    }
    return UnifiedNotificationManager.instance;
  }

  /**
   * Add a notification
   */
  addNotification(notification: Omit<Notification, 'id' | 'read' | 'timestamp'>): Notification {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullNotification: Notification = {
      ...notification,
      id,
      read: false,
      timestamp: new Date(),
    } as Notification;

    this.notifications.set(id, fullNotification);

    // Keep only the most recent notifications
    if (this.notifications.size > this.maxNotifications) {
      const oldestId = Array.from(this.notifications.entries())
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime())
        .map(([id]) => id)[0];

      if (oldestId) {
        this.notifications.delete(oldestId);
      }
    }

    // Check if notification should be shown
    if (this.shouldShowNotification(fullNotification)) {
      // Notify listeners
      this.notifyListeners(fullNotification);
      
      // Show system notification
      this.showSystemNotification(fullNotification);
      
      // Play sound if enabled
      if (this.shouldPlaySound(fullNotification)) {
        this.playNotificationSound(fullNotification);
      }
    }

    return fullNotification;
  }

  /**
   * Check if notification should be shown based on preferences
   */
  shouldShowNotification(notification: Notification): boolean {
    // Check global DND
    if (this.preferences.doNotDisturbUntil && new Date() < this.preferences.doNotDisturbUntil) {
      return false;
    }

    // Check muted categories
    if (this.preferences.mutedCategories.has(notification.type)) {
      return false;
    }

    // Check conversation-specific preferences for chat notifications
    if (notification.source === 'chat' && 'conversationId' in notification) {
      const convSettings = this.preferences.perConversationSettings.get(notification.conversationId);
      
      if (convSettings?.muted) {
        return false;
      }
      
      if (convSettings?.doNotDisturbUntil && new Date() < convSettings.doNotDisturbUntil) {
        return false;
      }
      
      if (convSettings && !convSettings.showNotifications) {
        return false;
      }
    }

    // Check desktop notifications preference
    if (!this.preferences.desktop) {
      return false;
    }

    return true;
  }

  /**
   * Should play sound for notification
   */
  shouldPlaySound(notification: Notification): boolean {
    if (!this.preferences.sound) {
      return false;
    }

    // Check conversation-specific sound setting
    if (notification.source === 'chat' && 'conversationId' in notification) {
      const convSettings = this.preferences.perConversationSettings.get(notification.conversationId);
      if (convSettings && !convSettings.sound) {
        return false;
      }
    }

    return true;
  }

  /**
   * Show system/browser notification
   */
  private showSystemNotification(notification: Notification): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // Only show if document is hidden and permission is granted
    if (!document.hidden || Notification.permission !== 'granted') {
      return;
    }

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: this.getNotificationIcon(notification),
        tag: `notification-${notification.id}`,
        requireInteraction: notification.priority === 'critical'
      });

      browserNotification.onclick = () => {
        window.focus();
        this.handleNotificationClick(notification);
        browserNotification.close();
      };

      // Auto-close after timeout based on priority
      const timeout = notification.priority === 'critical' ? 10000 : 5000;
      setTimeout(() => browserNotification.close(), timeout);
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  /**
   * Play notification sound
   */
  private playNotificationSound(notification: Notification): void {
    try {
      let soundFile = '/sounds/notification.mp3';
      
      // Check for conversation-specific sound
      if (notification.source === 'chat' && 'conversationId' in notification) {
        const convSettings = this.preferences.perConversationSettings.get(notification.conversationId);
        if (convSettings?.customSound) {
          soundFile = convSettings.customSound;
        }
      }

      const audio = new Audio(soundFile);
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore errors silently
    } catch (error) {
      // Ignore audio errors
    }
  }

  /**
   * Get appropriate icon for notification type
   */
  private getNotificationIcon(notification: Notification): string {
    switch (notification.type) {
      case 'chat_message':
        return '/icons/chat-message.png';
      case 'chat_mention':
        return '/icons/mention.png';
      case 'chat_channel':
        return '/icons/channel.png';
      case 'system_alert':
        return '/icons/alert.png';
      case 'order_update':
        return '/icons/order.png';
      case 'support_ticket':
        return '/icons/support.png';
      case 'achievement_unlocked':
        return '/icons/trophy.png';
      case 'community_invite':
        return '/icons/community.png';
      default:
        return '/icons/notification.png';
    }
  }

  /**
   * Handle notification click
   */
  private handleNotificationClick(notification: Notification): void {
    // Mark as read
    this.markAsRead(notification.id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'chat_message':
      case 'chat_mention':
      case 'chat_channel':
        if ('conversationId' in notification) {
          window.location.href = `/chat/dm/${notification.conversationId}`;
        }
        break;
      case 'order_update':
        if ('orderId' in notification) {
          window.location.href = `/orders/${notification.orderId}`;
        }
        break;
      case 'support_ticket':
        if ('ticketId' in notification) {
          window.location.href = `/support/tickets/${notification.ticketId}`;
        }
        break;
      case 'community_invite':
        if ('communityId' in notification) {
          window.location.href = `/communities/${notification.communityId}`;
        }
        break;
      default:
        // For system alerts, go to notifications page
        window.location.href = '/notifications';
    }
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      this.notifications.set(notificationId, { ...notification, read: true });
      this.notifyListeners(notification);
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach((notification, id) => {
      this.notifications.set(id, { ...notification, read: true });
    });
    // Notify all listeners that notifications changed
    this.notifications.forEach(notification => this.notifyListeners(notification));
  }

  /**
   * Remove notification
   */
  removeNotification(notificationId: string): void {
    this.notifications.delete(notificationId);
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notifications.clear();
    this.notifyListeners(); // Notify with no notifications
  }

  /**
   * Get notifications (optionally filtered)
   */
  getNotifications(filter?: {
    type?: NotificationType;
    source?: 'chat' | 'system' | 'order' | 'support';
    read?: boolean;
    limit?: number;
  }): Notification[] {
    let notifications = Array.from(this.notifications.values());

    // Apply filters
    if (filter?.type) {
      notifications = notifications.filter(n => n.type === filter.type);
    }
    
    if (filter?.source) {
      notifications = notifications.filter(n => n.source === filter.source);
    }
    
    if (filter?.read !== undefined) {
      notifications = notifications.filter(n => n.read === filter.read);
    }

    // Sort by timestamp (newest first)
    notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filter?.limit) {
      notifications = notifications.slice(0, filter.limit);
    }

    return notifications;
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter(n => !n.read).length;
  }

  /**
   * Add notification listener
   */
  addNotificationListener(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  /**
   * Add preference change listener
   */
  addPreferenceListener(listener: PreferenceChangeListener): () => void {
    this.preferenceListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.preferenceListeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(notification?: Notification): void {
    this.notificationListeners.forEach(listener => {
      try {
        listener(notification as Notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  /**
   * Update preferences
   */
  updatePreferences(updates: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
    this.notifyPreferenceListeners();
  }

  /**
   * Update conversation-specific settings
   */
  updateConversationSettings(conversationId: string, settings: Partial<ConversationNotificationSettings>): void {
    const currentSettings = this.preferences.perConversationSettings.get(conversationId) || {
      showNotifications: true,
      sound: true,
      muted: false
    };
    
    const newSettings = { ...currentSettings, ...settings };
    this.preferences.perConversationSettings.set(conversationId, newSettings);
    this.savePreferences();
    this.notifyPreferenceListeners();
  }

  /**
   * Notify preference listeners
   */
  private notifyPreferenceListeners(): void {
    this.preferenceListeners.forEach(listener => {
      try {
        listener(this.preferences);
      } catch (error) {
        console.error('Error in preference listener:', error);
      }
    });
  }

  /**
   * Load preferences from localStorage
   */
  loadPreferences(): NotificationPreferences {
    try {
      if (typeof window === 'undefined') {
        return this.getDefaultPreferences();
      }

      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Convert arrays back to Sets and Maps
        return {
          ...parsed,
          mutedCategories: new Set(parsed.mutedCategories || []),
          perConversationSettings: new Map(Object.entries(parsed.perConversationSettings || {})),
          doNotDisturbUntil: parsed.doNotDisturbUntil ? new Date(parsed.doNotDisturbUntil) : undefined
        };
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
    
    return this.getDefaultPreferences();
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    try {
      if (typeof window === 'undefined') return;

      // Convert Sets and Maps to serializable format
      const serializablePrefs = {
        ...this.preferences,
        mutedCategories: Array.from(this.preferences.mutedCategories),
        perConversationSettings: Object.fromEntries(this.preferences.perConversationSettings),
        doNotDisturbUntil: this.preferences.doNotDisturbUntil?.toISOString()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(serializablePrefs));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): NotificationPreferences {
    return {
      desktop: true,
      sound: true,
      vibration: true,
      email: false,
      push: true,
      perConversationSettings: new Map(),
      mutedCategories: new Set(),
    };
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }
}

// Export singleton instance
export const notificationManager = UnifiedNotificationManager.getInstance();

/**
 * React hook for using the unified notification system
 */
export function useNotifications() {
  const { address } = useAccount();
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => 
    notificationManager.loadPreferences()
  );

  // Update local state when notifications change
  useEffect(() => {
    const unsubscribe = notificationManager.addNotificationListener((notification) => {
      setNotifications(notificationManager.getNotifications());
      setUnreadCount(notificationManager.getUnreadCount());
    });

    // Initialize with current notifications
    setNotifications(notificationManager.getNotifications());
    setUnreadCount(notificationManager.getUnreadCount());

    return unsubscribe;
  }, []);

  // Update local state when preferences change
  useEffect(() => {
    const unsubscribe = notificationManager.addPreferenceListener((newPreferences) => {
      setPreferences(newPreferences);
    });

    return unsubscribe;
  }, []);

  // Subscribe to WebSocket events for real-time notifications
  useWebSocketEvent('new_message', (data) => {
    const messageData = data.message || data;
    const senderAddress = data.senderAddress || data.fromAddress || messageData.senderAddress || messageData.fromAddress;

    const chatNotification: Omit<ChatNotification, 'id' | 'read' | 'timestamp'> = {
      type: 'chat_message',
      title: 'New Message',
      message: messageData.content || 'You have a new message',
      priority: 'normal',
      source: 'chat',
      conversationId: data.conversationId || messageData.conversationId,
      senderAddress: senderAddress,
      senderName: messageData.fromName,
      avatarUrl: messageData.avatarUrl
    };

    notificationManager.addNotification(chatNotification);
  });

  useWebSocketEvent('mention', (data) => {
    const mentionNotification: Omit<ChatNotification, 'id' | 'read' | 'timestamp'> = {
      type: 'chat_mention',
      title: 'Mention',
      message: data.content || 'You were mentioned',
      priority: 'high',
      source: 'chat',
      conversationId: data.conversationId,
      senderAddress: data.fromAddress,
      senderName: data.fromName,
      avatarUrl: data.avatarUrl
    };

    notificationManager.addNotification(mentionNotification);
  });

  useWebSocketEvent('channel_message', (data) => {
    const channelNotification: Omit<ChatNotification, 'id' | 'read' | 'timestamp'> = {
      type: 'chat_channel',
      title: 'Channel Message',
      message: data.content || 'New message in channel',
      priority: 'normal',
      source: 'chat',
      conversationId: data.conversationId,
      senderAddress: data.fromAddress,
      senderName: data.fromName,
      avatarUrl: data.avatarUrl
    };

    notificationManager.addNotification(channelNotification);
  });

  // Other event listeners can be added here...

  const actions = {
    markAsRead: notificationManager.markAsRead.bind(notificationManager),
    markAllAsRead: notificationManager.markAllAsRead.bind(notificationManager),
    removeNotification: notificationManager.removeNotification.bind(notificationManager),
    clearAllNotifications: notificationManager.clearAllNotifications.bind(notificationManager),
    updatePreferences: notificationManager.updatePreferences.bind(notificationManager),
    updateConversationSettings: notificationManager.updateConversationSettings.bind(notificationManager),
    requestPermission: notificationManager.requestPermission.bind(notificationManager),
    addNotification: notificationManager.addNotification.bind(notificationManager)
  };

  return {
    notifications,
    unreadCount,
    preferences,
    ...actions
  };
}

export default useNotifications;
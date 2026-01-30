/**
 * Unified Notification Manager
 * Consolidates all notification types (chat, system, order, support)
 * into a single, manageable service with a consistent interface
 */

type NotificationType = 'chat' | 'system' | 'order' | 'support' | 'mention';
type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface BaseNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  avatarUrl?: string;
}

export interface ChatNotificationData extends BaseNotification {
  type: 'chat' | 'mention';
  conversationId: string;
  senderId: string;
  senderName?: string;
}

export interface SystemNotificationData extends BaseNotification {
  type: 'system';
  category?: 'update' | 'alert' | 'announcement';
}

export interface OrderNotificationData extends BaseNotification {
  type: 'order';
  orderId: string;
  orderStatus?: string;
}

export interface SupportNotificationData extends BaseNotification {
  type: 'support';
  ticketId: string;
  category?: string;
}

export type Notification =
  | ChatNotificationData
  | SystemNotificationData
  | OrderNotificationData
  | SupportNotificationData;

interface NotificationPreferences {
  sound: boolean;
  desktop: boolean;
  badge: boolean;
  vibration: boolean;
  perConversationSettings: Map<string, ConversationNotificationPreferences>;
}

export interface ConversationNotificationPreferences {
  conversationId: string;
  muted: boolean;
  doNotDisturbUntil?: Date;
  showNotifications: boolean;
  soundEnabled: boolean;
}

// Notification event listeners
type NotificationListener = (notification: Notification) => void;
type PreferenceChangeListener = (prefs: NotificationPreferences) => void;

class NotificationManager {
  private static instance: NotificationManager;
  private notifications: Map<string, Notification> = new Map();
  private notificationListeners = new Set<NotificationListener>();
  private preferenceListeners = new Set<PreferenceChangeListener>();
  private preferences: NotificationPreferences;
  private maxNotifications = 100;
  private storageKey = 'linkdao_notification_preferences';
  private conversationSettingsStorageKey = 'linkdao_conversation_notification_settings';

  private constructor() {
    this.preferences = this.loadPreferences();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Add a notification
   */
  addNotification(notification: Omit<Notification, 'id'>): Notification {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullNotification: Notification = {
      ...notification,
      id,
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

    // Notify listeners
    this.notifyListeners(fullNotification);

    return fullNotification;
  }

  /**
   * Check if notification should be shown based on preferences
   */
  shouldShowNotification(notification: Notification): boolean {
    // Check global preferences
    if (!this.preferences.desktop) {
      return false;
    }

    // Check conversation-specific preferences for chat notifications
    if (notification.type === 'chat' || notification.type === 'mention') {
      const chatNotif = notification as ChatNotificationData;
      const convSettings = this.preferences.perConversationSettings.get(chatNotif.conversationId);

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

    // Priority-based filtering
    if (notification.priority === 'low' && !this.preferences.desktop) {
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
    if (notification.type === 'chat' || notification.type === 'mention') {
      const chatNotif = notification as ChatNotificationData;
      const convSettings = this.preferences.perConversationSettings.get(chatNotif.conversationId);

      if (convSettings && !convSettings.soundEnabled) {
        return false;
      }
    }

    return true;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications.clear();
  }

  /**
   * Get all notifications
   */
  getAll(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get notifications by type
   */
  getByType(type: NotificationType): Notification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter(n => !n.read).length;
  }

  /**
   * Get unread count by type
   */
  getUnreadCountByType(type: NotificationType): number {
    return Array.from(this.notifications.values())
      .filter(n => n.type === type && !n.read).length;
  }

  /**
   * Update global notification preferences
   */
  updatePreferences(prefs: Partial<Omit<NotificationPreferences, 'perConversationSettings'>>): void {
    this.preferences = {
      ...this.preferences,
      ...prefs,
    };
    this.savePreferences();
    this.notifyPreferenceListeners();
  }

  /**
   * Update per-conversation notification settings
   */
  setConversationSettings(conversationId: string, settings: ConversationNotificationPreferences): void {
    this.preferences.perConversationSettings.set(conversationId, settings);
    this.savePreferences();
    this.notifyPreferenceListeners();
  }

  /**
   * Get per-conversation notification settings
   */
  getConversationSettings(conversationId: string): ConversationNotificationPreferences | undefined {
    return this.preferences.perConversationSettings.get(conversationId);
  }

  /**
   * Remove per-conversation notification settings (reset to defaults)
   */
  removeConversationSettings(conversationId: string): void {
    this.preferences.perConversationSettings.delete(conversationId);
    this.savePreferences();
    this.notifyPreferenceListeners();
  }

  /**
   * Get all preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Subscribe to notification events
   */
  subscribe(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  /**
   * Subscribe to preference changes
   */
  subscribeToPreferences(listener: PreferenceChangeListener): () => void {
    this.preferenceListeners.add(listener);
    return () => {
      this.preferenceListeners.delete(listener);
    };
  }

  /**
   * Load preferences from storage
   */
  private loadPreferences(): NotificationPreferences {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const conversationSettings = localStorage.getItem(this.conversationSettingsStorageKey);

      const prefs = stored ? JSON.parse(stored) : {
        sound: true,
        desktop: true,
        badge: true,
        vibration: true,
        perConversationSettings: new Map(),
      };

      if (conversationSettings) {
        const parsed = JSON.parse(conversationSettings);
        prefs.perConversationSettings = new Map(Object.entries(parsed));
      }

      return prefs;
    } catch (error) {
      console.error('[NotificationManager] Error loading preferences:', error);
      return {
        sound: true,
        desktop: true,
        badge: true,
        vibration: true,
        perConversationSettings: new Map(),
      };
    }
  }

  /**
   * Save preferences to storage
   */
  private savePreferences(): void {
    try {
      const globalPrefs = {
        sound: this.preferences.sound,
        desktop: this.preferences.desktop,
        badge: this.preferences.badge,
        vibration: this.preferences.vibration,
      };

      localStorage.setItem(this.storageKey, JSON.stringify(globalPrefs));

      // Save conversation settings separately
      const convSettings = Object.fromEntries(this.preferences.perConversationSettings);
      localStorage.setItem(this.conversationSettingsStorageKey, JSON.stringify(convSettings));
    } catch (error) {
      console.error('[NotificationManager] Error saving preferences:', error);
    }
  }

  /**
   * Notify all listeners of new notification
   */
  private notifyListeners(notification: Notification): void {
    this.notificationListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('[NotificationManager] Error in notification listener:', error);
      }
    });
  }

  /**
   * Notify all preference listeners
   */
  private notifyPreferenceListeners(): void {
    this.preferenceListeners.forEach(listener => {
      try {
        listener(this.getPreferences());
      } catch (error) {
        console.error('[NotificationManager] Error in preference listener:', error);
      }
    });
  }
}

export const notificationManager = NotificationManager.getInstance();

/**
 * React hook for using notification manager
 */
export function useNotificationManager() {
  const manager = NotificationManager.getInstance();

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    return manager.addNotification(notification);
  };

  const subscribe = (listener: NotificationListener) => {
    return manager.subscribe(listener);
  };

  const subscribeToPreferences = (listener: PreferenceChangeListener) => {
    return manager.subscribeToPreferences(listener);
  };

  return {
    addNotification,
    markAsRead: (id: string) => manager.markAsRead(id),
    markAllAsRead: () => manager.markAllAsRead(),
    clearAll: () => manager.clearAll(),
    getAll: () => manager.getAll(),
    getByType: (type: NotificationType) => manager.getByType(type),
    getUnreadCount: () => manager.getUnreadCount(),
    getUnreadCountByType: (type: NotificationType) => manager.getUnreadCountByType(type),
    updatePreferences: (prefs: Partial<Omit<NotificationPreferences, 'perConversationSettings'>>) =>
      manager.updatePreferences(prefs),
    setConversationSettings: (conversationId: string, settings: ConversationNotificationPreferences) =>
      manager.setConversationSettings(conversationId, settings),
    getConversationSettings: (conversationId: string) => manager.getConversationSettings(conversationId),
    removeConversationSettings: (conversationId: string) => manager.removeConversationSettings(conversationId),
    getPreferences: () => manager.getPreferences(),
    shouldShowNotification: (notification: Notification) => manager.shouldShowNotification(notification),
    shouldPlaySound: (notification: Notification) => manager.shouldPlaySound(notification),
    subscribe,
    subscribeToPreferences,
  };
}

export default notificationManager;

interface NotificationPermissionState {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

interface AdminNotification {
  id: string;
  title: string;
  body: string;
  category: 'moderation' | 'system' | 'security' | 'user' | 'seller' | 'dispute';
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
  actions?: NotificationAction[];
  timestamp: Date;
  requiresAction?: boolean;
}

interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
}

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  sound: boolean;
  vibration: boolean;
}

class MobilePushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private categories: NotificationCategory[] = [
    {
      id: 'moderation',
      name: 'Content Moderation',
      description: 'New content requiring review',
      enabled: true,
      priority: 'high',
      sound: true,
      vibration: true
    },
    {
      id: 'system',
      name: 'System Alerts',
      description: 'System status and performance alerts',
      enabled: true,
      priority: 'critical',
      sound: true,
      vibration: true
    },
    {
      id: 'security',
      name: 'Security Alerts',
      description: 'Security incidents and threats',
      enabled: true,
      priority: 'critical',
      sound: true,
      vibration: true
    },
    {
      id: 'user',
      name: 'User Management',
      description: 'User-related notifications',
      enabled: true,
      priority: 'medium',
      sound: false,
      vibration: false
    },
    {
      id: 'seller',
      name: 'Seller Applications',
      description: 'New seller applications and updates',
      enabled: true,
      priority: 'medium',
      sound: false,
      vibration: false
    },
    {
      id: 'dispute',
      name: 'Disputes',
      description: 'New disputes and escalations',
      enabled: true,
      priority: 'high',
      sound: true,
      vibration: true
    }
  ];

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw-admin.js');
        console.log('Admin service worker registered:', this.registration);
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };
  }

  getPermissionState(): NotificationPermissionState {
    if (!('Notification' in window)) {
      return { granted: false, denied: true, default: false };
    }

    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };
  }

  async showNotification(notification: AdminNotification): Promise<void> {
    const permissionState = this.getPermissionState();
    if (!permissionState.granted) {
      console.warn('Notification permission not granted');
      return;
    }

    const category = this.categories.find(c => c.id === notification.category);
    if (!category?.enabled) {
      console.log(`Notifications disabled for category: ${notification.category}`);
      return;
    }

    const options: NotificationOptions = {
      body: notification.body,
      icon: this.getNotificationIcon(notification.category),
      badge: '/icons/admin-badge.png',
      tag: notification.id,
      data: {
        ...notification.data,
        category: notification.category,
        priority: notification.priority,
        timestamp: notification.timestamp.toISOString()
      },
      requireInteraction: notification.priority === 'critical' || notification.requiresAction,
      silent: !category.sound
    };

    if (this.registration) {
      await this.registration.showNotification(notification.title, options);
    } else {
      new Notification(notification.title, options);
    }

    // Store notification for history
    this.storeNotificationHistory(notification);
  }

  private getNotificationIcon(category: string): string {
    const iconMap: Record<string, string> = {
      moderation: '/icons/shield.png',
      system: '/icons/system.png',
      security: '/icons/security.png',
      user: '/icons/user.png',
      seller: '/icons/seller.png',
      dispute: '/icons/dispute.png'
    };
    return iconMap[category] || '/icons/default.png';
  }

  private getVibrationPattern(priority: string): number[] {
    const patterns: Record<string, number[]> = {
      low: [100],
      medium: [100, 50, 100],
      high: [200, 100, 200],
      critical: [300, 100, 300, 100, 300]
    };
    return patterns[priority] || [100];
  }

  async showModerationAlert(count: number, urgentCount: number = 0): Promise<void> {
    const notification: AdminNotification = {
      id: `moderation-${Date.now()}`,
      title: 'Content Moderation Required',
      body: urgentCount > 0 
        ? `${count} items pending review (${urgentCount} urgent)`
        : `${count} items pending review`,
      category: 'moderation',
      priority: urgentCount > 0 ? 'critical' : 'high',
      timestamp: new Date(),
      requiresAction: true,
      actions: [
        { id: 'review', title: 'Review Now', icon: '/icons/review.png' },
        { id: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
      ],
      data: { count, urgentCount, type: 'moderation_queue' }
    };

    await this.showNotification(notification);
  }

  async showSystemAlert(message: string, severity: 'warning' | 'error' | 'critical'): Promise<void> {
    const priorityMap = { warning: 'medium', error: 'high', critical: 'critical' } as const;
    
    const notification: AdminNotification = {
      id: `system-${Date.now()}`,
      title: `System ${severity.toUpperCase()}`,
      body: message,
      category: 'system',
      priority: priorityMap[severity],
      timestamp: new Date(),
      requiresAction: severity === 'critical',
      actions: severity === 'critical' ? [
        { id: 'investigate', title: 'Investigate', icon: '/icons/investigate.png' },
        { id: 'acknowledge', title: 'Acknowledge', icon: '/icons/check.png' }
      ] : undefined,
      data: { severity, type: 'system_alert' }
    };

    await this.showNotification(notification);
  }

  async showSecurityAlert(threat: string, details: string): Promise<void> {
    const notification: AdminNotification = {
      id: `security-${Date.now()}`,
      title: 'Security Alert',
      body: `${threat}: ${details}`,
      category: 'security',
      priority: 'critical',
      timestamp: new Date(),
      requiresAction: true,
      actions: [
        { id: 'investigate', title: 'Investigate', icon: '/icons/investigate.png' },
        { id: 'block', title: 'Block', icon: '/icons/block.png' },
        { id: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
      ],
      data: { threat, details, type: 'security_alert' }
    };

    await this.showNotification(notification);
  }

  async showDisputeAlert(disputeId: string, type: string, priority: 'medium' | 'high' | 'critical'): Promise<void> {
    const notification: AdminNotification = {
      id: `dispute-${disputeId}`,
      title: 'New Dispute',
      body: `${type} dispute requires attention`,
      category: 'dispute',
      priority,
      timestamp: new Date(),
      requiresAction: priority === 'critical',
      actions: [
        { id: 'review', title: 'Review', icon: '/icons/review.png' },
        { id: 'assign', title: 'Assign', icon: '/icons/assign.png' }
      ],
      data: { disputeId, type: 'dispute_alert' }
    };

    await this.showNotification(notification);
  }

  getCategories(): NotificationCategory[] {
    return [...this.categories];
  }

  updateCategorySettings(categoryId: string, settings: Partial<NotificationCategory>): void {
    const categoryIndex = this.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex !== -1) {
      this.categories[categoryIndex] = { ...this.categories[categoryIndex], ...settings };
      this.saveCategorySettings();
    }
  }

  private saveCategorySettings(): void {
    localStorage.setItem('admin-notification-categories', JSON.stringify(this.categories));
  }

  private loadCategorySettings(): void {
    const saved = localStorage.getItem('admin-notification-categories');
    if (saved) {
      try {
        this.categories = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    }
  }

  private storeNotificationHistory(notification: AdminNotification): void {
    const history = this.getNotificationHistory();
    history.unshift(notification);
    
    // Keep only last 100 notifications
    const trimmed = history.slice(0, 100);
    localStorage.setItem('admin-notification-history', JSON.stringify(trimmed));
  }

  getNotificationHistory(): AdminNotification[] {
    const saved = localStorage.getItem('admin-notification-history');
    if (saved) {
      try {
        return JSON.parse(saved).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
      } catch (error) {
        console.error('Failed to load notification history:', error);
      }
    }
    return [];
  }

  clearNotificationHistory(): void {
    localStorage.removeItem('admin-notification-history');
  }

  async clearAllNotifications(): Promise<void> {
    if (this.registration) {
      const notifications = await this.registration.getNotifications();
      notifications.forEach(notification => notification.close());
    }
  }

  // Handle notification clicks and actions
  handleNotificationClick(event: any): void {
    // This method is called from service worker context, but we're typing it as 'any' 
    // since the NotificationEvent type is only available in web workers
    const notificationEvent = event as any;
    notificationEvent.notification.close();
    
    const data = notificationEvent.notification.data;
    if (data?.type) {
      this.navigateToRelevantSection(data.type, data);
    }
  }

  handleNotificationAction(event: any, action: string): void {
    // This method is called from service worker context, but we're typing it as 'any'
    // since the NotificationEvent type is only available in web workers
    const notificationEvent = event as any;
    notificationEvent.notification.close();
    
    const data = notificationEvent.notification.data;
    if (data?.type) {
      this.handleAction(data.type, action, data);
    }
  }

  private navigateToRelevantSection(type: string, data: any): void {
    const routes: Record<string, string> = {
      moderation_queue: '/admin/moderation',
      system_alert: '/admin/system',
      security_alert: '/admin/security',
      dispute_alert: '/admin/disputes',
      system_monitoring: '/admin/monitoring'
    };

    const route = routes[type];
    if (route) {
      // Use client-side navigation
      if (typeof window !== 'undefined') {
        window.location.href = route;
      }
    }
  }

  private handleAction(type: string, action: string, data: any): void {
    switch (type) {
      case 'moderation_queue':
      case 'system_alert':
      case 'security_alert':
      case 'dispute_alert':
        this.navigateToRelevantSection(type, data);
        break;
      case 'system_monitoring':
        this.navigateToRelevantSection('system_monitoring', data);
        break;
      case 'dispute_assignment':
        this.navigateToRelevantSection('dispute_assignment', data);
        break;
      case 'security_action':
        this.handleSecurityAction(action, data);
        break;
      default:
        console.warn(`Unknown notification type: ${type}`);
    }
  }

  private handleSecurityAction(action: string, data: any): void {
    // Implement security action handling
    console.log(`Security action ${action} with data:`, data);
  }
}

export const mobilePushNotificationService = new MobilePushNotificationService();
export type { AdminNotification, NotificationCategory, NotificationPermissionState };
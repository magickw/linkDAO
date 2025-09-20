import { 
  RealTimeNotification, 
  NotificationCategory, 
  NotificationPriority,
  NotificationQueue,
  NotificationSettings,
  LiveUpdateIndicator,
  NotificationState
} from '../types/realTimeNotifications';

class RealTimeNotificationService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private batchTimeout: NodeJS.Timeout | null = null;
  private pendingBatch: RealTimeNotification[] = [];
  
  private listeners: Map<string, Set<Function>> = new Map();
  private notificationQueue: NotificationQueue = {
    online: [],
    offline: [],
    failed: []
  };

  private defaultSettings: NotificationSettings = {
    categories: {
      [NotificationCategory.MENTION]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: true },
      [NotificationCategory.TIP]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: false },
      [NotificationCategory.GOVERNANCE]: { enabled: true, priority: NotificationPriority.URGENT, sound: true, desktop: true, email: true },
      [NotificationCategory.COMMUNITY]: { enabled: true, priority: NotificationPriority.NORMAL, sound: false, desktop: true, email: false },
      [NotificationCategory.REACTION]: { enabled: true, priority: NotificationPriority.LOW, sound: false, desktop: false, email: false },
      [NotificationCategory.COMMENT]: { enabled: true, priority: NotificationPriority.NORMAL, sound: false, desktop: true, email: false },
      [NotificationCategory.FOLLOW]: { enabled: true, priority: NotificationPriority.NORMAL, sound: false, desktop: true, email: false },
      [NotificationCategory.SYSTEM]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: false }
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    batchDelay: 2000,
    maxBatchSize: 10
  };

  constructor() {
    this.loadSettings();
    this.setupEventListeners();
  }

  // Connection Management
  connect(userId: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/notifications?userId=${userId}&token=${token}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('Real-time notification service connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.syncOfflineNotifications();
          this.emit('connection', { status: 'connected' });
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = () => {
          console.log('Real-time notification service disconnected');
          this.stopHeartbeat();
          this.emit('connection', { status: 'disconnected' });
          this.attemptReconnect(userId, token);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('connection', { status: 'error', error });
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
  }

  private attemptReconnect(userId: string, token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    this.emit('connection', { status: 'reconnecting', attempt: this.reconnectAttempts });
    
    setTimeout(() => {
      this.connect(userId, token).catch(() => {
        // Reconnection failed, will try again
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Message Handling
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'notification':
          this.handleNotification(data.payload);
          break;
        case 'live_update':
          this.handleLiveUpdate(data.payload);
          break;
        case 'batch_notifications':
          this.handleBatchNotifications(data.payload);
          break;
        case 'pong':
          // Heartbeat response
          break;
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleNotification(notification: RealTimeNotification): void {
    // Check if notifications are enabled for this category
    const settings = this.getSettings();
    const categorySettings = settings.categories[notification.category];
    
    if (!categorySettings.enabled) {
      return;
    }

    // Check quiet hours
    if (this.isQuietHours()) {
      this.queueNotification(notification, 'offline');
      return;
    }

    // Process immediate notifications
    if (notification.urgency === 'immediate') {
      this.processImmediateNotification(notification);
    } else {
      this.addToBatch(notification);
    }
  }

  private handleLiveUpdate(update: LiveUpdateIndicator): void {
    this.emit('live_update', update);
  }

  private handleBatchNotifications(notifications: RealTimeNotification[]): void {
    notifications.forEach(notification => {
      this.emit('notification', notification);
    });
  }

  // Notification Processing
  private processImmediateNotification(notification: RealTimeNotification): void {
    // Show desktop notification if enabled
    if (this.shouldShowDesktopNotification(notification)) {
      this.showDesktopNotification(notification);
    }

    // Play sound if enabled
    if (this.shouldPlaySound(notification)) {
      this.playNotificationSound(notification);
    }

    // Emit to listeners
    this.emit('notification', notification);
    this.emit(`notification:${notification.category}`, notification);
  }

  private addToBatch(notification: RealTimeNotification): void {
    this.pendingBatch.push(notification);
    
    const settings = this.getSettings();
    
    // Process batch if it reaches max size
    if (this.pendingBatch.length >= settings.maxBatchSize) {
      this.processBatch();
    } else if (!this.batchTimeout) {
      // Set timeout for batch processing
      this.batchTimeout = setTimeout(() => {
        this.processBatch();
      }, settings.batchDelay);
    }
  }

  private processBatch(): void {
    if (this.pendingBatch.length === 0) return;

    const batch = [...this.pendingBatch];
    this.pendingBatch = [];
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Group by category for better UX
    const groupedNotifications = this.groupNotificationsByCategory(batch);
    
    // Emit batch
    this.emit('notification_batch', groupedNotifications);
    
    // Process individual notifications
    batch.forEach(notification => {
      this.emit('notification', notification);
      this.emit(`notification:${notification.category}`, notification);
    });
  }

  private groupNotificationsByCategory(notifications: RealTimeNotification[]): Record<NotificationCategory, RealTimeNotification[]> {
    return notifications.reduce((groups, notification) => {
      if (!groups[notification.category]) {
        groups[notification.category] = [];
      }
      groups[notification.category].push(notification);
      return groups;
    }, {} as Record<NotificationCategory, RealTimeNotification[]>);
  }

  // Desktop Notifications
  private shouldShowDesktopNotification(notification: RealTimeNotification): boolean {
    const settings = this.getSettings();
    const categorySettings = settings.categories[notification.category];
    return categorySettings.desktop && this.hasDesktopPermission();
  }

  private hasDesktopPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  async requestDesktopPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
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
  }

  private showDesktopNotification(notification: RealTimeNotification): void {
    if (!this.hasDesktopPermission()) return;

    const options: NotificationOptions = {
      body: notification.message,
      icon: this.getNotificationIcon(notification),
      badge: '/icons/notification-badge.png',
      tag: notification.id,
      requireInteraction: notification.priority === NotificationPriority.URGENT,
      silent: !this.shouldPlaySound(notification)
    };

    const desktopNotification = new Notification(notification.title, options);
    
    desktopNotification.onclick = () => {
      window.focus();
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }
      desktopNotification.close();
    };

    // Auto-close after 5 seconds for non-urgent notifications
    if (notification.priority !== NotificationPriority.URGENT) {
      setTimeout(() => {
        desktopNotification.close();
      }, 5000);
    }
  }

  private getNotificationIcon(notification: RealTimeNotification): string {
    const iconMap = {
      [NotificationCategory.MENTION]: '/icons/mention.png',
      [NotificationCategory.TIP]: '/icons/tip.png',
      [NotificationCategory.GOVERNANCE]: '/icons/governance.png',
      [NotificationCategory.COMMUNITY]: '/icons/community.png',
      [NotificationCategory.REACTION]: '/icons/reaction.png',
      [NotificationCategory.COMMENT]: '/icons/comment.png',
      [NotificationCategory.FOLLOW]: '/icons/follow.png',
      [NotificationCategory.SYSTEM]: '/icons/system.png'
    };
    
    return iconMap[notification.category] || '/icons/default-notification.png';
  }

  // Sound Notifications
  private shouldPlaySound(notification: RealTimeNotification): boolean {
    const settings = this.getSettings();
    const categorySettings = settings.categories[notification.category];
    return categorySettings.sound && !this.isQuietHours();
  }

  private playNotificationSound(notification: RealTimeNotification): void {
    try {
      const audio = new Audio(this.getNotificationSound(notification));
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.warn('Could not play notification sound:', error);
      });
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  }

  private getNotificationSound(notification: RealTimeNotification): string {
    const soundMap = {
      [NotificationCategory.MENTION]: '/sounds/mention.mp3',
      [NotificationCategory.TIP]: '/sounds/tip.mp3',
      [NotificationCategory.GOVERNANCE]: '/sounds/governance.mp3',
      [NotificationCategory.COMMUNITY]: '/sounds/community.mp3',
      [NotificationCategory.REACTION]: '/sounds/reaction.mp3',
      [NotificationCategory.COMMENT]: '/sounds/comment.mp3',
      [NotificationCategory.FOLLOW]: '/sounds/follow.mp3',
      [NotificationCategory.SYSTEM]: '/sounds/system.mp3'
    };
    
    return soundMap[notification.category] || '/sounds/default.mp3';
  }

  // Offline Support
  private queueNotification(notification: RealTimeNotification, queue: keyof NotificationQueue): void {
    this.notificationQueue[queue].push(notification);
    this.saveQueueToStorage();
  }

  private syncOfflineNotifications(): void {
    const offlineNotifications = [...this.notificationQueue.offline];
    this.notificationQueue.offline = [];
    
    offlineNotifications.forEach(notification => {
      this.handleNotification(notification);
    });
    
    this.saveQueueToStorage();
    this.emit('offline_sync', { count: offlineNotifications.length });
  }

  private saveQueueToStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem('notification_queue', JSON.stringify(this.notificationQueue));
    } catch (error) {
      console.warn('Could not save notification queue to storage:', error);
    }
  }

  private loadQueueFromStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      const stored = localStorage.getItem('notification_queue');
      if (stored) {
        this.notificationQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Could not load notification queue from storage:', error);
    }
  }

  // Settings Management
  getSettings(): NotificationSettings {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return this.defaultSettings;
    }
    try {
      const stored = localStorage.getItem('notification_settings');
      if (stored) {
        return { ...this.defaultSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Could not load notification settings:', error);
    }
    return this.defaultSettings;
  }

  updateSettings(settings: Partial<NotificationSettings>): void {
    const currentSettings = this.getSettings();
    const newSettings = { ...currentSettings, ...settings };
    
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      this.emit('settings_updated', newSettings);
      return;
    }
    
    try {
      localStorage.setItem('notification_settings', JSON.stringify(newSettings));
      this.emit('settings_updated', newSettings);
    } catch (error) {
      console.error('Could not save notification settings:', error);
    }
  }

  private loadSettings(): void {
    // Settings are loaded on-demand via getSettings()
    this.loadQueueFromStorage();
  }

  private isQuietHours(): boolean {
    const settings = this.getSettings();
    if (!settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Event System
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in notification event callback:', error);
        }
      });
    }
  }

  // Utility Methods
  private setupEventListeners(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Page became visible, sync any missed notifications
        this.syncOfflineNotifications();
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      this.syncOfflineNotifications();
    });

    window.addEventListener('offline', () => {
      this.emit('connection', { status: 'offline' });
    });
  }

  // Public API Methods
  markAsRead(notificationId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'mark_read',
        payload: { notificationId }
      }));
    }
  }

  markAllAsRead(category?: NotificationCategory): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'mark_all_read',
        payload: { category }
      }));
    }
  }

  dismissNotification(notificationId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'dismiss',
        payload: { notificationId }
      }));
    }
  }

  subscribeToPost(postId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe_post',
        payload: { postId }
      }));
    }
  }

  unsubscribeFromPost(postId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe_post',
        payload: { postId }
      }));
    }
  }

  getConnectionStatus(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'disconnecting';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

export const realTimeNotificationService = new RealTimeNotificationService();
export default realTimeNotificationService;
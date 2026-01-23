import {
  RealTimeNotification,
  NotificationCategory,
  NotificationPriority,
  NotificationQueue,
  NotificationSettings,
  LiveUpdateIndicator,
  NotificationState
} from '../types/realTimeNotifications';
import { io, Socket } from 'socket.io-client';
import { ENV_CONFIG } from '../config/environment';
import { pollingService } from './pollingService';
import { notificationService } from './notificationService';

class RealTimeNotificationService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private batchTimeout: NodeJS.Timeout | null = null;
  private pendingBatch: RealTimeNotification[] = [];
  private db: IDBDatabase | null = null;
  private isPolling = false;
  private lastPollTime: Date = new Date();

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
      [NotificationCategory.SYSTEM]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: false },
      // Social interaction notification defaults
      [NotificationCategory.UPVOTE]: { enabled: true, priority: NotificationPriority.LOW, sound: false, desktop: false, email: false },
      [NotificationCategory.DOWNVOTE]: { enabled: false, priority: NotificationPriority.LOW, sound: false, desktop: false, email: false },
      [NotificationCategory.REPOST]: { enabled: true, priority: NotificationPriority.NORMAL, sound: false, desktop: true, email: false },
      [NotificationCategory.AWARD]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: false },
      [NotificationCategory.BOOKMARK]: { enabled: false, priority: NotificationPriority.LOW, sound: false, desktop: false, email: false },
      // Order/marketplace notification defaults
      [NotificationCategory.ORDER_CREATED]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: true },
      [NotificationCategory.ORDER_CONFIRMED]: { enabled: true, priority: NotificationPriority.NORMAL, sound: false, desktop: true, email: false },
      [NotificationCategory.ORDER_PROCESSING]: { enabled: true, priority: NotificationPriority.NORMAL, sound: false, desktop: true, email: false },
      [NotificationCategory.ORDER_SHIPPED]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: true },
      [NotificationCategory.ORDER_DELIVERED]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: true },
      [NotificationCategory.ORDER_COMPLETED]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: false },
      [NotificationCategory.ORDER_CANCELLED]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: true },
      [NotificationCategory.ORDER_REFUNDED]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: true },
      [NotificationCategory.ORDER_DISPUTED]: { enabled: true, priority: NotificationPriority.URGENT, sound: true, desktop: true, email: true },
      [NotificationCategory.PAYMENT_RECEIVED]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: false },
      [NotificationCategory.DELIVERY_CONFIRMED]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: false },
      [NotificationCategory.ESCROW_FUNDED]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: false },
      [NotificationCategory.ESCROW_RELEASED]: { enabled: true, priority: NotificationPriority.HIGH, sound: true, desktop: true, email: true }
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
    this.initializeDatabase();
  }

  // Initialize IndexedDB for offline storage
  private async initializeDatabase(): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NotificationQueueDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.loadQueueFromStorage();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores for different queue types
        if (!db.objectStoreNames.contains('online')) {
          const onlineStore = db.createObjectStore('online', { keyPath: 'id' });
          onlineStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('offline')) {
          const offlineStore = db.createObjectStore('offline', { keyPath: 'id' });
          offlineStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('failed')) {
          const failedStore = db.createObjectStore('failed', { keyPath: 'id' });
          failedStore.createIndex('timestamp', 'timestamp');
          failedStore.createIndex('retryCount', 'retryCount');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Connection Management
  connect(userId: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use Socket.IO client
        // Pass the HTTP/HTTPS URL, Socket.IO handles the WebSocket protocol automatically
        const wsUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';

        this.socket = io(wsUrl, {
          path: '/socket.io/',
          transports: ['websocket', 'polling'],
          auth: {
            userId,
            token
          },
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          timeout: 30000
        });

        this.socket.on('connect', () => {
          console.log('[RealTimeNotification] Socket.IO connected:', this.socket?.id);
          this.reconnectAttempts = 0;
          this.stopPollingFallback();
          this.startHeartbeat();
          this.syncOfflineNotifications();
          this.emit('connection', { status: 'connected' });
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          const errorMsg = error.message || 'Socket.IO connection error';
          console.error('[RealTimeNotification] Socket.IO error:', errorMsg);
          this.emit('connection', { status: 'error', error: errorMsg });

          // Start polling fallback on connection error
          this.startPollingFallback();

          if (this.reconnectAttempts === 0) {
            // Don't reject, just resolve and fall back to polling
            // reject(new Error(errorMsg));
            resolve();
          }
        });

        this.socket.on('disconnect', (reason) => {
          console.log('[RealTimeNotification] Socket.IO disconnected:', reason);
          this.stopHeartbeat();
          this.startPollingFallback();
          this.emit('connection', { status: 'disconnected', reason });
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log('[RealTimeNotification] Socket.IO reconnected after', attemptNumber, 'attempts');
          this.reconnectAttempts = 0;
          this.stopPollingFallback();
          this.emit('connection', { status: 'connected' });
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
          console.log('[RealTimeNotification] Socket.IO reconnect attempt:', attemptNumber);
          this.reconnectAttempts = attemptNumber;
          this.emit('connection', { status: 'reconnecting', attempt: attemptNumber });
        });

        this.socket.on('reconnect_failed', () => {
          console.error('[RealTimeNotification] Socket.IO reconnection failed');
          this.startPollingFallback();
          this.emit('connection', { status: 'error', error: 'Max reconnection attempts reached' });
        });

        // Listen for notification events from the server
        this.socket.on('notification', (data: any) => {
          this.handleNotification(data);
        });

        this.socket.on('live_update', (data: any) => {
          this.handleLiveUpdate(data);
        });

        this.socket.on('batch_notifications', (data: any) => {
          this.handleBatchNotifications(data);
        });

        this.socket.on('pong', () => {
          // Heartbeat response
        });

      } catch (error) {
        // Fallback to polling on init error
        this.startPollingFallback();
        resolve(); // Resolve to allow app to continue
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.stopHeartbeat();
    this.stopPollingFallback();
  }

  // Polling Fallback Implementation
  private startPollingFallback(): void {
    if (this.isPolling) return;

    console.log('[RealTimeNotification] Starting polling fallback');
    this.isPolling = true;

    pollingService.startPolling('notifications', async () => {
      await this.checkNewNotifications();
    }, { interval: 30000, runImmediately: true });
  }

  private stopPollingFallback(): void {
    if (!this.isPolling) return;

    console.log('[RealTimeNotification] Stopping polling fallback');
    pollingService.stopPolling('notifications');
    this.isPolling = false;
  }

  private async checkNewNotifications(): Promise<void> {
    try {
      // 1. Fetch unread count to see if we missed anything
      const unreadCount = await notificationService.getUnreadCount();

      // 2. Fetch latest notifications
      const response = await notificationService.getNotifications({
        limit: 10,
        includeRead: false
      });

      // 3. Process new notifications
      const newNotifications = response.notifications.filter(n =>
        new Date(n.createdAt).getTime() > this.lastPollTime.getTime()
      );

      if (newNotifications.length > 0) {
        console.log(`[RealTimeNotification] Polling found ${newNotifications.length} new notifications`);
        this.lastPollTime = new Date();

        // Convert AppNotification to RealTimeNotification format if needed
        // Assuming they are compatible or mapping is handled
        newNotifications.forEach(n => {
          // Map AppNotification fields to RealTimeNotification
          const rtNotification: RealTimeNotification = {
            id: n.id,
            type: n.type,
            category: n.category as NotificationCategory,
            title: n.title,
            message: n.message,
            timestamp: n.createdAt,
            read: n.isRead,
            actionUrl: n.actionUrl,
            priority: n.priority as NotificationPriority || NotificationPriority.NORMAL,
            data: n.data,
            urgency: NotificationUrgency.TIMELY // Default for polled items
          };
          this.handleNotification(rtNotification);
        });
      }
    } catch (error) {
      console.warn('[RealTimeNotification] Polling error:', error);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping');
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
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
      [NotificationCategory.SYSTEM]: '/icons/system.png',
      [NotificationCategory.UPVOTE]: '/icons/upvote.png',
      [NotificationCategory.DOWNVOTE]: '/icons/downvote.png',
      [NotificationCategory.REPOST]: '/icons/repost.png',
      [NotificationCategory.AWARD]: '/icons/award.png',
      [NotificationCategory.BOOKMARK]: '/icons/bookmark.png',
      // Order/marketplace icons
      [NotificationCategory.ORDER_CREATED]: '/icons/order-new.png',
      [NotificationCategory.ORDER_CONFIRMED]: '/icons/order-confirmed.png',
      [NotificationCategory.ORDER_PROCESSING]: '/icons/order-processing.png',
      [NotificationCategory.ORDER_SHIPPED]: '/icons/order-shipped.png',
      [NotificationCategory.ORDER_DELIVERED]: '/icons/order-delivered.png',
      [NotificationCategory.ORDER_COMPLETED]: '/icons/order-completed.png',
      [NotificationCategory.ORDER_CANCELLED]: '/icons/order-cancelled.png',
      [NotificationCategory.ORDER_REFUNDED]: '/icons/order-refunded.png',
      [NotificationCategory.ORDER_DISPUTED]: '/icons/order-disputed.png',
      [NotificationCategory.PAYMENT_RECEIVED]: '/icons/payment-received.png',
      [NotificationCategory.DELIVERY_CONFIRMED]: '/icons/delivery-confirmed.png',
      [NotificationCategory.ESCROW_FUNDED]: '/icons/escrow-funded.png',
      [NotificationCategory.ESCROW_RELEASED]: '/icons/escrow-released.png'
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
      audio.play().catch(err => {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.warn('[RealTimeNotification] Sound play failed:', errorMsg);
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[RealTimeNotification] Sound error:', errorMsg);
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
      [NotificationCategory.SYSTEM]: '/sounds/system.mp3',
      [NotificationCategory.UPVOTE]: '/sounds/upvote.mp3',
      [NotificationCategory.DOWNVOTE]: '/sounds/downvote.mp3',
      [NotificationCategory.REPOST]: '/sounds/repost.mp3',
      [NotificationCategory.AWARD]: '/sounds/award.mp3',
      [NotificationCategory.BOOKMARK]: '/sounds/bookmark.mp3',
      // Order/marketplace sounds
      [NotificationCategory.ORDER_CREATED]: '/sounds/order-new.mp3',
      [NotificationCategory.ORDER_CONFIRMED]: '/sounds/order-confirmed.mp3',
      [NotificationCategory.ORDER_PROCESSING]: '/sounds/order-processing.mp3',
      [NotificationCategory.ORDER_SHIPPED]: '/sounds/order-shipped.mp3',
      [NotificationCategory.ORDER_DELIVERED]: '/sounds/order-delivered.mp3',
      [NotificationCategory.ORDER_COMPLETED]: '/sounds/order-completed.mp3',
      [NotificationCategory.ORDER_CANCELLED]: '/sounds/order-cancelled.mp3',
      [NotificationCategory.ORDER_REFUNDED]: '/sounds/order-refunded.mp3',
      [NotificationCategory.ORDER_DISPUTED]: '/sounds/order-disputed.mp3',
      [NotificationCategory.PAYMENT_RECEIVED]: '/sounds/payment-received.mp3',
      [NotificationCategory.DELIVERY_CONFIRMED]: '/sounds/delivery-confirmed.mp3',
      [NotificationCategory.ESCROW_FUNDED]: '/sounds/escrow-funded.mp3',
      [NotificationCategory.ESCROW_RELEASED]: '/sounds/escrow-released.mp3'
    };

    return soundMap[notification.category] || '/sounds/default.mp3';
  }

  // Enhanced offline support with IndexedDB
  private async queueNotification(notification: RealTimeNotification, queue: keyof NotificationQueue): Promise<void> {
    this.notificationQueue[queue].push(notification);
    await this.saveQueueToStorage();
  }

  private async syncOfflineNotifications(): Promise<void> {
    if (!this.db) {
      // Fallback to localStorage if IndexedDB is not available
      const offlineNotifications = [...this.notificationQueue.offline];
      this.notificationQueue.offline = [];

      offlineNotifications.forEach(notification => {
        this.handleNotification(notification);
      });

      this.saveQueueToStorage();
      this.emit('offline_sync', { count: offlineNotifications.length });
      return;
    }

    try {
      // Get offline notifications from IndexedDB
      const offlineNotifications = await this.getStoredNotifications('offline');

      // Process each notification with retry logic
      for (const notification of offlineNotifications) {
        try {
          await this.processNotificationWithRetry(notification);
        } catch (error) {
          // If processing fails, move to failed queue
          await this.moveToFailedQueue(notification);
        }
      }

      // Clear offline queue after processing
      await this.clearStoredNotifications('offline');

      this.emit('offline_sync', { count: offlineNotifications.length });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[RealTimeNotification] Sync error:', errorMsg);
    }
  }

  private async processNotificationWithRetry(notification: RealTimeNotification & { retryCount?: number }): Promise<void> {
    const maxRetries = 3;
    const retryCount = notification.retryCount || 0;

    try {
      this.handleNotification(notification);
    } catch (error) {
      if (retryCount < maxRetries) {
        // Schedule retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        setTimeout(() => {
          this.processNotificationWithRetry({ ...notification, retryCount: retryCount + 1 });
        }, delay);
      } else {
        throw error;
      }
    }
  }

  private async moveToFailedQueue(notification: RealTimeNotification): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['failed'], 'readwrite');
      const store = transaction.objectStore('failed');

      const failedNotification = {
        ...notification,
        failedAt: new Date(),
        retryCount: (notification as any).retryCount || 0
      };

      const request = store.add(failedNotification);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async saveQueueToStorage(): Promise<void> {
    if (!this.db) {
      // Fallback to localStorage
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      try {
        localStorage.setItem('notification_queue', JSON.stringify(this.notificationQueue));
      } catch (error) {
        console.warn('Could not save notification queue to storage:', error);
      }
      return;
    }

    try {
      // Save each queue to its respective object store
      await this.saveNotificationsToStore('online', this.notificationQueue.online);
      await this.saveNotificationsToStore('offline', this.notificationQueue.offline);
      await this.saveNotificationsToStore('failed', this.notificationQueue.failed);
    } catch (error) {
      console.warn('Could not save notification queue to IndexedDB:', error);
    }
  }

  private async saveNotificationsToStore(storeName: string, notifications: RealTimeNotification[]): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      // Clear existing notifications
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        // Add all notifications
        notifications.forEach(notification => {
          store.add(notification);
        });
        resolve();
      };

      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  private async getStoredNotifications(storeName: string): Promise<RealTimeNotification[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async clearStoredNotifications(storeName: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private loadQueueFromStorage(): void {
    if (!this.db) {
      // Fallback to localStorage
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
      return;
    }

    // Load from IndexedDB
    Promise.all([
      this.getStoredNotifications('online'),
      this.getStoredNotifications('offline'),
      this.getStoredNotifications('failed')
    ]).then(([online, offline, failed]) => {
      this.notificationQueue = {
        online,
        offline,
        failed
      };
    }).catch(error => {
      console.warn('Could not load notification queue from IndexedDB:', error);
    });
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
    if (this.socket && this.socket.connected) {
      this.socket.emit('mark_read', { notificationId });
    }
  }

  markAllAsRead(category?: NotificationCategory): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('mark_all_read', { category });
    }
  }

  dismissNotification(notificationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('dismiss', { notificationId });
    }
  }

  subscribeToPost(postId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('subscribe_post', { postId });
    }
  }

  unsubscribeFromPost(postId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('unsubscribe_post', { postId });
    }
  }

  getConnectionStatus(): string {
    if (!this.socket) return 'disconnected';

    return this.socket.connected ? 'connected' : 'disconnected';
  }
}

export const realTimeNotificationService = new RealTimeNotificationService();
export default realTimeNotificationService;
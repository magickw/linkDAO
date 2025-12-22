import { webSocketManager } from './webSocketManager';

interface SellerWebSocketConfig {
  walletAddress: string;
  autoConnect?: boolean;
  enableNotifications?: boolean;
  enableAnalytics?: boolean;
}

interface SellerNotification {
  id: string;
  type: 'order' | 'payment' | 'review' | 'tier' | 'system';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: Date;
}

interface SellerOrder {
  id: string;
  buyerAddress: string;
  listingId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'disputed' | 'completed';
  createdAt: Date;
}

interface SellerAnalytics {
  sales: number;
  revenue: number;
  orders: number;
  rating: number;
  period: string;
  timestamp: Date;
}

interface ConnectionStatus {
  connected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: string;
}

export class SellerWebSocketService {
  private webSocketClient = getWebSocketClient();
  private config: SellerWebSocketConfig;
  private subscriptions: Set<string> = new Set();
  private eventListeners: Map<string, Set<Function>> = new Map();
  private notificationQueue: SellerNotification[] = [];
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnectAttempts: 0
  };
  private cacheInvalidationCallbacks: Map<string, Function[]> = new Map();

  constructor(config: SellerWebSocketConfig) {
    this.config = config;
    
    // Get WebSocket client from manager
    this.webSocketClient = webSocketManager.getPrimaryConnection();
    
    if (!this.webSocketClient) {
      console.warn('WebSocket client not available. Some features may not work.');
    }

    this.setupEventHandlers();
    
    if (config.autoConnect) {
      this.connect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.webSocketClient) return;

    // Connection state handlers
    this.webSocketClient.on('connection_state_changed', (state: any) => {
      this.connectionStatus = {
        connected: state.status === 'connected',
        lastConnected: state.lastConnected,
        reconnectAttempts: state.reconnectAttempts,
        error: state.error
      };
      this.emit('connection_status_changed', this.connectionStatus);
    });

    this.webSocketClient.on('authenticated', (data: any) => {
      console.log('Seller WebSocket authenticated:', data);
      this.subscribeToSellerEvents();
      this.emit('seller_authenticated', data);
    });

    // Seller-specific event handlers
    this.webSocketClient.on('seller_connected', (data: any) => {
      console.log('Seller connected:', data);
      this.emit('seller_connected', data);
    });

    this.webSocketClient.on('profile_updated', (data: any) => {
      console.log('Profile updated:', data);
      this.handleCacheInvalidation(['profile', 'dashboard']);
      this.emit('profile_updated', data);
    });

    this.webSocketClient.on('new_order', (data: any) => {
      console.log('New order received:', data);
      this.handleNewOrder(data);
      this.handleCacheInvalidation(['orders', 'dashboard', 'analytics']);
      this.emit('new_order', data);
    });

    this.webSocketClient.on('order_status_changed', (data: any) => {
      console.log('Order status changed:', data);
      this.handleOrderStatusChange(data);
      this.handleCacheInvalidation(['orders', 'dashboard']);
      this.emit('order_status_changed', data);
    });

    this.webSocketClient.on('tier_upgraded', (data: any) => {
      console.log('Tier upgraded:', data);
      this.handleTierUpgrade(data);
      this.handleCacheInvalidation(['profile', 'tier', 'dashboard']);
      this.emit('tier_upgraded', data);
    });

    this.webSocketClient.on('listing_updated', (data: any) => {
      console.log('Listing updated:', data);
      this.handleCacheInvalidation(['listings', 'dashboard']);
      this.emit('listing_updated', data);
    });

    this.webSocketClient.on('payment_received', (data: any) => {
      console.log('Payment received:', data);
      this.handlePaymentReceived(data);
      this.handleCacheInvalidation(['payments', 'dashboard', 'analytics']);
      this.emit('payment_received', data);
    });

    this.webSocketClient.on('review_received', (data: any) => {
      console.log('Review received:', data);
      this.handleReviewReceived(data);
      this.handleCacheInvalidation(['reviews', 'reputation', 'dashboard']);
      this.emit('review_received', data);
    });

    this.webSocketClient.on('analytics_updated', (data: any) => {
      console.log('Analytics updated:', data);
      this.handleAnalyticsUpdate(data);
      this.handleCacheInvalidation(['analytics', 'dashboard']);
      this.emit('analytics_updated', data);
    });

    this.webSocketClient.on('seller_notification', (data: any) => {
      console.log('Seller notification:', data);
      this.handleNotification(data.notification);
      this.emit('seller_notification', data);
    });

    this.webSocketClient.on('cache_invalidation', (data: any) => {
      console.log('Cache invalidation:', data);
      this.handleCacheInvalidation(data.keys);
      this.emit('cache_invalidation', data);
    });

    this.webSocketClient.on('seller_online', (data: any) => {
      console.log('Seller online:', data);
      this.processNotificationQueue();
      this.emit('seller_online', data);
    });

    this.webSocketClient.on('system_maintenance', (data: any) => {
      console.log('System maintenance:', data);
      this.handleSystemMaintenance(data);
      this.emit('system_maintenance', data);
    });
  }

  // Connection Management
  async connect(): Promise<void> {
    if (!this.webSocketClient) {
      throw new Error('WebSocket client not available');
    }

    try {
      await this.webSocketClient.connect();
      console.log('Seller WebSocket connected');
    } catch (error) {
      console.error('Failed to connect seller WebSocket:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.webSocketClient) {
      this.webSocketClient.disconnect();
    }
    this.cleanup();
  }

  // Subscription Management
  private subscribeToSellerEvents(): void {
    if (!this.webSocketClient) return;

    // Subscribe to seller-specific updates
    const sellerSubscriptionId = this.webSocketClient.subscribe(
      'user',
      this.config.walletAddress,
      {
        eventTypes: [
          'profile_updated',
          'new_order',
          'order_status_changed',
          'tier_upgraded',
          'listing_updated',
          'payment_received',
          'review_received',
          'analytics_updated',
          'seller_notification',
          'cache_invalidation'
        ],
        priority: ['urgent', 'high', 'medium', 'low']
      }
    );

    this.subscriptions.add(sellerSubscriptionId);

    // Subscribe to global seller events if enabled
    if (this.config.enableNotifications) {
      const globalSubscriptionId = this.webSocketClient.subscribe(
        'global',
        'seller_updates',
        {
          eventTypes: ['system_maintenance', 'seller_announcement'],
          priority: ['urgent', 'high']
        }
      );
      this.subscriptions.add(globalSubscriptionId);
    }
  }

  private unsubscribeFromSellerEvents(): void {
    if (!this.webSocketClient) return;

    this.subscriptions.forEach(subscriptionId => {
      this.webSocketClient!.unsubscribe(subscriptionId);
    });
    this.subscriptions.clear();
  }

  // Event Handlers
  private handleNewOrder(data: any): void {
    const order = data.order as SellerOrder;
    
    // Show browser notification if enabled
    if (this.config.enableNotifications && 'Notification' in window) {
      this.showBrowserNotification(
        'New Order Received',
        `You have a new order for ${order.amount} ${order.currency}`,
        'urgent'
      );
    }

    // Play notification sound
    this.playNotificationSound('new-order');

    // Store in notification queue for offline scenarios
    this.queueNotification({
      id: `order_${order.id}`,
      type: 'order',
      title: 'New Order Received',
      message: `You have a new order for ${order.amount} ${order.currency}`,
      data: { orderId: order.id, amount: order.amount, currency: order.currency },
      priority: 'urgent',
      read: false,
      createdAt: new Date()
    });
  }

  private handleOrderStatusChange(data: any): void {
    const { orderId, status, previousStatus } = data;
    
    // Show notification for important status changes
    if (['shipped', 'delivered', 'completed', 'disputed'].includes(status)) {
      if (this.config.enableNotifications && 'Notification' in window) {
        this.showBrowserNotification(
          'Order Status Updated',
          `Order ${orderId} status changed to ${status}`,
          status === 'disputed' ? 'urgent' : 'medium'
        );
      }

      this.queueNotification({
        id: `order_status_${orderId}`,
        type: 'order',
        title: 'Order Status Updated',
        message: `Order ${orderId} status changed to ${status}`,
        data: { orderId, status, previousStatus },
        priority: status === 'disputed' ? 'urgent' : 'medium',
        read: false,
        createdAt: new Date()
      });
    }
  }

  private handleTierUpgrade(data: any): void {
    const { newTier, previousTier, benefits } = data;
    
    if (this.config.enableNotifications && 'Notification' in window) {
      this.showBrowserNotification(
        'Tier Upgraded!',
        `Congratulations! You've been upgraded to ${newTier} tier`,
        'high'
      );
    }

    this.playNotificationSound('tier-upgrade');

    this.queueNotification({
      id: `tier_upgrade_${Date.now()}`,
      type: 'tier',
      title: 'Tier Upgraded!',
      message: `Congratulations! You've been upgraded to ${newTier} tier`,
      data: { newTier, previousTier, benefits },
      priority: 'high',
      read: false,
      createdAt: new Date()
    });
  }

  private handlePaymentReceived(data: any): void {
    const { amount, currency, orderId } = data;
    
    if (this.config.enableNotifications && 'Notification' in window) {
      this.showBrowserNotification(
        'Payment Received',
        `Payment of ${amount} ${currency} received for order ${orderId}`,
        'high'
      );
    }

    this.playNotificationSound('payment-received');

    this.queueNotification({
      id: `payment_${orderId}`,
      type: 'payment',
      title: 'Payment Received',
      message: `Payment of ${amount} ${currency} received for order ${orderId}`,
      data: { amount, currency, orderId },
      priority: 'high',
      read: false,
      createdAt: new Date()
    });
  }

  private handleReviewReceived(data: any): void {
    const { reviewId, rating, orderId } = data;
    
    if (this.config.enableNotifications && 'Notification' in window) {
      this.showBrowserNotification(
        'New Review Received',
        `You received a ${rating}-star review`,
        'medium'
      );
    }

    this.queueNotification({
      id: `review_${reviewId}`,
      type: 'review',
      title: 'New Review Received',
      message: `You received a ${rating}-star review`,
      data: { reviewId, rating, orderId },
      priority: 'medium',
      read: false,
      createdAt: new Date()
    });
  }

  private handleAnalyticsUpdate(data: any): void {
    const analytics = data.metrics as SellerAnalytics;
    
    // Only show notifications for significant changes
    if (this.shouldNotifyAnalyticsUpdate(analytics)) {
      this.queueNotification({
        id: `analytics_${Date.now()}`,
        type: 'system',
        title: 'Analytics Updated',
        message: `Your ${analytics.period} analytics have been updated`,
        data: analytics,
        priority: 'low',
        read: false,
        createdAt: new Date()
      });
    }
  }

  private handleNotification(notification: SellerNotification): void {
    this.queueNotification(notification);
    
    // Show browser notification for high priority items
    if (notification.priority === 'urgent' || notification.priority === 'high') {
      if (this.config.enableNotifications && 'Notification' in window) {
        this.showBrowserNotification(
          notification.title,
          notification.message,
          notification.priority
        );
      }
    }
  }

  private handleSystemMaintenance(data: any): void {
    const { message, scheduledTime } = data;
    
    if (this.config.enableNotifications && 'Notification' in window) {
      this.showBrowserNotification(
        'System Maintenance',
        message,
        'high'
      );
    }

    this.queueNotification({
      id: `maintenance_${Date.now()}`,
      type: 'system',
      title: 'System Maintenance',
      message,
      data: { scheduledTime },
      priority: 'high',
      read: false,
      createdAt: new Date()
    });
  }

  // Cache Invalidation
  private handleCacheInvalidation(keys: string[]): void {
    keys.forEach(key => {
      const callbacks = this.cacheInvalidationCallbacks.get(key) || [];
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error(`Error in cache invalidation callback for ${key}:`, error);
        }
      });
    });
  }

  registerCacheInvalidationCallback(key: string, callback: Function): void {
    if (!this.cacheInvalidationCallbacks.has(key)) {
      this.cacheInvalidationCallbacks.set(key, []);
    }
    this.cacheInvalidationCallbacks.get(key)!.push(callback);
  }

  unregisterCacheInvalidationCallback(key: string, callback: Function): void {
    const callbacks = this.cacheInvalidationCallbacks.get(key);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notification Management
  private queueNotification(notification: SellerNotification): void {
    this.notificationQueue.push(notification);
    
    // Limit queue size
    if (this.notificationQueue.length > 50) {
      this.notificationQueue.shift();
    }

    this.emit('notification_queued', notification);
  }

  private processNotificationQueue(): void {
    if (this.notificationQueue.length === 0) return;

    const notifications = [...this.notificationQueue];
    this.notificationQueue = [];

    notifications.forEach(notification => {
      this.emit('notification_processed', notification);
    });

    console.log(`Processed ${notifications.length} queued notifications`);
  }

  getQueuedNotifications(): SellerNotification[] {
    return [...this.notificationQueue];
  }

  clearNotificationQueue(): void {
    this.notificationQueue = [];
  }

  // Browser Notifications
  private async showBrowserNotification(title: string, message: string, priority: string): Promise<void> {
    if (!('Notification' in window)) return;

    // Request permission if not granted
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: '/icons/seller-notification.png',
        badge: '/icons/seller-badge.png',
        tag: `seller-${priority}`,
        requireInteraction: priority === 'urgent',
        silent: priority === 'low'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after delay based on priority
      const delay = priority === 'urgent' ? 10000 : priority === 'high' ? 7000 : 5000;
      setTimeout(() => notification.close(), delay);
    }
  }

  // Sound Notifications
  private playNotificationSound(type: string): void {
    if (!this.config.enableNotifications) return;

    try {
      const audio = new Audio(`/sounds/seller-${type}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.warn('Could not play notification sound:', error);
      });
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  }

  // Utility Methods
  private shouldNotifyAnalyticsUpdate(analytics: SellerAnalytics): boolean {
    // Only notify for significant changes or milestones
    return analytics.sales > 0 || analytics.revenue > 100 || analytics.rating >= 4.5;
  }

  // Event System
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in seller WebSocket event callback for ${event}:`, error);
        }
      });
    }
  }

  // Public API
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  isConnected(): boolean {
    return this.connectionStatus.connected;
  }

  getConfig(): SellerWebSocketConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<SellerWebSocketConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Send custom seller events
  sendSellerEvent(event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): void {
    if (this.webSocketClient) {
      this.webSocketClient.send(event, data, priority);
    }
  }

  // Request seller data refresh
  requestDataRefresh(dataTypes: string[]): void {
    this.sendSellerEvent('request_data_refresh', {
      walletAddress: this.config.walletAddress,
      dataTypes,
      timestamp: new Date()
    }, 'medium');
  }

  // Cleanup
  private cleanup(): void {
    this.unsubscribeFromSellerEvents();
    this.eventListeners.clear();
    this.notificationQueue = [];
    this.cacheInvalidationCallbacks.clear();
    this.connectionStatus = {
      connected: false,
      reconnectAttempts: 0
    };
  }
}

// Factory function
export const createSellerWebSocketService = (config: SellerWebSocketConfig): SellerWebSocketService => {
  return new SellerWebSocketService(config);
};

export default SellerWebSocketService;
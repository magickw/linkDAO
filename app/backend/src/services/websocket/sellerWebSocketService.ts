import { getWebSocketService } from './webSocketService';
import { safeLogger } from '../../utils/safeLogger';

interface SellerUpdateEvent {
  type: 'profile_updated' | 'new_order' | 'order_status_changed' | 'tier_upgraded' | 'listing_updated' | 'payment_received' | 'review_received' | 'analytics_updated';
  walletAddress: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
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

interface ConnectionMetrics {
  connectedSellers: number;
  activeConnections: number;
  reconnectionAttempts: number;
  messagesSent: number;
  messagesQueued: number;
}

export class SellerWebSocketService {
  private webSocketService = getWebSocketService();
  private connectedSellers: Set<string> = new Set();
  private sellerSubscriptions: Map<string, Set<string>> = new Map();
  private connectionMetrics: ConnectionMetrics = {
    connectedSellers: 0,
    activeConnections: 0,
    reconnectionAttempts: 0,
    messagesSent: 0,
    messagesQueued: 0
  };
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    if (!this.webSocketService) {
      throw new Error('WebSocket service not initialized. Call initializeWebSocket first.');
    }
    this.setupSellerEventHandlers();
  }

  private setupSellerEventHandlers(): void {
    // Monitor seller connections through the main WebSocket service
    // This would be integrated with the main service's connection events
    safeLogger.info('Seller WebSocket service initialized');
  }

  // Connection Management
  connect(walletAddress: string): void {
    if (!this.webSocketService) {
      safeLogger.error('WebSocket service not available');
      return;
    }

    this.connectedSellers.add(walletAddress);
    this.connectionMetrics.connectedSellers = this.connectedSellers.size;
    this.connectionMetrics.activeConnections++;

    // Reset reconnection attempts on successful connection
    this.reconnectAttempts.delete(walletAddress);
    
    // Clear any existing reconnection timeout
    if (this.reconnectTimeouts.has(walletAddress)) {
      clearTimeout(this.reconnectTimeouts.get(walletAddress)!);
      this.reconnectTimeouts.delete(walletAddress);
    }

    // Subscribe to seller-specific events
    this.subscribeToSellerEvents(walletAddress);

    safeLogger.info(`Seller connected: ${walletAddress}`);
    
    // Send connection confirmation
    this.sendToSeller(walletAddress, 'seller_connected', {
      message: 'Successfully connected to seller updates',
      timestamp: new Date(),
      features: ['real-time-orders', 'live-analytics', 'instant-notifications']
    }, 'medium');
  }

  disconnect(walletAddress: string): void {
    this.connectedSellers.delete(walletAddress);
    this.connectionMetrics.connectedSellers = this.connectedSellers.size;
    
    // Clean up subscriptions
    this.unsubscribeFromSellerEvents(walletAddress);
    
    // Clear reconnection data
    this.reconnectAttempts.delete(walletAddress);
    if (this.reconnectTimeouts.has(walletAddress)) {
      clearTimeout(this.reconnectTimeouts.get(walletAddress)!);
      this.reconnectTimeouts.delete(walletAddress);
    }

    safeLogger.info(`Seller disconnected: ${walletAddress}`);
  }

  private attemptReconnect(walletAddress: string): void {
    const attempts = this.reconnectAttempts.get(walletAddress) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      safeLogger.info(`Max reconnection attempts reached for seller: ${walletAddress}`);
      this.reconnectAttempts.delete(walletAddress);
      return;
    }

    this.reconnectAttempts.set(walletAddress, attempts + 1);
    this.connectionMetrics.reconnectionAttempts++;

    const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
    
    const timeout = setTimeout(() => {
      if (!this.isSellerConnected(walletAddress)) {
        safeLogger.info(`Attempting to reconnect seller: ${walletAddress} (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
        this.connect(walletAddress);
      }
      this.reconnectTimeouts.delete(walletAddress);
    }, delay);

    this.reconnectTimeouts.set(walletAddress, timeout);
  }

  // Subscription Management
  private subscribeToSellerEvents(walletAddress: string): void {
    if (!this.sellerSubscriptions.has(walletAddress)) {
      this.sellerSubscriptions.set(walletAddress, new Set());
    }

    const subscriptions = this.sellerSubscriptions.get(walletAddress)!;
    
    // Subscribe to seller-specific events
    const sellerEvents = [
      `seller:${walletAddress}:orders`,
      `seller:${walletAddress}:payments`,
      `seller:${walletAddress}:reviews`,
      `seller:${walletAddress}:analytics`,
      `seller:${walletAddress}:tier`,
      `seller:${walletAddress}:listings`
    ];

    sellerEvents.forEach(event => {
      subscriptions.add(event);
    });
  }

  private unsubscribeFromSellerEvents(walletAddress: string): void {
    this.sellerSubscriptions.delete(walletAddress);
  }

  // Event Handlers
  handleSellerUpdate(event: SellerUpdateEvent): void {
    switch (event.type) {
      case 'profile_updated':
        this.handleProfileUpdate(event);
        break;
      case 'new_order':
        this.handleNewOrder(event);
        break;
      case 'order_status_changed':
        this.handleOrderStatusChange(event);
        break;
      case 'tier_upgraded':
        this.handleTierUpgrade(event);
        break;
      case 'listing_updated':
        this.handleListingUpdate(event);
        break;
      case 'payment_received':
        this.handlePaymentReceived(event);
        break;
      case 'review_received':
        this.handleReviewReceived(event);
        break;
      case 'analytics_updated':
        this.handleAnalyticsUpdate(event);
        break;
      default:
        safeLogger.warn(`Unknown seller event type: ${event.type}`);
    }
  }

  private handleProfileUpdate(event: SellerUpdateEvent): void {
    this.sendToSeller(event.walletAddress, 'profile_updated', {
      type: 'profile_update',
      data: event.data,
      timestamp: event.timestamp
    }, 'medium');

    // Invalidate cache
    this.invalidateSellerCache(event.walletAddress, ['profile', 'dashboard']);
  }

  private handleNewOrder(event: SellerUpdateEvent): void {
    const order = event.data as SellerOrder;
    
    this.sendToSeller(event.walletAddress, 'new_order', {
      type: 'new_order',
      order,
      timestamp: event.timestamp,
      message: `New order received: ${order.id}`
    }, 'urgent');

    // Send notification
    this.sendSellerNotification(event.walletAddress, {
      id: `order_${order.id}`,
      type: 'order',
      title: 'New Order Received',
      message: `You have a new order for ${order.amount} ${order.currency}`,
      data: { orderId: order.id, amount: order.amount, currency: order.currency },
      priority: 'urgent',
      read: false,
      createdAt: new Date()
    });

    // Invalidate cache
    this.invalidateSellerCache(event.walletAddress, ['orders', 'dashboard', 'analytics']);
  }

  private handleOrderStatusChange(event: SellerUpdateEvent): void {
    const { orderId, status, previousStatus } = event.data;
    
    this.sendToSeller(event.walletAddress, 'order_status_changed', {
      type: 'order_status_change',
      orderId,
      status,
      previousStatus,
      timestamp: event.timestamp
    }, 'high');

    // Send notification for important status changes
    if (['shipped', 'delivered', 'completed', 'disputed'].includes(status)) {
      this.sendSellerNotification(event.walletAddress, {
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

    // Invalidate cache
    this.invalidateSellerCache(event.walletAddress, ['orders', 'dashboard']);
  }

  private handleTierUpgrade(event: SellerUpdateEvent): void {
    const { newTier, previousTier, benefits } = event.data;
    
    this.sendToSeller(event.walletAddress, 'tier_upgraded', {
      type: 'tier_upgrade',
      newTier,
      previousTier,
      benefits,
      timestamp: event.timestamp
    }, 'high');

    // Send congratulatory notification
    this.sendSellerNotification(event.walletAddress, {
      id: `tier_upgrade_${Date.now()}`,
      type: 'tier',
      title: 'Tier Upgraded!',
      message: `Congratulations! You've been upgraded to ${newTier} tier`,
      data: { newTier, previousTier, benefits },
      priority: 'high',
      read: false,
      createdAt: new Date()
    });

    // Invalidate cache
    this.invalidateSellerCache(event.walletAddress, ['profile', 'tier', 'dashboard']);
  }

  private handleListingUpdate(event: SellerUpdateEvent): void {
    const { listingId, action, data } = event.data;
    
    this.sendToSeller(event.walletAddress, 'listing_updated', {
      type: 'listing_update',
      listingId,
      action, // 'created', 'updated', 'deleted', 'sold'
      data,
      timestamp: event.timestamp
    }, 'medium');

    // Invalidate cache
    this.invalidateSellerCache(event.walletAddress, ['listings', 'dashboard']);
  }

  private handlePaymentReceived(event: SellerUpdateEvent): void {
    const { amount, currency, orderId, transactionHash } = event.data;
    
    this.sendToSeller(event.walletAddress, 'payment_received', {
      type: 'payment_received',
      amount,
      currency,
      orderId,
      transactionHash,
      timestamp: event.timestamp
    }, 'high');

    // Send notification
    this.sendSellerNotification(event.walletAddress, {
      id: `payment_${orderId}`,
      type: 'payment',
      title: 'Payment Received',
      message: `Payment of ${amount} ${currency} received for order ${orderId}`,
      data: { amount, currency, orderId, transactionHash },
      priority: 'high',
      read: false,
      createdAt: new Date()
    });

    // Invalidate cache
    this.invalidateSellerCache(event.walletAddress, ['payments', 'dashboard', 'analytics']);
  }

  private handleReviewReceived(event: SellerUpdateEvent): void {
    const { reviewId, rating, comment, orderId } = event.data;
    
    this.sendToSeller(event.walletAddress, 'review_received', {
      type: 'review_received',
      reviewId,
      rating,
      comment,
      orderId,
      timestamp: event.timestamp
    }, 'medium');

    // Send notification
    this.sendSellerNotification(event.walletAddress, {
      id: `review_${reviewId}`,
      type: 'review',
      title: 'New Review Received',
      message: `You received a ${rating}-star review`,
      data: { reviewId, rating, comment, orderId },
      priority: 'medium',
      read: false,
      createdAt: new Date()
    });

    // Invalidate cache
    this.invalidateSellerCache(event.walletAddress, ['reviews', 'reputation', 'dashboard']);
  }

  private handleAnalyticsUpdate(event: SellerUpdateEvent): void {
    const { metrics, period } = event.data;
    
    this.sendToSeller(event.walletAddress, 'analytics_updated', {
      type: 'analytics_update',
      metrics,
      period,
      timestamp: event.timestamp
    }, 'low');

    // Invalidate cache
    this.invalidateSellerCache(event.walletAddress, ['analytics', 'dashboard']);
  }

  // Cache Invalidation
  private invalidateSellerCache(walletAddress: string, cacheKeys: string[]): void {
    this.sendToSeller(walletAddress, 'cache_invalidation', {
      type: 'cache_invalidation',
      keys: cacheKeys,
      timestamp: new Date()
    }, 'low');
  }

  // Notification System
  private sendSellerNotification(walletAddress: string, notification: SellerNotification): void {
    this.sendToSeller(walletAddress, 'seller_notification', {
      notification,
      timestamp: new Date()
    }, notification.priority);
  }

  // Real-time Updates
  sendOrderUpdate(walletAddress: string, orderId: string, update: any): void {
    this.handleSellerUpdate({
      type: 'order_status_changed',
      walletAddress,
      data: { orderId, ...update },
      timestamp: new Date(),
      priority: 'high'
    });
  }

  sendPaymentUpdate(walletAddress: string, paymentData: any): void {
    this.handleSellerUpdate({
      type: 'payment_received',
      walletAddress,
      data: paymentData,
      timestamp: new Date(),
      priority: 'high'
    });
  }

  sendTierUpdate(walletAddress: string, tierData: any): void {
    this.handleSellerUpdate({
      type: 'tier_upgraded',
      walletAddress,
      data: tierData,
      timestamp: new Date(),
      priority: 'high'
    });
  }

  // Automated tier upgrade notification
  sendTierUpgradeNotification(walletAddress: string, upgradeData: {
    type: 'tier_upgraded' | 'tier_downgraded';
    fromTier: string;
    toTier: string;
    newBenefits: any;
    upgradeDate: Date;
  }): void {
    this.handleSellerUpdate({
      type: 'tier_upgraded',
      walletAddress,
      data: {
        ...upgradeData,
        automated: true,
        congratulatoryMessage: `🎉 Congratulations! You've been automatically upgraded from ${upgradeData.fromTier} to ${upgradeData.toTier} tier!`,
      },
      timestamp: new Date(),
      priority: 'high'
    });

    // Also send a persistent notification
    this.sendSellerNotification(walletAddress, {
      id: `auto_tier_upgrade_${Date.now()}`,
      type: 'tier',
      title: `Tier Upgraded to ${upgradeData.toTier}!`,
      message: `Your outstanding performance has earned you an automatic upgrade to ${upgradeData.toTier} tier. Your new benefits are now active!`,
      data: upgradeData,
      priority: 'high',
      read: false,
      createdAt: new Date(),
    });
  }

  sendAnalyticsUpdate(walletAddress: string, analyticsData: any): void {
    this.handleSellerUpdate({
      type: 'analytics_updated',
      walletAddress,
      data: analyticsData,
      timestamp: new Date(),
      priority: 'low'
    });
  }

  // Offline/Online Status Handling
  handleSellerOnline(walletAddress: string): void {
    if (!this.connectedSellers.has(walletAddress)) {
      this.connect(walletAddress);
    }

    // Send any queued messages
    this.sendToSeller(walletAddress, 'seller_online', {
      message: 'You are now online and receiving real-time updates',
      timestamp: new Date()
    }, 'low');
  }

  handleSellerOffline(walletAddress: string): void {
    if (this.connectedSellers.has(walletAddress)) {
      // Set up reconnection attempt
      this.attemptReconnect(walletAddress);
    }
  }

  // Utility Methods
  private sendToSeller(walletAddress: string, event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): void {
    if (!this.webSocketService) {
      safeLogger.error('WebSocket service not available');
      return;
    }

    try {
      this.webSocketService.sendToUser(walletAddress, event, data, priority);
      this.connectionMetrics.messagesSent++;
    } catch (error) {
      safeLogger.error(`Failed to send message to seller ${walletAddress}:`, error);
      this.connectionMetrics.messagesQueued++;
    }
  }

  isSellerConnected(walletAddress: string): boolean {
    return this.connectedSellers.has(walletAddress) && 
           this.webSocketService?.isUserOnline(walletAddress) || false;
  }

  getConnectedSellers(): string[] {
    return Array.from(this.connectedSellers);
  }

  getConnectionMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  // Broadcast to all sellers
  broadcastToAllSellers(event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): void {
    this.connectedSellers.forEach(walletAddress => {
      this.sendToSeller(walletAddress, event, data, priority);
    });
  }

  // Send system maintenance notifications
  sendMaintenanceNotification(message: string, scheduledTime?: Date): void {
    this.broadcastToAllSellers('system_maintenance', {
      message,
      scheduledTime,
      timestamp: new Date()
    }, 'high');
  }

  // Health check
  performHealthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!this.webSocketService) {
      issues.push('WebSocket service not available');
    }

    if (this.connectionMetrics.reconnectionAttempts > 10) {
      issues.push('High number of reconnection attempts');
    }

    if (this.connectionMetrics.messagesQueued > 100) {
      issues.push('High number of queued messages');
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  // Cleanup
  cleanup(): void {
    // Clear all reconnection timeouts
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();
    
    // Clear data structures
    this.connectedSellers.clear();
    this.sellerSubscriptions.clear();
    this.reconnectAttempts.clear();
    
    // Reset metrics
    this.connectionMetrics = {
      connectedSellers: 0,
      activeConnections: 0,
      reconnectionAttempts: 0,
      messagesSent: 0,
      messagesQueued: 0
    };
  }
}

// Singleton instance
let sellerWebSocketService: SellerWebSocketService | null = null;

export const initializeSellerWebSocket = (): SellerWebSocketService => {
  if (!sellerWebSocketService) {
    sellerWebSocketService = new SellerWebSocketService();
    safeLogger.info('Seller WebSocket service initialized');
  }
  return sellerWebSocketService;
};

export const getSellerWebSocketService = (): SellerWebSocketService | null => {
  return sellerWebSocketService;
};

export const shutdownSellerWebSocket = (): void => {
  if (sellerWebSocketService) {
    sellerWebSocketService.cleanup();
    sellerWebSocketService = null;
    safeLogger.info('Seller WebSocket service shut down');
  }
};

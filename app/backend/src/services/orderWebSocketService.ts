import { getWebSocketService } from './webSocketService';
import { safeLogger } from '../utils/safeLogger';
import { MarketplaceOrder } from '../models/Order';

interface OrderUpdateEvent {
  type: 'order_status_changed' | 'order_created' | 'order_updated' | 'tracking_info_added' | 'order_delivered' | 'order_completed';
  orderId: string;
  walletAddress: string; // The user to notify (buyer or seller)
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface ConnectionMetrics {
  connectedUsers: number;
  activeConnections: number;
  reconnectionAttempts: number;
  messagesSent: number;
  messagesQueued: number;
}

export class OrderWebSocketService {
  private webSocketService = getWebSocketService();
  private orderSubscriptions: Map<string, Set<string>> = new Map(); // orderId -> Set of walletAddresses
  private userOrderSubscriptions: Map<string, Set<string>> = new Map(); // walletAddress -> Set of orderIds
  private connectionMetrics: ConnectionMetrics = {
    connectedUsers: 0,
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
    this.setupOrderEventHandlers();
  }

  private setupOrderEventHandlers(): void {
    // Monitor order connections through the main WebSocket service
    // This would be integrated with the main service's connection events
    safeLogger.info('Order WebSocket service initialized');
  }

  // Subscribe a user to order updates
  subscribeToOrder(walletAddress: string, orderId: string): void {
    // Add to order's subscribers
    if (!this.orderSubscriptions.has(orderId)) {
      this.orderSubscriptions.set(orderId, new Set());
    }
    this.orderSubscriptions.get(orderId)!.add(walletAddress);

    // Add to user's subscriptions
    if (!this.userOrderSubscriptions.has(walletAddress)) {
      this.userOrderSubscriptions.set(walletAddress, new Set());
    }
    this.userOrderSubscriptions.get(walletAddress)!.add(orderId);

    safeLogger.info(`User ${walletAddress} subscribed to order ${orderId}`);
  }

  // Unsubscribe a user from order updates
  unsubscribeFromOrder(walletAddress: string, orderId: string): void {
    // Remove from order's subscribers
    if (this.orderSubscriptions.has(orderId)) {
      this.orderSubscriptions.get(orderId)!.delete(walletAddress);
      if (this.orderSubscriptions.get(orderId)!.size === 0) {
        this.orderSubscriptions.delete(orderId);
      }
    }

    // Remove from user's subscriptions
    if (this.userOrderSubscriptions.has(walletAddress)) {
      this.userOrderSubscriptions.get(walletAddress)!.delete(orderId);
    }

    safeLogger.info(`User ${walletAddress} unsubscribed from order ${orderId}`);
  }

  // Handle order update event
  handleOrderUpdate(event: OrderUpdateEvent): void {
    // Send update to all subscribed users
    if (this.orderSubscriptions.has(event.orderId)) {
      const subscribers = this.orderSubscriptions.get(event.orderId)!;
      for (const walletAddress of subscribers) {
        this.sendToUser(walletAddress, event.type, {
          orderId: event.orderId,
          data: event.data,
          timestamp: event.timestamp
        }, event.priority);
      }
    }

    // Also send to the specific user if they're not already a subscriber
    if (event.walletAddress && !this.orderSubscriptions.get(event.orderId)?.has(event.walletAddress)) {
      this.sendToUser(event.walletAddress, event.type, {
        orderId: event.orderId,
        data: event.data,
        timestamp: event.timestamp
      }, event.priority);
    }
  }

  // Send order status update to all relevant parties
  sendOrderStatusUpdate(order: MarketplaceOrder, previousStatus?: string): void {
    const event: OrderUpdateEvent = {
      type: 'order_status_changed',
      orderId: order.id,
      walletAddress: order.buyerWalletAddress, // Primary recipient
      data: {
        orderId: order.id,
        status: order.status,
        previousStatus,
        order,
        timestamp: new Date()
      },
      timestamp: new Date(),
      priority: 'high'
    };

    // Add both buyer and seller as recipients
    this.handleOrderUpdate(event);

    // Also send to seller
    const sellerEvent: OrderUpdateEvent = {
      ...event,
      walletAddress: order.sellerWalletAddress
    };
    this.handleOrderUpdate(sellerEvent);

    // Send notification about status change
    this.sendOrderNotification(order, order.status, previousStatus);
  }

  // Send order created notification
  sendOrderCreated(order: MarketplaceOrder): void {
    const event: OrderUpdateEvent = {
      type: 'order_created',
      orderId: order.id,
      walletAddress: order.buyerWalletAddress,
      data: {
        order,
        timestamp: new Date()
      },
      timestamp: new Date(),
      priority: 'high'
    };

    // Send to both buyer and seller
    this.handleOrderUpdate(event);

    const sellerEvent: OrderUpdateEvent = {
      ...event,
      walletAddress: order.sellerWalletAddress
    };
    this.handleOrderUpdate(sellerEvent);

    // Send notification
    this.sendOrderNotification(order, 'ORDER_CREATED');
  }

  // Send tracking information update
  sendTrackingUpdate(orderId: string, walletAddress: string, trackingInfo: any): void {
    const event: OrderUpdateEvent = {
      type: 'tracking_info_added',
      orderId,
      walletAddress,
      data: {
        orderId,
        trackingInfo,
        timestamp: new Date()
      },
      timestamp: new Date(),
      priority: 'high'
    };

    this.handleOrderUpdate(event);
  }

  // Send delivery confirmation
  sendDeliveryConfirmation(orderId: string, walletAddress: string, deliveryInfo: any): void {
    const event: OrderUpdateEvent = {
      type: 'order_delivered',
      orderId,
      walletAddress,
      data: {
        orderId,
        deliveryInfo,
        timestamp: new Date()
      },
      timestamp: new Date(),
      priority: 'high'
    };

    this.handleOrderUpdate(event);
  }

  // Send order completion
  sendOrderCompletion(orderId: string, walletAddress: string): void {
    const event: OrderUpdateEvent = {
      type: 'order_completed',
      orderId,
      walletAddress,
      data: {
        orderId,
        timestamp: new Date()
      },
      timestamp: new Date(),
      priority: 'high'
    };

    this.handleOrderUpdate(event);
  }

  // Send order notification
  private sendOrderNotification(order: MarketplaceOrder, eventType: string, previousStatus?: string): void {
    // Send to buyer
    this.sendToUser(order.buyerWalletAddress, 'order_notification', {
      orderId: order.id,
      type: eventType,
      message: this.getNotificationMessage(eventType, order, previousStatus),
      order,
      timestamp: new Date()
    }, 'medium');

    // Send to seller
    this.sendToUser(order.sellerWalletAddress, 'order_notification', {
      orderId: order.id,
      type: eventType,
      message: this.getNotificationMessage(eventType, order, previousStatus),
      order,
      timestamp: new Date()
    }, 'medium');
  }

  private getNotificationMessage(eventType: string, order: MarketplaceOrder, previousStatus?: string): string {
    switch (eventType) {
      case 'ORDER_CREATED':
        return 'New order created';
      case 'order_status_changed':
        return `Order status changed from ${previousStatus || 'unknown'} to ${order.status}`;
      case 'order_delivered':
        return 'Order delivered';
      case 'order_completed':
        return 'Order completed';
      default:
        return 'Order updated';
    }
  }

  // Utility Methods
  private sendToUser(walletAddress: string, event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): void {
    if (!this.webSocketService) {
      safeLogger.error('WebSocket service not available');
      return;
    }

    try {
      this.webSocketService.sendToUser(walletAddress, event, data, priority);
      this.connectionMetrics.messagesSent++;
    } catch (error) {
      safeLogger.error(`Failed to send message to user ${walletAddress}:`, error);
      this.connectionMetrics.messagesQueued++;
    }
  }

  // Get all subscribed users for an order
  getSubscribedUsersForOrder(orderId: string): string[] {
    if (!this.orderSubscriptions.has(orderId)) {
      return [];
    }
    return Array.from(this.orderSubscriptions.get(orderId)!);
  }

  // Get all subscribed orders for a user
  getSubscribedOrdersForUser(walletAddress: string): string[] {
    if (!this.userOrderSubscriptions.has(walletAddress)) {
      return [];
    }
    return Array.from(this.userOrderSubscriptions.get(walletAddress)!);
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
    this.orderSubscriptions.clear();
    this.userOrderSubscriptions.clear();
    this.reconnectAttempts.clear();
    
    // Reset metrics
    this.connectionMetrics = {
      connectedUsers: 0,
      activeConnections: 0,
      reconnectionAttempts: 0,
      messagesSent: 0,
      messagesQueued: 0
    };
  }
}

// Singleton instance
let orderWebSocketService: OrderWebSocketService | null = null;

export const initializeOrderWebSocket = (): OrderWebSocketService => {
  if (!orderWebSocketService) {
    orderWebSocketService = new OrderWebSocketService();
    safeLogger.info('Order WebSocket service initialized');
  }
  return orderWebSocketService;
};

export const getOrderWebSocketService = (): OrderWebSocketService | null => {
  return orderWebSocketService;
};

export const shutdownOrderWebSocket = (): void => {
  if (orderWebSocketService) {
    orderWebSocketService.cleanup();
    orderWebSocketService = null;
    safeLogger.info('Order WebSocket service shut down');
  }
};
/**
 * Order Notification Service
 * Handles notifications for order events (created, shipped, cancelled, delivered)
 * Notifies both buyers and sellers of order status changes
 */

import { notificationService } from './notificationService';
import type { AppNotification } from '../types/notifications';

// Order notification event types
export type OrderNotificationEvent =
  | 'order_created'
  | 'order_confirmed'
  | 'order_processing'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'order_refunded'
  | 'order_disputed'
  | 'delivery_confirmed'
  | 'payment_received';

// Order notification data structure
export interface OrderNotificationData {
  orderId: string;
  orderNumber: string;
  buyerAddress: string;
  sellerAddress: string;
  productTitle: string;
  productImage?: string;
  amount: number;
  currency: string;
  trackingNumber?: string;
  trackingUrl?: string;
  cancellationReason?: string;
  refundAmount?: number;
  estimatedDelivery?: string;
}

// Notification recipient type
export type NotificationRecipient = 'buyer' | 'seller' | 'both';

// Order notification config
interface OrderNotificationConfig {
  event: OrderNotificationEvent;
  title: string;
  messageTemplate: (data: OrderNotificationData, isBuyer: boolean) => string;
  recipient: NotificationRecipient;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  showDesktopNotification: boolean;
  playSound: boolean;
}

// Notification configurations for each event type
const ORDER_NOTIFICATION_CONFIGS: Record<OrderNotificationEvent, OrderNotificationConfig> = {
  order_created: {
    event: 'order_created',
    title: 'New Order',
    messageTemplate: (data, isBuyer) =>
      isBuyer
        ? `Your order #${data.orderNumber} for "${data.productTitle}" has been placed successfully.`
        : `You have a new order #${data.orderNumber} for "${data.productTitle}".`,
    recipient: 'both',
    priority: 'high',
    showDesktopNotification: true,
    playSound: true,
  },
  order_confirmed: {
    event: 'order_confirmed',
    title: 'Order Confirmed',
    messageTemplate: (data, isBuyer) =>
      isBuyer
        ? `Your order #${data.orderNumber} has been confirmed by the seller.`
        : `You confirmed order #${data.orderNumber}.`,
    recipient: 'buyer',
    priority: 'medium',
    showDesktopNotification: true,
    playSound: false,
  },
  order_processing: {
    event: 'order_processing',
    title: 'Order Processing',
    messageTemplate: (data, isBuyer) =>
      isBuyer
        ? `Your order #${data.orderNumber} is now being processed.`
        : `Order #${data.orderNumber} is being processed.`,
    recipient: 'buyer',
    priority: 'medium',
    showDesktopNotification: false,
    playSound: false,
  },
  order_shipped: {
    event: 'order_shipped',
    title: 'Order Shipped',
    messageTemplate: (data, isBuyer) =>
      isBuyer
        ? `Great news! Your order #${data.orderNumber} has been shipped.${data.trackingNumber ? ` Tracking: ${data.trackingNumber}` : ''}`
        : `Order #${data.orderNumber} has been marked as shipped.`,
    recipient: 'both',
    priority: 'high',
    showDesktopNotification: true,
    playSound: true,
  },
  order_delivered: {
    event: 'order_delivered',
    title: 'Order Delivered',
    messageTemplate: (data, isBuyer) =>
      isBuyer
        ? `Your order #${data.orderNumber} has been delivered! Please confirm receipt.`
        : `Order #${data.orderNumber} has been delivered to the buyer.`,
    recipient: 'both',
    priority: 'high',
    showDesktopNotification: true,
    playSound: true,
  },
  order_cancelled: {
    event: 'order_cancelled',
    title: 'Order Cancelled',
    messageTemplate: (data, isBuyer) =>
      isBuyer
        ? `Your order #${data.orderNumber} has been cancelled.${data.cancellationReason ? ` Reason: ${data.cancellationReason}` : ''}`
        : `Order #${data.orderNumber} has been cancelled.${data.cancellationReason ? ` Reason: ${data.cancellationReason}` : ''}`,
    recipient: 'both',
    priority: 'high',
    showDesktopNotification: true,
    playSound: true,
  },
  order_refunded: {
    event: 'order_refunded',
    title: 'Order Refunded',
    messageTemplate: (data, isBuyer) =>
      isBuyer
        ? `Your refund of ${data.currency} ${data.refundAmount || data.amount} for order #${data.orderNumber} has been processed.`
        : `Refund of ${data.currency} ${data.refundAmount || data.amount} has been issued for order #${data.orderNumber}.`,
    recipient: 'both',
    priority: 'high',
    showDesktopNotification: true,
    playSound: false,
  },
  order_disputed: {
    event: 'order_disputed',
    title: 'Order Disputed',
    messageTemplate: (data, isBuyer) =>
      isBuyer
        ? `Your dispute for order #${data.orderNumber} has been opened.`
        : `A dispute has been opened for order #${data.orderNumber}. Please respond promptly.`,
    recipient: 'both',
    priority: 'urgent',
    showDesktopNotification: true,
    playSound: true,
  },
  delivery_confirmed: {
    event: 'delivery_confirmed',
    title: 'Delivery Confirmed',
    messageTemplate: (data, isBuyer) =>
      isBuyer
        ? `You confirmed delivery for order #${data.orderNumber}. Thank you for your purchase!`
        : `The buyer has confirmed delivery for order #${data.orderNumber}. Payment will be released.`,
    recipient: 'both',
    priority: 'high',
    showDesktopNotification: true,
    playSound: true,
  },
  payment_received: {
    event: 'payment_received',
    title: 'Payment Received',
    messageTemplate: (data, isBuyer) =>
      isBuyer
        ? `Payment of ${data.currency} ${data.amount} for order #${data.orderNumber} has been confirmed.`
        : `Payment of ${data.currency} ${data.amount} received for order #${data.orderNumber}.`,
    recipient: 'both',
    priority: 'high',
    showDesktopNotification: true,
    playSound: true,
  },
};

class OrderNotificationService {
  private static instance: OrderNotificationService;
  private baseUrl: string;
  private listeners: Map<string, Set<(notification: OrderNotification) => void>> = new Map();

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  static getInstance(): OrderNotificationService {
    if (!OrderNotificationService.instance) {
      OrderNotificationService.instance = new OrderNotificationService();
    }
    return OrderNotificationService.instance;
  }

  /**
   * Send order notification to appropriate parties
   */
  async sendOrderNotification(
    event: OrderNotificationEvent,
    data: OrderNotificationData
  ): Promise<{ buyerNotification?: AppNotification; sellerNotification?: AppNotification }> {
    const config = ORDER_NOTIFICATION_CONFIGS[event];
    if (!config) {
      console.error(`Unknown order notification event: ${event}`);
      throw new Error(`Unknown order notification event: ${event}`);
    }

    const result: { buyerNotification?: AppNotification; sellerNotification?: AppNotification } = {};

    try {
      // Send to buyer if applicable
      if (config.recipient === 'buyer' || config.recipient === 'both') {
        const buyerNotification = await this.createNotification(config, data, true);
        result.buyerNotification = buyerNotification;

        // Show desktop notification for buyer
        if (config.showDesktopNotification) {
          this.showDesktopNotification(config.title, config.messageTemplate(data, true), data);
        }
      }

      // Send to seller if applicable
      if (config.recipient === 'seller' || config.recipient === 'both') {
        const sellerNotification = await this.createNotification(config, data, false);
        result.sellerNotification = sellerNotification;
      }

      // Emit to local listeners
      this.emitNotification(event, data);

      return result;
    } catch (error) {
      console.error(`Failed to send order notification for event ${event}:`, error);
      throw error;
    }
  }

  /**
   * Create a notification via the notification service
   */
  private async createNotification(
    config: OrderNotificationConfig,
    data: OrderNotificationData,
    isBuyer: boolean
  ): Promise<AppNotification> {
    const recipientAddress = isBuyer ? data.buyerAddress : data.sellerAddress;
    const otherPartyAddress = isBuyer ? data.sellerAddress : data.buyerAddress;

    const notification = await notificationService.createNotification({
      type: 'system',
      category: 'system_alert',
      title: config.title,
      message: config.messageTemplate(data, isBuyer),
      priority: config.priority,
      fromAddress: otherPartyAddress,
      actionUrl: `/marketplace/orders/${data.orderId}`,
      data: {
        event: config.event,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        productTitle: data.productTitle,
        productImage: data.productImage,
        amount: data.amount,
        currency: data.currency,
        trackingNumber: data.trackingNumber,
        trackingUrl: data.trackingUrl,
        recipientType: isBuyer ? 'buyer' : 'seller',
        recipientAddress,
      },
    });

    return notification;
  }

  /**
   * Show desktop notification
   */
  private showDesktopNotification(title: string, message: string, data: OrderNotificationData): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: data.productImage || '/icons/order-icon.png',
        tag: `order-${data.orderId}`,
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = `/marketplace/orders/${data.orderId}`;
        notification.close();
      };

      // Auto-close after 8 seconds
      setTimeout(() => notification.close(), 8000);
    }
  }

  /**
   * Subscribe to order notifications
   */
  subscribe(event: OrderNotificationEvent | 'all', callback: (notification: OrderNotification) => void): () => void {
    const key = event;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  /**
   * Emit notification to local listeners
   */
  private emitNotification(event: OrderNotificationEvent, data: OrderNotificationData): void {
    const notification: OrderNotification = { event, data, timestamp: new Date() };

    // Emit to specific event listeners
    this.listeners.get(event)?.forEach(callback => callback(notification));

    // Emit to 'all' listeners
    this.listeners.get('all')?.forEach(callback => callback(notification));
  }

  /**
   * Send notification via backend API
   */
  async sendNotificationViaBackend(
    event: OrderNotificationEvent,
    data: OrderNotificationData
  ): Promise<void> {
    try {
      const token = this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/api/orders/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          event,
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          buyerAddress: data.buyerAddress,
          sellerAddress: data.sellerAddress,
          productTitle: data.productTitle,
          productImage: data.productImage,
          amount: data.amount,
          currency: data.currency,
          trackingNumber: data.trackingNumber,
          trackingUrl: data.trackingUrl,
          cancellationReason: data.cancellationReason,
          refundAmount: data.refundAmount,
          estimatedDelivery: data.estimatedDelivery,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send notification: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send notification via backend:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Get notification history for an order
   */
  async getOrderNotifications(orderId: string): Promise<AppNotification[]> {
    try {
      const token = this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/api/orders/${orderId}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order notifications');
      }

      const data = await response.json();
      return data.notifications || [];
    } catch (error) {
      console.error('Failed to get order notifications:', error);
      return [];
    }
  }

  /**
   * Get auth token
   */
  private getAuthToken(): string {
    if (typeof window === 'undefined') return '';

    let token = localStorage.getItem('token') ||
                localStorage.getItem('authToken') ||
                localStorage.getItem('auth_token');

    if (!token) {
      try {
        const sessionDataStr = localStorage.getItem('linkdao_session_data');
        if (sessionDataStr) {
          const sessionData = JSON.parse(sessionDataStr);
          token = sessionData.token || sessionData.accessToken;
        }
      } catch (error) {
        // Don't clear session data - let auth service handle session management
        console.warn('Failed to parse session data for order notifications');
      }
    }

    return token || '';
  }

  /**
   * Get notification config for an event
   */
  getNotificationConfig(event: OrderNotificationEvent): OrderNotificationConfig | undefined {
    return ORDER_NOTIFICATION_CONFIGS[event];
  }

  /**
   * Get all notification configs
   */
  getAllNotificationConfigs(): Record<OrderNotificationEvent, OrderNotificationConfig> {
    return { ...ORDER_NOTIFICATION_CONFIGS };
  }
}

// Order notification interface
export interface OrderNotification {
  event: OrderNotificationEvent;
  data: OrderNotificationData;
  timestamp: Date;
}

// Export singleton instance
export const orderNotificationService = OrderNotificationService.getInstance();
export default orderNotificationService;

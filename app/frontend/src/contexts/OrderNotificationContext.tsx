/**
 * Order Notification Context
 * Provides global order/marketplace notification management across the app
 * Handles order creation, shipping, delivery, disputes, refunds, and escrow events
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  RealTimeNotification,
  NotificationCategory,
  OrderCreatedNotification,
  OrderConfirmedNotification,
  OrderProcessingNotification,
  OrderShippedNotification,
  OrderDeliveredNotification,
  OrderCompletedNotification,
  OrderCancelledNotification,
  OrderRefundedNotification,
  OrderDisputedNotification,
  PaymentReceivedNotification,
  DeliveryConfirmedNotification,
  EscrowFundedNotification,
  EscrowReleasedNotification
} from '@/types/realTimeNotifications';
import { realTimeNotificationService } from '@/services/realTimeNotificationService';

// Order notification categories
const ORDER_CATEGORIES = [
  NotificationCategory.ORDER_CREATED,
  NotificationCategory.ORDER_CONFIRMED,
  NotificationCategory.ORDER_PROCESSING,
  NotificationCategory.ORDER_SHIPPED,
  NotificationCategory.ORDER_DELIVERED,
  NotificationCategory.ORDER_COMPLETED,
  NotificationCategory.ORDER_CANCELLED,
  NotificationCategory.ORDER_REFUNDED,
  NotificationCategory.ORDER_DISPUTED,
  NotificationCategory.PAYMENT_RECEIVED,
  NotificationCategory.DELIVERY_CONFIRMED,
  NotificationCategory.ESCROW_FUNDED,
  NotificationCategory.ESCROW_RELEASED
];

export interface OrderNotification {
  id: string;
  type: NotificationCategory;
  title: string;
  message: string;
  orderId: string;
  orderNumber: string;
  productTitle: string;
  productImage?: string;
  amount?: number;
  currency?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  disputeId?: string;
  recipientType: 'buyer' | 'seller';
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface OrderNotificationContextType {
  notifications: OrderNotification[];
  unreadCount: number;
  buyerUnreadCount: number;
  sellerUnreadCount: number;
  isConnected: boolean;
  addNotification: (notification: Omit<OrderNotification, 'id' | 'read' | 'dismissed'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  navigateToOrder: (orderId: string) => void;
  getNotificationsByType: (type: NotificationCategory) => OrderNotification[];
  getBuyerNotifications: () => OrderNotification[];
  getSellerNotifications: () => OrderNotification[];
}

const OrderNotificationContext = createContext<OrderNotificationContextType | undefined>(undefined);

export const OrderNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected: isWalletConnected } = useAccount();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const isConnectingRef = useRef(false);

  // Calculate unread counts
  const unreadCount = notifications.filter(n => !n.read && !n.dismissed).length;
  const buyerUnreadCount = notifications.filter(n => !n.read && !n.dismissed && n.recipientType === 'buyer').length;
  const sellerUnreadCount = notifications.filter(n => !n.read && !n.dismissed && n.recipientType === 'seller').length;

  // Convert RealTimeNotification to OrderNotification
  const convertToOrderNotification = useCallback((notification: RealTimeNotification): OrderNotification | null => {
    if (!ORDER_CATEGORIES.includes(notification.category)) {
      return null;
    }

    const baseNotification: OrderNotification = {
      id: notification.id,
      type: notification.category,
      title: notification.title,
      message: notification.message,
      orderId: '',
      orderNumber: '',
      productTitle: '',
      recipientType: 'buyer',
      timestamp: new Date(notification.timestamp),
      read: notification.read,
      dismissed: notification.dismissed,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata
    };

    // Extract type-specific fields based on notification category
    switch (notification.category) {
      case NotificationCategory.ORDER_CREATED: {
        const meta = (notification as OrderCreatedNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          productImage: meta.productImage,
          amount: meta.amount,
          currency: meta.currency,
          recipientType: meta.recipientType
        };
      }
      case NotificationCategory.ORDER_CONFIRMED: {
        const meta = (notification as OrderConfirmedNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          productImage: meta.productImage,
          recipientType: meta.recipientType
        };
      }
      case NotificationCategory.ORDER_PROCESSING: {
        const meta = (notification as OrderProcessingNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          productImage: meta.productImage,
          recipientType: meta.recipientType
        };
      }
      case NotificationCategory.ORDER_SHIPPED: {
        const meta = (notification as OrderShippedNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          productImage: meta.productImage,
          trackingNumber: meta.trackingNumber,
          trackingCarrier: meta.trackingCarrier,
          trackingUrl: meta.trackingUrl,
          recipientType: meta.recipientType
        };
      }
      case NotificationCategory.ORDER_DELIVERED: {
        const meta = (notification as OrderDeliveredNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          productImage: meta.productImage,
          recipientType: meta.recipientType
        };
      }
      case NotificationCategory.ORDER_COMPLETED: {
        const meta = (notification as OrderCompletedNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          productImage: meta.productImage,
          amount: meta.amount,
          currency: meta.currency,
          recipientType: meta.recipientType
        };
      }
      case NotificationCategory.ORDER_CANCELLED: {
        const meta = (notification as OrderCancelledNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          productImage: meta.productImage,
          recipientType: meta.recipientType
        };
      }
      case NotificationCategory.ORDER_REFUNDED: {
        const meta = (notification as OrderRefundedNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          productImage: meta.productImage,
          amount: meta.refundAmount,
          currency: meta.currency,
          recipientType: meta.recipientType
        };
      }
      case NotificationCategory.ORDER_DISPUTED: {
        const meta = (notification as OrderDisputedNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          productImage: meta.productImage,
          disputeId: meta.disputeId,
          recipientType: meta.recipientType
        };
      }
      case NotificationCategory.PAYMENT_RECEIVED: {
        const meta = (notification as PaymentReceivedNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          productImage: meta.productImage,
          amount: meta.amount,
          currency: meta.currency,
          recipientType: meta.recipientType
        };
      }
      case NotificationCategory.DELIVERY_CONFIRMED: {
        const meta = (notification as DeliveryConfirmedNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          productImage: meta.productImage,
          recipientType: meta.recipientType
        };
      }
      case NotificationCategory.ESCROW_FUNDED: {
        const meta = (notification as EscrowFundedNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          amount: meta.amount,
          currency: meta.currency,
          recipientType: meta.recipientType
        };
      }
      case NotificationCategory.ESCROW_RELEASED: {
        const meta = (notification as EscrowReleasedNotification).metadata;
        return {
          ...baseNotification,
          orderId: meta.orderId,
          orderNumber: meta.orderNumber,
          productTitle: meta.productTitle,
          amount: meta.amount,
          currency: meta.currency,
          recipientType: meta.recipientType
        };
      }
      default:
        return baseNotification;
    }
  }, []);

  // Handle incoming notification from service
  const handleNotification = useCallback((notification: RealTimeNotification) => {
    const orderNotification = convertToOrderNotification(notification);
    if (!orderNotification) return;

    setNotifications(prev => {
      // Prevent duplicates
      if (prev.some(n => n.id === orderNotification.id)) {
        return prev;
      }
      // Limit to 100 most recent notifications
      const updated = [orderNotification, ...prev].slice(0, 100);
      return updated;
    });

    // Show browser notification if permitted and document is hidden
    if (typeof window !== 'undefined' && document.hidden && Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(orderNotification.title, {
          body: orderNotification.message,
          icon: orderNotification.productImage || '/icons/order-icon.png',
          tag: `order-${orderNotification.id}`,
        });

        browserNotification.onclick = () => {
          window.focus();
          if (orderNotification.orderId) {
            router.push(`/marketplace/orders/${orderNotification.orderId}`);
          }
          browserNotification.close();
        };

        setTimeout(() => browserNotification.close(), 8000);
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }, [router, convertToOrderNotification]);

  // Connect to real-time notification service
  useEffect(() => {
    if (!isWalletConnected || !isAuthenticated || !address || !user) {
      setIsConnected(false);
      return;
    }

    if (isConnectingRef.current) return;

    const connectToService = async () => {
      isConnectingRef.current = true;
      try {
        const token = localStorage.getItem('linkdao_access_token') ||
          localStorage.getItem('authToken') ||
          localStorage.getItem('token') || '';

        await realTimeNotificationService.connect(address, token);
        setIsConnected(true);

        // Subscribe to notification events
        realTimeNotificationService.on('notification', handleNotification);
        realTimeNotificationService.on('notification_batch', (batch: Record<string, RealTimeNotification[]>) => {
          Object.values(batch).flat().forEach(handleNotification);
        });
        realTimeNotificationService.on('connection', (status: { status: string }) => {
          setIsConnected(status.status === 'connected');
        });
      } catch (error) {
        console.error('[OrderNotifications] Connection failed:', error);
        setIsConnected(false);
      } finally {
        isConnectingRef.current = false;
      }
    };

    connectToService();

    return () => {
      realTimeNotificationService.off('notification', handleNotification);
      realTimeNotificationService.disconnect();
      setIsConnected(false);
    };
  }, [isWalletConnected, isAuthenticated, address, user, handleNotification]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && address) {
      try {
        const stored = localStorage.getItem(`order_notifications_${address}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const notifications = parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }));
          setNotifications(notifications);
        }
      } catch (error) {
        console.error('Error loading stored order notifications:', error);
      }
    }
  }, [address]);

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && address && notifications.length > 0) {
      try {
        localStorage.setItem(`order_notifications_${address}`, JSON.stringify(notifications));
      } catch (error) {
        console.error('Error saving order notifications:', error);
      }
    }
  }, [notifications, address]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Add a new notification
  const addNotification = useCallback((notification: Omit<OrderNotification, 'id' | 'read' | 'dismissed'>) => {
    const newNotification: OrderNotification = {
      ...notification,
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      dismissed: false,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 100);
      return updated;
    });
  }, []);

  // Mark a notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
    realTimeNotificationService.markAsRead(notificationId);
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    realTimeNotificationService.markAllAsRead();
  }, []);

  // Dismiss a notification
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, dismissed: true } : n))
    );
    realTimeNotificationService.dismissNotification(notificationId);
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    if (typeof window !== 'undefined' && address) {
      localStorage.removeItem(`order_notifications_${address}`);
    }
  }, [address]);

  // Navigate to order
  const navigateToOrder = useCallback((orderId: string) => {
    router.push(`/marketplace/orders/${orderId}`);
  }, [router]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type: NotificationCategory) => {
    return notifications.filter(n => n.type === type && !n.dismissed);
  }, [notifications]);

  // Get buyer notifications
  const getBuyerNotifications = useCallback(() => {
    return notifications.filter(n => n.recipientType === 'buyer' && !n.dismissed);
  }, [notifications]);

  // Get seller notifications
  const getSellerNotifications = useCallback(() => {
    return notifications.filter(n => n.recipientType === 'seller' && !n.dismissed);
  }, [notifications]);

  const value: OrderNotificationContextType = {
    notifications: notifications.filter(n => !n.dismissed),
    unreadCount,
    buyerUnreadCount,
    sellerUnreadCount,
    isConnected,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearNotifications,
    navigateToOrder,
    getNotificationsByType,
    getBuyerNotifications,
    getSellerNotifications,
  };

  return (
    <OrderNotificationContext.Provider value={value}>
      {children}
    </OrderNotificationContext.Provider>
  );
};

export const useOrderNotifications = (): OrderNotificationContextType => {
  const context = useContext(OrderNotificationContext);
  if (!context) {
    throw new Error('useOrderNotifications must be used within an OrderNotificationProvider');
  }
  return context;
};

export default OrderNotificationContext;

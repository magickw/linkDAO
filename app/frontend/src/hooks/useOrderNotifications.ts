/**
 * useOrderNotifications Hook
 * React hook for subscribing to and managing order notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  orderNotificationService,
  OrderNotification,
  OrderNotificationEvent,
  OrderNotificationData,
} from '@/services/orderNotificationService';

interface UseOrderNotificationsOptions {
  /**
   * Whether to auto-subscribe on mount
   */
  autoSubscribe?: boolean;
  /**
   * Events to subscribe to (default: all)
   */
  events?: OrderNotificationEvent[];
  /**
   * Maximum number of notifications to keep in state
   */
  maxNotifications?: number;
  /**
   * Whether to show toast notifications
   */
  showToasts?: boolean;
  /**
   * Filter by user role (buyer or seller)
   */
  filterByRole?: 'buyer' | 'seller';
}

interface UseOrderNotificationsResult {
  /**
   * List of order notifications
   */
  notifications: OrderNotification[];
  /**
   * Unread count
   */
  unreadCount: number;
  /**
   * Whether currently loading
   */
  isLoading: boolean;
  /**
   * Any error that occurred
   */
  error: Error | null;
  /**
   * Send an order notification
   */
  sendNotification: (event: OrderNotificationEvent, data: OrderNotificationData) => Promise<void>;
  /**
   * Clear all notifications
   */
  clearNotifications: () => void;
  /**
   * Mark notification as read
   */
  markAsRead: (notificationId: string) => void;
  /**
   * Subscribe to a specific event
   */
  subscribe: (event: OrderNotificationEvent, callback: (notification: OrderNotification) => void) => () => void;
}

const DEFAULT_MAX_NOTIFICATIONS = 50;

export function useOrderNotifications(
  options: UseOrderNotificationsOptions = {}
): UseOrderNotificationsResult {
  const {
    autoSubscribe = true,
    events,
    maxNotifications = DEFAULT_MAX_NOTIFICATIONS,
    showToasts = true,
    filterByRole,
  } = options;

  const { user } = useAuth();
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const unsubscribersRef = useRef<(() => void)[]>([]);
  const readNotificationsRef = useRef<Set<string>>(new Set());

  // Handle incoming notification
  const handleNotification = useCallback(
    (notification: OrderNotification) => {
      // Filter by role if specified
      if (filterByRole && user?.address) {
        const isBuyer = notification.data.buyerAddress.toLowerCase() === user.address.toLowerCase();
        const isSeller = notification.data.sellerAddress.toLowerCase() === user.address.toLowerCase();

        if (filterByRole === 'buyer' && !isBuyer) return;
        if (filterByRole === 'seller' && !isSeller) return;
      }

      // Add notification to state
      setNotifications((prev) => {
        const updated = [notification, ...prev];
        return updated.slice(0, maxNotifications);
      });

      // Increment unread count
      setUnreadCount((prev) => prev + 1);

      // Show toast if enabled
      if (showToasts) {
        const config = orderNotificationService.getNotificationConfig(notification.event);
        if (config) {
          const isBuyer = user?.address?.toLowerCase() === notification.data.buyerAddress.toLowerCase();
          const message = config.messageTemplate(notification.data, isBuyer);

          switch (config.priority) {
            case 'urgent':
              addToast(message, 'error');
              break;
            case 'high':
              addToast(message, 'success');
              break;
            default:
              addToast(message, 'info');
          }
        }
      }
    },
    [filterByRole, user?.address, maxNotifications, showToasts, addToast]
  );

  // Subscribe to notifications
  useEffect(() => {
    if (!autoSubscribe) return;

    // Subscribe to specified events or all events
    if (events && events.length > 0) {
      events.forEach((event) => {
        const unsubscribe = orderNotificationService.subscribe(event, handleNotification);
        unsubscribersRef.current.push(unsubscribe);
      });
    } else {
      // Subscribe to all events
      const unsubscribe = orderNotificationService.subscribe('all', handleNotification);
      unsubscribersRef.current.push(unsubscribe);
    }

    // Cleanup on unmount
    return () => {
      unsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
      unsubscribersRef.current = [];
    };
  }, [autoSubscribe, events, handleNotification]);

  // Send notification
  const sendNotification = useCallback(
    async (event: OrderNotificationEvent, data: OrderNotificationData): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        await orderNotificationService.sendOrderNotification(event, data);
        // Also send via backend for persistence and other party notification
        await orderNotificationService.sendNotificationViaBackend(event, data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to send notification'));
        console.error('Failed to send order notification:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    readNotificationsRef.current.clear();
  }, []);

  // Mark as read
  const markAsRead = useCallback((notificationId: string) => {
    if (readNotificationsRef.current.has(notificationId)) return;

    readNotificationsRef.current.add(notificationId);
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Manual subscribe
  const subscribe = useCallback(
    (event: OrderNotificationEvent, callback: (notification: OrderNotification) => void) => {
      return orderNotificationService.subscribe(event, callback);
    },
    []
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    sendNotification,
    clearNotifications,
    markAsRead,
    subscribe,
  };
}

/**
 * Hook for sending order notifications easily
 */
export function useOrderNotificationSender() {
  const { addToast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const sendNotification = useCallback(
    async (event: OrderNotificationEvent, data: OrderNotificationData): Promise<boolean> => {
      setIsSending(true);
      try {
        await orderNotificationService.sendOrderNotification(event, data);
        await orderNotificationService.sendNotificationViaBackend(event, data);
        return true;
      } catch (error) {
        console.error('Failed to send order notification:', error);
        addToast('Failed to send notification', 'error');
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [addToast]
  );

  // Convenience methods for common events
  const notifyOrderCreated = useCallback(
    (data: OrderNotificationData) => sendNotification('order_created', data),
    [sendNotification]
  );

  const notifyOrderShipped = useCallback(
    (data: OrderNotificationData) => sendNotification('order_shipped', data),
    [sendNotification]
  );

  const notifyOrderDelivered = useCallback(
    (data: OrderNotificationData) => sendNotification('order_delivered', data),
    [sendNotification]
  );

  const notifyOrderCancelled = useCallback(
    (data: OrderNotificationData) => sendNotification('order_cancelled', data),
    [sendNotification]
  );

  const notifyDeliveryConfirmed = useCallback(
    (data: OrderNotificationData) => sendNotification('delivery_confirmed', data),
    [sendNotification]
  );

  const notifyOrderDisputed = useCallback(
    (data: OrderNotificationData) => sendNotification('order_disputed', data),
    [sendNotification]
  );

  const notifyPaymentReceived = useCallback(
    (data: OrderNotificationData) => sendNotification('payment_received', data),
    [sendNotification]
  );

  return {
    isSending,
    sendNotification,
    notifyOrderCreated,
    notifyOrderShipped,
    notifyOrderDelivered,
    notifyOrderCancelled,
    notifyDeliveryConfirmed,
    notifyOrderDisputed,
    notifyPaymentReceived,
  };
}

export default useOrderNotifications;

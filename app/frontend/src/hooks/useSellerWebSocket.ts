import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createSellerWebSocketService } from '../services/sellerWebSocketService';
import type SellerWebSocketService from '../services/sellerWebSocketService';

interface UseSellerWebSocketConfig {
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

interface ConnectionStatus {
  connected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: string;
}

export interface UseSellerWebSocketReturn {
  // Connection state
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  
  // Connection control
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Notifications
  notifications: SellerNotification[];
  unreadCount: number;
  clearNotifications: () => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  
  // Real-time data
  orders: any[];
  analytics: any;
  profile: any;
  
  // Event handlers
  onNewOrder: (callback: (order: any) => void) => () => void;
  onOrderStatusChange: (callback: (data: any) => void) => () => void;
  onPaymentReceived: (callback: (payment: any) => void) => () => void;
  onTierUpgrade: (callback: (tier: any) => void) => () => void;
  onReviewReceived: (callback: (review: any) => void) => () => void;
  onAnalyticsUpdate: (callback: (analytics: any) => void) => () => void;
  
  // Cache invalidation
  registerCacheCallback: (key: string, callback: () => void) => void;
  unregisterCacheCallback: (key: string, callback: () => void) => void;
  
  // Utility
  requestDataRefresh: (dataTypes: string[]) => void;
  sendCustomEvent: (event: string, data: any, priority?: 'low' | 'medium' | 'high' | 'urgent') => void;
}

export const useSellerWebSocket = (config: UseSellerWebSocketConfig): UseSellerWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnectAttempts: 0
  });
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const serviceRef = useRef<SellerWebSocketService | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<Function>>>(new Map());

  // Initialize service
  useEffect(() => {
    if (!config.walletAddress) return;

    try {
      serviceRef.current = createSellerWebSocketService({
        walletAddress: config.walletAddress,
        autoConnect: config.autoConnect ?? true,
        enableNotifications: config.enableNotifications ?? true,
        enableAnalytics: config.enableAnalytics ?? true
      });

      // Set up event listeners
      setupEventListeners();

      return () => {
        if (serviceRef.current) {
          serviceRef.current.disconnect();
          serviceRef.current = null;
        }
      };
    } catch (error) {
      console.error('Failed to initialize seller WebSocket service:', error);
    }
  }, [config.walletAddress, config.autoConnect, config.enableNotifications, config.enableAnalytics]);

  const setupEventListeners = useCallback(() => {
    if (!serviceRef.current) return;

    const service = serviceRef.current;

    // Connection status
    service.on('connection_status_changed', (status: ConnectionStatus) => {
      setConnectionStatus(status);
      setIsConnected(status.connected);
    });

    // Seller events
    service.on('seller_authenticated', (data: any) => {
      console.log('Seller authenticated:', data);
    });

    service.on('new_order', (data: any) => {
      setOrders(prev => [data.order, ...prev]);
      triggerEventHandlers('new_order', data.order);
    });

    service.on('order_status_changed', (data: any) => {
      setOrders(prev => prev.map(order => 
        order.id === data.orderId 
          ? { ...order, status: data.status }
          : order
      ));
      triggerEventHandlers('order_status_change', data);
    });

    service.on('payment_received', (data: any) => {
      triggerEventHandlers('payment_received', data);
    });

    service.on('tier_upgraded', (data: any) => {
      setProfile((prev: any) => prev ? { ...prev, tier: data.newTier } : null);
      triggerEventHandlers('tier_upgrade', data);
    });

    service.on('review_received', (data: any) => {
      triggerEventHandlers('review_received', data);
    });

    service.on('analytics_updated', (data: any) => {
      setAnalytics(data.metrics);
      triggerEventHandlers('analytics_update', data.metrics);
    });

    service.on('profile_updated', (data: any) => {
      setProfile(data.data);
    });

    service.on('notification_queued', (notification: SellerNotification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 100)); // Keep last 100
    });

    service.on('notification_processed', (notification: SellerNotification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 100));
    });

  }, []);

  const triggerEventHandlers = useCallback((eventType: string, data: any) => {
    const handlers = eventHandlersRef.current.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${eventType} handler:`, error);
        }
      });
    }
  }, []);

  // Connection control
  const connect = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
    }
  }, []);

  // Notification management
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    if (serviceRef.current) {
      serviceRef.current.clearNotificationQueue();
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev: SellerNotification[]) => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev: SellerNotification[]) => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Event handler registration
  const registerEventHandler = useCallback((eventType: string, callback: Function) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }
    eventHandlersRef.current.get(eventType)!.add(callback);

    // Return cleanup function
    return () => {
      const handlers = eventHandlersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(callback);
      }
    };
  }, []);

  // Specific event handlers
  const onNewOrder = useCallback((callback: (order: any) => void) => {
    return registerEventHandler('new_order', callback);
  }, [registerEventHandler]);

  const onOrderStatusChange = useCallback((callback: (data: any) => void) => {
    return registerEventHandler('order_status_change', callback);
  }, [registerEventHandler]);

  const onPaymentReceived = useCallback((callback: (payment: any) => void) => {
    return registerEventHandler('payment_received', callback);
  }, [registerEventHandler]);

  const onTierUpgrade = useCallback((callback: (tier: any) => void) => {
    return registerEventHandler('tier_upgrade', callback);
  }, [registerEventHandler]);

  const onReviewReceived = useCallback((callback: (review: any) => void) => {
    return registerEventHandler('review_received', callback);
  }, [registerEventHandler]);

  const onAnalyticsUpdate = useCallback((callback: (analytics: any) => void) => {
    return registerEventHandler('analytics_update', callback);
  }, [registerEventHandler]);

  // Cache invalidation
  const registerCacheCallback = useCallback((key: string, callback: () => void) => {
    if (serviceRef.current) {
      serviceRef.current.registerCacheInvalidationCallback(key, callback);
    }
  }, []);

  const unregisterCacheCallback = useCallback((key: string, callback: () => void) => {
    if (serviceRef.current) {
      serviceRef.current.unregisterCacheInvalidationCallback(key, callback);
    }
  }, []);

  // Utility functions
  const requestDataRefresh = useCallback((dataTypes: string[]) => {
    if (serviceRef.current) {
      serviceRef.current.requestDataRefresh(dataTypes);
    }
  }, []);

  const sendCustomEvent = useCallback((event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') => {
    if (serviceRef.current) {
      serviceRef.current.sendSellerEvent(event, data, priority);
    }
  }, []);

  return {
    // Connection state
    isConnected,
    connectionStatus,
    
    // Connection control
    connect,
    disconnect,
    
    // Notifications
    notifications,
    unreadCount,
    clearNotifications,
    markAsRead,
    markAllAsRead,
    
    // Real-time data
    orders,
    analytics,
    profile,
    
    // Event handlers
    onNewOrder,
    onOrderStatusChange,
    onPaymentReceived,
    onTierUpgrade,
    onReviewReceived,
    onAnalyticsUpdate,
    
    // Cache invalidation
    registerCacheCallback,
    unregisterCacheCallback,
    
    // Utility
    requestDataRefresh,
    sendCustomEvent
  };
};

// Higher-order component for seller WebSocket functionality
export const withSellerWebSocket = <P extends object>(
  Component: React.ComponentType<P & { sellerWebSocket: UseSellerWebSocketReturn }>
): React.FC<P & { walletAddress: string }> => {
  return (props: P & { walletAddress: string }) => {
    const sellerWebSocket = useSellerWebSocket({
      walletAddress: props.walletAddress,
      autoConnect: true,
      enableNotifications: true,
      enableAnalytics: true
    });

    return React.createElement(Component, { ...props, sellerWebSocket });
  };
};

export default useSellerWebSocket;
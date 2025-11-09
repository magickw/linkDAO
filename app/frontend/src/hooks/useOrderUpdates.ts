import { useState, useEffect, useCallback } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { Order } from '@/types/order';

interface OrderUpdateEvent {
  orderId: string;
  type: 'order_status_changed' | 'order_created' | 'order_updated' | 'tracking_info_added' | 'order_delivered' | 'order_completed';
  data: any;
  timestamp: string;
}

interface UseOrderUpdatesReturn {
  subscribeToOrder: (orderId: string) => void;
  unsubscribeFromOrder: (orderId: string) => void;
  orderUpdates: Record<string, OrderUpdateEvent>;
  isSubscribed: (orderId: string) => boolean;
}

export const useOrderUpdates = (): UseOrderUpdatesReturn => {
  const webSocket = useWebSocketContext();
  const [orderUpdates, setOrderUpdates] = useState<Record<string, OrderUpdateEvent>>({});
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());

  // Handle order update events
  const handleOrderUpdate = useCallback((data: any) => {
    const updateEvent: OrderUpdateEvent = {
      orderId: data.orderId,
      type: data.type || 'order_updated',
      data: data.data,
      timestamp: data.timestamp
    };

    setOrderUpdates(prev => ({
      ...prev,
      [data.orderId]: updateEvent
    }));
  }, []);

  // Subscribe to order updates
  const subscribeToOrder = useCallback((orderId: string) => {
    if (!webSocket.isConnected) return;
    
    // Add to subscriptions
    setSubscriptions(prev => new Set(prev).add(orderId));
    
    // In a real implementation, you might want to send a subscription message to the server
    // For now, we'll just listen for order events
  }, [webSocket.isConnected]);

  // Unsubscribe from order updates
  const unsubscribeFromOrder = useCallback((orderId: string) => {
    setSubscriptions(prev => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      return newSet;
    });
  }, []);

  // Check if subscribed to an order
  const isSubscribed = useCallback((orderId: string) => {
    return subscriptions.has(orderId);
  }, [subscriptions]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!webSocket.isConnected) return;

    // Listen for order-related events
    webSocket.on('order_status_changed', handleOrderUpdate);
    webSocket.on('order_created', handleOrderUpdate);
    webSocket.on('order_updated', handleOrderUpdate);
    webSocket.on('tracking_info_added', handleOrderUpdate);
    webSocket.on('order_delivered', handleOrderUpdate);
    webSocket.on('order_completed', handleOrderUpdate);
    webSocket.on('order_notification', handleOrderUpdate);

    // Cleanup listeners on unmount
    return () => {
      webSocket.off('order_status_changed', handleOrderUpdate);
      webSocket.off('order_created', handleOrderUpdate);
      webSocket.off('order_updated', handleOrderUpdate);
      webSocket.off('tracking_info_added', handleOrderUpdate);
      webSocket.off('order_delivered', handleOrderUpdate);
      webSocket.off('order_completed', handleOrderUpdate);
      webSocket.off('order_notification', handleOrderUpdate);
    };
  }, [webSocket, handleOrderUpdate]);

  return {
    subscribeToOrder,
    unsubscribeFromOrder,
    orderUpdates,
    isSubscribed
  };
};

export default useOrderUpdates;
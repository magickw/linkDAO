import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import {
  RealTimeUpdateState,
  WebSocketConnection,
  Subscription,
  LiveUpdate,
  RealTimeNotification,
  UpdateQueue,
  UpdateType,
  NotificationType,
  NotificationPriority,
  SubscriptionFilter
} from './types';

// Action Types
type RealTimeUpdateAction =
  | { type: 'ADD_CONNECTION'; payload: Omit<WebSocketConnection, 'lastHeartbeat' | 'reconnectAttempts'> }
  | { type: 'UPDATE_CONNECTION'; payload: { id: string; updates: Partial<WebSocketConnection> } }
  | { type: 'REMOVE_CONNECTION'; payload: string }
  | { type: 'ADD_SUBSCRIPTION'; payload: Subscription }
  | { type: 'REMOVE_SUBSCRIPTION'; payload: string }
  | { type: 'UPDATE_SUBSCRIPTION'; payload: { id: string; updates: Partial<Subscription> } }
  | { type: 'ADD_LIVE_UPDATE'; payload: { channel: string; update: LiveUpdate } }
  | { type: 'MARK_UPDATE_PROCESSED'; payload: { channel: string; updateId: string } }
  | { type: 'ADD_NOTIFICATION'; payload: RealTimeNotification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS'; payload?: NotificationType }
  | { type: 'UPDATE_QUEUE'; payload: Partial<UpdateQueue> }
  | { type: 'PROCESS_UPDATE_BATCH'; payload: { channel: string; updates: LiveUpdate[] } }
  | { type: 'CLEAR_PROCESSED_UPDATES'; payload: string }
  | { type: 'UPDATE_HEARTBEAT'; payload: { connectionId: string; timestamp: Date } };

// Initial State
const initialState: RealTimeUpdateState = {
  connections: new Map(),
  subscriptions: new Map(),
  liveUpdates: new Map(),
  notifications: [],
  updateQueue: {
    pending: [],
    processing: [],
    failed: [],
    maxSize: 1000,
    batchSize: 10,
    processingInterval: 1000,
  },
};

// Reducer
function realTimeUpdateReducer(
  state: RealTimeUpdateState,
  action: RealTimeUpdateAction
): RealTimeUpdateState {
  switch (action.type) {
    case 'ADD_CONNECTION': {
      const connection: WebSocketConnection = {
        ...action.payload,
        lastHeartbeat: new Date(),
        reconnectAttempts: 0,
      };

      const newConnections = new Map(state.connections);
      newConnections.set(connection.id, connection);

      return {
        ...state,
        connections: newConnections,
      };
    }

    case 'UPDATE_CONNECTION': {
      const { id, updates } = action.payload;
      const existingConnection = state.connections.get(id);
      if (!existingConnection) return state;

      const updatedConnection = {
        ...existingConnection,
        ...updates,
      };

      const newConnections = new Map(state.connections);
      newConnections.set(id, updatedConnection);

      return {
        ...state,
        connections: newConnections,
      };
    }

    case 'REMOVE_CONNECTION': {
      const newConnections = new Map(state.connections);
      newConnections.delete(action.payload);

      return {
        ...state,
        connections: newConnections,
      };
    }

    case 'ADD_SUBSCRIPTION': {
      const newSubscriptions = new Map(state.subscriptions);
      newSubscriptions.set(action.payload.id, action.payload);

      return {
        ...state,
        subscriptions: newSubscriptions,
      };
    }

    case 'REMOVE_SUBSCRIPTION': {
      const newSubscriptions = new Map(state.subscriptions);
      newSubscriptions.delete(action.payload);

      return {
        ...state,
        subscriptions: newSubscriptions,
      };
    }

    case 'UPDATE_SUBSCRIPTION': {
      const { id, updates } = action.payload;
      const existingSubscription = state.subscriptions.get(id);
      if (!existingSubscription) return state;

      const updatedSubscription = {
        ...existingSubscription,
        ...updates,
      };

      const newSubscriptions = new Map(state.subscriptions);
      newSubscriptions.set(id, updatedSubscription);

      return {
        ...state,
        subscriptions: newSubscriptions,
      };
    }

    case 'ADD_LIVE_UPDATE': {
      const { channel, update } = action.payload;
      const existingUpdates = state.liveUpdates.get(channel) || [];
      const newUpdates = [...existingUpdates, update];

      // Keep only the last 100 updates per channel
      const trimmedUpdates = newUpdates.slice(-100);

      const newLiveUpdates = new Map(state.liveUpdates);
      newLiveUpdates.set(channel, trimmedUpdates);

      return {
        ...state,
        liveUpdates: newLiveUpdates,
      };
    }

    case 'MARK_UPDATE_PROCESSED': {
      const { channel, updateId } = action.payload;
      const channelUpdates = state.liveUpdates.get(channel);
      if (!channelUpdates) return state;

      const updatedChannelUpdates = channelUpdates.map(update =>
        update.id === updateId
          ? { ...update, processed: true }
          : update
      );

      const newLiveUpdates = new Map(state.liveUpdates);
      newLiveUpdates.set(channel, updatedChannelUpdates);

      return {
        ...state,
        liveUpdates: newLiveUpdates,
      };
    }

    case 'ADD_NOTIFICATION': {
      const newNotifications = [action.payload, ...state.notifications];
      
      // Keep only the last 50 notifications
      const trimmedNotifications = newNotifications.slice(0, 50);

      return {
        ...state,
        notifications: trimmedNotifications,
      };
    }

    case 'MARK_NOTIFICATION_READ': {
      const newNotifications = state.notifications.map(notification =>
        notification.id === action.payload
          ? { ...notification, read: true }
          : notification
      );

      return {
        ...state,
        notifications: newNotifications,
      };
    }

    case 'REMOVE_NOTIFICATION': {
      const newNotifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );

      return {
        ...state,
        notifications: newNotifications,
      };
    }

    case 'CLEAR_NOTIFICATIONS': {
      const typeFilter = action.payload;
      const newNotifications = typeFilter
        ? state.notifications.filter(notification => notification.type !== typeFilter)
        : [];

      return {
        ...state,
        notifications: newNotifications,
      };
    }

    case 'UPDATE_QUEUE': {
      return {
        ...state,
        updateQueue: {
          ...state.updateQueue,
          ...action.payload,
        },
      };
    }

    case 'PROCESS_UPDATE_BATCH': {
      const { channel, updates } = action.payload;
      const existingUpdates = state.liveUpdates.get(channel) || [];
      const newUpdates = [...existingUpdates, ...updates];

      // Keep only the last 100 updates per channel
      const trimmedUpdates = newUpdates.slice(-100);

      const newLiveUpdates = new Map(state.liveUpdates);
      newLiveUpdates.set(channel, trimmedUpdates);

      return {
        ...state,
        liveUpdates: newLiveUpdates,
      };
    }

    case 'CLEAR_PROCESSED_UPDATES': {
      const channel = action.payload;
      const channelUpdates = state.liveUpdates.get(channel);
      if (!channelUpdates) return state;

      const unprocessedUpdates = channelUpdates.filter(update => !update.processed);

      const newLiveUpdates = new Map(state.liveUpdates);
      if (unprocessedUpdates.length > 0) {
        newLiveUpdates.set(channel, unprocessedUpdates);
      } else {
        newLiveUpdates.delete(channel);
      }

      return {
        ...state,
        liveUpdates: newLiveUpdates,
      };
    }

    case 'UPDATE_HEARTBEAT': {
      const { connectionId, timestamp } = action.payload;
      const connection = state.connections.get(connectionId);
      if (!connection) return state;

      const updatedConnection = {
        ...connection,
        lastHeartbeat: timestamp,
      };

      const newConnections = new Map(state.connections);
      newConnections.set(connectionId, updatedConnection);

      return {
        ...state,
        connections: newConnections,
      };
    }

    default:
      return state;
  }
}

// Helper Functions
function matchesFilters(update: LiveUpdate, filters: SubscriptionFilter[]): boolean {
  return filters.every(filter => {
    const value = update.data[filter.field];
    
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'contains':
        return typeof value === 'string' && value.includes(filter.value);
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'gt':
        return typeof value === 'number' && value > filter.value;
      case 'lt':
        return typeof value === 'number' && value < filter.value;
      default:
        return true;
    }
  });
}

function createNotificationFromUpdate(update: LiveUpdate): RealTimeNotification | null {
  switch (update.type) {
    case 'POST_REACTION':
      return {
        id: `notif_${update.id}`,
        type: NotificationType.REACTION,
        title: 'New Reaction',
        message: `Someone reacted to your post with ${update.data.reactionType}`,
        data: update.data,
        timestamp: update.timestamp,
        read: false,
        priority: NotificationPriority.MEDIUM,
      };

    case 'POST_TIP':
      return {
        id: `notif_${update.id}`,
        type: NotificationType.TIP,
        title: 'New Tip Received',
        message: `You received ${update.data.amount} ${update.data.token} tip!`,
        data: update.data,
        timestamp: update.timestamp,
        read: false,
        priority: NotificationPriority.HIGH,
      };

    case 'COMMENT_ADDED':
      return {
        id: `notif_${update.id}`,
        type: NotificationType.MENTION,
        title: 'New Comment',
        message: `${update.data.author} commented on your post`,
        data: update.data,
        timestamp: update.timestamp,
        read: false,
        priority: NotificationPriority.MEDIUM,
      };

    default:
      return null;
  }
}

// Context
interface RealTimeUpdateContextType {
  state: RealTimeUpdateState;
  connect: (url: string, channels?: string[]) => Promise<string>;
  disconnect: (connectionId: string) => void;
  subscribe: (channel: string, filters?: SubscriptionFilter[], callback?: (update: LiveUpdate) => void) => string;
  unsubscribe: (subscriptionId: string) => void;
  sendMessage: (connectionId: string, message: any) => void;
  getUpdates: (channel: string, unprocessedOnly?: boolean) => LiveUpdate[];
  markUpdateProcessed: (channel: string, updateId: string) => void;
  clearProcessedUpdates: (channel: string) => void;
  addNotification: (notification: Omit<RealTimeNotification, 'id' | 'timestamp'>) => void;
  markNotificationRead: (notificationId: string) => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: (type?: NotificationType) => void;
  getUnreadNotifications: () => RealTimeNotification[];
  getNotificationsByType: (type: NotificationType) => RealTimeNotification[];
  isConnected: (connectionId?: string) => boolean;
  getConnectionStatus: (connectionId: string) => WebSocketConnection | undefined;
  reconnectAll: () => void;
}

const RealTimeUpdateContext = createContext<RealTimeUpdateContextType | undefined>(undefined);

// Provider
interface RealTimeUpdateProviderProps {
  children: React.ReactNode;
}

export function RealTimeUpdateProvider({ children }: RealTimeUpdateProviderProps) {
  const [state, dispatch] = useReducer(realTimeUpdateReducer, initialState);
  const websocketsRef = useRef<Map<string, WebSocket>>(new Map());
  const heartbeatIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Close all WebSocket connections
      websocketsRef.current.forEach((ws) => {
        ws.close();
      });
      
      // Clear all heartbeat intervals
      heartbeatIntervalsRef.current.forEach((interval) => {
        clearInterval(interval);
      });
    };
  }, []);

  // Process update queue
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.updateQueue.pending.length > 0) {
        const batch = state.updateQueue.pending.slice(0, state.updateQueue.batchSize);
        
        // Process batch
        batch.forEach((update) => {
          // Find matching subscriptions
          state.subscriptions.forEach((subscription) => {
            if (subscription.active && matchesFilters(update, subscription.filters)) {
              // Add to live updates
              dispatch({
                type: 'ADD_LIVE_UPDATE',
                payload: { channel: subscription.channel, update },
              });

              // Call subscription callback
              if (subscription.callback) {
                subscription.callback(update);
              }

              // Create notification if applicable
              const notification = createNotificationFromUpdate(update);
              if (notification) {
                dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
              }
            }
          });
        });

        // Remove processed updates from queue
        const remainingPending = state.updateQueue.pending.slice(state.updateQueue.batchSize);
        dispatch({
          type: 'UPDATE_QUEUE',
          payload: { pending: remainingPending },
        });
      }
    }, state.updateQueue.processingInterval);

    return () => clearInterval(interval);
  }, [state.updateQueue, state.subscriptions]);

  const connect = useCallback(async (url: string, channels: string[] = []): Promise<string> => {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
          dispatch({
            type: 'ADD_CONNECTION',
            payload: {
              id: connectionId,
              url,
              status: 'connected',
            },
          });

          // Subscribe to channels
          channels.forEach((channel) => {
            ws.send(JSON.stringify({
              type: 'subscribe',
              channel,
            }));
          });

          // Start heartbeat
          const heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
              dispatch({
                type: 'UPDATE_HEARTBEAT',
                payload: { connectionId, timestamp: new Date() },
              });
            }
          }, 30000); // Every 30 seconds

          heartbeatIntervalsRef.current.set(connectionId, heartbeatInterval);
          websocketsRef.current.set(connectionId, ws);
          
          resolve(connectionId);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'update') {
              const update: LiveUpdate = {
                id: message.id || `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: message.updateType,
                data: message.data,
                timestamp: new Date(message.timestamp || Date.now()),
                processed: false,
              };

              // Add to update queue
              const newPending = [...state.updateQueue.pending, update];
              if (newPending.length > state.updateQueue.maxSize) {
                newPending.shift(); // Remove oldest update
              }

              dispatch({
                type: 'UPDATE_QUEUE',
                payload: { pending: newPending },
              });
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          dispatch({
            type: 'UPDATE_CONNECTION',
            payload: {
              id: connectionId,
              updates: { status: 'error' },
            },
          });
          reject(error);
        };

        ws.onclose = () => {
          dispatch({
            type: 'UPDATE_CONNECTION',
            payload: {
              id: connectionId,
              updates: { status: 'disconnected' },
            },
          });

          // Clear heartbeat
          const heartbeatInterval = heartbeatIntervalsRef.current.get(connectionId);
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatIntervalsRef.current.delete(connectionId);
          }

          websocketsRef.current.delete(connectionId);

          // Attempt reconnection
          setTimeout(() => {
            const connection = state.connections.get(connectionId);
            if (connection && connection.reconnectAttempts < 5) {
              dispatch({
                type: 'UPDATE_CONNECTION',
                payload: {
                  id: connectionId,
                  updates: { reconnectAttempts: connection.reconnectAttempts + 1 },
                },
              });
              connect(url, channels);
            }
          }, Math.pow(2, state.connections.get(connectionId)?.reconnectAttempts || 0) * 1000);
        };

        // Set initial status
        dispatch({
          type: 'UPDATE_CONNECTION',
          payload: {
            id: connectionId,
            updates: { status: 'connecting' },
          },
        });

      } catch (error) {
        reject(error);
      }
    });
  }, [state.connections, state.updateQueue]);

  const disconnect = useCallback((connectionId: string) => {
    const ws = websocketsRef.current.get(connectionId);
    if (ws) {
      ws.close();
    }

    const heartbeatInterval = heartbeatIntervalsRef.current.get(connectionId);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatIntervalsRef.current.delete(connectionId);
    }

    dispatch({ type: 'REMOVE_CONNECTION', payload: connectionId });
  }, []);

  const subscribe = useCallback((
    channel: string,
    filters: SubscriptionFilter[] = [],
    callback?: (update: LiveUpdate) => void
  ): string => {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: Subscription = {
      id: subscriptionId,
      channel,
      filters,
      callback: callback || (() => {}),
      active: true,
    };

    dispatch({ type: 'ADD_SUBSCRIPTION', payload: subscription });
    
    return subscriptionId;
  }, []);

  const unsubscribe = useCallback((subscriptionId: string) => {
    dispatch({ type: 'REMOVE_SUBSCRIPTION', payload: subscriptionId });
  }, []);

  const sendMessage = useCallback((connectionId: string, message: any) => {
    const ws = websocketsRef.current.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }, []);

  const getUpdates = useCallback((channel: string, unprocessedOnly = false): LiveUpdate[] => {
    const updates = state.liveUpdates.get(channel) || [];
    return unprocessedOnly ? updates.filter(update => !update.processed) : updates;
  }, [state.liveUpdates]);

  const markUpdateProcessed = useCallback((channel: string, updateId: string) => {
    dispatch({ type: 'MARK_UPDATE_PROCESSED', payload: { channel, updateId } });
  }, []);

  const clearProcessedUpdates = useCallback((channel: string) => {
    dispatch({ type: 'CLEAR_PROCESSED_UPDATES', payload: channel });
  }, []);

  const addNotification = useCallback((
    notification: Omit<RealTimeNotification, 'id' | 'timestamp'>
  ) => {
    const fullNotification: RealTimeNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notificationId });
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });
  }, []);

  const clearNotifications = useCallback((type?: NotificationType) => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS', payload: type });
  }, []);

  const getUnreadNotifications = useCallback((): RealTimeNotification[] => {
    return state.notifications.filter(notification => !notification.read);
  }, [state.notifications]);

  const getNotificationsByType = useCallback((type: NotificationType): RealTimeNotification[] => {
    return state.notifications.filter(notification => notification.type === type);
  }, [state.notifications]);

  const isConnected = useCallback((connectionId?: string): boolean => {
    if (connectionId) {
      const connection = state.connections.get(connectionId);
      return connection?.status === 'connected';
    }
    
    // Check if any connection is active
    return Array.from(state.connections.values()).some(conn => conn.status === 'connected');
  }, [state.connections]);

  const getConnectionStatus = useCallback((connectionId: string): WebSocketConnection | undefined => {
    return state.connections.get(connectionId);
  }, [state.connections]);

  const reconnectAll = useCallback(() => {
    state.connections.forEach((connection) => {
      if (connection.status === 'disconnected' || connection.status === 'error') {
        connect(connection.url);
      }
    });
  }, [state.connections, connect]);

  const contextValue: RealTimeUpdateContextType = {
    state,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendMessage,
    getUpdates,
    markUpdateProcessed,
    clearProcessedUpdates,
    addNotification,
    markNotificationRead,
    removeNotification,
    clearNotifications,
    getUnreadNotifications,
    getNotificationsByType,
    isConnected,
    getConnectionStatus,
    reconnectAll,
  };

  return (
    <RealTimeUpdateContext.Provider value={contextValue}>
      {children}
    </RealTimeUpdateContext.Provider>
  );
}

// Hook
export function useRealTimeUpdate() {
  const context = useContext(RealTimeUpdateContext);
  if (context === undefined) {
    throw new Error('useRealTimeUpdate must be used within a RealTimeUpdateProvider');
  }
  return context;
}
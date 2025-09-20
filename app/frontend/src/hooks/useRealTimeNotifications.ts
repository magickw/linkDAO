import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  RealTimeNotification, 
  NotificationCategory, 
  NotificationSettings,
  LiveUpdateIndicator,
  NotificationState
} from '../types/realTimeNotifications';
import realTimeNotificationService from '../services/realTimeNotificationService';

interface UseRealTimeNotificationsOptions {
  userId?: string;
  token?: string;
  autoConnect?: boolean;
  maxNotifications?: number;
}

interface UseRealTimeNotificationsReturn {
  notifications: RealTimeNotification[];
  unreadCount: number;
  liveIndicators: LiveUpdateIndicator[];
  connectionStatus: string;
  settings: NotificationSettings;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: (category?: NotificationCategory) => void;
  dismissNotification: (notificationId: string) => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  requestDesktopPermission: () => Promise<boolean>;
  subscribeToPost: (postId: string) => void;
  unsubscribeFromPost: (postId: string) => void;
  clearNotifications: () => void;
  getNotificationsByCategory: (category: NotificationCategory) => RealTimeNotification[];
}

export const useRealTimeNotifications = (
  options: UseRealTimeNotificationsOptions = {}
): UseRealTimeNotificationsReturn => {
  const {
    userId,
    token,
    autoConnect = true,
    maxNotifications = 100
  } = options;

  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    queue: { online: [], offline: [], failed: [] },
    settings: realTimeNotificationService.getSettings(),
    liveIndicators: [],
    connectionStatus: 'disconnected',
    lastSync: new Date()
  });

  const [isConnected, setIsConnected] = useState(false);
  const mountedRef = useRef(true);

  // Connection management
  const connect = useCallback(async () => {
    if (!userId || !token) {
      console.warn('Cannot connect: userId and token are required');
      return;
    }

    try {
      await realTimeNotificationService.connect(userId, token);
      if (mountedRef.current) {
        setIsConnected(true);
        setState(prev => ({ ...prev, connectionStatus: 'connected' }));
      }
    } catch (error) {
      console.error('Failed to connect to notification service:', error);
      if (mountedRef.current) {
        setIsConnected(false);
        setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
      }
    }
  }, [userId, token]);

  const disconnect = useCallback(() => {
    realTimeNotificationService.disconnect();
    if (mountedRef.current) {
      setIsConnected(false);
      setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
    }
  }, []);

  // Notification management
  const addNotification = useCallback((notification: RealTimeNotification) => {
    if (!mountedRef.current) return;

    setState(prev => {
      const newNotifications = [notification, ...prev.notifications].slice(0, maxNotifications);
      const unreadCount = newNotifications.filter(n => !n.read).length;
      
      return {
        ...prev,
        notifications: newNotifications,
        unreadCount,
        lastSync: new Date()
      };
    });
  }, [maxNotifications]);

  const updateLiveIndicators = useCallback((indicator: LiveUpdateIndicator) => {
    if (!mountedRef.current) return;

    setState(prev => {
      const existingIndex = prev.liveIndicators.findIndex(
        i => i.type === indicator.type && i.contextId === indicator.contextId
      );

      let newIndicators;
      if (existingIndex >= 0) {
        newIndicators = [...prev.liveIndicators];
        newIndicators[existingIndex] = indicator;
      } else {
        newIndicators = [...prev.liveIndicators, indicator];
      }

      return {
        ...prev,
        liveIndicators: newIndicators
      };
    });
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    realTimeNotificationService.markAsRead(notificationId);
    
    if (mountedRef.current) {
      setState(prev => {
        const updatedNotifications = prev.notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        const unreadCount = updatedNotifications.filter(n => !n.read).length;
        
        return {
          ...prev,
          notifications: updatedNotifications,
          unreadCount
        };
      });
    }
  }, []);

  const markAllAsRead = useCallback((category?: NotificationCategory) => {
    realTimeNotificationService.markAllAsRead(category);
    
    if (mountedRef.current) {
      setState(prev => {
        const updatedNotifications = prev.notifications.map(n =>
          !category || n.category === category ? { ...n, read: true } : n
        );
        const unreadCount = updatedNotifications.filter(n => !n.read).length;
        
        return {
          ...prev,
          notifications: updatedNotifications,
          unreadCount
        };
      });
    }
  }, []);

  const dismissNotification = useCallback((notificationId: string) => {
    realTimeNotificationService.dismissNotification(notificationId);
    
    if (mountedRef.current) {
      setState(prev => {
        const updatedNotifications = prev.notifications.filter(n => n.id !== notificationId);
        const unreadCount = updatedNotifications.filter(n => !n.read).length;
        
        return {
          ...prev,
          notifications: updatedNotifications,
          unreadCount
        };
      });
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    realTimeNotificationService.updateSettings(newSettings);
    
    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        settings: { ...prev.settings, ...newSettings }
      }));
    }
  }, []);

  const requestDesktopPermission = useCallback(async () => {
    return await realTimeNotificationService.requestDesktopPermission();
  }, []);

  const subscribeToPost = useCallback((postId: string) => {
    realTimeNotificationService.subscribeToPost(postId);
  }, []);

  const unsubscribeFromPost = useCallback((postId: string) => {
    realTimeNotificationService.unsubscribeFromPost(postId);
  }, []);

  const clearNotifications = useCallback(() => {
    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        notifications: [],
        unreadCount: 0,
        liveIndicators: []
      }));
    }
  }, []);

  const getNotificationsByCategory = useCallback((category: NotificationCategory) => {
    return state.notifications.filter(n => n.category === category);
  }, [state.notifications]);

  // Event listeners setup
  useEffect(() => {
    const handleNotification = (notification: RealTimeNotification) => {
      addNotification(notification);
    };

    const handleLiveUpdate = (indicator: LiveUpdateIndicator) => {
      updateLiveIndicators(indicator);
    };

    const handleConnection = (data: { status: string; attempt?: number; error?: any }) => {
      if (mountedRef.current) {
        const validStatuses = ['connected', 'disconnected', 'reconnecting'];
        const connectionStatus = validStatuses.includes(data.status) 
          ? data.status as 'connected' | 'disconnected' | 'reconnecting'
          : 'disconnected';
        setState(prev => ({ ...prev, connectionStatus }));
        setIsConnected(data.status === 'connected');
      }
    };

    const handleSettingsUpdate = (settings: NotificationSettings) => {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, settings }));
      }
    };

    const handleOfflineSync = (data: { count: number }) => {
      console.log(`Synced ${data.count} offline notifications`);
    };

    // Register event listeners
    realTimeNotificationService.on('notification', handleNotification);
    realTimeNotificationService.on('live_update', handleLiveUpdate);
    realTimeNotificationService.on('connection', handleConnection);
    realTimeNotificationService.on('settings_updated', handleSettingsUpdate);
    realTimeNotificationService.on('offline_sync', handleOfflineSync);

    // Category-specific listeners
    Object.values(NotificationCategory).forEach(category => {
      realTimeNotificationService.on(`notification:${category}`, handleNotification);
    });

    return () => {
      // Cleanup event listeners
      realTimeNotificationService.off('notification', handleNotification);
      realTimeNotificationService.off('live_update', handleLiveUpdate);
      realTimeNotificationService.off('connection', handleConnection);
      realTimeNotificationService.off('settings_updated', handleSettingsUpdate);
      realTimeNotificationService.off('offline_sync', handleOfflineSync);

      Object.values(NotificationCategory).forEach(category => {
        realTimeNotificationService.off(`notification:${category}`, handleNotification);
      });
    };
  }, [addNotification, updateLiveIndicators]);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect && userId && token && !isConnected) {
      connect();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoConnect, userId, token, isConnected, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected, disconnect]);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    liveIndicators: state.liveIndicators,
    connectionStatus: state.connectionStatus,
    settings: state.settings,
    isConnected,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    updateSettings,
    requestDesktopPermission,
    subscribeToPost,
    unsubscribeFromPost,
    clearNotifications,
    getNotificationsByCategory
  };
};
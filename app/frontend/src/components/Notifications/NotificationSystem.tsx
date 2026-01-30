/**
 * NotificationSystem Component
 * Unified notification system with real-time updates across all features
 * Implements requirements 6.1, 6.3, 6.4, 6.5 from the interconnected social platform spec
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationCenter } from './NotificationCenter';
import { NotificationToast } from './NotificationToast';
import { NotificationPreferences } from './NotificationPreferences';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { useAccount } from 'wagmi';
import { notificationService } from '../../services/notificationService';
import { enhancedOfflineSyncService } from '../../services/enhancedOfflineSyncService';
import { AppNotification, NotificationPreferences as NotificationPrefs } from '../../types/notifications';

// Re-export types for backward compatibility
export type { AppNotification as Notification, NotificationPreferences as NotificationPrefs } from '../../types/notifications';

interface NotificationSystemProps {
  className?: string;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ className = '' }) => {
  const { walletInfo } = useWalletAuth();
  const { address } = useAccount();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [toastNotifications, setToastNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingNotifications, setPendingNotifications] = useState(0);

  // Enhanced notification deduplication with configurable throttling
  const notificationDeduperRef = useRef<Map<string, number>>(new Map()); // notificationId -> timestamp
  const aggregationBufferRef = useRef<Map<string, AppNotification[]>>(new Map()); // aggregationKey -> notifications
  const aggregationTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const eventFrequencyTrackerRef = useRef<Map<string, number>>(new Map()); // eventKey -> lastEventTimestamp
  const typingThrottleRef = useRef<Map<string, NodeJS.Timeout>>(new Map()); // conversationId -> throttleTimeout
  
  // Throttling configuration constants
  const THROTTLE_CONFIG = {
    DEFAULT: 5000, // 5 seconds default deduplication window
    TYPING: 2000, // 2 seconds for typing indicators
    HIGH_FREQUENCY: 1000, // 1 second for high-frequency events
    LOW_PRIORITY: 10000, // 10 seconds for low-priority notifications
  };
  
  // Frequency limiting for high-frequency events
  const FREQUENCY_LIMITS = {
    TYPING_EVENTS: 3, // Max 3 typing events per second
    MESSAGE_EVENTS: 10, // Max 10 message events per second
    REACTION_EVENTS: 5, // Max 5 reaction events per second
  };

  // WebSocket connection for real-time notifications
  const { isConnected, on, off } = useWebSocket({
    walletAddress: address || '',
    autoConnect: true
  });

  // Load initial data
  useEffect(() => {
    if (address) {
      loadNotifications();
      loadPreferences();
    }
  }, [address]);

  // Set up network status listener with enhanced offline sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger immediate sync when coming online
      enhancedOfflineSyncService.on('connection:online', () => {
        console.log('[NotificationSystem] Online detected, triggering sync');
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('[NotificationSystem] Offline detected');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial network status
    setIsOnline(navigator.onLine);
    
    // Set up periodic check for pending notifications
    const interval = setInterval(async () => {
      if (typeof localStorage !== 'undefined') {
        const stats = enhancedOfflineSyncService.getQueueStats();
        setPendingNotifications(stats.pending + stats.failed);
      }
    }, 5000);
    
    // Listen to offline sync events
    enhancedOfflineSyncService.on('notification:queued', (notification) => {
      console.log('[NotificationSystem] Notification queued for offline sync:', notification.id);
    });
    
    enhancedOfflineSyncService.on('sync:completed', (data) => {
      console.log('[NotificationSystem] Offline sync completed:', data);
      // Refresh notification counts
      loadNotifications();
    });
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      enhancedOfflineSyncService.off('notification:queued', () => {});
      enhancedOfflineSyncService.off('sync:completed', () => {});
    };
  }, []);

  // Set up real-time notification listeners
  useEffect(() => {
    if (isConnected && address) {
      on('notification:new', handleNewNotification);
      on('notification:read', handleNotificationRead);
      on('notification:bulk_read', handleBulkNotificationRead);

      // Listen for message notifications from messaging system
      on('message_notification', handleMessageNotification);

      // Enhanced typing indicator handling with throttling
      on('user_typing', handleUserTyping);
      on('user_stopped_typing', handleUserStoppedTyping);

      // Listen for custom message_notification events from useChatHistory
      const handleCustomMessageNotification = (event: CustomEvent) => {
        handleMessageNotification(event.detail);
      };
      window.addEventListener('message_notification', handleCustomMessageNotification as EventListener);

      return () => {
        off('notification:new', handleNewNotification);
        off('notification:read', handleNotificationRead);
        off('notification:bulk_read', handleBulkNotificationRead);
        off('message_notification', handleMessageNotification);
        off('user_typing', handleUserTyping);
        off('user_stopped_typing', handleUserStoppedTyping);
        window.removeEventListener('message_notification', handleCustomMessageNotification as EventListener);
      };
    }
  }, [isConnected, address, on, off]);

  // Enhanced typing indicator handlers with throttling
  const handleUserTyping = useCallback((data: any) => {
    // Apply frequency limiting for typing events
    if (!checkEventFrequency('typing', FREQUENCY_LIMITS.TYPING_EVENTS)) {
      return;
    }

    // Throttle typing events to prevent spam
    throttleTypingEvent(data.conversationId, () => {
      // Process typing event after throttle delay
      console.log('[NotificationSystem] Processing typing event:', data);
      // Forward to existing message notification handler or create new notification
      handleMessageNotification({
        ...data,
        type: 'typing_indicator',
        category: 'direct_message',
        title: 'Someone is typing...',
        message: `${data.userAddress} is typing a message`
      });
    });
  }, []);

  const handleUserStoppedTyping = useCallback((data: any) => {
    // Clear typing throttle when user stops typing
    const existingTimeout = typingThrottleRef.current.get(data.conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      typingThrottleRef.current.delete(data.conversationId);
    }
    
    console.log('[NotificationSystem] User stopped typing:', data);
  }, []);

  // Request notification permissions on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications({
        page: 1,
        limit: 50,
        includeRead: true
      });
      
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      // Set default preferences
      setPreferences({
        enablePush: true,
        enableSound: true,
        enableDesktop: true,
        categories: {
          direct_message: { enabled: true, push: true, sound: true },
          post_reaction: { enabled: true, push: false, sound: false },
          comment_mention: { enabled: true, push: true, sound: true },
          community_invite: { enabled: true, push: true, sound: false },
          governance_proposal: { enabled: true, push: true, sound: false },
          system_alert: { enabled: true, push: true, sound: true },
          marketplace: { enabled: true, push: true, sound: false },
        },
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
        },
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  // Enhanced deduplication with configurable throttling
  const shouldProcessNotification = (notification: AppNotification): boolean => {
    const now = Date.now();
    const notificationKey = `${notification.category}_${notification.fromAddress || 'system'}_${notification.title}`;
    
    // Get appropriate throttle time based on notification characteristics
    let throttleTime = THROTTLE_CONFIG.DEFAULT;
    
    if (notification.category === 'direct_message') {
      throttleTime = THROTTLE_CONFIG.HIGH_FREQUENCY;
    } else if (notification.priority === 'low') {
      throttleTime = THROTTLE_CONFIG.LOW_PRIORITY;
    }
    
    const lastSeen = notificationDeduperRef.current.get(notificationKey);
    
    // Allow if no previous occurrence or outside throttle window
    if (!lastSeen || now - lastSeen > throttleTime) {
      notificationDeduperRef.current.set(notificationKey, now);
      return true;
    }
    
    console.log('[NotificationSystem] Throttled duplicate notification:', notificationKey);
    return false;
  };

  // Advanced frequency limiting for high-frequency events
  const checkEventFrequency = (eventType: string, maxPerSecond: number): boolean => {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // Clean up old entries
    eventFrequencyTrackerRef.current.forEach((timestamp, key) => {
      if (timestamp < oneSecondAgo) {
        eventFrequencyTrackerRef.current.delete(key);
      }
    });
    
    // Count events of this type in the last second
    let eventCount = 0;
    eventFrequencyTrackerRef.current.forEach((timestamp, key) => {
      if (key.startsWith(eventType) && timestamp > oneSecondAgo) {
        eventCount++;
      }
    });
    
    // Allow if under limit
    if (eventCount < maxPerSecond) {
      eventFrequencyTrackerRef.current.set(`${eventType}_${now}`, now);
      return true;
    }
    
    console.log(`[NotificationSystem] Frequency limit exceeded for ${eventType}: ${eventCount}/${maxPerSecond}`);
    return false;
  };

  // Enhanced typing indicator throttling
  const throttleTypingEvent = (conversationId: string, callback: () => void): void => {
    // Clear existing throttle timeout
    const existingTimeout = typingThrottleRef.current.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new throttle timeout
    const timeout = setTimeout(() => {
      callback();
      typingThrottleRef.current.delete(conversationId);
    }, THROTTLE_CONFIG.TYPING);
    
    typingThrottleRef.current.set(conversationId, timeout);
  };

  const handleNewNotification = useCallback((notification: AppNotification) => {
    // Enhanced deduplication check
    if (!shouldProcessNotification(notification)) {
      return;
    }
    
    // Clean up old deduplication entries (older than 2 minutes)
    const now = Date.now();
    notificationDeduperRef.current.forEach((timestamp, key) => {
      if (now - timestamp > 120000) {
        notificationDeduperRef.current.delete(key);
      }
    });

    // Check for aggregation opportunity
    const shouldAggregate = notification.category === 'post_reaction' || 
                            notification.category === 'comment_mention';
    
    if (shouldAggregate) {
      const aggregateKey = `${notification.category}_${notification.data?.postId || notification.fromAddress}`;
      
      // Clear previous aggregation timeout
      const existingTimeout = aggregationTimeoutRef.current.get(aggregateKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Add to aggregation buffer
      aggregationBufferRef.current.set(aggregateKey, [
        ...(aggregationBufferRef.current.get(aggregateKey) || []),
        notification
      ]);
      
      // Set new timeout to process aggregated notifications
      const timeout = setTimeout(() => {
        const aggregatedNotifications = aggregationBufferRef.current.get(aggregateKey) || [];
        if (aggregatedNotifications.length > 1) {
          // Create aggregated notification
          const aggregatedNotification: AppNotification = {
            ...notification,
            id: `agg_${aggregateKey}_${Date.now()}`,
            title: `${aggregatedNotifications.length} new ${notification.category.replace('_', ' ')}`,
            message: `You have ${aggregatedNotifications.length} new activities`,
            data: {
              ...notification.data,
              aggregatedCount: aggregatedNotifications.length,
              originalIds: aggregatedNotifications.map(n => n.id)
            },
            aggregated: true
          };
          
          // Add aggregated notification
          setNotifications(prev => [aggregatedNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          if (preferences && shouldShowNotification(aggregatedNotification, preferences)) {
            showToastNotification(aggregatedNotification);
          }
        } else {
          // Single notification, add normally
          addSingleNotification(aggregatedNotifications[0]);
        }
        
        aggregationBufferRef.current.delete(aggregateKey);
        aggregationTimeoutRef.current.delete(aggregateKey);
      }, 3000); // Aggregate notifications within 3 seconds
      
      aggregationTimeoutRef.current.set(aggregateKey, timeout);
    } else {
      // Not aggregatable, add immediately
      addSingleNotification(notification);
    }
  }, [preferences]);

  const addSingleNotification = useCallback((notification: AppNotification) => {
    // Add to notifications list
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Queue for offline sync if not online
    if (!isOnline) {
      enhancedOfflineSyncService.queueNotification(notification);
    }

    // Check if notification should be shown based on preferences
    if (preferences && shouldShowNotification(notification, preferences)) {
      // Show toast notification
      showToastNotification(notification);

      // Show desktop notification if enabled and permitted
      if (preferences.enableDesktop && Notification.permission === 'granted') {
        showDesktopNotification(notification);
      }

      // Play sound if enabled
      if (preferences.enableSound && shouldPlaySound(notification, preferences)) {
        playNotificationSound(notification.priority);
      }
    }
  }, [preferences, isOnline]);

  const handleMessageNotification = useCallback((data: any) => {
    // Convert message notification to AppNotification format
    const notification: AppNotification = {
      id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.type || 'message',
      category: data.category || 'direct_message',
      title: data.title || 'New message',
      message: data.message || '',
      data: data.data || {},
      fromAddress: data.senderAddress || data.fromAddress,
      priority: data.priority || 'medium',
      isRead: false,
      createdAt: new Date(data.timestamp || Date.now())
    };

    // Use the same deduplication and aggregation logic
    handleNewNotification(notification);
  }, [handleNewNotification]);

  const handleNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const handleBulkNotificationRead = useCallback((notificationIds: string[]) => {
    setNotifications(prev => 
      prev.map(n => notificationIds.includes(n.id) ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
  }, []);

  const shouldShowNotification = (notification: AppNotification, prefs: NotificationPrefs): boolean => {
    // Check if category is enabled
    const categoryPrefs = prefs.categories[notification.category];
    if (!categoryPrefs?.enabled) return false;

    // Check quiet hours
    if (prefs.quietHours.enabled && isInQuietHours(prefs.quietHours)) {
      // Only show urgent notifications during quiet hours
      return notification.priority === 'urgent';
    }

    return true;
  };

  const shouldPlaySound = (notification: AppNotification, prefs: NotificationPrefs): boolean => {
    const categoryPrefs = prefs.categories[notification.category];
    return categoryPrefs?.sound || notification.priority === 'urgent';
  };

  const isInQuietHours = (quietHours: NotificationPrefs['quietHours']): boolean => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  };

  const showToastNotification = (notification: AppNotification) => {
    setToastNotifications(prev => [...prev, notification]);
    
    // Auto-remove toast after delay based on priority
    const delay = notification.priority === 'urgent' ? 10000 : 
                  notification.priority === 'high' ? 7000 : 5000;
    
    setTimeout(() => {
      setToastNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, delay);
  };

  const showDesktopNotification = (notification: AppNotification) => {
    try {
      const desktopNotification = new Notification(notification.title, {
        body: notification.message,
        icon: notification.avatarUrl || '/icons/notification-icon.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
      });

      desktopNotification.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        desktopNotification.close();
      };

      // Auto-close after delay
      setTimeout(() => {
        desktopNotification.close();
      }, 8000);
    } catch (error) {
      console.error('Error showing desktop notification:', error);
    }
  };

  const playNotificationSound = (priority: AppNotification['priority']) => {
    try {
      const audio = new Audio();
      
      switch (priority) {
        case 'urgent':
          audio.src = '/sounds/urgent-notification.mp3';
          break;
        case 'high':
          audio.src = '/sounds/high-notification.mp3';
          break;
        default:
          audio.src = '/sounds/default-notification.mp3';
          break;
      }
      
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.error('Error playing notification sound:', error);
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      handleNotificationRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      await notificationService.markAllAsRead();
      handleBulkNotificationRead(unreadIds);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if notification was unread
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const updatePreferences = async (newPreferences: NotificationPrefs) => {
    try {
      await notificationService.updatePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  };

  const dismissToast = (notificationId: string) => {
    setToastNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  if (!address) {
    return null;
  }

  return (
    <div className={`notification-system ${className}`}>
      {/* Notification Bell Icon */}
      <div className="relative">
        <button
          onClick={() => setIsNotificationCenterOpen(true)}
          className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          
          {/* Offline indicator */}
          {!isOnline && (
            <span className="absolute -top-1 -left-1 bg-yellow-500 text-black text-xs rounded-full h-5 w-5 flex items-center justify-center" title="Offline mode">
              ⚠
            </span>
          )}
        </button>
      </div>

      {/* Pending notifications indicator */}
      {pendingNotifications > 0 && (
        <div className="fixed top-20 right-4 bg-blue-500 text-white text-xs rounded-full px-2 py-1 z-50">
          {pendingNotifications} pending notification{pendingNotifications > 1 ? 's' : ''}
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toastNotifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onDismiss={() => dismissToast(notification.id)}
            onAction={() => {
              if (notification.actionUrl) {
                window.location.href = notification.actionUrl;
              }
              dismissToast(notification.id);
            }}
          />
        ))}
      </div>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        loading={loading}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDelete={deleteNotification}
        onOpenPreferences={() => {
          setIsNotificationCenterOpen(false);
          setIsPreferencesOpen(true);
        }}
        isOnline={isOnline}
        pendingNotifications={pendingNotifications}
      />

      {/* Notification Preferences */}
      {preferences && (
        <NotificationPreferences
          isOpen={isPreferencesOpen}
          onClose={() => setIsPreferencesOpen(false)}
          preferences={preferences}
          onUpdate={updatePreferences}
        />
      )}
    </div>
  );
};

export default NotificationSystem;
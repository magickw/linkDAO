/**
 * Social Notification Context
 * Provides global social interaction notification management across the app
 * Handles upvotes, downvotes, reposts, tips, awards, and saves
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  RealTimeNotification,
  NotificationCategory,
  NotificationPriority,
  NotificationUrgency,
  UpvoteNotification,
  DownvoteNotification,
  RepostNotification,
  AwardNotification,
  BookmarkNotification,
  TipNotification,
  ReactionNotification,
  MentionNotification
} from '@/types/realTimeNotifications';
import { realTimeNotificationService } from '@/services/realTimeNotificationService';

// Social notification categories we care about
const SOCIAL_CATEGORIES = [
  NotificationCategory.UPVOTE,
  NotificationCategory.DOWNVOTE,
  NotificationCategory.REPOST,
  NotificationCategory.AWARD,
  NotificationCategory.BOOKMARK,
  NotificationCategory.TIP,
  NotificationCategory.REACTION,
  NotificationCategory.MENTION,
  NotificationCategory.COMMENT
];

export interface SocialNotification {
  id: string;
  type: NotificationCategory;
  title: string;
  message: string;
  postId: string;
  postTitle?: string;
  postPreview?: string;
  fromAddress: string;
  fromName?: string;
  fromAvatar?: string;
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  // Aggregation info
  isAggregated?: boolean;
  aggregatedCount?: number;
  aggregatedUsers?: Array<{ address: string; name: string; avatar?: string }>;
}

interface SocialNotificationContextType {
  notifications: SocialNotification[];
  unreadCount: number;
  isConnected: boolean;
  addNotification: (notification: Omit<SocialNotification, 'id' | 'read' | 'dismissed'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  navigateToPost: (postId: string) => void;
  getNotificationsByType: (type: NotificationCategory) => SocialNotification[];
}

const SocialNotificationContext = createContext<SocialNotificationContextType | undefined>(undefined);

export const SocialNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected: isWalletConnected } = useAccount();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const isConnectingRef = useRef(false);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read && !n.dismissed).length;

  // Convert RealTimeNotification to SocialNotification
  const convertToSocialNotification = useCallback((notification: RealTimeNotification): SocialNotification | null => {
    if (!SOCIAL_CATEGORIES.includes(notification.category)) {
      return null;
    }

    const baseNotification: SocialNotification = {
      id: notification.id,
      type: notification.category,
      title: notification.title,
      message: notification.message,
      postId: '',
      timestamp: new Date(notification.timestamp),
      read: notification.read,
      dismissed: notification.dismissed,
      actionUrl: notification.actionUrl,
      fromAddress: '',
      metadata: notification.metadata
    };

    // Extract type-specific fields
    switch (notification.category) {
      case NotificationCategory.UPVOTE: {
        const meta = (notification as UpvoteNotification).metadata;
        return {
          ...baseNotification,
          postId: meta.postId,
          postTitle: meta.postTitle,
          postPreview: meta.postPreview,
          fromAddress: meta.voterAddress,
          fromName: meta.voterHandle,
          fromAvatar: meta.voterAvatar,
          isAggregated: meta.isAggregated,
          aggregatedCount: meta.aggregatedCount,
          aggregatedUsers: meta.aggregatedUsers?.map(u => ({
            address: u.address,
            name: u.handle,
            avatar: u.avatar
          }))
        };
      }
      case NotificationCategory.DOWNVOTE: {
        const meta = (notification as DownvoteNotification).metadata;
        return {
          ...baseNotification,
          postId: meta.postId,
          postTitle: meta.postTitle,
          postPreview: meta.postPreview,
          fromAddress: meta.voterAddress,
          fromName: meta.voterHandle,
          fromAvatar: meta.voterAvatar
        };
      }
      case NotificationCategory.REPOST: {
        const meta = (notification as RepostNotification).metadata;
        return {
          ...baseNotification,
          postId: meta.originalPostId,
          postTitle: meta.postTitle,
          postPreview: meta.postPreview,
          fromAddress: meta.reposterAddress,
          fromName: meta.reposterHandle,
          fromAvatar: meta.reposterAvatar
        };
      }
      case NotificationCategory.AWARD: {
        const meta = (notification as AwardNotification).metadata;
        return {
          ...baseNotification,
          postId: meta.postId,
          postTitle: meta.postTitle,
          postPreview: meta.postPreview,
          fromAddress: meta.giverAddress,
          fromName: meta.giverHandle,
          fromAvatar: meta.giverAvatar
        };
      }
      case NotificationCategory.BOOKMARK: {
        const meta = (notification as BookmarkNotification).metadata;
        return {
          ...baseNotification,
          postId: meta.postId,
          postTitle: meta.postTitle,
          postPreview: meta.postPreview,
          fromAddress: meta.bookmarkerAddress,
          fromName: meta.bookmarkerHandle,
          fromAvatar: meta.bookmarkerAvatar
        };
      }
      case NotificationCategory.TIP: {
        const meta = (notification as TipNotification).metadata;
        return {
          ...baseNotification,
          postId: meta.postId,
          fromAddress: meta.tipperAddress,
          fromName: meta.tipperHandle,
          fromAvatar: meta.tipperAvatar
        };
      }
      case NotificationCategory.REACTION: {
        const meta = (notification as ReactionNotification).metadata;
        return {
          ...baseNotification,
          postId: meta.postId,
          fromAddress: meta.reactorAddress,
          fromName: meta.reactorHandle,
          fromAvatar: meta.reactorAvatar
        };
      }
      case NotificationCategory.MENTION: {
        const meta = (notification as MentionNotification).metadata;
        return {
          ...baseNotification,
          postId: meta.postId,
          fromAddress: meta.mentionedBy,
          fromName: meta.mentionedByHandle,
          fromAvatar: meta.mentionedByAvatar
        };
      }
      default:
        return baseNotification;
    }
  }, []);

  // Handle incoming notification from service
  const handleNotification = useCallback((notification: RealTimeNotification) => {
    const socialNotification = convertToSocialNotification(notification);
    if (!socialNotification) return;

    // Don't notify for own actions
    if (socialNotification.fromAddress?.toLowerCase() === address?.toLowerCase()) {
      return;
    }

    setNotifications(prev => {
      // Prevent duplicates
      if (prev.some(n => n.id === socialNotification.id)) {
        return prev;
      }
      // Limit to 100 most recent notifications
      const updated = [socialNotification, ...prev].slice(0, 100);
      return updated;
    });

    // Show browser notification if permitted and document is hidden
    if (typeof window !== 'undefined' && document.hidden && Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(socialNotification.title, {
          body: socialNotification.message,
          icon: socialNotification.fromAvatar || '/icons/notification.png',
          tag: `social-${socialNotification.id}`,
        });

        browserNotification.onclick = () => {
          window.focus();
          if (socialNotification.postId) {
            router.push(`/status/${socialNotification.postId}`);
          }
          browserNotification.close();
        };

        setTimeout(() => browserNotification.close(), 5000);
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }, [address, router, convertToSocialNotification]);

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
        console.error('[SocialNotifications] Connection failed:', error);
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
        const stored = localStorage.getItem(`social_notifications_${address}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const notifications = parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }));
          setNotifications(notifications);
        }
      } catch (error) {
        console.error('Error loading stored social notifications:', error);
      }
    }
  }, [address]);

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && address && notifications.length > 0) {
      try {
        localStorage.setItem(`social_notifications_${address}`, JSON.stringify(notifications));
      } catch (error) {
        console.error('Error saving social notifications:', error);
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
  const addNotification = useCallback((notification: Omit<SocialNotification, 'id' | 'read' | 'dismissed'>) => {
    const newNotification: SocialNotification = {
      ...notification,
      id: `social-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      localStorage.removeItem(`social_notifications_${address}`);
    }
  }, [address]);

  // Navigate to post
  const navigateToPost = useCallback((postId: string) => {
    markAsRead(postId);
    router.push(`/status/${postId}`);
  }, [router, markAsRead]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type: NotificationCategory) => {
    return notifications.filter(n => n.type === type && !n.dismissed);
  }, [notifications]);

  const value: SocialNotificationContextType = {
    notifications: notifications.filter(n => !n.dismissed),
    unreadCount,
    isConnected,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearNotifications,
    navigateToPost,
    getNotificationsByType,
  };

  return (
    <SocialNotificationContext.Provider value={value}>
      {children}
    </SocialNotificationContext.Provider>
  );
};

export const useSocialNotifications = (): SocialNotificationContextType => {
  const context = useContext(SocialNotificationContext);
  if (!context) {
    throw new Error('useSocialNotifications must be used within a SocialNotificationProvider');
  }
  return context;
};

export default SocialNotificationContext;

import { useState, useEffect, useCallback } from 'react';
import type { Notification, NotificationPreferences } from '@/types/notifications';
import { notificationService } from '@/services/notificationService';
import { useWeb3 } from '@/context/Web3Context';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address } = useWeb3();

  // Subscribe to notification updates
  useEffect(() => {
    if (!address) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
      setLoading(false);
    });

    return unsubscribe;
  }, [address]);

  // Load initial notifications
  useEffect(() => {
    if (!address) return;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const data = await notificationService.getNotifications();
        setNotifications(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [address]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
    }
  }, []);

  const markCommunityAsRead = useCallback(async (communityId: string) => {
    try {
      await notificationService.markCommunityAsRead(communityId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark community notifications as read');
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const getCommunityUnreadCount = useCallback((communityId: string) => {
    return notifications.filter(n => 
      !n.read && 'communityId' in n && n.communityId === communityId
    ).length;
  }, [notifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    markCommunityAsRead,
    getCommunityUnreadCount
  };
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address } = useWeb3();

  useEffect(() => {
    if (!address) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        setLoading(true);
        const prefs = await notificationService.getPreferences(address);
        setPreferences(prefs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [address]);

  const updatePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
    try {
      await notificationService.updatePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    }
  }, []);

  return {
    preferences,
    loading,
    error,
    updatePreferences
  };
}
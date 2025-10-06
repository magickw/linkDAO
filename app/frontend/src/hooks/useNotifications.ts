import { useState, useEffect, useCallback } from 'react';
import type { AppNotification as Notification, NotificationPreferences } from '@/types/notifications';
import notificationService from '../services/notificationService';
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

    // For messaging notifications, we use event listeners
    // This would be implemented differently in a real app
    setLoading(false);

    return () => {}; // Return cleanup function
  }, [address]);

  // Load initial notifications
  useEffect(() => {
    if (!address) return;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        // For messaging notifications, we would get from messaging service
        // This is a placeholder for the general notification system
        setNotifications([]);
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
      // This would be implemented for the general notification system
      console.log('Mark as read:', notificationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      // This would be implemented for the general notification system
      console.log('Mark all as read');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
    }
  }, []);

  const markCommunityAsRead = useCallback(async (communityId: string) => {
    try {
      // This would be implemented for the general notification system
      console.log('Mark community as read:', communityId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark community notifications as read');
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const getCommunityUnreadCount = useCallback((communityId: string) => {
    return notifications.filter(n => 
      !n.isRead && 'communityId' in n && (n as any).communityId === communityId
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
        // Get messaging notification preferences
        const prefs = await notificationService.getPreferences();
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
      // Update messaging notification preferences
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
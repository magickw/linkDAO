import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supportNotificationService, SupportNotification } from '@/services/supportNotificationService';
import { notificationService } from '@/services/notificationService';
import type { NotificationPreferences } from '@/types/notifications';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SupportNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.address) return;

    supportNotificationService.connect(user.address);

    const unsubscribe = supportNotificationService.subscribe((newNotifications) => {
      setNotifications(newNotifications);
      setUnreadCount(supportNotificationService.getUnreadCount());
    });

    return () => {
      unsubscribe();
      supportNotificationService.disconnect();
    };
  }, [user]);

  const markAsRead = (notificationId: string) => {
    supportNotificationService.markAsRead(notificationId);
  };

  const markAllAsRead = () => {
    supportNotificationService.markAllAsRead();
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};

export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const prefs = await notificationService.getPreferences();
        setPreferences(prefs);
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      await notificationService.updatePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  };

  return {
    preferences,
    loading,
    updatePreferences
  };
};

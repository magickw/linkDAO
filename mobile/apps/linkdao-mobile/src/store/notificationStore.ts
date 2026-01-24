/**
 * Notification Store
 * Manages notification state and preferences
 */

import { create } from 'zustand';
import { notificationService } from '../services/notificationService';

export interface Notification {
    id: string;
    type: 'comment' | 'reaction' | 'tip' | 'mention' | 'community' | 'moderation' | 'order' | 'system';
    title: string;
    body: string;
    data?: Record<string, any>;
    read: boolean;
    createdAt: string;
}

export interface NotificationPreferences {
    comments: boolean;
    reactions: boolean;
    tips: boolean;
    mentions: boolean;
    communityUpdates: boolean;
    moderation: boolean;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    preferences: NotificationPreferences;
    isLoading: boolean;
    error: string | null;

    // Actions
    addNotification: (notification: Notification) => void;
    markAsRead: (id: string) => void;
    markAsReadOnServer: (id: string) => Promise<void>;
    markAllAsRead: () => void;
    markAllAsReadOnServer: () => Promise<void>;
    clearNotification: (id: string) => void;
    clearAll: () => void;
    setPreferences: (preferences: Partial<NotificationPreferences>) => void;
    loadNotifications: (notifications: Notification[]) => void;
    fetchNotifications: (page?: number, limit?: number) => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    fetchPreferences: () => Promise<void>;
    updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    preferences: {
        comments: true,
        reactions: true,
        tips: true,
        mentions: true,
        communityUpdates: true,
        moderation: true,
    },
    isLoading: false,
    error: null,

    addNotification: (notification) =>
        set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        })),

    markAsRead: (id) =>
        set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            const wasUnread = notification && !notification.read;

            return {
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, read: true } : n
                ),
                unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
            };
        }),

    markAsReadOnServer: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const success = await notificationService.markAsRead(id);
            if (success) {
                get().markAsRead(id);
            } else {
                set({ error: 'Failed to mark notification as read' });
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            set({ error: 'Failed to mark notification as read' });
        } finally {
            set({ isLoading: false });
        }
    },

    markAllAsRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
        })),

    markAllAsReadOnServer: async () => {
        set({ isLoading: true, error: null });
        try {
            const success = await notificationService.markAllAsRead();
            if (success) {
                get().markAllAsRead();
            } else {
                set({ error: 'Failed to mark all notifications as read' });
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            set({ error: 'Failed to mark all notifications as read' });
        } finally {
            set({ isLoading: false });
        }
    },

    clearNotification: (id) =>
        set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            const wasUnread = notification && !notification.read;

            return {
                notifications: state.notifications.filter((n) => n.id !== id),
                unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
            };
        }),

    clearAll: () =>
        set({
            notifications: [],
            unreadCount: 0,
        }),

    setPreferences: (preferences) =>
        set((state) => ({
            preferences: { ...state.preferences, ...preferences },
        })),

    loadNotifications: (notifications) =>
        set({
            notifications,
            unreadCount: notifications.filter((n) => !n.read).length,
        }),

    fetchNotifications: async (page = 1, limit = 20) => {
        set({ isLoading: true, error: null });
        try {
            const notifications = await notificationService.getNotifications(page, limit);
            set({
                notifications: page === 1 ? notifications : [...get().notifications, ...notifications],
                isLoading: false,
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            set({ error: 'Failed to fetch notifications', isLoading: false });
        }
    },

    fetchUnreadCount: async () => {
        try {
            const count = await notificationService.getUnreadCount();
            set({ unreadCount: count });
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    },

    fetchPreferences: async () => {
        try {
            const preferences = await notificationService.getPreferences();
            set({ preferences });
        } catch (error) {
            console.error('Error fetching preferences:', error);
        }
    },

    updatePreferences: async (preferences) => {
        set({ isLoading: true, error: null });
        try {
            await notificationService.updatePreferences(preferences);
            get().setPreferences(preferences);
        } catch (error) {
            console.error('Error updating preferences:', error);
            set({ error: 'Failed to update preferences', isLoading: false });
        } finally {
            set({ isLoading: false });
        }
    },
}));

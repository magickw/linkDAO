/**
 * Notification Store
 * Manages notification state and preferences
 */

import { create } from 'zustand';

export interface Notification {
    id: string;
    type: 'comment' | 'reaction' | 'tip' | 'mention' | 'community' | 'moderation';
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

    // Actions
    addNotification: (notification: Notification) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotification: (id: string) => void;
    clearAll: () => void;
    setPreferences: (preferences: Partial<NotificationPreferences>) => void;
    loadNotifications: (notifications: Notification[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
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

    addNotification: (notification) =>
        set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        })),

    markAsRead: (id) =>
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
        })),

    markAllAsRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
        })),

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
}));

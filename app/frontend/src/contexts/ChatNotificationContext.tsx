/**
 * Chat Notification Context (LEGACY)
 * This context is deprecated and should be replaced with the unified notification system
 * Keeping for backward compatibility during migration
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { notificationManager, useNotifications } from '@/services/unifiedNotificationManager';

// Legacy interface for backward compatibility
export interface ChatNotification {
  id: string;
  type: 'new_message' | 'mention' | 'channel_message';
  title: string;
  message: string;
  fromAddress: string;
  fromName?: string;
  conversationId: string;
  timestamp: Date;
  read: boolean;
  avatarUrl?: string;
}

interface ChatNotificationContextType {
  notifications: ChatNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<ChatNotification, 'id' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  navigateToChat: (conversationId: string) => void;
}

const ChatNotificationContext = createContext<ChatNotificationContextType | undefined>(undefined);

export const ChatNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address } = useAccount();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  
  // Use the unified notification system
  const {
    notifications: unifiedNotifications,
    unreadCount: unifiedUnreadCount,
    markAsRead: unifiedMarkAsRead,
    markAllAsRead: unifiedMarkAllAsRead,
    clearAllNotifications: unifiedClearAll,
    addNotification: unifiedAddNotification
  } = useNotifications();

  // Filter to only chat notifications for backward compatibility
  const chatNotifications = unifiedNotifications.filter(n => 
    n.source === 'chat' && 
    (n.type === 'chat_message' || n.type === 'chat_mention' || n.type === 'chat_channel')
  ).map(n => ({
    id: n.id,
    type: n.type as 'new_message' | 'mention' | 'channel_message',
    title: n.title,
    message: n.message,
    fromAddress: (n as any).senderAddress || '',
    fromName: (n as any).senderName,
    conversationId: (n as any).conversationId || '',
    timestamp: n.timestamp,
    read: n.read,
    avatarUrl: (n as any).avatarUrl
  }));

  // Convert unified notifications to legacy format
  const notifications = chatNotifications;
  const unreadCount = unifiedUnreadCount;

  // Legacy methods mapped to unified system
  const addNotification = useCallback((notification: Omit<ChatNotification, 'id' | 'read'>) => {
    // Convert to unified format and add
    unifiedAddNotification({
      type: notification.type === 'new_message' ? 'chat_message' : 
            notification.type === 'mention' ? 'chat_mention' : 'chat_channel',
      title: notification.title,
      message: notification.message,
      priority: 'normal',
      source: 'chat',
      conversationId: notification.conversationId,
      senderAddress: notification.fromAddress,
      senderName: notification.fromName,
      avatarUrl: notification.avatarUrl
    });
  }, [unifiedAddNotification]);

  const markAsRead = useCallback((notificationId: string) => {
    unifiedMarkAsRead(notificationId);
  }, [unifiedMarkAsRead]);

  const markAllAsRead = useCallback(() => {
    unifiedMarkAllAsRead();
  }, [unifiedMarkAllAsRead]);

  const clearNotifications = useCallback(() => {
    unifiedClearAll();
  }, [unifiedClearAll]);

  const navigateToChat = useCallback((conversationId: string) => {
    // Mark all notifications for this conversation as read
    unifiedNotifications
      .filter(n => (n as any).conversationId === conversationId)
      .forEach(n => unifiedMarkAsRead(n.id));
    
    router.push(`/chat/dm/${conversationId}`);
  }, [unifiedNotifications, unifiedMarkAsRead, router]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        notificationManager.requestPermission();
      }
    }
  }, []);

  const value: ChatNotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    navigateToChat,
  };

  return (
    <ChatNotificationContext.Provider value={value}>
      {children}
    </ChatNotificationContext.Provider>
  );
};

export const useChatNotifications = (): ChatNotificationContextType => {
  const context = useContext(ChatNotificationContext);
  if (!context) {
    throw new Error('useChatNotifications must be used within a ChatNotificationProvider');
  }
  return context;
};

export default ChatNotificationContext;

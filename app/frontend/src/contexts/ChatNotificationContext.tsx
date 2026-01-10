/**
 * Chat Notification Context
 * Provides global chat notification management across the app
 * Listens to WebSocket events for new messages and mentions
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';

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

// WebSocket connection states
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export const ChatNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Add a new notification
  const addNotification = useCallback((notification: Omit<ChatNotification, 'id' | 'read'>) => {
    const newNotification: ChatNotification = {
      ...notification,
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
    };

    setNotifications(prev => {
      // Limit to 50 most recent notifications
      const updated = [newNotification, ...prev].slice(0, 50);
      return updated;
    });

    // Show browser notification if permission granted and document is hidden
    if (typeof window !== 'undefined' && document.hidden && Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: notification.avatarUrl || '/icons/message-icon.png',
          tag: `chat-${notification.conversationId}`,
        });

        browserNotification.onclick = () => {
          window.focus();
          router.push(`/chat/dm/${notification.conversationId}`);
          browserNotification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => browserNotification.close(), 5000);
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }

    // Play notification sound if enabled
    try {
      const soundEnabled = localStorage.getItem('notification_sound') !== 'false';
      if (soundEnabled && typeof window !== 'undefined') {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors if audio can't play
      }
    } catch (error) {
      // Ignore audio errors
    }
  }, [router]);

  // Mark a notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Navigate to chat
  const navigateToChat = useCallback((conversationId: string) => {
    // Mark notification as read
    setNotifications(prev =>
      prev.map(n => (n.conversationId === conversationId ? { ...n, read: true } : n))
    );
    router.push(`/chat/dm/${conversationId}`);
  }, [router]);

  // Connect to WebSocket for real-time notifications
  const connectWebSocket = useCallback(() => {
    if (!address || !isAuthenticated) return;

    // Don't reconnect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setConnectionState('connecting');

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ||
                  (typeof window !== 'undefined'
                    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
                    : '');

    if (!wsUrl) {
      console.warn('WebSocket URL not configured for chat notifications');
      return;
    }

    try {
      const ws = new WebSocket(`${wsUrl}?address=${address}&type=notifications`);

      ws.onopen = () => {
        console.log('[ChatNotifications] WebSocket connected');
        setConnectionState('connected');

        // Subscribe to notification events
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'notifications',
          address: address,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types
          if (data.type === 'new_message' && data.message) {
            // Don't notify for own messages
            if (data.message.fromAddress?.toLowerCase() === address?.toLowerCase()) {
              return;
            }

            // Don't notify if user is on the chat page viewing this conversation
            if (router.pathname.startsWith('/chat') &&
                router.query.slug?.[1] === data.message.conversationId) {
              return;
            }

            const truncateAddress = (addr: string) =>
              addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

            addNotification({
              type: 'new_message',
              title: 'New Message',
              message: data.message.content?.substring(0, 100) || 'New message received',
              fromAddress: data.message.fromAddress,
              fromName: data.message.fromName || truncateAddress(data.message.fromAddress),
              conversationId: data.message.conversationId,
              timestamp: new Date(data.message.timestamp || Date.now()),
              avatarUrl: data.message.avatarUrl,
            });
          }

          if (data.type === 'mention') {
            addNotification({
              type: 'mention',
              title: 'You were mentioned',
              message: data.content?.substring(0, 100) || 'Someone mentioned you in a conversation',
              fromAddress: data.fromAddress,
              fromName: data.fromName,
              conversationId: data.conversationId,
              timestamp: new Date(data.timestamp || Date.now()),
              avatarUrl: data.avatarUrl,
            });
          }

          if (data.type === 'channel_message') {
            addNotification({
              type: 'channel_message',
              title: `New message in #${data.channelName || 'channel'}`,
              message: data.content?.substring(0, 100) || 'New channel message',
              fromAddress: data.fromAddress,
              fromName: data.fromName,
              conversationId: data.channelId,
              timestamp: new Date(data.timestamp || Date.now()),
              avatarUrl: data.avatarUrl,
            });
          }
        } catch (error) {
          console.error('[ChatNotifications] Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('[ChatNotifications] WebSocket closed:', event.code, event.reason);
        setConnectionState('disconnected');
        wsRef.current = null;

        // Attempt to reconnect after a delay (with exponential backoff)
        if (isConnected && isAuthenticated) {
          const delay = Math.min(30000, 1000 * Math.pow(2, Math.random() * 3));
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionState('reconnecting');
            connectWebSocket();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[ChatNotifications] WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[ChatNotifications] Failed to create WebSocket:', error);
      setConnectionState('disconnected');
    }
  }, [address, isAuthenticated, isConnected, addNotification, router]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('disconnected');
  }, []);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (isConnected && isAuthenticated && address) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isConnected, isAuthenticated, address, connectWebSocket, disconnectWebSocket]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && address) {
      try {
        const stored = localStorage.getItem(`chat_notifications_${address}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert timestamp strings back to Date objects
          const notifications = parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }));
          setNotifications(notifications);
        }
      } catch (error) {
        console.error('Error loading stored chat notifications:', error);
      }
    }
  }, [address]);

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && address && notifications.length > 0) {
      try {
        localStorage.setItem(`chat_notifications_${address}`, JSON.stringify(notifications));
      } catch (error) {
        console.error('Error saving chat notifications:', error);
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

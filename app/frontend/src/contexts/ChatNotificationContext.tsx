/**
 * Chat Notification Context
 * Provides global chat notification management across the app
 * Listens to WebSocket events for new messages and mentions
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { io, Socket } from 'socket.io-client';
import { ENV_CONFIG } from '@/config/environment';

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
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

// Reconnection configuration
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const CONNECTION_LOCK_TIMEOUT = 5000; // Prevent rapid reconnections

export const ChatNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const connectionStateRef = useRef<ConnectionState>('disconnected');
  const connectionLockRef = useRef<boolean>(false);
  const lastConnectionAttemptRef = useRef<number>(0);
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

  // Helper to update connection state consistently
  const updateConnectionState = useCallback((state: ConnectionState) => {
    connectionStateRef.current = state;
    setConnectionState(state);
  }, []);

  // Connect to WebSocket for real-time notifications
  const connectWebSocket = useCallback(() => {
    if (!address || !isAuthenticated) return;

    // Prevent rapid reconnection attempts using a lock and time check
    const now = Date.now();
    if (connectionLockRef.current) {
      return; // Another connection attempt is in progress
    }

    // Enforce minimum time between connection attempts
    if (now - lastConnectionAttemptRef.current < CONNECTION_LOCK_TIMEOUT) {
      return;
    }

    // Don't reconnect if already connected or connecting
    if (socketRef.current?.connected) {
      return;
    }

    // Check if we've exceeded max reconnection attempts
    if (connectionStateRef.current === 'failed') {
      return; // Already gave up, don't retry
    }

    // Acquire connection lock
    connectionLockRef.current = true;
    lastConnectionAttemptRef.current = now;
    updateConnectionState('connecting');

    try {
      const socket = io(ENV_CONFIG.WS_URL, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        auth: {
          address,
          type: 'notifications'
        },
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: INITIAL_RECONNECT_DELAY,
        reconnectionDelayMax: MAX_RECONNECT_DELAY,
        timeout: 30000
      });

      socket.on('connect', () => {
        console.log('[ChatNotifications] Socket.IO connected:', socket.id);
        updateConnectionState('connected');
        reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
        connectionLockRef.current = false;

        // Subscribe to notification events
        socket.emit('subscribe', {
          channel: 'notifications',
          address: address,
        });
      });

      socket.on('connect_error', (error) => {
        console.error('[ChatNotifications] Socket.IO connection error:', error.message);
        connectionLockRef.current = false;
        
        reconnectAttemptsRef.current++;
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          updateConnectionState('failed');
        } else {
          updateConnectionState('reconnecting');
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('[ChatNotifications] Socket.IO disconnected:', reason);
        updateConnectionState('disconnected');
        connectionLockRef.current = false;
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('[ChatNotifications] Socket.IO reconnected after', attemptNumber, 'attempts');
        updateConnectionState('connected');
        reconnectAttemptsRef.current = 0;
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('[ChatNotifications] Socket.IO reconnect attempt:', attemptNumber);
        updateConnectionState('reconnecting');
      });

      socket.on('reconnect_failed', () => {
        console.error('[ChatNotifications] Socket.IO reconnection failed');
        updateConnectionState('failed');
        connectionLockRef.current = false;
      });

      // Listen for chat notifications
      socket.on('new_message', (data) => {
        addNotification({
          type: 'new_message',
          title: 'New Message',
          message: data.content || 'You have a new message',
          fromAddress: data.fromAddress,
          fromName: data.fromName,
          conversationId: data.conversationId,
          timestamp: new Date(data.timestamp),
          avatarUrl: data.avatarUrl
        });
      });

      socket.on('mention', (data) => {
        addNotification({
          type: 'mention',
          title: 'Mention',
          message: data.content || 'You were mentioned',
          fromAddress: data.fromAddress,
          fromName: data.fromName,
          conversationId: data.conversationId,
          timestamp: new Date(data.timestamp),
          avatarUrl: data.avatarUrl
        });
      });

      socket.on('channel_message', (data) => {
        addNotification({
          type: 'channel_message',
          title: 'Channel Message',
          message: data.content || 'New message in channel',
          fromAddress: data.fromAddress,
          fromName: data.fromName,
          conversationId: data.conversationId,
          timestamp: new Date(data.timestamp),
          avatarUrl: data.avatarUrl
        });
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('[ChatNotifications] Failed to create Socket.IO connection:', error);
      updateConnectionState('disconnected');
      connectionLockRef.current = false;
    }
  }, [address, isAuthenticated, updateConnectionState, addNotification, router]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    reconnectAttemptsRef.current = 0; // Reset attempts on manual disconnect
    connectionLockRef.current = false; // Release lock
    updateConnectionState('disconnected');
  }, [updateConnectionState]);

  // Connect/disconnect based on auth state - only run once per auth state change
  useEffect(() => {
    let mounted = true;

    if (isConnected && isAuthenticated && address) {
      // Small delay to prevent race conditions during initial load
      const connectTimeout = setTimeout(() => {
        if (mounted) {
          connectWebSocket();
        }
      }, 100);

      return () => {
        mounted = false;
        clearTimeout(connectTimeout);
        disconnectWebSocket();
      };
    } else {
      disconnectWebSocket();
    }

    return () => {
      mounted = false;
    };
    // Note: connectWebSocket and disconnectWebSocket are stable refs, no need to include them
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isAuthenticated, address]);

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

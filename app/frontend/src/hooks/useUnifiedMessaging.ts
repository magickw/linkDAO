/**
 * useUnifiedMessaging Hook
 *
 * React hook for the unified messaging service.
 * Integrates with WebSocket context and provides reactive state.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  unifiedMessagingService,
  MessagingEvent,
  MessagingEventPayload
} from '@/services/unifiedMessagingService';
import { Message, Conversation, TypingIndicator } from '@/types/messaging';

interface UseUnifiedMessagingOptions {
  /** User's wallet address */
  walletAddress?: string;
  /** Auto-initialize on mount */
  autoInitialize?: boolean;
  /** WebSocket connection object */
  webSocket?: {
    on: (event: string, callback: Function) => void;
    off: (event: string, callback: Function) => void;
    send: (event: string, data: any) => void;
    isConnected: boolean;
  } | null;
}

interface UseUnifiedMessagingReturn {
  // State
  conversations: Conversation[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  connectionMode: 'websocket' | 'polling' | 'offline';
  pendingMessagesCount: number;

  // Conversation methods
  getConversations: (options?: { limit?: number; offset?: number; forceRefresh?: boolean }) => Promise<Conversation[]>;
  getConversation: (conversationId: string) => Promise<Conversation | null>;
  getOrCreateDMConversation: (participantAddress: string) => Promise<Conversation>;
  createGroupConversation: (params: {
    name: string;
    participants: string[];
    description?: string;
    isPublic?: boolean;
  }) => Promise<Conversation>;

  // Message methods
  getMessages: (conversationId: string, options?: {
    limit?: number;
    before?: string;
    after?: string;
    forceRefresh?: boolean;
  }) => Promise<{ messages: Message[]; hasMore: boolean; nextCursor?: string }>;
  sendMessage: (params: {
    conversationId: string;
    content: string;
    contentType?: Message['contentType'];
    attachments?: any[];
    replyToId?: string;
  }) => Promise<Message>;
  deleteMessage: (messageId: string, conversationId: string) => Promise<void>;
  editMessage: (messageId: string, conversationId: string, newContent: string) => Promise<Message>;

  // Read receipts
  markAsRead: (conversationId: string, messageIds?: string[]) => Promise<void>;

  // Typing indicators
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  getTypingUsers: (conversationId: string) => string[];

  // Presence
  isUserOnline: (userAddress: string) => boolean;
  getOnlineUsers: () => string[];

  // Reactions
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;

  // Sync
  forceSync: () => Promise<void>;
  retryPendingMessages: () => Promise<void>;

  // Event subscription
  on: <T extends MessagingEvent>(event: T, callback: (payload: MessagingEventPayload[T]) => void) => () => void;
  off: <T extends MessagingEvent>(event: T, callback: Function) => void;
}

export function useUnifiedMessaging(options: UseUnifiedMessagingOptions = {}): UseUnifiedMessagingReturn {
  const { walletAddress, autoInitialize = true, webSocket } = options;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<'websocket' | 'polling' | 'offline'>('offline');
  const [pendingMessagesCount, setPendingMessagesCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Track typing users per conversation
  const [typingUsersMap, setTypingUsersMap] = useState<Map<string, Set<string>>>(new Map());

  // Keep refs to avoid stale closures in event handlers
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  // Initialize the service
  useEffect(() => {
    if (!walletAddress || !autoInitialize) return;

    let mounted = true;

    const initialize = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const normalizedAddress = walletAddress.toLowerCase();
        await unifiedMessagingService.initialize(normalizedAddress);

        if (!mounted) return;

        setIsInitialized(true);

        // Load initial conversations
        const convs = await unifiedMessagingService.getConversations();
        if (mounted) {
          setConversations(convs);
        }
      } catch (err) {
        console.error('[useUnifiedMessaging] Initialization error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize messaging');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [walletAddress, autoInitialize]);

  // Set up WebSocket connection
  useEffect(() => {
    if (webSocket) {
      unifiedMessagingService.setWebSocketConnection(webSocket);
      setConnectionMode(webSocket.isConnected ? 'websocket' : 'offline');
    }
  }, [webSocket]);

  // Subscribe to messaging events
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribers: (() => void)[] = [];

    // Connection change
    unsubscribers.push(
      unifiedMessagingService.on('connection_change', ({ isConnected, mode }) => {
        setConnectionMode(mode);
      })
    );

    // New message received
    unsubscribers.push(
      unifiedMessagingService.on('message_received', ({ message, conversationId }) => {
        // Update conversation's last message in state
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId
              ? { ...conv, lastMessage: message, lastActivity: message.timestamp }
              : conv
          ).sort((a, b) =>
            new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
          )
        );
      })
    );

    // Message sent (including temp → real ID)
    unsubscribers.push(
      unifiedMessagingService.on('message_sent', ({ message, conversationId }) => {
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId
              ? { ...conv, lastMessage: message, lastActivity: message.timestamp }
              : conv
          ).sort((a, b) =>
            new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
          )
        );
        setPendingMessagesCount(unifiedMessagingService.getPendingMessagesCount());
      })
    );

    // Conversation created
    unsubscribers.push(
      unifiedMessagingService.on('conversation_created', ({ conversation }) => {
        setConversations(prev => [conversation, ...prev]);
      })
    );

    // Conversation updated
    unsubscribers.push(
      unifiedMessagingService.on('conversation_updated', ({ conversation }) => {
        setConversations(prev =>
          prev.map(conv => (conv.id === conversation.id ? conversation : conv))
        );
      })
    );

    // Typing indicators
    unsubscribers.push(
      unifiedMessagingService.on('typing_start', ({ conversationId, userAddress }) => {
        setTypingUsersMap(prev => {
          const newMap = new Map(prev);
          if (!newMap.has(conversationId)) {
            newMap.set(conversationId, new Set());
          }
          newMap.get(conversationId)!.add(userAddress);
          return newMap;
        });
      })
    );

    unsubscribers.push(
      unifiedMessagingService.on('typing_stop', ({ conversationId, userAddress }) => {
        setTypingUsersMap(prev => {
          const newMap = new Map(prev);
          newMap.get(conversationId)?.delete(userAddress);
          return newMap;
        });
      })
    );

    // Read receipts
    unsubscribers.push(
      unifiedMessagingService.on('read_receipt', ({ conversationId, userAddress }) => {
        // Update conversation to reflect that messages were read
        setConversations(prev =>
          prev.map(conv => {
            if (conv.id === conversationId) {
              // Mark conversation as read by this user
              return {
                ...conv,
                readBy: [...(conv.readBy || []), userAddress].filter(
                  (addr, idx, arr) => arr.indexOf(addr) === idx // dedupe
                )
              };
            }
            return conv;
          })
        );
      })
    );

    // Sync complete
    unsubscribers.push(
      unifiedMessagingService.on('sync_complete', async () => {
        const convs = await unifiedMessagingService.getConversations();
        setConversations(convs);
      })
    );

    // Presence updates
    unsubscribers.push(
      unifiedMessagingService.on('presence_update', ({ userAddress, isOnline }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (isOnline) {
            newSet.add(userAddress.toLowerCase());
          } else {
            newSet.delete(userAddress.toLowerCase());
          }
          return newSet;
        });
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [isInitialized]);

  // Wrapped methods that update local state
  const getConversations = useCallback(async (options?: {
    limit?: number;
    offset?: number;
    forceRefresh?: boolean;
  }) => {
    setIsLoading(true);
    try {
      const convs = await unifiedMessagingService.getConversations(options);
      setConversations(convs);
      return convs;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getConversation = useCallback(async (conversationId: string) => {
    return unifiedMessagingService.getConversation(conversationId);
  }, []);

  const getOrCreateDMConversation = useCallback(async (participantAddress: string) => {
    const conversation = await unifiedMessagingService.getOrCreateDMConversation(participantAddress);
    // The event listener will update the state
    return conversation;
  }, []);

  const createGroupConversation = useCallback(async (params: {
    name: string;
    participants: string[];
    description?: string;
    isPublic?: boolean;
  }) => {
    return unifiedMessagingService.createGroupConversation(params);
  }, []);

  const getMessages = useCallback(async (conversationId: string, options?: {
    limit?: number;
    before?: string;
    after?: string;
    forceRefresh?: boolean;
  }) => {
    return unifiedMessagingService.getMessages(conversationId, options);
  }, []);

  const sendMessage = useCallback(async (params: {
    conversationId: string;
    content: string;
    contentType?: Message['contentType'];
    attachments?: any[];
    replyToId?: string;
  }) => {
    const message = await unifiedMessagingService.sendMessage(params);
    setPendingMessagesCount(unifiedMessagingService.getPendingMessagesCount());
    return message;
  }, []);

  const deleteMessage = useCallback(async (messageId: string, conversationId: string) => {
    return unifiedMessagingService.deleteMessage(messageId, conversationId);
  }, []);

  const editMessage = useCallback(async (messageId: string, conversationId: string, newContent: string) => {
    return unifiedMessagingService.editMessage(messageId, conversationId, newContent);
  }, []);

  const markAsRead = useCallback(async (conversationId: string, messageIds?: string[]) => {
    await unifiedMessagingService.markAsRead(conversationId, messageIds);
    // Update local unread count
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === conversationId && walletAddress) {
          return {
            ...conv,
            unreadCounts: { ...conv.unreadCounts, [walletAddress]: 0 }
          };
        }
        return conv;
      })
    );
  }, [walletAddress]);

  const startTyping = useCallback((conversationId: string) => {
    unifiedMessagingService.startTyping(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    unifiedMessagingService.stopTyping(conversationId);
  }, []);

  const getTypingUsers = useCallback((conversationId: string) => {
    return Array.from(typingUsersMap.get(conversationId) || []);
  }, [typingUsersMap]);

  const isUserOnline = useCallback((userAddress: string) => {
    return onlineUsers.has(userAddress.toLowerCase());
  }, [onlineUsers]);

  const getOnlineUsers = useCallback(() => {
    return Array.from(onlineUsers);
  }, [onlineUsers]);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    return unifiedMessagingService.addReaction(messageId, emoji);
  }, []);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    return unifiedMessagingService.removeReaction(messageId, emoji);
  }, []);

  const forceSync = useCallback(async () => {
    setIsLoading(true);
    try {
      await unifiedMessagingService.forceSync();
      const convs = await unifiedMessagingService.getConversations();
      setConversations(convs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retryPendingMessages = useCallback(async () => {
    await unifiedMessagingService.retryPendingMessages();
    setPendingMessagesCount(unifiedMessagingService.getPendingMessagesCount());
  }, []);

  const on = useCallback(<T extends MessagingEvent>(
    event: T,
    callback: (payload: MessagingEventPayload[T]) => void
  ) => {
    return unifiedMessagingService.on(event, callback);
  }, []);

  const off = useCallback(<T extends MessagingEvent>(event: T, callback: Function) => {
    unifiedMessagingService.off(event, callback);
  }, []);

  return {
    // State
    conversations,
    isLoading,
    isInitialized,
    error,
    connectionMode,
    pendingMessagesCount,

    // Conversation methods
    getConversations,
    getConversation,
    getOrCreateDMConversation,
    createGroupConversation,

    // Message methods
    getMessages,
    sendMessage,
    deleteMessage,
    editMessage,

    // Read receipts
    markAsRead,

    // Typing indicators
    startTyping,
    stopTyping,
    getTypingUsers,

    // Presence
    isUserOnline,
    getOnlineUsers,

    // Reactions
    addReaction,
    removeReaction,

    // Sync
    forceSync,
    retryPendingMessages,

    // Event subscription
    on,
    off
  };
}

/**
 * Hook for a single conversation's messages
 */
export function useConversationMessages(conversationId: string | null, options?: {
  walletAddress?: string;
  pageSize?: number;
  autoLoad?: boolean;
}) {
  const { walletAddress, pageSize = 50, autoLoad = true } = options || {};

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Load initial messages
  useEffect(() => {
    if (!conversationId || !autoLoad) {
      setMessages([]);
      return;
    }

    let mounted = true;

    const loadMessages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await unifiedMessagingService.getMessages(conversationId, {
          limit: pageSize
        });

        if (!mounted) return;

        setMessages(result.messages);
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
      } catch (err) {
        console.error('[useConversationMessages] Load error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load messages');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadMessages();

    return () => {
      mounted = false;
    };
  }, [conversationId, pageSize, autoLoad]);

  // Subscribe to message events
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribers: (() => void)[] = [];

    // New message
    unsubscribers.push(
      unifiedMessagingService.on('message_received', ({ message, conversationId: msgConvId }) => {
        if (msgConvId === conversationId) {
          setMessages(prev => {
            // Check for duplicate
            if (prev.some(m => m.id === message.id)) return prev;
            return [message, ...prev];
          });
        }
      })
    );

    // Message sent (handles temp → real ID replacement)
    unsubscribers.push(
      unifiedMessagingService.on('message_sent', ({ message, conversationId: msgConvId, tempId }) => {
        if (msgConvId === conversationId) {
          setMessages(prev => {
            // Replace temp message with real one
            if (tempId) {
              const index = prev.findIndex(m => m.id === tempId);
              if (index !== -1) {
                const newMessages = [...prev];
                newMessages[index] = message;
                return newMessages;
              }
            }
            // Or add if not found (shouldn't happen normally)
            if (!prev.some(m => m.id === message.id)) {
              return [message, ...prev];
            }
            return prev;
          });
        }
      })
    );

    // Message deleted
    unsubscribers.push(
      unifiedMessagingService.on('message_deleted', ({ messageId, conversationId: msgConvId }) => {
        if (msgConvId === conversationId) {
          setMessages(prev => prev.filter(m => m.id !== messageId));
        }
      })
    );

    // Message edited
    unsubscribers.push(
      unifiedMessagingService.on('message_edited', ({ message, conversationId: msgConvId }) => {
        if (msgConvId === conversationId) {
          setMessages(prev =>
            prev.map(m => (m.id === message.id ? message : m))
          );
        }
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [conversationId]);

  // Load more messages
  const loadMore = useCallback(async () => {
    if (!conversationId || isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      const oldestMessage = messages[messages.length - 1];
      const result = await unifiedMessagingService.getMessages(conversationId, {
        limit: pageSize,
        before: oldestMessage?.id
      });

      setMessages(prev => [...prev, ...result.messages]);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (err) {
      console.error('[useConversationMessages] Load more error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, hasMore, messages, pageSize]);

  // Refresh messages
  const refresh = useCallback(async () => {
    if (!conversationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await unifiedMessagingService.getMessages(conversationId, {
        limit: pageSize,
        forceRefresh: true
      });

      setMessages(result.messages);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (err) {
      console.error('[useConversationMessages] Refresh error:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh messages');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, pageSize]);

  return {
    messages,
    isLoading,
    hasMore,
    error,
    loadMore,
    refresh
  };
}

/**
 * Hook for typing indicator with debounce
 */
export function useTypingIndicator(conversationId: string | null) {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const handleTyping = useCallback(() => {
    if (!conversationId) return;

    // Start typing if not already
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      unifiedMessagingService.startTyping(conversationId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (conversationId && isTypingRef.current) {
        isTypingRef.current = false;
        unifiedMessagingService.stopTyping(conversationId);
      }
    }, 2000);
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (!conversationId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      unifiedMessagingService.stopTyping(conversationId);
    }
  }, [conversationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  return {
    handleTyping,
    stopTyping
  };
}

export default useUnifiedMessaging;

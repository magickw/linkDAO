import { useState, useEffect, useCallback, useMemo } from 'react';
import { Message as ChatMessage, Conversation, ChatHistoryRequest, MessageReaction } from '@/types/messaging';
import { chatHistoryService } from '@/services/chatHistoryService';
import { OfflineManager } from '@/services/OfflineManager';
import { useAuth } from '@/context/AuthContext';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

interface UseChatHistoryReturn {
  messages: ChatMessage[];
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  hasMoreConversations: boolean;
  conversationsLoading: boolean;
  loadMessages: (request: ChatHistoryRequest) => Promise<void>;
  loadConversations: (append?: boolean) => Promise<void>;
  loadMoreConversations: () => Promise<void>;
  sendMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markAsRead: (conversationId: string, messageIds: string[]) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
}

export const useChatHistory = (): UseChatHistoryReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isOnline, setIsOnline] = useState(true);
  const [messageReactions, setMessageReactions] = useState<Map<string, MessageReaction[]>>(new Map());
  const offlineManager = OfflineManager.getInstance();
  const conversationLimit = 20;

  // React Query for conversations
  const {
    data: conversationsData,
    fetchNextPage,
    hasNextPage,
    isLoading: isConversationsLoading,
    isFetchingNextPage,
    refetch: refetchConversations
  } = useInfiniteQuery({
    queryKey: ['conversations', user?.address],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user?.address) return { conversations: [], hasMore: false };
      return chatHistoryService.getConversations({
        limit: conversationLimit,
        offset: pageParam as number
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If the service explicitly says hasMore, calculate next offset
      if (lastPage.hasMore) {
        // Simple offset calculation: current total fetched so far
        return allPages.reduce((acc, page) => acc + page.conversations.length, 0);
      }
      return undefined;
    },
    enabled: !!user?.address,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 1000 * 60 * 5, // Keep unused data for 5 minutes (renamed from cacheTime in v5)
  });

  // Flatten conversations from pages
  const conversations = useMemo(() => {
    return conversationsData?.pages.flatMap(page => page.conversations) || [];
  }, [conversationsData]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      offlineManager.syncQueuedActions();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineManager]);

  // Backward compatibility wrapper for loadConversations
  const loadConversations = useCallback(async (append = false) => {
    if (append) {
      await fetchNextPage();
    } else {
      await refetchConversations();
    }
  }, [fetchNextPage, refetchConversations]);

  const loadMoreConversations = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage) return;
    await fetchNextPage();
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const loadMessages = useCallback(async (request: ChatHistoryRequest) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentConversationId(request.conversationId);

      const response = await chatHistoryService.getChatHistory(request);
      setMessages(response.messages);
      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!currentConversationId || !hasMore || !nextCursor || loading) return;

    try {
      setLoading(true);
      const response = await chatHistoryService.getChatHistory({
        conversationId: currentConversationId,
        offset: nextCursor ? parseInt(nextCursor) : 0,
        limit: 50
      });

      setMessages(prev => [...prev, ...response.messages]);
      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    } finally {
      setLoading(false);
    }
  }, [currentConversationId, hasMore, nextCursor, loading]);

  const sendMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void> = useCallback(async (message) => {
    try {
      const newMessage = await chatHistoryService.sendMessage(message);

      // Add to local state immediately for better UX
      setMessages(prev => [newMessage, ...prev]);

      // Update/Invalidate conversations query to reflect new lastMessage
      // Optimistic update involves messing with query cache complexly, 
      // simple invalidation is safer for now but might cause refetch
      // Instead, let's manually update the cache data for immediate feedback
      queryClient.setQueryData(['conversations', user?.address], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            conversations: page.conversations.map((conv: Conversation) =>
              conv.id === message.conversationId
                ? { ...conv, lastMessage: newMessage, lastActivity: newMessage.timestamp }
                : conv
            )
          }))
        };
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  }, [queryClient, user]);

  const markAsRead = useCallback(async (conversationId: string, messageIds: string[]) => {
    if (!user?.address) return;

    try {
      if (isOnline) {
        await chatHistoryService.markMessagesAsRead(conversationId, messageIds);
      } else {
        offlineManager.queueAction('MARK_MESSAGES_READ', { conversationId, messageIds }, { priority: 'medium' });
      }

      // Update cache locally
      queryClient.setQueryData(['conversations', user?.address], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            conversations: page.conversations.map((conv: Conversation) => {
              if (conv.id === conversationId) {
                const currentCount = conv.unreadCounts[user.address] || 0;
                return {
                  ...conv,
                  unreadCounts: {
                    ...conv.unreadCounts,
                    [user.address]: Math.max(0, currentCount - messageIds.length)
                  }
                };
              }
              return conv;
            })
          }))
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark messages as read');
    }
  }, [user, isOnline, offlineManager, queryClient]);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.address) return;

    try {
      if (isOnline) {
        await chatHistoryService.addReaction(messageId, emoji);
      } else {
        offlineManager.queueAction('ADD_REACTION', { messageId, emoji }, { priority: 'low' });
      }

      setMessageReactions(prev => {
        const reactions = prev.get(messageId) || [];
        const newReaction: MessageReaction = {
          id: `${messageId}_${emoji}_${Date.now()}`,
          messageId,
          fromAddress: user.address,
          emoji,
          timestamp: new Date()
        };
        return new Map(prev).set(messageId, [...reactions, newReaction]);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reaction');
    }
  }, [user, isOnline, offlineManager]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.address) return;

    try {
      if (isOnline) {
        await chatHistoryService.removeReaction(messageId, emoji);
      } else {
        offlineManager.queueAction('REMOVE_REACTION', { messageId, emoji }, { priority: 'low' });
      }

      setMessageReactions(prev => {
        const reactions = prev.get(messageId) || [];
        const filtered = reactions.filter(r => !(r.emoji === emoji && r.fromAddress === user.address));
        return new Map(prev).set(messageId, filtered);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove reaction');
    }
  }, [user, isOnline, offlineManager]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      if (isOnline) {
        await chatHistoryService.deleteMessage(messageId);
      } else {
        offlineManager.queueAction('DELETE_MESSAGE', { messageId }, { priority: 'medium' });
      }

      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content: '[Message deleted]' }
          : msg
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message');
    }
  }, [isOnline, offlineManager]);

  return {
    messages,
    conversations,
    loading,
    conversationsLoading: isConversationsLoading,
    error,
    hasMore,
    hasMoreConversations: !!hasNextPage,
    loadMessages,
    loadConversations,
    loadMoreConversations,
    sendMessage,
    loadMoreMessages,
    markAsRead,
    addReaction,
    removeReaction,
    deleteMessage
  };
};
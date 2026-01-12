import { useState, useEffect, useCallback, useMemo } from 'react';
import { Message as ChatMessage, Conversation, ChatHistoryRequest, MessageReaction } from '@/types/messaging';
import { unifiedMessagingService } from '@/services/unifiedMessagingService'; // Use the new unified service
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
  deleteMessage: (messageId: string, conversationId: string) => Promise<void>;
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
      // Use the new unified service
      const conversations = await unifiedMessagingService.getConversations({
        limit: conversationLimit,
        offset: pageParam as number
      });
      return { conversations, hasMore: conversations.length === conversationLimit };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore) {
        return allPages.reduce((acc, page) => acc + page.conversations.length, 0);
      }
      return undefined;
    },
    enabled: !!user?.address,
    staleTime: 30000,
    gcTime: 1000 * 60 * 5,
  });

  const conversations = useMemo(() => {
    return conversationsData?.pages.flatMap(page => page.conversations) || [];
  }, [conversationsData]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

      // Use the new unified service
      const response = await unifiedMessagingService.getMessages(request.conversationId, { limit: request.limit, before: request.before });
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
      // Use the new unified service
      const response = await unifiedMessagingService.getMessages(currentConversationId, {
        before: nextCursor,
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
      // Use the new unified service
      const newMessage = await unifiedMessagingService.sendMessage(message);

      setMessages(prev => [newMessage, ...prev]);

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
      // Use the new unified service
      await unifiedMessagingService.markAsRead(conversationId, messageIds);

      queryClient.setQueryData(['conversations', user?.address], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            conversations: page.conversations.map((conv: Conversation) => {
              if (conv.id === conversationId) {
                const currentCount = (conv.unreadCounts && conv.unreadCounts[user.address]) || 0;
                return {
                  ...conv,
                  unreadCounts: {
                    ...conv.unreadCounts,
                    [user.address]: 0 // Mark all as read
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
  }, [user, queryClient]);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.address) return;
    try {
      await unifiedMessagingService.addReaction(messageId, emoji);
      // Real-time updates should handle the UI change via WebSocket listener
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reaction');
    }
  }, [user]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.address) return;
    try {
      await unifiedMessagingService.removeReaction(messageId, emoji);
      // Real-time updates should handle the UI change via WebSocket listener
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove reaction');
    }
  }, [user]);

  const deleteMessage = useCallback(async (messageId: string, conversationId: string) => {
    try {
      await unifiedMessagingService.deleteMessage(messageId, conversationId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message');
    }
  }, []);

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
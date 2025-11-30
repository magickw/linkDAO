import { useState, useEffect, useCallback } from 'react';
import { Message as ChatMessage, Conversation, ChatHistoryRequest, MessageReaction } from '@/types/messaging';
import { chatHistoryService } from '@/services/chatHistoryService';
import { OfflineManager } from '@/services/OfflineManager';
import { useAuth } from '@/context/AuthContext';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [conversationOffset, setConversationOffset] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [messageReactions, setMessageReactions] = useState<Map<string, MessageReaction[]>>(new Map());
  const offlineManager = OfflineManager.getInstance();
  const conversationLimit = 20;

  useEffect(() => {
    // Only load conversations if user is authenticated
    if (user) {
      loadConversations();
    }
    
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
  }, [user]);

  const loadConversations = useCallback(async (append = false) => {
    // Don't attempt to load conversations if user is not authenticated
    if (!user) {
      setConversations([]);
      setHasMoreConversations(false);
      return;
    }

    try {
      setConversationsLoading(true);
      setError(null);

      const offset = append ? conversationOffset : 0;
      const result = await chatHistoryService.getConversations({
        limit: conversationLimit,
        offset
      });

      setConversations(prev => append ? [...prev, ...result.conversations] : result.conversations);
      setHasMoreConversations(result.hasMore);

      if (append) {
        setConversationOffset(prev => prev + conversationLimit);
      } else {
        setConversationOffset(conversationLimit);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setConversationsLoading(false);
    }
  }, [conversationOffset, conversationLimit, user]);

  const loadMoreConversations = useCallback(async () => {
    if (conversationsLoading || !hasMoreConversations) return;
    await loadConversations(true);
  }, [conversationsLoading, hasMoreConversations, loadConversations]);

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
      
      // Update conversation's last message
      setConversations(prev => prev.map(conv => 
        conv.id === message.conversationId 
          ? { ...conv, lastMessage: newMessage, lastActivity: newMessage.timestamp }
          : conv
      ));
      
      // Note: We don't return the message here to match the interface
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  }, []);

  const markAsRead = useCallback(async (conversationId: string, messageIds: string[]) => {
    if (!user?.address) return;
    
    try {
      if (isOnline) {
        await chatHistoryService.markMessagesAsRead(conversationId, messageIds);
      } else {
        offlineManager.queueAction('MARK_MESSAGES_READ', { conversationId, messageIds }, { priority: 'medium' });
      }
      
      setConversations(prev => prev.map(conv => {
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
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark messages as read');
    }
  }, [user, isOnline, offlineManager]);

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
    conversationsLoading,
    error,
    hasMore,
    hasMoreConversations,
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
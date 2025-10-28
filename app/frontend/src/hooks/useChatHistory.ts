import { useState, useEffect, useCallback } from 'react';
import { Message as ChatMessage, Conversation, ChatHistoryRequest } from '@/types/messaging';
import { chatHistoryService } from '@/services/chatHistoryService';
import { OfflineManager } from '@/services/OfflineManager';

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
  const offlineManager = OfflineManager.getInstance();
  const conversationLimit = 20; // Load 20 conversations at a time

  // Load initial conversations on mount (only first page)
  useEffect(() => {
    loadConversations();
    
    // Set up network status listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial network status
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadConversations = useCallback(async (append = false) => {
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
  }, [conversationOffset, conversationLimit]);

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
    try {
      await chatHistoryService.markMessagesAsRead(conversationId, messageIds);
      
      // Update conversation unread count locally
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId) {
          const currentUserAddress = ''; // This should be passed from the component or context
          const currentCount = conv.unreadCounts[currentUserAddress] || 0;
          return {
            ...conv,
            unreadCounts: {
              ...conv.unreadCounts,
              [currentUserAddress]: Math.max(0, currentCount - messageIds.length)
            }
          };
        }
        return conv;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark messages as read');
    }
  }, []);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await chatHistoryService.addReaction(messageId, emoji);
      
      // Note: Message interface doesn't support reactions directly
      // This would need to be handled by a separate reactions state or service
      console.log(`Added reaction ${emoji} to message ${messageId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reaction');
    }
  }, []);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await chatHistoryService.removeReaction(messageId, emoji);
      
      // Note: Message interface doesn't support reactions directly
      // This would need to be handled by a separate reactions state or service
      console.log(`Removed reaction ${emoji} from message ${messageId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove reaction');
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await chatHistoryService.deleteMessage(messageId);
      
      // Mark message as deleted locally
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: '[Message deleted]' }
          : msg
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message');
    }
  }, []);

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
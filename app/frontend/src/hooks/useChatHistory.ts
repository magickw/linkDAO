import { useState, useEffect, useCallback } from 'react';
import { Message as ChatMessage, Conversation, ChatHistoryRequest } from '@/types/messaging';
import { chatHistoryService } from '@/services/chatHistoryService';

interface UseChatHistoryReturn {
  messages: ChatMessage[];
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMessages: (request: ChatHistoryRequest) => Promise<void>;
  loadConversations: () => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatHistoryService.getConversations();
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const sendMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    try {
      const newMessage = await chatHistoryService.sendMessage(message);
      setMessages(prev => [newMessage, ...prev]);
      
      // Update conversation's last message
      setConversations(prev => prev.map(conv => 
        conv.id === message.conversationId 
          ? { ...conv, lastMessage: newMessage, lastActivity: newMessage.timestamp }
          : conv
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  }, []);

  const markAsRead = useCallback(async (conversationId: string, messageIds: string[]) => {
    try {
      await chatHistoryService.markMessagesAsRead(conversationId, messageIds);
      
      // Update conversation unread count
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
    error,
    hasMore,
    loadMessages,
    loadConversations,
    sendMessage,
    loadMoreMessages,
    markAsRead,
    addReaction,
    removeReaction,
    deleteMessage
  };
};
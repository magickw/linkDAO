/**
 * Messaging Service
 * API service for messaging and conversations
 */

import { apiClient } from '@linkdao/shared';
import { Message, Conversation } from '../store';

export interface CreateMessageData {
  conversationId: string;
  content: string;
  contentType?: 'text' | 'image' | 'file';
}

export interface CreateConversationData {
  participantAddress: string;
  name?: string;
  isGroup?: boolean;
}

class MessagingService {
  /**
   * Get all conversations
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get<{ conversations: Conversation[] }>('/api/messaging/conversations');

    if (response.success && response.data) {
      return response.data.conversations;
    }

    return [];
  }

  /**
   * Get conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    const response = await apiClient.get<Conversation>(`/api/messaging/conversations/${id}`);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    const response = await apiClient.get<{ messages: Message[] }>(
      `/api/messaging/conversations/${conversationId}/messages?limit=${limit}`
    );

    if (response.success && response.data) {
      return response.data.messages;
    }

    return [];
  }

  /**
   * Send a message
   */
  async sendMessage(data: CreateMessageData): Promise<Message | null> {
    const response = await apiClient.post<Message>(
      `/api/messaging/conversations/${data.conversationId}/messages`,
      {
        content: data.content,
        contentType: data.contentType || 'text',
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: CreateConversationData): Promise<Conversation | null> {
    const response = await apiClient.post<Conversation>('/api/messaging/conversations', data);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string): Promise<boolean> {
    const response = await apiClient.put(`/api/messaging/conversations/${conversationId}/read`);
    return response.success;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const response = await apiClient.delete(`/api/messaging/messages/${messageId}`);
    return response.success;
  }

  /**
   * Search conversations
   */
  async searchConversations(query: string): Promise<Conversation[]> {
    const response = await apiClient.get<{ conversations: Conversation[] }>(
      `/api/messaging/conversations/search?q=${encodeURIComponent(query)}`
    );

    if (response.success && response.data) {
      return response.data.conversations;
    }

    return [];
  }
}

export const messagingService = new MessagingService();
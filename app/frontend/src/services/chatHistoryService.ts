import { ChatMessage, Conversation, ChatHistoryRequest, ChatHistoryResponse } from '@/types/messaging';

class ChatHistoryService {
  private baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  // Get chat history for a conversation
  async getChatHistory(request: ChatHistoryRequest): Promise<ChatHistoryResponse> {
    const params = new URLSearchParams({
      limit: (request.limit || 50).toString(),
      ...(request.before && { before: request.before }),
      ...(request.after && { after: request.after })
    });

    const response = await fetch(
      `${this.baseUrl}/api/chat/history/${request.conversationId}?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch chat history: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      messages: data.messages.map(this.transformMessage),
      hasMore: data.hasMore,
      nextCursor: data.nextCursor,
      prevCursor: data.prevCursor
    };
  }

  // Send a new message
  async sendMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    const response = await fetch(`${this.baseUrl}/api/chat/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformMessage(data);
  }

  // Get user conversations
  async getConversations(): Promise<Conversation[]> {
    const response = await fetch(`${this.baseUrl}/api/chat/conversations`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map(this.transformConversation);
  }

  // Create or get DM conversation
  async getOrCreateDMConversation(participantAddress: string): Promise<Conversation> {
    const response = await fetch(`${this.baseUrl}/api/chat/conversations/dm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ participantAddress })
    });

    if (!response.ok) {
      throw new Error(`Failed to create DM conversation: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformConversation(data);
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, messageIds: string[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat/messages/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ conversationId, messageIds })
    });

    if (!response.ok) {
      throw new Error(`Failed to mark messages as read: ${response.statusText}`);
    }
  }

  // Add reaction to message
  async addReaction(messageId: string, emoji: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emoji })
    });

    if (!response.ok) {
      throw new Error(`Failed to add reaction: ${response.statusText}`);
    }
  }

  // Remove reaction from message
  async removeReaction(messageId: string, emoji: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat/messages/${messageId}/reactions`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emoji })
    });

    if (!response.ok) {
      throw new Error(`Failed to remove reaction: ${response.statusText}`);
    }
  }

  // Delete message
  async deleteMessage(messageId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete message: ${response.statusText}`);
    }
  }

  // Private helper methods
  private getAuthToken(): string {
    // Get JWT token from localStorage or context
    return localStorage.getItem('linkdao-auth-token') || '';
  }

  private transformMessage(data: any): ChatMessage {
    return {
      ...data,
      timestamp: new Date(data.timestamp),
      editedAt: data.editedAt ? new Date(data.editedAt) : undefined,
      deletedAt: data.deletedAt ? new Date(data.deletedAt) : undefined
    };
  }

  private transformConversation(data: any): Conversation {
    return {
      ...data,
      lastActivity: new Date(data.lastActivity),
      createdAt: new Date(data.createdAt),
      lastMessage: data.lastMessage ? this.transformMessage(data.lastMessage) : undefined
    };
  }
}

export const chatHistoryService = new ChatHistoryService();
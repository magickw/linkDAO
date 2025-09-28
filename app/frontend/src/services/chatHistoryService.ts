import { ChatMessage, Conversation, ChatHistoryRequest, ChatHistoryResponse } from '@/types/messaging';

class ChatHistoryService {
  private baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  // List of candidate endpoints to try when an endpoint returns 404.
  // This helps when backend route names differ between deployments.
  private conversationEndpointCandidates = [
    '/api/chat/conversations',
    '/api/conversations',
    '/api/messages/conversations',
    '/api/messaging/conversations'
  ];

  private conversationEndpointCacheKey = 'linkdao-conversations-endpoint';

  // Get chat history for a conversation
  async getChatHistory(request: ChatHistoryRequest): Promise<ChatHistoryResponse> {
    const params = new URLSearchParams({
      limit: (request.limit || 50).toString(),
      ...(request.before && { before: request.before }),
      ...(request.after && { after: request.after })
    });

    const url = `${this.baseUrl}/api/chat/history/${request.conversationId}?${params}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // For non-OK responses provide a detailed error including URL and status
      const text = await response.text().catch(() => '');
      throw new Error(`Failed to fetch chat history (${response.status} ${response.statusText}) from ${url} - ${text}`);
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
      const text = await response.text().catch(() => '');
      throw new Error(`Failed to send message (${response.status} ${response.statusText}) - ${text}`);
    }

    const data = await response.json();
    return this.transformMessage(data);
  }

  // Get user conversations
  async getConversations(): Promise<Conversation[]> {
    // Check cache first to avoid hammering the backend with repeated 404s
    try {
      const cached = localStorage.getItem(this.conversationEndpointCacheKey);
      if (cached) {
        if (cached === 'none') {
          console.debug('[chatHistoryService] Conversations endpoint cached as none; skipping checks');
          return [];
        }
        const cachedUrl = `${this.baseUrl}${cached}`;
        try {
          const response = await fetch(cachedUrl, {
            headers: {
              'Authorization': `Bearer ${this.getAuthToken()}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            console.debug('[chatHistoryService] Using cached conversations endpoint:', cachedUrl);
            const data = await response.json();
            return Array.isArray(data) ? data.map(this.transformConversation) : [];
          }
        } catch (err) {
          console.warn('[chatHistoryService] Cached conversations endpoint failed, will try candidates', err);
        }
      }
    } catch (err) {
      // If localStorage access fails (e.g., SSR or restrictive env), fall through to candidate checks
      console.warn('[chatHistoryService] localStorage unavailable for conversation endpoint cache', err);
    }

    // Try a list of candidate endpoints in case the deployed backend uses a different route
    for (const path of this.conversationEndpointCandidates) {
      const url = `${this.baseUrl}${path}`;
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 404) {
          // Try next candidate
          console.warn(`Conversations endpoint not found at ${url} (404), trying next candidate`);
          continue;
        }

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`Failed to fetch conversations (${response.status} ${response.statusText}) from ${url} - ${text}`);
        }

        const data = await response.json();
        // Inform which endpoint succeeded to make debugging easier in production console
        console.debug('[chatHistoryService] Conversations endpoint succeeded at:', url);

        // Cache the successful path (relative path) so subsequent loads don't attempt all candidates
        try {
          const relative = path;
          localStorage.setItem(this.conversationEndpointCacheKey, relative);
        } catch (err) {
          /* ignore localStorage write errors */
        }

        return Array.isArray(data) ? data.map(this.transformConversation) : [];
      } catch (err) {
        // If it's the last candidate rethrow; otherwise continue
        if (path === this.conversationEndpointCandidates[this.conversationEndpointCandidates.length - 1]) {
          throw err;
        }
        // transient/network errors - log and continue to next candidate
        console.warn(`Error fetching conversations from ${url}:`, err);
      }
    }

    // None of the candidate endpoints returned OK; cache 'none' to avoid repeated attempts
    try {
      localStorage.setItem(this.conversationEndpointCacheKey, 'none');
    } catch (err) {
      /* ignore */
    }

    return [];
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
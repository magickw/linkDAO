import { Message as ChatMessage, Conversation, ChatHistoryRequest, ChatHistoryResponse } from '@/types/messaging';
import { OfflineManager } from './OfflineManager';

class ChatHistoryService {
  private baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
  private offlineManager = OfflineManager.getInstance();

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

    const url = `${this.baseUrl}/chat/history/${request.conversationId}?${params}`;
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

  // Send a new message with offline support
  async sendMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/messages`, {
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
    } catch (error) {
      // If we're offline or the request fails, queue the message for later
      // Check if we're in a browser environment before accessing navigator
      const isBrowser = typeof window !== 'undefined';
      const isOnline = isBrowser ? navigator.onLine : true;
      
      if (!isOnline || (error as any).message.includes('Failed to fetch')) {
        // Queue the message using OfflineManager
        const actionId = this.offlineManager.queueAction('SEND_MESSAGE', message, {
          priority: 'high',
          maxRetries: 5
        });
        
        // Return a temporary message object for UI purposes
        return {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversationId: message.conversationId,
          fromAddress: message.fromAddress,
          content: message.content,
          contentType: message.contentType,
          timestamp: new Date(),
          deliveryStatus: 'sent', // Changed from 'pending' to match the type
          ...(message.replyToId && { replyToId: message.replyToId }),
          ...(message.attachments && { attachments: message.attachments })
        } as unknown as ChatMessage; // Cast to unknown first to bypass type checking
      }
      
      throw error;
    }
  }

  // Get user conversations with pagination support
  async getConversations(options?: {
    limit?: number;
    offset?: number;
    cursor?: string;
  }): Promise<{
    conversations: Conversation[];
    hasMore: boolean;
    nextCursor?: string;
    total?: number;
  }> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const cursor = options?.cursor;

    // Build query parameters for pagination
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(cursor && { cursor })
    });

    // Check cache first to avoid hammering the backend with repeated 404s
    let cachedPath: string | null = null;
    try {
      const cached = localStorage.getItem(this.conversationEndpointCacheKey);
      if (cached) {
        if (cached === 'none') {
          console.debug('[chatHistoryService] Conversations endpoint cached as none; skipping checks');
          return { conversations: [], hasMore: false };
        }
        cachedPath = cached;
        const cachedUrl = `${this.baseUrl}${cached}?${params}`;
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

            // Handle both paginated and non-paginated responses
            if (Array.isArray(data)) {
              return {
                conversations: data.map(this.transformConversation),
                hasMore: false,
                total: data.length
              };
            } else {
              return {
                conversations: (data.conversations || data.data || []).map(this.transformConversation),
                hasMore: data.hasMore || false,
                nextCursor: data.nextCursor,
                total: data.total
              };
            }
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
      const url = `${this.baseUrl}${path}?${params}`;
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

        // Handle both paginated and non-paginated responses
        if (Array.isArray(data)) {
          return {
            conversations: data.map(this.transformConversation),
            hasMore: false,
            total: data.length
          };
        } else {
          return {
            conversations: (data.conversations || data.data || []).map(this.transformConversation),
            hasMore: data.hasMore || false,
            nextCursor: data.nextCursor,
            total: data.total
          };
        }
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

    return { conversations: [], hasMore: false };
  }

  // Create or get DM conversation
  async getOrCreateDMConversation(participantAddress: string): Promise<Conversation> {
    const response = await fetch(`${this.baseUrl}/chat/conversations/dm`, {
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

  // Mark messages as read with offline support
  async markMessagesAsRead(conversationId: string, messageIds: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/messages/read`, {
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
    } catch (error) {
      // If we're offline, queue the action
      // Check if we're in a browser environment before accessing navigator
      const isBrowser = typeof window !== 'undefined';
      const isOnline = isBrowser ? navigator.onLine : true;
      
      if (!isOnline || (error as any).message.includes('Failed to fetch')) {
        this.offlineManager.queueAction('MARK_MESSAGES_READ', { conversationId, messageIds }, {
          priority: 'medium',
          maxRetries: 3
        });
        return; // Don't throw error for offline scenario
      }
      
      throw error;
    }
  }

  // Add reaction to message with offline support
  async addReaction(messageId: string, emoji: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/messages/${messageId}/reactions`, {
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
    } catch (error) {
      // If we're offline, queue the action
      // Check if we're in a browser environment before accessing navigator
      const isBrowser = typeof window !== 'undefined';
      const isOnline = isBrowser ? navigator.onLine : true;
      
      if (!isOnline || (error as any).message.includes('Failed to fetch')) {
        this.offlineManager.queueAction('ADD_REACTION', { messageId, emoji }, {
          priority: 'low',
          maxRetries: 3
        });
        return; // Don't throw error for offline scenario
      }
      
      throw error;
    }
  }

  // Remove reaction from message with offline support
  async removeReaction(messageId: string, emoji: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/messages/${messageId}/reactions`, {
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
    } catch (error) {
      // If we're offline, queue the action
      // Check if we're in a browser environment before accessing navigator
      const isBrowser = typeof window !== 'undefined';
      const isOnline = isBrowser ? navigator.onLine : true;
      
      if (!isOnline || (error as any).message.includes('Failed to fetch')) {
        this.offlineManager.queueAction('REMOVE_REACTION', { messageId, emoji }, {
          priority: 'low',
          maxRetries: 3
        });
        return; // Don't throw error for offline scenario
      }
      
      throw error;
    }
  }

  // Delete message with offline support
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete message: ${response.statusText}`);
      }
    } catch (error) {
      // If we're offline, queue the action
      // Check if we're in a browser environment before accessing navigator
      const isBrowser = typeof window !== 'undefined';
      const isOnline = isBrowser ? navigator.onLine : true;
      
      if (!isOnline || (error as any).message.includes('Failed to fetch')) {
        this.offlineManager.queueAction('DELETE_MESSAGE', { messageId }, {
          priority: 'medium',
          maxRetries: 3
        });
        return; // Don't throw error for offline scenario
      }
      
      throw error;
    }
  }

  // Private helper methods
  private getAuthToken(): string {
    // Add SSR safety check for localStorage access
    if (typeof window === 'undefined') {
      return '';
    }
    
    // Get JWT token from localStorage using the correct key from AuthContext
    return localStorage.getItem('linkdao_access_token') || 
           localStorage.getItem('token') || 
           localStorage.getItem('authToken') || 
           localStorage.getItem('auth_token') || '';
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
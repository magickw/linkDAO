/**
 * Unified Messaging Service
 *
 * This service consolidates all messaging functionality with a clear data flow:
 * - Backend API is the SOURCE OF TRUTH
 * - IndexedDB is used ONLY as a cache layer
 * - WebSocket provides real-time updates
 *
 * This replaces the fragmented approach of:
 * - messagingService.ts (used IndexedDB as source of truth - THE BUG)
 * - conversationService.ts
 * - chatHistoryService.ts
 * - conversationManagementService.ts
 */

import {
  Message,
  Conversation,
  MessageAttachment,
  TypingIndicator,
  ConversationSettings,
  MessageReaction
} from '@/types/messaging';
import { OfflineManager } from './OfflineManager';
import { enhancedAuthService } from './enhancedAuthService';

// Event types for real-time updates
export type MessagingEvent =
  | 'message_received'
  | 'message_sent'
  | 'message_deleted'
  | 'message_edited'
  | 'conversation_created'
  | 'conversation_updated'
  | 'typing_start'
  | 'typing_stop'
  | 'read_receipt'
  | 'presence_update'
  | 'reaction_added'
  | 'reaction_removed'
  | 'sync_complete'
  | 'connection_change';

export interface MessagingEventPayload {
  message_received: { message: Message; conversationId: string };
  message_sent: { message: Message; conversationId: string; tempId?: string };
  message_deleted: { messageId: string; conversationId: string };
  message_edited: { message: Message; conversationId: string };
  conversation_created: { conversation: Conversation };
  conversation_updated: { conversation: Conversation };
  typing_start: { conversationId: string; userAddress: string };
  typing_stop: { conversationId: string; userAddress: string };
  read_receipt: { conversationId: string; messageId: string; userAddress: string };
  presence_update: { userAddress: string; isOnline: boolean; lastSeen?: Date };
  reaction_added: { messageId: string; reaction: MessageReaction };
  reaction_removed: { messageId: string; reactionId: string };
  sync_complete: { conversationsCount: number; messagesCount: number };
  connection_change: { isConnected: boolean; mode: 'websocket' | 'polling' | 'offline' };
}

// Cache configuration
const CACHE_CONFIG = {
  DB_NAME: 'linkdao_messaging_cache',
  DB_VERSION: 2,
  CONVERSATIONS_STORE: 'conversations',
  MESSAGES_STORE: 'messages',
  SETTINGS_STORE: 'settings',
  SYNC_STORE: 'sync_status',
  MAX_CACHED_MESSAGES_PER_CONVERSATION: 100,
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  STALE_WHILE_REVALIDATE_MS: 30 * 1000, // 30 seconds
};

// Sync status for a conversation
interface ConversationSyncStatus {
  conversationId: string;
  lastSyncTimestamp: Date;
  lastMessageId?: string;
  pendingCount: number;
}

// Pending message for offline queue
interface PendingMessage {
  tempId: string;
  conversationId: string;
  content: string;
  contentType: Message['contentType'];
  attachments?: MessageAttachment[];
  replyToId?: string;
  createdAt: Date;
  retryCount: number;
}

class UnifiedMessagingService {
  private static instance: UnifiedMessagingService;
  private baseUrl: string;
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private currentUserAddress: string | null = null;
  private offlineManager = OfflineManager.getInstance();

  // In-memory caches for fast access
  private conversationsCache: Map<string, Conversation> = new Map();
  private messagesCache: Map<string, Message[]> = new Map();
  private typingIndicators: Map<string, Set<string>> = new Map();
  private onlineUsers: Set<string> = new Set();
  private pendingMessages: Map<string, PendingMessage> = new Map();

  // Event listeners
  private eventListeners: Map<MessagingEvent, Set<Function>> = new Map();

  // WebSocket reference
  private wsConnection: {
    on: (event: string, callback: Function) => void;
    off: (event: string, callback: Function) => void;
    send: (event: string, data: any) => void;
    isConnected: boolean;
  } | null = null;

  // Sync state
  private syncInProgress = false;
  private lastFullSync: Date | null = null;

  private constructor() {
    // Determine the correct base URL
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

    // If running on linkdao.io, use api.linkdao.io
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'www.linkdao.io' || hostname === 'linkdao.io' || hostname === 'app.linkdao.io') {
        backendUrl = 'https://api.linkdao.io';
      }
    }

    this.baseUrl = backendUrl;

    // Log the base URL for debugging
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('[UnifiedMessaging] Initialized with baseUrl:', this.baseUrl);
    }

    // Set up online/offline listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  static getInstance(): UnifiedMessagingService {
    if (!UnifiedMessagingService.instance) {
      UnifiedMessagingService.instance = new UnifiedMessagingService();
    }
    return UnifiedMessagingService.instance;
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize the messaging service with user context
   */
  async initialize(userAddress: string): Promise<void> {
    const normalizedAddress = userAddress.toLowerCase();
    
    if (this.isInitialized && this.currentUserAddress === normalizedAddress) {
      return;
    }

    this.currentUserAddress = normalizedAddress;

    try {
      // Initialize IndexedDB cache
      await this.initializeCache();

      // Load cached data into memory
      await this.loadCachedData();

      // Perform initial sync from backend
      await this.syncFromBackend();

      this.isInitialized = true;
      console.log('[UnifiedMessaging] Initialized for user:', normalizedAddress);
    } catch (error) {
      console.error('[UnifiedMessaging] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Set WebSocket connection for real-time updates
   */
  setWebSocketConnection(ws: typeof this.wsConnection): void {
    this.wsConnection = ws;

    if (ws) {
      // Subscribe to messaging events
      ws.on('new_message', this.handleWebSocketMessage.bind(this));
      ws.on('message_deleted', this.handleWebSocketMessageDeleted.bind(this));
      ws.on('message_edited', this.handleWebSocketMessageEdited.bind(this));
      ws.on('user_typing', this.handleWebSocketTyping.bind(this));
      ws.on('user_stopped_typing', this.handleWebSocketStopTyping.bind(this));
      ws.on('message_read', this.handleWebSocketReadReceipt.bind(this));
      ws.on('user_status_update', this.handleWebSocketPresence.bind(this));
      ws.on('reaction_update', this.handleWebSocketReaction.bind(this));

      this.emitEvent('connection_change', {
        isConnected: ws.isConnected,
        mode: ws.isConnected ? 'websocket' : 'offline'
      });
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Unsubscribe from WebSocket events
    if (this.wsConnection) {
      this.wsConnection.off('new_message', this.handleWebSocketMessage.bind(this));
      this.wsConnection.off('message_deleted', this.handleWebSocketMessageDeleted.bind(this));
      this.wsConnection.off('message_edited', this.handleWebSocketMessageEdited.bind(this));
      this.wsConnection.off('user_typing', this.handleWebSocketTyping.bind(this));
      this.wsConnection.off('user_stopped_typing', this.handleWebSocketStopTyping.bind(this));
      this.wsConnection.off('message_read', this.handleWebSocketReadReceipt.bind(this));
      this.wsConnection.off('user_status_update', this.handleWebSocketPresence.bind(this));
      this.wsConnection.off('reaction_update', this.handleWebSocketReaction.bind(this));
    }

    // Clear caches
    this.conversationsCache.clear();
    this.messagesCache.clear();
    this.typingIndicators.clear();
    this.onlineUsers.clear();
    this.pendingMessages.clear();

    // Close IndexedDB
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.isInitialized = false;
    this.currentUserAddress = null;
  }

  // ==================== CONVERSATIONS ====================

  /**
   * Get all conversations for the current user
   * Always fetches from backend, falls back to cache if offline
   */
  async getConversations(options?: {
    limit?: number;
    offset?: number;
    forceRefresh?: boolean;
  }): Promise<Conversation[]> {
    const { limit = 50, offset = 0, forceRefresh = false } = options || {};

    // Check if we can use cache
    const cacheValid = !forceRefresh && this.isCacheValid();

    if (cacheValid && this.conversationsCache.size > 0) {
      // Return cached data immediately, but revalidate in background
      const cached = Array.from(this.conversationsCache.values())
        .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
        .slice(offset, offset + limit);

      // Stale-while-revalidate pattern
      this.syncConversationsInBackground();

      return cached;
    }

    try {
      // Fetch from backend
      const conversations = await this.fetchConversationsFromBackend(limit, offset);

      // Update cache
      conversations.forEach(conv => {
        this.conversationsCache.set(conv.id, conv);
      });
      await this.persistConversationsToCache();

      return conversations;
    } catch (error) {
      console.error('[UnifiedMessaging] Error fetching conversations:', error);

      // Fall back to cache if backend is unavailable
      if (this.conversationsCache.size > 0) {
        console.warn('[UnifiedMessaging] Using cached conversations due to backend error');
        return Array.from(this.conversationsCache.values())
          .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
          .slice(offset, offset + limit);
      }

      throw error;
    }
  }

  /**
   * Get a single conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    // Check cache first
    const cached = this.conversationsCache.get(conversationId);
    if (cached) {
      // Revalidate in background
      this.syncConversationInBackground(conversationId);
      return cached;
    }

    try {
      const response = await this.makeRequest(`/api/chat/conversations/${conversationId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch conversation: ${response.statusText}`);
      }

      const responseData = await response.json();
      const payload = responseData.data || responseData;
      const transformed = this.transformConversation(payload);

      // Update cache
      this.conversationsCache.set(conversationId, transformed);
      await this.persistConversationsToCache();

      return transformed;
    } catch (error) {
      console.error('[UnifiedMessaging] Error fetching conversation:', error);
      return cached || null;
    }
  }

  /**
   * Create or get existing DM conversation
   */
  async getOrCreateDMConversation(participantAddress: string): Promise<Conversation> {
    try {
      const response = await this.makeRequest('/api/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({ participantAddress })
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.statusText}`);
      }

      const data = await response.json();
      const conversation = this.transformConversation(data);

      // Update cache
      this.conversationsCache.set(conversation.id, conversation);
      await this.persistConversationsToCache();

      // Emit event
      this.emitEvent('conversation_created', { conversation });

      return conversation;
    } catch (error) {
      console.error('[UnifiedMessaging] Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Create a group conversation
   */
  async createGroupConversation(params: {
    name: string;
    participants: string[];
    description?: string;
    isPublic?: boolean;
  }): Promise<Conversation> {
    try {
      const response = await this.makeRequest('/api/messaging/groups', {
        method: 'POST',
        body: JSON.stringify({
          ...params,
          type: 'group'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create group: ${response.statusText}`);
      }

      const data = await response.json();
      const conversation = this.transformConversation(data);

      // Update cache
      this.conversationsCache.set(conversation.id, conversation);
      await this.persistConversationsToCache();

      // Emit event
      this.emitEvent('conversation_created', { conversation });

      return conversation;
    } catch (error) {
      console.error('[UnifiedMessaging] Error creating group:', error);
      throw error;
    }
  }

  // ==================== MESSAGES ====================

  /**
   * Get messages for a conversation
   * Always fetches from backend, with cache fallback
   */
  async getMessages(conversationId: string, options?: {
    limit?: number;
    before?: string;
    after?: string;
    forceRefresh?: boolean;
  }): Promise<{ messages: Message[]; hasMore: boolean; nextCursor?: string }> {
    const { limit = 50, before, after, forceRefresh = false } = options || {};

    // Check cache first for initial load
    const cached = this.messagesCache.get(conversationId);
    const cacheValid = !forceRefresh && cached && cached.length > 0 && this.isCacheValid();

    if (cacheValid && !before && !after) {
      // Return cached messages immediately, revalidate in background
      this.syncMessagesInBackground(conversationId);
      return {
        messages: cached.slice(0, limit),
        hasMore: cached.length >= limit
      };
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(before && { before }),
        ...(after && { after })
      });

      const response = await this.makeRequest(
        `/api/messaging/conversations/${conversationId}/messages?${params}`
      );

      if (!response.ok) {
        // Try to get error details from response body
        let errorDetails = response.statusText;
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || errorData.message || errorDetails;
        } catch (e) {
          // If response is not JSON, use statusText
        }
        throw new Error(`Failed to fetch messages: ${response.status} ${errorDetails}`);
      }

      const responseData = await response.json();
      // Unwrap API response: backend wraps data in { success, data, message } structure
      const payload = responseData.data || responseData;
      const messagesArray = payload.messages || payload || [];
      const messages = (Array.isArray(messagesArray) ? messagesArray : []).map((m: any) => this.transformMessage(m));

      // Update cache
      this.updateMessagesCache(conversationId, messages, !before && !after);
      await this.persistMessagesToCache(conversationId);

      return {
        messages,
        hasMore: payload.hasMore || payload.pagination?.hasMore || false,
        nextCursor: payload.nextCursor || payload.pagination?.nextCursor
      };
    } catch (error) {
      console.error('[UnifiedMessaging] Error fetching messages:', error);

      // Fall back to cache
      if (cached && cached.length > 0) {
        console.warn('[UnifiedMessaging] Using cached messages due to backend error');
        return { messages: cached.slice(0, limit), hasMore: false };
      }

      throw error;
    }
  }

  /**
   * Send a message
   * Posts to backend immediately, queues if offline
   */
  async sendMessage(params: {
    conversationId: string;
    content: string;
    contentType?: Message['contentType'];
    attachments?: MessageAttachment[];
    replyToId?: string;
  }): Promise<Message> {
    const { conversationId, content, contentType = 'text', attachments, replyToId } = params;

    // Generate temp ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create optimistic message for immediate UI update
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      fromAddress: this.currentUserAddress!,
      content,
      contentType,
      timestamp: new Date(),
      deliveryStatus: 'sent',
      attachments,
      replyToId
    };

    // Add to cache immediately (optimistic update)
    this.addMessageToCache(conversationId, optimisticMessage);
    this.emitEvent('message_sent', { message: optimisticMessage, conversationId, tempId });

    // Check if online
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      // Queue for later
      this.queuePendingMessage({
        tempId,
        conversationId,
        content,
        contentType,
        attachments,
        replyToId,
        createdAt: new Date(),
        retryCount: 0
      });
      return optimisticMessage;
    }

    try {
      const response = await this.makeRequest(
        `/api/messaging/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromAddress: this.currentUserAddress,
            // senderAddress refers to the message author's wallet address (messaging schema)
            // NOT to be confused with 'sender' in payment transactions
            senderAddress: this.currentUserAddress, // Include both for compatibility
            content,
            contentType,
            attachments,
            replyToId
          })
        }
      );

      if (!response.ok) {
        // Try to get error details from response body
        let errorDetails = response.statusText;
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || errorData.message || errorDetails;
        } catch (e) {
          // If response is not JSON, use statusText
        }
        throw new Error(`Failed to send message: ${response.status} ${errorDetails}`);
      }

      const data = await response.json();
      const sentMessage = this.transformMessage(data);

      // Replace optimistic message with real one
      this.replaceOptimisticMessage(conversationId, tempId, sentMessage);
      await this.persistMessagesToCache(conversationId);

      // Update conversation's last message
      this.updateConversationLastMessage(conversationId, sentMessage);

      // Emit updated event
      this.emitEvent('message_sent', { message: sentMessage, conversationId, tempId });

      return sentMessage;
    } catch (error) {
      console.error('[UnifiedMessaging] ❌ Error sending message:', error);
      console.error('[UnifiedMessaging] Failed request details:', {
        conversationId,
        contentLength: content?.length || 0,
        contentType,
        hasAttachments: !!attachments?.length,
        attachmentCount: attachments?.length || 0,
        currentUserAddress: this.currentUserAddress,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });

      // Queue for retry
      this.queuePendingMessage({
        tempId,
        conversationId,
        content,
        contentType,
        attachments,
        replyToId,
        createdAt: new Date(),
        retryCount: 0
      });

      // Emit error event for UI to handle
      this.emitEvent('message_sent', {
        message: { ...optimisticMessage, deliveryStatus: 'failed' as any },
        conversationId,
        tempId,
        error: error instanceof Error ? error.message : 'Failed to send message'
      });

      return optimisticMessage;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, conversationId: string): Promise<void> {
    try {
      const response = await this.makeRequest(`/api/messaging/messages/${messageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete message: ${response.statusText}`);
      }

      // Remove from cache
      this.removeMessageFromCache(conversationId, messageId);
      await this.persistMessagesToCache(conversationId);

      // Emit event
      this.emitEvent('message_deleted', { messageId, conversationId });
    } catch (error) {
      console.error('[UnifiedMessaging] Error deleting message:', error);

      // Queue for later if offline
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        this.offlineManager.queueAction('DELETE_MESSAGE', { messageId, conversationId }, {
          priority: 'medium',
          maxRetries: 3
        });
      }

      throw error;
    }
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, conversationId: string, newContent: string): Promise<Message> {
    try {
      const response = await this.makeRequest(`/api/messaging/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: newContent })
      });

      if (!response.ok) {
        throw new Error(`Failed to edit message: ${response.statusText}`);
      }

      const data = await response.json();
      const editedMessage = this.transformMessage(data);

      // Update cache
      this.updateMessageInCache(conversationId, editedMessage);
      await this.persistMessagesToCache(conversationId);

      // Emit event
      this.emitEvent('message_edited', { message: editedMessage, conversationId });

      return editedMessage;
    } catch (error) {
      console.error('[UnifiedMessaging] Error editing message:', error);
      throw error;
    }
  }

  // ==================== READ RECEIPTS ====================

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, messageIds?: string[]): Promise<void> {
    try {
      const response = await this.makeRequest(
        `/api/messaging/conversations/${conversationId}/read`,
        {
          method: 'PUT',
          body: JSON.stringify({ messageIds })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to mark as read: ${response.statusText}`);
      }

      // Update local unread count
      const conversation = this.conversationsCache.get(conversationId);
      if (conversation && this.currentUserAddress) {
        conversation.unreadCounts = conversation.unreadCounts || {};
        conversation.unreadCounts[this.currentUserAddress] = 0;
        this.conversationsCache.set(conversationId, conversation);
        await this.persistConversationsToCache();
      }
    } catch (error) {
      console.error('[UnifiedMessaging] Error marking as read:', error);

      // Queue for later if offline
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        this.offlineManager.queueAction('MARK_MESSAGES_READ', { conversationId, messageIds }, {
          priority: 'low',
          maxRetries: 3
        });
      }
    }
  }

  // ==================== TYPING INDICATORS ====================

  /**
   * Start typing indicator
   */
  startTyping(conversationId: string): void {
    if (this.wsConnection?.isConnected) {
      this.wsConnection.send('typing:start', { conversationId });
    }
  }

  /**
   * Stop typing indicator
   */
  stopTyping(conversationId: string): void {
    if (this.wsConnection?.isConnected) {
      this.wsConnection.send('typing:stop', { conversationId });
    }
  }

  /**
   * Get users currently typing in a conversation
   */
  getTypingUsers(conversationId: string): string[] {
    return Array.from(this.typingIndicators.get(conversationId) || []);
  }

  // ==================== PRESENCE ====================

  /**
   * Check if a user is online
   */
  isUserOnline(userAddress: string): boolean {
    return this.onlineUsers.has(userAddress.toLowerCase());
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  // ==================== REACTIONS ====================

  /**
   * Add reaction to a message
   */
  async addReaction(messageId: string, emoji: string): Promise<void> {
    try {
      const response = await this.makeRequest(`/api/messaging/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji })
      });

      if (!response.ok) {
        throw new Error(`Failed to add reaction: ${response.statusText}`);
      }

      const reaction = await response.json();
      this.emitEvent('reaction_added', { messageId, reaction });
    } catch (error) {
      console.error('[UnifiedMessaging] Error adding reaction:', error);

      // Queue for later if offline
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        this.offlineManager.queueAction('ADD_REACTION', { messageId, emoji }, {
          priority: 'low',
          maxRetries: 3
        });
      }
    }
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(messageId: string, emoji: string): Promise<void> {
    try {
      const response = await this.makeRequest(`/api/messaging/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to remove reaction: ${response.statusText}`);
      }

      this.emitEvent('reaction_removed', { messageId, reactionId: emoji });
    } catch (error) {
      console.error('[UnifiedMessaging] Error removing reaction:', error);
    }
  }

  /**
   * Get reactions for a message
   */
  async getReactions(messageId: string): Promise<MessageReaction[]> {
    try {
      const response = await this.makeRequest(`/api/messaging/messages/${messageId}/reactions`);

      if (!response.ok) {
        throw new Error(`Failed to get reactions: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data || [];
    } catch (error) {
      console.error('[UnifiedMessaging] Error getting reactions:', error);
      return [];
    }
  }

  // ==================== PINNING ====================

  /**
   * Pin a message
   */
  async pinMessage(messageId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/messaging/messages/${messageId}/pin`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to pin message: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('[UnifiedMessaging] Error pinning message:', error);
      throw error;
    }
  }

  /**
   * Unpin a message
   */
  async unpinMessage(messageId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/messaging/messages/${messageId}/pin`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to unpin message: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('[UnifiedMessaging] Error unpinning message:', error);
      throw error;
    }
  }

  /**
   * Get pinned messages for a conversation
   */
  async getPinnedMessages(conversationId: string): Promise<Message[]> {
    try {
      const response = await this.makeRequest(`/api/messaging/conversations/${conversationId}/pinned`);

      if (!response.ok) {
        throw new Error(`Failed to get pinned messages: ${response.statusText}`);
      }

      const data = await response.json();
      const messages = data.data || data || [];
      return messages.map((m: any) => this.transformMessage(m));
    } catch (error) {
      console.error('[UnifiedMessaging] Error getting pinned messages:', error);
      return [];
    }
  }

  // ==================== THREADING ====================

  /**
   * Get full message thread (parent + all replies)
   */
  async getMessageThread(messageId: string): Promise<{
    parentMessage: Message | null;
    replies: Message[];
    replyCount: number;
  }> {
    try {
      const response = await this.makeRequest(`/api/messaging/messages/${messageId}/full-thread`);

      if (!response.ok) {
        throw new Error(`Failed to get message thread: ${response.statusText}`);
      }

      const data = await response.json();
      const threadData = data.data || data;

      return {
        parentMessage: threadData.parentMessage ? this.transformMessage(threadData.parentMessage) : null,
        replies: (threadData.replies || []).map((m: any) => this.transformMessage(m)),
        replyCount: threadData.replyCount || 0
      };
    } catch (error) {
      console.error('[UnifiedMessaging] Error getting message thread:', error);
      return { parentMessage: null, replies: [], replyCount: 0 };
    }
  }

  /**
   * Reply to a message (convenience wrapper around sendMessage)
   */
  async replyToMessage(params: {
    conversationId: string;
    replyToId: string;
    content: string;
    contentType?: Message['contentType'];
  }): Promise<Message> {
    return this.sendMessage({
      conversationId: params.conversationId,
      content: params.content,
      contentType: params.contentType || 'text',
      replyToId: params.replyToId
    });
  }

  /**
   * Upload an attachment (file/image)
   */
  async uploadAttachment(file: File): Promise<MessageAttachment> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Add CSRF token if available in DOM
      if (typeof document !== 'undefined') {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
          formData.append('_csrf', csrfToken);
        }
      }

      const response = await this.makeRequest('/api/messaging/attachments', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to upload attachment: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('[UnifiedMessaging] Error uploading attachment:', error);
      throw error;
    }
  }

  // ==================== CONVERSATION MANAGEMENT ====================

  /**
   * Search conversations by query and filters
   */
  async searchConversations(
    query: string,
    filter?: {
      type?: string;
      hasUnread?: boolean;
      isArchived?: boolean;
      isPinned?: boolean;
      participantAddress?: string;
    }
  ): Promise<Conversation[]> {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (filter?.type) params.append('type', filter.type);
      if (filter?.hasUnread !== undefined) params.append('hasUnread', filter.hasUnread.toString());
      if (filter?.isArchived !== undefined) params.append('isArchived', filter.isArchived.toString());
      if (filter?.isPinned !== undefined) params.append('isPinned', filter.isPinned.toString());
      if (filter?.participantAddress) params.append('participant', filter.participantAddress);

      const response = await this.makeRequest(`/api/conversations/search?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to search conversations: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.conversations || []).map((c: any) => this.transformConversation(c));
    } catch (error) {
      console.error('[UnifiedMessaging] Error searching conversations:', error);
      return [];
    }
  }

  /**
   * Search messages within conversations
   */
  async searchMessages(
    searchQuery: {
      query: string;
      conversationId?: string;
      fromAddress?: string;
      contentType?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Array<{ message: Message; conversation: Conversation; snippet?: string }>> {
    try {
      const response = await this.makeRequest('/api/messages/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchQuery)
      });

      if (!response.ok) {
        throw new Error(`Failed to search messages: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.results || []).map((result: any) => ({
        message: this.transformMessage(result.message),
        conversation: this.transformConversation(result.conversation),
        snippet: result.snippet
      }));
    } catch (error) {
      console.error('[UnifiedMessaging] Error searching messages:', error);
      return [];
    }
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string, currentUserAddress?: string, reason?: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/conversations/${conversationId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        const conversation = this.conversationsCache.get(conversationId);
        if (conversation) {
          conversation.metadata = { ...conversation.metadata, isArchived: true };
          this.emitEvent('conversation_updated', { conversation });
        }
      }

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error archiving conversation:', error);
      return false;
    }
  }

  /**
   * Unarchive a conversation
   */
  async unarchiveConversation(conversationId: string, currentUserAddress?: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/conversations/${conversationId}/unarchive`, {
        method: 'POST'
      });

      if (response.ok) {
        const conversation = this.conversationsCache.get(conversationId);
        if (conversation) {
          conversation.metadata = { ...conversation.metadata, isArchived: false };
          this.emitEvent('conversation_updated', { conversation });
        }
      }

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error unarchiving conversation:', error);
      return false;
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, currentUserAddress?: string, deleteForEveryone: boolean = false): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteForEveryone })
      });

      if (response.ok) {
        this.conversationsCache.delete(conversationId);
        this.messagesCache.delete(conversationId);
      }

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error deleting conversation:', error);
      return false;
    }
  }

  /**
   * Pin/unpin a conversation
   */
  async toggleConversationPin(conversationId: string, currentUserAddress?: string, isPinned?: boolean): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/conversations/${conversationId}/pin`, {
        method: isPinned ? 'POST' : 'DELETE'
      });

      if (response.ok) {
        const conversation = this.conversationsCache.get(conversationId);
        if (conversation) {
          conversation.metadata = { ...conversation.metadata, isPinned };
          this.emitEvent('conversation_updated', { conversation });
        }
      }

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error toggling conversation pin:', error);
      return false;
    }
  }

  /**
   * Mute/unmute a conversation
   */
  async toggleConversationMute(
    conversationId: string,
    currentUserAddress?: string,
    isMuted?: boolean,
    muteUntil?: Date
  ): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/conversations/${conversationId}/mute`, {
        method: isMuted ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muteUntil })
      });

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error toggling conversation mute:', error);
      return false;
    }
  }

  /**
   * Update conversation settings
   */
  async updateConversationSettings(
    conversationId: string,
    settings: Partial<ConversationSettings>,
    currentUserAddress?: string
  ): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/conversations/${conversationId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error updating conversation settings:', error);
      return false;
    }
  }

  /**
   * Get conversation settings
   */
  async getConversationSettings(conversationId: string, currentUserAddress?: string): Promise<ConversationSettings | null> {
    try {
      const response = await this.makeRequest(`/api/conversations/${conversationId}/settings`);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[UnifiedMessaging] Error getting conversation settings:', error);
      return null;
    }
  }

  /**
   * Set custom title for a conversation
   */
  async setConversationTitle(conversationId: string, title: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/conversations/${conversationId}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });

      if (response.ok) {
        const conversation = this.conversationsCache.get(conversationId);
        if (conversation) {
          conversation.metadata = { ...conversation.metadata, title };
          this.emitEvent('conversation_updated', { conversation });
        }
      }

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error setting conversation title:', error);
      return false;
    }
  }

  /**
   * Block a user
   */
  async blockUser(userAddress: string, reason?: string): Promise<boolean> {
    try {
      const response = await this.makeRequest('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedAddress: userAddress, reason })
      });

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error blocking user:', error);
      return false;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userAddress: string): Promise<boolean> {
    try {
      const response = await this.makeRequest('/api/users/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedAddress: userAddress })
      });

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error unblocking user:', error);
      return false;
    }
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(): Promise<string[]> {
    try {
      const response = await this.makeRequest('/api/users/blocked');

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.blockedUsers || [];
    } catch (error) {
      console.error('[UnifiedMessaging] Error getting blocked users:', error);
      return [];
    }
  }

  /**
   * Add participant to group conversation
   */
  async addParticipant(conversationId: string, userAddress: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/conversations/${conversationId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress })
      });

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error adding participant:', error);
      return false;
    }
  }

  /**
   * Remove participant from group conversation
   */
  async removeParticipant(conversationId: string, userAddress: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/conversations/${conversationId}/participants/${userAddress}`, {
        method: 'DELETE'
      });

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error removing participant:', error);
      return false;
    }
  }

  /**
   * Leave a group conversation
   */
  async leaveConversation(conversationId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/conversations/${conversationId}/leave`, {
        method: 'POST'
      });

      if (response.ok) {
        this.conversationsCache.delete(conversationId);
        this.messagesCache.delete(conversationId);
      }

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error leaving conversation:', error);
      return false;
    }
  }

  /**
   * Clear conversation history
   */
  async clearConversationHistory(
    conversationId: string,
    currentUserAddress?: string,
    deleteForEveryone: boolean = false
  ): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/api/conversations/${conversationId}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteForEveryone })
      });

      if (response.ok) {
        this.messagesCache.delete(conversationId);
      }

      return response.ok;
    } catch (error) {
      console.error('[UnifiedMessaging] Error clearing conversation history:', error);
      return false;
    }
  }

  /**
   * Export conversation to various formats
   */
  async exportConversation(
    conversationId: string,
    format: 'json' | 'txt' | 'pdf' = 'json',
    currentUserAddress?: string,
    options?: { includeMedia?: boolean }
  ): Promise<Blob | null> {
    try {
      const params = new URLSearchParams({
        format,
        includeMedia: options?.includeMedia ? 'true' : 'false'
      });

      const response = await this.makeRequest(`/api/conversations/${conversationId}/export?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to export conversation: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('[UnifiedMessaging] Error exporting conversation:', error);
      return null;
    }
  }

  // ==================== EVENT SYSTEM ====================

  /**
   * Subscribe to messaging events
   */
  on<T extends MessagingEvent>(
    event: T,
    callback: (payload: MessagingEventPayload[T]) => void
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Unsubscribe from messaging events
   */
  off<T extends MessagingEvent>(event: T, callback: Function): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emitEvent<T extends MessagingEvent>(event: T, payload: MessagingEventPayload[T]): void {
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`[UnifiedMessaging] Error in event listener for ${event}:`, error);
      }
    });
  }

  // ==================== SYNC ====================

  /**
   * Force a full sync from backend
   */
  async forceSync(): Promise<void> {
    await this.syncFromBackend(true);
  }

  /**
   * Get pending messages count
   */
  getPendingMessagesCount(): number {
    return this.pendingMessages.size;
  }

  /**
   * Retry sending pending messages
   */
  async retryPendingMessages(): Promise<void> {
    for (const [tempId, pending] of this.pendingMessages) {
      try {
        const response = await this.makeRequest(
          `/api/messaging/conversations/${pending.conversationId}/messages`,
          {
            method: 'POST',
            body: JSON.stringify({
              content: pending.content,
              contentType: pending.contentType,
              attachments: pending.attachments,
              replyToId: pending.replyToId
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const sentMessage = this.transformMessage(data);

          // Replace optimistic message
          this.replaceOptimisticMessage(pending.conversationId, tempId, sentMessage);
          this.pendingMessages.delete(tempId);

          this.emitEvent('message_sent', {
            message: sentMessage,
            conversationId: pending.conversationId,
            tempId
          });
        }
      } catch (error) {
        console.error(`[UnifiedMessaging] Failed to retry message ${tempId}:`, error);

        // Increment retry count
        pending.retryCount++;
        if (pending.retryCount >= 5) {
          // Give up after 5 retries
          this.pendingMessages.delete(tempId);
          console.error(`[UnifiedMessaging] Giving up on message ${tempId} after 5 retries`);
        }
      }
    }
  }

  // ==================== PRIVATE METHODS ====================

  private async initializeCache(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[UnifiedMessaging] IndexedDB not available');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_CONFIG.DB_NAME, CACHE_CONFIG.DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(CACHE_CONFIG.CONVERSATIONS_STORE)) {
          db.createObjectStore(CACHE_CONFIG.CONVERSATIONS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CACHE_CONFIG.MESSAGES_STORE)) {
          const messagesStore = db.createObjectStore(CACHE_CONFIG.MESSAGES_STORE, { keyPath: 'id' });
          messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
        }
        if (!db.objectStoreNames.contains(CACHE_CONFIG.SETTINGS_STORE)) {
          db.createObjectStore(CACHE_CONFIG.SETTINGS_STORE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(CACHE_CONFIG.SYNC_STORE)) {
          db.createObjectStore(CACHE_CONFIG.SYNC_STORE, { keyPath: 'conversationId' });
        }
      };
    });
  }

  private async loadCachedData(): Promise<void> {
    if (!this.db) return;

    try {
      // Load conversations
      const conversations = await this.getAllFromStore<Conversation>(CACHE_CONFIG.CONVERSATIONS_STORE);
      conversations.forEach(conv => {
        this.conversationsCache.set(conv.id, conv);
      });

      // Load messages (group by conversation)
      const messages = await this.getAllFromStore<Message & { conversationId: string }>(CACHE_CONFIG.MESSAGES_STORE);
      messages.forEach(msg => {
        if (!this.messagesCache.has(msg.conversationId)) {
          this.messagesCache.set(msg.conversationId, []);
        }
        this.messagesCache.get(msg.conversationId)!.push(msg);
      });

      // Sort messages by timestamp
      this.messagesCache.forEach((msgs, convId) => {
        this.messagesCache.set(
          convId,
          msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        );
      });

      console.log(`[UnifiedMessaging] Loaded ${this.conversationsCache.size} conversations and ${messages.length} messages from cache`);
    } catch (error) {
      console.error('[UnifiedMessaging] Error loading cached data:', error);
    }
  }

  private async syncFromBackend(force = false): Promise<void> {
    if (this.syncInProgress && !force) return;

    this.syncInProgress = true;

    try {
      // Fetch conversations from backend
      const conversations = await this.fetchConversationsFromBackend(100, 0);

      // Update cache
      let messagesCount = 0;
      for (const conv of conversations) {
        this.conversationsCache.set(conv.id, conv);

        // Fetch recent messages for each conversation
        try {
          const { messages } = await this.getMessages(conv.id, { limit: 50, forceRefresh: true });
          messagesCount += messages.length;
        } catch (error) {
          console.error(`[UnifiedMessaging] Error syncing messages for ${conv.id}:`, error);
        }
      }

      await this.persistConversationsToCache();

      this.lastFullSync = new Date();
      this.emitEvent('sync_complete', {
        conversationsCount: conversations.length,
        messagesCount
      });

      console.log(`[UnifiedMessaging] Sync complete: ${conversations.length} conversations, ${messagesCount} messages`);
    } catch (error) {
      console.error('[UnifiedMessaging] Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async fetchConversationsFromBackend(limit: number, offset: number): Promise<Conversation[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    const response = await this.makeRequest(`/api/chat/conversations?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.statusText}`);
    }

    const responseData = await response.json();
    const payload = responseData.data || responseData;
    const conversationsArray = Array.isArray(payload)
      ? payload
      : (payload.conversations || payload.data || []);

    const conversations = Array.isArray(conversationsArray) ? conversationsArray : [];

    return conversations.map((c: any) => this.transformConversation(c));
  }

  private syncConversationsInBackground(): void {
    // Don't block - just fire and forget
    this.fetchConversationsFromBackend(50, 0)
      .then(conversations => {
        conversations.forEach(conv => {
          this.conversationsCache.set(conv.id, conv);
        });
        this.persistConversationsToCache();
      })
      .catch(error => {
        console.error('[UnifiedMessaging] Background sync error:', error);
      });
  }

  private syncConversationInBackground(conversationId: string): void {
    this.makeRequest(`/api/messaging/conversations/${conversationId}`)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Failed to fetch');
      })
      .then(responseData => {
        const payload = responseData.data || responseData;
        const conv = this.transformConversation(payload);
        this.conversationsCache.set(conversationId, conv);
        this.persistConversationsToCache();
      })
      .catch(error => {
        console.error('[UnifiedMessaging] Background conversation sync error:', error);
      });
  }

  private syncMessagesInBackground(conversationId: string): void {
    const params = new URLSearchParams({ limit: '50' });

    this.makeRequest(`/api/messaging/conversations/${conversationId}/messages?${params}`)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Failed to fetch');
      })
      .then(responseData => {
        const payload = responseData.data || responseData;
        const messagesArray = payload.messages || payload || [];
        const messages = (Array.isArray(messagesArray) ? messagesArray : []).map((m: any) => this.transformMessage(m));
        this.updateMessagesCache(conversationId, messages, true);
        this.persistMessagesToCache(conversationId);
      })
      .catch(error => {
        console.error('[UnifiedMessaging] Background messages sync error:', error);
      });
  }

  // Cache helpers
  private isCacheValid(): boolean {
    if (!this.lastFullSync) return false;
    const elapsed = Date.now() - this.lastFullSync.getTime();
    return elapsed < CACHE_CONFIG.CACHE_TTL_MS;
  }

  private addMessageToCache(conversationId: string, message: Message): void {
    if (!this.messagesCache.has(conversationId)) {
      this.messagesCache.set(conversationId, []);
    }
    const messages = this.messagesCache.get(conversationId)!;
    messages.unshift(message);

    // Trim to max size
    if (messages.length > CACHE_CONFIG.MAX_CACHED_MESSAGES_PER_CONVERSATION) {
      messages.pop();
    }
  }

  private updateMessagesCache(conversationId: string, newMessages: Message[], replace: boolean): void {
    if (replace) {
      this.messagesCache.set(conversationId, newMessages);
    } else {
      const existing = this.messagesCache.get(conversationId) || [];
      const existingIds = new Set(existing.map(m => m.id));
      const toAdd = newMessages.filter(m => !existingIds.has(m.id));

      const combined = [...toAdd, ...existing]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, CACHE_CONFIG.MAX_CACHED_MESSAGES_PER_CONVERSATION);

      this.messagesCache.set(conversationId, combined);
    }
  }

  private replaceOptimisticMessage(conversationId: string, tempId: string, realMessage: Message): void {
    const messages = this.messagesCache.get(conversationId);
    if (messages) {
      const index = messages.findIndex(m => m.id === tempId);
      if (index !== -1) {
        messages[index] = realMessage;
      }
    }
  }

  private removeMessageFromCache(conversationId: string, messageId: string): void {
    const messages = this.messagesCache.get(conversationId);
    if (messages) {
      const index = messages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        messages.splice(index, 1);
      }
    }
  }

  private updateMessageInCache(conversationId: string, message: Message): void {
    const messages = this.messagesCache.get(conversationId);
    if (messages) {
      const index = messages.findIndex(m => m.id === message.id);
      if (index !== -1) {
        messages[index] = message;
      }
    }
  }

  private updateConversationLastMessage(conversationId: string, message: Message): void {
    const conversation = this.conversationsCache.get(conversationId);
    if (conversation) {
      conversation.lastMessage = message;
      conversation.lastActivity = message.timestamp;
      this.conversationsCache.set(conversationId, conversation);
      this.emitEvent('conversation_updated', { conversation });
    }
  }

  private queuePendingMessage(pending: PendingMessage): void {
    this.pendingMessages.set(pending.tempId, pending);

    // Also queue with OfflineManager for persistence
    this.offlineManager.queueAction('SEND_MESSAGE', {
      conversationId: pending.conversationId,
      content: pending.content,
      contentType: pending.contentType,
      attachments: pending.attachments,
      replyToId: pending.replyToId
    }, {
      priority: 'high',
      maxRetries: 5
    });
  }

  // IndexedDB helpers
  private async getAllFromStore<T>(storeName: string): Promise<T[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async persistConversationsToCache(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(CACHE_CONFIG.CONVERSATIONS_STORE, 'readwrite');
    const store = transaction.objectStore(CACHE_CONFIG.CONVERSATIONS_STORE);

    for (const conv of this.conversationsCache.values()) {
      store.put(conv);
    }
  }

  private async persistMessagesToCache(conversationId: string): Promise<void> {
    if (!this.db) return;

    const messages = this.messagesCache.get(conversationId) || [];
    const transaction = this.db.transaction(CACHE_CONFIG.MESSAGES_STORE, 'readwrite');
    const store = transaction.objectStore(CACHE_CONFIG.MESSAGES_STORE);

    for (const msg of messages) {
      store.put({ ...msg, conversationId });
    }
  }

  // WebSocket handlers
  private handleWebSocketMessage(data: any): void {
    const message = this.transformMessage(data.message || data);
    const conversationId = data.conversationId || message.conversationId;

    // CHECK FOR DUPLICATES / PENDING MESSAGES
    // Look for any pending message that matches this one (same content and sender)
    // This prevents the "double message" issue where optimistic + real message both exist
    let matchedTempId: string | null = null;

    // Check pending messages map
    for (const [tempId, pending] of this.pendingMessages.entries()) {
      if (
        pending.conversationId === conversationId &&
        pending.content === message.content &&
        // Allow for small timing differences or exact match not needed for optimistic correlation
        (message.fromAddress?.toLowerCase() === this.currentUserAddress?.toLowerCase())
      ) {
        matchedTempId = tempId;
        break;
      }
    }

    // Also check the cache for any messages that look like optimistic updates (temp_ prefix)
    if (!matchedTempId) {
      const cachedMessages = this.messagesCache.get(conversationId) || [];
      const optimisticMatch = cachedMessages.find(m =>
        m.id.startsWith('temp_') &&
        m.content === message.content &&
        m.conversationId === conversationId
      );
      if (optimisticMatch) {
        matchedTempId = optimisticMatch.id;
      }
    }

    if (matchedTempId) {
      console.log(`[UnifiedMessaging] Deduplicated message: Replaced pending ${matchedTempId} with real ${message.id}`);
      this.replaceOptimisticMessage(conversationId, matchedTempId, message);
      this.pendingMessages.delete(matchedTempId);
    } else {
      // Add to cache normally if no match found
      this.addMessageToCache(conversationId, message);
    }

    this.persistMessagesToCache(conversationId);

    // Update conversation
    this.updateConversationLastMessage(conversationId, message);

    // Emit event
    this.emitEvent('message_received', { message, conversationId });
  }

  private handleWebSocketMessageDeleted(data: any): void {
    const { messageId, conversationId } = data;
    this.removeMessageFromCache(conversationId, messageId);
    this.emitEvent('message_deleted', { messageId, conversationId });
  }

  private handleWebSocketMessageEdited(data: any): void {
    const message = this.transformMessage(data.message || data);
    const conversationId = data.conversationId || message.conversationId;
    this.updateMessageInCache(conversationId, message);
    this.emitEvent('message_edited', { message, conversationId });
  }

  private handleWebSocketTyping(data: any): void {
    const { conversationId, userAddress } = data;
    if (!this.typingIndicators.has(conversationId)) {
      this.typingIndicators.set(conversationId, new Set());
    }
    this.typingIndicators.get(conversationId)!.add(userAddress);
    this.emitEvent('typing_start', { conversationId, userAddress });
  }

  private handleWebSocketStopTyping(data: any): void {
    const { conversationId, userAddress } = data;
    this.typingIndicators.get(conversationId)?.delete(userAddress);
    this.emitEvent('typing_stop', { conversationId, userAddress });
  }

  private handleWebSocketReadReceipt(data: any): void {
    const { conversationId, messageId, userAddress } = data;
    this.emitEvent('read_receipt', { conversationId, messageId, userAddress });
  }

  private handleWebSocketPresence(data: any): void {
    const { userAddress, isOnline, lastSeen } = data;
    if (isOnline) {
      this.onlineUsers.add(userAddress.toLowerCase());
    } else {
      this.onlineUsers.delete(userAddress.toLowerCase());
    }
    this.emitEvent('presence_update', { userAddress, isOnline, lastSeen: lastSeen ? new Date(lastSeen) : undefined });
  }

  private handleWebSocketReaction(data: any): void {
    const { messageId, reaction, removed, reactionId } = data;
    if (removed) {
      this.emitEvent('reaction_removed', { messageId, reactionId });
    } else {
      this.emitEvent('reaction_added', { messageId, reaction });
    }
  }

  // Network handlers
  private handleOnline(): void {
    console.log('[UnifiedMessaging] Network online - syncing...');
    this.retryPendingMessages();
    this.syncFromBackend();
    this.emitEvent('connection_change', {
      isConnected: true,
      mode: this.wsConnection?.isConnected ? 'websocket' : 'polling'
    });
  }

  private handleOffline(): void {
    console.log('[UnifiedMessaging] Network offline');
    this.emitEvent('connection_change', { isConnected: false, mode: 'offline' });
  }

  // API helpers
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    let authHeaders = await enhancedAuthService.getAuthHeaders();

    // If token is missing, attempt to refresh
    if (!authHeaders.Authorization || authHeaders.Authorization === 'Bearer null') {
      try {
        const refreshResult = await enhancedAuthService.refreshToken();
        if (refreshResult.success) {
          authHeaders = await enhancedAuthService.getAuthHeaders();
        }
      } catch (e) {
        console.warn('Token refresh failed in makeRequest (pre-check):', e);
      }
    }

    // Ensure Content-Type is not manually set for FormData
    const isFormData = options.body instanceof FormData;

    // Build headers dynamically to always use latest authHeaders
    const buildHeaders = () => ({
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...authHeaders,
      ...(options.headers as Record<string, string> || {})
    });

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: buildHeaders()
    });

    // If 401 or 403, try to refresh and retry
    // Note: Backend returns 403 for invalid tokens, 401 for missing tokens
    if (response.status === 401 || response.status === 403) {
      try {
        console.log(`[UnifiedMessaging] ${response.status} ${response.statusText}, refreshing token...`);
        const refreshResult = await enhancedAuthService.refreshToken();

        if (refreshResult.success) {
          console.log('[UnifiedMessaging] Token refreshed successfully, retrying request...');

          // CRITICAL: Get fresh auth headers AFTER refresh
          authHeaders = await enhancedAuthService.getAuthHeaders();

          // Log the actual token for debugging (first 20 chars only)
          const tokenValue = authHeaders.Authorization?.replace('Bearer ', '').substring(0, 20);
          console.log('[UnifiedMessaging] New auth token preview:', tokenValue ? `${tokenValue}...` : 'MISSING');

          // Build fresh headers with the new token
          const retryHeaders = {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...authHeaders,
            ...(options.headers as Record<string, string> || {})
          };

          console.log('[UnifiedMessaging] Retry headers prepared, sending request...');

          response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: retryHeaders
          });

          console.log(`[UnifiedMessaging] Retry response: ${response.status} ${response.statusText}`);
        } else {
          console.error('[UnifiedMessaging] Token refresh failed:', refreshResult.error);
        }
      } catch (e) {
        console.error('[UnifiedMessaging] Token refresh exception:', e);
      }
    }

    return response;
  }

  // Transform helpers
  private transformMessage(data: any): Message {
    const fromAddress = data.fromAddress || data.senderAddress || data.sender_address || data.sender || data.authorAddress || data.author;

    if (!fromAddress && process.env.NODE_ENV === 'development') {
      console.warn('[UnifiedMessaging] TransformMessage: No sender address found in data:', data);
    }

    return {
      ...data,
      fromAddress: fromAddress || '',
      senderAddress: fromAddress || '', // Ensure symmetry
      timestamp: new Date(data.timestamp || data.createdAt || data.sentAt || data.sent_at || data.created_at || data.timestamp || Date.now()),
      editedAt: data.editedAt || data.edited_at ? new Date(data.editedAt || data.edited_at) : undefined,
      deletedAt: data.deletedAt || data.deleted_at ? new Date(data.deletedAt || data.deleted_at) : undefined
    };
  }

  private transformConversation(data: any): Conversation {
    let participants = data.participants;
    if (typeof participants === 'string') {
      try {
        participants = JSON.parse(participants);
      } catch (e) {
        // Fallback if not a JSON string (could be comma separated or single address)
        participants = participants.split(',').map((p: string) => p.trim());
      }
    }

    // Normalize all participant addresses to lowercase for reliable comparison
    const normalizedParticipants = Array.isArray(participants)
      ? participants.map((p: any) => typeof p === 'string' ? p.toLowerCase() : String(p).toLowerCase())
      : [];

    return {
      ...data,
      participants: normalizedParticipants,
      lastActivity: new Date(data.lastActivity || data.updatedAt || data.createdAt),
      createdAt: new Date(data.createdAt),
      lastMessage: data.lastMessage ? this.transformMessage(data.lastMessage) : undefined,
      unreadCounts: data.unreadCounts || {},
      isEncrypted: data.isEncrypted || false,
      metadata: data.metadata || {
        type: data.type || 'direct'
      }
    };
  }
}

// Export singleton instance
export const unifiedMessagingService = UnifiedMessagingService.getInstance();

// Export class for testing
export { UnifiedMessagingService };

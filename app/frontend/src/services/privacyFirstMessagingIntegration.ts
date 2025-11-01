/**
 * Privacy-First Messaging Integration
 * Integrates encrypted message storage and attachment handling with the service worker cache
 */

import { serviceWorkerCacheService } from './serviceWorkerCacheService';
import { encryptedMessageStorage } from './encryptedMessageStorage';
import { messageAttachmentHandler } from './messageAttachmentHandler';

export interface MessagingCacheOptions {
  conversationListCacheStrategy: 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate';
  conversationListMaxAge: number;
  enableAttachmentCaching: boolean;
  attachmentCachePolicy?: {
    maxCacheSize: number;
    maxCacheAge: number;
    respectPrivacyHeaders: boolean;
  };
}

export class PrivacyFirstMessagingIntegration {
  private static instance: PrivacyFirstMessagingIntegration;
  private initialized = false;

  private readonly DEFAULT_OPTIONS: MessagingCacheOptions = {
    conversationListCacheStrategy: 'NetworkFirst',
    conversationListMaxAge: 300000, // 5 minutes
    enableAttachmentCaching: true,
    attachmentCachePolicy: {
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
      respectPrivacyHeaders: true,
    },
  };

  private constructor() {}

  public static getInstance(): PrivacyFirstMessagingIntegration {
    if (!PrivacyFirstMessagingIntegration.instance) {
      PrivacyFirstMessagingIntegration.instance = new PrivacyFirstMessagingIntegration();
    }
    return PrivacyFirstMessagingIntegration.instance;
  }

  /**
   * Initialize the privacy-first messaging integration
   */
  async initialize(options: Partial<MessagingCacheOptions> = {}): Promise<void> {
    if (this.initialized) return;

    try {
      const config = { ...this.DEFAULT_OPTIONS, ...options };

      // Initialize encrypted message storage
      await encryptedMessageStorage.initialize();

      // Initialize attachment handler if enabled
      if (config.enableAttachmentCaching) {
        await messageAttachmentHandler.initialize(config.attachmentCachePolicy);
      }

      // Set up conversation list caching with service worker
      await this.setupConversationListCaching(config);

      this.initialized = true;
      console.log('Privacy-first messaging integration initialized successfully');

    } catch (error) {
      console.error('Failed to initialize privacy-first messaging integration:', error);
      throw error;
    }
  }

  /**
   * Cache conversation list with NetworkFirst strategy
   */
  async cacheConversationList(
    userId: string,
    conversations: any[]
  ): Promise<void> {
    try {
      const cacheKey = `/api/messages/conversations/${userId}`;
      const response = new Response(JSON.stringify(conversations), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300', // 5 minutes
        },
      });

      await serviceWorkerCacheService.putWithMetadata(cacheKey, response, {
        tags: ['messaging', 'conversations', userId],
        userScope: userId,
        ttl: 300000, // 5 minutes
      });

    } catch (error) {
      console.error('Failed to cache conversation list:', error);
    }
  }

  /**
   * Get cached conversation list
   */
  async getCachedConversationList(userId: string): Promise<any[] | null> {
    try {
      const cacheKey = `/api/messages/conversations/${userId}`;
      const response = await serviceWorkerCacheService.fetchWithStrategy(
        cacheKey,
        'NetworkFirst',
        {
          userScope: userId,
          networkTimeoutSeconds: 3,
        }
      );

      if (response.ok) {
        return await response.json();
      }

      return null;

    } catch (error) {
      console.error('Failed to get cached conversation list:', error);
      return null;
    }
  }

  /**
   * Store encrypted message with automatic caching integration
   */
  async storeMessage(
    conversationId: string,
    messageId: string,
    messageContent: string,
    sender: string,
    recipient: string,
    type: 'text' | 'attachment' | 'system' = 'text',
    attachmentInfo?: { fileName: string; mimeType: string; size: number }
  ): Promise<void> {
    try {
      // Store encrypted message
      await encryptedMessageStorage.storeMessage(
        conversationId,
        messageId,
        messageContent,
        sender,
        recipient,
        type,
        attachmentInfo
      );

      // Invalidate conversation list cache for both participants
      await this.invalidateConversationCache(sender);
      await this.invalidateConversationCache(recipient);

      // Invalidate conversation-specific cache
      await serviceWorkerCacheService.invalidateByTag(`conversation-${conversationId}`);

    } catch (error) {
      console.error('Failed to store message with cache integration:', error);
      throw error;
    }
  }

  /**
   * Store attachment with privacy-aware caching
   */
  async storeAttachment(
    attachmentId: string,
    data: ArrayBuffer,
    metadata: {
      fileName: string;
      mimeType: string;
      size: number;
      conversationId: string;
      messageId: string;
      uploadedBy: string;
      isPrivate: boolean;
      encryptionKeyId?: string;
    }
  ): Promise<void> {
    try {
      const attachmentMetadata = {
        attachmentId,
        fileName: metadata.fileName,
        mimeType: metadata.mimeType,
        size: metadata.size,
        conversationId: metadata.conversationId,
        messageId: metadata.messageId,
        uploadedBy: metadata.uploadedBy,
        uploadTimestamp: Date.now(),
        isPrivate: metadata.isPrivate,
        encryptionKeyId: metadata.encryptionKeyId,
      };

      await messageAttachmentHandler.cacheAttachment(
        attachmentId,
        data,
        attachmentMetadata
      );

    } catch (error) {
      console.error('Failed to store attachment:', error);
      throw error;
    }
  }

  /**
   * Get attachment with signed URL support
   */
  async getAttachment(
    attachmentId: string,
    generateSignedUrl: boolean = false
  ): Promise<{
    data?: ArrayBuffer;
    signedUrl?: string;
    metadata: any;
  } | null> {
    try {
      const cached = await messageAttachmentHandler.getCachedAttachment(attachmentId);
      if (!cached) return null;

      const result: any = {
        metadata: cached.metadata,
      };

      if (generateSignedUrl) {
        result.signedUrl = await messageAttachmentHandler.generateSignedUrl(attachmentId);
      } else {
        result.data = cached.data;
      }

      return result;

    } catch (error) {
      console.error('Failed to get attachment:', error);
      return null;
    }
  }

  /**
   * Clear conversation data (messages and attachments)
   */
  async clearConversation(conversationId: string, participants: string[]): Promise<void> {
    try {
      // Clear encrypted messages
      await encryptedMessageStorage.clearConversation(conversationId);

      // Clear attachments
      await messageAttachmentHandler.clearConversationAttachments(conversationId);

      // Invalidate cache for all participants
      for (const participant of participants) {
        await this.invalidateConversationCache(participant);
      }

      // Invalidate conversation-specific cache
      await serviceWorkerCacheService.invalidateByTag(`conversation-${conversationId}`);

    } catch (error) {
      console.error('Failed to clear conversation:', error);
      throw error;
    }
  }

  /**
   * Perform cleanup of expired data
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup encrypted messages
      await encryptedMessageStorage.cleanup();

      // Cleanup attachments
      await messageAttachmentHandler.cleanup();

      // Cleanup service worker cache
      await serviceWorkerCacheService.invalidateByTag('messaging-expired');

    } catch (error) {
      console.error('Failed to perform messaging cleanup:', error);
    }
  }

  /**
   * Get comprehensive messaging storage statistics
   */
  async getStorageStats(): Promise<{
    messages: any;
    attachments: any;
    cache: any;
  }> {
    try {
      const [messageStats, attachmentStats, cacheStats] = await Promise.all([
        encryptedMessageStorage.getStorageStats(),
        messageAttachmentHandler.getCacheStats(),
        serviceWorkerCacheService.getCacheStats(),
      ]);

      return {
        messages: messageStats,
        attachments: attachmentStats,
        cache: cacheStats,
      };

    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        messages: {},
        attachments: {},
        cache: {},
      };
    }
  }

  /**
   * Handle user logout - clear all user-specific data
   */
  async handleUserLogout(userId: string): Promise<void> {
    try {
      // Clear conversation list cache
      await this.invalidateConversationCache(userId);

      // Clear user-scoped cache entries
      await serviceWorkerCacheService.invalidateByTag(userId);

      // Note: We don't clear encrypted messages and attachments here
      // as they should persist across sessions for privacy

    } catch (error) {
      console.error('Failed to handle user logout:', error);
    }
  }

  /**
   * Handle account switching - ensure data isolation
   */
  async handleAccountSwitch(oldUserId: string, newUserId: string): Promise<void> {
    try {
      // Clear old user's cache
      await this.handleUserLogout(oldUserId);

      // Initialize for new user if needed
      if (!this.initialized) {
        await this.initialize();
      }

    } catch (error) {
      console.error('Failed to handle account switch:', error);
    }
  }

  // Private methods

  private async setupConversationListCaching(config: MessagingCacheOptions): Promise<void> {
    // Register route for conversation list caching
    // This would typically be done in the service worker, but we're setting up the configuration here
    
    // The actual route registration would happen in the service worker
    // For now, we just ensure the cache service is initialized
    await serviceWorkerCacheService.initialize();
  }

  private async invalidateConversationCache(userId: string): Promise<void> {
    try {
      await serviceWorkerCacheService.invalidateByTag(`conversations-${userId}`);
    } catch (error) {
      console.warn('Failed to invalidate conversation cache:', error);
    }
  }
}

// Export singleton instance
export const privacyFirstMessagingIntegration = PrivacyFirstMessagingIntegration.getInstance();
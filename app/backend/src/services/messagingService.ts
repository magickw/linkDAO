import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { conversations, chatMessages, blockedUsers, messageReadStatus, conversationParticipants, messageReactions } from '../db/schema';
// import { notificationService } from './notificationService';
import { eq, desc, asc, and, or, like, inArray, sql, gt, lt, isNull, count } from 'drizzle-orm';
import communityNotificationService from './communityNotificationService';
import { sanitizeMessage, sanitizeConversation, sanitizeSearchQuery } from '../utils/sanitization';
import { cacheService } from './cacheService';
import { getWebSocketService } from './webSocketService';

// MEMORY OPTIMIZATION: Constants for limits and cleanup
const MAX_CONVERSATIONS_PER_USER = 50;
const MAX_MESSAGES_PER_QUERY = 100;
const DEFAULT_CACHE_TTL = 300; // 5 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

interface GetConversationsOptions {
  userAddress: string;
  page: number;
  limit: number;
  search?: string;
}

interface StartConversationData {
  initiatorAddress: string;
  participantAddress: string;
  initialMessage?: string;
  conversationType: string;
  communityId?: string;
}

interface SendMessageData {
  conversationId: string;
  fromAddress: string;
  content: string;
  encryptedContent?: string;
  contentType: string;
  replyToId?: string;
  attachments: any[];
  encryptionMetadata?: any;
}

interface EncryptMessageData {
  messageId: string;
  content: string;
  recipientPublicKey: string;
  senderAddress: string;
}

interface DecryptMessageData {
  messageId: string;
  encryptedContent: string;
  encryptionMetadata: any;
  recipientAddress: string;
}

export class MessagingService {
  // MEMORY OPTIMIZATION: Add cache and cleanup tracking
  private lastCleanup: number = Date.now();
  private activeConnections: Map<string, number> = new Map();

  // Helper method to validate Ethereum addresses and prevent SQL injection
  private validateAddress(address: string): void {
    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      throw new Error('Invalid Ethereum address format');
    }
  }

  // MEMORY OPTIMIZATION: Periodic cleanup method
  private async performCleanup(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCleanup < CLEANUP_INTERVAL) {
      return;
    }

    try {
      // Clean up expired read status records (older than 30 days)
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

      try {
        await db.delete(messageReadStatus)
          .where(lt(messageReadStatus.readAt, thirtyDaysAgo));
      } catch (tableError: any) {
        // Handle case where message_read_status table doesn't exist
        if (tableError.code === '42P01') {
          safeLogger.warn('message_read_status table does not exist, skipping cleanup');
        } else {
          throw tableError;
        }
      }

      // Clean up active connections tracking
      this.activeConnections.clear();

      this.lastCleanup = now;
      safeLogger.info('Messaging service cleanup completed');
    } catch (error) {
      safeLogger.error('Error during messaging service cleanup:', error);
      // Don't throw - allow service to continue even if cleanup fails
    }
  }
  // Get user's conversations
  async getConversations(options: GetConversationsOptions) {
    const { userAddress, page, limit } = options;
    const offset = (page - 1) * limit;

    try {
      // Normalize address to lowercase for consistent comparison
      const normalizedAddress = userAddress.toLowerCase();
      this.validateAddress(normalizedAddress);

      // MEMORY OPTIMIZATION: Perform cleanup periodically
      await this.performCleanup();

      // MEMORY OPTIMIZATION: Check cache first (use normalized address)
      const cacheKey = `conversations:${normalizedAddress}:${page}:${limit}:${options.search || ''}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // MEMORY OPTIMIZATION: Enforce limit and use transaction
      const actualLimit = Math.min(limit, MAX_CONVERSATIONS_PER_USER);

      const userConversations = await db.transaction(async (tx) => {
        // Rename local variable to avoid shadowing the imported 'conversations' table
        const userConversationsList = await tx
          .select({
            id: conversations.id,
            title: conversations.title,
            subject: conversations.subject,
            participants: conversations.participants,
            lastActivity: conversations.lastActivity,
            unreadCount: conversations.unreadCount,
            createdAt: conversations.createdAt,
            // Get last message
            lastMessage: sql<any>`
              (SELECT json_build_object(
                'id', m.id,
                'content', m.content,
                'senderAddress', m.sender_address,
                'timestamp', m.sent_at
              )
              FROM chat_messages m
              WHERE m.conversation_id = ${conversations.id}
              ORDER BY m.sent_at DESC
              LIMIT 1)
            `
          })
          .from(conversations)
          .where(sql`${conversations.participants} ? ${normalizedAddress}`)
          .orderBy(desc(conversations.lastActivity))
          .limit(actualLimit)
          .offset(offset);

        return userConversationsList;
      });

      const result = {
        conversations: userConversations,
        pagination: {
          page,
          limit: actualLimit,
          total: userConversations.length
        }
      };

      // MEMORY OPTIMIZATION: Cache the result
      await cacheService.set(cacheKey, result, DEFAULT_CACHE_TTL);

      return result;
    } catch (error) {
      safeLogger.error('Error getting conversations:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to get conversations');
    }
  }

  // Start new conversation
  async startConversation(data: StartConversationData) {
    const { initiatorAddress, participantAddress, initialMessage } = data;

    try {
      // Normalize addresses to lowercase for consistent comparison
      const normalizedInitiatorAddress = initiatorAddress.toLowerCase();
      this.validateAddress(normalizedInitiatorAddress);

      // Check if participantAddress is an ENS name and resolve it to a wallet address
      let resolvedParticipantAddress = participantAddress;
      if (participantAddress && typeof participantAddress === 'string' && participantAddress.endsWith('.eth')) {
        // Import ENS service here to avoid circular dependencies
        const { ensService } = await import('./ensService.js');
        const validationResult = await ensService.validateENSHandle(participantAddress);

        if (!validationResult.isValid || !validationResult.address) {
          return {
            success: false,
            message: `Invalid ENS name: ${participantAddress}. ${validationResult.error || 'ENS name could not be resolved.'}`
          };
        }

        resolvedParticipantAddress = validationResult.address;
      } else {
        // Validate that the participant address is a valid Ethereum address
        if (!/^0x[a-fA-F0-9]{40}$/.test(participantAddress)) {
          return {
            success: false,
            message: 'Invalid participant address format. Please provide a valid Ethereum address or ENS name.'
          };
        }
      }

      // Normalize resolved participant address to lowercase
      const normalizedParticipantAddress = resolvedParticipantAddress.toLowerCase();

      // Validate the normalized participant address
      this.validateAddress(normalizedParticipantAddress);

      // Check if conversation already exists between these participants
      // Use JSONB containment operator - requires participants column to be jsonb type
      const existingConversation = await db
        .select()
        .from(conversations)
        .where(
          sql`${conversations.participants} @> ${JSON.stringify([normalizedInitiatorAddress])}::jsonb
              AND ${conversations.participants} @> ${JSON.stringify([normalizedParticipantAddress])}::jsonb`
        )
        .limit(1);

      if (existingConversation.length > 0) {
        return {
          success: true,
          data: existingConversation[0],
          message: 'Conversation already exists'
        };
      }

      // Check if user is blocked
      const isBlocked = await this.checkIfBlocked(normalizedInitiatorAddress, normalizedParticipantAddress);
      if (isBlocked) {
        return {
          success: false,
          message: 'Cannot start conversation with blocked user'
        };
      }

      // Create new conversation with lowercase addresses
      const participants = [normalizedInitiatorAddress, normalizedParticipantAddress];

      const newConversation = await db
        .insert(conversations)
        .values({
          participants: participants,
          lastActivity: new Date(),
          createdAt: new Date()
        })
        .returning();

      // Send initial message if provided
      if (initialMessage) {
        await this.sendMessage({
          conversationId: newConversation[0].id,
          fromAddress: normalizedInitiatorAddress,
          content: initialMessage,
          contentType: 'text',
          attachments: []
        });
      }

      return {
        success: true,
        data: newConversation[0]
      };
    } catch (error) {
      safeLogger.error('Error starting conversation:', error);
      if (error instanceof Error) {
        if (error.message.includes('database') || error.message.includes('connection')) {
          throw new Error('Messaging service temporarily unavailable. Database connection error.');
        }
        // Preserve the original error message for better debugging
        throw new Error(`Failed to start conversation: ${error.message}`);
      }
      throw new Error('Failed to start conversation');
    }
  }

  // Get conversation details
  async getConversationDetails(data: { conversationId: string; userAddress: string }) {
    const { conversationId, userAddress } = data;

    try {
      this.validateAddress(userAddress);
      // Normalize to lowercase to ensure matching against DB
      const normalizedAddress = userAddress.toLowerCase();
      const conversation = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            sql`${conversations.participants} ? ${normalizedAddress}`
          )
        )
        .limit(1);

      if (conversation.length === 0) {
        return null;
      }

      return conversation[0];
    } catch (error) {
      safeLogger.error('Error getting conversation details:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to get conversation details');
    }
  }

  // Get conversation messages
  async getConversationMessages(data: {
    conversationId: string;
    userAddress: string;
    page: number;
    limit: number;
    before?: string;
    after?: string;
  }) {
    const { conversationId, userAddress, page, limit, before, after } = data;

    try {
      this.validateAddress(userAddress);

      // MEMORY OPTIMIZATION: Track active connections
      this.activeConnections.set(userAddress, (this.activeConnections.get(userAddress) || 0) + 1);

      // Validate UUID format for before/after parameters
      if (before && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(before)) {
        return {
          success: false,
          message: 'Invalid before parameter format'
        };
      }
      if (after && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(after)) {
        return {
          success: false,
          message: 'Invalid after parameter format'
        };
      }

      // MEMORY OPTIMIZATION: Check cache first
      const cacheKey = `messages:${conversationId}:${userAddress}:${page}:${limit}:${before || ''}:${after || ''}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Check if user is participant
      const conversation = await this.getConversationDetails({ conversationId, userAddress });
      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found or access denied'
        };
      }

      const offset = (page - 1) * limit;

      // MEMORY OPTIMIZATION: Enforce maximum limit
      const actualLimit = Math.min(limit, MAX_MESSAGES_PER_QUERY);

      let whereConditions = [eq(chatMessages.conversationId, conversationId)];

      // Add pagination filters
      if (before && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(before)) {
        whereConditions.push(lt(chatMessages.sentAt, sql`(SELECT timestamp FROM chat_messages WHERE id = ${before})`));
      }
      if (after && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(after)) {
        whereConditions.push(gt(chatMessages.sentAt, sql`(SELECT timestamp FROM chat_messages WHERE id = ${after})`));
      }

      const conversationMessages = await db.transaction(async (tx) => {
        const messages = await tx
          .select({
            id: chatMessages.id,
            conversationId: chatMessages.conversationId,
            senderAddress: chatMessages.senderAddress,
            content: chatMessages.content,
            sentAt: chatMessages.sentAt,
            editedAt: chatMessages.editedAt,
            deletedAt: chatMessages.deletedAt
          })
          .from(chatMessages)
          .where(and(...whereConditions))
          .orderBy(desc(chatMessages.sentAt))
          .limit(actualLimit)
          .offset(offset);

        return messages;
      });

      const result = {
        success: true,
        data: {
          messages: conversationMessages,
          pagination: {
            page,
            limit: actualLimit,
            total: conversationMessages.length
          }
        }
      };

      // MEMORY OPTIMIZATION: Cache the result with shorter TTL for messages
      await cacheService.set(cacheKey, result, DEFAULT_CACHE_TTL / 2);

      return result;
    } catch (error: any) {
      safeLogger.error('Error getting conversation messages:', error);
      if (error?.message?.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }

      return {
        success: false,
        message: `Failed to get conversation messages: ${error?.message || 'Unknown error'}`
      };
    } finally {
      // MEMORY OPTIMIZATION: Decrease active connection count
      const currentCount = this.activeConnections.get(userAddress) || 0;
      if (currentCount <= 1) {
        this.activeConnections.delete(userAddress);
      } else {
        this.activeConnections.set(userAddress, currentCount - 1);
      }
    }
  }

  // Send message
  async sendMessage(data: SendMessageData) {
    const { conversationId, fromAddress, content, encryptedContent, encryptionMetadata } = data;

    safeLogger.info(`[MessagingService] sendMessage called for conversation ${conversationId} from ${fromAddress}`);
    try {
      // Check if user is participant
      const conversation = await this.getConversationDetails({ conversationId, userAddress: fromAddress });
      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found or access denied'
        };
      }

      // TODO: Implement rate limiting
      // Check if user has sent > 100 messages in last minute
      // Use Redis or in-memory cache for tracking

      // Sanitize message content to prevent XSS attacks
      // Note: Encrypted content should NOT be sanitized as it would break decryption
      const sanitizedMessage = encryptedContent
        ? { content: encryptedContent, messageType: data.contentType, attachments: data.attachments }
        : sanitizeMessage({
          content,
          messageType: data.contentType,
          attachments: data.attachments
        });

      const messageContent = sanitizedMessage.content || '';

      // Validate message size (10KB limit)
      // Use Buffer.byteLength instead of Buffer to ensure compatibility with all Node.js environments
      const contentSize = Buffer.byteLength(messageContent, 'utf8');
      if (contentSize > 10240) {
        return {
          success: false,
          message: 'Message content exceeds 10KB limit'
        };
      }

      const newMessage = await db
        .insert(chatMessages)
        .values({
          conversationId,
          senderAddress: fromAddress,
          content: messageContent,
          messageType: sanitizedMessage.messageType || 'text',
          encryptionMetadata: data.encryptionMetadata || null,
          replyToId: data.replyToId,
          attachments: sanitizedMessage.attachments || [], // Default to empty array for JSONB
          sentAt: new Date() 
        })
        .returning();

      // Update conversation last activity and last message
      // Wrap in try-catch to avoid failing the whole message send if conversation table 
      // is missing some of the newer columns in production
      try {
        await db
          .update(conversations)
          .set({
            lastActivity: new Date(),
            lastMessageId: newMessage[0].id,
            updatedAt: new Date()
          })
          .where(eq(conversations.id, conversationId));
      } catch (updateError) {
        safeLogger.warn(`Failed to update conversation metadata for ${conversationId}:`, updateError);
        // Continue anyway as the message was successfully saved
      }

      // Send notification to other participants
      // Safely handle participants parsing (might be string or object)
      let participants: string[];
      try {
        if (typeof conversation.participants === 'string') {
          participants = JSON.parse(conversation.participants);
        } else if (Array.isArray(conversation.participants)) {
          participants = conversation.participants as string[];
        } else {
          safeLogger.warn(`Unexpected participants format for conversation ${conversationId}:`, typeof conversation.participants);
          participants = [];
        }
      } catch (parseError) {
        safeLogger.error(`Error parsing participants for conversation ${conversationId}:`, parseError);
        participants = [];
      }

      const otherParticipants = participants.filter((p: string) => p && p.toLowerCase() !== fromAddress.toLowerCase());

      // Send notifications to other participants
      for (const participant of otherParticipants) {
        try {
          // Check for mentions in the message
          const mentionRegex = /@([a-zA-Z0-9_]+)/g;
          const mentions = messageContent.match(mentionRegex);
          const isMentioned = mentions && mentions.some(m => {
            const mentionedAddress = m.substring(1).toLowerCase();
            return mentionedAddress === participant.toLowerCase();
          });

          // Create notification data
          const notificationData = {
            userAddress: participant,
            type: isMentioned ? 'mention' : 'message',
            title: isMentioned ? 'You were mentioned in a message' : 'New message',
            message: messageContent.length > 100
              ? messageContent.substring(0, 100) + '...'
              : messageContent,
            data: {
              conversationId,
              messageId: newMessage[0].id,
              senderAddress: fromAddress,
              isMentioned
            },
            priority: 'medium' as const
          };

          // Send notification via CommunityNotificationService (handles DB, Email, Push)
          await communityNotificationService.sendNotification({
            userAddress: participant,
            communityId: conversationId, // Using conversationId as context
            communityName: 'Private Message', // Generic name or specific if group
            type: isMentioned ? 'mention' : 'new_post', // Mapping roughly to supported types
            title: notificationData.title,
            message: notificationData.message,
            actionUrl: `/messages/${conversationId}`,
            userName: fromAddress, // Simplified for now
            metadata: notificationData.data
          });

          // Send real-time notification via WebSocket
          const wsService = getWebSocketService();
          if (wsService) {
            wsService.sendToUser(participant, 'notification:new', {
              id: `msg_${newMessage[0].id}`,
              type: isMentioned ? 'mention' : 'message',
              category: isMentioned ? 'comment_mention' : 'direct_message',
              title: notificationData.title,
              message: notificationData.message,
              data: notificationData.data,
              fromAddress: fromAddress,
              priority: 'medium',
              isRead: false,
              createdAt: new Date()
            });
          }

          safeLogger.info(`Message notification sent to ${participant} for conversation ${conversationId}`);
        } catch (notifyError) {
          safeLogger.error(`Failed to send message notification to ${participant}:`, notifyError);
          // Don't fail the message send if notification fails
        }
      }

      return {
        success: true,
        data: {
          ...newMessage[0],
          encryptionMetadata: encryptionMetadata || null
        }
      };
    } catch (error: any) {
      safeLogger.error('Error sending message:', {
        error,
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        params: { conversationId, fromAddress, contentType: data.contentType }
      });

      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      // Re-throw original error if it's already specific, otherwise generic
      if (error instanceof Error && error.message.includes('limit')) {
        throw error;
      }
      // Return the exact error details for debugging
      throw new Error(`Failed to send message: [${error?.name || 'Unknown'}] ${error?.message || 'Unknown error'}`);
    }
  }

  // Mark conversation as read
  async markConversationAsRead(data: { conversationId: string; userAddress: string }) {
    const { conversationId, userAddress } = data;

    try {
      this.validateAddress(userAddress);
      // Check if user is participant
      const conversation = await this.getConversationDetails({ conversationId, userAddress });
      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found or access denied'
        };
      }

      // Get unread messages (not sent by this user)
      const messages = await db
        .select({ id: chatMessages.id })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.conversationId, conversationId),
            sql`${chatMessages.senderAddress} != ${userAddress}`
          )
        );

      // Mark each message as read
      for (const msg of messages) {
        await db
          .insert(messageReadStatus)
          .values({
            messageId: msg.id,
            userAddress,
            readAt: new Date()
          })
          .onConflictDoNothing();
      }

      return {
        success: true,
        data: null
      };
    } catch (error) {
      safeLogger.error('Error marking conversation as read:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to mark conversation as read');
    }
  }

  // Delete conversation
  async deleteConversation(data: { conversationId: string; userAddress: string }) {
    const { conversationId, userAddress } = data;

    try {
      // Check if user is participant
      const conversation = await this.getConversationDetails({ conversationId, userAddress });
      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found or access denied'
        };
      }

      // Parse participants from JSON safely
      let participants: string[];
      if (typeof conversation.participants === 'string') {
        participants = JSON.parse(conversation.participants);
      } else {
        participants = conversation.participants as unknown as string[];
      }

      const normalizedUserAddress = userAddress.toLowerCase();
      const updatedParticipants = participants.filter((p: string) => p !== normalizedUserAddress);

      if (updatedParticipants.length === 0) {
        // If no participants left, delete the conversation and messages
        await db.delete(chatMessages).where(eq(chatMessages.conversationId, conversationId));
        await db.delete(conversations).where(eq(conversations.id, conversationId));
      } else {
        // Update participants list
        await db
          .update(conversations)
          .set({
            participants: JSON.stringify(updatedParticipants)
          })
          .where(eq(conversations.id, conversationId));
      }

      return {
        success: true,
        data: null
      };
    } catch (error) {
      safeLogger.error('Error deleting conversation:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to delete conversation');
    }
  }

  // Archive conversation
  async archiveConversation(data: { conversationId: string; userAddress: string }) {
    const { conversationId, userAddress } = data;

    try {
      const conversation = await this.getConversationDetails({ conversationId, userAddress });
      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found or access denied'
        };
      }

      // Get current archived users
      const archivedBy = JSON.parse(conversation.archivedBy as string || '[]');
      if (!archivedBy.includes(userAddress)) {
        archivedBy.push(userAddress);

        await db
          .update(conversations)
          .set({ archivedBy: JSON.stringify(archivedBy) })
          .where(eq(conversations.id, conversationId));
      }

      return {
        success: true,
        data: null
      };
    } catch (error) {
      safeLogger.error('Error archiving conversation:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to archive conversation');
    }
  }

  // Unarchive conversation
  async unarchiveConversation(data: { conversationId: string; userAddress: string }) {
    const { conversationId, userAddress } = data;

    try {
      const conversation = await this.getConversationDetails({ conversationId, userAddress });
      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found or access denied'
        };
      }

      // Get current archived users and remove this user
      const archivedBy = JSON.parse(conversation.archivedBy as string || '[]');
      const updatedArchivedBy = archivedBy.filter((addr: string) => addr !== userAddress);

      await db
        .update(conversations)
        .set({ archivedBy: JSON.stringify(updatedArchivedBy) })
        .where(eq(conversations.id, conversationId));

      return {
        success: true,
        data: null
      };
    } catch (error) {
      safeLogger.error('Error unarchiving conversation:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to unarchive conversation');
    }
  }

  // Encrypt message - Backend doesn't encrypt, just stores encrypted content from frontend
  async encryptMessage(data: EncryptMessageData) {
    // Backend should NOT decrypt messages - E2EE principle
    // Frontend handles encryption, backend just stores encrypted content
    return {
      success: true,
      message: 'Backend stores encrypted content without decrypting - E2EE maintained'
    };
  }

  // Decrypt message - Backend doesn't decrypt, maintains E2EE
  async decryptMessage(data: DecryptMessageData) {
    // Backend should NOT decrypt messages - E2EE principle
    // Frontend handles decryption with user's private keys
    return {
      success: false,
      message: 'Backend cannot decrypt messages - E2EE maintained, decrypt on frontend'
    };
  }

  // Update message status
  async updateMessageStatus(data: { messageId: string; status: string; userAddress: string }) {
    const { messageId, status, userAddress } = data;

    try {
      // Check if user has permission to update this message status
      const message = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, messageId))
        .limit(1);

      if (message.length === 0) {
        return {
          success: false,
          message: 'Message not found'
        };
      }

      // Check if user is participant in the conversation
      const conversation = await this.getConversationDetails({
        conversationId: message[0].conversationId,
        userAddress
      });

      if (!conversation) {
        return {
          success: false,
          message: 'Access denied'
        };
      }

      // For now, just return success since we don't have a delivery status field
      // This would need to be implemented when message status tracking is added
      return {
        success: true,
        data: { messageId, status, updatedAt: new Date() }
      };
    } catch (error) {
      safeLogger.error('Error updating message status:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to update message status');
    }
  }

  // Delete message
  async deleteMessage(data: { messageId: string; userAddress: string }) {
    const { messageId, userAddress } = data;

    try {
      const message = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, messageId))
        .limit(1);

      if (message.length === 0) {
        return {
          success: false,
          message: 'Message not found'
        };
      }

      // Only allow sender to delete their own messages
      if (message[0].senderAddress !== userAddress) {
        return {
          success: false,
          message: 'Can only delete your own messages'
        };
      }

      // Soft delete by setting deletedAt timestamp
      await db
        .update(chatMessages)
        .set({ deletedAt: new Date() })
        .where(eq(chatMessages.id, messageId));

      return {
        success: true,
        data: null
      };
    } catch (error) {
      safeLogger.error('Error deleting message:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to delete message');
    }
  }

  // Search messages
  async searchMessages(data: {
    userAddress: string;
    query: string;
    conversationId?: string;
    page: number;
    limit: number;
  }) {
    const { userAddress, query, conversationId, page, limit } = data;
    const offset = (page - 1) * limit;

    try {
      this.validateAddress(userAddress);
      let whereConditions = [
        like(chatMessages.content, `%${query}%`)
      ];

      if (conversationId) {
        whereConditions.push(eq(chatMessages.conversationId, conversationId));
      }

      // Only search in conversations where user is a participant
      const searchResults = await db
        .select({
          id: chatMessages.id,
          conversationId: chatMessages.conversationId,
          senderAddress: chatMessages.senderAddress,
          content: chatMessages.content,
          sentAt: chatMessages.sentAt,
          messageType: chatMessages.messageType
        })
        .from(chatMessages)
        .innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
        .where(
          and(
            ...whereConditions,
            sql`${conversations.participants} ? ${userAddress}`
          )
        )
        .orderBy(desc(chatMessages.sentAt))
        .limit(limit)
        .offset(offset);

      return {
        messages: searchResults,
        pagination: {
          page,
          limit,
          total: searchResults.length
        }
      };
    } catch (error) {
      safeLogger.error('Error searching messages:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to search messages');
    }
  }

  // Get message thread (simplified)
  async getMessageThread(data: { messageId: string; userAddress: string }) {
    // This would need to implement reply threading
    // For now, return empty thread
    return {
      success: true,
      data: {
        parentMessage: null,
        replies: []
      }
    };
  }

  // Block user
  async blockUser(data: { blockerAddress: string; blockedAddress: string; reason?: string }) {
    const { blockerAddress, blockedAddress, reason } = data;

    try {
      // Check if already blocked
      const existing = await db
        .select()
        .from(blockedUsers)
        .where(
          and(
            eq(blockedUsers.blockerAddress, blockerAddress),
            eq(blockedUsers.blockedAddress, blockedAddress)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return {
          success: false,
          message: 'User is already blocked'
        };
      }

      await db
        .insert(blockedUsers)
        .values({
          blockerAddress,
          blockedAddress,
          reason,
          createdAt: new Date()
        });

      return {
        success: true,
        data: null
      };
    } catch (error) {
      safeLogger.error('Error blocking user:', error);
      throw new Error('Failed to block user');
    }
  }

  // Unblock user
  async unblockUser(data: { blockerAddress: string; blockedAddress: string }) {
    const { blockerAddress, blockedAddress } = data;

    try {
      const result = await db
        .delete(blockedUsers)
        .where(
          and(
            eq(blockedUsers.blockerAddress, blockerAddress),
            eq(blockedUsers.blockedAddress, blockedAddress)
          )
        );

      return {
        success: true,
        data: null
      };
    } catch (error) {
      safeLogger.error('Error unblocking user:', error);
      throw new Error('Failed to unblock user');
    }
  }

  // Get blocked users
  async getBlockedUsers(userAddress: string) {
    try {
      const blocked = await db
        .select()
        .from(blockedUsers)
        .where(eq(blockedUsers.blockerAddress, userAddress));

      return blocked.map(b => ({
        blockedAddress: b.blockedAddress,
        reason: b.reason,
        createdAt: b.createdAt
      }));
    } catch (error) {
      safeLogger.error('Error getting blocked users:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to get blocked users');
    }
  }

  // Report content (simplified)
  async reportContent(data: {
    reporterAddress: string;
    targetType: string;
    targetId: string;
    reason: string;
    description?: string;
  }) {
    // This would need a reports table and moderation system
    // For now, just return success
    return {
      success: true,
      data: null
    };
  }

  // Get conversation participants
  async getConversationParticipants(data: { conversationId: string; userAddress: string }) {
    const { conversationId, userAddress } = data;

    try {
      const conversation = await this.getConversationDetails({ conversationId, userAddress });
      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found or access denied'
        };
      }

      // Parse participants from JSON
      const participants = JSON.parse(conversation.participants as string);

      return {
        success: true,
        data: {
          participants
        }
      };
    } catch (error) {
      safeLogger.error('Error getting conversation participants:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to get conversation participants');
    }
  }

  // Add participant to group conversation
  async addParticipant(data: {
    conversationId: string;
    adderAddress: string;
    newParticipantAddress: string;
    role?: string;
  }) {
    try {
      const { conversationId, adderAddress, newParticipantAddress, role = 'member' } = data;

      this.validateAddress(adderAddress);
      this.validateAddress(newParticipantAddress);

      // Get conversation to check permissions
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation.length) {
        return { success: false, message: 'Conversation not found' };
      }

      const conv = conversation[0];

      // Check if conversation is a group
      if (conv.conversationType !== 'group') {
        return { success: false, message: 'Can only add participants to group conversations' };
      }

      // Check if adder is a participant with admin/moderator role
      const adderParticipant = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.walletAddress, adderAddress.toLowerCase()),
            isNull(conversationParticipants.leftAt)
          )
        )
        .limit(1);

      if (!adderParticipant.length) {
        return { success: false, message: 'You are not a member of this conversation' };
      }

      // Check role permissions (admins and moderators can add members)
      const adderRole = adderParticipant[0].role;
      if (adderRole !== 'admin' && adderRole !== 'moderator') {
        return { success: false, message: 'Only admins and moderators can add participants' };
      }

      // Check if new participant is already a member
      const existingParticipant = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.walletAddress, newParticipantAddress.toLowerCase()),
            isNull(conversationParticipants.leftAt)
          )
        )
        .limit(1);

      if (existingParticipant.length) {
        return { success: false, message: 'User is already a participant' };
      }

      // Add the participant
      const newParticipant = await db
        .insert(conversationParticipants)
        .values({
          conversationId,
          walletAddress: newParticipantAddress.toLowerCase(),
          role: role as any,
          joinedAt: new Date()
        })
        .returning();

      // Update conversation participants list
      const currentParticipants = JSON.parse(conv.participants as string);
      if (!currentParticipants.includes(newParticipantAddress.toLowerCase())) {
        currentParticipants.push(newParticipantAddress.toLowerCase());
        await db
          .update(conversations)
          .set({
            participants: JSON.stringify(currentParticipants),
            updatedAt: new Date()
          })
          .where(eq(conversations.id, conversationId));
      }

      // Invalidate cache
      await cacheService.invalidatePattern(`conversations:${conversationId}:*`);

      return {
        success: true,
        data: newParticipant[0],
        message: 'Participant added successfully'
      };
    } catch (error) {
      safeLogger.error('Error adding participant:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to add participant');
    }
  }

  // Remove participant from group conversation
  async removeParticipant(data: {
    conversationId: string;
    removerAddress: string;
    participantAddress: string;
  }) {
    try {
      const { conversationId, removerAddress, participantAddress } = data;

      this.validateAddress(removerAddress);
      this.validateAddress(participantAddress);

      // Get conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation.length) {
        return { success: false, message: 'Conversation not found' };
      }

      const conv = conversation[0];

      // Check if conversation is a group
      if (conv.conversationType !== 'group') {
        return { success: false, message: 'Can only remove participants from group conversations' };
      }

      // Check if remover is a participant
      const removerParticipant = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.walletAddress, removerAddress.toLowerCase()),
            isNull(conversationParticipants.leftAt)
          )
        )
        .limit(1);

      if (!removerParticipant.length) {
        return { success: false, message: 'You are not a member of this conversation' };
      }

      // Users can remove themselves (leave), admins can remove others
      const isSelf = removerAddress.toLowerCase() === participantAddress.toLowerCase();
      const removerRole = removerParticipant[0].role;

      if (!isSelf && removerRole !== 'admin') {
        return { success: false, message: 'Only admins can remove other participants' };
      }

      // Mark participant as left
      await db
        .update(conversationParticipants)
        .set({
          leftAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.walletAddress, participantAddress.toLowerCase()),
            isNull(conversationParticipants.leftAt)
          )
        );

      // Update conversation participants list
      const currentParticipants = JSON.parse(conv.participants as string);
      const updatedParticipants = currentParticipants.filter(
        (p: string) => p.toLowerCase() !== participantAddress.toLowerCase()
      );
      await db
        .update(conversations)
        .set({
          participants: JSON.stringify(updatedParticipants),
          updatedAt: new Date()
        })
        .where(eq(conversations.id, conversationId));

      // Invalidate cache
      await cacheService.invalidatePattern(`conversations:${conversationId}:*`);

      return {
        success: true,
        message: isSelf ? 'You have left the conversation' : 'Participant removed successfully'
      };
    } catch (error) {
      safeLogger.error('Error removing participant:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to remove participant');
    }
  }

  // Update participant role
  async updateParticipantRole(data: {
    conversationId: string;
    updaterAddress: string;
    participantAddress: string;
    newRole: 'admin' | 'moderator' | 'member';
  }) {
    try {
      const { conversationId, updaterAddress, participantAddress, newRole } = data;

      this.validateAddress(updaterAddress);
      this.validateAddress(participantAddress);

      // Check if updater is admin
      const updaterParticipant = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.walletAddress, updaterAddress.toLowerCase()),
            isNull(conversationParticipants.leftAt)
          )
        )
        .limit(1);

      if (!updaterParticipant.length || updaterParticipant[0].role !== 'admin') {
        return { success: false, message: 'Only admins can update roles' };
      }

      // Update the role
      await db
        .update(conversationParticipants)
        .set({
          role: newRole,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.walletAddress, participantAddress.toLowerCase()),
            isNull(conversationParticipants.leftAt)
          )
        );

      return {
        success: true,
        message: 'Participant role updated successfully'
      };
    } catch (error) {
      safeLogger.error('Error updating participant role:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to update participant role');
    }
  }

  // Create group conversation
  async createGroupConversation(data: {
    creatorAddress: string;
    participants: string[];
    name?: string;
    description?: string;
    isPublic?: boolean;
  }) {
    try {
      const { creatorAddress, participants, name, description, isPublic = false } = data;

      this.validateAddress(creatorAddress);
      participants.forEach(p => this.validateAddress(p));

      // Ensure creator is included
      const allParticipants = [creatorAddress.toLowerCase(), ...participants.map(p => p.toLowerCase())];
      const uniqueParticipants = [...new Set(allParticipants)];

      if (uniqueParticipants.length < 2) {
        return { success: false, message: 'Group must have at least 2 participants' };
      }

      // Create the conversation
      const newConversation = await db
        .insert(conversations)
        .values({
          participants: JSON.stringify(uniqueParticipants),
          conversationType: 'group',
          subject: name,
          title: name,
          lastActivity: new Date(),
          contextMetadata: JSON.stringify({
            description,
            isPublic,
            createdBy: creatorAddress.toLowerCase()
          })
        })
        .returning();

      const conversationId = newConversation[0].id;

      // Add all participants to conversationParticipants table
      const participantRecords = uniqueParticipants.map((address, index) => ({
        conversationId,
        walletAddress: address,
        role: index === 0 ? 'admin' : 'member', // Creator is admin
        joinedAt: new Date()
      }));

      await db.insert(conversationParticipants).values(participantRecords);

      return {
        success: true,
        data: {
          id: conversationId,
          participants: uniqueParticipants,
          name,
          description,
          isPublic,
          conversationType: 'group',
          createdAt: newConversation[0].createdAt
        }
      };
    } catch (error) {
      safeLogger.error('Error creating group conversation:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to create group conversation');
    }
  }

  // Get participant details with roles
  async getParticipantsWithRoles(data: {
    conversationId: string;
    userAddress: string;
  }) {
    try {
      const { conversationId, userAddress } = data;

      this.validateAddress(userAddress);

      // Get all active participants
      const participants = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            isNull(conversationParticipants.leftAt)
          )
        );

      return {
        success: true,
        data: participants.map(p => ({
          address: p.walletAddress,
          role: p.role,
          joinedAt: p.joinedAt,
          isMuted: p.isMuted,
          notificationsEnabled: p.notificationsEnabled
        }))
      };
    } catch (error) {
      safeLogger.error('Error getting participants with roles:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to get participants');
    }
  }

  // Helper method to check if user is blocked
  private async checkIfBlocked(userAddress1: string, userAddress2: string): Promise<boolean> {
    try {
      this.validateAddress(userAddress1);
      this.validateAddress(userAddress2);
      const blocked = await db
        .select()
        .from(blockedUsers)
        .where(
          or(
            and(
              eq(blockedUsers.blockerAddress, userAddress1),
              eq(blockedUsers.blockedAddress, userAddress2)
            ),
            and(
              eq(blockedUsers.blockerAddress, userAddress2),
              eq(blockedUsers.blockedAddress, userAddress1)
            )
          )
        )
        .limit(1);

      return blocked.length > 0;
    } catch (error) {
      safeLogger.error('Error checking if user is blocked:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      return false;
    }
  }

  // MEMORY OPTIMIZATION: Get memory usage statistics
  public getMemoryUsage(): {
    activeConnections: number;
    lastCleanup: number;
    cacheStats?: any;
  } {
    return {
      activeConnections: this.activeConnections.size,
      lastCleanup: this.lastCleanup,
      cacheStats: cacheService ? cacheService.getStats() : null
    };
  }

  // MEMORY OPTIMIZATION: Force cleanup
  public async forceCleanup(): Promise<void> {
    await this.performCleanup();
  }

  // MEMORY OPTIMIZATION: Clear user-specific cache
  public async clearUserCache(userAddress: string): Promise<void> {
    try {
      this.validateAddress(userAddress);
      await cacheService.invalidatePattern(`conversations:${userAddress}:*`);
      await cacheService.invalidatePattern(`messages:*:${userAddress}:*`);
      safeLogger.info(`Cleared cache for user ${userAddress}`);
    } catch (error) {
      safeLogger.error('Error clearing user cache:', error);
    }
  }

  // =====================================================
  // PHASE 5: Advanced Features (Reactions, Pinning, Editing, Threading)
  // =====================================================

  // Add reaction to message
  async addReaction(data: {
    messageId: string;
    userAddress: string;
    emoji: string;
  }) {
    const { messageId, userAddress, emoji } = data;

    try {
      this.validateAddress(userAddress);

      // Validate emoji (basic validation - allow Unicode emoji)
      if (!emoji || emoji.length > 32) {
        return { success: false, message: 'Invalid emoji' };
      }

      // Check if message exists and user has access
      const message = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, messageId))
        .limit(1);

      if (!message.length) {
        return { success: false, message: 'Message not found' };
      }

      // Check if user is a participant in the conversation
      const conversation = await this.getConversationDetails({
        conversationId: message[0].conversationId,
        userAddress
      });

      if (!conversation) {
        return { success: false, message: 'Access denied' };
      }

      // Add or update reaction (upsert)
      await db
        .insert(messageReactions)
        .values({
          messageId,
          userAddress: userAddress.toLowerCase(),
          emoji,
          createdAt: new Date()
        })
        .onConflictDoNothing();

      // Get updated reaction counts
      const reactions = await this.getMessageReactions(messageId);

      return {
        success: true,
        data: reactions
      };
    } catch (error) {
      safeLogger.error('Error adding reaction:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to add reaction');
    }
  }

  // Remove reaction from message
  async removeReaction(data: {
    messageId: string;
    userAddress: string;
    emoji: string;
  }) {
    const { messageId, userAddress, emoji } = data;

    try {
      this.validateAddress(userAddress);

      await db
        .delete(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, messageId),
            eq(messageReactions.userAddress, userAddress.toLowerCase()),
            eq(messageReactions.emoji, emoji)
          )
        );

      // Get updated reaction counts
      const reactions = await this.getMessageReactions(messageId);

      return {
        success: true,
        data: reactions
      };
    } catch (error) {
      safeLogger.error('Error removing reaction:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to remove reaction');
    }
  }

  // Get reactions for a message
  async getMessageReactions(messageId: string) {
    try {
      const reactions = await db
        .select({
          emoji: messageReactions.emoji,
          count: count(messageReactions.id),
          users: sql<string[]>`array_agg(${messageReactions.userAddress})`
        })
        .from(messageReactions)
        .where(eq(messageReactions.messageId, messageId))
        .groupBy(messageReactions.emoji);

      return reactions.map(r => ({
        emoji: r.emoji,
        count: Number(r.count),
        users: r.users || []
      }));
    } catch (error) {
      safeLogger.error('Error getting message reactions:', error);
      return [];
    }
  }

  // Pin message
  async pinMessage(data: {
    messageId: string;
    userAddress: string;
  }) {
    const { messageId, userAddress } = data;

    try {
      this.validateAddress(userAddress);

      // Get message and check permissions
      const message = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, messageId))
        .limit(1);

      if (!message.length) {
        return { success: false, message: 'Message not found' };
      }

      const conversationId = message[0].conversationId;

      // Check if user has permission to pin (admin or moderator for groups)
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation.length) {
        return { success: false, message: 'Conversation not found' };
      }

      // For group conversations, check role
      if (conversation[0].conversationType === 'group') {
        const participant = await db
          .select()
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              eq(conversationParticipants.walletAddress, userAddress.toLowerCase()),
              isNull(conversationParticipants.leftAt)
            )
          )
          .limit(1);

        if (!participant.length) {
          return { success: false, message: 'Not a member of this conversation' };
        }

        const role = participant[0].role;
        if (role !== 'admin' && role !== 'moderator') {
          return { success: false, message: 'Only admins and moderators can pin messages' };
        }
      } else {
        // For direct conversations, any participant can pin
        const participants = JSON.parse(conversation[0].participants as string);
        if (!participants.includes(userAddress.toLowerCase())) {
          return { success: false, message: 'Not a member of this conversation' };
        }
      }

      // Pin the message
      await db
        .update(chatMessages)
        .set({
          isPinned: true,
          pinnedBy: userAddress.toLowerCase(),
          pinnedAt: new Date()
        })
        .where(eq(chatMessages.id, messageId));

      return {
        success: true,
        message: 'Message pinned successfully'
      };
    } catch (error) {
      safeLogger.error('Error pinning message:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to pin message');
    }
  }

  // Unpin message
  async unpinMessage(data: {
    messageId: string;
    userAddress: string;
  }) {
    const { messageId, userAddress } = data;

    try {
      this.validateAddress(userAddress);

      // Get message
      const message = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, messageId))
        .limit(1);

      if (!message.length) {
        return { success: false, message: 'Message not found' };
      }

      // Check if user has access to unpin
      const conversation = await this.getConversationDetails({
        conversationId: message[0].conversationId,
        userAddress
      });

      if (!conversation) {
        return { success: false, message: 'Access denied' };
      }

      // Unpin the message
      await db
        .update(chatMessages)
        .set({
          isPinned: false,
          pinnedBy: null,
          pinnedAt: null
        })
        .where(eq(chatMessages.id, messageId));

      return {
        success: true,
        message: 'Message unpinned successfully'
      };
    } catch (error) {
      safeLogger.error('Error unpinning message:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to unpin message');
    }
  }

  // Get pinned messages for a conversation
  async getPinnedMessages(data: {
    conversationId: string;
    userAddress: string;
  }) {
    const { conversationId, userAddress } = data;

    try {
      this.validateAddress(userAddress);

      // Check if user has access to conversation
      const conversation = await this.getConversationDetails({ conversationId, userAddress });
      if (!conversation) {
        return { success: false, message: 'Access denied' };
      }

      const pinnedMessages = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.conversationId, conversationId),
            eq(chatMessages.isPinned, true),
            isNull(chatMessages.deletedAt)
          )
        )
        .orderBy(desc(chatMessages.pinnedAt));

      return {
        success: true,
        data: pinnedMessages
      };
    } catch (error) {
      safeLogger.error('Error getting pinned messages:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to get pinned messages');
    }
  }

  // Edit message
  async editMessage(data: {
    messageId: string;
    userAddress: string;
    newContent: string;
  }) {
    const { messageId, userAddress, newContent } = data;

    try {
      this.validateAddress(userAddress);

      // Get message
      const message = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, messageId))
        .limit(1);

      if (!message.length) {
        return { success: false, message: 'Message not found' };
      }

      // Only sender can edit their own messages
      if (message[0].senderAddress.toLowerCase() !== userAddress.toLowerCase()) {
        return { success: false, message: 'Can only edit your own messages' };
      }

      // Check if message was sent within the edit window (15 minutes)
      const sentAt = message[0].sentAt;
      if (sentAt) {
        const editWindowMs = 15 * 60 * 1000; // 15 minutes
        if (Date.now() - sentAt.getTime() > editWindowMs) {
          return { success: false, message: 'Edit window has expired (15 minutes)' };
        }
      }

      // Validate new content
      if (!newContent || newContent.trim().length === 0) {
        return { success: false, message: 'Message content cannot be empty' };
      }

      if (newContent.length > 10240) {
        return { success: false, message: 'Message content too long (max 10KB)' };
      }

      // Sanitize content
      const sanitized = sanitizeMessage({
        content: newContent,
        messageType: message[0].messageType || 'text',
        attachments: []
      });

      // Update message
      const updatedMessage = await db
        .update(chatMessages)
        .set({
          content: sanitized.content,
          editedAt: new Date()
        })
        .where(eq(chatMessages.id, messageId))
        .returning();

      return {
        success: true,
        data: updatedMessage[0]
      };
    } catch (error) {
      safeLogger.error('Error editing message:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to edit message');
    }
  }

  // Get full message thread (parent + all replies)
  async getFullMessageThread(data: {
    messageId: string;
    userAddress: string;
  }) {
    const { messageId, userAddress } = data;

    try {
      this.validateAddress(userAddress);

      // Get the message
      const message = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, messageId))
        .limit(1);

      if (!message.length) {
        return { success: false, message: 'Message not found' };
      }

      // Check if user has access
      const conversation = await this.getConversationDetails({
        conversationId: message[0].conversationId,
        userAddress
      });

      if (!conversation) {
        return { success: false, message: 'Access denied' };
      }

      // Find the root message (if this is a reply, find the original)
      let rootMessageId = messageId;
      let currentMessage = message[0];

      // Walk up the reply chain to find root
      while (currentMessage.replyToId) {
        const parentMessage = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.id, currentMessage.replyToId))
          .limit(1);

        if (parentMessage.length) {
          rootMessageId = parentMessage[0].id;
          currentMessage = parentMessage[0];
        } else {
          break;
        }
      }

      // Get the root message
      const rootMessage = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, rootMessageId))
        .limit(1);

      // Get all direct replies to the root message
      const replies = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.replyToId, rootMessageId),
            isNull(chatMessages.deletedAt)
          )
        )
        .orderBy(asc(chatMessages.sentAt));

      // Get reactions for root and replies
      const allMessageIds = [rootMessageId, ...replies.map(r => r.id)];
      const reactionsMap: { [key: string]: any[] } = {};

      for (const msgId of allMessageIds) {
        reactionsMap[msgId] = await this.getMessageReactions(msgId);
      }

      return {
        success: true,
        data: {
          parentMessage: {
            ...rootMessage[0],
            reactions: reactionsMap[rootMessageId] || []
          },
          replies: replies.map(r => ({
            ...r,
            reactions: reactionsMap[r.id] || []
          })),
          replyCount: replies.length
        }
      };
    } catch (error) {
      safeLogger.error('Error getting full message thread:', error);
      if (error instanceof Error && error.message.includes('database')) {
        throw new Error('Messaging service temporarily unavailable. Database connection error.');
      }
      throw new Error('Failed to get message thread');
    }
  }

  // Get reply count for a message
  async getReplyCount(messageId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.replyToId, messageId),
            isNull(chatMessages.deletedAt)
          )
        );

      return Number(result[0]?.count || 0);
    } catch (error) {
      safeLogger.error('Error getting reply count:', error);
      return 0;
    }
  }
}

export const messagingService = new MessagingService();

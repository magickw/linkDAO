import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { conversations, chatMessages, blockedUsers, messageReadStatus } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
// import { notificationService } from './notificationService';
import { eq, desc, asc, and, or, like, inArray, sql, gt, lt } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeMessage, sanitizeConversation, sanitizeSearchQuery } from '../utils/sanitization';
import { safeLogger } from '../utils/safeLogger';

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
  // Helper method to validate Ethereum addresses and prevent SQL injection
  private validateAddress(address: string): void {
    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      throw new Error('Invalid Ethereum address format');
    }
  }
  // Get user's conversations
  async getConversations(options: GetConversationsOptions) {
    const { userAddress, page, limit } = options;
    const offset = (page - 1) * limit;

    try {
      this.validateAddress(userAddress);
      const userConversations = await db
        .select({
          id: conversations.id,
          title: conversations.title,
          participants: conversations.participants,
          lastActivity: conversations.lastActivity,
          unreadCount: conversations.unreadCount,
          createdAt: conversations.createdAt,
          // Get last message
          lastMessage: sql<any>`
            (SELECT json_build_object(
              'id', m.id,
              'content', m.content,
              'sender_address', m.sender_address,
              'sent_at', m.sent_at
            )
            FROM chat_messages m 
            WHERE m.conversation_id = ${conversations.id}
            ORDER BY m.sent_at DESC 
            LIMIT 1)
          `
        })
        .from(conversations)
        .where(sql`participants::jsonb ? ${userAddress}`)
        .orderBy(desc(conversations.lastActivity))
        .limit(limit)
        .offset(offset);

      return {
        conversations: userConversations,
        pagination: {
          page,
          limit,
          total: userConversations.length
        }
      };
    } catch (error) {
      safeLogger.error('Error getting conversations:', error);
      throw new Error('Failed to get conversations');
    }
  }

  // Start new conversation
  async startConversation(data: StartConversationData) {
    const { initiatorAddress, participantAddress, initialMessage } = data;

    try {
      this.validateAddress(initiatorAddress);
      this.validateAddress(participantAddress);
      // Check if conversation already exists between these participants
      const existingConversation = await db
        .select()
        .from(conversations)
        .where(
          and(
            sql`participants @> ${JSON.stringify([initiatorAddress])}::jsonb`,
            sql`participants @> ${JSON.stringify([participantAddress])}::jsonb`
          )
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
      const isBlocked = await this.checkIfBlocked(initiatorAddress, participantAddress);
      if (isBlocked) {
        return {
          success: false,
          message: 'Cannot start conversation with blocked user'
        };
      }

      // Create new conversation
      const participants = [initiatorAddress, participantAddress];

      const newConversation = await db
        .insert(conversations)
        .values({
          participants: JSON.stringify(participants),
          lastActivity: new Date(),
          createdAt: new Date()
        })
        .returning();

      // Send initial message if provided
      if (initialMessage) {
        await this.sendMessage({
          conversationId: newConversation[0].id,
          fromAddress: initiatorAddress,
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
      throw new Error('Failed to start conversation');
    }
  }

  // Get conversation details
  async getConversationDetails(data: { conversationId: string; userAddress: string }) {
    const { conversationId, userAddress } = data;

    try {
      this.validateAddress(userAddress);
      const conversation = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            sql`participants::jsonb ? ${userAddress}`
          )
        )
        .limit(1);

      if (conversation.length === 0) {
        return null;
      }

      return conversation[0];
    } catch (error) {
      safeLogger.error('Error getting conversation details:', error);
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
      // Validate UUID format for before/after parameters
      if (before && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(before)) {
        throw new Error('Invalid before parameter format');
      }
      if (after && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(after)) {
        throw new Error('Invalid after parameter format');
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
      let whereConditions = [eq(chatMessages.conversationId, conversationId)];

      // Add pagination filters
      if (before) {
        whereConditions.push(lt(chatMessages.sentAt, sql`(SELECT timestamp FROM chat_messages WHERE id = ${before})`));
      }
      if (after) {
        whereConditions.push(gt(chatMessages.sentAt, sql`(SELECT timestamp FROM chat_messages WHERE id = ${after})`));
      }

      const conversationMessages = await db
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
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: {
          messages: conversationMessages,
          pagination: {
            page,
            limit,
            total: conversationMessages.length
          }
        }
      };
    } catch (error) {
      safeLogger.error('Error getting conversation messages:', error);
      throw new Error('Failed to get conversation messages');
    }
  }

  // Send message
  async sendMessage(data: SendMessageData) {
    const { conversationId, fromAddress, content, encryptedContent, encryptionMetadata } = data;

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

      const messageContent = sanitizedMessage.content;

      // Validate message size (10KB limit)
      const contentSize = new Blob([messageContent]).size;
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
          encryptionMetadata: data.encryptionMetadata,
          replyToId: data.replyToId,
          attachments: sanitizedMessage.attachments ? JSON.stringify(sanitizedMessage.attachments) : null,
          sentAt: new Date()
        })
        .returning();

      // Update conversation last activity and last message
      await db
        .update(conversations)
        .set({
          lastActivity: new Date(),
          lastMessageId: newMessage[0].id
        })
        .where(eq(conversations.id, conversationId));

      // Send notification to other participants
      const participants = JSON.parse(conversation.participants as string);
      const otherParticipants = participants.filter((p: string) => p !== fromAddress);

      // TODO: Implement messaging notifications
      // for (const participant of otherParticipants) {
      //   await notificationService.notifyNewMessage(
      //     participant,
      //     fromAddress,
      //     newMessage[0]
      //   );
      // }

      return {
        success: true,
        data: {
          ...newMessage[0],
          encryptionMetadata: encryptionMetadata || null
        }
      };
    } catch (error) {
      safeLogger.error('Error sending message:', error);
      throw new Error('Failed to send message');
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

      // Parse participants from JSON
      const participants = JSON.parse(conversation.participants as string);
      const updatedParticipants = participants.filter((p: string) => p !== userAddress);

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
            sql`participants::jsonb ? ${userAddress}`
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
      throw new Error('Failed to get conversation participants');
    }
  }

  // Add participant (simplified)
  async addParticipant(data: {
    conversationId: string;
    adderAddress: string;
    newParticipantAddress: string;
  }) {
    // This would need proper group conversation management
    return {
      success: false,
      message: 'Group conversation management not implemented yet'
    };
  }

  // Remove participant (simplified)
  async removeParticipant(data: {
    conversationId: string;
    removerAddress: string;
    participantAddress: string;
  }) {
    // This would need proper group conversation management
    return {
      success: false,
      message: 'Group conversation management not implemented yet'
    };
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
      return false;
    }
  }
}

export const messagingService = new MessagingService();
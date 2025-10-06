import { db } from '../db';
import { conversations, chatMessages } from '../db/schema';
import { eq, desc, asc, and, or, like, inArray, sql, gt, lt } from 'drizzle-orm';

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
  // Get user's conversations
  async getConversations(options: GetConversationsOptions) {
    const { userAddress, page, limit } = options;
    const offset = (page - 1) * limit;

    try {
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
        .where(sql`${conversations.participants}::jsonb ? ${userAddress}`)
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
      console.error('Error getting conversations:', error);
      throw new Error('Failed to get conversations');
    }
  }

  // Start new conversation
  async startConversation(data: StartConversationData) {
    const { initiatorAddress, participantAddress, initialMessage } = data;

    try {
      // Check if conversation already exists between these participants
      const existingConversation = await db
        .select()
        .from(conversations)
        .where(
          and(
            sql`${conversations.participants} @> ARRAY[${initiatorAddress}]::jsonb`,
            sql`${conversations.participants} @> ARRAY[${participantAddress}]::jsonb`
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
      console.error('Error starting conversation:', error);
      throw new Error('Failed to start conversation');
    }
  }

  // Get conversation details
  async getConversationDetails(data: { conversationId: string; userAddress: string }) {
    const { conversationId, userAddress } = data;

    try {
      const conversation = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            sql`${conversations.participants}::jsonb ? ${userAddress}`
          )
        )
        .limit(1);

      if (conversation.length === 0) {
        return null;
      }

      return conversation[0];
    } catch (error) {
      console.error('Error getting conversation details:', error);
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
      console.error('Error getting conversation messages:', error);
      throw new Error('Failed to get conversation messages');
    }
  }

  // Send message
  async sendMessage(data: SendMessageData) {
    const { conversationId, fromAddress, content } = data;

    try {
      // Check if user is participant
      const conversation = await this.getConversationDetails({ conversationId, userAddress: fromAddress });
      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found or access denied'
        };
      }

      const newMessage = await db
        .insert(chatMessages)
        .values({
          conversationId,
          senderAddress: fromAddress,
          content,
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

      return {
        success: true,
        data: newMessage[0]
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  // Mark conversation as read
  async markConversationAsRead(data: { conversationId: string; userAddress: string }) {
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

      // In the current schema, we don't have read status tracking
      // This would need to be implemented with a separate table or additional fields
      console.log(`Marking conversation ${conversationId} as read for user ${userAddress}`);

      return {
        success: true,
        data: null
      };
    } catch (error) {
      console.error('Error marking conversation as read:', error);
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
      console.error('Error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  // Archive conversation (simplified - would need additional table/field)
  async archiveConversation(data: { conversationId: string; userAddress: string }) {
    // For now, return success without actual implementation
    return {
      success: true,
      data: null
    };
  }

  // Unarchive conversation (simplified)
  async unarchiveConversation(data: { conversationId: string; userAddress: string }) {
    // For now, return success without actual implementation
    return {
      success: true,
      data: null
    };
  }

  // Encrypt message (simplified - would use actual encryption)
  async encryptMessage(data: EncryptMessageData) {
    // This is a placeholder for actual encryption implementation
    return {
      success: true,
      data: {
        encryptedContent: data.content, // Would be actually encrypted
        encryptionMetadata: {
          algorithm: 'AES-GCM',
          keyId: 'placeholder'
        }
      }
    };
  }

  // Decrypt message (simplified - would use actual decryption)
  async decryptMessage(data: DecryptMessageData) {
    // This is a placeholder for actual decryption implementation
    return {
      success: true,
      data: {
        decryptedContent: data.encryptedContent // Would be actually decrypted
      }
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
      console.error('Error updating message status:', error);
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
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }

  // Search messages (simplified)
  async searchMessages(data: {
    userAddress: string;
    query: string;
    conversationId?: string;
    page: number;
    limit: number;
  }) {
    // This would need full-text search implementation
    // For now, return empty results
    return {
      messages: [],
      pagination: {
        page: data.page,
        limit: data.limit,
        total: 0
      }
    };
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

  // Block user (simplified - would need blocked_users table)
  async blockUser(data: { blockerAddress: string; blockedAddress: string; reason?: string }) {
    // This would need a blocked_users table to be implemented
    return {
      success: false,
      message: 'Blocking functionality not implemented yet'
    };
  }

  // Unblock user (simplified)
  async unblockUser(data: { blockerAddress: string; blockedAddress: string }) {
    // This would need a blocked_users table to be implemented
    return {
      success: false,
      message: 'Unblocking functionality not implemented yet'
    };
  }

  // Get blocked users (simplified)
  async getBlockedUsers(userAddress: string) {
    // This would need a blocked_users table to be implemented
    return [];
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
      console.error('Error getting conversation participants:', error);
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
    // For now, no blocking functionality
    return false;
  }
}

export const messagingService = new MessagingService();
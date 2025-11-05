/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { messagingService } from '../services/messagingService';
import { apiResponse } from '../utils/apiResponse';

export class MessagingController {
  // Get user's conversations
  async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const {
        page = 1,
        limit = 20,
        search
      } = req.query;

      const conversations = await messagingService.getConversations({
        userAddress,
        page: Number(page),
        limit: Number(limit),
        search: search as string
      });

      res.json(apiResponse.success(conversations, 'Conversations retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting conversations:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve conversations'));
    }
  }

  // Start new conversation
  async startConversation(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const {
        participantAddress,
        initialMessage,
        conversationType = 'direct',
        communityId
      } = req.body;

      const conversation = await messagingService.startConversation({
        initiatorAddress: userAddress,
        participantAddress,
        initialMessage,
        conversationType,
        communityId
      });

      if (!conversation.success) {
        res.status(400).json(apiResponse.error((conversation as any).message, 400));
        return;
      }

      res.status(201).json(apiResponse.success(conversation.data || conversation, 'Conversation started successfully'));
    } catch (error) {
      safeLogger.error('Error starting conversation:', error);
      res.status(500).json(apiResponse.error('Failed to start conversation'));
    }
  }

  // Get conversation details
  async getConversationDetails(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const conversation = await messagingService.getConversationDetails({
        conversationId: id,
        userAddress
      });

      if (!conversation) {
        res.status(404).json(apiResponse.error('Conversation not found', 404));
        return;
      }

      res.json(apiResponse.success(conversation, 'Conversation details retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting conversation details:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve conversation details'));
    }
  }

  // Get conversation messages
  async getConversationMessages(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const {
        page = 1,
        limit = 50,
        before,
        after
      } = req.query;

      const messages = await messagingService.getConversationMessages({
        conversationId: id,
        userAddress,
        page: Number(page),
        limit: Number(limit),
        before: before as string,
        after: after as string
      });

      if (!messages.success) {
        res.status(400).json(apiResponse.error((messages as any).message, 400));
        return;
      }

      res.json(apiResponse.success(messages.data || messages, 'Messages retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting conversation messages:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve messages'));
    }
  }

  // Send message
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      // Basic rate limiting check (100 messages per minute)
      const rateLimitKey = `msg_rate_${userAddress}`;
      // Note: In production, use Redis for rate limiting
      // For now, this is a placeholder for the rate limiting logic
      
      const { id } = req.params;
      const {
        content,
        contentType = 'text',
        replyToId,
        attachments = [],
        encryptionMetadata
      } = req.body;

      // Validate message content length (max 10KB)
      if (content && content.length > 10240) {
        res.status(400).json(apiResponse.error('Message content too large (max 10KB)', 400));
        return;
      }

      const message = await messagingService.sendMessage({
        conversationId: id,
        fromAddress: userAddress,
        content,
        encryptedContent: encryptionMetadata ? content : undefined,
        contentType,
        replyToId,
        attachments,
        encryptionMetadata
      });

      if (!message.success) {
        res.status(400).json(apiResponse.error((message as any).message, 400));
        return;
      }

      res.status(201).json(apiResponse.success(message.data || message, 'Message sent successfully'));
    } catch (error) {
      safeLogger.error('Error sending message:', error);
      res.status(500).json(apiResponse.error('Failed to send message'));
    }
  }

  // Mark conversation as read
  async markConversationAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await messagingService.markConversationAsRead({
        conversationId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(null, 'Conversation marked as read'));
    } catch (error) {
      safeLogger.error('Error marking conversation as read:', error);
      res.status(500).json(apiResponse.error('Failed to mark conversation as read'));
    }
  }

  // Delete conversation
  async deleteConversation(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await messagingService.deleteConversation({
        conversationId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(null, 'Conversation deleted successfully'));
    } catch (error) {
      safeLogger.error('Error deleting conversation:', error);
      res.status(500).json(apiResponse.error('Failed to delete conversation'));
    }
  }

  // Archive conversation
  async archiveConversation(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await messagingService.archiveConversation({
        conversationId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(null, 'Conversation archived successfully'));
    } catch (error) {
      safeLogger.error('Error archiving conversation:', error);
      res.status(500).json(apiResponse.error('Failed to archive conversation'));
    }
  }

  // Unarchive conversation
  async unarchiveConversation(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await messagingService.unarchiveConversation({
        conversationId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(null, 'Conversation unarchived successfully'));
    } catch (error) {
      safeLogger.error('Error unarchiving conversation:', error);
      res.status(500).json(apiResponse.error('Failed to unarchive conversation'));
    }
  }

  // Encrypt message content
  async encryptMessage(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { content, recipientPublicKey } = req.body;

      const encryptedMessage = await messagingService.encryptMessage({
        messageId: id,
        content,
        recipientPublicKey,
        senderAddress: userAddress
      });

      if (!encryptedMessage.success) {
        res.status(400).json(apiResponse.error(encryptedMessage.message, 400));
        return;
      }

      res.json(apiResponse.success(encryptedMessage, 'Message encrypted successfully'));
    } catch (error) {
      safeLogger.error('Error encrypting message:', error);
      res.status(500).json(apiResponse.error('Failed to encrypt message'));
    }
  }

  // Decrypt message content
  async decryptMessage(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { encryptedContent, encryptionMetadata } = req.body;

      const decryptedMessage = await messagingService.decryptMessage({
        messageId: id,
        encryptedContent,
        encryptionMetadata,
        recipientAddress: userAddress
      });

      if (!decryptedMessage.success) {
        res.status(400).json(apiResponse.error(decryptedMessage.message, 400));
        return;
      }

      res.json(apiResponse.success(decryptedMessage, 'Message decrypted successfully'));
    } catch (error) {
      safeLogger.error('Error decrypting message:', error);
      res.status(500).json(apiResponse.error('Failed to decrypt message'));
    }
  }

  // Update message delivery status
  async updateMessageStatus(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { status } = req.body;

      const result = await messagingService.updateMessageStatus({
        messageId: id,
        status,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(result.data || result, 'Message status updated successfully'));
    } catch (error) {
      safeLogger.error('Error updating message status:', error);
      res.status(500).json(apiResponse.error('Failed to update message status'));
    }
  }

  // Delete message
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await messagingService.deleteMessage({
        messageId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(null, 'Message deleted successfully'));
    } catch (error) {
      safeLogger.error('Error deleting message:', error);
      res.status(500).json(apiResponse.error('Failed to delete message'));
    }
  }

  // Search messages
  async searchMessages(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const {
        q,
        conversationId,
        page = 1,
        limit = 20
      } = req.query;

      const searchResults = await messagingService.searchMessages({
        userAddress,
        query: q as string,
        conversationId: conversationId as string,
        page: Number(page),
        limit: Number(limit)
      });

      res.json(apiResponse.success(searchResults, 'Message search completed successfully'));
    } catch (error) {
      safeLogger.error('Error searching messages:', error);
      res.status(500).json(apiResponse.error('Failed to search messages'));
    }
  }

  // Get message thread (replies)
  async getMessageThread(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const thread = await messagingService.getMessageThread({
        messageId: id,
        userAddress
      });

      if (!thread.success) {
        res.status(400).json(apiResponse.error((thread as any).message, 400));
        return;
      }

      res.json(apiResponse.success(thread.data || thread, 'Message thread retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting message thread:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve message thread'));
    }
  }

  // Block user
  async blockUser(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { userAddress: targetAddress, reason } = req.body;

      const result = await messagingService.blockUser({
        blockerAddress: userAddress,
        blockedAddress: targetAddress,
        reason
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(null, 'User blocked successfully'));
    } catch (error) {
      safeLogger.error('Error blocking user:', error);
      res.status(500).json(apiResponse.error('Failed to block user'));
    }
  }

  // Unblock user
  async unblockUser(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { userAddress: targetAddress } = req.params;

      const result = await messagingService.unblockUser({
        blockerAddress: userAddress,
        blockedAddress: targetAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(null, 'User unblocked successfully'));
    } catch (error) {
      safeLogger.error('Error unblocking user:', error);
      res.status(500).json(apiResponse.error('Failed to unblock user'));
    }
  }

  // Get blocked users
  async getBlockedUsers(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const blockedUsers = await messagingService.getBlockedUsers(userAddress);

      res.json(apiResponse.success(blockedUsers, 'Blocked users retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting blocked users:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve blocked users'));
    }
  }

  // Report content
  async reportContent(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { targetType, targetId, reason, description } = req.body;

      const result = await messagingService.reportContent({
        reporterAddress: userAddress,
        targetType,
        targetId,
        reason,
        description
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(null, 'Content reported successfully'));
    } catch (error) {
      safeLogger.error('Error reporting content:', error);
      res.status(500).json(apiResponse.error('Failed to report content'));
    }
  }

  // Get conversation participants
  async getConversationParticipants(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const participants = await messagingService.getConversationParticipants({
        conversationId: id,
        userAddress
      });

      if (!participants.success) {
        res.status(400).json(apiResponse.error((participants as any).message, 400));
        return;
      }

      res.json(apiResponse.success(participants.data || participants, 'Participants retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting conversation participants:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve participants'));
    }
  }

  // Add participant to group conversation
  async addParticipant(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { userAddress: newParticipantAddress } = req.body;

      const result = await messagingService.addParticipant({
        conversationId: id,
        adderAddress: userAddress,
        newParticipantAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success((result as any).data || result, 'Participant added successfully'));
    } catch (error) {
      safeLogger.error('Error adding participant:', error);
      res.status(500).json(apiResponse.error('Failed to add participant'));
    }
  }

  // Remove participant from group conversation
  async removeParticipant(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id, userAddress: participantAddress } = req.params;

      const result = await messagingService.removeParticipant({
        conversationId: id,
        removerAddress: userAddress,
        participantAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(null, 'Participant removed successfully'));
    } catch (error) {
      safeLogger.error('Error removing participant:', error);
      res.status(500).json(apiResponse.error('Failed to remove participant'));
    }
  }
}

export const messagingController = new MessagingController();

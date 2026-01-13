/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { messagingService } from '../services/messagingService';
import { apiResponse } from '../utils/apiResponse';
import { getWebSocketService } from '../services/webSocketService';
import { linkPreviewService } from '../services/linkPreviewService';
import { ipfsService } from '../services/ipfsService';

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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to retrieve conversations'));
      }
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

      // Validate participantAddress
      if (!participantAddress || typeof participantAddress !== 'string' || participantAddress.trim().length === 0) {
        res.status(400).json(apiResponse.error('Participant address is required', 400));
        return;
      }

      const conversation = await messagingService.startConversation({
        initiatorAddress: userAddress,
        participantAddress: participantAddress.trim(),
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
      if (error instanceof Error) {
        if (error.message.includes('Messaging service temporarily unavailable')) {
          res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
        } else {
          // Pass through the actual error message for better debugging
          res.status(500).json(apiResponse.error(error.message || 'Failed to start conversation', 500));
        }
      } else {
        res.status(500).json(apiResponse.error('Failed to start conversation', 500));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to retrieve conversation details'));
      }
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
      safeLogger.info(`[MessagingController] getConversationMessages called for ${id} by ${userAddress}, query:`, req.query);

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
      }) as {
        success: boolean;
        data?: any;
        message?: string;
      };

      if (!messages.success) {
        res.status(400).json(apiResponse.error(messages.message || 'Failed to get messages', 400));
        return;
      }

      res.json(apiResponse.success(messages.data || messages, 'Messages retrieved successfully'));
    } catch (error) {
      safeLogger.error('[MessagingController] Error getting conversation messages:', error);
      if (error instanceof Error) {
        safeLogger.error('[MessagingController] Stack:', error.stack);
      }
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to retrieve messages'));
      }
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

      // Emit WebSocket event for real-time update
      const wsService = getWebSocketService();
      if (wsService && message.data) {
        // Get conversation details to find other participants
        const conversationDetails = await messagingService.getConversationDetails({
          conversationId: id,
          userAddress
        });

        if (conversationDetails) {
          // Parse participants and notify each one
          const participants = JSON.parse(conversationDetails.participants as string);

          // Send to conversation room for all participants
          wsService.sendToConversation(id, 'new_message', {
            message: message.data,
            conversationId: id,
            senderAddress: userAddress
          });

          // Also send individual notifications to each participant (for notification badge updates)
          participants.forEach((participant: string) => {
            if (participant.toLowerCase() !== userAddress.toLowerCase()) {
              wsService.sendToUser(participant, 'message_notification', {
                conversationId: id,
                message: message.data,
                senderAddress: userAddress
              }, 'high');
            }
          });
        }
      }

      res.status(201).json(apiResponse.success(message.data || message, 'Message sent successfully'));
    } catch (error) {
      safeLogger.error('Error sending message:', error);
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to send message'));
      }
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

      // Get conversation details before marking as read to find other participants
      const conversationDetails = await messagingService.getConversationDetails({
        conversationId: id,
        userAddress
      });

      const result = await messagingService.markConversationAsRead({
        conversationId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      // Emit WebSocket event for read receipts
      const wsService = getWebSocketService();
      if (wsService && conversationDetails) {
        // Parse participants and notify them that messages were read
        const participants = JSON.parse(conversationDetails.participants as string);

        // Send read receipt to conversation room
        wsService.sendToConversation(id, 'message_read', {
          conversationId: id,
          userAddress: userAddress,
          readAt: new Date().toISOString()
        });

        // Also send individual notifications to senders so they see their messages were read
        participants.forEach((participant: string) => {
          if (participant.toLowerCase() !== userAddress.toLowerCase()) {
            wsService.sendToUser(participant, 'message_read', {
              conversationId: id,
              readerAddress: userAddress,
              readAt: new Date().toISOString()
            }, 'low');
          }
        });
      }

      res.json(apiResponse.success(null, 'Conversation marked as read'));
    } catch (error) {
      safeLogger.error('Error marking conversation as read:', error);
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to mark conversation as read'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to delete conversation'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to archive conversation'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to unarchive conversation'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to encrypt message'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to decrypt message'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to update message status'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to delete message'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to search messages'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to retrieve message thread'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to block user'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to unblock user'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to retrieve blocked users'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to report content'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to retrieve participants'));
      }
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
      const { userAddress: newParticipantAddress, role } = req.body;

      const result = await messagingService.addParticipant({
        conversationId: id,
        adderAddress: userAddress,
        newParticipantAddress,
        role
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success((result as any).data || result, 'Participant added successfully'));
    } catch (error) {
      safeLogger.error('Error adding participant:', error);
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to add participant'));
      }
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
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to remove participant'));
      }
    }
  }

  // Update participant role
  async updateParticipantRole(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id, userAddress: participantAddress } = req.params;
      const { role } = req.body;

      const result = await messagingService.updateParticipantRole({
        conversationId: id,
        updaterAddress: userAddress,
        participantAddress,
        newRole: role
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(null, 'Participant role updated successfully'));
    } catch (error) {
      safeLogger.error('Error updating participant role:', error);
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to update participant role'));
      }
    }
  }

  // Create group conversation
  async createGroupConversation(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { participants, name, description, isPublic } = req.body;

      // Validate participants array
      if (!Array.isArray(participants) || participants.length === 0) {
        res.status(400).json(apiResponse.error('At least one participant is required', 400));
        return;
      }

      const result = await messagingService.createGroupConversation({
        creatorAddress: userAddress,
        participants,
        name,
        description,
        isPublic
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.status(201).json(apiResponse.success((result as any).data || result, 'Group conversation created successfully'));
    } catch (error) {
      safeLogger.error('Error creating group conversation:', error);
      if (error instanceof Error && error.message.includes('Messaging service temporarily unavailable')) {
        res.status(503).json(apiResponse.error('Messaging service temporarily unavailable. Please try again later.', 503));
      } else {
        res.status(500).json(apiResponse.error('Failed to create group conversation'));
      }
    }
  }

  // Upload message attachment (images, documents, etc.)
  async uploadAttachment(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      if (!req.file) {
        res.status(400).json(apiResponse.error('No file provided', 400));
        return;
      }

      const file = req.file;

      // Validate file size (25MB max for messaging)
      if (file.size > 25 * 1024 * 1024) {
        res.status(400).json(apiResponse.error('File size exceeds 25MB limit', 400));
        return;
      }

      // Upload to IPFS
      const ipfsResult = await ipfsService.uploadFile(file.buffer, {
        metadata: {
          name: file.originalname,
          mimeType: file.mimetype
        }
      });

      // Build attachment metadata
      const attachment = {
        id: crypto.randomUUID(),
        type: file.mimetype.split('/')[0], // 'image', 'application', 'audio', 'video'
        mimeType: file.mimetype,
        filename: file.originalname,
        size: file.size,
        url: ipfsResult.gatewayUrl,
        cid: ipfsResult.ipfsHash,
        uploadedBy: userAddress,
        uploadedAt: new Date().toISOString()
      };

      res.status(201).json(apiResponse.success(attachment, 'File uploaded successfully'));
    } catch (error) {
      safeLogger.error('Error uploading attachment:', error);
      res.status(500).json(apiResponse.error('Failed to upload attachment'));
    }
  }

  // Upload voice message
  async uploadVoiceMessage(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      if (!req.file) {
        res.status(400).json(apiResponse.error('No audio file provided', 400));
        return;
      }

      const file = req.file;

      // Validate it's an audio file
      if (!file.mimetype.startsWith('audio/')) {
        res.status(400).json(apiResponse.error('Invalid file type. Only audio files are allowed.', 400));
        return;
      }

      // Validate file size (10MB max for voice messages)
      if (file.size > 10 * 1024 * 1024) {
        res.status(400).json(apiResponse.error('Voice message exceeds 10MB limit', 400));
        return;
      }

      // Upload to IPFS
      const ipfsResult = await ipfsService.uploadFile(file.buffer, {
        metadata: {
          name: `voice_${Date.now()}.${file.mimetype.split('/')[1]}`,
          mimeType: file.mimetype
        }
      });

      // Parse duration from request body if provided
      const duration = req.body.duration ? parseInt(req.body.duration, 10) : undefined;
      const waveform = req.body.waveform ? JSON.parse(req.body.waveform) : undefined;

      // Build voice message metadata
      const voiceMessage = {
        id: crypto.randomUUID(),
        type: 'voice',
        mimeType: file.mimetype,
        filename: file.originalname,
        size: file.size,
        url: ipfsResult.gatewayUrl,
        cid: ipfsResult.ipfsHash,
        duration, // Duration in seconds
        waveform, // Array of amplitude values for visualization
        uploadedBy: userAddress,
        uploadedAt: new Date().toISOString()
      };

      res.status(201).json(apiResponse.success(voiceMessage, 'Voice message uploaded successfully'));
    } catch (error) {
      safeLogger.error('Error uploading voice message:', error);
      res.status(500).json(apiResponse.error('Failed to upload voice message'));
    }
  }

  // Get link preview (Open Graph metadata)
  async getLinkPreview(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        res.status(400).json(apiResponse.error('URL is required', 400));
        return;
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        res.status(400).json(apiResponse.error('Invalid URL format', 400));
        return;
      }

      // Fetch link preview using the service
      const preview = await linkPreviewService.getPreview(url);

      if (!preview) {
        res.status(404).json(apiResponse.error('Could not fetch link preview', 404));
        return;
      }

      res.json(apiResponse.success(preview, 'Link preview fetched successfully'));
    } catch (error) {
      safeLogger.error('Error getting link preview:', error);
      res.status(500).json(apiResponse.error('Failed to fetch link preview'));
    }
  }

  // =====================================================
  // PHASE 5: Advanced Features (Reactions, Pinning, Editing, Threading)
  // =====================================================

  // Add reaction to message
  async addReaction(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { emoji } = req.body;

      const result = await messagingService.addReaction({
        messageId: id,
        userAddress,
        emoji
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      // Emit WebSocket event for real-time reaction update
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.sendToConversation(id, 'reaction_added', {
          messageId: id,
          emoji,
          userAddress,
          reactions: result.data
        });
      }

      res.json(apiResponse.success(result.data, 'Reaction added successfully'));
    } catch (error) {
      safeLogger.error('Error adding reaction:', error);
      res.status(500).json(apiResponse.error('Failed to add reaction'));
    }
  }

  // Remove reaction from message
  async removeReaction(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id, emoji } = req.params;

      const result = await messagingService.removeReaction({
        messageId: id,
        userAddress,
        emoji: decodeURIComponent(emoji)
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      // Emit WebSocket event for real-time reaction update
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.sendToConversation(id, 'reaction_removed', {
          messageId: id,
          emoji: decodeURIComponent(emoji),
          userAddress,
          reactions: result.data
        });
      }

      res.json(apiResponse.success(result.data, 'Reaction removed successfully'));
    } catch (error) {
      safeLogger.error('Error removing reaction:', error);
      res.status(500).json(apiResponse.error('Failed to remove reaction'));
    }
  }

  // Get reactions for a message
  async getReactions(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const reactions = await messagingService.getMessageReactions(id);

      res.json(apiResponse.success(reactions, 'Reactions retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting reactions:', error);
      res.status(500).json(apiResponse.error('Failed to get reactions'));
    }
  }

  // Pin message
  async pinMessage(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await messagingService.pinMessage({
        messageId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      // Emit WebSocket event for real-time pin update
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.sendToConversation(id, 'message_pinned', {
          messageId: id,
          pinnedBy: userAddress
        });
      }

      res.json(apiResponse.success(null, 'Message pinned successfully'));
    } catch (error) {
      safeLogger.error('Error pinning message:', error);
      res.status(500).json(apiResponse.error('Failed to pin message'));
    }
  }

  // Unpin message
  async unpinMessage(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await messagingService.unpinMessage({
        messageId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      // Emit WebSocket event for real-time unpin update
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.sendToConversation(id, 'message_unpinned', {
          messageId: id,
          unpinnedBy: userAddress
        });
      }

      res.json(apiResponse.success(null, 'Message unpinned successfully'));
    } catch (error) {
      safeLogger.error('Error unpinning message:', error);
      res.status(500).json(apiResponse.error('Failed to unpin message'));
    }
  }

  // Get pinned messages for a conversation
  async getPinnedMessages(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await messagingService.getPinnedMessages({
        conversationId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(result.data, 'Pinned messages retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting pinned messages:', error);
      res.status(500).json(apiResponse.error('Failed to get pinned messages'));
    }
  }

  // Edit message
  async editMessage(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { content } = req.body;

      const result = await messagingService.editMessage({
        messageId: id,
        userAddress,
        newContent: content
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      // Emit WebSocket event for real-time edit update
      const wsService = getWebSocketService();
      if (wsService && result.data) {
        wsService.sendToConversation(id, 'message_edited', {
          messageId: id,
          message: result.data,
          editedBy: userAddress
        });
      }

      res.json(apiResponse.success(result.data, 'Message edited successfully'));
    } catch (error) {
      safeLogger.error('Error editing message:', error);
      res.status(500).json(apiResponse.error('Failed to edit message'));
    }
  }

  // Get full message thread (parent + all replies)
  async getFullMessageThread(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await messagingService.getFullMessageThread({
        messageId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error((result as any).message, 400));
        return;
      }

      res.json(apiResponse.success(result.data, 'Message thread retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting message thread:', error);
      res.status(500).json(apiResponse.error('Failed to get message thread'));
    }
  }
}

export const messagingController = new MessagingController();

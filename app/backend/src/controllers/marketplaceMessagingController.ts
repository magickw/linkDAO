/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { marketplaceMessagingService } from '../services/marketplaceMessagingService';
import { orderMessagingAutomation } from '../services/orderMessagingAutomation';
import { apiResponse } from '../utils/apiResponse';
import { db } from '../db';
import { messageTemplates, quickReplies } from '../db/schema';
import { sanitizeMessageTemplate, sanitizeQuickReply } from '../utils/sanitization';
import { eq, and, desc } from 'drizzle-orm';

export class MarketplaceMessagingController {
  /**
   * Create order conversation
   * POST /marketplace/messaging/conversations/order/:orderId
   */
  async createOrderConversation(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const userAddress = req.user?.walletAddress;

      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const conversation = await marketplaceMessagingService.createOrderConversation(orderId);

      res.status(201).json(apiResponse.success(conversation, 'Order conversation created successfully'));
    } catch (error) {
      safeLogger.error('Error creating order conversation:', error);
      res.status(500).json(apiResponse.error('Failed to create order conversation'));
    }
  }

  /**
   * Create product inquiry conversation
   * POST /marketplace/messaging/conversations/product/:productId
   */
  async createProductInquiry(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const userAddress = req.user?.walletAddress;
      const { initialMessage } = req.body;

      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const conversation = await marketplaceMessagingService.createProductInquiry(productId, userAddress, initialMessage);
      res.status(201).json(apiResponse.success(conversation, 'Product inquiry conversation created successfully'));
    } catch (error) {
      safeLogger.error('Error creating product inquiry conversation:', error);
      res.status(500).json(apiResponse.error('Failed to create product inquiry conversation'));
    }
  }

  /**
   * Get user's order conversations
   * GET /marketplace/messaging/conversations/my-orders
   */
  async getMyOrderConversations(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.walletAddress;
      const { page = 1, limit = 20 } = req.query;

      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const result = await marketplaceMessagingService.getMyOrderConversations(userAddress, Number(page), Number(limit));
      res.json(apiResponse.success(result, 'Order conversations retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting order conversations:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve order conversations'));
    }
  }

  /**
   * Get order timeline
   * GET /marketplace/messaging/conversations/:id/order-timeline
   */
  async getOrderTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { id: conversationId } = req.params;
      const userAddress = req.user?.walletAddress;

      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const timeline = await marketplaceMessagingService.getOrderTimeline(conversationId);

      res.json(apiResponse.success(timeline, 'Order timeline retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting order timeline:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve order timeline'));
    }
  }

  /**
   * Get user's message templates
   * GET /marketplace/messaging/templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.walletAddress;
      const userId = req.user?.id;

      if (!userAddress || !userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const templates = await db.select()
        .from(messageTemplates)
        .where(eq(messageTemplates.userId, userId))
        .orderBy(desc(messageTemplates.createdAt));

      res.json(apiResponse.success(templates, 'Templates retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting templates:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve templates'));
    }
  }

  /**
   * Create message template
   * POST /marketplace/messaging/templates
   */
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.walletAddress;
      const userId = req.user?.id;
      const { name, content, category, tags } = req.body;

      if (!userAddress || !userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      // Sanitize template data to prevent XSS
      const sanitizedTemplate = sanitizeMessageTemplate({
        name,
        content,
        category,
        tags
      });

      // Create template in database
      const newTemplate = await db.insert(messageTemplates).values({
        userId,
        walletAddress: userAddress,
        name: sanitizedTemplate.name,
        content: sanitizedTemplate.content,
        category: sanitizedTemplate.category,
        tags: sanitizedTemplate.tags ? JSON.stringify(sanitizedTemplate.tags) : '[]',
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      res.status(201).json(apiResponse.success(newTemplate[0], 'Template created successfully'));
    } catch (error) {
      safeLogger.error('Error creating template:', error);
      res.status(500).json(apiResponse.error('Failed to create template'));
    }
  }

  /**
   * Update message template
   * PUT /marketplace/messaging/templates/:id
   */
  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.walletAddress;
      const userId = req.user?.id;
      const { id } = req.params;
      const { name, content, category, tags, isActive } = req.body;

      if (!userAddress || !userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      // Sanitize template data to prevent XSS
      const updateData: any = {};
      if (name !== undefined) updateData.name = sanitizeMessageTemplate({ name, content: '' }).name;
      if (content !== undefined) updateData.content = sanitizeMessageTemplate({ name: '', content }).content;
      if (category !== undefined) updateData.category = sanitizeMessageTemplate({ name: '', content: '', category }).category;
      if (tags !== undefined) updateData.tags = JSON.stringify(sanitizeMessageTemplate({ name: '', content: '', tags }).tags);
      if (isActive !== undefined) updateData.isActive = isActive;
      updateData.updatedAt = new Date();

      // Update only if user owns the template
      const updated = await db.update(messageTemplates)
        .set(updateData)
        .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, userId)))
        .returning();

      if (updated.length === 0) {
        res.status(404).json(apiResponse.error('Template not found or unauthorized', 404));
        return;
      }

      res.json(apiResponse.success(updated[0], 'Template updated successfully'));
    } catch (error) {
      safeLogger.error('Error updating template:', error);
      res.status(500).json(apiResponse.error('Failed to update template'));
    }
  }

  /**
   * Delete message template
   * DELETE /marketplace/messaging/templates/:id
   */
  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.walletAddress;
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userAddress || !userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      // Delete only if user owns the template
      const deleted = await db.delete(messageTemplates)
        .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, userId)))
        .returning();

      if (deleted.length === 0) {
        res.status(404).json(apiResponse.error('Template not found or unauthorized', 404));
        return;
      }

      res.json(apiResponse.success(null, 'Template deleted successfully'));
    } catch (error) {
      safeLogger.error('Error deleting template:', error);
      res.status(500).json(apiResponse.error('Failed to delete template'));
    }
  }

  /**
   * Create quick reply
   * POST /marketplace/messaging/quick-replies
   */
  async createQuickReply(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.walletAddress;
      const userId = req.user?.id;
      const { triggerKeywords, responseText, category, isActive, priority } = req.body;

      if (!userAddress || !userId) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      // Sanitize quick reply data to prevent XSS
      const sanitizedQuickReply = sanitizeQuickReply({
        triggerKeywords,
        responseText,
        category
      });

      // Create quick reply in database
      const newQuickReply = await db.insert(quickReplies).values({
        userId,
        walletAddress: userAddress,
        triggerKeywords: JSON.stringify(sanitizedQuickReply.triggerKeywords),
        responseText: sanitizedQuickReply.responseText,
        category: sanitizedQuickReply.category,
        isActive: isActive !== undefined ? isActive : true,
        priority: priority !== undefined ? priority : 0,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      res.status(201).json(apiResponse.success(newQuickReply[0], 'Quick reply created successfully'));
    } catch (error) {
      safeLogger.error('Error creating quick reply:', error);
      res.status(500).json(apiResponse.error('Failed to create quick reply'));
    }
  }

  /**
   * Suggest quick replies
   * GET /marketplace/messaging/quick-replies/suggest
   */
  async suggestQuickReplies(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.walletAddress;
      const { message } = req.query;

      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const suggestions = await marketplaceMessagingService.suggestQuickReplies(userAddress, message as string);

      res.json(apiResponse.success(suggestions, 'Quick replies suggested successfully'));
    } catch (error) {
      safeLogger.error('Error suggesting quick replies:', error);
      res.status(500).json(apiResponse.error('Failed to suggest quick replies'));
    }
  }

  /**
   * Get conversation analytics
   * GET /marketplace/messaging/conversations/:id/analytics
   */
  async getConversationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id: conversationId } = req.params;
      const userAddress = req.user?.walletAddress;

      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const analytics = await marketplaceMessagingService.updateConversationAnalytics(conversationId);

      res.json(apiResponse.success(analytics, 'Conversation analytics retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting conversation analytics:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve conversation analytics'));
    }
  }

  /**
   * Get seller messaging analytics
   * GET /marketplace/messaging/seller/:address/messaging-analytics
   */
  async getSellerMessagingAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.params.address || req.user?.walletAddress;

      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const analytics = await marketplaceMessagingService.getSellerMessagingAnalytics(userAddress);
      res.json(apiResponse.success(analytics, 'Seller messaging analytics retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting seller messaging analytics:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve seller messaging analytics'));
    }
  }

  /**
   * Get seller messaging metrics
   * GET /marketplace/messaging/seller/:address/messaging-metrics
   */
  async getSellerMessagingMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.params.address || req.user?.walletAddress;

      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      // Return mock metrics for now
      const metrics = {
        totalMessages: 156,
        messagesSent: 82,
        messagesReceived: 74,
        responseRate: 95,
        avgMessageLength: 42,
        peakActivityHours: [10, 14, 15, 20],
        mostActiveDay: 'Wednesday'
      };

      res.json(apiResponse.success(metrics, 'Seller messaging metrics retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting seller messaging metrics:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve seller messaging metrics'));
    }
  }

  /**
   * Send automated notification
   * POST /marketplace/messaging/conversations/:id/auto-notify
   */
  async sendAutomatedNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id: conversationId } = req.params;
      const userAddress = req.user?.walletAddress;
      const { eventType, data } = req.body;

      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const message = await marketplaceMessagingService.sendOrderNotification(conversationId, eventType, data);

      res.status(201).json(apiResponse.success(message, 'Automated notification sent successfully'));
    } catch (error) {
      safeLogger.error('Error sending automated notification:', error);
      res.status(500).json(apiResponse.error('Failed to send automated notification'));
    }
  }

  /**
   * Escalate conversation to dispute
   * POST /marketplace/messaging/conversations/:id/escalate
   */
  async escalateToDispute(req: Request, res: Response): Promise<void> {
    try {
      const { id: conversationId } = req.params;
      const userAddress = req.user?.walletAddress;

      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      // TODO: Implement dispute escalation
      res.status(201).json(apiResponse.success({}, 'Conversation escalated to dispute successfully'));
    } catch (error) {
      safeLogger.error('Error escalating to dispute:', error);
      res.status(500).json(apiResponse.error('Failed to escalate to dispute'));
    }
  }
}

export const marketplaceMessagingController = new MarketplaceMessagingController();

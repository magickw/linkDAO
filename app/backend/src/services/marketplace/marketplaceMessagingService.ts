import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import {
  conversations,
  chatMessages,
  conversationParticipants,
  messageTemplates,
  quickReplies,
  conversationAnalytics,
  orders,
  products,
  trackingRecords,
  disputes,
  users
} from '../db/schema';
import { eq, and, desc, sql, inArray, lt } from 'drizzle-orm';
import { getWebSocketService } from './webSocketService';
import {
  sanitizeMessage,
  sanitizeMessageTemplate,
  sanitizeQuickReply,
  sanitizeConversation
} from '../utils/sanitization';
import { cacheService } from './cacheService';

// MEMORY OPTIMIZATION: Constants for limits and cleanup
const MAX_MESSAGES_PER_CONVERSATION = 500;
const MAX_ANALYTICS_RECORDS = 1000;
const CACHE_TTL = 600; // 10 minutes
const CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes

export class MarketplaceMessagingService {
  private webSocketService: any;
  private lastCleanup: number = Date.now();
  private activeOrderConversations: Map<string, number> = new Map();

  constructor() {
    // Get the singleton WebSocketService instance
    this.webSocketService = getWebSocketService();
    
    // MEMORY OPTIMIZATION: Start periodic cleanup
    this.startPeriodicCleanup();
  }

  /**
   * Auto-create conversation on order placement
   */
  async createOrderConversation(orderId: string): Promise<any> {
    try {
      // Get order details
      const [order] = await db.select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        throw new Error('Order not found');
      }

      // Get buyer and seller details
      const [buyer] = await db.select()
        .from(users)
        .where(eq(users.id, order.buyerId))
        .limit(1);

      const [seller] = await db.select()
        .from(users)
        .where(eq(users.id, order.sellerId))
        .limit(1);

      // Normalize addresses
      const buyerAddress = buyer?.walletAddress?.toLowerCase() || '';
      const sellerAddress = seller?.walletAddress?.toLowerCase() || '';

      // Get product details if listingId exists
      let product = null;
      if (order.listingId) {
        const [productResult] = await db.select()
          .from(products)
          .where(eq(products.id, order.listingId))
          .limit(1);
        product = productResult;
      }

      // Create conversation
      const newConversation = await db.insert(conversations).values({
        title: `Order #${orderId} - ${product?.title || 'Product'}`,
        participants: JSON.stringify([buyerAddress, sellerAddress]),
        conversationType: 'order_support',
        productId: order.listingId || '',
        contextMetadata: JSON.stringify({
          order_id: orderId,
          product_name: product?.title || 'Product',
          order_status: order.status,
          order_amount: order.amount
        }),
        isAutomated: false,
        createdAt: new Date(),
        lastActivity: new Date()
      }).returning();

      // Add participants with roles
      await db.insert(conversationParticipants).values([
        {
          conversationId: newConversation[0].id,
          userId: order.buyerId,
          walletAddress: buyerAddress,
          role: 'buyer',
          joinedAt: new Date()
        },
        {
          conversationId: newConversation[0].id,
          userId: order.sellerId,
          walletAddress: sellerAddress,
          role: 'seller',
          joinedAt: new Date()
        }
      ]);

      return newConversation[0];
    } catch (error) {
      safeLogger.error('Error creating order conversation:', error);
      throw new Error('Failed to create order conversation');
    }
  }

  /**
   * Send automated order notification
   */
  async sendOrderNotification(
    conversationId: string,
    eventType: string,
    data: any
  ): Promise<any> {
    try {
      // Get conversation details
      const [conversation] = await db.select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Get template based on event type
      const template = this.getOrderNotificationTemplate(eventType, data);

      // Create message
      const newMessage = await db.insert(chatMessages).values({
        conversationId: conversationId,
        senderId: 'system',
        senderAddress: 'system',
        content: template.content,
        messageType: eventType,
        isAutomated: true,
        metadata: JSON.stringify(data),
        sentAt: new Date()
      }).returning();

      // Update conversation last activity
      await db.update(conversations)
        .set({ lastActivity: new Date(), lastMessageId: newMessage[0].id })
        .where(eq(conversations.id, conversationId));

      // Send real-time message update to the entire conversation room via WebSocket
      try {
        this.webSocketService.sendToConversation(conversationId, 'new_message', {
          message: {
            ...newMessage[0],
            id: newMessage[0].id.toString() // Ensure ID is string for frontend
          },
          conversationId,
          senderAddress: 'system'
        });
        safeLogger.debug(`[MarketplaceMessagingService] WebSocket broadcast sent for conversation ${conversationId}`);
      } catch (wsError) {
        safeLogger.error(`[MarketplaceMessagingService] WebSocket broadcast failed for conversation ${conversationId}:`, wsError);
      }

      return newMessage[0];
    } catch (error) {
      safeLogger.error('Error sending order notification:', error);
      throw new Error('Failed to send order notification');
    }
  }

  /**
   * Get unified order timeline
   */
  async getOrderTimeline(conversationId: string) {
    try {
      // Get conversation with order
      const [conversation] = await db.select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation || !conversation.orderId) {
        throw new Error('Conversation or order not found');
      }

      // Get messages
      const messages = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, conversationId))
        .orderBy(desc(chatMessages.sentAt));

      // Combine messages and order events
      const timeline = [
        ...messages.map(msg => ({
          id: msg.id,
          type: 'message',
          timestamp: msg.sentAt,
          data: msg
        }))
      ];

      // Add order events if orderId exists
      if (conversation.orderId) {
        // TODO: Fetch order events from orders table if needed
        // For now, just return messages
      }

      // Sort by timestamp
      timeline.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return timeline;
    } catch (error) {
      safeLogger.error('Error getting order timeline:', error);
      throw new Error('Failed to get order timeline');
    }
  }

  /**
   * Suggest quick replies based on message content
   */
  async suggestQuickReplies(userId: string, messageContent: string): Promise<any[]> {
    try {
      // Get user's quick replies
      const userQuickReplies = await db.select()
        .from(quickReplies)
        .where(and(
          eq(quickReplies.userId, userId),
          eq(quickReplies.isActive, true)
        ));

      // Filter based on trigger keywords
      return userQuickReplies.filter(reply => {
        const keywords = reply.triggerKeywords;
        if (!keywords || !Array.isArray(keywords)) return false;
        return keywords.some(keyword => 
          messageContent.toLowerCase().includes(String(keyword).toLowerCase())
        );
      });
    } catch (error) {
      safeLogger.error('Error suggesting quick replies:', error);
      throw new Error('Failed to suggest quick replies');
    }
  }

  /**
   * Calculate seller response metrics
   */
  async updateConversationAnalytics(conversationId: string) {
    try {
      // MEMORY OPTIMIZATION: Check cache first
      const cacheKey = `analytics:${conversationId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      // MEMORY OPTIMIZATION: Limit message query and use transaction
      const messages = await db.transaction(async (tx) => {
        const msgs = await tx.select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, conversationId))
          .orderBy(desc(chatMessages.sentAt))
          .limit(MAX_MESSAGES_PER_CONVERSATION);
        
        // If there are too many messages, clean up old ones
        if (msgs.length === MAX_MESSAGES_PER_CONVERSATION) {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          await tx.delete(chatMessages)
            .where(and(
              eq(chatMessages.conversationId, conversationId),
              lt(chatMessages.sentAt, thirtyDaysAgo)
            ));
        }
        
        return msgs;
      });

      // Get participants
      const participants = await db.select()
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conversationId));

      // Find seller and buyer
      const seller = participants.find(p => p.role === 'seller');
      const buyer = participants.find(p => p.role === 'buyer');

      if (!seller || !buyer) {
        throw new Error('Seller or buyer not found in conversation');
      }

      // Calculate response times
      const sellerMessages = messages.filter(m => m.senderAddress === seller.userId);
      const buyerMessages = messages.filter(m => m.senderAddress === buyer.userId);

      // Calculate average response times
      const sellerResponseTimes = this.calculateResponseTimes(buyerMessages, sellerMessages);
      const buyerResponseTimes = this.calculateResponseTimes(sellerMessages, buyerMessages);

      // Calculate first response time
      const firstResponseTime = sellerMessages.length > 0 ? 
        sellerResponseTimes[0] : null;

      const analyticsData = {
        conversationId: conversationId,
        sellerResponseTimeAvg: sellerResponseTimes.length > 0 ? 
          this.average(sellerResponseTimes) : null,
        buyerResponseTimeAvg: buyerResponseTimes.length > 0 ? 
          this.average(buyerResponseTimes) : null,
        messageCount: messages.length,
        firstResponseTime: firstResponseTime,
        updatedAt: new Date()
      };

      // Update analytics
      await db.insert(conversationAnalytics).values(analyticsData)
        .onConflictDoUpdate({
          target: conversationAnalytics.conversationId,
          set: analyticsData
        });

      // MEMORY OPTIMIZATION: Cache the result
      await cacheService.set(cacheKey, analyticsData, CACHE_TTL);

      return analyticsData;
    } catch (error) {
      safeLogger.error('Error updating conversation analytics:', error);
      throw new Error('Failed to update conversation analytics');
    }
  }

  /**
   * Get order notification template
   */
  private getOrderNotificationTemplate(eventType: string, data: any): { content: string } {
    switch (eventType) {
      case 'order_confirmation':
        return {
          content: `Order #${data.order_id} has been confirmed! Expected ship date: ${data.expected_ship_date || 'TBD'}`
        };
      case 'payment_confirmation':
        return {
          content: `Payment of ${data.amount} ${data.payment_token} has been confirmed for order #${data.order_id}`
        };
      case 'tracking_update':
        return {
          content: `Your order #${data.order_id} has been shipped! Tracking number: ${data.tracking_number} (${data.carrier})`
        };
      case 'dispute_notice':
        return {
          content: `A dispute has been opened for order #${data.dispute_id}. Moderator ${data.moderator_name} will review this case.`
        };
      default:
        return {
          content: `Order update for order #${data.order_id || 'N/A'}`
        };
    }
  }

  /**
   * MEMORY OPTIMIZATION: Periodic cleanup
   */
  private startPeriodicCleanup(): void {
    setInterval(async () => {
      await this.performCleanup();
    }, CLEANUP_INTERVAL);
  }

  private async performCleanup(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCleanup < CLEANUP_INTERVAL) {
      return;
    }

    try {
      // Clean up old analytics records
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      await db.delete(conversationAnalytics)
        .where(lt(conversationAnalytics.updatedAt, thirtyDaysAgo));

      // Clean up old messages (older than 90 days)
      const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
      const deletedMessages = await db.delete(chatMessages)
        .where(lt(chatMessages.sentAt, ninetyDaysAgo))
        .returning({ id: chatMessages.id });

      if (deletedMessages.length > 0) {
        safeLogger.info(`Cleaned up ${deletedMessages.length} old messages`);
      }

      // Clear active conversation tracking
      this.activeOrderConversations.clear();

      this.lastCleanup = now;
      safeLogger.info('Marketplace messaging service cleanup completed');
    } catch (error) {
      safeLogger.error('Error during marketplace messaging cleanup:', error);
    }
  }

  /**
   * MEMORY OPTIMIZATION: Get memory usage statistics
   */
  public getMemoryUsage(): {
    activeOrderConversations: number;
    lastCleanup: number;
    cacheStats?: any;
  } {
    return {
      activeOrderConversations: this.activeOrderConversations.size,
      lastCleanup: this.lastCleanup,
      cacheStats: cacheService ? cacheService.getStats() : null
    };
  }

  /**
   * MEMORY OPTIMIZATION: Force cleanup
   */
  public async forceCleanup(): Promise<void> {
    await this.performCleanup();
  }

  /**
   * Helper methods
   */
  private calculateResponseTimes(messagesFrom: any[], messagesTo: any[]): number[] {
    // Implementation for calculating response times
    return [];
  }

  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
  }
}

export const marketplaceMessagingService = new MarketplaceMessagingService();

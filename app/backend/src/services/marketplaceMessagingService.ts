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
  disputes
} from '../db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { WebSocketService } from './webSocketService';
import {
  sanitizeMessage,
  sanitizeMessageTemplate,
  sanitizeQuickReply,
  sanitizeConversation
} from '../utils/sanitization';

export class MarketplaceMessagingService {
  private webSocketService: WebSocketService;

  constructor() {
    this.webSocketService = new WebSocketService();
  }

  /**
   * Auto-create conversation on order placement
   */
  async createOrderConversation(orderId: number): Promise<any> {
    try {
      // Get order details with buyer, seller, and product information
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          buyer: true,
          seller: true,
          product: true
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Create conversation
      const newConversation = await db.insert(conversations).values({
        title: `Order #${orderId} - ${order.product?.title || 'Product'}`,
        participants: JSON.stringify([order.buyer.walletAddress, order.seller.walletAddress]),
        conversationType: 'order_support',
        orderId: orderId,
        productId: order.productId,
        contextMetadata: JSON.stringify({
          order_id: orderId,
          product_name: order.product?.title || 'Product',
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
          userId: order.buyer.id,
          role: 'buyer',
          joinedAt: new Date()
        },
        {
          conversationId: newConversation[0].id,
          userId: order.seller.id,
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
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Get template based on event type
      const template = this.getOrderNotificationTemplate(eventType, data);

      // Create message
      const newMessage = await db.insert(chatMessages).values({
        conversationId: conversationId,
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

      // Send WebSocket notification
      const participants = JSON.parse(conversation.participants as string);
      participants.forEach((participant: string) => {
        this.webSocketService.sendToUser(participant, 'new_message', {
          conversationId,
          messageId: newMessage[0].id,
          content: template.content,
          sender: 'system'
        });
      });

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
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: {
          order: {
            with: {
              events: true
            }
          }
        }
      });

      if (!conversation || !conversation.orderId) {
        throw new Error('Conversation or order not found');
      }

      // Get messages
      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, conversationId),
        orderBy: [desc(chatMessages.sentAt)]
      });

      // Combine messages and order events
      const timeline = [
        ...messages.map(msg => ({
          id: msg.id,
          type: 'message',
          timestamp: msg.sentAt,
          data: msg
        })),
        ...(conversation.order?.events || []).map(event => ({
          id: event.id,
          type: 'order_event',
          timestamp: event.timestamp,
          data: event
        }))
      ];

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
      const userQuickReplies = await db.query.quickReplies.findMany({
        where: and(
          eq(quickReplies.userId, userId),
          eq(quickReplies.isActive, true)
        )
      });

      // Filter based on trigger keywords
      return userQuickReplies.filter(reply => 
        reply.triggerKeywords?.some(keyword => 
          messageContent.toLowerCase().includes(keyword.toLowerCase())
        )
      );
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
      // Get conversation messages
      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, conversationId),
        orderBy: [desc(chatMessages.sentAt)]
      });

      // Get participants
      const participants = await db.query.conversationParticipants.findMany({
        where: eq(conversationParticipants.conversationId, conversationId)
      });

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

      // Update analytics
      await db.insert(conversationAnalytics).values({
        conversationId: conversationId,
        sellerResponseTimeAvg: sellerResponseTimes.length > 0 ? 
          this.average(sellerResponseTimes) : null,
        buyerResponseTimeAvg: buyerResponseTimes.length > 0 ? 
          this.average(buyerResponseTimes) : null,
        messageCount: messages.length,
        firstResponseTime: firstResponseTime,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: conversationAnalytics.conversationId,
        set: {
          sellerResponseTimeAvg: sellerResponseTimes.length > 0 ? 
            this.average(sellerResponseTimes) : null,
          buyerResponseTimeAvg: buyerResponseTimes.length > 0 ? 
            this.average(buyerResponseTimes) : null,
          messageCount: messages.length,
          firstResponseTime: firstResponseTime,
          updatedAt: new Date()
        }
      });

      return {
        sellerResponseTimeAvg: sellerResponseTimes.length > 0 ? 
          this.average(sellerResponseTimes) : null,
        buyerResponseTimeAvg: buyerResponseTimes.length > 0 ? 
          this.average(buyerResponseTimes) : null,
        messageCount: messages.length,
        firstResponseTime: firstResponseTime
      };
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
   * Calculate response times between messages
   */
  private calculateResponseTimes(requestMessages: any[], responseMessages: any[]): number[] {
    const responseTimes: number[] = [];
    
    for (let i = 0; i < requestMessages.length; i++) {
      const requestMsg = requestMessages[i];
      const responseMsg = responseMessages.find(msg => 
        new Date(msg.sentAt) > new Date(requestMsg.sentAt)
      );
      
      if (responseMsg) {
        const timeDiff = new Date(responseMsg.sentAt).getTime() - 
                         new Date(requestMsg.sentAt).getTime();
        responseTimes.push(timeDiff);
      }
    }
    
    return responseTimes;
  }

  /**
   * Calculate average of array of numbers
   */
  private average(numbers: number[]): number | null {
    if (numbers.length === 0) return null;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }
}

export const marketplaceMessagingService = new MarketplaceMessagingService();

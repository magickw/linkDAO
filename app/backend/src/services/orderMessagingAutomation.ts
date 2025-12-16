import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { 
  orders, 
  listings, 
  users, 
  trackingRecords,
  disputes,
  conversations
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { marketplaceMessagingService } from './marketplaceMessagingService';

export class OrderMessagingAutomation {
  private marketplaceMessaging: typeof marketplaceMessagingService;

  constructor() {
    this.marketplaceMessaging = marketplaceMessagingService;
  }

  /**
   * Handle order created event
   */
  async onOrderCreated(orderId: string) {
    try {
      // 1. Create conversation
      const conversation = await this.marketplaceMessaging.createOrderConversation(orderId);

      // 2. Get order details
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          buyer: true,
          seller: true,
          listing: true
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // 3. Send welcome message
      await this.marketplaceMessaging.sendOrderNotification(
        conversation.id,
        'order_confirmation',
        {
          order_id: orderId,
          order_amount: order.amount,
          expected_ship_date: order.estimatedDelivery
        }
      );

      // 4. Notify seller via WebSocket
      // Note: This would typically be implemented with a WebSocket service
      safeLogger.info(`New order message for seller ${order.seller.walletAddress}`, {
        conversation_id: conversation.id,
        order_id: orderId
      });

      return conversation;
    } catch (error) {
      safeLogger.error('Error handling order created event:', error);
      throw new Error('Failed to handle order created event');
    }
  }

  /**
   * Handle order shipped event
   */
  async onOrderShipped(orderId: number, trackingInfo: any) {
    try {
      // Get conversation for order
      const conversation = await this.getOrderConversation(orderId);

      if (!conversation) {
        throw new Error('Conversation not found for order');
      }

      // Send tracking update message
      await this.marketplaceMessaging.sendOrderNotification(
        conversation.id,
        'tracking_update',
        {
          order_id: orderId,
          tracking_number: trackingInfo.trackingNumber,
          carrier: trackingInfo.carrier,
          estimated_delivery: trackingInfo.estimatedDelivery
        }
      );

      // Note: trackingRecords doesn't have conversationId column in current schema
      // The tracking is already linked via orderId

      return conversation;
    } catch (error) {
      safeLogger.error('Error handling order shipped event:', error);
      throw new Error('Failed to handle order shipped event');
    }
  }

  /**
   * Handle payment received event
   */
  async onPaymentReceived(orderId: string, payment: any) {
    try {
      // Get conversation for order
      const conversation = await this.getOrderConversation(orderId);

      if (!conversation) {
        throw new Error('Conversation not found for order');
      }

      await this.marketplaceMessaging.sendOrderNotification(
        conversation.id,
        'payment_confirmation',
        {
          order_id: orderId,
          amount: payment.amount,
          payment_token: payment.token
        }
      );

      return conversation;
    } catch (error) {
      safeLogger.error('Error handling payment received event:', error);
      throw new Error('Failed to handle payment received event');
    }
  }

  /**
   * Handle dispute opened event
   */
  async onDisputeOpened(disputeId: number) {
    try {
      // Get dispute details
      const dispute = await db.query.disputes.findFirst({
        where: eq(disputes.id, disputeId),
      });

      if (!dispute || !dispute.orderId) {
        throw new Error('Dispute or order not found');
      }

      // Get conversation for order
      const conversation = await this.getOrderConversation(dispute.orderId);

      if (!conversation) {
        throw new Error('Conversation not found for order');
      }

      // Update conversation type
      await db.update(conversations)
        .set({
          conversationType: 'dispute',
          contextMetadata: JSON.stringify({ 
            ...JSON.parse(conversation.contextMetadata as string || '{}'),
            dispute_id: disputeId 
          })
        })
        .where(eq(conversations.id, conversation.id));

      // Note: disputes table doesn't have conversationId column in current schema
      // The dispute is linked to the conversation via orderId

      // Add moderator to conversation (simplified - in practice would assign actual moderator)
      // This would typically involve getting an actual moderator user
      const moderator = await this.assignModerator();
      
      if (moderator) {
        // Add moderator as participant
        // Note: This would require the conversationParticipants table to have a userId field
        // that references the users table
        safeLogger.info(`Added moderator ${moderator.id} to dispute conversation ${conversation.id}`);
      }

      // Notify all parties
      await this.marketplaceMessaging.sendOrderNotification(
        conversation.id,
        'dispute_notice',
        {
          dispute_id: disputeId,
          moderator_name: moderator?.handle || 'Moderator'
        }
      );

      return conversation;
    } catch (error) {
      safeLogger.error('Error handling dispute opened event:', error);
      throw new Error('Failed to handle dispute opened event');
    }
  }

  /**
   * Get conversation for an order
   */
  private async getOrderConversation(orderId: number) {
    const conversationsList = await db
      .select()
      .from(conversations)
      .where(eq(conversations.orderId, orderId));

    return conversationsList[0] || null;
  }

  /**
   * Assign a moderator (simplified implementation)
   */
  private async assignModerator() {
    // In a real implementation, this would select an appropriate moderator
    // For now, we'll return a mock moderator
    return {
      id: 'moderator-1',
      handle: 'Community Moderator'
    };
  }
}

export const orderMessagingAutomation = new OrderMessagingAutomation();

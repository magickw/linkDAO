import { orderMessagingAutomation } from './orderMessagingAutomation';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { 
  orders, 
  orderEvents, 
  trackingRecords,
  payments
} from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

export class OrderEventHandlerService {
  /**
   * Handle order events and trigger appropriate messaging automation
   */
  async handleOrderEvent(orderId: number, eventType: string, eventData?: any) {
    try {
      safeLogger.info(`Handling order event: ${eventType} for order ${orderId}`);
      
      switch (eventType) {
        case 'ORDER_CREATED':
          await this.handleOrderCreated(orderId);
          break;
          
        case 'PAYMENT_RECEIVED':
          await this.handlePaymentReceived(orderId, eventData);
          break;
          
        case 'ORDER_SHIPPED':
          await this.handleOrderShipped(orderId, eventData);
          break;
          
        case 'DISPUTE_INITIATED':
          await this.handleDisputeInitiated(eventData.disputeId);
          break;
          
        default:
          safeLogger.info(`No specific handler for event type: ${eventType}`);
      }
    } catch (error) {
      safeLogger.error(`Error handling order event ${eventType} for order ${orderId}:`, error);
    }
  }

  /**
   * Handle order created event
   */
  private async handleOrderCreated(orderId: number) {
    try {
      await orderMessagingAutomation.onOrderCreated(orderId);
      safeLogger.info(`Successfully handled order created event for order ${orderId}`);
    } catch (error) {
      safeLogger.error(`Error in handleOrderCreated for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Handle payment received event
   */
  private async handlePaymentReceived(orderId: number, paymentData?: any) {
    try {
      // If payment data is not provided, fetch it from the database
      let payment = paymentData;
      if (!payment) {
        const paymentsList = await db
          .select()
          .from(payments)
          .where(eq(payments.orderId, orderId))
          .orderBy(desc(payments.createdAt))
          .limit(1);
        
        payment = paymentsList[0];
      }
      
      if (payment) {
        await orderMessagingAutomation.onPaymentReceived(orderId, payment);
        safeLogger.info(`Successfully handled payment received event for order ${orderId}`);
      } else {
        safeLogger.warn(`No payment found for order ${orderId}`);
      }
    } catch (error) {
      safeLogger.error(`Error in handlePaymentReceived for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Handle order shipped event
   */
  private async handleOrderShipped(orderId: number, trackingData?: any) {
    try {
      // If tracking data is not provided, fetch it from the database
      let trackingInfo = trackingData;
      if (!trackingInfo) {
        const trackingRecordsList = await db
          .select()
          .from(trackingRecords)
          .where(eq(trackingRecords.orderId, orderId))
          .orderBy(desc(trackingRecords.createdAt))
          .limit(1);
        
        trackingInfo = trackingRecordsList[0];
      }
      
      if (trackingInfo) {
        await orderMessagingAutomation.onOrderShipped(orderId, trackingInfo);
        safeLogger.info(`Successfully handled order shipped event for order ${orderId}`);
      } else {
        safeLogger.warn(`No tracking info found for order ${orderId}`);
      }
    } catch (error) {
      safeLogger.error(`Error in handleOrderShipped for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Handle dispute initiated event
   */
  private async handleDisputeInitiated(disputeId: number) {
    try {
      await orderMessagingAutomation.onDisputeOpened(disputeId);
      safeLogger.info(`Successfully handled dispute initiated event for dispute ${disputeId}`);
    } catch (error) {
      safeLogger.error(`Error in handleDisputeInitiated for dispute ${disputeId}:`, error);
      throw error;
    }
  }

  /**
   * Process all recent order events that haven't been handled yet
   */
  async processPendingOrderEvents() {
    try {
      // This would typically check for unprocessed events and handle them
      // For now, we'll just log that this functionality exists
      safeLogger.info('Processing pending order events...');
    } catch (error) {
      safeLogger.error('Error processing pending order events:', error);
    }
  }
}

export const orderEventHandlerService = new OrderEventHandlerService();
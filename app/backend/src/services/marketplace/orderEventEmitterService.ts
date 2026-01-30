import { db } from '../../db';
import { orderEvents } from '../../db/schema';
import { safeLogger } from '../../utils/safeLogger';

/**
 * Service to emit order events for async processing
 * These events are consumed by orderEventListenerService
 */
class OrderEventEmitterService {
  /**
   * Emit an order event
   */
  async emitOrderEvent(
    orderId: string,
    eventType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await db.insert(orderEvents).values({
        orderId,
        eventType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        timestamp: new Date(),
      });

      safeLogger.info(`Emitted order event: ${eventType} for order ${orderId}`);
    } catch (error) {
      safeLogger.error(`Error emitting order event ${eventType} for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Emit multiple events in batch
   */
  async emitOrderEvents(
    events: Array<{
      orderId: string;
      eventType: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<void> {
    try {
      if (events.length === 0) {
        return;
      }

      const eventRecords = events.map((event) => ({
        orderId: event.orderId,
        eventType: event.eventType,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        timestamp: new Date(),
      }));

      await db.insert(orderEvents).values(eventRecords);

      safeLogger.info(`Emitted ${events.length} order events`);
    } catch (error) {
      safeLogger.error(`Error emitting batch order events:`, error);
      throw error;
    }
  }

  /**
   * Emit ORDER_CREATED event
   */
  async emitOrderCreated(orderId: string, buyerId: string, sellerId: string, amount: string): Promise<void> {
    return this.emitOrderEvent(orderId, 'ORDER_CREATED', {
      buyerId,
      sellerId,
      amount,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit PAYMENT_RECEIVED event
   */
  async emitPaymentReceived(
    orderId: string,
    paymentMethod: string,
    amount: string,
    currency: string
  ): Promise<void> {
    return this.emitOrderEvent(orderId, 'PAYMENT_RECEIVED', {
      paymentMethod,
      amount,
      currency,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit ORDER_SHIPPED event
   */
  async emitOrderShipped(
    orderId: string,
    trackingNumber: string,
    carrier: string,
    estimatedDelivery?: Date
  ): Promise<void> {
    return this.emitOrderEvent(orderId, 'ORDER_SHIPPED', {
      trackingNumber,
      carrier,
      estimatedDelivery: estimatedDelivery?.toISOString(),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit ORDER_DELIVERED event
   */
  async emitOrderDelivered(orderId: string, deliveryDate: Date): Promise<void> {
    return this.emitOrderEvent(orderId, 'ORDER_DELIVERED', {
      deliveryDate: deliveryDate.toISOString(),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit DISPUTE_INITIATED event
   */
  async emitDisputeInitiated(
    orderId: string,
    disputeId: number,
    raisedBy: string,
    reason: string
  ): Promise<void> {
    return this.emitOrderEvent(orderId, 'DISPUTE_INITIATED', {
      disputeId,
      raisedBy,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit DISPUTE_RESOLVED event
   */
  async emitDisputeResolved(
    orderId: string,
    disputeId: number,
    resolution: string,
    winner: string
  ): Promise<void> {
    return this.emitOrderEvent(orderId, 'DISPUTE_RESOLVED', {
      disputeId,
      resolution,
      winner,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit REFUND_INITIATED event
   */
  async emitRefundInitiated(orderId: string, amount: string, reason: string): Promise<void> {
    return this.emitOrderEvent(orderId, 'REFUND_INITIATED', {
      amount,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit REFUND_COMPLETED event
   */
  async emitRefundCompleted(orderId: string, amount: string, transactionHash?: string): Promise<void> {
    return this.emitOrderEvent(orderId, 'REFUND_COMPLETED', {
      amount,
      transactionHash,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit ORDER_COMPLETED event
   */
  async emitOrderCompleted(orderId: string): Promise<void> {
    return this.emitOrderEvent(orderId, 'ORDER_COMPLETED', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit ORDER_CANCELLED event
   */
  async emitOrderCancelled(orderId: string, reason: string): Promise<void> {
    return this.emitOrderEvent(orderId, 'ORDER_CANCELLED', {
      reason,
      timestamp: new Date().toISOString(),
    });
  }
}

export const orderEventEmitterService = new OrderEventEmitterService();

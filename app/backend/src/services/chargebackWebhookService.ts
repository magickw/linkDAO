import Stripe from 'stripe';
import axios from 'axios';
import { db } from '../db';
import { orders, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { NotificationService } from './notificationService';
import { emailService } from './emailService';

export interface ChargebackEvent {
  id: string;
  provider: 'stripe' | 'paypal';
  type: ChargebackEventType;
  paymentId: string;
  orderId?: string;
  amount: number;
  currency: string;
  reason: string;
  status: ChargebackStatus;
  evidenceDueDate?: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export enum ChargebackEventType {
  DISPUTE_CREATED = 'dispute_created',
  DISPUTE_UPDATED = 'dispute_updated',
  DISPUTE_WON = 'dispute_won',
  DISPUTE_LOST = 'dispute_lost',
  DISPUTE_CLOSED = 'dispute_closed',
  EARLY_FRAUD_WARNING = 'early_fraud_warning'
}

export enum ChargebackStatus {
  NEEDS_RESPONSE = 'needs_response',
  UNDER_REVIEW = 'under_review',
  WON = 'won',
  LOST = 'lost',
  CLOSED = 'closed'
}

export interface ChargebackNotification {
  sellerId: string;
  sellerEmail?: string;
  orderId?: string;
  paymentId: string;
  amount: number;
  currency: string;
  reason: string;
  status: ChargebackStatus;
  evidenceDueDate?: Date;
  provider: 'stripe' | 'paypal';
  actionRequired: boolean;
  actionItems: string[];
}

export class ChargebackWebhookService {
  private stripe: Stripe;
  private notificationService: NotificationService;
  private readonly PAYPAL_BASE_URL: string;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16'
    });
    this.notificationService = new NotificationService();
    this.PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || 'https://api.sandbox.paypal.com';
  }

  /**
   * Process Stripe dispute webhook events
   */
  async processStripeDisputeEvent(event: Stripe.Event): Promise<void> {
    try {
      const dispute = event.data.object as Stripe.Dispute;

      safeLogger.info(`Processing Stripe dispute event: ${event.type}`, {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        amount: dispute.amount
      });

      let chargebackType: ChargebackEventType;
      let status: ChargebackStatus;

      switch (event.type) {
        case 'charge.dispute.created':
          chargebackType = ChargebackEventType.DISPUTE_CREATED;
          status = ChargebackStatus.NEEDS_RESPONSE;
          break;
        case 'charge.dispute.updated':
          chargebackType = ChargebackEventType.DISPUTE_UPDATED;
          status = this.mapStripeDisputeStatus(dispute.status);
          break;
        case 'charge.dispute.closed':
          chargebackType = dispute.status === 'won' ?
            ChargebackEventType.DISPUTE_WON :
            ChargebackEventType.DISPUTE_LOST;
          status = dispute.status === 'won' ? ChargebackStatus.WON : ChargebackStatus.LOST;
          break;
        case 'radar.early_fraud_warning.created':
          chargebackType = ChargebackEventType.EARLY_FRAUD_WARNING;
          status = ChargebackStatus.NEEDS_RESPONSE;
          await this.handleEarlyFraudWarning(event.data.object as any);
          return;
        default:
          safeLogger.info(`Unhandled Stripe dispute event type: ${event.type}`);
          return;
      }

      const chargebackEvent: ChargebackEvent = {
        id: dispute.id,
        provider: 'stripe',
        type: chargebackType,
        paymentId: typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.toString() || '',
        amount: dispute.amount / 100, // Convert from cents
        currency: dispute.currency.toUpperCase(),
        reason: dispute.reason || 'unknown',
        status,
        evidenceDueDate: dispute.evidence_details?.due_by
          ? new Date(dispute.evidence_details.due_by * 1000)
          : undefined,
        createdAt: new Date(dispute.created * 1000),
        metadata: {
          paymentIntentId: typeof dispute.payment_intent === 'string'
            ? dispute.payment_intent
            : dispute.payment_intent?.id,
          disputeReason: dispute.reason,
          networkReasonCode: dispute.network_reason_code
        }
      };

      await this.processChargebackEvent(chargebackEvent);

    } catch (error) {
      safeLogger.error('Error processing Stripe dispute event:', error);
      throw error;
    }
  }

  /**
   * Process PayPal dispute webhook events
   */
  async processPayPalDisputeEvent(webhookEvent: any): Promise<void> {
    try {
      const resourceType = webhookEvent.resource_type;
      const dispute = webhookEvent.resource;

      safeLogger.info(`Processing PayPal dispute event: ${webhookEvent.event_type}`, {
        disputeId: dispute.dispute_id,
        amount: dispute.dispute_amount?.value
      });

      let chargebackType: ChargebackEventType;
      let status: ChargebackStatus;

      switch (webhookEvent.event_type) {
        case 'CUSTOMER.DISPUTE.CREATED':
          chargebackType = ChargebackEventType.DISPUTE_CREATED;
          status = ChargebackStatus.NEEDS_RESPONSE;
          break;
        case 'CUSTOMER.DISPUTE.UPDATED':
          chargebackType = ChargebackEventType.DISPUTE_UPDATED;
          status = this.mapPayPalDisputeStatus(dispute.status);
          break;
        case 'CUSTOMER.DISPUTE.RESOLVED':
          chargebackType = dispute.dispute_outcome?.outcome_code === 'RESOLVED_SELLER_FAVOUR'
            ? ChargebackEventType.DISPUTE_WON
            : ChargebackEventType.DISPUTE_LOST;
          status = dispute.dispute_outcome?.outcome_code === 'RESOLVED_SELLER_FAVOUR'
            ? ChargebackStatus.WON
            : ChargebackStatus.LOST;
          break;
        default:
          safeLogger.info(`Unhandled PayPal dispute event type: ${webhookEvent.event_type}`);
          return;
      }

      // Find the order/transaction associated with this dispute
      const captureId = dispute.disputed_transactions?.[0]?.seller_transaction_id;

      const chargebackEvent: ChargebackEvent = {
        id: dispute.dispute_id,
        provider: 'paypal',
        type: chargebackType,
        paymentId: captureId || dispute.dispute_id,
        amount: parseFloat(dispute.dispute_amount?.value || '0'),
        currency: dispute.dispute_amount?.currency_code || 'USD',
        reason: dispute.reason || 'unknown',
        status,
        evidenceDueDate: dispute.seller_response_due_date
          ? new Date(dispute.seller_response_due_date)
          : undefined,
        createdAt: new Date(dispute.create_time || Date.now()),
        metadata: {
          disputeReason: dispute.reason,
          disputeLifeCycleStage: dispute.dispute_life_cycle_stage,
          messages: dispute.messages
        }
      };

      await this.processChargebackEvent(chargebackEvent);

    } catch (error) {
      safeLogger.error('Error processing PayPal dispute event:', error);
      throw error;
    }
  }

  /**
   * Core chargeback event processing
   */
  private async processChargebackEvent(event: ChargebackEvent): Promise<void> {
    try {
      safeLogger.info(`Processing chargeback event: ${event.type}`, {
        id: event.id,
        provider: event.provider,
        amount: event.amount,
        status: event.status
      });

      // Find the associated order and seller
      const orderInfo = await this.findOrderByPaymentId(event.paymentId, event.provider);

      if (orderInfo) {
        event.orderId = orderInfo.orderId;

        // Update order status for dispute
        await this.updateOrderForDispute(orderInfo.orderId, event);

        // Notify seller
        await this.notifySeller(orderInfo, event);
      } else {
        safeLogger.warn(`No order found for chargeback payment: ${event.paymentId}`);
        // Still log the chargeback for admin review
        await this.logChargebackForAdminReview(event);
      }

      // Record chargeback in database for analytics
      await this.recordChargeback(event);

    } catch (error) {
      safeLogger.error('Error processing chargeback event:', error);
      throw error;
    }
  }

  /**
   * Find order by payment identifier
   */
  private async findOrderByPaymentId(
    paymentId: string,
    provider: 'stripe' | 'paypal'
  ): Promise<{ orderId: string; sellerId: string; sellerEmail?: string } | null> {
    try {
      // Search in orders table for the payment
      let orderResults;

      if (provider === 'stripe') {
        // Search by stripePaymentIntentId or paymentConfirmationHash
        orderResults = await db
          .select({
            orderId: orders.id,
            sellerId: orders.sellerId,
            sellerAddress: orders.buyerAddress
          })
          .from(orders)
          .where(eq(orders.stripePaymentIntentId, paymentId))
          .limit(1);

        // If not found by stripePaymentIntentId, try paymentConfirmationHash
        if (orderResults.length === 0) {
          orderResults = await db
            .select({
              orderId: orders.id,
              sellerId: orders.sellerId,
              sellerAddress: orders.buyerAddress
            })
            .from(orders)
            .where(eq(orders.paymentConfirmationHash, paymentId))
            .limit(1);
        }
      } else {
        // PayPal - search by paymentConfirmationHash or paymentDetails
        orderResults = await db
          .select({
            orderId: orders.id,
            sellerId: orders.sellerId,
            sellerAddress: orders.buyerAddress
          })
          .from(orders)
          .where(eq(orders.paymentConfirmationHash, paymentId))
          .limit(1);
      }

      if (orderResults.length === 0) {
        return null;
      }

      const order = orderResults[0];

      // Get seller email
      let sellerEmail: string | undefined;
      if (order.sellerId) {
        const [seller] = await db.select().from(users).where(eq(users.id, order.sellerId)).limit(1);
        sellerEmail = seller?.email || undefined;
      }

      return {
        orderId: order.orderId.toString(),
        sellerId: order.sellerId || order.sellerAddress || '',
        sellerEmail
      };

    } catch (error) {
      safeLogger.error('Error finding order by payment ID:', error);
      return null;
    }
  }

  /**
   * Update order status for dispute
   */
  private async updateOrderForDispute(orderId: string, event: ChargebackEvent): Promise<void> {
    try {
      let newStatus: string;

      switch (event.type) {
        case ChargebackEventType.DISPUTE_CREATED:
          newStatus = 'dispute_opened';
          break;
        case ChargebackEventType.DISPUTE_WON:
          newStatus = 'dispute_resolved_seller';
          break;
        case ChargebackEventType.DISPUTE_LOST:
          newStatus = 'dispute_resolved_buyer';
          break;
        default:
          newStatus = 'dispute_pending';
      }

      await db
        .update(orders)
        .set({
          status: newStatus,
          notes: `Chargeback ${event.type}: ${event.reason}. Provider: ${event.provider}. Amount: ${event.amount} ${event.currency}`
        })
        .where(eq(orders.id, orderId));

      safeLogger.info(`Order ${orderId} status updated to ${newStatus} due to chargeback`);

    } catch (error) {
      safeLogger.error('Error updating order for dispute:', error);
    }
  }

  /**
   * Notify seller about chargeback
   */
  private async notifySeller(
    orderInfo: { orderId: string; sellerId: string; sellerEmail?: string },
    event: ChargebackEvent
  ): Promise<void> {
    try {
      const actionItems = this.getActionItemsForChargeback(event);

      const notification: ChargebackNotification = {
        sellerId: orderInfo.sellerId,
        sellerEmail: orderInfo.sellerEmail,
        orderId: orderInfo.orderId,
        paymentId: event.paymentId,
        amount: event.amount,
        currency: event.currency,
        reason: event.reason,
        status: event.status,
        evidenceDueDate: event.evidenceDueDate,
        provider: event.provider,
        actionRequired: event.status === ChargebackStatus.NEEDS_RESPONSE,
        actionItems
      };

      // Send in-app notification
      await this.notificationService.sendOrderNotification(
        orderInfo.sellerId,
        'chargeback_alert',
        orderInfo.orderId,
        {
          chargebackType: event.type,
          amount: event.amount,
          currency: event.currency,
          reason: event.reason,
          provider: event.provider,
          evidenceDueDate: event.evidenceDueDate?.toISOString(),
          actionRequired: notification.actionRequired,
          actionItems
        }
      );

      // Send email notification if email is available
      if (orderInfo.sellerEmail) {
        await this.sendChargebackEmail(orderInfo.sellerEmail, notification);
      }

      safeLogger.info(`Seller ${orderInfo.sellerId} notified about chargeback for order ${orderInfo.orderId}`);

    } catch (error) {
      safeLogger.error('Error notifying seller about chargeback:', error);
    }
  }

  /**
   * Send chargeback email to seller
   */
  private async sendChargebackEmail(
    email: string,
    notification: ChargebackNotification
  ): Promise<void> {
    try {
      const subject = notification.actionRequired
        ? `URGENT: Chargeback Alert - Action Required by ${notification.evidenceDueDate?.toLocaleDateString() || 'soon'}`
        : `Chargeback ${notification.status === ChargebackStatus.WON ? 'Resolved in Your Favor' : 'Update'} - Order #${notification.orderId}`;

      const actionItemsHtml = notification.actionItems.length > 0
        ? `<h3>Required Actions:</h3><ul>${notification.actionItems.map(item => `<li>${item}</li>`).join('')}</ul>`
        : '';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${notification.actionRequired ? '#dc3545' : '#333'};">
            ${notification.actionRequired ? 'Chargeback Alert - Immediate Action Required' : 'Chargeback Update'}
          </h2>

          <p>A chargeback has been ${notification.status === ChargebackStatus.NEEDS_RESPONSE ? 'filed' : 'updated'} for one of your transactions.</p>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order ID:</strong> ${notification.orderId || 'N/A'}</p>
            <p><strong>Amount:</strong> ${notification.amount} ${notification.currency}</p>
            <p><strong>Reason:</strong> ${notification.reason}</p>
            <p><strong>Payment Provider:</strong> ${notification.provider.toUpperCase()}</p>
            <p><strong>Status:</strong> ${notification.status}</p>
            ${notification.evidenceDueDate ? `<p><strong>Evidence Due By:</strong> ${notification.evidenceDueDate.toLocaleDateString()}</p>` : ''}
          </div>

          ${actionItemsHtml}

          <p>Please log in to your dashboard to review and respond to this chargeback.</p>

          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/seller/disputes"
             style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">
            View Dispute Details
          </a>

          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      `;

      await emailService.sendEmail({
        to: email,
        subject,
        html
      });

    } catch (error) {
      safeLogger.error('Error sending chargeback email:', error);
    }
  }

  /**
   * Get action items for seller based on chargeback type
   */
  private getActionItemsForChargeback(event: ChargebackEvent): string[] {
    const actionItems: string[] = [];

    if (event.status === ChargebackStatus.NEEDS_RESPONSE) {
      actionItems.push('Review the chargeback reason and gather relevant evidence');
      actionItems.push('Collect proof of delivery or service completion');
      actionItems.push('Gather customer communication records');

      if (event.evidenceDueDate) {
        actionItems.push(`Submit evidence before ${event.evidenceDueDate.toLocaleDateString()}`);
      }

      // Add reason-specific actions
      switch (event.reason) {
        case 'product_not_received':
        case 'merchandise_or_service_not_received':
          actionItems.push('Provide shipping confirmation and tracking information');
          actionItems.push('Include delivery confirmation or signature if available');
          break;
        case 'fraudulent':
        case 'unauthorized':
          actionItems.push('Verify customer identity and order details');
          actionItems.push('Provide IP address and device information from order');
          break;
        case 'duplicate':
          actionItems.push('Clarify that charges are for separate transactions');
          actionItems.push('Provide invoices for each transaction');
          break;
        case 'product_unacceptable':
        case 'merchandise_or_service_not_as_described':
          actionItems.push('Provide product description and photos');
          actionItems.push('Include customer communications about the product');
          break;
      }
    }

    return actionItems;
  }

  /**
   * Handle early fraud warning (Stripe Radar)
   */
  private async handleEarlyFraudWarning(warning: any): Promise<void> {
    try {
      safeLogger.warn('Early fraud warning received:', warning);

      const chargeId = warning.charge;
      const orderInfo = await this.findOrderByPaymentId(chargeId, 'stripe');

      if (orderInfo) {
        await this.notificationService.sendOrderNotification(
          orderInfo.sellerId,
          'fraud_warning',
          orderInfo.orderId,
          {
            chargeId,
            warningType: 'early_fraud_warning',
            message: 'This payment has been flagged as potentially fraudulent. Consider reviewing before fulfillment.'
          }
        );
      }

    } catch (error) {
      safeLogger.error('Error handling early fraud warning:', error);
    }
  }

  /**
   * Log chargeback for admin review when no order is found
   */
  private async logChargebackForAdminReview(event: ChargebackEvent): Promise<void> {
    safeLogger.warn('Chargeback requires admin review - no matching order found', {
      id: event.id,
      provider: event.provider,
      paymentId: event.paymentId,
      amount: event.amount,
      currency: event.currency,
      reason: event.reason
    });

    // Send admin notification
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await emailService.sendEmail({
        to: adminEmail,
        subject: `Unmatched Chargeback Alert - ${event.provider.toUpperCase()}`,
        html: `
          <h2>Chargeback Without Matching Order</h2>
          <p>A chargeback was received but no matching order was found in the system.</p>
          <ul>
            <li>Dispute ID: ${event.id}</li>
            <li>Provider: ${event.provider}</li>
            <li>Payment ID: ${event.paymentId}</li>
            <li>Amount: ${event.amount} ${event.currency}</li>
            <li>Reason: ${event.reason}</li>
          </ul>
          <p>Please investigate manually.</p>
        `
      });
    }
  }

  /**
   * Record chargeback in database for analytics
   */
  private async recordChargeback(event: ChargebackEvent): Promise<void> {
    // In a full implementation, this would insert into a chargebacks table
    safeLogger.info('Chargeback recorded for analytics:', {
      id: event.id,
      provider: event.provider,
      type: event.type,
      amount: event.amount,
      currency: event.currency,
      reason: event.reason,
      status: event.status,
      orderId: event.orderId
    });
  }

  /**
   * Map Stripe dispute status to internal status
   */
  private mapStripeDisputeStatus(stripeStatus: string): ChargebackStatus {
    switch (stripeStatus) {
      case 'warning_needs_response':
      case 'needs_response':
        return ChargebackStatus.NEEDS_RESPONSE;
      case 'warning_under_review':
      case 'under_review':
        return ChargebackStatus.UNDER_REVIEW;
      case 'won':
        return ChargebackStatus.WON;
      case 'lost':
        return ChargebackStatus.LOST;
      case 'warning_closed':
      case 'charge_refunded':
      default:
        return ChargebackStatus.CLOSED;
    }
  }

  /**
   * Map PayPal dispute status to internal status
   */
  private mapPayPalDisputeStatus(paypalStatus: string): ChargebackStatus {
    switch (paypalStatus) {
      case 'OPEN':
      case 'WAITING_FOR_SELLER_RESPONSE':
        return ChargebackStatus.NEEDS_RESPONSE;
      case 'WAITING_FOR_BUYER_RESPONSE':
      case 'UNDER_REVIEW':
        return ChargebackStatus.UNDER_REVIEW;
      case 'RESOLVED':
        return ChargebackStatus.CLOSED;
      default:
        return ChargebackStatus.UNDER_REVIEW;
    }
  }

  /**
   * Verify PayPal webhook signature
   */
  async verifyPayPalWebhook(
    webhookBody: any,
    headers: Record<string, string>
  ): Promise<boolean> {
    try {
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;
      if (!webhookId) {
        safeLogger.error('PayPal webhook ID not configured');
        return false;
      }

      const accessToken = await this.getPayPalAccessToken();

      const verifyResponse = await axios.post(
        `${this.PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,
        {
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: webhookBody
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return verifyResponse.data.verification_status === 'SUCCESS';

    } catch (error) {
      safeLogger.error('PayPal webhook verification error:', error);
      return false;
    }
  }

  /**
   * Get PayPal access token
   */
  private async getPayPalAccessToken(): Promise<string> {
    const tokenResponse = await axios.post(
      `${this.PAYPAL_BASE_URL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return tokenResponse.data.access_token;
  }
}

export const chargebackWebhookService = new ChargebackWebhookService();

import Stripe from 'stripe';
import { safeLogger } from '../../utils/logger';

/**
 * Stripe Refund Provider
 * Handles Stripe-specific refund operations and status tracking
 */
export class StripeRefundProvider {
  private stripe: Stripe;

  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16'
    });
  }

  /**
   * Process a refund through Stripe
   * @param paymentIntentId - Stripe payment intent ID
   * @param amount - Amount to refund in cents
   * @param reason - Reason for refund
   * @returns Stripe refund object
   */
  async processRefund(
    paymentIntentId: string,
    amount: number,
    reason?: string
  ): Promise<{
    success: boolean;
    refundId: string;
    status: string;
    amount: number;
    currency: string;
    processingTime: number;
    errorMessage?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(amount * 100), // Convert to cents
        reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
        metadata: {
          processedAt: new Date().toISOString()
        }
      });

      const processingTime = Date.now() - startTime;

      safeLogger.info(`Stripe refund processed: ${refund.id}`, {
        paymentIntentId,
        amount,
        status: refund.status
      });

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100, // Convert back to dollars
        currency: refund.currency.toUpperCase(),
        processingTime
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      safeLogger.error('Stripe refund failed:', error);
      
      return {
        success: false,
        refundId: '',
        status: 'failed',
        amount: 0,
        currency: 'USD',
        processingTime,
        errorMessage: error.message || 'Unknown Stripe error'
      };
    }
  }

  /**
   * Get refund status from Stripe
   * @param refundId - Stripe refund ID
   * @returns Refund status information
   */
  async getRefundStatus(refundId: string): Promise<{
    status: string;
    amount: number;
    currency: string;
    created: Date;
    failureReason?: string;
  }> {
    try {
      const refund = await this.stripe.refunds.retrieve(refundId);

      return {
        status: refund.status,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase(),
        created: new Date(refund.created * 1000),
        failureReason: refund.failure_reason || undefined
      };
    } catch (error: any) {
      safeLogger.error('Error retrieving Stripe refund status:', error);
      throw new Error(`Failed to retrieve Stripe refund status: ${error.message}`);
    }
  }

  /**
   * List recent refunds from Stripe
   * @param limit - Maximum number of refunds to retrieve
   * @returns Array of refund objects
   */
  async listRecentRefunds(limit: number = 10): Promise<Array<{
    refundId: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
    status: string;
    created: Date;
  }>> {
    try {
      const refunds = await this.stripe.refunds.list({
        limit
      });

      return refunds.data.map(refund => ({
        refundId: refund.id,
        paymentIntentId: refund.payment_intent as string,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase(),
        status: refund.status,
        created: new Date(refund.created * 1000)
      }));
    } catch (error: any) {
      safeLogger.error('Error listing Stripe refunds:', error);
      throw new Error(`Failed to list Stripe refunds: ${error.message}`);
    }
  }

  /**
   * Cancel a pending refund
   * @param refundId - Stripe refund ID
   * @returns Cancellation result
   */
  async cancelRefund(refundId: string): Promise<{
    success: boolean;
    status: string;
    errorMessage?: string;
  }> {
    try {
      const refund = await this.stripe.refunds.cancel(refundId);

      return {
        success: refund.status === 'canceled',
        status: refund.status
      };
    } catch (error: any) {
      safeLogger.error('Error canceling Stripe refund:', error);
      
      return {
        success: false,
        status: 'failed',
        errorMessage: error.message || 'Failed to cancel refund'
      };
    }
  }

  /**
   * Get Stripe account balance to verify refund capacity
   * @returns Available balance information
   */
  async getAccountBalance(): Promise<{
    available: number;
    pending: number;
    currency: string;
  }> {
    try {
      const balance = await this.stripe.balance.retrieve();
      
      const availableBalance = balance.available[0] || { amount: 0, currency: 'usd' };
      const pendingBalance = balance.pending[0] || { amount: 0, currency: 'usd' };

      return {
        available: availableBalance.amount / 100,
        pending: pendingBalance.amount / 100,
        currency: availableBalance.currency.toUpperCase()
      };
    } catch (error: any) {
      safeLogger.error('Error retrieving Stripe balance:', error);
      throw new Error(`Failed to retrieve Stripe balance: ${error.message}`);
    }
  }
}

// Export singleton instance
export const stripeRefundProvider = new StripeRefundProvider();

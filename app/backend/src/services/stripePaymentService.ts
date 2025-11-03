import Stripe from 'stripe';
import { safeLogger } from '../utils/safeLogger';
import { IPaymentProcessor } from './ldaoAcquisitionService';
import { PurchaseRequest, PurchaseResult, PaymentMethod } from '../types/ldaoAcquisition';

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  publishableKey: string;
  apiVersion: '2023-10-16';
}

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
  metadata: Record<string, string>;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export class StripePaymentService implements IPaymentProcessor {
  private stripe: Stripe;
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion,
    });
  }

  public async processPayment(request: PurchaseRequest): Promise<PurchaseResult> {
    try {
      // Convert LDAO amount to USD cents (assuming $0.01 per LDAO)
      const amountInCents = Math.round(request.amount * 1); // $0.01 per LDAO = 1 cent

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        payment_method_types: ['card', 'apple_pay', 'google_pay'],
        metadata: {
          userId: request.userAddress,
          ldaoAmount: request.amount.toString(),
          paymentMethod: request.paymentMethod,
          timestamp: new Date().toISOString(),
        },
        description: `Purchase ${request.amount} LDAO tokens`,
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        estimatedTokens: request.amount,
        finalPrice: amountInCents / 100, // Convert back to dollars
      };
    } catch (error) {
      safeLogger.error('Stripe payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  public async confirmPayment(paymentIntentId: string): Promise<PurchaseResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        const ldaoAmount = parseInt(paymentIntent.metadata.ldaoAmount || '0');
        return {
          success: true,
          transactionId: paymentIntent.id,
          estimatedTokens: ldaoAmount,
          finalPrice: paymentIntent.amount / 100,
        };
      } else {
        return {
          success: false,
          error: `Payment status: ${paymentIntent.status}`,
        };
      }
    } catch (error) {
      safeLogger.error('Stripe payment confirmation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment confirmation failed',
      };
    }
  }

  public async handleWebhook(payload: string, signature: string): Promise<StripeWebhookEvent | null> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );

      return {
        id: event.id,
        type: event.type,
        data: event.data,
        created: event.created,
      };
    } catch (error) {
      safeLogger.error('Stripe webhook verification error:', error);
      return null;
    }
  }

  public async processWebhookEvent(event: StripeWebhookEvent): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;
      case 'payment_intent.canceled':
        await this.handlePaymentCancellation(event.data.object);
        break;
      default:
        safeLogger.info(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private async handlePaymentSuccess(paymentIntent: any): Promise<void> {
    safeLogger.info('Payment succeeded:', paymentIntent.id);
    // Here we would:
    // 1. Update database with successful payment
    // 2. Trigger token minting process
    // 3. Send confirmation email/notification
    // 4. Update user's token balance
  }

  private async handlePaymentFailure(paymentIntent: any): Promise<void> {
    safeLogger.info('Payment failed:', paymentIntent.id);
    // Here we would:
    // 1. Update database with failed payment
    // 2. Send failure notification
    // 3. Log failure reason for analysis
  }

  private async handlePaymentCancellation(paymentIntent: any): Promise<void> {
    safeLogger.info('Payment canceled:', paymentIntent.id);
    // Here we would:
    // 1. Update database with canceled payment
    // 2. Clean up any pending processes
  }

  public getSupportedMethods(): PaymentMethod[] {
    return [
      {
        type: 'fiat',
        available: true,
        fees: 2.9, // 2.9% + 30¢ Stripe fee
      },
    ];
  }

  public async createSetupIntent(customerId?: string): Promise<{ clientSecret: string; setupIntentId: string }> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      return {
        clientSecret: setupIntent.client_secret!,
        setupIntentId: setupIntent.id,
      };
    } catch (error) {
      safeLogger.error('Stripe setup intent creation error:', error);
      throw new Error('Failed to create setup intent');
    }
  }

  public async createCustomer(email: string, name?: string): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
      });

      return customer.id;
    } catch (error) {
      safeLogger.error('Stripe customer creation error:', error);
      throw new Error('Failed to create customer');
    }
  }

  public async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      safeLogger.error('Stripe payment methods retrieval error:', error);
      throw new Error('Failed to retrieve payment methods');
    }
  }

  public async processRefund(paymentIntentId: string, amount?: number): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
      });

      return {
        success: true,
        refundId: refund.id,
      };
    } catch (error) {
      safeLogger.error('Stripe refund processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed',
      };
    }
  }

  public async retryPayment(paymentIntentId: string): Promise<PurchaseResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'requires_payment_method') {
        // Payment can be retried
        return {
          success: true,
          transactionId: paymentIntent.id,
          estimatedTokens: parseInt(paymentIntent.metadata.ldaoAmount || '0'),
          finalPrice: paymentIntent.amount / 100,
        };
      } else {
        return {
          success: false,
          error: `Payment cannot be retried. Status: ${paymentIntent.status}`,
        };
      }
    } catch (error) {
      safeLogger.error('Stripe payment retry error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment retry failed',
      };
    }
  }

  public async getPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent | null> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret!,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      safeLogger.error('Stripe payment intent retrieval error:', error);
      return null;
    }
  }
}

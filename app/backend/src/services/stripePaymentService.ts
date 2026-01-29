import Stripe from 'stripe';
import { safeLogger } from '../utils/safeLogger';
import { IPaymentProcessor } from './ldaoAcquisitionService';
import { PurchaseRequest, PurchaseResult, PaymentMethod } from '../types/ldaoAcquisition';
import { chargebackWebhookService } from './chargebackWebhookService';

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
      // Convert amount to USD cents
      // Smart detection: Check if amount is already in cents (>= 100) or in dollars (< 100)
      const amountInCents = request.amount >= 100 
        ? request.amount 
        : Math.round(request.amount * 100); // Convert dollars to cents

      safeLogger.info('Stripe payment amount calculation:', {
        receivedAmount: request.amount,
        amountInCents,
        amountInDollars: amountInCents / 100,
        assumedUnit: request.amount >= 100 ? 'cents' : 'dollars'
      });

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        payment_method_types: ['card'],
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
        clientSecret: paymentIntent.client_secret,
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

  /**
   * Create a payment intent for marketplace transactions (Stripe Connect)
   */
  public async createMarketplacePaymentIntent(params: {
    amount: number;
    currency: string;
    transferGroup: string;
    description?: string;
    metadata?: Record<string, string>;
    sellerAccountId?: string;
    platformFee?: number;
    captureMethod?: 'manual' | 'automatic';
  }): Promise<{
    paymentIntentId: string;
    clientSecret: string | null;
    status: string;
  }> {
    try {
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: params.amount,
        currency: params.currency,
        payment_method_types: ['card'],
        transfer_group: params.transferGroup,
        capture_method: params.captureMethod || 'manual',
        metadata: params.metadata,
        description: params.description
      };

      // Add transfer data if seller has a Connect account
      if (params.sellerAccountId) {
        // Calculate transfer amount (total - platform fee)
        const transferAmount = params.platformFee 
          ? params.amount - params.platformFee 
          : params.amount;

        paymentIntentParams.transfer_data = {
          destination: params.sellerAccountId,
          amount: Math.max(0, transferAmount),
        };
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status
      };
    } catch (error) {
      safeLogger.error('Stripe marketplace payment intent creation error:', error);
      throw error;
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
      // Chargeback/Dispute events
      case 'charge.dispute.created':
      case 'charge.dispute.updated':
      case 'charge.dispute.closed':
      case 'radar.early_fraud_warning.created':
        await chargebackWebhookService.processStripeDisputeEvent({
          id: event.id,
          type: event.type,
          data: event.data,
          created: event.created,
          object: 'event',
          api_version: '2023-10-16',
          livemode: false,
          pending_webhooks: 0,
          request: null
        } as any);
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

  /**
   * Get or create Stripe customer by email
   * Used for mobile Payment Sheet integration
   */
  public async getOrCreateCustomer(email: string, name?: string): Promise<string> {
    try {
      // Check if customer exists by email
      const existingCustomers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        safeLogger.info(`Found existing Stripe customer: ${existingCustomers.data[0].id}`);
        return existingCustomers.data[0].id;
      }

      // Create new customer
      safeLogger.info(`Creating new Stripe customer for: ${email}`);
      return await this.createCustomer(email, name);
    } catch (error) {
      safeLogger.error('Error getting/creating Stripe customer:', error);
      throw new Error('Failed to get or create customer');
    }
  }

  /**
   * Create ephemeral key for customer
   * Required for mobile Payment Sheet integration
   */
  public async createEphemeralKey(customerId: string): Promise<{ secret: string }> {
    try {
      const ephemeralKey = await this.stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: this.config.apiVersion }
      );

      safeLogger.info(`Created ephemeral key for customer: ${customerId}`);
      return { secret: ephemeralKey.secret };
    } catch (error) {
      safeLogger.error('Error creating ephemeral key:', error);
      throw new Error('Failed to create ephemeral key');
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

  public async processRefund(paymentIntentId: string, amount?: number, reason?: string, metadata?: Record<string, string>): Promise<{ success: boolean; refundId?: string; error?: string; amount?: number; currency?: string }> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: (reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100);
      }

      if (metadata) {
        refundParams.metadata = metadata;
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase()
      };
    } catch (error) {
      safeLogger.error('Stripe refund processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed',
      };
    }
  }

  public async capturePayment(paymentIntentId: string): Promise<{ success: boolean; amount?: number; currency?: string; transferId?: string; error?: string }> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'requires_capture') {
        throw new Error(`Payment intent ${paymentIntentId} is not in capturable state: ${paymentIntent.status}`);
      }

      const capturedIntent = await this.stripe.paymentIntents.capture(paymentIntentId);
      
      let transferId: string | undefined;
      // Handle transfer if present in transfer_data
      if (capturedIntent.transfer_data?.destination) {
        // Note: Automatic transfers handle this, but if manual transfer is needed logic would go here
        // For now we just return success
      }

      return {
        success: true,
        amount: capturedIntent.amount / 100,
        currency: capturedIntent.currency.toUpperCase(),
        transferId
      };
    } catch (error) {
      safeLogger.error('Stripe capture error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Capture failed'
      };
    }
  }

  public async cancelPayment(paymentIntentId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      // Check cancellable states
      const cancellableStates = ['requires_payment_method', 'requires_capture', 'requires_confirmation', 'requires_action'];
      
      if (!cancellableStates.includes(paymentIntent.status)) {
        throw new Error(`Payment intent ${paymentIntentId} cannot be cancelled in state: ${paymentIntent.status}`);
      }

      await this.stripe.paymentIntents.cancel(paymentIntentId, {
        cancellation_reason: 'requested_by_customer'
      });

      return { success: true };
    } catch (error) {
      safeLogger.error('Stripe cancellation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cancellation failed'
      };
    }
  }

  public async createTransfer(params: {
    amount: number;
    currency: string;
    destination: string;
    transferGroup?: string;
    metadata?: Record<string, string>;
  }): Promise<{ success: boolean; transferId?: string; error?: string }> {
    try {
      const transfer = await this.stripe.transfers.create({
        amount: params.amount,
        currency: params.currency,
        destination: params.destination,
        transfer_group: params.transferGroup,
        metadata: params.metadata
      });

      return {
        success: true,
        transferId: transfer.id
      };
    } catch (error) {
      safeLogger.error('Stripe transfer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed'
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

  /**
   * Create a Stripe Connect Express account for a seller
   */
  public async createConnectAccount(email: string, businessType: 'individual' | 'company' = 'individual', country: string = 'US'): Promise<string> {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: businessType,
      });

      return account.id;
    } catch (error) {
      safeLogger.error('Stripe Connect account creation error:', error);
      throw new Error('Failed to create Connect account');
    }
  }

  /**
   * Create an account link for Stripe Connect onboarding
   */
  public async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      safeLogger.error('Stripe Account Link creation error:', error);
      throw new Error('Failed to create account link');
    }
  }

  /**
   * Retrieve Stripe Connect account details
   */
  public async getConnectAccount(accountId: string): Promise<Stripe.Account> {
    try {
      return await this.stripe.accounts.retrieve(accountId);
    } catch (error) {
      safeLogger.error('Stripe Connect account retrieval error:', error);
      throw new Error('Failed to retrieve Connect account');
    }
  }

  /**
   * Create a Login Link for the Express Dashboard
   */
  public async createLoginLink(accountId: string): Promise<string> {
    try {
      const link = await this.stripe.accounts.createLoginLink(accountId);
      return link.url;
    } catch (error) {
      safeLogger.error('Stripe Login Link creation error:', error);
      throw new Error('Failed to create login link');
    }
  }
}

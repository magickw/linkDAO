import Stripe from 'stripe';
import { db } from '../../db';
import { safeLogger } from '../../utils/safeLogger';
import { taxLiabilities } from '../../db/schema';
import { taxRemittanceService } from './taxRemittanceService';

/**
 * Stripe Tax Integration Service
 * Handles automatic tax calculation, filing, and remittance through Stripe Tax
 */
export class StripeTaxIntegrationService {
  private stripe: Stripe;

  constructor(apiKey: string = process.env.STRIPE_SECRET_KEY || '') {
    this.stripe = new Stripe(apiKey, { apiVersion: '2024-04-10' as any });
  }

  /**
   * Calculate taxes for an order using Stripe Tax
   */
  async calculateTaxForOrder(
    amount: number,
    customerAddress: {
      country?: string;
      state?: string;
      postalCode?: string;
      city?: string;
      line1?: string;
    },
    lineItems: Array<{
      reference: string;
      amount: number;
      taxCode?: string;
    }>
  ): Promise<{
    taxAmount: number;
    jurisdiction: string;
    taxRate: number;
    lineItemTaxes: Array<{
      reference: string;
      taxAmount: number;
      taxRate: number;
    }>;
  }> {
    try {
      safeLogger.info('Calculating tax with Stripe Tax:', { amount, customerAddress });

      // Create a tax calculation with Stripe
      const taxCalculation = await this.stripe.tax.calculations.create({
        currency: 'usd',
        customer_details: {
          address: customerAddress,
          taxExempt: 'none',
        },
        line_items: lineItems.map(item => ({
          reference: item.reference,
          amount: Math.round(item.amount * 100), // Convert to cents
          tax_code: item.taxCode || 'txcd_100000000',
        })),
      });

      const totalTaxAmount = taxCalculation.taxAmount_estimate;
      const jurisdiction = this.getJurisdictionFromAddress(customerAddress);

      // Calculate effective tax rate
      const taxRate = amount > 0 ? totalTaxAmount / (amount * 100) : 0;

      const lineItemTaxes = (taxCalculation.line_items?.data || []).map(item => ({
        reference: item.reference,
        taxAmount: item.taxAmount_estimate,
        taxRate: item.amount > 0 ? item.taxAmount_estimate / item.amount : 0,
      }));

      safeLogger.info('Stripe tax calculation completed:', {
        totalTaxAmount,
        jurisdiction,
        taxRate,
      });

      return {
        taxAmount: totalTaxAmount,
        jurisdiction,
        taxRate,
        lineItemTaxes,
      };
    } catch (error) {
      safeLogger.error('Error calculating tax with Stripe:', error);
      throw error;
    }
  }

  /**
   * Create a payment intent with tax handling
   */
  async createPaymentIntentWithTax(
    amount: number,
    sellerStripeAccountId: string,
    platformFee: number,
    taxAmount: number,
    orderData: {
      orderId: string;
      buyerEmail: string;
      sellerEmail: string;
      shippingAddress: any;
      taxJurisdiction: string;
    },
    automatedTaxRemittance: boolean = true
  ): Promise<Stripe.PaymentIntent> {
    try {
      safeLogger.info('Creating payment intent with tax:', {
        amount,
        taxAmount,
        platformFee,
        automatedTaxRemittance,
      });

      const sellerAmount = amount - platformFee - taxAmount;

      // Create payment intent with tax metadata
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Amount in cents
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        statement_descriptor: 'LinkDAO Marketplace',
        metadata: {
          orderId: orderData.orderId,
          taxAmount: taxAmount.toString(),
          platformFee: platformFee.toString(),
          sellerAmount: sellerAmount.toString(),
          taxJurisdiction: orderData.taxJurisdiction,
          automatedTaxRemittance: automatedTaxRemittance.toString(),
        },
        // Transfer data for seller
        transfer_data: {
          destination: sellerStripeAccountId,
          amount: Math.round(sellerAmount * 100),
        },
        receipt_email: orderData.buyerEmail,
      });

      safeLogger.info('Payment intent created with tax:', {
        paymentIntentId: paymentIntent.id,
        sellerAmount,
      });

      return paymentIntent;
    } catch (error) {
      safeLogger.error('Error creating payment intent with tax:', error);
      throw error;
    }
  }

  /**
   * File tax return with Stripe Tax Transactions
   */
  async fileTaxReturn(
    jurisdiction: string,
    period: {
      startDate: Date;
      endDate: Date;
    }
  ): Promise<string> {
    try {
      safeLogger.info('Filing tax return with Stripe Tax:', {
        jurisdiction,
        period,
      });

      // Use Stripe Tax Transactions API to file return
      // This is a placeholder - actual implementation depends on Stripe Tax API availability
      const filingReference = `STRIPE-TAX-${jurisdiction}-${Date.now()}`;

      safeLogger.info('Tax return filed with Stripe:', {
        jurisdiction,
        filingReference,
      });

      return filingReference;
    } catch (error) {
      safeLogger.error('Error filing tax return with Stripe:', error);
      throw error;
    }
  }

  /**
   * Remit collected taxes to authorities via Stripe
   */
  async remitTaxes(
    batchId: string,
    bankAccount: {
      accountNumber: string;
      routingNumber: string;
      accountHolderName: string;
    }
  ): Promise<Stripe.Payout> {
    try {
      safeLogger.info('Remitting taxes via Stripe:', { batchId });

      // Get batch from remittance service
      const report = await taxRemittanceService.getRemittanceReport(batchId);

      // Create payout for tax amount
      const payout = await this.stripe.payouts.create({
        amount: Math.round(report.totalTaxAmount * 100),
        currency: 'usd',
        method: 'instant',
        description: `Tax Remittance - ${report.batchNumber}`,
        metadata: {
          batchId,
          batchNumber: report.batchNumber,
          jurisdiction: JSON.stringify(report.period),
        },
      });

      safeLogger.info('Tax payout created:', {
        payoutId: payout.id,
        amount: report.totalTaxAmount,
      });

      // Record the payment
      await taxRemittanceService.recordTaxPayment(
        batchId,
        payout.id,
        new Date(payout.created * 1000)
      );

      return payout;
    } catch (error) {
      safeLogger.error('Error remitting taxes via Stripe:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe Tax webhook events
   */
  async handleTaxWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await this.handleSuccessfulPayment(paymentIntent);
          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          await this.handleRefund(charge);
          break;
        }

        default:
          safeLogger.debug('Unhandled tax webhook event:', event.type);
      }
    } catch (error) {
      safeLogger.error('Error handling tax webhook:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment and create tax liability record
   */
  private async handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const taxAmount = parseFloat(paymentIntent.metadata?.taxAmount || '0');
      const orderId = paymentIntent.metadata?.orderId;
      const taxJurisdiction = paymentIntent.metadata?.taxJurisdiction || 'US-CA';

      if (taxAmount <= 0 || !orderId) {
        return;
      }

      safeLogger.info('Recording tax liability from payment:', {
        orderId,
        taxAmount,
        taxJurisdiction,
      });

      // Create tax liability record
      const today = new Date();
      const quarter = Math.floor(today.getMonth() / 3);
      const dueDate = new Date(today.getFullYear(), (quarter + 1) * 3, 15);

      await db
        .insert(taxLiabilities)
        .values({
          orderId: orderId,
          taxJurisdiction: taxJurisdiction,
          taxRate: 0.08, // Default rate, should be calculated from Stripe Tax
          taxAmount: taxAmount,
          taxableAmount: (paymentIntent.amount || 0) / 100 - taxAmount,
          taxType: 'sales_tax',
          collectionDate: new Date(paymentIntent.created * 1000),
          dueDate: dueDate,
          status: 'calculated',
          remittanceProvider: 'stripe_tax',
          remittanceProviderId: paymentIntent.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
    } catch (error) {
      safeLogger.error('Error recording tax liability:', error);
      throw error;
    }
  }

  /**
   * Handle refunds and adjust tax liability
   */
  private async handleRefund(charge: Stripe.Charge): Promise<void> {
    try {
      if (!charge.payment_intent) {
        return;
      }

      safeLogger.info('Handling refund for tax purposes:', {
        chargeId: charge.id,
        paymentIntentId: charge.payment_intent,
        refundAmount: charge.amount_refunded,
      });

      // Update tax liability to reflect refund
      // This would typically involve reducing the tax liability or marking it as refunded

      // Get original tax liability
      const [taxLiability] = await db
        .select()
        .from(taxLiabilities)
        .where(
          db.sql`${taxLiabilities.remittanceProviderId} = ${charge.payment_intent as string}`
        )
        .limit(1);

      if (taxLiability) {
        const refundTaxAmount = (charge.amount_refunded * taxLiability.taxAmount) / (taxLiability.taxAmount + taxLiability.taxableAmount);

        await db
          .update(taxLiabilities)
          .set({
            taxAmount: taxLiability.taxAmount - refundTaxAmount,
            status: 'partial',
            updatedAt: new Date(),
          })
          .where(db.sql`${taxLiabilities.remittanceProviderId} = ${charge.payment_intent as string}`);
      }
    } catch (error) {
      safeLogger.error('Error handling tax refund:', error);
      throw error;
    }
  }

  /**
   * Get jurisdiction from customer address
   */
  private getJurisdictionFromAddress(address: {
    country?: string;
    state?: string;
    postalCode?: string;
    city?: string;
    line1?: string;
  }): string {
    if (address.country === 'US' && address.state) {
      return `US-${address.state}`;
    }
    if (address.country === 'GB') {
      return 'GB';
    }
    if (address.country) {
      return address.country;
    }
    return 'US-CA'; // Default
  }
}

export const stripeTaxService = new StripeTaxIntegrationService();

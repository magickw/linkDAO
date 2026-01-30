import Stripe from 'stripe';
import { db } from '../db';
import { 
  sellers, 
  marketplaceListings, 
  sellerRevenue, 
  sellerFeeCharges,
  stripeConnectAccounts
} from '../db/schema';
import { eq, and, gte, lt, desc } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

interface SellerFeeCharge {
  id: string;
  sellerWalletAddress: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'charged' | 'failed' | 'waived';
  chargeId?: string;
  paymentMethodId?: string;
  failureReason?: string;
  createdAt: Date;
  processedAt?: Date;
}

interface SellerBalance {
  walletAddress: string;
  availableRevenue: number;
  pendingRevenue: number;
  totalRevenue: number;
  stripeCustomerId?: string;
}

export class SellerFeeChargingService {
  /**
   * Check if seller has sufficient balance to cover a fee
   */
  async checkSellerBalance(
    sellerWalletAddress: string,
    requiredAmount: number
  ): Promise<{ 
    hasSufficientBalance: boolean; 
    availableBalance: number;
    pendingBalance: number;
  }> {
    try {
      const balance = await this.getSellerBalance(sellerWalletAddress);
      
      return {
        hasSufficientBalance: balance.availableRevenue >= requiredAmount,
        availableBalance: balance.availableRevenue,
        pendingBalance: balance.pendingRevenue
      };
    } catch (error) {
      safeLogger.error('Error checking seller balance:', error);
      throw error;
    }
  }

  /**
   * Get seller's current balance (available and pending revenue)
   */
  async getSellerBalance(sellerWalletAddress: string): Promise<SellerBalance> {
    try {
      // Get seller record for Stripe customer ID
      const sellerRecord = await db
        .select()
        .from(sellers)
        .where(eq(sellers.walletAddress, sellerWalletAddress))
        .limit(1);

      const seller = sellerRecord[0];

      // Get revenue records
      const revenueRecords = await db
        .select()
        .from(sellerRevenue)
        .where(eq(sellerRevenue.sellerWalletAddress, sellerWalletAddress));

      let availableRevenue = 0;
      let pendingRevenue = 0;

      revenueRecords.forEach(record => {
        if (record.status === 'available') {
          availableRevenue += parseFloat(record.amount || '0');
        } else if (record.status === 'pending') {
          pendingRevenue += parseFloat(record.amount || '0');
        }
      });

      return {
        walletAddress: sellerWalletAddress,
        availableRevenue,
        pendingRevenue,
        totalRevenue: availableRevenue + pendingRevenue,
        stripeCustomerId: seller?.stripeCustomerId || undefined
      };
    } catch (error) {
      safeLogger.error('Error getting seller balance:', error);
      throw error;
    }
  }

  /**
   * Charge seller's saved credit card for fees when balance is insufficient
   */
  async chargeSellerForFees(
    sellerWalletAddress: string,
    amount: number,
    reason: string,
    metadata?: Record<string, string>
  ): Promise<SellerFeeCharge> {
    try {
      const balance = await this.getSellerBalance(sellerWalletAddress);
      
      // Only charge if insufficient balance
      if (balance.availableRevenue >= amount) {
        safeLogger.info(`Seller ${sellerWalletAddress} has sufficient balance (${balance.availableRevenue}), no charge needed`);
        return {
          id: `fee_charge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sellerWalletAddress,
          amount,
          currency: 'USD',
          reason,
          status: 'waived',
          createdAt: new Date()
        };
      }

      // Check if seller has Stripe customer ID
      if (!balance.stripeCustomerId) {
        throw new Error('Seller has no saved payment method for fee charging');
      }

      // Get seller's default payment method
      const paymentMethods = await stripe.paymentMethods.list({
        customer: balance.stripeCustomerId,
        type: 'card'
      });

      const defaultPaymentMethod = paymentMethods.data.find(pm => pm.id === paymentMethods.data[0]?.id) 
        || paymentMethods.data[0];

      if (!defaultPaymentMethod) {
        throw new Error('No saved payment method found for seller');
      }

      // Create the charge
      const charge = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: balance.stripeCustomerId,
        payment_method: defaultPaymentMethod.id,
        off_session: true,
        confirm: true,
        metadata: {
          sellerWalletAddress,
          reason,
          ...metadata
        },
        description: `LinkDAO Seller Fee - ${reason}`
      });

      // Record the charge
      const feeChargeRecord: SellerFeeCharge = {
        id: `fee_charge_${charge.id}`,
        sellerWalletAddress,
        amount,
        currency: 'USD',
        reason,
        status: (charge.status as string) === 'succeeded' ? 'charged' : 'failed',
        chargeId: charge.id,
        paymentMethodId: defaultPaymentMethod.id,
        failureReason: (charge.status as string) !== 'succeeded' ? charge.last_payment_error?.message : undefined,
        createdAt: new Date(),
        processedAt: new Date()
      };

      // Save to database
      await db.insert(sellerFeeCharges).values({
        id: feeChargeRecord.id,
        sellerWalletAddress: feeChargeRecord.sellerWalletAddress,
        amount: feeChargeRecord.amount.toString(),
        currency: feeChargeRecord.currency,
        reason: feeChargeRecord.reason,
        status: feeChargeRecord.status,
        chargeId: feeChargeRecord.chargeId,
        paymentMethodId: feeChargeRecord.paymentMethodId,
        failureReason: feeChargeRecord.failureReason,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        createdAt: feeChargeRecord.createdAt,
        processedAt: feeChargeRecord.processedAt
      });

      if (charge.status === 'succeeded') {
        safeLogger.info(`Successfully charged seller ${sellerWalletAddress} $${amount} for ${reason}`);
      } else {
        safeLogger.warn(`Failed to charge seller ${sellerWalletAddress} $${amount} for ${reason}: ${charge.last_payment_error?.message}`);
      }

      return feeChargeRecord;
    } catch (error) {
      safeLogger.error('Error charging seller fees:', error);
      
      // Record failed charge attempt
      const failedChargeRecord = {
        id: `fee_charge_failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sellerWalletAddress,
        amount,
        currency: 'USD',
        reason,
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date()
      };

      await db.insert(sellerFeeCharges).values({
        id: failedChargeRecord.id,
        sellerWalletAddress: failedChargeRecord.sellerWalletAddress,
        amount: failedChargeRecord.amount.toString(),
        currency: failedChargeRecord.currency,
        reason: failedChargeRecord.reason,
        status: failedChargeRecord.status,
        failureReason: failedChargeRecord.failureReason,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        createdAt: failedChargeRecord.createdAt
      });

      throw error;
    }
  }

  /**
   * Get fee charge history for a seller
   */
  async getSellerFeeCharges(
    sellerWalletAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SellerFeeCharge[]> {
    try {
      const records = await db
        .select()
        .from(sellerFeeCharges)
        .where(eq(sellerFeeCharges.sellerWalletAddress, sellerWalletAddress))
        .orderBy(desc(sellerFeeCharges.createdAt))
        .limit(limit)
        .offset(offset);

      return records.map(record => ({
        id: record.id,
        sellerWalletAddress: record.sellerWalletAddress,
        amount: parseFloat(record.amount),
        currency: record.currency,
        reason: record.reason,
        status: record.status as 'pending' | 'charged' | 'failed' | 'waived',
        chargeId: record.chargeId || undefined,
        paymentMethodId: record.paymentMethodId || undefined,
        failureReason: record.failureReason || undefined,
        createdAt: record.createdAt,
        processedAt: record.processedAt || undefined
      }));
    } catch (error) {
      safeLogger.error('Error getting seller fee charges:', error);
      throw error;
    }
  }

  /**
   * Process listing fee for a new listing
   */
  async processListingFee(
    sellerWalletAddress: string,
    listingId: string,
    listingFeeAmount: number
  ): Promise<SellerFeeCharge | null> {
    try {
      const balanceCheck = await this.checkSellerBalance(sellerWalletAddress, listingFeeAmount);
      
      if (balanceCheck.hasSufficientBalance) {
        safeLogger.info(`Seller ${sellerWalletAddress} has sufficient balance for listing fee`);
        return null; // No charge needed
      }

      // Charge the fee
      const charge = await this.chargeSellerForFees(
        sellerWalletAddress,
        listingFeeAmount,
        'listing_fee',
        {
          listingId,
          listingFeeAmount: listingFeeAmount.toString()
        }
      );

      return charge;
    } catch (error) {
      safeLogger.error('Error processing listing fee:', error);
      throw error;
    }
  }

  /**
   * Refund a seller fee charge if needed
   */
  async refundSellerFee(
    chargeId: string,
    reason: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      if (!chargeId.startsWith('pi_')) {
        throw new Error('Invalid charge ID format');
      }

      const refund = await stripe.refunds.create({
        payment_intent: chargeId,
        reason: 'requested_by_customer'
      });

      // Update the fee charge record
      await db
        .update(sellerFeeCharges)
        .set({
          status: 'refunded',
          metadata: JSON.stringify({ refundId: refund.id, refundReason: reason }),
          processedAt: new Date()
        })
        .where(eq(sellerFeeCharges.chargeId, chargeId));

      return {
        success: true,
        refundId: refund.id
      };
    } catch (error) {
      safeLogger.error('Error refunding seller fee:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed'
      };
    }
  }
}

export const sellerFeeChargingService = new SellerFeeChargingService();
import { db } from '../../db';
import { safeLogger } from '../../utils/safeLogger';
import {
  escrows,
  orders,
  taxLiabilities,
} from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { EnhancedEscrowService } from '../enhancedEscrowService';
import { cryptoTaxEscrowService } from './cryptoTaxEscrowService';
import { taxRemittanceService } from './taxRemittanceService';

/**
 * Tax-Aware Escrow Service
 * Extends the enhanced escrow service to handle tax separation and escrow
 */
export class TaxAwareEscrowService {
  private escrowService: EnhancedEscrowService;

  constructor(escrowService: EnhancedEscrowService) {
    this.escrowService = escrowService;
  }

  /**
   * Release funds with tax separation
   * Splits funds into: seller amount, platform fee, and tax liability
   */
  async releaseFundsWithTaxSeparation(
    escrowId: string,
    buyerAddress: string,
    sellerAddress: string,
    chainId: number = 1
  ): Promise<{
    sellerAmount: number;
    platformFee: number;
    taxAmount: number;
    transactionHash: string;
  }> {
    try {
      safeLogger.info('Releasing funds with tax separation:', {
        escrowId,
        buyerAddress,
        sellerAddress,
      });

      // Get escrow details
      const [escrow] = await db
        .select()
        .from(escrows)
        .where(eq(escrows.id, escrowId));

      if (!escrow) {
        throw new Error(`Escrow not found: ${escrowId}`);
      }

      // Get order details for tax information
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, escrow.orderId || ''));

      if (!order) {
        throw new Error(`Order not found for escrow: ${escrowId}`);
      }

      // Get existing tax liability if one exists
      const [existingTaxLiability] = await db
        .select()
        .from(taxLiabilities)
        .where(eq(taxLiabilities.orderId, order.id));

      const taxAmount = parseFloat(existingTaxLiability?.taxAmount || '0');
      const totalEscrowAmount = parseFloat(escrow.amount);
      const sellerAmount = totalEscrowAmount - parseFloat(order.platformFee || '0') - taxAmount;

      safeLogger.info('Funds breakdown:', {
        totalEscrowAmount,
        sellerAmount,
        platformFee: order.platformFee,
        taxAmount,
      });

      // If this is a crypto transaction, handle on-chain
      if (chainId !== 0) {
        return await this.releaseCryptoFundsWithTaxSeparation(
          escrowId,
          escrow,
          order,
          sellerAmount,
          parseFloat(order.platformFee || '0'),
          taxAmount,
          chainId
        );
      }

      // For fiat transactions, just update database
      return await this.releaseFiatFundsWithTaxSeparation(
        escrowId,
        escrow,
        order,
        sellerAmount,
        parseFloat(order.platformFee || '0'),
        taxAmount
      );
    } catch (error) {
      safeLogger.error('Error releasing funds with tax separation:', error);
      throw error;
    }
  }

  /**
   * Release crypto funds with tax separation
   */
  private async releaseCryptoFundsWithTaxSeparation(
    escrowId: string,
    escrow: any,
    order: any,
    sellerAmount: number,
    platformFee: number,
    taxAmount: number,
    chainId: number
  ): Promise<{
    sellerAmount: number;
    platformFee: number;
    taxAmount: number;
    transactionHash: string;
  }> {
    try {
      safeLogger.info('Releasing crypto funds with tax separation:', {
        escrowId,
        sellerAmount,
        platformFee,
        taxAmount,
      });

      // Create tax liability on blockchain if not already created
      if (taxAmount > 0 && !escrow.taxEscrowAmount) {
        const jurisdiction = await this.getJurisdictionFromOrder(order);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 90); // 90 days for quarterly filing

        const onChainLiabilityId = await cryptoTaxEscrowService.createTaxLiabilityOnChain(
          escrowId,
          taxAmount,
          jurisdiction,
          escrow.token_address || 'ETH',
          dueDate
        );

        // Update escrow with tax information
        await cryptoTaxEscrowService.updateEscrowWithTaxInfo(
          escrowId,
          taxAmount,
          jurisdiction,
          onChainLiabilityId
        );

        safeLogger.info('Tax liability created on-chain:', {
          escrowId,
          liabilityId: onChainLiabilityId,
          taxAmount,
        });
      }

      // Release funds to seller
      const releaseResult = await this.escrowService.releaseFundsAfterReturnWindow(
        escrowId,
        chainId
      );

      // Fund tax escrow
      if (taxAmount > 0) {
        await cryptoTaxEscrowService.fundTaxLiability(
          parseInt(escrow.taxEscrowAmount || '0'),
          taxAmount,
          escrow.token_address || 'ETH'
        );
      }

      return {
        sellerAmount,
        platformFee,
        taxAmount,
        transactionHash: releaseResult.transactionHash,
      };
    } catch (error) {
      safeLogger.error('Error releasing crypto funds with tax separation:', error);
      throw error;
    }
  }

  /**
   * Release fiat funds with tax separation
   */
  private async releaseFiatFundsWithTaxSeparation(
    escrowId: string,
    escrow: any,
    order: any,
    sellerAmount: number,
    platformFee: number,
    taxAmount: number
  ): Promise<{
    sellerAmount: number;
    platformFee: number;
    taxAmount: number;
    transactionHash: string;
  }> {
    try {
      safeLogger.info('Releasing fiat funds with tax separation:', {
        escrowId,
        sellerAmount,
        platformFee,
        taxAmount,
      });

      // Update escrow status
      await db
        .update(escrows)
        .set({
          status: 'released',
          release_date: new Date(),
          updated_at: new Date(),
          metadata: {
            seller_amount: sellerAmount,
            platform_fee: platformFee,
            taxAmount: taxAmount,
          },
        })
        .where(eq(escrows.id, escrowId));

      // Mark tax as settled if exists
      if (taxAmount > 0) {
        const [taxLiability] = await db
          .select()
          .from(taxLiabilities)
          .where(eq(taxLiabilities.orderId, order.id));

        if (taxLiability) {
          await db
            .update(taxLiabilities)
            .set({
              status: 'paid',
              remittanceDate: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(taxLiabilities.id, taxLiability.id));
        }
      }

      return {
        sellerAmount,
        platformFee,
        taxAmount,
        transactionHash: '', // Fiat transactions don't have blockchain tx hash
      };
    } catch (error) {
      safeLogger.error('Error releasing fiat funds with tax separation:', error);
      throw error;
    }
  }

  /**
   * Get jurisdiction from order
   */
  private async getJurisdictionFromOrder(order: any): Promise<string> {
    // Extract jurisdiction from order metadata or buyer address
    if (order.metadata?.buyer_jurisdiction) {
      return order.metadata.buyer_jurisdiction;
    }

    // Default to US-CA
    return 'US-CA';
  }

  /**
   * Create remittance batch for collected taxes
   */
  async createRemittanceBatchForPeriod(
    periodStart: Date,
    periodEnd: Date,
    jurisdiction: string
  ): Promise<string> {
    try {
      safeLogger.info('Creating remittance batch for period:', {
        periodStart,
        periodEnd,
        jurisdiction,
      });

      const batchId = await taxRemittanceService.createRemittanceBatch(
        {
          startDate: periodStart,
          endDate: periodEnd,
          jurisdiction,
        },
        'stripe_tax' // Using Stripe Tax as default provider
      );

      safeLogger.info('Remittance batch created:', { batchId });

      return batchId;
    } catch (error) {
      safeLogger.error('Error creating remittance batch:', error);
      throw error;
    }
  }

  /**
   * Process tax payment for a batch
   */
  async processTaxPayment(
    batchId: string,
    paymentReference: string
  ): Promise<void> {
    try {
      safeLogger.info('Processing tax payment:', {
        batchId,
        paymentReference,
      });

      await taxRemittanceService.recordTaxPayment(
        batchId,
        paymentReference,
        new Date()
      );

      safeLogger.info('Tax payment processed successfully:', { batchId });
    } catch (error) {
      safeLogger.error('Error processing tax payment:', error);
      throw error;
    }
  }

  /**
   * Check for overdue tax liabilities and create alerts
   */
  async checkAndAlertOverdueTaxes(): Promise<number> {
    try {
      safeLogger.info('Checking for overdue tax liabilities...');

      const alertsCreated = await taxRemittanceService.checkOverdueTaxes();

      if (alertsCreated > 0) {
        safeLogger.warn(`Created ${alertsCreated} tax compliance alerts`);
      }

      return alertsCreated;
    } catch (error) {
      safeLogger.error('Error checking overdue taxes:', error);
      throw error;
    }
  }

  /**
   * Get tax summary for dashboard
   */
  async getTaxSummary(jurisdiction?: string) {
    try {
      const liabilities = jurisdiction
        ? await db
            .select()
            .from(taxLiabilities)
            .where(eq(taxLiabilities.taxJurisdiction, jurisdiction))
        : await db.select().from(taxLiabilities);

      const pending = liabilities.filter(l => l.status === 'pending').length;
      const pending_amount = liabilities
        .filter(l => l.status === 'pending')
        .reduce((sum, l) => sum + parseFloat(l.taxAmount), 0);

      const filed = liabilities.filter(l => l.status === 'filed').length;
      const filed_amount = liabilities
        .filter(l => l.status === 'filed')
        .reduce((sum, l) => sum + parseFloat(l.taxAmount), 0);

      const paid = liabilities.filter(l => l.status === 'paid').length;
      const paid_amount = liabilities
        .filter(l => l.status === 'paid')
        .reduce((sum, l) => sum + parseFloat(l.taxAmount), 0);

      return {
        pending: { count: pending, amount: pending_amount },
        filed: { count: filed, amount: filed_amount },
        paid: { count: paid, amount: paid_amount },
        total: {
          count: liabilities.length,
          amount: liabilities.reduce((sum, l) => sum + parseFloat(l.taxAmount), 0),
        },
      };
    } catch (error) {
      safeLogger.error('Error getting tax summary:', error);
      throw error;
    }
  }
}

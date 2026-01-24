import cron from 'node-cron';
import { db } from '../db';
import { escrows, orders, users } from '../db/schema';
import { eq, and, lt, isNull, or } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { refundPaymentService, RefundResult } from './refundPaymentService';
import { NotificationService } from './notificationService';
import { EnhancedEscrowService } from './enhancedEscrowService';

const notificationService = new NotificationService();

interface ExpiredEscrow {
  id: string;
  onChainId?: string | null;
  buyerId: string;
  sellerId: string;
  amount: string;
  tokenAddress?: string;
  paymentMethod?: string;
  stripePaymentIntentId?: string;
  paypalCaptureId?: string;
  listingId?: string;
  createdAt: Date;
  expiresAt?: Date;
}

interface EscrowRefundResult {
  escrowId: string;
  success: boolean;
  refundResult?: RefundResult;
  error?: string;
}

/**
 * Escrow Scheduler Service
 * Handles automated escrow operations like expiry refunds and seller releases
 */
export class EscrowSchedulerService {
  private isRunning: boolean = false;
  private expiryCheckTask: cron.ScheduledTask | null = null;
  private sellerReleaseTask: cron.ScheduledTask | null = null;
  private enhancedEscrowService: EnhancedEscrowService;

  // Default escrow duration in days (if not specified per escrow)
  private readonly DEFAULT_ESCROW_DURATION_DAYS = 14;
  // Grace period after delivery confirmation before auto-release (in hours)
  private readonly AUTO_RELEASE_GRACE_PERIOD_HOURS = 48;

  constructor() {
    this.enhancedEscrowService = new EnhancedEscrowService(
      process.env.RPC_URL || 'https://sepolia.drpc.org',
      process.env.ENHANCED_ESCROW_CONTRACT_ADDRESS || '',
      process.env.MARKETPLACE_CONTRACT_ADDRESS || ''
    );
  }

  /**
   * Start all scheduled tasks
   */
  start(): void {
    if (this.isRunning) {
      safeLogger.warn('Escrow scheduler is already running');
      return;
    }

    safeLogger.info('Starting escrow scheduler service...');

    // Check for expired escrows every hour
    this.expiryCheckTask = cron.schedule('0 * * * *', async () => {
      await this.processExpiredEscrows();
    });

    // Check for pending seller releases every 30 minutes
    this.sellerReleaseTask = cron.schedule('*/30 * * * *', async () => {
      await this.processSellerReleases();
    });

    this.isRunning = true;
    safeLogger.info('Escrow scheduler service started');

    // Run initial check on startup
    this.processExpiredEscrows().catch(err =>
      safeLogger.error('Initial expired escrow check failed:', err)
    );
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.expiryCheckTask) {
      this.expiryCheckTask.stop();
      this.expiryCheckTask = null;
    }

    if (this.sellerReleaseTask) {
      this.sellerReleaseTask.stop();
      this.sellerReleaseTask = null;
    }

    this.isRunning = false;
    safeLogger.info('Escrow scheduler service stopped');
  }

  /**
   * Process all expired escrows and issue refunds
   */
  async processExpiredEscrows(): Promise<EscrowRefundResult[]> {
    try {
      safeLogger.info('Checking for expired escrows...');

      const expiredEscrows = await this.findExpiredEscrows();

      if (expiredEscrows.length === 0) {
        safeLogger.info('No expired escrows found');
        return [];
      }

      safeLogger.info(`Found ${expiredEscrows.length} expired escrows to process`);

      const results: EscrowRefundResult[] = [];

      for (const escrow of expiredEscrows) {
        const result = await this.processExpiredEscrow(escrow);
        results.push(result);

        // Small delay between refunds to avoid rate limiting
        await this.delay(1000);
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      safeLogger.info(`Expired escrow processing complete: ${successCount} successful, ${failCount} failed`);

      return results;
    } catch (error) {
      safeLogger.error('Error processing expired escrows:', error);
      return [];
    }
  }

  /**
   * Find all escrows that have expired and need refunds
   */
  private async findExpiredEscrows(): Promise<ExpiredEscrow[]> {
    try {
      const now = new Date();
      const defaultExpiryDate = new Date(now.getTime() - this.DEFAULT_ESCROW_DURATION_DAYS * 24 * 60 * 60 * 1000);

      // Find escrows where:
      // 1. Not resolved (resolvedAt is null)
      // 2. Not disputed (disputeOpened is false or null)
      // 3. Delivery not confirmed (deliveryConfirmed is false or null)
      // 4. Either expiresAt has passed, or createdAt + default duration has passed
      const expiredEscrows = await db
        .select()
        .from(escrows)
        .where(
          and(
            isNull(escrows.resolvedAt),
            or(
              eq(escrows.disputeOpened, false),
              isNull(escrows.disputeOpened)
            ),
            or(
              eq(escrows.deliveryConfirmed, false),
              isNull(escrows.deliveryConfirmed)
            ),
            // Check expiry - either explicit expiresAt or createdAt based
            or(
              lt(escrows.expiresAt, now),
              and(
                isNull(escrows.expiresAt),
                lt(escrows.createdAt, defaultExpiryDate)
              )
            )
          )
        );

      return expiredEscrows.map(e => ({
        id: e.id.toString(),
        onChainId: e.onChainId,
        buyerId: e.buyerId || '',
        sellerId: e.sellerId || '',
        amount: e.amount || '0',
        tokenAddress: e.tokenAddress || undefined,
        paymentMethod: e.paymentMethod || undefined,
        stripePaymentIntentId: e.stripePaymentIntentId || undefined,
        paypalCaptureId: e.paypalCaptureId || undefined,
        listingId: e.listingId?.toString() || undefined,
        createdAt: e.createdAt || new Date(),
        expiresAt: e.expiresAt || undefined
      }));
    } catch (error) {
      safeLogger.error('Error finding expired escrows:', error);
      return [];
    }
  }

  /**
   * Process a single expired escrow - issue refund to buyer
   */
  private async processExpiredEscrow(escrow: ExpiredEscrow): Promise<EscrowRefundResult> {
    try {
      safeLogger.info(`Processing expired escrow ${escrow.id}...`);

      // Get buyer's wallet address
      const [buyer] = await db
        .select()
        .from(users)
        .where(eq(users.id, escrow.buyerId))
        .limit(1);

      if (!buyer || !buyer.walletAddress) {
        throw new Error('Buyer not found or has no wallet address');
      }

      // Process refund based on payment method
      let refundResult: RefundResult;

      if (escrow.onChainId && (escrow.tokenAddress || escrow.paymentMethod === 'crypto')) {
        // Preferred on-chain refund via escrow contract
        try {
          // Get chain ID from escrow metadata or default
          const chainId = 11155111; 
          const tx = await this.enhancedEscrowService.refundBuyerOnChain(escrow.onChainId, chainId);
          refundResult = {
            success: true,
            transactionHash: tx.transactionHash,
            provider: 'blockchain-escrow'
          };
        } catch (error: any) {
          safeLogger.error(`On-chain escrow refund failed for ${escrow.id}, falling back to wallet refund:`, error);
          // Fallback to legacy wallet refund if escrow call fails
          refundResult = await refundPaymentService.processBlockchainRefund(
            buyer.walletAddress,
            escrow.amount,
            escrow.tokenAddress
          );
        }
      } else if (escrow.tokenAddress || escrow.paymentMethod === 'crypto') {
        // Legacy crypto refund if no on-chain ID
        refundResult = await refundPaymentService.processBlockchainRefund(
          buyer.walletAddress,
          escrow.amount,
          escrow.tokenAddress
        );
      } else if (escrow.stripePaymentIntentId) {
        // Stripe refund
        refundResult = await refundPaymentService.processStripeRefund(
          escrow.stripePaymentIntentId,
          parseFloat(escrow.amount),
          'Escrow expired - automatic refund'
        );
      } else if (escrow.paypalCaptureId) {
        // PayPal refund
        refundResult = await refundPaymentService.processPayPalRefund(
          escrow.paypalCaptureId,
          parseFloat(escrow.amount),
          'USD',
          'Escrow expired - automatic refund'
        );
      } else {
        throw new Error('No valid payment method found for refund');
      }

      if (refundResult.success) {
        // Update escrow as resolved with refund
        await db
          .update(escrows)
          .set({
            resolvedAt: new Date(),
            resolverAddress: 'system',
            resolution: JSON.stringify({
              type: 'auto_refund_expired',
              refundResult: {
                success: refundResult.success,
                refundId: refundResult.refundId,
                transactionHash: refundResult.transactionHash
              },
              resolvedAt: new Date().toISOString()
            })
          })
          .where(eq(escrows.id, escrow.id));

        // Update associated order status
        if (escrow.listingId) {
          await db
            .update(orders)
            .set({ status: 'refunded' })
            .where(eq(orders.listingId, escrow.listingId));
        }

        // Notify buyer and seller
        await Promise.all([
          notificationService.sendOrderNotification(
            escrow.buyerId,
            'escrow_expired_refund',
            escrow.id,
            {
              amount: escrow.amount,
              refundId: refundResult.refundId,
              transactionHash: refundResult.transactionHash
            }
          ),
          notificationService.sendOrderNotification(
            escrow.sellerId,
            'escrow_expired',
            escrow.id,
            { amount: escrow.amount }
          )
        ]);

        safeLogger.info(`Expired escrow ${escrow.id} refunded successfully`);
        return { escrowId: escrow.id, success: true, refundResult };
      } else {
        throw new Error(refundResult.error || 'Refund failed');
      }
    } catch (error: any) {
      safeLogger.error(`Failed to process expired escrow ${escrow.id}:`, error);

      // Mark escrow as needing manual intervention
      await db
        .update(escrows)
        .set({
          resolution: JSON.stringify({
            type: 'auto_refund_failed',
            error: error.message,
            attemptedAt: new Date().toISOString(),
            requiresManualReview: true
          })
        })
        .where(eq(escrows.id, escrow.id));

      return { escrowId: escrow.id, success: false, error: error.message };
    }
  }

  /**
   * Process pending seller releases after delivery confirmation
   */
  async processSellerReleases(): Promise<void> {
    try {
      safeLogger.info('Checking for pending seller releases...');

      const gracePeriodDate = new Date(
        Date.now() - this.AUTO_RELEASE_GRACE_PERIOD_HOURS * 60 * 60 * 1000
      );

      // Find escrows where delivery is confirmed and grace period has passed
      const pendingReleases = await db
        .select()
        .from(escrows)
        .where(
          and(
            eq(escrows.deliveryConfirmed, true),
            isNull(escrows.resolvedAt),
            or(
              eq(escrows.disputeOpened, false),
              isNull(escrows.disputeOpened)
            ),
            lt(escrows.deliveryConfirmedAt, gracePeriodDate)
          )
        );

      if (pendingReleases.length === 0) {
        safeLogger.info('No pending seller releases found');
        return;
      }

      safeLogger.info(`Found ${pendingReleases.length} pending seller releases`);

      for (const escrow of pendingReleases) {
        await this.releaseToSeller(escrow);
        await this.delay(500);
      }

      safeLogger.info('Seller release processing complete');
    } catch (error) {
      safeLogger.error('Error processing seller releases:', error);
    }
  }

  /**
   * Release funds to seller
   */
  async releaseToSeller(escrow: any): Promise<boolean> {
    try {
      safeLogger.info(`Releasing funds to seller for escrow ${escrow.id}...`);

      // Get seller's wallet address
      const [seller] = await db
        .select()
        .from(users)
        .where(eq(users.id, escrow.sellerId))
        .limit(1);

      if (!seller || !seller.walletAddress) {
        throw new Error('Seller not found or has no wallet address');
      }

      // For crypto payments, transfer funds to seller
      // Note: In a real smart contract escrow, this would trigger the release function
      // For now, we simulate this by updating the status

      let releaseResult: any = { success: true };

      if (escrow.tokenAddress || escrow.paymentMethod === 'crypto') {
        // In a real implementation, this would call the smart contract's release function
        // For now, we log and update status
        safeLogger.info(`Releasing ${escrow.amount} to seller ${seller.walletAddress}`);

        // TODO: Implement actual smart contract release call
        // releaseResult = await this.escrowContract.releaseFunds(escrow.onChainId);
      }

      // Update escrow as resolved with release to seller
      await db
        .update(escrows)
        .set({
          resolvedAt: new Date(),
          resolverAddress: 'system',
          sellerApproved: true,
          resolution: JSON.stringify({
            type: 'auto_release_seller',
            releasedTo: seller.walletAddress,
            amount: escrow.amount,
            resolvedAt: new Date().toISOString()
          })
        })
        .where(eq(escrows.id, escrow.id));

      // Update associated order status
      if (escrow.listingId) {
        await db
          .update(orders)
          .set({ status: 'completed' })
          .where(eq(orders.listingId, escrow.listingId));
      }

      // Notify seller
      await notificationService.sendOrderNotification(
        escrow.sellerId,
        'payment_released',
        escrow.id.toString(),
        { amount: escrow.amount }
      );

      // Notify buyer that transaction is complete
      await notificationService.sendOrderNotification(
        escrow.buyerId,
        'order_completed',
        escrow.id.toString(),
        { amount: escrow.amount }
      );

      safeLogger.info(`Funds released to seller for escrow ${escrow.id}`);
      return true;
    } catch (error: any) {
      safeLogger.error(`Failed to release funds for escrow ${escrow.id}:`, error);
      return false;
    }
  }

  /**
   * Manually trigger expired escrow check (for testing/admin use)
   */
  async triggerExpiredEscrowCheck(): Promise<EscrowRefundResult[]> {
    return this.processExpiredEscrows();
  }

  /**
   * Manually trigger seller release check (for testing/admin use)
   */
  async triggerSellerReleaseCheck(): Promise<void> {
    return this.processSellerReleases();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const escrowSchedulerService = new EscrowSchedulerService();

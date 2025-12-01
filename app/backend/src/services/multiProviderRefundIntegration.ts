import { stripeRefundProvider } from './providers/stripeRefundProvider';
import { paypalRefundProvider } from './providers/paypalRefundProvider';
import { blockchainRefundProvider } from './providers/blockchainRefundProvider';
import { refundMonitoringService } from './refundMonitoringService';
import { db } from '../db/index';
import { refundProviderTransactions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { safeLogger } from '../utils/logger';

/**
 * Provider type enum
 */
export type RefundProvider = 'stripe' | 'paypal' | 'blockchain';

/**
 * Refund request interface
 */
export interface RefundRequest {
  returnId: string;
  refundId: string;
  provider: RefundProvider;
  amount: number;
  currency: string;
  providerTransactionId: string; // Payment intent ID, capture ID, or transaction hash
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Refund result interface
 */
export interface RefundResult {
  success: boolean;
  refundRecordId: string;
  providerRefundId: string;
  status: string;
  amount: number;
  currency: string;
  processingTime: number;
  provider: RefundProvider;
  errorMessage?: string;
  transactionDetails?: any;
}

/**
 * Provider health status
 */
export interface ProviderHealthStatus {
  provider: RefundProvider;
  isHealthy: boolean;
  successRate: number;
  averageProcessingTime: number;
  lastSuccessfulRefund: Date | null;
  errorRate: number;
  recentErrors: string[];
  status: 'operational' | 'degraded' | 'down';
}

/**
 * Multi-Provider Refund Integration Service
 * Orchestrates refund processing across Stripe, PayPal, and blockchain providers
 * Implements Property 7: Multi-Provider Transaction Tracking
 */
export class MultiProviderRefundIntegration {
  /**
   * Process a refund through the appropriate provider
   * Validates: Requirements 3.1 - Track status across all payment providers in real-time
   * @param request - Refund request details
   * @returns Refund result
   */
  async processRefund(request: RefundRequest): Promise<RefundResult> {
    const startTime = Date.now();

    try {
      // Create initial refund financial record
      const refundRecord = await refundMonitoringService.trackRefundTransaction({
        returnId: request.returnId,
        refundId: request.refundId,
        originalAmount: request.amount,
        refundAmount: request.amount,
        paymentProvider: request.provider,
        providerTransactionId: request.providerTransactionId,
        currency: request.currency,
        metadata: request.metadata
      });

      // Create provider transaction record
      const providerTransactionId = uuidv4();
      await db.insert(refundProviderTransactions).values({
        id: providerTransactionId,
        refundRecordId: refundRecord.id,
        providerName: request.provider,
        providerTransactionId: request.providerTransactionId,
        providerStatus: 'pending',
        requestPayload: JSON.stringify(request),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Process refund through appropriate provider
      let providerResult: any;
      
      switch (request.provider) {
        case 'stripe':
          providerResult = await this.processStripeRefund(
            request.providerTransactionId,
            request.amount,
            request.reason
          );
          break;
          
        case 'paypal':
          providerResult = await this.processPayPalRefund(
            request.providerTransactionId,
            request.amount,
            request.currency,
            request.reason
          );
          break;
          
        case 'blockchain':
          providerResult = await this.processBlockchainRefund(
            request.metadata?.recipientAddress || '',
            request.amount,
            request.metadata?.tokenAddress,
            request.metadata?.tokenDecimals
          );
          break;
          
        default:
          throw new Error(`Unsupported provider: ${request.provider}`);
      }

      // Update provider transaction record
      await db.update(refundProviderTransactions)
        .set({
          providerRefundId: providerResult.refundId || providerResult.transactionHash,
          providerStatus: providerResult.success ? 'completed' : 'failed',
          responsePayload: JSON.stringify(providerResult),
          completedAt: providerResult.success ? new Date() : null,
          failureMessage: providerResult.errorMessage,
          processingTimeMs: providerResult.processingTime,
          updatedAt: new Date()
        })
        .where(eq(refundProviderTransactions.id, providerTransactionId));

      // Update refund financial record status
      await refundMonitoringService.updateRefundStatus(
        refundRecord.id,
        providerResult.success ? 'completed' : 'failed',
        providerResult.success ? new Date() : undefined,
        providerResult.errorMessage
      );

      const totalProcessingTime = Date.now() - startTime;

      safeLogger.info(`Multi-provider refund processed`, {
        provider: request.provider,
        success: providerResult.success,
        refundRecordId: refundRecord.id,
        processingTime: totalProcessingTime
      });

      return {
        success: providerResult.success,
        refundRecordId: refundRecord.id,
        providerRefundId: providerResult.refundId || providerResult.transactionHash || '',
        status: providerResult.status,
        amount: providerResult.amount || request.amount,
        currency: providerResult.currency || request.currency,
        processingTime: totalProcessingTime,
        provider: request.provider,
        errorMessage: providerResult.errorMessage,
        transactionDetails: providerResult
      };
    } catch (error: any) {
      const totalProcessingTime = Date.now() - startTime;
      
      safeLogger.error('Multi-provider refund failed:', error);
      
      return {
        success: false,
        refundRecordId: '',
        providerRefundId: '',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        processingTime: totalProcessingTime,
        provider: request.provider,
        errorMessage: error.message || 'Unknown error during refund processing'
      };
    }
  }

  /**
   * Process Stripe refund
   * @private
   */
  private async processStripeRefund(
    paymentIntentId: string,
    amount: number,
    reason?: string
  ): Promise<any> {
    return await stripeRefundProvider.processRefund(paymentIntentId, amount, reason);
  }

  /**
   * Process PayPal refund
   * @private
   */
  private async processPayPalRefund(
    captureId: string,
    amount: number,
    currency: string,
    note?: string
  ): Promise<any> {
    return await paypalRefundProvider.processRefund(captureId, amount, currency, note);
  }

  /**
   * Process blockchain refund
   * @private
   */
  private async processBlockchainRefund(
    recipientAddress: string,
    amount: number,
    tokenAddress?: string,
    tokenDecimals?: number
  ): Promise<any> {
    if (tokenAddress) {
      return await blockchainRefundProvider.processERC20TokenRefund(
        tokenAddress,
        recipientAddress,
        amount,
        tokenDecimals || 18
      );
    } else {
      return await blockchainRefundProvider.processNativeTokenRefund(
        recipientAddress,
        amount
      );
    }
  }

  /**
   * Get refund status from provider
   * Validates: Requirements 3.1 - Track status across all payment providers in real-time
   * @param provider - Provider name
   * @param providerRefundId - Provider-specific refund ID
   * @returns Refund status
   */
  async getProviderRefundStatus(
    provider: RefundProvider,
    providerRefundId: string
  ): Promise<{
    status: string;
    amount: number;
    currency: string;
    created: Date;
    failureReason?: string;
  }> {
    try {
      switch (provider) {
        case 'stripe':
          return await stripeRefundProvider.getRefundStatus(providerRefundId);
          
        case 'paypal':
          return await paypalRefundProvider.getRefundStatus(providerRefundId);
          
        case 'blockchain':
          const txStatus = await blockchainRefundProvider.getTransactionStatus(providerRefundId);
          return {
            status: txStatus.status,
            amount: 0, // Amount not available from transaction hash alone
            currency: 'ETH',
            created: txStatus.timestamp || new Date(),
            failureReason: txStatus.status === 'failed' ? 'Transaction failed' : undefined
          };
          
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error: any) {
      safeLogger.error('Error getting provider refund status:', error);
      throw new Error(`Failed to get refund status from ${provider}: ${error.message}`);
    }
  }

  /**
   * Get health status for all providers
   * Validates: Requirements 3.1 - Track status across all payment providers in real-time
   * @returns Array of provider health statuses
   */
  async getAllProviderHealthStatus(): Promise<ProviderHealthStatus[]> {
    try {
      // Get status from refund monitoring service
      const providerStatuses = await refundMonitoringService.getProviderStatus();

      // Map to health status format
      return providerStatuses.map(status => ({
        provider: status.provider,
        isHealthy: status.status === 'operational',
        successRate: status.successRate,
        averageProcessingTime: status.averageProcessingTime,
        lastSuccessfulRefund: status.lastSuccessfulRefund,
        errorRate: status.errorRate,
        recentErrors: status.recentErrors,
        status: status.status
      }));
    } catch (error: any) {
      safeLogger.error('Error getting provider health status:', error);
      throw new Error('Failed to retrieve provider health status');
    }
  }

  /**
   * Sync provider transaction status
   * Updates local records with latest status from provider
   * @param providerTransactionId - Provider transaction record ID
   */
  async syncProviderTransactionStatus(providerTransactionId: string): Promise<void> {
    try {
      // Get provider transaction record
      const [transaction] = await db
        .select()
        .from(refundProviderTransactions)
        .where(eq(refundProviderTransactions.id, providerTransactionId));

      if (!transaction || !transaction.providerRefundId) {
        throw new Error('Provider transaction not found or no refund ID');
      }

      // Get latest status from provider
      const status = await this.getProviderRefundStatus(
        transaction.providerName as RefundProvider,
        transaction.providerRefundId
      );

      // Update provider transaction record
      await db.update(refundProviderTransactions)
        .set({
          providerStatus: status.status,
          responsePayload: JSON.stringify(status),
          updatedAt: new Date()
        })
        .where(eq(refundProviderTransactions.id, providerTransactionId));

      // Update refund financial record if status changed
      if (transaction.refundRecordId) {
        const newStatus = status.status === 'completed' || status.status === 'COMPLETED' 
          ? 'completed' 
          : status.status === 'failed' || status.status === 'FAILED'
          ? 'failed'
          : 'pending';

        await refundMonitoringService.updateRefundStatus(
          transaction.refundRecordId,
          newStatus as any,
          status.status === 'completed' ? new Date() : undefined,
          status.failureReason
        );
      }

      safeLogger.info(`Provider transaction status synced: ${providerTransactionId}`);
    } catch (error: any) {
      safeLogger.error('Error syncing provider transaction status:', error);
      throw new Error('Failed to sync provider transaction status');
    }
  }

  /**
   * Batch sync provider transactions
   * Syncs status for multiple transactions
   * @param providerTransactionIds - Array of provider transaction IDs
   */
  async batchSyncProviderTransactions(providerTransactionIds: string[]): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>
    };

    for (const id of providerTransactionIds) {
      try {
        await this.syncProviderTransactionStatus(id);
        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          id,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get provider capabilities
   * Returns information about what each provider supports
   * @returns Provider capabilities
   */
  getProviderCapabilities(): Record<RefundProvider, {
    supportedCurrencies: string[];
    supportsPartialRefunds: boolean;
    supportsInstantRefunds: boolean;
    averageProcessingTime: string;
    requiresWebhooks: boolean;
  }> {
    return {
      stripe: {
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
        supportsPartialRefunds: true,
        supportsInstantRefunds: true,
        averageProcessingTime: '5-10 seconds',
        requiresWebhooks: true
      },
      paypal: {
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        supportsPartialRefunds: true,
        supportsInstantRefunds: false,
        averageProcessingTime: '1-3 minutes',
        requiresWebhooks: true
      },
      blockchain: {
        supportedCurrencies: ['ETH', 'USDC', 'USDT', 'DAI', 'MATIC'],
        supportsPartialRefunds: true,
        supportsInstantRefunds: true,
        averageProcessingTime: '15-60 seconds',
        requiresWebhooks: false
      }
    };
  }
}

// Export singleton instance
export const multiProviderRefundIntegration = new MultiProviderRefundIntegration();

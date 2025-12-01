import { db } from '../db/index';
import { 
  refundFinancialRecords,
  refundProviderTransactions,
  refundReconciliationRecords,
  refundTransactionAuditLog
} from '../db/schema';
import { eq, and, gte, lte, desc, sql, count, sum, avg } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { safeLogger } from '../utils/logger';

/**
 * Refund Transaction Tracker Interface
 * Tracks all refund transactions across the platform
 */
export interface RefundTransactionTracker {
  totalRefunds: number;
  totalRefundAmount: number;
  successfulRefunds: number;
  failedRefunds: number;
  pendingRefunds: number;
  averageRefundTime: number;
  providerBreakdown: ProviderRefundStats[];
}

/**
 * Provider-specific refund statistics
 */
export interface ProviderRefundStats {
  provider: string;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  averageProcessingTime: number;
  successRate: number;
}

/**
 * Payment Provider Status
 * Real-time status of payment providers
 */
export interface PaymentProviderStatus {
  provider: 'stripe' | 'paypal' | 'blockchain';
  status: 'operational' | 'degraded' | 'down';
  successRate: number;
  averageProcessingTime: number;
  lastSuccessfulRefund: Date | null;
  errorRate: number;
  recentErrors: string[];
}

/**
 * Refund Reconciliation Data
 * Tracks reconciliation status and discrepancies
 */
export interface RefundReconciliation {
  totalReconciled: number;
  totalPending: number;
  totalDiscrepancies: number;
  totalDiscrepancyAmount: number;
  reconciliationRate: number;
  averageReconciliationTime: number;
}

/**
 * Refund Failure Analysis
 * Analyzes refund failures and patterns
 */
export interface RefundFailureAnalysis {
  totalFailures: number;
  failuresByProvider: Record<string, number>;
  failuresByReason: Record<string, number>;
  averageRetryCount: number;
  successfulRetries: number;
  permanentFailures: number;
}

/**
 * Refund Monitoring Service
 * Comprehensive service for monitoring refund transactions, provider status, and reconciliation
 */
export class RefundMonitoringService {
  /**
   * Get comprehensive refund transaction tracking data
   * @param startDate - Start date for the tracking period
   * @param endDate - End date for the tracking period
   * @returns RefundTransactionTracker with all metrics
   */
  async getTransactionTracker(
    startDate: Date,
    endDate: Date
  ): Promise<RefundTransactionTracker> {
    try {
      // Get overall refund statistics
      const [stats] = await db
        .select({
          totalRefunds: count(refundFinancialRecords.id),
          totalRefundAmount: sum(refundFinancialRecords.refundAmount),
          successfulRefunds: sql<number>`COUNT(CASE WHEN ${refundFinancialRecords.status} = 'completed' THEN 1 END)`,
          failedRefunds: sql<number>`COUNT(CASE WHEN ${refundFinancialRecords.status} = 'failed' THEN 1 END)`,
          pendingRefunds: sql<number>`COUNT(CASE WHEN ${refundFinancialRecords.status} = 'pending' THEN 1 END)`,
          averageRefundTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${refundFinancialRecords.processedAt} - ${refundFinancialRecords.createdAt})))`
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate)
          )
        );

      // Get provider breakdown
      const providerStats = await db
        .select({
          provider: refundFinancialRecords.paymentProvider,
          totalTransactions: count(refundFinancialRecords.id),
          successfulTransactions: sql<number>`COUNT(CASE WHEN ${refundFinancialRecords.status} = 'completed' THEN 1 END)`,
          failedTransactions: sql<number>`COUNT(CASE WHEN ${refundFinancialRecords.status} = 'failed' THEN 1 END)`,
          totalAmount: sum(refundFinancialRecords.refundAmount),
          averageProcessingTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${refundFinancialRecords.processedAt} - ${refundFinancialRecords.createdAt})))`
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate)
          )
        )
        .groupBy(refundFinancialRecords.paymentProvider);

      const providerBreakdown: ProviderRefundStats[] = providerStats.map(stat => ({
        provider: stat.provider,
        totalTransactions: Number(stat.totalTransactions) || 0,
        successfulTransactions: Number(stat.successfulTransactions) || 0,
        failedTransactions: Number(stat.failedTransactions) || 0,
        totalAmount: Number(stat.totalAmount) || 0,
        averageProcessingTime: Number(stat.averageProcessingTime) || 0,
        successRate: stat.totalTransactions > 0 
          ? (Number(stat.successfulTransactions) / Number(stat.totalTransactions)) * 100 
          : 0
      }));

      return {
        totalRefunds: Number(stats.totalRefunds) || 0,
        totalRefundAmount: Number(stats.totalRefundAmount) || 0,
        successfulRefunds: Number(stats.successfulRefunds) || 0,
        failedRefunds: Number(stats.failedRefunds) || 0,
        pendingRefunds: Number(stats.pendingRefunds) || 0,
        averageRefundTime: Number(stats.averageRefundTime) || 0,
        providerBreakdown
      };
    } catch (error) {
      safeLogger.error('Error getting transaction tracker:', error);
      throw new Error('Failed to retrieve refund transaction tracking data');
    }
  }

  /**
   * Get real-time payment provider status
   * Monitors health and performance of all payment providers
   * @returns Array of PaymentProviderStatus for each provider
   */
  async getProviderStatus(): Promise<PaymentProviderStatus[]> {
    try {
      const providers: Array<'stripe' | 'paypal' | 'blockchain'> = ['stripe', 'paypal', 'blockchain'];
      const providerStatuses: PaymentProviderStatus[] = [];

      // Check last 1 hour of transactions for each provider
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      for (const provider of providers) {
        // Get recent transaction statistics
        const [recentStats] = await db
          .select({
            totalTransactions: count(refundProviderTransactions.id),
            successfulTransactions: sql<number>`COUNT(CASE WHEN ${refundProviderTransactions.providerStatus} = 'completed' THEN 1 END)`,
            failedTransactions: sql<number>`COUNT(CASE WHEN ${refundProviderTransactions.providerStatus} = 'failed' THEN 1 END)`,
            averageProcessingTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${refundProviderTransactions.completedAt} - ${refundProviderTransactions.createdAt})))`,
            lastSuccessfulRefund: sql<Date>`MAX(CASE WHEN ${refundProviderTransactions.providerStatus} = 'completed' THEN ${refundProviderTransactions.completedAt} END)`
          })
          .from(refundProviderTransactions)
          .where(
            and(
              eq(refundProviderTransactions.providerName, provider),
              gte(refundProviderTransactions.createdAt, oneHourAgo)
            )
          );

        // Get recent error messages
        const recentErrors = await db
          .select({
            failureMessage: refundProviderTransactions.failureMessage
          })
          .from(refundProviderTransactions)
          .where(
            and(
              eq(refundProviderTransactions.providerName, provider),
              eq(refundProviderTransactions.providerStatus, 'failed'),
              gte(refundProviderTransactions.createdAt, oneHourAgo)
            )
          )
          .limit(5)
          .orderBy(desc(refundProviderTransactions.createdAt));

        const totalTransactions = Number(recentStats.totalTransactions) || 0;
        const successfulTransactions = Number(recentStats.successfulTransactions) || 0;
        const failedTransactions = Number(recentStats.failedTransactions) || 0;
        
        const successRate = totalTransactions > 0 
          ? (successfulTransactions / totalTransactions) * 100 
          : 100;
        
        const errorRate = totalTransactions > 0 
          ? (failedTransactions / totalTransactions) * 100 
          : 0;

        // Determine provider status based on success rate
        let status: 'operational' | 'degraded' | 'down';
        if (successRate >= 95) {
          status = 'operational';
        } else if (successRate >= 80) {
          status = 'degraded';
        } else {
          status = 'down';
        }

        providerStatuses.push({
          provider,
          status,
          successRate,
          averageProcessingTime: Number(recentStats.averageProcessingTime) || 0,
          lastSuccessfulRefund: recentStats.lastSuccessfulRefund || null,
          errorRate,
          recentErrors: recentErrors
            .map(e => e.failureMessage)
            .filter((msg): msg is string => msg !== null)
        });
      }

      return providerStatuses;
    } catch (error) {
      safeLogger.error('Error getting provider status:', error);
      throw new Error('Failed to retrieve payment provider status');
    }
  }

  /**
   * Get refund reconciliation data
   * Tracks reconciliation status and identifies discrepancies
   * @param startDate - Start date for reconciliation period
   * @param endDate - End date for reconciliation period
   * @returns RefundReconciliation data
   */
  async getReconciliationData(
    startDate: Date,
    endDate: Date
  ): Promise<RefundReconciliation> {
    try {
      const [reconciliationStats] = await db
        .select({
          totalReconciled: sql<number>`COUNT(CASE WHEN ${refundReconciliationRecords.reconciliationStatus} = 'reconciled' THEN 1 END)`,
          totalPending: sql<number>`COUNT(CASE WHEN ${refundReconciliationRecords.reconciliationStatus} = 'pending' THEN 1 END)`,
          totalDiscrepancies: sql<number>`COUNT(CASE WHEN ${refundReconciliationRecords.discrepancyAmount} != 0 THEN 1 END)`,
          totalDiscrepancyAmount: sql<number>`SUM(ABS(${refundReconciliationRecords.discrepancyAmount}))`,
          averageReconciliationTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${refundReconciliationRecords.updatedAt} - ${refundReconciliationRecords.createdAt})))`
        })
        .from(refundReconciliationRecords)
        .where(
          and(
            gte(refundReconciliationRecords.reconciliationDate, startDate),
            lte(refundReconciliationRecords.reconciliationDate, endDate)
          )
        );

      const totalReconciled = Number(reconciliationStats.totalReconciled) || 0;
      const totalPending = Number(reconciliationStats.totalPending) || 0;
      const totalRecords = totalReconciled + totalPending;

      return {
        totalReconciled,
        totalPending,
        totalDiscrepancies: Number(reconciliationStats.totalDiscrepancies) || 0,
        totalDiscrepancyAmount: Number(reconciliationStats.totalDiscrepancyAmount) || 0,
        reconciliationRate: totalRecords > 0 ? (totalReconciled / totalRecords) * 100 : 0,
        averageReconciliationTime: Number(reconciliationStats.averageReconciliationTime) || 0
      };
    } catch (error) {
      safeLogger.error('Error getting reconciliation data:', error);
      throw new Error('Failed to retrieve reconciliation data');
    }
  }

  /**
   * Analyze refund failures
   * Provides detailed analysis of refund failures and patterns
   * @param startDate - Start date for analysis period
   * @param endDate - End date for analysis period
   * @returns RefundFailureAnalysis data
   */
  async analyzeFailures(
    startDate: Date,
    endDate: Date
  ): Promise<RefundFailureAnalysis> {
    try {
      // Get overall failure statistics
      const [failureStats] = await db
        .select({
          totalFailures: count(refundFinancialRecords.id),
          averageRetryCount: avg(refundFinancialRecords.retryCount),
          successfulRetries: sql<number>`COUNT(CASE WHEN ${refundFinancialRecords.retryCount} > 0 AND ${refundFinancialRecords.status} = 'completed' THEN 1 END)`,
          permanentFailures: sql<number>`COUNT(CASE WHEN ${refundFinancialRecords.retryCount} >= 3 AND ${refundFinancialRecords.status} = 'failed' THEN 1 END)`
        })
        .from(refundFinancialRecords)
        .where(
          and(
            eq(refundFinancialRecords.status, 'failed'),
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate)
          )
        );

      // Get failures by provider
      const providerFailures = await db
        .select({
          provider: refundFinancialRecords.paymentProvider,
          failureCount: count(refundFinancialRecords.id)
        })
        .from(refundFinancialRecords)
        .where(
          and(
            eq(refundFinancialRecords.status, 'failed'),
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate)
          )
        )
        .groupBy(refundFinancialRecords.paymentProvider);

      // Get failures by reason
      const reasonFailures = await db
        .select({
          reason: refundFinancialRecords.failureReason,
          failureCount: count(refundFinancialRecords.id)
        })
        .from(refundFinancialRecords)
        .where(
          and(
            eq(refundFinancialRecords.status, 'failed'),
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate)
          )
        )
        .groupBy(refundFinancialRecords.failureReason);

      const failuresByProvider: Record<string, number> = {};
      providerFailures.forEach(pf => {
        failuresByProvider[pf.provider] = Number(pf.failureCount);
      });

      const failuresByReason: Record<string, number> = {};
      reasonFailures.forEach(rf => {
        if (rf.reason) {
          failuresByReason[rf.reason] = Number(rf.failureCount);
        }
      });

      return {
        totalFailures: Number(failureStats.totalFailures) || 0,
        failuresByProvider,
        failuresByReason,
        averageRetryCount: Number(failureStats.averageRetryCount) || 0,
        successfulRetries: Number(failureStats.successfulRetries) || 0,
        permanentFailures: Number(failureStats.permanentFailures) || 0
      };
    } catch (error) {
      safeLogger.error('Error analyzing failures:', error);
      throw new Error('Failed to analyze refund failures');
    }
  }

  /**
   * Track a refund transaction
   * Creates or updates a refund financial record
   * @param refundData - Refund transaction data
   * @returns Created refund record
   */
  async trackRefundTransaction(refundData: {
    returnId: string;
    refundId: string;
    originalAmount: number;
    refundAmount: number;
    processingFee?: number;
    platformFeeImpact?: number;
    sellerImpact?: number;
    paymentProvider: string;
    providerTransactionId?: string;
    currency?: string;
    refundMethod?: string;
    metadata?: any;
  }): Promise<any> {
    try {
      const refundRecord = {
        id: uuidv4(),
        returnId: refundData.returnId,
        refundId: refundData.refundId,
        originalAmount: refundData.originalAmount,
        refundAmount: refundData.refundAmount,
        processingFee: refundData.processingFee || 0,
        platformFeeImpact: refundData.platformFeeImpact || 0,
        sellerImpact: refundData.sellerImpact || 0,
        paymentProvider: refundData.paymentProvider,
        providerTransactionId: refundData.providerTransactionId,
        status: 'pending',
        reconciled: false,
        currency: refundData.currency || 'USD',
        refundMethod: refundData.refundMethod,
        retryCount: 0,
        metadata: refundData.metadata ? JSON.stringify(refundData.metadata) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [newRecord] = await db
        .insert(refundFinancialRecords)
        .values(refundRecord)
        .returning();

      // Log the transaction creation
      await this.logAuditAction(
        newRecord.id,
        'created',
        'Refund transaction created',
        null,
        null,
        newRecord
      );

      safeLogger.info(`Refund transaction tracked: ${newRecord.id}`);
      return newRecord;
    } catch (error) {
      safeLogger.error('Error tracking refund transaction:', error);
      throw new Error('Failed to track refund transaction');
    }
  }

  /**
   * Update refund transaction status
   * @param refundRecordId - ID of the refund record
   * @param status - New status
   * @param processedAt - Processing timestamp
   * @param failureReason - Reason for failure (if applicable)
   */
  async updateRefundStatus(
    refundRecordId: string,
    status: 'pending' | 'completed' | 'failed' | 'cancelled',
    processedAt?: Date,
    failureReason?: string
  ): Promise<void> {
    try {
      // Get current record for audit
      const [currentRecord] = await db
        .select()
        .from(refundFinancialRecords)
        .where(eq(refundFinancialRecords.id, refundRecordId));

      if (!currentRecord) {
        throw new Error('Refund record not found');
      }

      // Update the record
      const [updatedRecord] = await db
        .update(refundFinancialRecords)
        .set({
          status,
          processedAt: processedAt || (status === 'completed' ? new Date() : null),
          failureReason: failureReason || null,
          updatedAt: new Date()
        })
        .where(eq(refundFinancialRecords.id, refundRecordId))
        .returning();

      // Log the status change
      await this.logAuditAction(
        refundRecordId,
        'status_updated',
        `Refund status changed from ${currentRecord.status} to ${status}`,
        null,
        currentRecord,
        updatedRecord
      );

      safeLogger.info(`Refund status updated: ${refundRecordId} -> ${status}`);
    } catch (error) {
      safeLogger.error('Error updating refund status:', error);
      throw new Error('Failed to update refund status');
    }
  }

  /**
   * Log audit action for refund transactions
   * @param refundRecordId - ID of the refund record
   * @param actionType - Type of action performed
   * @param actionDescription - Description of the action
   * @param performedBy - User ID who performed the action
   * @param previousState - Previous state of the record
   * @param newState - New state of the record
   */
  private async logAuditAction(
    refundRecordId: string,
    actionType: string,
    actionDescription: string,
    performedBy: string | null,
    previousState: any,
    newState: any
  ): Promise<void> {
    try {
      await db.insert(refundTransactionAuditLog).values({
        id: uuidv4(),
        refundRecordId,
        actionType,
        actionDescription,
        performedBy,
        performedByRole: performedBy ? 'admin' : 'system',
        previousState: previousState ? JSON.stringify(previousState) : null,
        newState: newState ? JSON.stringify(newState) : null,
        timestamp: new Date()
      });
    } catch (error) {
      safeLogger.error('Error logging audit action:', error);
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }
}

// Export singleton instance
export const refundMonitoringService = new RefundMonitoringService();

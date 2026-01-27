import { db } from '../../db/index';
import { 
  refundFinancialRecords,
  refundProviderTransactions,
  refundReconciliationRecords,
  refundTransactionAuditLog
} from '../../db/schema';
import { eq, and, gte, lte, desc, sql, count, sum, avg } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

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
 * Failure Pattern Detection Result
 * Identifies patterns in refund failures
 */
export interface FailurePattern {
  patternId: string;
  patternType: 'provider_outage' | 'rate_limit' | 'insufficient_funds' | 'network_error' | 'validation_error' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedProvider?: string;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedTransactions: string[];
  description: string;
  confidence: number;
}

/**
 * Alert Configuration
 * Defines alert thresholds and settings
 */
export interface AlertConfig {
  failureRateThreshold: number; // Percentage
  consecutiveFailuresThreshold: number;
  providerDowntimeThreshold: number; // Minutes
  discrepancyAmountThreshold: number; // Currency amount
  alertCooldownPeriod: number; // Minutes
}

/**
 * Alert Data
 * Information about a generated alert
 */
export interface Alert {
  alertId: string;
  alertType: 'failure_spike' | 'provider_degraded' | 'provider_down' | 'high_discrepancy' | 'pattern_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  affectedProvider?: string;
  affectedTransactionCount: number;
  detectedAt: Date;
  remediationSteps: string[];
  relatedPatterns?: FailurePattern[];
  metadata?: Record<string, any>;
}

/**
 * Remediation Suggestion
 * Automated suggestions for resolving issues
 */
export interface RemediationSuggestion {
  suggestionId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'immediate_action' | 'investigation' | 'monitoring' | 'configuration';
  title: string;
  description: string;
  steps: string[];
  estimatedImpact: string;
  automatable: boolean;
}

/**
 * Refund Monitoring Service
 * Comprehensive service for monitoring refund transactions, provider status, and reconciliation
 */
export class RefundMonitoringService {
  private alertConfig: AlertConfig = {
    failureRateThreshold: 20, // 20% failure rate triggers alert
    consecutiveFailuresThreshold: 5,
    providerDowntimeThreshold: 15, // 15 minutes
    discrepancyAmountThreshold: 1000, // $1000
    alertCooldownPeriod: 30 // 30 minutes between similar alerts
  };

  private recentAlerts: Map<string, Date> = new Map();
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
      logger.error('Error getting transaction tracker:', error);
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
      logger.error('Error getting provider status:', error);
      throw new Error('Failed to retrieve payment provider status');
    }
  }

  /**
   * Monitor provider health metrics
   * Comprehensive health monitoring for all payment providers
   * @returns Detailed health metrics for each provider
   */
  async monitorProviderHealth(): Promise<Array<{
    provider: 'stripe' | 'paypal' | 'blockchain';
    health: {
      overall: 'healthy' | 'warning' | 'critical';
      uptime: number; // Percentage
      responseTime: number; // Average in ms
      errorRate: number; // Percentage
      throughput: number; // Transactions per minute
    };
    metrics: {
      last5Minutes: {
        successCount: number;
        failureCount: number;
        averageResponseTime: number;
      };
      last15Minutes: {
        successCount: number;
        failureCount: number;
        averageResponseTime: number;
      };
      lastHour: {
        successCount: number;
        failureCount: number;
        averageResponseTime: number;
      };
    };
    alerts: Array<{
      severity: 'info' | 'warning' | 'critical';
      message: string;
      timestamp: Date;
    }>;
    recommendations: string[];
  }>> {
    try {
      const providers: Array<'stripe' | 'paypal' | 'blockchain'> = ['stripe', 'paypal', 'blockchain'];
      const healthReports = [];

      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      for (const provider of providers) {
        // Get metrics for different time windows
        const [last5MinStats] = await db
          .select({
            successCount: sql<number>`COUNT(CASE WHEN ${refundProviderTransactions.providerStatus} = 'completed' THEN 1 END)`,
            failureCount: sql<number>`COUNT(CASE WHEN ${refundProviderTransactions.providerStatus} = 'failed' THEN 1 END)`,
            averageResponseTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${refundProviderTransactions.completedAt} - ${refundProviderTransactions.createdAt})) * 1000)`
          })
          .from(refundProviderTransactions)
          .where(
            and(
              eq(refundProviderTransactions.providerName, provider),
              gte(refundProviderTransactions.createdAt, fiveMinutesAgo)
            )
          );

        const [last15MinStats] = await db
          .select({
            successCount: sql<number>`COUNT(CASE WHEN ${refundProviderTransactions.providerStatus} = 'completed' THEN 1 END)`,
            failureCount: sql<number>`COUNT(CASE WHEN ${refundProviderTransactions.providerStatus} = 'failed' THEN 1 END)`,
            averageResponseTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${refundProviderTransactions.completedAt} - ${refundProviderTransactions.createdAt})) * 1000)`
          })
          .from(refundProviderTransactions)
          .where(
            and(
              eq(refundProviderTransactions.providerName, provider),
              gte(refundProviderTransactions.createdAt, fifteenMinutesAgo)
            )
          );

        const [lastHourStats] = await db
          .select({
            successCount: sql<number>`COUNT(CASE WHEN ${refundProviderTransactions.providerStatus} = 'completed' THEN 1 END)`,
            failureCount: sql<number>`COUNT(CASE WHEN ${refundProviderTransactions.providerStatus} = 'failed' THEN 1 END)`,
            averageResponseTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${refundProviderTransactions.completedAt} - ${refundProviderTransactions.createdAt})) * 1000)`
          })
          .from(refundProviderTransactions)
          .where(
            and(
              eq(refundProviderTransactions.providerName, provider),
              gte(refundProviderTransactions.createdAt, oneHourAgo)
            )
          );

        // Calculate health metrics
        const hourSuccessCount = Number(lastHourStats.successCount) || 0;
        const hourFailureCount = Number(lastHourStats.failureCount) || 0;
        const hourTotalCount = hourSuccessCount + hourFailureCount;
        
        const uptime = hourTotalCount > 0 ? (hourSuccessCount / hourTotalCount) * 100 : 100;
        const errorRate = hourTotalCount > 0 ? (hourFailureCount / hourTotalCount) * 100 : 0;
        const responseTime = Number(lastHourStats.averageResponseTime) || 0;
        const throughput = hourTotalCount / 60; // Transactions per minute

        // Determine overall health status
        let overall: 'healthy' | 'warning' | 'critical';
        if (uptime >= 99 && errorRate < 1 && responseTime < 2000) {
          overall = 'healthy';
        } else if (uptime >= 95 && errorRate < 5 && responseTime < 5000) {
          overall = 'warning';
        } else {
          overall = 'critical';
        }

        // Generate alerts
        const alerts: Array<{ severity: 'info' | 'warning' | 'critical'; message: string; timestamp: Date }> = [];
        
        if (uptime < 95) {
          alerts.push({
            severity: 'critical',
            message: `Low uptime detected: ${uptime.toFixed(2)}%`,
            timestamp: now
          });
        } else if (uptime < 99) {
          alerts.push({
            severity: 'warning',
            message: `Uptime below optimal: ${uptime.toFixed(2)}%`,
            timestamp: now
          });
        }

        if (errorRate > 5) {
          alerts.push({
            severity: 'critical',
            message: `High error rate: ${errorRate.toFixed(2)}%`,
            timestamp: now
          });
        } else if (errorRate > 1) {
          alerts.push({
            severity: 'warning',
            message: `Elevated error rate: ${errorRate.toFixed(2)}%`,
            timestamp: now
          });
        }

        if (responseTime > 5000) {
          alerts.push({
            severity: 'critical',
            message: `Very slow response time: ${responseTime.toFixed(0)}ms`,
            timestamp: now
          });
        } else if (responseTime > 2000) {
          alerts.push({
            severity: 'warning',
            message: `Slow response time: ${responseTime.toFixed(0)}ms`,
            timestamp: now
          });
        }

        if (throughput < 0.1 && hourTotalCount > 0) {
          alerts.push({
            severity: 'info',
            message: `Low transaction volume: ${throughput.toFixed(2)} tx/min`,
            timestamp: now
          });
        }

        // Generate recommendations
        const recommendations: string[] = [];
        
        if (overall === 'critical') {
          recommendations.push('Immediate investigation required - provider experiencing critical issues');
          recommendations.push('Consider enabling failover to backup provider');
          recommendations.push('Check provider status page for known outages');
        } else if (overall === 'warning') {
          recommendations.push('Monitor provider closely for degradation');
          recommendations.push('Review recent error logs for patterns');
          recommendations.push('Prepare failover procedures if issues persist');
        }

        if (errorRate > 5) {
          recommendations.push('Investigate root cause of high error rate');
          recommendations.push('Review recent API changes or updates');
          recommendations.push('Check authentication and credentials');
        }

        if (responseTime > 3000) {
          recommendations.push('Optimize API request patterns');
          recommendations.push('Implement request caching where possible');
          recommendations.push('Check network connectivity and latency');
        }

        if (throughput > 10) {
          recommendations.push('High transaction volume - ensure adequate capacity');
          recommendations.push('Monitor for rate limiting issues');
        }

        healthReports.push({
          provider,
          health: {
            overall,
            uptime,
            responseTime,
            errorRate,
            throughput
          },
          metrics: {
            last5Minutes: {
              successCount: Number(last5MinStats.successCount) || 0,
              failureCount: Number(last5MinStats.failureCount) || 0,
              averageResponseTime: Number(last5MinStats.averageResponseTime) || 0
            },
            last15Minutes: {
              successCount: Number(last15MinStats.successCount) || 0,
              failureCount: Number(last15MinStats.failureCount) || 0,
              averageResponseTime: Number(last15MinStats.averageResponseTime) || 0
            },
            lastHour: {
              successCount: hourSuccessCount,
              failureCount: hourFailureCount,
              averageResponseTime: responseTime
            }
          },
          alerts,
          recommendations
        });
      }

      logger.info('Provider health monitoring completed', {
        providersMonitored: healthReports.length,
        healthyProviders: healthReports.filter(r => r.health.overall === 'healthy').length,
        warningProviders: healthReports.filter(r => r.health.overall === 'warning').length,
        criticalProviders: healthReports.filter(r => r.health.overall === 'critical').length
      });

      return healthReports;
    } catch (error) {
      logger.error('Error monitoring provider health:', error);
      throw new Error('Failed to monitor provider health');
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
            gte(refundReconciliationRecords.reconciliationDate, startDate.toISOString().split('T')[0]),
            lte(refundReconciliationRecords.reconciliationDate, endDate.toISOString().split('T')[0])
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
      logger.error('Error getting reconciliation data:', error);
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
      logger.error('Error analyzing failures:', error);
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
        originalAmount: refundData.originalAmount.toString(),
        refundAmount: refundData.refundAmount.toString(),
        processingFee: (refundData.processingFee || 0).toString(),
        platformFeeImpact: (refundData.platformFeeImpact || 0).toString(),
        sellerImpact: (refundData.sellerImpact || 0).toString(),
        paymentProvider: refundData.paymentProvider,
        providerTransactionId: refundData.providerTransactionId,
        status: 'pending' as const,
        reconciled: false,
        currency: refundData.currency || 'USD',
        refundMethod: refundData.refundMethod,
        retryCount: 0,
        metadata: refundData.metadata,
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

      logger.info(`Refund transaction tracked: ${newRecord.id}`);
      return newRecord;
    } catch (error) {
      logger.error('Error tracking refund transaction:', error);
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

      logger.info(`Refund status updated: ${refundRecordId} -> ${status}`);
    } catch (error) {
      logger.error('Error updating refund status:', error);
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
      logger.error('Error logging audit action:', error);
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }

  /**
   * Detect failure patterns in refund transactions
   * Analyzes recent failures to identify patterns and trends
   * @param lookbackMinutes - How far back to analyze (default: 60 minutes)
   * @returns Array of detected failure patterns
   */
  async detectFailurePatterns(lookbackMinutes: number = 60): Promise<FailurePattern[]> {
    try {
      const lookbackDate = new Date(Date.now() - lookbackMinutes * 60 * 1000);
      const patterns: FailurePattern[] = [];

      // Get recent failed transactions
      const recentFailures = await db
        .select()
        .from(refundProviderTransactions)
        .where(
          and(
            eq(refundProviderTransactions.providerStatus, 'failed'),
            gte(refundProviderTransactions.createdAt, lookbackDate)
          )
        )
        .orderBy(desc(refundProviderTransactions.createdAt));

      if (recentFailures.length === 0) {
        return patterns;
      }

      // Pattern 1: Provider-specific outages
      const failuresByProvider = new Map<string, typeof recentFailures>();
      recentFailures.forEach(failure => {
        const provider = failure.providerName;
        if (!failuresByProvider.has(provider)) {
          failuresByProvider.set(provider, []);
        }
        failuresByProvider.get(provider)!.push(failure);
      });

      failuresByProvider.forEach((failures, provider) => {
        if (failures.length >= 3) {
          const firstFailure = failures[failures.length - 1];
          const lastFailure = failures[0];
          
          patterns.push({
            patternId: uuidv4(),
            patternType: 'provider_outage',
            severity: failures.length >= 10 ? 'critical' : failures.length >= 5 ? 'high' : 'medium',
            affectedProvider: provider,
            occurrenceCount: failures.length,
            firstOccurrence: firstFailure.createdAt,
            lastOccurrence: lastFailure.createdAt,
            affectedTransactions: failures.map(f => f.id),
            description: `Multiple failures detected for ${provider} provider (${failures.length} failures in ${lookbackMinutes} minutes)`,
            confidence: Math.min(0.95, 0.5 + (failures.length * 0.05))
          });
        }
      });

      // Pattern 2: Rate limiting issues
      const rateLimitFailures = recentFailures.filter(f => 
        f.failureMessage?.toLowerCase().includes('rate limit') ||
        f.failureMessage?.toLowerCase().includes('too many requests') ||
        f.failureCode === 'RATE_LIMIT_EXCEEDED'
      );

      if (rateLimitFailures.length >= 3) {
        patterns.push({
          patternId: uuidv4(),
          patternType: 'rate_limit',
          severity: rateLimitFailures.length >= 10 ? 'high' : 'medium',
          occurrenceCount: rateLimitFailures.length,
          firstOccurrence: rateLimitFailures[rateLimitFailures.length - 1].createdAt,
          lastOccurrence: rateLimitFailures[0].createdAt,
          affectedTransactions: rateLimitFailures.map(f => f.id),
          description: `Rate limiting detected across providers (${rateLimitFailures.length} occurrences)`,
          confidence: 0.9
        });
      }

      // Pattern 3: Insufficient funds
      const insufficientFundsFailures = recentFailures.filter(f =>
        f.failureMessage?.toLowerCase().includes('insufficient') ||
        f.failureMessage?.toLowerCase().includes('balance') ||
        f.failureCode === 'INSUFFICIENT_FUNDS'
      );

      if (insufficientFundsFailures.length >= 2) {
        patterns.push({
          patternId: uuidv4(),
          patternType: 'insufficient_funds',
          severity: 'high',
          occurrenceCount: insufficientFundsFailures.length,
          firstOccurrence: insufficientFundsFailures[insufficientFundsFailures.length - 1].createdAt,
          lastOccurrence: insufficientFundsFailures[0].createdAt,
          affectedTransactions: insufficientFundsFailures.map(f => f.id),
          description: `Insufficient funds detected in refund accounts (${insufficientFundsFailures.length} occurrences)`,
          confidence: 0.95
        });
      }

      // Pattern 4: Network errors
      const networkFailures = recentFailures.filter(f =>
        f.failureMessage?.toLowerCase().includes('network') ||
        f.failureMessage?.toLowerCase().includes('timeout') ||
        f.failureMessage?.toLowerCase().includes('connection') ||
        f.failureCode === 'NETWORK_ERROR'
      );

      if (networkFailures.length >= 5) {
        patterns.push({
          patternId: uuidv4(),
          patternType: 'network_error',
          severity: networkFailures.length >= 15 ? 'high' : 'medium',
          occurrenceCount: networkFailures.length,
          firstOccurrence: networkFailures[networkFailures.length - 1].createdAt,
          lastOccurrence: networkFailures[0].createdAt,
          affectedTransactions: networkFailures.map(f => f.id),
          description: `Network connectivity issues detected (${networkFailures.length} occurrences)`,
          confidence: 0.85
        });
      }

      // Pattern 5: Validation errors
      const validationFailures = recentFailures.filter(f =>
        f.failureMessage?.toLowerCase().includes('validation') ||
        f.failureMessage?.toLowerCase().includes('invalid') ||
        f.failureCode === 'VALIDATION_ERROR'
      );

      if (validationFailures.length >= 3) {
        patterns.push({
          patternId: uuidv4(),
          patternType: 'validation_error',
          severity: 'medium',
          occurrenceCount: validationFailures.length,
          firstOccurrence: validationFailures[validationFailures.length - 1].createdAt,
          lastOccurrence: validationFailures[0].createdAt,
          affectedTransactions: validationFailures.map(f => f.id),
          description: `Data validation errors detected (${validationFailures.length} occurrences)`,
          confidence: 0.8
        });
      }

      logger.info(`Detected ${patterns.length} failure patterns in last ${lookbackMinutes} minutes`);
      return patterns;
    } catch (error) {
      logger.error('Error detecting failure patterns:', error);
      throw new Error('Failed to detect failure patterns');
    }
  }

  /**
   * Generate alerts based on current system state
   * Analyzes provider status, failure patterns, and reconciliation data
   * @returns Array of generated alerts
   */
  async generateAlerts(): Promise<Alert[]> {
    try {
      const alerts: Alert[] = [];
      const now = new Date();

      // Get current provider status
      const providerStatuses = await this.getProviderStatus();

      // Alert 1: Provider degraded or down
      for (const provider of providerStatuses) {
        const alertKey = `provider_${provider.provider}_${provider.status}`;
        
        // Check cooldown period
        const lastAlert = this.recentAlerts.get(alertKey);
        if (lastAlert && (now.getTime() - lastAlert.getTime()) < this.alertConfig.alertCooldownPeriod * 60 * 1000) {
          continue;
        }

        if (provider.status === 'down') {
          const alert: Alert = {
            alertId: uuidv4(),
            alertType: 'provider_down',
            severity: 'critical',
            title: `Payment Provider Down: ${provider.provider}`,
            message: `${provider.provider} is currently down with ${provider.successRate.toFixed(1)}% success rate. Last successful refund: ${provider.lastSuccessfulRefund ? provider.lastSuccessfulRefund.toISOString() : 'N/A'}`,
            affectedProvider: provider.provider,
            affectedTransactionCount: 0,
            detectedAt: now,
            remediationSteps: await this.getRemediationSteps('provider_down', provider.provider),
            metadata: {
              successRate: provider.successRate,
              errorRate: provider.errorRate,
              recentErrors: provider.recentErrors
            }
          };
          alerts.push(alert);
          this.recentAlerts.set(alertKey, now);
        } else if (provider.status === 'degraded') {
          const alert: Alert = {
            alertId: uuidv4(),
            alertType: 'provider_degraded',
            severity: 'high',
            title: `Payment Provider Degraded: ${provider.provider}`,
            message: `${provider.provider} is experiencing degraded performance with ${provider.successRate.toFixed(1)}% success rate and ${provider.errorRate.toFixed(1)}% error rate.`,
            affectedProvider: provider.provider,
            affectedTransactionCount: 0,
            detectedAt: now,
            remediationSteps: await this.getRemediationSteps('provider_degraded', provider.provider),
            metadata: {
              successRate: provider.successRate,
              errorRate: provider.errorRate,
              recentErrors: provider.recentErrors
            }
          };
          alerts.push(alert);
          this.recentAlerts.set(alertKey, now);
        }
      }

      // Alert 2: Failure spike detection
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const failureAnalysis = await this.analyzeFailures(oneHourAgo, now);
      
      if (failureAnalysis.totalFailures > 0) {
        const failureRate = (failureAnalysis.totalFailures / (failureAnalysis.totalFailures + failureAnalysis.successfulRetries)) * 100;
        
        if (failureRate > this.alertConfig.failureRateThreshold) {
          const alertKey = 'failure_spike';
          const lastAlert = this.recentAlerts.get(alertKey);
          
          if (!lastAlert || (now.getTime() - lastAlert.getTime()) >= this.alertConfig.alertCooldownPeriod * 60 * 1000) {
            const alert: Alert = {
              alertId: uuidv4(),
              alertType: 'failure_spike',
              severity: failureRate > 50 ? 'critical' : failureRate > 30 ? 'high' : 'medium',
              title: 'Refund Failure Spike Detected',
              message: `Abnormal failure rate detected: ${failureRate.toFixed(1)}% (${failureAnalysis.totalFailures} failures in the last hour)`,
              affectedTransactionCount: failureAnalysis.totalFailures,
              detectedAt: now,
              remediationSteps: await this.getRemediationSteps('failure_spike'),
              metadata: {
                failureRate,
                failuresByProvider: failureAnalysis.failuresByProvider,
                failuresByReason: failureAnalysis.failuresByReason
              }
            };
            alerts.push(alert);
            this.recentAlerts.set(alertKey, now);
          }
        }
      }

      // Alert 3: High discrepancy detection
      const reconciliationData = await this.getReconciliationData(oneHourAgo, now);
      
      if (reconciliationData.totalDiscrepancyAmount > this.alertConfig.discrepancyAmountThreshold) {
        const alertKey = 'high_discrepancy';
        const lastAlert = this.recentAlerts.get(alertKey);
        
        if (!lastAlert || (now.getTime() - lastAlert.getTime()) >= this.alertConfig.alertCooldownPeriod * 60 * 1000) {
          const alert: Alert = {
            alertId: uuidv4(),
            alertType: 'high_discrepancy',
            severity: reconciliationData.totalDiscrepancyAmount > 5000 ? 'critical' : 'high',
            title: 'High Reconciliation Discrepancy Detected',
            message: `Total discrepancy amount of $${reconciliationData.totalDiscrepancyAmount.toFixed(2)} detected across ${reconciliationData.totalDiscrepancies} transactions`,
            affectedTransactionCount: reconciliationData.totalDiscrepancies,
            detectedAt: now,
            remediationSteps: await this.getRemediationSteps('high_discrepancy'),
            metadata: {
              totalDiscrepancyAmount: reconciliationData.totalDiscrepancyAmount,
              totalDiscrepancies: reconciliationData.totalDiscrepancies,
              reconciliationRate: reconciliationData.reconciliationRate
            }
          };
          alerts.push(alert);
          this.recentAlerts.set(alertKey, now);
        }
      }

      // Alert 4: Pattern-based alerts
      const patterns = await this.detectFailurePatterns(60);
      
      for (const pattern of patterns) {
        if (pattern.severity === 'critical' || pattern.severity === 'high') {
          const alertKey = `pattern_${pattern.patternType}_${pattern.affectedProvider || 'all'}`;
          const lastAlert = this.recentAlerts.get(alertKey);
          
          if (!lastAlert || (now.getTime() - lastAlert.getTime()) >= this.alertConfig.alertCooldownPeriod * 60 * 1000) {
            const alert: Alert = {
              alertId: uuidv4(),
              alertType: 'pattern_detected',
              severity: pattern.severity,
              title: `Failure Pattern Detected: ${pattern.patternType.replace('_', ' ').toUpperCase()}`,
              message: pattern.description,
              affectedProvider: pattern.affectedProvider,
              affectedTransactionCount: pattern.occurrenceCount,
              detectedAt: now,
              remediationSteps: await this.getRemediationSteps(pattern.patternType, pattern.affectedProvider),
              relatedPatterns: [pattern],
              metadata: {
                patternConfidence: pattern.confidence,
                firstOccurrence: pattern.firstOccurrence,
                lastOccurrence: pattern.lastOccurrence
              }
            };
            alerts.push(alert);
            this.recentAlerts.set(alertKey, now);
          }
        }
      }

      logger.info(`Generated ${alerts.length} alerts`);
      return alerts;
    } catch (error) {
      logger.error('Error generating alerts:', error);
      throw new Error('Failed to generate alerts');
    }
  }

  /**
   * Get remediation steps for a specific issue type
   * Provides actionable steps to resolve detected issues
   * @param issueType - Type of issue detected
   * @param provider - Affected provider (if applicable)
   * @returns Array of remediation steps
   */
  private async getRemediationSteps(issueType: string, provider?: string): Promise<string[]> {
    const steps: Record<string, string[]> = {
      provider_down: [
        `Check ${provider} service status page for known outages`,
        `Verify API credentials and authentication tokens are valid`,
        `Test connectivity to ${provider} API endpoints`,
        `Review recent ${provider} API changes or deprecations`,
        `Consider temporarily routing refunds through alternative providers`,
        `Contact ${provider} support if issue persists beyond 30 minutes`,
        `Monitor error logs for specific error codes and patterns`
      ],
      provider_degraded: [
        `Monitor ${provider} performance metrics closely`,
        `Check for rate limiting issues and adjust request frequency`,
        `Review recent transaction volume for unusual spikes`,
        `Verify network connectivity and latency to ${provider} endpoints`,
        `Consider implementing request queuing to reduce load`,
        `Check ${provider} status page for maintenance windows`,
        `Prepare to failover to backup provider if degradation continues`
      ],
      failure_spike: [
        'Identify common failure reasons across all providers',
        'Check for system-wide issues (database, network, authentication)',
        'Review recent code deployments or configuration changes',
        'Verify all payment provider credentials are valid',
        'Check for unusual transaction patterns or volumes',
        'Review application logs for errors or exceptions',
        'Consider implementing circuit breaker pattern for failing providers'
      ],
      high_discrepancy: [
        'Review transactions with discrepancies for common patterns',
        'Verify currency conversion rates are accurate',
        'Check for timing issues between refund initiation and completion',
        'Audit fee calculations and platform fee impacts',
        'Review provider transaction logs for missing or duplicate entries',
        'Reconcile with provider statements and reports',
        'Investigate potential data synchronization issues'
      ],
      rate_limit: [
        'Implement exponential backoff for failed requests',
        'Review and optimize request batching strategies',
        'Check provider rate limit documentation for current limits',
        'Consider upgrading provider tier for higher limits',
        'Implement request queuing with priority handling',
        'Distribute load across multiple API keys if available',
        'Monitor request patterns and adjust timing'
      ],
      insufficient_funds: [
        'Check refund account balances across all providers',
        'Review recent large refund transactions',
        'Verify automatic funding mechanisms are working',
        'Set up low balance alerts for refund accounts',
        'Transfer funds to refund accounts immediately',
        'Review refund volume forecasts and funding schedules',
        'Implement automated balance monitoring and alerts'
      ],
      network_error: [
        'Check network connectivity to payment provider endpoints',
        'Review firewall and security group configurations',
        'Test DNS resolution for provider domains',
        'Verify SSL/TLS certificates are valid',
        'Check for network latency or packet loss',
        'Review proxy or load balancer configurations',
        'Implement retry logic with exponential backoff'
      ],
      validation_error: [
        'Review data validation rules and schemas',
        'Check for recent changes to provider API requirements',
        'Verify data formatting (dates, amounts, currencies)',
        'Audit input sanitization and validation logic',
        'Review error messages for specific validation failures',
        'Update validation rules to match provider requirements',
        'Implement pre-validation checks before API calls'
      ]
    };

    return steps[issueType] || [
      'Review system logs for error details',
      'Check provider documentation for recent changes',
      'Verify configuration and credentials',
      'Monitor the situation and escalate if needed',
      'Contact technical support if issue persists'
    ];
  }

  /**
   * Generate remediation suggestions based on current alerts and patterns
   * Provides prioritized, actionable suggestions for administrators
   * @param alerts - Current active alerts
   * @param patterns - Detected failure patterns
   * @returns Array of remediation suggestions
   */
  async generateRemediationSuggestions(
    alerts: Alert[],
    patterns: FailurePattern[]
  ): Promise<RemediationSuggestion[]> {
    try {
      const suggestions: RemediationSuggestion[] = [];

      // Suggestion 1: Critical provider issues
      const criticalProviderAlerts = alerts.filter(a => 
        (a.alertType === 'provider_down' || a.alertType === 'provider_degraded') && 
        a.severity === 'critical'
      );

      if (criticalProviderAlerts.length > 0) {
        for (const alert of criticalProviderAlerts) {
          suggestions.push({
            suggestionId: uuidv4(),
            priority: 'critical',
            category: 'immediate_action',
            title: `Immediate Action Required: ${alert.affectedProvider} Provider Issue`,
            description: `The ${alert.affectedProvider} payment provider is experiencing critical issues. Immediate intervention required to prevent refund processing delays.`,
            steps: [
              `Activate incident response protocol for ${alert.affectedProvider}`,
              'Notify on-call engineering team immediately',
              'Enable failover to backup payment provider',
              'Communicate status to affected customers',
              'Monitor recovery progress every 15 minutes'
            ],
            estimatedImpact: 'High - Affects all refunds through this provider',
            automatable: false
          });
        }
      }

      // Suggestion 2: Rate limiting issues
      const rateLimitPatterns = patterns.filter(p => p.patternType === 'rate_limit');
      
      if (rateLimitPatterns.length > 0) {
        suggestions.push({
          suggestionId: uuidv4(),
          priority: 'high',
          category: 'configuration',
          title: 'Optimize Request Rate Limiting',
          description: 'Multiple rate limiting issues detected. Implement request throttling and queuing to prevent API rate limit violations.',
          steps: [
            'Implement exponential backoff for failed requests',
            'Add request queuing with priority handling',
            'Review and adjust request batch sizes',
            'Consider upgrading provider API tier',
            'Implement distributed rate limiting across instances'
          ],
          estimatedImpact: 'Medium - Improves success rate by 15-20%',
          automatable: true
        });
      }

      // Suggestion 3: Insufficient funds
      const insufficientFundsPatterns = patterns.filter(p => p.patternType === 'insufficient_funds');
      
      if (insufficientFundsPatterns.length > 0) {
        suggestions.push({
          suggestionId: uuidv4(),
          priority: 'critical',
          category: 'immediate_action',
          title: 'Replenish Refund Account Balances',
          description: 'Insufficient funds detected in refund accounts. Immediate funding required to process pending refunds.',
          steps: [
            'Check current balance across all refund accounts',
            'Transfer funds to accounts with insufficient balance',
            'Review and adjust automatic funding thresholds',
            'Set up real-time balance monitoring alerts',
            'Implement predictive balance forecasting'
          ],
          estimatedImpact: 'Critical - Blocks all refund processing',
          automatable: true
        });
      }

      // Suggestion 4: High failure rate
      const failureSpikeAlerts = alerts.filter(a => a.alertType === 'failure_spike');
      
      if (failureSpikeAlerts.length > 0) {
        suggestions.push({
          suggestionId: uuidv4(),
          priority: 'high',
          category: 'investigation',
          title: 'Investigate Refund Failure Spike',
          description: 'Abnormal increase in refund failures detected. Comprehensive investigation needed to identify root cause.',
          steps: [
            'Analyze failure logs for common error patterns',
            'Check for recent system or configuration changes',
            'Review provider status and service health',
            'Verify database and network connectivity',
            'Test refund processing with sample transactions',
            'Implement additional monitoring and logging'
          ],
          estimatedImpact: 'High - Affects overall refund success rate',
          automatable: false
        });
      }

      // Suggestion 5: Reconciliation discrepancies
      const discrepancyAlerts = alerts.filter(a => a.alertType === 'high_discrepancy');
      
      if (discrepancyAlerts.length > 0) {
        suggestions.push({
          suggestionId: uuidv4(),
          priority: 'high',
          category: 'investigation',
          title: 'Resolve Reconciliation Discrepancies',
          description: 'Significant discrepancies detected between expected and actual refund amounts. Financial audit required.',
          steps: [
            'Generate detailed reconciliation report',
            'Identify transactions with largest discrepancies',
            'Verify currency conversion calculations',
            'Check fee calculation accuracy',
            'Review provider transaction logs',
            'Reconcile with provider financial statements',
            'Update reconciliation rules if needed'
          ],
          estimatedImpact: 'High - Financial accuracy and compliance',
          automatable: false
        });
      }

      // Suggestion 6: Network issues
      const networkPatterns = patterns.filter(p => p.patternType === 'network_error');
      
      if (networkPatterns.length > 0) {
        suggestions.push({
          suggestionId: uuidv4(),
          priority: 'medium',
          category: 'monitoring',
          title: 'Monitor and Resolve Network Connectivity Issues',
          description: 'Network connectivity issues affecting refund processing. Infrastructure review recommended.',
          steps: [
            'Run network diagnostics to provider endpoints',
            'Check DNS resolution and SSL certificates',
            'Review firewall and security group rules',
            'Test from multiple network locations',
            'Implement connection pooling and keep-alive',
            'Add network monitoring and alerting'
          ],
          estimatedImpact: 'Medium - Improves reliability and reduces timeouts',
          automatable: true
        });
      }

      // Sort suggestions by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      logger.info(`Generated ${suggestions.length} remediation suggestions`);
      return suggestions;
    } catch (error) {
      logger.error('Error generating remediation suggestions:', error);
      throw new Error('Failed to generate remediation suggestions');
    }
  }

  /**
   * Update alert configuration
   * Allows administrators to customize alert thresholds
   * @param config - New alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = {
      ...this.alertConfig,
      ...config
    };
    logger.info('Alert configuration updated', config);
  }

  /**
   * Get current alert configuration
   * @returns Current alert configuration
   */
  getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  /**
   * Clear alert cooldown for testing or manual override
   * @param alertKey - Specific alert key to clear, or undefined to clear all
   */
  clearAlertCooldown(alertKey?: string): void {
    if (alertKey) {
      this.recentAlerts.delete(alertKey);
      logger.info(`Cleared alert cooldown for: ${alertKey}`);
    } else {
      this.recentAlerts.clear();
      logger.info('Cleared all alert cooldowns');
    }
  }

  /**
   * Calculate revenue impact from refunds
   * Property 24: Comprehensive Cost Calculation
   * Property 25: Multi-Dimensional Impact Analysis
   * 
   * Calculates total refunded revenue, platform fee impact, and seller revenue impact
   * @param startDate - Start date for analysis period
   * @param endDate - End date for analysis period
   * @returns Revenue impact metrics
   */
  async calculateRevenueImpact(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRefundedRevenue: number;
    platformFeeImpact: number;
    sellerRevenueImpact: number;
    refundCount: number;
    averageRefundAmount: number;
    refundsByProvider: Record<string, {
      totalRefunded: number;
      platformFeeImpact: number;
      sellerImpact: number;
      count: number;
    }>;
    refundsByStatus: Record<string, {
      totalRefunded: number;
      count: number;
    }>;
    periodComparison?: {
      previousPeriodRevenue: number;
      changeAmount: number;
      changePercentage: number;
    };
  }> {
    try {
      logger.info('Calculating revenue impact', { startDate, endDate });

      // Get all refund records for the period
      const [revenueStats] = await db
        .select({
          totalRefundedRevenue: sum(refundFinancialRecords.refundAmount),
          platformFeeImpact: sum(refundFinancialRecords.platformFeeImpact),
          sellerRevenueImpact: sum(refundFinancialRecords.sellerImpact),
          refundCount: count(refundFinancialRecords.id),
          averageRefundAmount: avg(refundFinancialRecords.refundAmount)
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate),
            eq(refundFinancialRecords.status, 'completed')
          )
        );

      // Get breakdown by payment provider
      const providerBreakdown = await db
        .select({
          provider: refundFinancialRecords.paymentProvider,
          totalRefunded: sum(refundFinancialRecords.refundAmount),
          platformFeeImpact: sum(refundFinancialRecords.platformFeeImpact),
          sellerImpact: sum(refundFinancialRecords.sellerImpact),
          count: count(refundFinancialRecords.id)
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate),
            eq(refundFinancialRecords.status, 'completed')
          )
        )
        .groupBy(refundFinancialRecords.paymentProvider);

      // Get breakdown by status
      const statusBreakdown = await db
        .select({
          status: refundFinancialRecords.status,
          totalRefunded: sum(refundFinancialRecords.refundAmount),
          count: count(refundFinancialRecords.id)
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate)
          )
        )
        .groupBy(refundFinancialRecords.status);

      // Calculate period comparison (previous period of same length)
      const periodLength = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodLength);
      const previousEndDate = new Date(startDate.getTime());

      const [previousPeriodStats] = await db
        .select({
          totalRefundedRevenue: sum(refundFinancialRecords.refundAmount)
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, previousStartDate),
            lte(refundFinancialRecords.createdAt, previousEndDate),
            eq(refundFinancialRecords.status, 'completed')
          )
        );

      // Format provider breakdown
      const refundsByProvider: Record<string, {
        totalRefunded: number;
        platformFeeImpact: number;
        sellerImpact: number;
        count: number;
      }> = {};

      providerBreakdown.forEach(provider => {
        refundsByProvider[provider.provider] = {
          totalRefunded: Number(provider.totalRefunded) || 0,
          platformFeeImpact: Number(provider.platformFeeImpact) || 0,
          sellerImpact: Number(provider.sellerImpact) || 0,
          count: Number(provider.count) || 0
        };
      });

      // Format status breakdown
      const refundsByStatus: Record<string, {
        totalRefunded: number;
        count: number;
      }> = {};

      statusBreakdown.forEach(status => {
        refundsByStatus[status.status] = {
          totalRefunded: Number(status.totalRefunded) || 0,
          count: Number(status.count) || 0
        };
      });

      // Calculate period comparison
      const currentRevenue = Number(revenueStats.totalRefundedRevenue) || 0;
      const previousRevenue = Number(previousPeriodStats.totalRefundedRevenue) || 0;
      const changeAmount = currentRevenue - previousRevenue;
      const changePercentage = previousRevenue > 0 
        ? (changeAmount / previousRevenue) * 100 
        : 0;

      const result = {
        totalRefundedRevenue: currentRevenue,
        platformFeeImpact: Number(revenueStats.platformFeeImpact) || 0,
        sellerRevenueImpact: Number(revenueStats.sellerRevenueImpact) || 0,
        refundCount: Number(revenueStats.refundCount) || 0,
        averageRefundAmount: Number(revenueStats.averageRefundAmount) || 0,
        refundsByProvider,
        refundsByStatus,
        periodComparison: {
          previousPeriodRevenue: previousRevenue,
          changeAmount,
          changePercentage
        }
      };

      logger.info('Revenue impact calculated successfully', {
        totalRefundedRevenue: result.totalRefundedRevenue,
        platformFeeImpact: result.platformFeeImpact,
        sellerRevenueImpact: result.sellerRevenueImpact,
        refundCount: result.refundCount
      });

      return result;
    } catch (error) {
      logger.error('Error calculating revenue impact:', error);
      throw new Error('Failed to calculate revenue impact');
    }
  }
}

// Export singleton instance
export const refundMonitoringService = new RefundMonitoringService();

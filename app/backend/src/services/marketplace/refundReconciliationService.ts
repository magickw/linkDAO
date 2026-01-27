import { db } from '../../db/index';
import {
  refundFinancialRecords,
  refundProviderTransactions,
  refundReconciliationRecords,
  refundTransactionAuditLog
} from '../../db/schema';
import { eq, and, gte, lte, desc, sql, isNull, ne } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { stripeRefundProvider } from './providers/stripeRefundProvider';
import { paypalRefundProvider } from './providers/paypalRefundProvider';
import { blockchainRefundProvider } from './providers/blockchainRefundProvider';

/**
 * Transaction Match Result
 * Result of matching internal records with provider records
 */
export interface TransactionMatchResult {
  refundRecordId: string;
  matchStatus: 'matched' | 'unmatched' | 'partial_match' | 'discrepancy';
  internalAmount: number;
  providerAmount?: number;
  discrepancyAmount: number;
  matchConfidence: number;
  matchedProviderTransactions: string[];
  unmatchedProviderTransactions: string[];
  matchDetails: {
    amountMatch: boolean;
    statusMatch: boolean;
    timestampMatch: boolean;
    providerIdMatch: boolean;
  };
}

/**
 * Discrepancy Detection Result
 * Details about detected discrepancies
 */
export interface DiscrepancyResult {
  discrepancyId: string;
  refundRecordId: string;
  discrepancyType: 'amount_mismatch' | 'status_mismatch' | 'missing_transaction' | 'duplicate_transaction' | 'timing_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedValue: any;
  actualValue: any;
  discrepancyAmount: number;
  description: string;
  detectedAt: Date;
  requiresManualReview: boolean;
  suggestedResolution: string;
}

/**
 * Reconciliation Report
 * Comprehensive reconciliation report for a time period
 */
export interface ReconciliationReport {
  reportId: string;
  reportDate: Date;
  periodStart: Date;
  periodEnd: Date;
  summary: {
    totalTransactions: number;
    reconciledTransactions: number;
    pendingTransactions: number;
    discrepancyTransactions: number;
    reconciliationRate: number;
    totalAmount: number;
    reconciledAmount: number;
    discrepancyAmount: number;
  };
  byProvider: Record<string, {
    totalTransactions: number;
    reconciledTransactions: number;
    discrepancyTransactions: number;
    totalAmount: number;
    discrepancyAmount: number;
  }>;
  discrepancies: DiscrepancyResult[];
  unmatchedTransactions: {
    internal: string[];
    provider: Record<string, string[]>;
  };
  recommendations: string[];
}

/**
 * Refund Reconciliation Service
 * Handles transaction matching, discrepancy detection, and reconciliation reporting
 */
export class RefundReconciliationService {

  /**
   * Match internal refund records with provider transaction records
   * @param startDate - Start date for matching period
   * @param endDate - End date for matching period
   * @param provider - Specific provider to match (optional)
   * @returns Array of transaction match results
   */
  async matchTransactions(
    startDate: Date,
    endDate: Date,
    provider?: string
  ): Promise<TransactionMatchResult[]> {
    try {
      logger.info(`Starting transaction matching for period ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Get all refund records for the period
      const refundRecordsQuery = db
        .select()
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate),
            provider ? eq(refundFinancialRecords.paymentProvider, provider) : undefined
          )
        );

      const refundRecords = await refundRecordsQuery;
      const matchResults: TransactionMatchResult[] = [];

      for (const record of refundRecords) {
        // Get provider transactions for this refund
        const providerTransactions = await db
          .select()
          .from(refundProviderTransactions)
          .where(eq(refundProviderTransactions.refundRecordId, record.id));

        // Perform matching logic
        const matchResult = await this.matchSingleTransaction(record, providerTransactions);
        matchResults.push(matchResult);

        // Update reconciliation record if match found
        if (matchResult.matchStatus === 'matched' && matchResult.discrepancyAmount === 0) {
          await this.updateReconciliationStatus(record.id, 'reconciled', matchResult);
        } else if (matchResult.matchStatus === 'discrepancy') {
          await this.updateReconciliationStatus(record.id, 'discrepancy', matchResult);
        }
      }

      logger.info(`Transaction matching completed: ${matchResults.length} records processed`);
      return matchResults;
    } catch (error) {
      logger.error('Error matching transactions:', error);
      throw new Error('Failed to match transactions');
    }
  }

  /**
   * Match a single refund record with its provider transactions
   * @param refundRecord - Internal refund record
   * @param providerTransactions - Provider transaction records
   * @returns Transaction match result
   */
  private async matchSingleTransaction(
    refundRecord: any,
    providerTransactions: any[]
  ): Promise<TransactionMatchResult> {
    const internalAmount = parseFloat(refundRecord.refundAmount);
    let providerAmount = 0;
    let matchConfidence = 0;
    const matchedProviderTransactions: string[] = [];
    const unmatchedProviderTransactions: string[] = [];

    const matchDetails = {
      amountMatch: false,
      statusMatch: false,
      timestampMatch: false,
      providerIdMatch: false
    };

    // If no provider transactions found
    if (providerTransactions.length === 0) {
      return {
        refundRecordId: refundRecord.id,
        matchStatus: 'unmatched',
        internalAmount,
        discrepancyAmount: internalAmount,
        matchConfidence: 0,
        matchedProviderTransactions: [],
        unmatchedProviderTransactions: [],
        matchDetails
      };
    }

    // Match provider transactions
    for (const providerTx of providerTransactions) {
      const txAmount = parseFloat(providerTx.amount);
      providerAmount += txAmount;

      // Check if provider transaction ID matches
      if (providerTx.providerTransactionId === refundRecord.providerTransactionId) {
        matchDetails.providerIdMatch = true;
        matchConfidence += 40;
        matchedProviderTransactions.push(providerTx.id);
      }

      // Check if amounts match (within 0.01 tolerance for rounding)
      if (Math.abs(txAmount - internalAmount) < 0.01) {
        matchDetails.amountMatch = true;
        matchConfidence += 30;
        if (!matchedProviderTransactions.includes(providerTx.id)) {
          matchedProviderTransactions.push(providerTx.id);
        }
      }

      // Check if status matches
      const statusMapping: Record<string, string> = {
        'completed': 'completed',
        'pending': 'pending',
        'failed': 'failed',
        'COMPLETED': 'completed',
        'PENDING': 'pending',
        'FAILED': 'failed',
        'succeeded': 'completed'
      };

      if (statusMapping[providerTx.providerStatus] === refundRecord.status) {
        matchDetails.statusMatch = true;
        matchConfidence += 20;
      }

      // Check if timestamps are close (within 5 minutes)
      if (refundRecord.processedAt && providerTx.completedAt) {
        const timeDiff = Math.abs(
          new Date(refundRecord.processedAt).getTime() - 
          new Date(providerTx.completedAt).getTime()
        );
        if (timeDiff < 5 * 60 * 1000) {
          matchDetails.timestampMatch = true;
          matchConfidence += 10;
        }
      }

      // If not matched, add to unmatched list
      if (!matchedProviderTransactions.includes(providerTx.id)) {
        unmatchedProviderTransactions.push(providerTx.id);
      }
    }

    // Calculate discrepancy
    const discrepancyAmount = Math.abs(internalAmount - providerAmount);

    // Determine match status
    let matchStatus: 'matched' | 'unmatched' | 'partial_match' | 'discrepancy';
    if (matchConfidence >= 80 && discrepancyAmount < 0.01) {
      matchStatus = 'matched';
    } else if (matchConfidence >= 50 && discrepancyAmount < 1.00) {
      matchStatus = 'partial_match';
    } else if (discrepancyAmount >= 0.01) {
      matchStatus = 'discrepancy';
    } else {
      matchStatus = 'unmatched';
    }

    return {
      refundRecordId: refundRecord.id,
      matchStatus,
      internalAmount,
      providerAmount,
      discrepancyAmount,
      matchConfidence,
      matchedProviderTransactions,
      unmatchedProviderTransactions,
      matchDetails
    };
  }

  /**
   * Detect discrepancies in refund transactions
   * @param startDate - Start date for detection period
   * @param endDate - End date for detection period
   * @param minDiscrepancyAmount - Minimum discrepancy amount to report (default: 0.01)
   * @returns Array of detected discrepancies
   */
  async detectDiscrepancies(
    startDate: Date,
    endDate: Date,
    minDiscrepancyAmount: number = 0.01
  ): Promise<DiscrepancyResult[]> {
    try {
      logger.info(`Starting discrepancy detection for period ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const discrepancies: DiscrepancyResult[] = [];

      // Get all reconciliation records with discrepancies
      const reconciliationRecords = await db
        .select()
        .from(refundReconciliationRecords)
        .where(
          and(
            gte(refundReconciliationRecords.reconciliationDate, startDate.toISOString().split('T')[0]),
            lte(refundReconciliationRecords.reconciliationDate, endDate.toISOString().split('T')[0]),
            ne(refundReconciliationRecords.discrepancyAmount, '0')
          )
        );

      for (const reconciliation of reconciliationRecords) {
        const discrepancyAmount = Math.abs(parseFloat(reconciliation.discrepancyAmount));

        if (discrepancyAmount >= minDiscrepancyAmount) {
          // Get refund record details
          const [refundRecord] = await db
            .select()
            .from(refundFinancialRecords)
            .where(eq(refundFinancialRecords.id, reconciliation.refundRecordId));

          if (!refundRecord) continue;

          // Determine discrepancy type and severity
          const discrepancyType = this.determineDiscrepancyType(
            refundRecord,
            reconciliation,
            discrepancyAmount
          );

          const severity = this.calculateDiscrepancySeverity(discrepancyAmount, discrepancyType);

          discrepancies.push({
            discrepancyId: crypto.randomUUID(),
            refundRecordId: reconciliation.refundRecordId,
            discrepancyType,
            severity,
            expectedValue: parseFloat(reconciliation.expectedAmount),
            actualValue: reconciliation.actualAmount ? parseFloat(reconciliation.actualAmount) : null,
            discrepancyAmount,
            description: this.generateDiscrepancyDescription(
              discrepancyType,
              parseFloat(reconciliation.expectedAmount),
              reconciliation.actualAmount ? parseFloat(reconciliation.actualAmount) : null,
              discrepancyAmount
            ),
            detectedAt: new Date(),
            requiresManualReview: severity === 'high' || severity === 'critical',
            suggestedResolution: this.getSuggestedResolution(discrepancyType, severity)
          });
        }
      }

      // Detect missing transactions
      const missingTransactions = await this.detectMissingTransactions(startDate, endDate);
      discrepancies.push(...missingTransactions);

      // Detect duplicate transactions
      const duplicateTransactions = await this.detectDuplicateTransactions(startDate, endDate);
      discrepancies.push(...duplicateTransactions);

      logger.info(`Discrepancy detection completed: ${discrepancies.length} discrepancies found`);
      return discrepancies;
    } catch (error) {
      logger.error('Error detecting discrepancies:', error);
      throw new Error('Failed to detect discrepancies');
    }
  }

  /**
   * Detect missing transactions (refunds without provider records)
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of missing transaction discrepancies
   */
  private async detectMissingTransactions(
    startDate: Date,
    endDate: Date
  ): Promise<DiscrepancyResult[]> {
    const discrepancies: DiscrepancyResult[] = [];

    // Find refund records without provider transactions
    const refundsWithoutProvider = await db
      .select({
        refundRecord: refundFinancialRecords,
        providerTxCount: sql<number>`COUNT(${refundProviderTransactions.id})`
      })
      .from(refundFinancialRecords)
      .leftJoin(
        refundProviderTransactions,
        eq(refundFinancialRecords.id, refundProviderTransactions.refundRecordId)
      )
      .where(
        and(
          gte(refundFinancialRecords.createdAt, startDate),
          lte(refundFinancialRecords.createdAt, endDate),
          eq(refundFinancialRecords.status, 'completed')
        )
      )
      .groupBy(refundFinancialRecords.id)
      .having(sql`COUNT(${refundProviderTransactions.id}) = 0`);

    for (const { refundRecord } of refundsWithoutProvider) {
      discrepancies.push({
        discrepancyId: crypto.randomUUID(),
        refundRecordId: refundRecord.id,
        discrepancyType: 'missing_transaction',
        severity: 'high',
        expectedValue: parseFloat(refundRecord.refundAmount),
        actualValue: null,
        discrepancyAmount: parseFloat(refundRecord.refundAmount),
        description: `Refund marked as completed but no provider transaction record found. Amount: ${refundRecord.refundAmount} ${refundRecord.currency}`,
        detectedAt: new Date(),
        requiresManualReview: true,
        suggestedResolution: 'Verify with payment provider and create missing transaction record or update refund status'
      });
    }

    return discrepancies;
  }

  /**
   * Detect duplicate transactions
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of duplicate transaction discrepancies
   */
  private async detectDuplicateTransactions(
    startDate: Date,
    endDate: Date
  ): Promise<DiscrepancyResult[]> {
    const discrepancies: DiscrepancyResult[] = [];

    // Find provider transactions with duplicate provider transaction IDs
    const duplicates = await db
      .select({
        providerTransactionId: refundProviderTransactions.providerTransactionId,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`SUM(${refundProviderTransactions.amount})`
      })
      .from(refundProviderTransactions)
      .where(
        and(
          gte(refundProviderTransactions.createdAt, startDate),
          lte(refundProviderTransactions.createdAt, endDate)
        )
      )
      .groupBy(refundProviderTransactions.providerTransactionId)
      .having(sql`COUNT(*) > 1`);

    for (const duplicate of duplicates) {
      if (!duplicate.providerTransactionId) continue;

      // Get the duplicate transactions
      const duplicateTxs = await db
        .select()
        .from(refundProviderTransactions)
        .where(eq(refundProviderTransactions.providerTransactionId, duplicate.providerTransactionId));

      const refundRecordId = duplicateTxs[0]?.refundRecordId || '';

      discrepancies.push({
        discrepancyId: crypto.randomUUID(),
        refundRecordId,
        discrepancyType: 'duplicate_transaction',
        severity: 'medium',
        expectedValue: 1,
        actualValue: Number(duplicate.count),
        discrepancyAmount: Number(duplicate.totalAmount) || 0,
        description: `Duplicate provider transaction ID found: ${duplicate.providerTransactionId}. ${duplicate.count} records with total amount ${duplicate.totalAmount}`,
        detectedAt: new Date(),
        requiresManualReview: true,
        suggestedResolution: 'Review duplicate transactions and remove or consolidate as appropriate'
      });
    }

    return discrepancies;
  }

  /**
   * Generate comprehensive reconciliation report
   * @param startDate - Start date for report period
   * @param endDate - End date for report period
   * @param includeDetails - Whether to include detailed transaction data
   * @returns Reconciliation report
   */
  async generateReconciliationReport(
    startDate: Date,
    endDate: Date,
    includeDetails: boolean = true
  ): Promise<ReconciliationReport> {
    try {
      logger.info(`Generating reconciliation report for period ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const reportId = crypto.randomUUID();
      const reportDate = new Date();

      // Get overall statistics
      const [overallStats] = await db
        .select({
          totalTransactions: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`SUM(${refundFinancialRecords.refundAmount})`,
          reconciledCount: sql<number>`COUNT(CASE WHEN ${refundFinancialRecords.reconciled} = true THEN 1 END)`,
          reconciledAmount: sql<number>`SUM(CASE WHEN ${refundFinancialRecords.reconciled} = true THEN ${refundFinancialRecords.refundAmount} ELSE 0 END)`
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate)
          )
        );

      // Get reconciliation records
      const reconciliationRecords = await db
        .select()
        .from(refundReconciliationRecords)
        .where(
          and(
            gte(refundReconciliationRecords.reconciliationDate, startDate.toISOString().split('T')[0]),
            lte(refundReconciliationRecords.reconciliationDate, endDate.toISOString().split('T')[0])
          )
        );

      const pendingCount = reconciliationRecords.filter(r => r.reconciliationStatus === 'pending').length;
      const discrepancyCount = reconciliationRecords.filter(r => parseFloat(r.discrepancyAmount) !== 0).length;
      const totalDiscrepancyAmount = reconciliationRecords.reduce(
        (sum, r) => sum + Math.abs(parseFloat(r.discrepancyAmount)),
        0
      );

      const totalTransactions = Number(overallStats.totalTransactions) || 0;
      const reconciledTransactions = Number(overallStats.reconciledCount) || 0;

      // Get provider breakdown
      const providerStats = await db
        .select({
          provider: refundFinancialRecords.paymentProvider,
          totalTransactions: sql<number>`COUNT(*)`,
          reconciledTransactions: sql<number>`COUNT(CASE WHEN ${refundFinancialRecords.reconciled} = true THEN 1 END)`,
          totalAmount: sql<number>`SUM(${refundFinancialRecords.refundAmount})`
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate)
          )
        )
        .groupBy(refundFinancialRecords.paymentProvider);

      const byProvider: Record<string, any> = {};
      for (const stat of providerStats) {
        byProvider[stat.provider] = {
          totalTransactions: Number(stat.totalTransactions),
          reconciledTransactions: Number(stat.reconciledTransactions),
          discrepancyTransactions: 0, // Will be calculated from discrepancies
          totalAmount: Number(stat.totalAmount),
          discrepancyAmount: 0 // Will be calculated from discrepancies
        };
      }

      // Detect discrepancies
      const discrepancies = includeDetails 
        ? await this.detectDiscrepancies(startDate, endDate)
        : [];

      // Update provider stats with discrepancy data
      for (const discrepancy of discrepancies) {
        const [refundRecord] = await db
          .select()
          .from(refundFinancialRecords)
          .where(eq(refundFinancialRecords.id, discrepancy.refundRecordId));

        if (refundRecord && byProvider[refundRecord.paymentProvider]) {
          byProvider[refundRecord.paymentProvider].discrepancyTransactions += 1;
          byProvider[refundRecord.paymentProvider].discrepancyAmount += discrepancy.discrepancyAmount;
        }
      }

      // Find unmatched transactions
      const unmatchedInternal = await db
        .select({ id: refundFinancialRecords.id })
        .from(refundFinancialRecords)
        .leftJoin(
          refundProviderTransactions,
          eq(refundFinancialRecords.id, refundProviderTransactions.refundRecordId)
        )
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate),
            eq(refundFinancialRecords.status, 'completed'),
            isNull(refundProviderTransactions.id)
          )
        );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        totalTransactions,
        reconciledTransactions,
        discrepancyCount,
        totalDiscrepancyAmount,
        discrepancies
      );

      const report: ReconciliationReport = {
        reportId,
        reportDate,
        periodStart: startDate,
        periodEnd: endDate,
        summary: {
          totalTransactions,
          reconciledTransactions,
          pendingTransactions: pendingCount,
          discrepancyTransactions: discrepancyCount,
          reconciliationRate: totalTransactions > 0 
            ? (reconciledTransactions / totalTransactions) * 100 
            : 0,
          totalAmount: Number(overallStats.totalAmount) || 0,
          reconciledAmount: Number(overallStats.reconciledAmount) || 0,
          discrepancyAmount: totalDiscrepancyAmount
        },
        byProvider,
        discrepancies,
        unmatchedTransactions: {
          internal: unmatchedInternal.map(r => r.id),
          provider: {} // Would need provider-specific queries
        },
        recommendations
      };

      logger.info(`Reconciliation report generated: ${reportId}`);
      return report;
    } catch (error) {
      logger.error('Error generating reconciliation report:', error);
      throw new Error('Failed to generate reconciliation report');
    }
  }

  /**
   * Update reconciliation status for a refund record
   * @param refundRecordId - Refund record ID
   * @param status - Reconciliation status
   * @param matchResult - Transaction match result
   */
  private async updateReconciliationStatus(
    refundRecordId: string,
    status: 'pending' | 'reconciled' | 'discrepancy',
    matchResult: TransactionMatchResult
  ): Promise<void> {
    try {
      // Check if reconciliation record exists
      const [existingRecord] = await db
        .select()
        .from(refundReconciliationRecords)
        .where(eq(refundReconciliationRecords.refundRecordId, refundRecordId))
        .orderBy(desc(refundReconciliationRecords.createdAt))
        .limit(1);

      const reconciliationDate = new Date().toISOString().split('T')[0];

      if (existingRecord) {
        // Update existing record
        await db
          .update(refundReconciliationRecords)
          .set({
            reconciliationStatus: status,
            actualAmount: matchResult.providerAmount?.toString(),
            discrepancyAmount: matchResult.discrepancyAmount.toString(),
            discrepancyReason: status === 'discrepancy' 
              ? `Amount mismatch: expected ${matchResult.internalAmount}, actual ${matchResult.providerAmount}`
              : null,
            updatedAt: new Date()
          })
          .where(eq(refundReconciliationRecords.id, existingRecord.id));
      } else {
        // Create new reconciliation record
        await db.insert(refundReconciliationRecords).values({
          id: crypto.randomUUID(),
          refundRecordId,
          reconciliationDate,
          reconciliationStatus: status,
          expectedAmount: matchResult.internalAmount.toString(),
          actualAmount: matchResult.providerAmount?.toString(),
          discrepancyAmount: matchResult.discrepancyAmount.toString(),
          discrepancyReason: status === 'discrepancy'
            ? `Amount mismatch: expected ${matchResult.internalAmount}, actual ${matchResult.providerAmount}`
            : null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Update refund record reconciliation status
      if (status === 'reconciled') {
        await db
          .update(refundFinancialRecords)
          .set({
            reconciled: true,
            reconciledAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(refundFinancialRecords.id, refundRecordId));
      }
    } catch (error) {
      logger.error('Error updating reconciliation status:', error);
      throw new Error('Failed to update reconciliation status');
    }
  }

  /**
   * Determine discrepancy type based on refund and reconciliation data
   * @param refundRecord - Refund record
   * @param reconciliation - Reconciliation record
   * @param discrepancyAmount - Discrepancy amount
   * @returns Discrepancy type
   */
  private determineDiscrepancyType(
    refundRecord: any,
    reconciliation: any,
    discrepancyAmount: number
  ): 'amount_mismatch' | 'status_mismatch' | 'missing_transaction' | 'duplicate_transaction' | 'timing_issue' {
    // Check for amount mismatch
    if (discrepancyAmount > 0.01) {
      return 'amount_mismatch';
    }

    // Check for status mismatch
    if (refundRecord.status !== reconciliation.reconciliationStatus) {
      return 'status_mismatch';
    }

    // Check for timing issues
    if (refundRecord.processedAt && reconciliation.updatedAt) {
      const timeDiff = Math.abs(
        new Date(refundRecord.processedAt).getTime() - 
        new Date(reconciliation.updatedAt).getTime()
      );
      if (timeDiff > 24 * 60 * 60 * 1000) { // More than 24 hours
        return 'timing_issue';
      }
    }

    return 'amount_mismatch';
  }

  /**
   * Calculate discrepancy severity
   * @param discrepancyAmount - Discrepancy amount
   * @param discrepancyType - Discrepancy type
   * @returns Severity level
   */
  private calculateDiscrepancySeverity(
    discrepancyAmount: number,
    discrepancyType: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical for large amounts or missing transactions
    if (discrepancyAmount > 1000 || discrepancyType === 'missing_transaction') {
      return 'critical';
    }

    // High for significant amounts
    if (discrepancyAmount > 100) {
      return 'high';
    }

    // Medium for moderate amounts
    if (discrepancyAmount > 10) {
      return 'medium';
    }

    // Low for small amounts
    return 'low';
  }

  /**
   * Generate discrepancy description
   * @param discrepancyType - Discrepancy type
   * @param expectedValue - Expected value
   * @param actualValue - Actual value
   * @param discrepancyAmount - Discrepancy amount
   * @returns Description string
   */
  private generateDiscrepancyDescription(
    discrepancyType: string,
    expectedValue: number,
    actualValue: number | null,
    discrepancyAmount: number
  ): string {
    switch (discrepancyType) {
      case 'amount_mismatch':
        return `Amount mismatch detected: Expected ${expectedValue.toFixed(2)}, Actual ${actualValue?.toFixed(2) || 'N/A'}, Difference ${discrepancyAmount.toFixed(2)}`;
      case 'status_mismatch':
        return `Status mismatch detected between internal record and provider transaction`;
      case 'missing_transaction':
        return `Missing provider transaction for completed refund of ${expectedValue.toFixed(2)}`;
      case 'duplicate_transaction':
        return `Duplicate transaction detected with total amount ${discrepancyAmount.toFixed(2)}`;
      case 'timing_issue':
        return `Timing discrepancy detected: transaction processed outside expected timeframe`;
      default:
        return `Discrepancy detected: ${discrepancyAmount.toFixed(2)}`;
    }
  }

  /**
   * Get suggested resolution for a discrepancy
   * @param discrepancyType - Discrepancy type
   * @param severity - Severity level
   * @returns Suggested resolution
   */
  private getSuggestedResolution(
    discrepancyType: string,
    severity: string
  ): string {
    const resolutions: Record<string, string> = {
      amount_mismatch: 'Verify transaction amounts with payment provider. Check for currency conversion issues or fee discrepancies. Update records to match provider data.',
      status_mismatch: 'Review transaction status with payment provider. Update internal status to match provider status or investigate status synchronization issues.',
      missing_transaction: 'Contact payment provider to verify transaction. Create provider transaction record if confirmed, or update refund status if transaction was not processed.',
      duplicate_transaction: 'Review duplicate transactions and determine which is correct. Remove or consolidate duplicate records as appropriate.',
      timing_issue: 'Investigate delay in transaction processing. Verify with provider and update timestamps to reflect actual processing times.'
    };

    return resolutions[discrepancyType] || 'Manual review required to determine appropriate resolution';
  }

  /**
   * Generate recommendations based on reconciliation results
   * @param totalTransactions - Total transactions
   * @param reconciledTransactions - Reconciled transactions
   * @param discrepancyCount - Number of discrepancies
   * @param totalDiscrepancyAmount - Total discrepancy amount
   * @param discrepancies - Array of discrepancies
   * @returns Array of recommendations
   */
  private generateRecommendations(
    totalTransactions: number,
    reconciledTransactions: number,
    discrepancyCount: number,
    totalDiscrepancyAmount: number,
    discrepancies: DiscrepancyResult[]
  ): string[] {
    const recommendations: string[] = [];
    const reconciliationRate = totalTransactions > 0 
      ? (reconciledTransactions / totalTransactions) * 100 
      : 0;

    // Recommendation 1: Low reconciliation rate
    if (reconciliationRate < 90) {
      recommendations.push(
        `Reconciliation rate is ${reconciliationRate.toFixed(1)}%. Investigate unreconciled transactions and improve matching processes.`
      );
    }

    // Recommendation 2: High discrepancy count
    if (discrepancyCount > totalTransactions * 0.05) {
      recommendations.push(
        `High discrepancy rate detected (${((discrepancyCount / totalTransactions) * 100).toFixed(1)}%). Review transaction matching logic and provider integration.`
      );
    }

    // Recommendation 3: Large discrepancy amount
    if (totalDiscrepancyAmount > 1000) {
      recommendations.push(
        `Total discrepancy amount of $${totalDiscrepancyAmount.toFixed(2)} requires immediate attention. Prioritize high-value discrepancies for resolution.`
      );
    }

    // Recommendation 4: Missing transactions
    const missingCount = discrepancies.filter(d => d.discrepancyType === 'missing_transaction').length;
    if (missingCount > 0) {
      recommendations.push(
        `${missingCount} missing provider transactions detected. Verify with payment providers and update records accordingly.`
      );
    }

    // Recommendation 5: Duplicate transactions
    const duplicateCount = discrepancies.filter(d => d.discrepancyType === 'duplicate_transaction').length;
    if (duplicateCount > 0) {
      recommendations.push(
        `${duplicateCount} duplicate transactions detected. Review and consolidate duplicate records to ensure data accuracy.`
      );
    }

    // Recommendation 6: Critical discrepancies
    const criticalCount = discrepancies.filter(d => d.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(
        `${criticalCount} critical discrepancies require immediate manual review and resolution.`
      );
    }

    // Recommendation 7: Automated reconciliation
    if (reconciliationRate > 95 && discrepancyCount < 5) {
      recommendations.push(
        'Reconciliation performance is excellent. Consider implementing automated reconciliation for low-risk transactions.'
      );
    }

    // Recommendation 8: Provider-specific issues
    const providerIssues = new Map<string, number>();
    for (const discrepancy of discrepancies) {
      // Would need to look up provider from refund record
      // This is a simplified version
      const provider = 'unknown';
      providerIssues.set(provider, (providerIssues.get(provider) || 0) + 1);
    }

    providerIssues.forEach((count, provider) => {
      if (count > 5) {
        recommendations.push(
          `${provider} provider has ${count} discrepancies. Review integration and consider provider-specific reconciliation improvements.`
        );
      }
    });

    return recommendations;
  }

  /**
   * Reconcile a specific transaction manually
   * @param refundRecordId - Refund record ID
   * @param actualAmount - Actual amount from provider
   * @param reconciledBy - User ID performing reconciliation
   * @param notes - Reconciliation notes
   * @returns Updated reconciliation record
   */
  async reconcileTransaction(
    refundRecordId: string,
    actualAmount: number,
    reconciledBy: string,
    notes?: string
  ): Promise<any> {
    try {
      // Get refund record
      const [refundRecord] = await db
        .select()
        .from(refundFinancialRecords)
        .where(eq(refundFinancialRecords.id, refundRecordId));

      if (!refundRecord) {
        throw new Error('Refund record not found');
      }

      const expectedAmount = parseFloat(refundRecord.refundAmount);
      const discrepancyAmount = Math.abs(expectedAmount - actualAmount);

      // Update or create reconciliation record
      const [existingRecord] = await db
        .select()
        .from(refundReconciliationRecords)
        .where(eq(refundReconciliationRecords.refundRecordId, refundRecordId))
        .orderBy(desc(refundReconciliationRecords.createdAt))
        .limit(1);

      let reconciliationRecord;

      if (existingRecord) {
        [reconciliationRecord] = await db
          .update(refundReconciliationRecords)
          .set({
            reconciliationStatus: 'reconciled',
            actualAmount: actualAmount.toString(),
            discrepancyAmount: discrepancyAmount.toString(),
            reconciledBy,
            reconciliationNotes: notes,
            resolvedAt: new Date(),
            resolvedBy: reconciledBy,
            resolutionStatus: 'resolved',
            resolutionNotes: notes,
            updatedAt: new Date()
          })
          .where(eq(refundReconciliationRecords.id, existingRecord.id))
          .returning();
      } else {
        [reconciliationRecord] = await db
          .insert(refundReconciliationRecords)
          .values({
            id: crypto.randomUUID(),
            refundRecordId,
            reconciliationDate: new Date().toISOString().split('T')[0],
            reconciliationStatus: 'reconciled',
            expectedAmount: expectedAmount.toString(),
            actualAmount: actualAmount.toString(),
            discrepancyAmount: discrepancyAmount.toString(),
            reconciledBy,
            reconciliationNotes: notes,
            resolvedAt: new Date(),
            resolvedBy: reconciledBy,
            resolutionStatus: 'resolved',
            resolutionNotes: notes,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
      }

      // Update refund record
      await db
        .update(refundFinancialRecords)
        .set({
          reconciled: true,
          reconciledAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(refundFinancialRecords.id, refundRecordId));

      // Log audit action
      await db.insert(refundTransactionAuditLog).values({
        id: crypto.randomUUID(),
        refundRecordId,
        actionType: 'manual_reconciliation',
        actionDescription: `Transaction manually reconciled by ${reconciledBy}. Expected: ${expectedAmount}, Actual: ${actualAmount}, Discrepancy: ${discrepancyAmount}`,
        performedBy: reconciledBy,
        performedByRole: 'admin',
        previousState: JSON.stringify({ reconciled: false }),
        newState: JSON.stringify({ reconciled: true, actualAmount, discrepancyAmount }),
        timestamp: new Date()
      });

      logger.info(`Transaction manually reconciled: ${refundRecordId}`);
      return reconciliationRecord;
    } catch (error) {
      logger.error('Error reconciling transaction:', error);
      throw new Error('Failed to reconcile transaction');
    }
  }

  /**
   * Get reconciliation statistics for a time period
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Reconciliation statistics
   */
  async getReconciliationStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalTransactions: number;
    reconciledTransactions: number;
    pendingTransactions: number;
    discrepancyTransactions: number;
    reconciliationRate: number;
    averageDiscrepancyAmount: number;
    totalDiscrepancyAmount: number;
  }> {
    try {
      const [stats] = await db
        .select({
          totalTransactions: sql<number>`COUNT(DISTINCT ${refundFinancialRecords.id})`,
          reconciledTransactions: sql<number>`COUNT(DISTINCT CASE WHEN ${refundFinancialRecords.reconciled} = true THEN ${refundFinancialRecords.id} END)`,
          pendingTransactions: sql<number>`COUNT(DISTINCT CASE WHEN ${refundFinancialRecords.reconciled} = false THEN ${refundFinancialRecords.id} END)`
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate)
          )
        );

      const [discrepancyStats] = await db
        .select({
          discrepancyCount: sql<number>`COUNT(*)`,
          totalDiscrepancyAmount: sql<number>`SUM(ABS(${refundReconciliationRecords.discrepancyAmount}))`,
          averageDiscrepancyAmount: sql<number>`AVG(ABS(${refundReconciliationRecords.discrepancyAmount}))`
        })
        .from(refundReconciliationRecords)
        .where(
          and(
            gte(refundReconciliationRecords.reconciliationDate, startDate.toISOString().split('T')[0]),
            lte(refundReconciliationRecords.reconciliationDate, endDate.toISOString().split('T')[0]),
            ne(refundReconciliationRecords.discrepancyAmount, '0')
          )
        );

      const totalTransactions = Number(stats.totalTransactions) || 0;
      const reconciledTransactions = Number(stats.reconciledTransactions) || 0;

      return {
        totalTransactions,
        reconciledTransactions,
        pendingTransactions: Number(stats.pendingTransactions) || 0,
        discrepancyTransactions: Number(discrepancyStats.discrepancyCount) || 0,
        reconciliationRate: totalTransactions > 0 
          ? (reconciledTransactions / totalTransactions) * 100 
          : 0,
        averageDiscrepancyAmount: Number(discrepancyStats.averageDiscrepancyAmount) || 0,
        totalDiscrepancyAmount: Number(discrepancyStats.totalDiscrepancyAmount) || 0
      };
    } catch (error) {
      logger.error('Error getting reconciliation statistics:', error);
      throw new Error('Failed to get reconciliation statistics');
    }
  }
}

// Export singleton instance
export const refundReconciliationService = new RefundReconciliationService();

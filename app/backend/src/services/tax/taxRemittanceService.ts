import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db';
import { safeLogger } from '../../utils/safeLogger';
import {
  taxLiabilities,
  taxRemittanceBatches,
  taxRemittanceBatchItems,
  taxFilings,
  taxComplianceAlerts
} from '../../db/schema';

export interface TaxPeriod {
  startDate: Date;
  endDate: Date;
  jurisdiction: string;
}

export interface TaxRemittanceReport {
  batchId: string;
  batchNumber: string;
  period: TaxPeriod;
  totalTaxAmount: number;
  liabilitiesCount: number;
  jurisdictionBreakdown: Record<string, number>;
  dueDate: Date;
  filedDate?: Date;
  paidDate?: Date;
  status: 'pending' | 'processing' | 'filed' | 'paid' | 'failed';
}

export class TaxRemittanceService {
  /**
   * Create a remittance batch for a specific period and jurisdiction
   */
  async createRemittanceBatch(
    period: TaxPeriod,
    provider?: string
  ): Promise<string> {
    try {
      safeLogger.info('Creating tax remittance batch:', { period, provider });

      // Generate unique batch number
      const batchNumber = this.generateBatchNumber(period);

      // Get all unpaid tax liabilities for this period and jurisdiction
      const liabilities = await db
        .select()
        .from(taxLiabilities)
        .where(
          and(
            eq(taxLiabilities.tax_jurisdiction, period.jurisdiction),
            gte(taxLiabilities.collection_date, period.startDate),
            lte(taxLiabilities.collection_date, period.endDate),
            eq(taxLiabilities.status, 'calculated')
          )
        );

      if (liabilities.length === 0) {
        safeLogger.warn('No tax liabilities found for period:', { period });
        throw new Error('No tax liabilities found for remittance batch');
      }

      // Calculate total tax and jurisdiction breakdown
      const totalTaxAmount = liabilities.reduce((sum, liability) => sum + liability.tax_amount, 0);
      const jurisdictionBreakdown: Record<string, number> = {};

      liabilities.forEach(liability => {
        jurisdictionBreakdown[liability.tax_jurisdiction] =
          (jurisdictionBreakdown[liability.tax_jurisdiction] || 0) + liability.tax_amount;
      });

      // Create remittance batch
      const [batch] = await db
        .insert(taxRemittanceBatches)
        .values({
          batchNumber: batchNumber,
          remittancePeriodStart: period.startDate,
          remittancePeriodEnd: period.endDate,
          totalTaxAmount: totalTaxAmount,
          totalLiabilities: liabilities.length,
          jurisdictionBreakdown: JSON.stringify(jurisdictionBreakdown),
          status: 'pending',
          remittance_provider: provider,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Add liabilities to batch
      for (const liability of liabilities) {
        await db
          .insert(taxRemittanceBatchItems)
          .values({
            batchId: batch.id,
            taxLiabilityId: liability.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        // Update liability status
        await db
          .update(taxLiabilities)
          .set({ status: 'filed' })
          .where(eq(taxLiabilities.id, liability.id));
      }

      safeLogger.info('Tax remittance batch created:', {
        batchId: batch.id,
        batchNumber,
        totalLiabilities: liabilities.length,
        totalAmount: totalTaxAmount
      });

      return batch.id;
    } catch (error) {
      safeLogger.error('Error creating remittance batch:', error);
      throw error;
    }
  }

  /**
   * Record a tax payment for a batch
   */
  async recordTaxPayment(
    batchId: string,
    paymentReference: string,
    paymentDate: Date = new Date()
  ): Promise<void> {
    try {
      safeLogger.info('Recording tax payment:', { batchId, paymentReference });

      // Update batch status to paid
      await db
        .update(taxRemittanceBatches)
        .set({
          status: 'paid',
          paidAt: paymentDate,
          updatedAt: new Date(),
        })
        .where(eq(taxRemittanceBatches.id, batchId));

      // Get all liabilities in this batch
      const batchItems = await db
        .select({ taxLiabilityId: taxRemittanceBatchItems.taxLiabilityId })
        .from(taxRemittanceBatchItems)
        .where(eq(taxRemittanceBatchItems.batchId, batchId));

      // Update all liabilities to paid
      for (const item of batchItems) {
        await db
          .update(taxLiabilities)
          .set({
            status: 'paid',
            remittanceDate: paymentDate,
            remittanceReference: paymentReference,
            updatedAt: new Date(),
          })
          .where(eq(taxLiabilities.id, item.tax_liability_id));
      }

      safeLogger.info('Tax payment recorded successfully:', {
        batchId,
        liabilitiesCount: batchItems.length,
      });
    } catch (error) {
      safeLogger.error('Error recording tax payment:', error);
      throw error;
    }
  }

  /**
   * File tax return with authority
   */
  async fileTaxReturn(
    batchId: string,
    filingData: {
      grossSales: number;
      taxableAmount: number;
      filingReference?: string;
      provider?: string;
    }
  ): Promise<string> {
    try {
      safeLogger.info('Filing tax return:', { batchId, filingData });

      // Get batch information
      const [batch] = await db
        .select()
        .from(taxRemittanceBatches)
        .where(eq(taxRemittanceBatches.id, batchId));

      if (!batch) {
        throw new Error('Remittance batch not found');
      }

      // Create filing record
      const [filing] = await db
        .insert(taxFilings)
        .values({
          batchId: batchId,
          jurisdiction: batch.remittance_provider || 'MULTI',
          filingType: this.getFilingType(batch.remittance_period_start),
          filingPeriodStart: batch.remittance_period_start,
          filingPeriodEnd: batch.remittancePeriodEnd,
          grossSales: filingData.grossSales,
          taxableSales: filingData.taxableAmount,
          taxCollected: batch.totalTaxAmount,
          taxDue: batch.totalTaxAmount,
          status: 'filed',
          filedAt: new Date(),
          filingReference: filingData.filingReference,
          filingProvider: filingData.provider,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Update batch status
      await db
        .update(taxRemittanceBatches)
        .set({
          status: 'filed',
          updatedAt: new Date(),
        })
        .where(eq(taxRemittanceBatches.id, batchId));

      safeLogger.info('Tax return filed:', { filingId: filing.id, filingReference: filingData.filingReference });

      return filing.id;
    } catch (error) {
      safeLogger.error('Error filing tax return:', error);
      throw error;
    }
  }

  /**
   * Get remittance report for a period
   */
  async getRemittanceReport(batchId: string): Promise<TaxRemittanceReport> {
    try {
      const [batch] = await db
        .select()
        .from(taxRemittanceBatches)
        .where(eq(taxRemittanceBatches.id, batchId));

      if (!batch) {
        throw new Error('Remittance batch not found');
      }

      const jurisdictionBreakdown = batch.jurisdiction_breakdown
        ? JSON.parse(batch.jurisdiction_breakdown as string)
        : {};

      return {
        batchId: batch.id,
        batchNumber: batch.batch_number,
        period: {
          startDate: batch.remittance_period_start,
          endDate: batch.remittancePeriodEnd,
          jurisdiction: batch.remittance_provider || 'MULTI',
        },
        totalTaxAmount: batch.totalTaxAmount,
        liabilitiesCount: batch.total_liabilities,
        jurisdictionBreakdown,
        dueDate: this.calculateDueDate(batch.remittancePeriodEnd),
        filedDate: batch.filed_at || undefined,
        paidDate: batch.paid_at || undefined,
        status: batch.status as any,
      };
    } catch (error) {
      safeLogger.error('Error getting remittance report:', error);
      throw error;
    }
  }

  /**
   * Check for overdue tax remittances and create compliance alerts
   */
  async checkOverdueTaxes(): Promise<number> {
    try {
      safeLogger.info('Checking for overdue tax liabilities...');

      const today = new Date();

      // Find all overdue tax liabilities
      const overdueLiabilities = await db
        .select()
        .from(taxLiabilities)
        .where(
          and(
            lte(taxLiabilities.due_date, today),
            eq(taxLiabilities.status, 'pending')
          )
        );

      let alertsCreated = 0;

      for (const liability of overdueLiabilities) {
        // Create compliance alert
        await db
          .insert(taxComplianceAlerts)
          .values({
            alert_type: 'overdue',
            severity: 'critical',
            jurisdiction: liability.tax_jurisdiction,
            taxLiabilityId: liability.id,
            message: `Tax liability of ${liability.tax_amount} for jurisdiction ${liability.tax_jurisdiction} is overdue (due ${liability.due_date})`,
            resolved: false,
            createdAt: new Date(),
          });

        alertsCreated++;

        safeLogger.warn('Overdue tax liability detected:', {
          liabilityId: liability.id,
          jurisdiction: liability.tax_jurisdiction,
          dueDate: liability.due_date,
          amount: liability.tax_amount,
        });
      }

      return alertsCreated;
    } catch (error) {
      safeLogger.error('Error checking overdue taxes:', error);
      throw error;
    }
  }

  /**
   * Get compliance alerts
   */
  async getComplianceAlerts(resolved: boolean = false) {
    try {
      return await db
        .select()
        .from(taxComplianceAlerts)
        .where(eq(taxComplianceAlerts.resolved, resolved));
    } catch (error) {
      safeLogger.error('Error fetching compliance alerts:', error);
      throw error;
    }
  }

  /**
   * Resolve a compliance alert
   */
  async resolveComplianceAlert(alertId: string, userId: string): Promise<void> {
    try {
      await db
        .update(taxComplianceAlerts)
        .set({
          resolved: true,
          resolved_at: new Date(),
          resolved_by: userId,
        })
        .where(eq(taxComplianceAlerts.id, alertId));

      safeLogger.info('Compliance alert resolved:', { alertId, userId });
    } catch (error) {
      safeLogger.error('Error resolving compliance alert:', error);
      throw error;
    }
  }

  /**
   * Generate batch number with format: TB-JURISDICTION-PERIOD-TIMESTAMP
   */
  private generateBatchNumber(period: TaxPeriod): string {
    const timestamp = Date.now().toString().slice(-6);
    const periodStr = `${period.startDate.getFullYear()}${String(period.startDate.getMonth() + 1).padStart(2, '0')}`;
    return `TB-${period.jurisdiction}-${periodStr}-${timestamp}`;
  }

  /**
   * Determine filing type based on period
   */
  private getFilingType(periodStart: Date): string {
    const month = periodStart.getMonth();

    // Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
    if (month % 3 === 0) return 'quarterly';
    return 'monthly';
  }

  /**
   * Calculate due date for a remittance period
   */
  private calculateDueDate(periodEnd: Date): Date {
    const nextMonth = new Date(periodEnd);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(15); // Tax due on 15th of next month (configurable)
    return nextMonth;
  }
}

export const taxRemittanceService = new TaxRemittanceService();

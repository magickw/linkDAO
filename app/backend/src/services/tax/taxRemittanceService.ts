import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db';
import { safeLogger } from '../../utils/safeLogger';
import {
  tax_liabilities,
  tax_remittance_batches,
  tax_remittance_batch_items,
  tax_filings,
  tax_compliance_alerts
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
        .from(tax_liabilities)
        .where(
          and(
            eq(tax_liabilities.tax_jurisdiction, period.jurisdiction),
            gte(tax_liabilities.collection_date, period.startDate),
            lte(tax_liabilities.collection_date, period.endDate),
            eq(tax_liabilities.status, 'calculated')
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
        .insert(tax_remittance_batches)
        .values({
          batch_number: batchNumber,
          remittance_period_start: period.startDate,
          remittance_period_end: period.endDate,
          total_tax_amount: totalTaxAmount,
          total_liabilities: liabilities.length,
          jurisdiction_breakdown: JSON.stringify(jurisdictionBreakdown),
          status: 'pending',
          remittance_provider: provider,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      // Add liabilities to batch
      for (const liability of liabilities) {
        await db
          .insert(tax_remittance_batch_items)
          .values({
            batch_id: batch.id,
            tax_liability_id: liability.id,
            created_at: new Date(),
            updated_at: new Date(),
          });

        // Update liability status
        await db
          .update(tax_liabilities)
          .set({ status: 'filed' })
          .where(eq(tax_liabilities.id, liability.id));
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
        .update(tax_remittance_batches)
        .set({
          status: 'paid',
          paid_at: paymentDate,
          updated_at: new Date(),
        })
        .where(eq(tax_remittance_batches.id, batchId));

      // Get all liabilities in this batch
      const batchItems = await db
        .select({ tax_liability_id: tax_remittance_batch_items.tax_liability_id })
        .from(tax_remittance_batch_items)
        .where(eq(tax_remittance_batch_items.batch_id, batchId));

      // Update all liabilities to paid
      for (const item of batchItems) {
        await db
          .update(tax_liabilities)
          .set({
            status: 'paid',
            remittance_date: paymentDate,
            remittance_reference: paymentReference,
            updated_at: new Date(),
          })
          .where(eq(tax_liabilities.id, item.tax_liability_id));
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
        .from(tax_remittance_batches)
        .where(eq(tax_remittance_batches.id, batchId));

      if (!batch) {
        throw new Error('Remittance batch not found');
      }

      // Create filing record
      const [filing] = await db
        .insert(tax_filings)
        .values({
          batch_id: batchId,
          jurisdiction: batch.remittance_provider || 'MULTI',
          filing_type: this.getFilingType(batch.remittance_period_start),
          filing_period_start: batch.remittance_period_start,
          filing_period_end: batch.remittance_period_end,
          gross_sales: filingData.grossSales,
          taxable_sales: filingData.taxableAmount,
          tax_collected: batch.total_tax_amount,
          tax_due: batch.total_tax_amount,
          status: 'filed',
          filed_at: new Date(),
          filing_reference: filingData.filingReference,
          filing_provider: filingData.provider,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      // Update batch status
      await db
        .update(tax_remittance_batches)
        .set({
          status: 'filed',
          updated_at: new Date(),
        })
        .where(eq(tax_remittance_batches.id, batchId));

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
        .from(tax_remittance_batches)
        .where(eq(tax_remittance_batches.id, batchId));

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
          endDate: batch.remittance_period_end,
          jurisdiction: batch.remittance_provider || 'MULTI',
        },
        totalTaxAmount: batch.total_tax_amount,
        liabilitiesCount: batch.total_liabilities,
        jurisdictionBreakdown,
        dueDate: this.calculateDueDate(batch.remittance_period_end),
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
        .from(tax_liabilities)
        .where(
          and(
            lte(tax_liabilities.due_date, today),
            eq(tax_liabilities.status, 'pending')
          )
        );

      let alertsCreated = 0;

      for (const liability of overdueLiabilities) {
        // Create compliance alert
        await db
          .insert(tax_compliance_alerts)
          .values({
            alert_type: 'overdue',
            severity: 'critical',
            jurisdiction: liability.tax_jurisdiction,
            tax_liability_id: liability.id,
            message: `Tax liability of ${liability.tax_amount} for jurisdiction ${liability.tax_jurisdiction} is overdue (due ${liability.due_date})`,
            resolved: false,
            created_at: new Date(),
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
        .from(tax_compliance_alerts)
        .where(eq(tax_compliance_alerts.resolved, resolved));
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
        .update(tax_compliance_alerts)
        .set({
          resolved: true,
          resolved_at: new Date(),
          resolved_by: userId,
        })
        .where(eq(tax_compliance_alerts.id, alertId));

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

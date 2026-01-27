import { CronJob } from 'cron';
import { safeLogger } from '../../utils/safeLogger';
import { db } from '../../db';
import {
  tax_liabilities,
  tax_remittance_batches,
  tax_filings,
  tax_compliance_alerts,
} from '../../db/schema';
import { eq, gte, lte, and } from 'drizzle-orm';
import { taxRemittanceService, TaxPeriod } from './taxRemittanceService';
import { stripeTaxService } from './stripeTaxIntegrationService';

/**
 * Tax Reporting & Scheduling Service
 * Handles automated tax reporting, filing, and remittance scheduling
 */
export class TaxReportingSchedulingService {
  private jobs: Map<string, CronJob> = new Map();
  private enabled: boolean = false;

  /**
   * Initialize tax scheduling
   */
  initialize(): void {
    try {
      safeLogger.info('Initializing tax reporting and scheduling service...');

      // Schedule monthly compliance check (1st day of month at 2 AM)
      this.scheduleJob(
        'monthly-compliance-check',
        '0 2 1 * *',
        () => this.runMonthlyComplianceCheck()
      );

      // Schedule quarterly tax filing (15th of month following quarter end)
      // Q1: Apr 15, Q2: Jul 15, Q3: Oct 15, Q4: Jan 15
      this.scheduleJob(
        'quarterly-tax-filing-q1',
        '0 3 15 4 *',
        () => this.processQuarterlyTaxFiling('US-CA', 1)
      );

      this.scheduleJob(
        'quarterly-tax-filing-q2',
        '0 3 15 7 *',
        () => this.processQuarterlyTaxFiling('US-CA', 2)
      );

      this.scheduleJob(
        'quarterly-tax-filing-q3',
        '0 3 15 10 *',
        () => this.processQuarterlyTaxFiling('US-CA', 3)
      );

      this.scheduleJob(
        'quarterly-tax-filing-q4',
        '0 3 15 1 *',
        () => this.processQuarterlyTaxFiling('US-CA', 4)
      );

      // Schedule daily overdue check (6 AM)
      this.scheduleJob(
        'daily-overdue-check',
        '0 6 * * *',
        () => this.checkOverdueTaxes()
      );

      // Schedule tax summary report (weekly on Monday at 8 AM)
      this.scheduleJob(
        'weekly-tax-summary',
        '0 8 * * 1',
        () => this.generateWeeklyTaxReport()
      );

      this.enabled = true;
      safeLogger.info('Tax reporting and scheduling service initialized successfully');
    } catch (error) {
      safeLogger.error('Error initializing tax scheduling:', error);
      throw error;
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    try {
      this.jobs.forEach((job, jobName) => {
        job.stop();
        safeLogger.info(`Stopped scheduled job: ${jobName}`);
      });
      this.jobs.clear();
      this.enabled = false;
      safeLogger.info('Tax scheduling service stopped');
    } catch (error) {
      safeLogger.error('Error stopping tax scheduling:', error);
    }
  }

  /**
   * Schedule a cron job
   */
  private scheduleJob(
    jobName: string,
    cronExpression: string,
    callback: () => Promise<void>
  ): void {
    try {
      const job = new CronJob(cronExpression, async () => {
        try {
          safeLogger.info(`Running scheduled job: ${jobName}`);
          await callback();
          safeLogger.info(`Completed scheduled job: ${jobName}`);
        } catch (error) {
          safeLogger.error(`Error in scheduled job ${jobName}:`, error);
        }
      });

      job.start();
      this.jobs.set(jobName, job);
      safeLogger.info(`Scheduled job registered: ${jobName} (cron: ${cronExpression})`);
    } catch (error) {
      safeLogger.error(`Error scheduling job ${jobName}:`, error);
    }
  }

  /**
   * Run monthly compliance check
   */
  private async runMonthlyComplianceCheck(): Promise<void> {
    try {
      safeLogger.info('Running monthly compliance check...');

      // Check for overdue taxes
      const alertsCreated = await taxRemittanceService.checkOverdueTaxes();

      // Generate compliance report
      const report = await this.generateComplianceReport();

      safeLogger.info('Monthly compliance check completed:', {
        alertsCreated,
        reportGenerated: true,
      });

      // TODO: Send email notification to admin
    } catch (error) {
      safeLogger.error('Error running monthly compliance check:', error);
    }
  }

  /**
   * Process quarterly tax filing
   */
  private async processQuarterlyTaxFiling(
    jurisdiction: string,
    quarter: 1 | 2 | 3 | 4
  ): Promise<void> {
    try {
      safeLogger.info('Processing quarterly tax filing:', {
        jurisdiction,
        quarter,
      });

      // Calculate period dates
      const year = new Date().getFullYear();
      const periodStart = this.getQuarterStartDate(year, quarter);
      const periodEnd = this.getQuarterEndDate(year, quarter);

      const period: TaxPeriod = {
        startDate: periodStart,
        endDate: periodEnd,
        jurisdiction,
      };

      // Create remittance batch
      const batchId = await taxRemittanceService.createRemittanceBatch(period);

      safeLogger.info('Created tax remittance batch for quarter:', {
        quarter,
        batchId,
      });

      // Get batch details
      const report = await taxRemittanceService.getRemittanceReport(batchId);

      // File tax return
      await taxRemittanceService.fileTaxReturn(batchId, {
        grossSales: 0, // Would be calculated from orders
        taxableAmount: report.totalTaxAmount,
        provider: 'stripe_tax',
      });

      safeLogger.info('Tax return filed for quarter:', {
        quarter,
        batchId,
      });

      // TODO: Integrate with tax authority API for actual filing
    } catch (error) {
      safeLogger.error(`Error processing quarterly tax filing for Q${quarter}:`, error);
    }
  }

  /**
   * Check overdue taxes
   */
  private async checkOverdueTaxes(): Promise<void> {
    try {
      const alertsCreated = await taxRemittanceService.checkOverdueTaxes();

      if (alertsCreated > 0) {
        safeLogger.warn(`Created ${alertsCreated} tax compliance alerts for overdue taxes`);
        // TODO: Send email notification to admin
      }
    } catch (error) {
      safeLogger.error('Error checking overdue taxes:', error);
    }
  }

  /**
   * Generate weekly tax summary report
   */
  private async generateWeeklyTaxReport(): Promise<void> {
    try {
      safeLogger.info('Generating weekly tax summary report...');

      const summary = await this.generateTaxSummary();

      safeLogger.info('Weekly tax summary generated:', {
        pending: summary.pending,
        filed: summary.filed,
        paid: summary.paid,
      });

      // TODO: Email report to admin
    } catch (error) {
      safeLogger.error('Error generating weekly tax report:', error);
    }
  }

  /**
   * Generate tax summary for a period
   */
  private async generateTaxSummary() {
    try {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const liabilities = await db
        .select()
        .from(tax_liabilities)
        .where(
          gte(tax_liabilities.collection_date, weekAgo)
        );

      const jurisdictions = new Set(liabilities.map(l => l.tax_jurisdiction));

      const summary: Record<string, any> = {
        period: { start: weekAgo, end: today },
        pending: 0,
        filed: 0,
        paid: 0,
        total_amount: 0,
        by_jurisdiction: {},
      };

      liabilities.forEach(liability => {
        summary.total_amount += liability.tax_amount;

        switch (liability.status) {
          case 'pending':
          case 'calculated':
            summary.pending += 1;
            break;
          case 'filed':
            summary.filed += 1;
            break;
          case 'paid':
            summary.paid += 1;
            break;
        }

        if (!summary.by_jurisdiction[liability.tax_jurisdiction]) {
          summary.by_jurisdiction[liability.tax_jurisdiction] = {
            count: 0,
            amount: 0,
            statuses: {},
          };
        }

        const jur = summary.by_jurisdiction[liability.tax_jurisdiction];
        jur.count += 1;
        jur.amount += liability.tax_amount;
        jur.statuses[liability.status] = (jur.statuses[liability.status] || 0) + 1;
      });

      return summary;
    } catch (error) {
      safeLogger.error('Error generating tax summary:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  private async generateComplianceReport() {
    try {
      const today = new Date();

      // Get all pending and overdue taxes
      const overdueLiabilities = await db
        .select()
        .from(tax_liabilities)
        .where(
          and(
            lte(tax_liabilities.due_date, today),
            eq(tax_liabilities.status, 'pending')
          )
        );

      // Get all unresolved alerts
      const alerts = await taxRemittanceService.getComplianceAlerts(false);

      // Get filing status
      const filings = await db
        .select()
        .from(tax_filings);

      const filedCount = filings.filter(f => f.status === 'filed').length;
      const acceptedCount = filings.filter(f => f.status === 'accepted').length;
      const rejectedCount = filings.filter(f => f.status === 'rejected').length;

      return {
        generated_at: today,
        overdue_liabilities: overdueLiabilities.length,
        overdue_amount: overdueLiabilities.reduce((sum, l) => sum + l.tax_amount, 0),
        pending_alerts: alerts.length,
        filing_status: {
          filed: filedCount,
          accepted: acceptedCount,
          rejected: rejectedCount,
        },
        recommendations: this.generateRecommendations(
          overdueLiabilities.length,
          alerts.length,
          rejectedCount
        ),
      };
    } catch (error) {
      safeLogger.error('Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations based on compliance status
   */
  private generateRecommendations(
    overdueCount: number,
    alertCount: number,
    rejectedCount: number
  ): string[] {
    const recommendations: string[] = [];

    if (overdueCount > 0) {
      recommendations.push(
        `Address ${overdueCount} overdue tax liabilities immediately to avoid penalties`
      );
    }

    if (alertCount > 5) {
      recommendations.push('Review and resolve pending compliance alerts');
    }

    if (rejectedCount > 0) {
      recommendations.push(`Resubmit ${rejectedCount} rejected tax filings`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Compliance status is good. Continue regular monitoring.');
    }

    return recommendations;
  }

  /**
   * Get quarter start date
   */
  private getQuarterStartDate(year: number, quarter: 1 | 2 | 3 | 4): Date {
    const month = (quarter - 1) * 3;
    return new Date(year, month, 1);
  }

  /**
   * Get quarter end date
   */
  private getQuarterEndDate(year: number, quarter: 1 | 2 | 3 | 4): Date {
    const month = quarter * 3;
    return new Date(year, month, 0); // Last day of quarter
  }

  /**
   * Check if scheduling is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get list of active jobs
   */
  getActiveJobs(): string[] {
    return Array.from(this.jobs.keys());
  }
}

// Missing import fix
import { eq } from 'drizzle-orm';

// Export singleton
export const taxReportingSchedulingService = new TaxReportingSchedulingService();

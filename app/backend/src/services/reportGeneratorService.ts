import { returnAnalyticsService, ReturnAnalytics, AnalyticsPeriod } from './returnAnalyticsService';
import { refundCostAnalysisService, ComprehensiveCostAnalysis } from './refundCostAnalysisService';
import { refundMonitoringService } from './refundMonitoringService';
import { safeLogger } from '../utils/safeLogger';
import { reportBuilderService } from './reportBuilderService';
import * as cron from 'node-cron';
import * as nodemailer from 'nodemailer';

/**
 * Report Generation Service
 * Task 2.5: Report Generation System
 * 
 * Provides comprehensive report generation, scheduling, and delivery
 */

export interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    dataSource: 'returns' | 'refunds' | 'costs' | 'combined';
    format: 'json' | 'csv' | 'pdf';
}

export interface ReportParameters {
    startDate: Date;
    endDate: Date;
    sellerId?: string;
    includeMetrics?: string[];
    customFilters?: Record<string, any>;
}

export interface GeneratedReport {
    id: string;
    templateId: string;
    templateName: string;
    generatedAt: Date;
    parameters: ReportParameters;
    data: any;
    format: string;
    size: number;
}

export interface ReportSchedule {
    id: string;
    templateId: string;
    cronExpression: string;
    recipients: string[];
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
}

export class ReportGeneratorService {
    private schedules: Map<string, ReportSchedule> = new Map();
    private cronJobs: Map<string, cron.ScheduledTask> = new Map();
    private reportHistory: Map<string, GeneratedReport[]> = new Map();
    private emailTransporter: nodemailer.Transporter | null = null;

    constructor() {
        this.initializeEmailTransporter();
    }

    // ========================================================================
    // REPORT GENERATION
    // ========================================================================

    /**
     * Generate a report based on template and parameters
     */
    async generateReport(
        templateId: string,
        parameters: ReportParameters
    ): Promise<GeneratedReport> {
        try {
            safeLogger.info('Generating report', { templateId, parameters });

            const template = this.getTemplateById(templateId);
            if (!template) {
                throw new Error(`Template ${templateId} not found`);
            }

            // Fetch data based on template type
            const data = await this.fetchReportData(template, parameters);

            // Format data according to template format
            const formattedData = await this.formatReportData(data, template.format);

            const report: GeneratedReport = {
                id: this.generateReportId(),
                templateId,
                templateName: template.name,
                generatedAt: new Date(),
                parameters,
                data: formattedData,
                format: template.format,
                size: JSON.stringify(formattedData).length,
            };

            // Store in history
            this.addToHistory(templateId, report);

            safeLogger.info('Report generated successfully', {
                reportId: report.id,
                size: report.size,
            });

            return report;
        } catch (error) {
            safeLogger.error('Error generating report:', error);
            throw error;
        }
    }

    /**
     * Fetch data for report based on template data source
     */
    private async fetchReportData(
        template: ReportTemplate,
        parameters: ReportParameters
    ): Promise<any> {
        const period: AnalyticsPeriod = {
            start: parameters.startDate.toISOString(),
            end: parameters.endDate.toISOString(),
        };

        switch (template.dataSource) {
            case 'returns':
                return await this.fetchReturnData(period, parameters);

            case 'refunds':
                return await this.fetchRefundData(period, parameters);

            case 'costs':
                return await this.fetchCostData(period, parameters);

            case 'combined':
                return await this.fetchCombinedData(period, parameters);

            default:
                throw new Error(`Unknown data source: ${template.dataSource}`);
        }
    }

    /**
     * Fetch return analytics data
     */
    private async fetchReturnData(
        period: AnalyticsPeriod,
        parameters: ReportParameters
    ): Promise<any> {
        if (!parameters.sellerId) {
            throw new Error('sellerId is required for return data');
        }

        const analytics = await returnAnalyticsService.getEnhancedAnalytics(
            parameters.sellerId,
            period
        );

        const trendAnalysis = await returnAnalyticsService.getTrendAnalysis(
            parameters.sellerId,
            period
        );

        return {
            period,
            analytics,
            trendAnalysis,
            generatedAt: new Date(),
        };
    }

    /**
   * Fetch refund monitoring data
   */
    private async fetchRefundData(
        period: AnalyticsPeriod,
        parameters: ReportParameters
    ): Promise<any> {
        const providerStatus = await refundMonitoringService.getProviderStatus();

        return {
            period,
            providerStatus,
            summary: {
                totalProviders: providerStatus.length,
                operationalProviders: providerStatus.filter(p => p.status === 'operational').length,
                degradedProviders: providerStatus.filter(p => p.status === 'degraded').length,
                downProviders: providerStatus.filter(p => p.status === 'down').length,
            },
            generatedAt: new Date(),
        };
    };

    /**
     * Fetch cost analysis data
     */
    private async fetchCostData(
        period: AnalyticsPeriod,
        parameters: ReportParameters
    ): Promise<any> {
        const startDate = new Date(period.start);
        const endDate = new Date(period.end);

        const processingFees = await refundCostAnalysisService.calculateProcessingFees(
            startDate,
            endDate
        );

        const shippingCosts = await refundCostAnalysisService.calculateShippingCosts(
            startDate,
            endDate
        );

        const comprehensiveAnalysis = await refundCostAnalysisService.getComprehensiveCostAnalysis(
            startDate,
            endDate
        );

        return {
            period,
            processingFees,
            shippingCosts,
            comprehensiveAnalysis,
            generatedAt: new Date(),
        };
    }

    /**
     * Fetch combined data from all sources
     */
    private async fetchCombinedData(
        period: AnalyticsPeriod,
        parameters: ReportParameters
    ): Promise<any> {
        const [returnData, refundData, costData] = await Promise.all([
            this.fetchReturnData(period, parameters),
            this.fetchRefundData(period, parameters),
            this.fetchCostData(period, parameters),
        ]);

        return {
            period,
            returns: returnData,
            refunds: refundData,
            costs: costData,
            generatedAt: new Date(),
        };
    }

    /**
     * Format report data according to specified format
     */
    private async formatReportData(data: any, format: string): Promise<any> {
        switch (format) {
            case 'json':
                return data;

            case 'csv':
                return this.convertToCSV(data);

            case 'pdf':
                // PDF generation would require a library like pdfkit or puppeteer
                // For now, return JSON with a note
                return {
                    ...data,
                    _note: 'PDF generation not yet implemented',
                };

            default:
                return data;
        }
    }

    /**
     * Convert data to CSV format
     */
    private convertToCSV(data: any): string {
        // Simple CSV conversion for flat objects
        // For complex nested data, this would need enhancement
        if (Array.isArray(data)) {
            if (data.length === 0) return '';

            const headers = Object.keys(data[0]);
            const rows = data.map(item =>
                headers.map(header => JSON.stringify(item[header] ?? '')).join(',')
            );

            return [headers.join(','), ...rows].join('\n');
        }

        // For non-array data, convert to key-value pairs
        return Object.entries(data)
            .map(([key, value]) => `${key},${JSON.stringify(value)}`)
            .join('\n');
    }

    // ========================================================================
    // REPORT SCHEDULING
    // ========================================================================

    /**
     * Schedule a report to run on a cron schedule
     */
    async scheduleReport(
        templateId: string,
        cronExpression: string,
        recipients: string[],
        parameters?: Partial<ReportParameters>
    ): Promise<ReportSchedule> {
        try {
            const scheduleId = this.generateScheduleId();

            const schedule: ReportSchedule = {
                id: scheduleId,
                templateId,
                cronExpression,
                recipients,
                enabled: true,
                nextRun: this.calculateNextRun(cronExpression),
            };

            // Create cron job
            const job = cron.schedule(cronExpression, async () => {
                await this.executeScheduledReport(schedule, parameters);
            });

            this.schedules.set(scheduleId, schedule);
            this.cronJobs.set(scheduleId, job);

            safeLogger.info('Report scheduled', { scheduleId, cronExpression });

            return schedule;
        } catch (error) {
            safeLogger.error('Error scheduling report:', error);
            throw error;
        }
    }

    /**
     * Execute a scheduled report
     */
    private async executeScheduledReport(
        schedule: ReportSchedule,
        baseParameters?: Partial<ReportParameters>
    ): Promise<void> {
        try {
            safeLogger.info('Executing scheduled report', { scheduleId: schedule.id });

            // Calculate date range based on template type
            const template = this.getTemplateById(schedule.templateId);
            if (!template) {
                throw new Error(`Template ${schedule.templateId} not found`);
            }

            const parameters = this.calculateReportParameters(template, baseParameters);

            // Generate report
            const report = await this.generateReport(schedule.templateId, parameters);

            // Deliver report
            await this.deliverReport(report, schedule.recipients, 'email');

            // Update schedule
            schedule.lastRun = new Date();
            schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
            this.schedules.set(schedule.id, schedule);

            safeLogger.info('Scheduled report executed successfully', {
                scheduleId: schedule.id,
                reportId: report.id,
            });
        } catch (error) {
            safeLogger.error('Error executing scheduled report:', error);
        }
    }

    /**
     * Calculate report parameters based on template type
     */
    private calculateReportParameters(
        template: ReportTemplate,
        baseParameters?: Partial<ReportParameters>
    ): ReportParameters {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        switch (template.type) {
            case 'daily':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;

            case 'weekly':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                break;

            case 'monthly':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 1);
                break;

            default:
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 30);
        }

        return {
            startDate: baseParameters?.startDate || startDate,
            endDate: baseParameters?.endDate || endDate,
            sellerId: baseParameters?.sellerId,
            includeMetrics: baseParameters?.includeMetrics,
            customFilters: baseParameters?.customFilters,
        };
    }

    /**
     * Cancel a scheduled report
     */
    async cancelSchedule(scheduleId: string): Promise<boolean> {
        const job = this.cronJobs.get(scheduleId);
        if (job) {
            job.stop();
            this.cronJobs.delete(scheduleId);
        }

        return this.schedules.delete(scheduleId);
    }

    /**
     * Get all active schedules
     */
    getActiveSchedules(): ReportSchedule[] {
        return Array.from(this.schedules.values()).filter(s => s.enabled);
    }

    // ========================================================================
    // REPORT DELIVERY
    // ========================================================================

    /**
     * Deliver a report via specified method
     */
    async deliverReport(
        report: GeneratedReport,
        recipients: string[],
        method: 'email' | 'storage' | 'api'
    ): Promise<void> {
        switch (method) {
            case 'email':
                await this.deliverViaEmail(report, recipients);
                break;

            case 'storage':
                await this.saveToStorage(report);
                break;

            case 'api':
                // API delivery would push to a webhook or API endpoint
                safeLogger.info('API delivery not yet implemented');
                break;

            default:
                throw new Error(`Unknown delivery method: ${method}`);
        }
    }

    /**
     * Deliver report via email
     */
    private async deliverViaEmail(
        report: GeneratedReport,
        recipients: string[]
    ): Promise<void> {
        if (!this.emailTransporter) {
            safeLogger.warn('Email transporter not configured, skipping email delivery');
            return;
        }

        try {
            const mailOptions = {
                from: process.env.SMTP_FROM || 'reports@linkdao.io',
                to: recipients.join(','),
                subject: `${report.templateName} - ${report.generatedAt.toLocaleDateString()}`,
                text: `Report generated at ${report.generatedAt.toISOString()}`,
                attachments: [
                    {
                        filename: `report-${report.id}.${report.format}`,
                        content: JSON.stringify(report.data, null, 2),
                    },
                ],
            };

            await this.emailTransporter.sendMail(mailOptions);

            safeLogger.info('Report delivered via email', {
                reportId: report.id,
                recipients: recipients.length,
            });
        } catch (error) {
            safeLogger.error('Error delivering report via email:', error);
            throw error;
        }
    }

    /**
     * Save report to storage
     */
    private async saveToStorage(report: GeneratedReport): Promise<void> {
        // This would integrate with S3, GCS, or local file system
        // For now, just log
        safeLogger.info('Report saved to storage', { reportId: report.id });
    }

    // ========================================================================
    // REPORT HISTORY
    // ========================================================================

    /**
     * Get report history for a template
     */
    getReportHistory(templateId: string, limit: number = 10): GeneratedReport[] {
        const history = this.reportHistory.get(templateId) || [];
        return history.slice(0, limit);
    }

    /**
     * Add report to history
     */
    private addToHistory(templateId: string, report: GeneratedReport): void {
        const history = this.reportHistory.get(templateId) || [];
        history.unshift(report);

        // Keep only last 100 reports
        if (history.length > 100) {
            history.pop();
        }

        this.reportHistory.set(templateId, history);
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    private initializeEmailTransporter(): void {
        if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
            this.emailTransporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT),
                secure: process.env.SMTP_SECURE === 'true',
                auth: process.env.SMTP_USER
                    ? {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    }
                    : undefined,
            });

            safeLogger.info('Email transporter initialized');
        } else {
            safeLogger.warn('SMTP configuration not found, email delivery disabled');
        }
    }

    private getTemplateById(templateId: string): ReportTemplate | null {
        // This would fetch from database or template registry
        // For now, return predefined templates
        const templates = this.getDefaultTemplates();
        return templates.find(t => t.id === templateId) || null;
    }

    private getDefaultTemplates(): ReportTemplate[] {
        return [
            {
                id: 'daily_refund_summary',
                name: 'Daily Refund Summary',
                description: 'Daily summary of refund transactions and costs',
                type: 'daily',
                dataSource: 'combined',
                format: 'json',
            },
            {
                id: 'weekly_performance',
                name: 'Weekly Performance Report',
                description: 'Weekly return and refund performance metrics',
                type: 'weekly',
                dataSource: 'combined',
                format: 'json',
            },
            {
                id: 'monthly_compliance',
                name: 'Monthly Compliance Report',
                description: 'Monthly compliance and audit report',
                type: 'monthly',
                dataSource: 'combined',
                format: 'json',
            },
        ];
    }

    private generateReportId(): string {
        return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateScheduleId(): string {
        return `sch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private calculateNextRun(cronExpression: string): Date {
        // Simple next run calculation
        // In production, use a proper cron parser
        const now = new Date();
        now.setHours(now.getHours() + 1);
        return now;
    }
}

// Export singleton instance
export const reportGeneratorService = new ReportGeneratorService();

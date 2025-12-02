/**
 * Report Templates Configuration
 * Defines default report templates for the system
 */

export interface ReportTemplateConfig {
    id: string;
    name: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    dataSource: 'returns' | 'refunds' | 'costs' | 'combined';
    format: 'json' | 'csv' | 'pdf';
    defaultParameters?: {
        includeMetrics?: string[];
        customFilters?: Record<string, any>;
    };
}

export const DAILY_REFUND_SUMMARY: ReportTemplateConfig = {
    id: 'daily_refund_summary',
    name: 'Daily Refund Summary',
    description: 'Daily summary of refund transactions, processing fees, and costs',
    type: 'daily',
    dataSource: 'combined',
    format: 'json',
    defaultParameters: {
        includeMetrics: [
            'totalTransactions',
            'successfulTransactions',
            'failedTransactions',
            'totalProcessingFees',
            'totalShippingCosts',
            'totalRefundAmount',
        ],
    },
};

export const WEEKLY_PERFORMANCE: ReportTemplateConfig = {
    id: 'weekly_performance',
    name: 'Weekly Performance Report',
    description: 'Weekly return and refund performance metrics with trend analysis',
    type: 'weekly',
    dataSource: 'combined',
    format: 'json',
    defaultParameters: {
        includeMetrics: [
            'totalReturns',
            'approvedReturns',
            'rejectedReturns',
            'averageProcessingTime',
            'returnRate',
            'customerSatisfaction',
            'totalRefundAmount',
            'averageRefundAmount',
        ],
    },
};

export const MONTHLY_COMPLIANCE: ReportTemplateConfig = {
    id: 'monthly_compliance',
    name: 'Monthly Compliance Report',
    description: 'Monthly compliance report with audit trail and risk metrics',
    type: 'monthly',
    dataSource: 'combined',
    format: 'json',
    defaultParameters: {
        includeMetrics: [
            'totalReturns',
            'highRiskReturns',
            'fraudDetected',
            'averageRiskScore',
            'processingTimeCompliance',
            'refundTimeCompliance',
            'totalRefundAmount',
            'totalProcessingFees',
            'totalShippingCosts',
        ],
    },
};

export const REFUND_COST_ANALYSIS: ReportTemplateConfig = {
    id: 'refund_cost_analysis',
    name: 'Refund Cost Analysis',
    description: 'Detailed analysis of refund-related costs and financial impact',
    type: 'custom',
    dataSource: 'costs',
    format: 'json',
    defaultParameters: {
        includeMetrics: [
            'totalProcessingFees',
            'averageFeePerTransaction',
            'feesByPaymentMethod',
            'totalShippingCosts',
            'averageShippingCostPerReturn',
            'totalAdministrativeOverhead',
            'totalCosts',
            'costPerReturn',
        ],
    },
};

export const RETURN_TREND_ANALYSIS: ReportTemplateConfig = {
    id: 'return_trend_analysis',
    name: 'Return Trend Analysis',
    description: 'Comprehensive trend analysis with period comparisons and forecasting',
    type: 'custom',
    dataSource: 'returns',
    format: 'json',
    defaultParameters: {
        includeMetrics: [
            'totalReturns',
            'returnsByDay',
            'topReturnReasons',
            'statusDistribution',
            'monthOverMonth',
            'weeklyTrend',
            'categoryBreakdown',
            'sellerPerformance',
        ],
    },
};

export const PROVIDER_HEALTH_REPORT: ReportTemplateConfig = {
    id: 'provider_health_report',
    name: 'Provider Health Report',
    description: 'Refund provider health status and transaction monitoring',
    type: 'custom',
    dataSource: 'refunds',
    format: 'json',
    defaultParameters: {
        includeMetrics: [
            'providerHealth',
            'successRate',
            'failureRate',
            'averageProcessingTime',
            'transactionVolume',
            'recentFailures',
        ],
    },
};

/**
 * Get all available report templates
 */
export function getAllTemplates(): ReportTemplateConfig[] {
    return [
        DAILY_REFUND_SUMMARY,
        WEEKLY_PERFORMANCE,
        MONTHLY_COMPLIANCE,
        REFUND_COST_ANALYSIS,
        RETURN_TREND_ANALYSIS,
        PROVIDER_HEALTH_REPORT,
    ];
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): ReportTemplateConfig | null {
    const templates = getAllTemplates();
    return templates.find(t => t.id === id) || null;
}

/**
 * Get templates by type
 */
export function getTemplatesByType(
    type: 'daily' | 'weekly' | 'monthly' | 'custom'
): ReportTemplateConfig[] {
    return getAllTemplates().filter(t => t.type === type);
}

/**
 * Get templates by data source
 */
export function getTemplatesByDataSource(
    dataSource: 'returns' | 'refunds' | 'costs' | 'combined'
): ReportTemplateConfig[] {
    return getAllTemplates().filter(t => t.dataSource === dataSource);
}

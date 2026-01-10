import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ReturnMetrics {
    totalReturns: number;
    approvedReturns: number;
    rejectedReturns: number;
    completedReturns: number;
    pendingReturns: number;
    cancelledReturns: number;
    statusDistribution: Record<string, number>;
}

export interface FinancialMetrics {
    totalRefundAmount: number;
    averageRefundAmount: number;
    maxRefundAmount: number;
    minRefundAmount: number;
    totalRestockingFees: number;
    totalShippingCosts: number;
    netRefundImpact: number;
}

export interface ProcessingTimeMetrics {
    averageApprovalTime: number;
    averageRefundTime: number;
    averageTotalResolutionTime: number;
    medianApprovalTime: number;
    p95ApprovalTime: number;
    p99ApprovalTime: number;
}

export interface RiskMetrics {
    highRiskReturns: number;
    mediumRiskReturns: number;
    lowRiskReturns: number;
    flaggedForReview: number;
    fraudDetected: number;
    averageRiskScore: number;
}

export interface ReturnAnalytics {
    metrics: ReturnMetrics;
    financial: FinancialMetrics;
    processingTime: ProcessingTimeMetrics;
    risk: RiskMetrics;
    topReturnReasons: Array<{
        reason: string;
        count: number;
        percentage: number;
    }>;
    returnsByDay: Array<{
        date: string;
        count: number;
    }>;
    returnRate: number;
    customerSatisfaction: number;
    returnTrends: {
        monthOverMonth: number;
        weeklyTrend: Array<{
            week: string;
            returns: number;
            refunds: number;
        }>;
    };
    categoryData: CategoryMetrics[];
    sellerPerformance: SellerPerformanceMetrics[];
}

export interface CategoryMetrics {
    category: string;
    count: number;
    percentage: number;
    avgRefundAmount: number;
}

export interface SellerPerformanceMetrics {
    sellerId: string;
    sellerName: string;
    totalReturns: number;
    approvalRate: number;
    avgProcessingTime: number;
    customerSatisfaction: number;
    complianceScore: number;
}

export interface RealtimeMetrics {
    timestamp: string;
    activeReturns: number;
    pendingApproval: number;
    pendingRefund: number;
    inTransitReturns: number;
    returnsPerMinute: number;
    approvalsPerMinute: number;
    refundsPerMinute: number;
    manualReviewQueueDepth: number;
    refundProcessingQueueDepth: number;
    inspectionQueueDepth: number;
    volumeSpikeDetected: boolean;
}

class ReturnAnalyticsService {
    /**
     * Get real-time return metrics
     */
    async getRealtimeMetrics(): Promise<RealtimeMetrics> {
        const response = await axios.get(`${API_URL}/admin/returns/metrics`, {
            withCredentials: true,
        });
        return response.data.data;
    }

    /**
     * Get comprehensive return analytics
     */
    async getAnalytics(period: { start: string; end: string }, sellerId?: string): Promise<ReturnAnalytics> {
        const response = await axios.get(`${API_URL}/admin/returns/analytics`, {
            params: {
                start: period.start,
                end: period.end,
                sellerId,
            },
            withCredentials: true,
        });
        return response.data.data;
    }

    /**
     * Get return event history
     */
    async getReturnEvents(returnId: string): Promise<any[]> {
        const response = await axios.get(`${API_URL}/admin/returns/events/${returnId}`, {
            withCredentials: true,
        });
        return response.data.data;
    }

    /**
     * Get status distribution
     */
    async getStatusDistribution(period: { start: string; end: string }): Promise<Record<string, number>> {
        const response = await axios.get(`${API_URL}/admin/returns/status-distribution`, {
            params: {
                start: period.start,
                end: period.end,
            },
            withCredentials: true,
        });
        return response.data.data;
    }

    /**
     * Get processing time metrics
     */
    async getProcessingMetrics(period: { start: string; end: string }, sellerId?: string): Promise<ProcessingTimeMetrics> {
        const response = await axios.get(`${API_URL}/admin/returns/processing-metrics`, {
            params: {
                start: period.start,
                end: period.end,
                sellerId,
            },
            withCredentials: true,
        });
        return response.data.data;
    }

    /**
     * Get drill-down analytics
     */
    async getDrillDownAnalytics(
        type: 'category' | 'seller' | 'reason' | 'status',
        value: string,
        period: { start: string; end: string }
    ): Promise<any> {
        const response = await axios.get(`${API_URL}/admin/returns/analytics/drill-down`, {
            params: {
                type,
                value,
                start: period.start,
                end: period.end,
            },
            withCredentials: true,
        });
        return response.data.data;
    }
}

export const returnAnalyticsService = new ReturnAnalyticsService();

import { get, post, put } from './globalFetchWrapper';
import type {
    DashboardData,
    OrderQueueItem,
    FulfillmentMetrics,
    PerformanceTrend,
    MetricsComparison,
    QueueType,
    BulkAction,
    BulkActionResult,
    AutomationRule,
    AutomationLog
} from '../types/fulfillment';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

class FulfillmentService {
    /**
     * Get complete dashboard data
     */
    async getDashboard(): Promise<DashboardData> {
        const response = await get<{ data: DashboardData }>(
            `${API_BASE}/api/seller/fulfillment/dashboard`
        );

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch dashboard data');
        }

        return response.data.data;
    }

    /**
     * Get specific order queue
     */
    async getQueue(queueType: QueueType, limit: number = 50): Promise<OrderQueueItem[]> {
        const response = await get<{ data: OrderQueueItem[] }>(
            `${API_BASE}/api/seller/fulfillment/queue/${queueType}?limit=${limit}`
        );

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch queue');
        }

        return response.data.data;
    }

    /**
     * Get fulfillment metrics
     */
    async getMetrics(periodDays: number = 30): Promise<FulfillmentMetrics> {
        const response = await get<{ data: FulfillmentMetrics }>(
            `${API_BASE}/api/seller/metrics/fulfillment?period=${periodDays}`
        );

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch metrics');
        }

        return response.data.data;
    }

    /**
     * Get performance trends
     */
    async getPerformanceTrends(periodDays: number = 90, intervalDays: number = 7): Promise<PerformanceTrend[]> {
        const response = await get<{ data: PerformanceTrend[] }>(
            `${API_BASE}/api/seller/metrics/performance?period=${periodDays}&interval=${intervalDays}`
        );

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch performance trends');
        }

        return response.data.data;
    }

    /**
     * Get comparison to platform average
     */
    async getComparison(periodDays: number = 30): Promise<MetricsComparison> {
        const response = await get<{ data: MetricsComparison }>(
            `${API_BASE}/api/seller/metrics/comparison?period=${periodDays}`
        );

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch comparison data');
        }

        return response.data.data;
    }

    /**
     * Perform bulk action on orders
     */
    async performBulkAction(orderIds: string[], action: BulkAction): Promise<BulkActionResult> {
        const response = await post<{ data: BulkActionResult }>(
            `${API_BASE}/api/seller/fulfillment/bulk-action`,
            { orderIds, action }
        );

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to perform bulk action');
        }

        return response.data.data;
    }

    /**
     * Get automation rules
     */
    async getAutomationRules(): Promise<AutomationRule[]> {
        const response = await get<{ data: AutomationRule[] }>(
            `${API_BASE}/api/automation/rules`
        );

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch automation rules');
        }

        return response.data.data;
    }

    /**
     * Update automation rule
     */
    async updateAutomationRule(ruleName: string, enabled: boolean): Promise<void> {
        const response = await put(
            `${API_BASE}/api/automation/rules/${ruleName}`,
            { enabled }
        );

        if (!response.success) {
            throw new Error(response.error || 'Failed to update automation rule');
        }
    }

    /**
     * Get automation log for an order
     */
    async getAutomationLog(orderId: string): Promise<AutomationLog[]> {
        const response = await get<{ data: AutomationLog[] }>(
            `${API_BASE}/api/orders/${orderId}/automation-log`
        );

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch automation log');
        }

        return response.data.data;
    }

    /**
     * Manually trigger automation for an order
     */
    async triggerAutomation(orderId: string): Promise<void> {
        const response = await post(
            `${API_BASE}/api/orders/${orderId}/automation/trigger`
        );

        if (!response.success) {
            throw new Error(response.error || 'Failed to trigger automation');
        }
    }
}

export const fulfillmentService = new FulfillmentService();

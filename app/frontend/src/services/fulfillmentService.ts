import axios from 'axios';
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

// Create axios instance with auth
const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

class FulfillmentService {
    /**
     * Get complete dashboard data
     */
    async getDashboard(): Promise<DashboardData> {
        const response = await axios.get<{ data: DashboardData }>(
            `${API_BASE}/api/seller/fulfillment/dashboard`,
            { headers: getAuthHeaders() }
        );
        return response.data.data;
    }

    /**
     * Get specific order queue
     */
    async getQueue(queueType: QueueType, limit: number = 50): Promise<OrderQueueItem[]> {
        const response = await axios.get<{ data: OrderQueueItem[] }>(
            `${API_BASE}/api/seller/fulfillment/queue/${queueType}`,
            { params: { limit }, headers: getAuthHeaders() }
        );
        return response.data.data;
    }

    /**
     * Get fulfillment metrics
     */
    async getMetrics(periodDays: number = 30): Promise<FulfillmentMetrics> {
        const response = await axios.get<{ data: FulfillmentMetrics }>(
            `${API_BASE}/api/seller/metrics/fulfillment`,
            { params: { period: periodDays }, headers: getAuthHeaders() }
        );
        return response.data.data;
    }

    /**
     * Get performance trends
     */
    async getPerformanceTrends(periodDays: number = 90, intervalDays: number = 7): Promise<PerformanceTrend[]> {
        const response = await axios.get<{ data: PerformanceTrend[] }>(
            `${API_BASE}/api/seller/metrics/performance`,
            { params: { period: periodDays, interval: intervalDays }, headers: getAuthHeaders() }
        );
        return response.data.data;
    }

    /**
     * Get comparison to platform average
     */
    async getComparison(periodDays: number = 30): Promise<MetricsComparison> {
        const response = await axios.get<{ data: MetricsComparison }>(
            `${API_BASE}/api/seller/metrics/comparison`,
            { params: { period: periodDays }, headers: getAuthHeaders() }
        );
        return response.data.data;
    }

    /**
     * Perform bulk action on orders
     */
    async performBulkAction(orderIds: string[], action: BulkAction): Promise<BulkActionResult> {
        const response = await axios.post<{ data: BulkActionResult }>(
            `${API_BASE}/api/seller/fulfillment/bulk-action`,
            { orderIds, action },
            { headers: getAuthHeaders() }
        );
        return response.data.data;
    }

    /**
     * Get automation rules
     */
    async getAutomationRules(): Promise<AutomationRule[]> {
        const response = await axios.get<{ data: AutomationRule[] }>(
            `${API_BASE}/api/automation/rules`,
            { headers: getAuthHeaders() }
        );
        return response.data.data;
    }

    /**
     * Update automation rule
     */
    async updateAutomationRule(ruleName: string, enabled: boolean): Promise<void> {
        await axios.put(
            `${API_BASE}/api/automation/rules/${ruleName}`,
            { enabled },
            { headers: getAuthHeaders() }
        );
    }

    /**
     * Get automation log for an order
     */
    async getAutomationLog(orderId: string): Promise<AutomationLog[]> {
        const response = await axios.get<{ data: AutomationLog[] }>(
            `${API_BASE}/api/orders/${orderId}/automation-log`,
            { headers: getAuthHeaders() }
        );
        return response.data.data;
    }

    /**
     * Manually trigger automation for an order
     */
    async triggerAutomation(orderId: string): Promise<void> {
        await axios.post(
            `${API_BASE}/api/orders/${orderId}/automation/trigger`,
            {},
            { headers: getAuthHeaders() }
        );
    }
}

export const fulfillmentService = new FulfillmentService();

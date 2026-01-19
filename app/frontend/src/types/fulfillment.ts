// Fulfillment Dashboard Types

export interface FulfillmentMetrics {
    avgTimeToShipHours: number;
    avgDeliveryTimeHours: number;
    onTimeRate: number;
    fulfillmentRate: number;
    exceptionRate: number;
    totalOrders: number;
    completedOrders: number;
    disputedOrders: number;
    cancelledOrders: number;
    ordersByStatus: Array<{
        status: string;
        count: number;
        percentage: number;
    }>;
}

export interface PerformanceTrend {
    period: string;
    avgTimeToShip: number;
    avgDeliveryTime: number;
    onTimeRate: number;
    orderCount: number;
}

export interface MetricsComparison {
    seller: FulfillmentMetrics;
    platform: FulfillmentMetrics;
    comparison: {
        timeToShipDiff: number;
        deliveryTimeDiff: number;
        onTimeRateDiff: number;
    };
}

export interface OrderQueueItem {
    id: string;
    orderNumber: string;
    buyerName: string;
    buyerAddress: string;
    productName: string;
    amount: string;
    status: string;
    createdAt: Date;
    urgency: 'low' | 'medium' | 'high';
    actionRequired: string;
    metadata?: {
        trackingNumber?: string;
        carrier?: string;
        estimatedDelivery?: string;
        hoursOverdue?: number;
    };
}

export interface DashboardData {
    metrics: {
        avgTimeToShip: number;
        avgDeliveryTime: number;
        onTimeRate: number;
        totalOrders: number;
    };
    queues: {
        readyToShip: number;
        overdue: number;
        inTransit: number;
        requiresAttention: number;
    };
    recentActivity: Array<{
        type: string;
        orderId: string;
        status: string;
        amount: string;
        timestamp: string;
    }>;
}

export interface ShippingRate {
    id: string;
    carrier: string;
    service: string;
    rate: string;
    currency: string;
    deliveryDays: number;
    deliveryDate: string;
}

export interface ShippingLabel {
    id: string;
    trackingNumber: string;
    trackingUrl: string;
    labelUrl: string;
    carrier: string;
    service: string;
    rate: string;
}

export interface ShippingAddress {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
    email?: string;
}

export interface Parcel {
    length: number;
    width: number;
    height: number;
    weight: number;
}

export interface TrackingInfo {
    trackingNumber: string;
    carrier: string;
    status: string;
    estimatedDelivery?: string;
    publicUrl?: string;
    events: Array<{
        status: string;
        message: string;
        location: string;
        timestamp: string;
    }>;
}

export interface AutomationRule {
    name: string;
    enabled: boolean;
}

export interface AutomationLog {
    id: string;
    ruleName: string;
    actionTaken: string;
    previousStatus?: string;
    newStatus?: string;
    success: boolean;
    errorMessage?: string;
    createdAt: string;
}

export interface BulkActionResult {
    success: number;
    failed: number;
    errors: string[];
}

export type QueueType = 'ready_to_ship' | 'overdue' | 'in_transit' | 'requires_attention';
export type BulkAction = 'mark_shipped' | 'print_labels' | 'export_csv';

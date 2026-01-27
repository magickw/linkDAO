import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { OrderWebSocketService, getOrderWebSocketService } from './orderWebSocketService';
import { OrderStatus } from '../models/Order';

export interface OrderMilestone {
    orderId: string;
    type: string;
    status: OrderStatus | string;
    title: string;
    description?: string;
    timestamp: Date;
    completed: boolean;
    metadata?: any;
}

export class OrderTimelineService {
    private databaseService: DatabaseService;

    constructor() {
        this.databaseService = new DatabaseService();
    }

    /**
     * Get complete timeline for an order
     */
    async getTimeline(orderId: string): Promise<OrderMilestone[]> {
        try {
            // 1. Fetch order to determine current state
            const order = await this.databaseService.getOrderById(orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            // 2. Fetch all recorded events/milestones from DB
            // This would ideally come from a unified events table, tracking_records, etc.
            // For now, we will construct it from available data sources.

            const timeline: OrderMilestone[] = [];

            // Add Creation Event
            timeline.push({
                orderId,
                type: 'ORDER_CREATED',
                status: OrderStatus.CREATED,
                title: 'Order Placed',
                description: 'Order successfully placed',
                timestamp: order.createdAt,
                completed: true
            });

            // Add Payment Event if Paid
            if (order.status !== OrderStatus.CREATED && order.status !== OrderStatus.PAYMENT_PENDING) {
                timeline.push({
                    orderId,
                    type: 'PAYMENT_COMPLETED',
                    status: OrderStatus.PAID,
                    title: 'Payment Confirmed',
                    description: 'Payment successfully processed',
                    timestamp: order.receiptGeneratedAt || order.updatedAt, // fallback
                    completed: true
                });
            }

            // Add Shipping Events
            const trackingRecords = await this.databaseService.getTrackingRecords(orderId);
            trackingRecords.forEach(record => {
                timeline.push({
                    orderId,
                    type: 'SHIPMENT_UPDATE',
                    status: record.status,
                    title: `Shipment ${record.carrier} - ${record.status}`,
                    description: record.currentLocation || record.statusDetails,
                    timestamp: record.updatedAt,
                    completed: record.status === 'delivered',
                    metadata: { trackingNumber: record.trackingNumber }
                });
            });

            // Add Delivery Event
            // Normalize status comparison to handle case differences
            const normalizedStatus = (order.status || '').toUpperCase();
            if (normalizedStatus === OrderStatus.DELIVERED || normalizedStatus === OrderStatus.COMPLETED) {
                timeline.push({
                    orderId,
                    type: 'ORDER_DELIVERED',
                    status: OrderStatus.DELIVERED,
                    title: 'Order Delivered',
                    description: 'Package has been delivered to your address',
                    timestamp: order.updatedAt, // Should be actual delivery time
                    completed: true
                });
            }

            // Add Cancellation Event
            if (normalizedStatus === OrderStatus.CANCELLED) {
                timeline.push({
                    orderId,
                    type: 'ORDER_CANCELLED',
                    status: OrderStatus.CANCELLED,
                    title: 'Order Cancelled',
                    description: order.cancellationReason || 'Order was cancelled',
                    timestamp: order.updatedAt,
                    completed: true
                });
            }

            // Sort by timestamp
            return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        } catch (error) {
            safeLogger.error('Error fetching order timeline:', error);
            throw error;
        }
    }

    /**
     * Add a new milestone to the timeline
     * (Conceptually matches 'logging an event' but for user display)
     */
    async addMilestone(orderId: string, milestone: Omit<OrderMilestone, 'orderId'>): Promise<void> {
        try {
            // In a real system, we'd insert into an 'order_milestones' or 'events' table
            // e.g. await this.databaseService.createEvent(...)

            // For now, we assume critical milestones are derived from Order status + Tracking
            // But we can broadcast this 'virtual' milestone to the frontend

            const fullMilestone = { ...milestone, orderId };

            const wsService = getOrderWebSocketService();
            if (wsService) {
                wsService.emitOrderEvent(orderId, 'timeline_update', fullMilestone);
            }

            safeLogger.info(`Added milestone for order ${orderId}: ${milestone.title}`);
        } catch (error) {
            safeLogger.error('Error adding milestone:', error);
        }
    }

    /**
     * Sync carrier tracking updates to timeline
     */
    async syncCarrierTracking(orderId: string, trackingInfo: any): Promise<void> {
        // This would be called by ShippingService or webhook handler
        // It updates the DB tracking record and broadcasts the change

        await this.addMilestone(orderId, {
            type: 'CARRIER_UPDATE',
            status: trackingInfo.status,
            title: `Shipment Update: ${trackingInfo.status}`,
            description: trackingInfo.details,
            timestamp: new Date(),
            completed: trackingInfo.status === 'delivered',
            metadata: trackingInfo
        });
    }
}

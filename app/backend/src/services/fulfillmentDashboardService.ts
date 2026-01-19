import { db } from '../db';
import { orders, users, marketplaceListings, shippingLabels } from '../db/schema';
import { eq, and, isNull, sql, desc, inArray } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { fulfillmentMetricsService } from './fulfillmentMetricsService';
import { OrderService } from './orderService';

const orderService = new OrderService();

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
    recentActivity: any[];
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
    metadata?: any;
}

class FulfillmentDashboardService {
    /**
     * Get complete dashboard data for a seller
     */
    async getDashboardData(sellerId: string): Promise<DashboardData> {
        try {
            // Get metrics
            const metrics = await fulfillmentMetricsService.getSellerMetrics(sellerId, 30);

            // Get queue counts
            const [readyToShip, overdue, inTransit, requiresAttention] = await Promise.all([
                this.getReadyToShipCount(sellerId),
                this.getOverdueCount(sellerId),
                this.getInTransitCount(sellerId),
                this.getRequiresAttentionCount(sellerId)
            ]);

            // Get recent activity
            const recentActivity = await this.getRecentActivity(sellerId, 10);

            return {
                metrics: {
                    avgTimeToShip: metrics.avgTimeToShipHours,
                    avgDeliveryTime: metrics.avgDeliveryTimeHours,
                    onTimeRate: metrics.onTimeRate,
                    totalOrders: metrics.totalOrders
                },
                queues: {
                    readyToShip,
                    overdue,
                    inTransit,
                    requiresAttention
                },
                recentActivity
            };
        } catch (error) {
            safeLogger.error('Error getting dashboard data:', error);
            throw error;
        }
    }

    /**
     * Get ready to ship queue (paid/processing orders without tracking)
     */
    async getReadyToShipQueue(sellerId: string, limit: number = 50): Promise<OrderQueueItem[]> {
        try {
            const ordersList = await db
                .select({
                    orderId: orders.id,
                    orderNumber: orders.id,
                    buyerAddress: users.walletAddress,
                    buyerName: sql<string>`COALESCE(users.display_name, users.handle, users.wallet_address)`,
                    listingTitle: marketplaceListings.title,
                    amount: orders.amount,
                    status: orders.status,
                    createdAt: orders.createdAt,
                    trackingNumber: orders.trackingNumber
                })
                .from(orders)
                .innerJoin(users, eq(orders.buyerId, users.id))
                .leftJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
                .where(
                    and(
                        eq(orders.sellerId, sellerId),
                        inArray(orders.status, ['paid', 'processing']),
                        isNull(orders.trackingNumber)
                    )
                )
                .orderBy(orders.createdAt)
                .limit(limit);

            return ordersList.map(order => ({
                id: order.orderId,
                orderNumber: order.orderNumber,
                buyerName: order.buyerName || 'Unknown',
                buyerAddress: order.buyerAddress || '',
                productName: order.listingTitle || 'Unknown Product',
                amount: order.amount || '0',
                status: order.status || 'pending',
                createdAt: order.createdAt || new Date(),
                urgency: this.calculateUrgency(order.createdAt),
                actionRequired: 'Add tracking number and ship'
            }));
        } catch (error) {
            safeLogger.error('Error getting ready to ship queue:', error);
            return [];
        }
    }

    /**
     * Get overdue orders (>48h without tracking)
     */
    async getOverdueQueue(sellerId: string, limit: number = 50): Promise<OrderQueueItem[]> {
        try {
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - 48);

            const ordersList = await db
                .select({
                    orderId: orders.id,
                    orderNumber: orders.id,
                    buyerAddress: users.walletAddress,
                    buyerName: sql<string>`COALESCE(users.display_name, users.handle, users.wallet_address)`,
                    listingTitle: marketplaceListings.title,
                    amount: orders.amount,
                    status: orders.status,
                    createdAt: orders.createdAt,
                    trackingNumber: orders.trackingNumber
                })
                .from(orders)
                .innerJoin(users, eq(orders.buyerId, users.id))
                .leftJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
                .where(
                    and(
                        eq(orders.sellerId, sellerId),
                        inArray(orders.status, ['paid', 'processing']),
                        isNull(orders.trackingNumber),
                        sql`${orders.createdAt} < ${cutoffTime}`
                    )
                )
                .orderBy(orders.createdAt)
                .limit(limit);

            return ordersList.map(order => ({
                id: order.orderId,
                orderNumber: order.orderNumber,
                buyerName: order.buyerName || 'Unknown',
                buyerAddress: order.buyerAddress || '',
                productName: order.listingTitle || 'Unknown Product',
                amount: order.amount || '0',
                status: order.status || 'pending',
                createdAt: order.createdAt || new Date(),
                urgency: 'high' as const,
                actionRequired: 'URGENT: Ship immediately',
                metadata: {
                    hoursOverdue: this.hoursSince(order.createdAt)
                }
            }));
        } catch (error) {
            safeLogger.error('Error getting overdue queue:', error);
            return [];
        }
    }

    /**
     * Get in transit orders (shipped but not delivered)
     */
    async getInTransitQueue(sellerId: string, limit: number = 50): Promise<OrderQueueItem[]> {
        try {
            const ordersList = await db
                .select({
                    orderId: orders.id,
                    orderNumber: orders.id,
                    buyerAddress: users.walletAddress,
                    buyerName: sql<string>`COALESCE(users.display_name, users.handle, users.wallet_address)`,
                    listingTitle: marketplaceListings.title,
                    amount: orders.amount,
                    status: orders.status,
                    createdAt: orders.createdAt,
                    trackingNumber: orders.trackingNumber,
                    trackingCarrier: orders.trackingCarrier,
                    estimatedDelivery: orders.estimatedDelivery
                })
                .from(orders)
                .innerJoin(users, eq(orders.buyerId, users.id))
                .leftJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
                .where(
                    and(
                        eq(orders.sellerId, sellerId),
                        eq(orders.status, 'shipped')
                    )
                )
                .orderBy(desc(orders.createdAt))
                .limit(limit);

            return ordersList.map(order => ({
                id: order.orderId,
                orderNumber: order.orderNumber,
                buyerName: order.buyerName || 'Unknown',
                buyerAddress: order.buyerAddress || '',
                productName: order.listingTitle || 'Unknown Product',
                amount: order.amount || '0',
                status: order.status || 'shipped',
                createdAt: order.createdAt || new Date(),
                urgency: this.isDeliveryDelayed(order.estimatedDelivery) ? 'high' : 'low',
                actionRequired: 'Monitor delivery',
                metadata: {
                    trackingNumber: order.trackingNumber,
                    carrier: order.trackingCarrier,
                    estimatedDelivery: order.estimatedDelivery
                }
            }));
        } catch (error) {
            safeLogger.error('Error getting in transit queue:', error);
            return [];
        }
    }

    /**
     * Get orders requiring attention (disputes, delays, etc.)
     */
    async getRequiresAttentionQueue(sellerId: string, limit: number = 50): Promise<OrderQueueItem[]> {
        try {
            const ordersList = await db
                .select({
                    orderId: orders.id,
                    orderNumber: orders.id,
                    buyerAddress: users.walletAddress,
                    buyerName: sql<string>`COALESCE(users.display_name, users.handle, users.wallet_address)`,
                    listingTitle: marketplaceListings.title,
                    amount: orders.amount,
                    status: orders.status,
                    createdAt: orders.createdAt,
                    trackingNumber: orders.trackingNumber
                })
                .from(orders)
                .innerJoin(users, eq(orders.buyerId, users.id))
                .leftJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
                .where(
                    and(
                        eq(orders.sellerId, sellerId),
                        inArray(orders.status, ['disputed', 'cancellation_requested'])
                    )
                )
                .orderBy(desc(orders.createdAt))
                .limit(limit);

            return ordersList.map(order => ({
                id: order.orderId,
                orderNumber: order.orderNumber,
                buyerName: order.buyerName || 'Unknown',
                buyerAddress: order.buyerAddress || '',
                productName: order.listingTitle || 'Unknown Product',
                amount: order.amount || '0',
                status: order.status || 'unknown',
                createdAt: order.createdAt || new Date(),
                urgency: 'high' as const,
                actionRequired: order.status === 'disputed' ? 'Resolve dispute' : 'Review cancellation request'
            }));
        } catch (error) {
            safeLogger.error('Error getting requires attention queue:', error);
            return [];
        }
    }

    /**
     * Perform bulk action on orders
     */
    async performBulkAction(
        sellerId: string,
        orderIds: string[],
        action: 'mark_shipped' | 'print_labels' | 'export_csv'
    ): Promise<{ success: number; failed: number; errors: string[] }> {
        try {
            let success = 0;
            let failed = 0;
            const errors: string[] = [];

            for (const orderId of orderIds) {
                try {
                    // Verify order belongs to seller
                    const order = await orderService.getOrderById(orderId);
                    if (!order || order.sellerId !== sellerId) {
                        errors.push(`Order ${orderId}: Not found or unauthorized`);
                        failed++;
                        continue;
                    }

                    switch (action) {
                        case 'mark_shipped':
                            if (!order.trackingNumber) {
                                errors.push(`Order ${orderId}: No tracking number`);
                                failed++;
                            } else {
                                await orderService.updateOrderStatus(orderId, 'SHIPPED' as any);
                                success++;
                            }
                            break;

                        case 'print_labels':
                            // This would integrate with shipping service
                            // For now, just mark as success if label exists
                            const label = await db
                                .select()
                                .from(shippingLabels)
                                .where(eq(shippingLabels.orderId, orderId))
                                .limit(1);

                            if (label.length > 0) {
                                success++;
                            } else {
                                errors.push(`Order ${orderId}: No label found`);
                                failed++;
                            }
                            break;

                        case 'export_csv':
                            // CSV export handled separately
                            success++;
                            break;

                        default:
                            errors.push(`Unknown action: ${action}`);
                            failed++;
                    }
                } catch (error) {
                    errors.push(`Order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    failed++;
                }
            }

            return { success, failed, errors };
        } catch (error) {
            safeLogger.error('Error performing bulk action:', error);
            throw error;
        }
    }

    /**
     * Get recent activity for dashboard
     */
    private async getRecentActivity(sellerId: string, limit: number): Promise<any[]> {
        try {
            const recentOrders = await db
                .select({
                    orderId: orders.id,
                    status: orders.status,
                    amount: orders.amount,
                    createdAt: orders.createdAt,
                    updatedAt: orders.updatedAt
                })
                .from(orders)
                .where(eq(orders.sellerId, sellerId))
                .orderBy(desc(orders.updatedAt))
                .limit(limit);

            return recentOrders.map(order => ({
                type: 'order_update',
                orderId: order.orderId,
                status: order.status,
                amount: order.amount,
                timestamp: order.updatedAt || order.createdAt
            }));
        } catch (error) {
            safeLogger.error('Error getting recent activity:', error);
            return [];
        }
    }

    /**
     * Helper: Get count of ready to ship orders
     */
    private async getReadyToShipCount(sellerId: string): Promise<number> {
        try {
            const result = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(orders)
                .where(
                    and(
                        eq(orders.sellerId, sellerId),
                        inArray(orders.status, ['paid', 'processing']),
                        isNull(orders.trackingNumber)
                    )
                );

            return Number(result[0]?.count || 0);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Helper: Get count of overdue orders
     */
    private async getOverdueCount(sellerId: string): Promise<number> {
        try {
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - 48);

            const result = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(orders)
                .where(
                    and(
                        eq(orders.sellerId, sellerId),
                        inArray(orders.status, ['paid', 'processing']),
                        isNull(orders.trackingNumber),
                        sql`${orders.createdAt} < ${cutoffTime}`
                    )
                );

            return Number(result[0]?.count || 0);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Helper: Get count of in transit orders
     */
    private async getInTransitCount(sellerId: string): Promise<number> {
        try {
            const result = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(orders)
                .where(
                    and(
                        eq(orders.sellerId, sellerId),
                        eq(orders.status, 'shipped')
                    )
                );

            return Number(result[0]?.count || 0);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Helper: Get count of orders requiring attention
     */
    private async getRequiresAttentionCount(sellerId: string): Promise<number> {
        try {
            const result = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(orders)
                .where(
                    and(
                        eq(orders.sellerId, sellerId),
                        inArray(orders.status, ['disputed', 'cancellation_requested'])
                    )
                );

            return Number(result[0]?.count || 0);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Helper: Calculate urgency based on order age
     */
    private calculateUrgency(createdAt: Date | null): 'low' | 'medium' | 'high' {
        if (!createdAt) return 'low';

        const hours = this.hoursSince(createdAt);
        if (hours >= 48) return 'high';
        if (hours >= 24) return 'medium';
        return 'low';
    }

    /**
     * Helper: Check if delivery is delayed
     */
    private isDeliveryDelayed(estimatedDelivery: Date | null): boolean {
        if (!estimatedDelivery) return false;
        return new Date() > estimatedDelivery;
    }

    /**
     * Helper: Calculate hours since a date
     */
    private hoursSince(date: Date | null): number {
        if (!date) return 0;
        return (Date.now() - date.getTime()) / (1000 * 60 * 60);
    }
}

export const fulfillmentDashboardService = new FulfillmentDashboardService();

import { db } from '../db';
import { orders, orderEvents, users, fulfillmentMetrics } from '../db/schema';
import { eq, and, gte, lte, sql, desc, count } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

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
    ordersByStatus: Array<{ status: string; count: number; percentage: number }>;
}

export interface PerformanceTrend {
    period: string;
    avgTimeToShip: number;
    avgDeliveryTime: number;
    onTimeRate: number;
    orderCount: number;
}

class FulfillmentMetricsService {
    /**
     * Get fulfillment metrics for a seller
     */
    async getSellerMetrics(
        sellerId: string,
        periodDays: number = 30
    ): Promise<FulfillmentMetrics> {
        try {
            const periodStart = new Date();
            periodStart.setDate(periodStart.getDate() - periodDays);
            const periodEnd = new Date();

            // Check cache first
            const cached = await this.getCachedMetrics(sellerId, periodStart, periodEnd);
            if (cached) {
                return cached;
            }

            // Calculate fresh metrics
            const metrics = await this.calculateMetrics(sellerId, periodStart, periodEnd);

            // Cache the results
            await this.cacheMetrics(sellerId, periodStart, periodEnd, metrics);

            return metrics;
        } catch (error) {
            safeLogger.error('Error getting seller metrics:', error);
            throw error;
        }
    }

    /**
     * Calculate metrics from order data
     */
    private async calculateMetrics(
        sellerId: string,
        periodStart: Date,
        periodEnd: Date
    ): Promise<FulfillmentMetrics> {
        // Get all orders in period
        const ordersList = await db
            .select()
            .from(orders)
            .where(
                and(
                    eq(orders.sellerId, sellerId),
                    gte(orders.createdAt, periodStart),
                    lte(orders.createdAt, periodEnd)
                )
            );

        const totalOrders = ordersList.length;
        if (totalOrders === 0) {
            return this.getEmptyMetrics();
        }

        // Count orders by status
        const completedOrders = ordersList.filter(o => o.status === 'completed').length;
        const disputedOrders = ordersList.filter(o => o.status === 'disputed').length;
        const cancelledOrders = ordersList.filter(o => o.status === 'cancelled' || o.status === 'refunded').length;

        // Calculate time to ship (paid → shipped)
        const avgTimeToShip = await this.calculateAvgDuration(
            sellerId,
            periodStart,
            periodEnd,
            'paid',
            'shipped'
        );

        // Calculate delivery time (shipped → delivered)
        const avgDeliveryTime = await this.calculateAvgDuration(
            sellerId,
            periodStart,
            periodEnd,
            'shipped',
            'delivered'
        );

        // Calculate on-time rate (orders delivered within estimated time)
        const onTimeRate = await this.calculateOnTimeRate(sellerId, periodStart, periodEnd);

        // Calculate rates
        const fulfillmentRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
        const exceptionRate = totalOrders > 0 ? (disputedOrders / totalOrders) * 100 : 0;

        // Get orders by status distribution
        const statusCounts = await db
            .select({
                status: orders.status,
                count: count()
            })
            .from(orders)
            .where(
                and(
                    eq(orders.sellerId, sellerId),
                    gte(orders.createdAt, periodStart),
                    lte(orders.createdAt, periodEnd)
                )
            )
            .groupBy(orders.status);

        const ordersByStatus = statusCounts.map(s => ({
            status: s.status || 'unknown',
            count: s.count,
            percentage: totalOrders > 0 ? Math.round((s.count / totalOrders) * 100) : 0
        }));

        return {
            avgTimeToShipHours: avgTimeToShip,
            avgDeliveryTimeHours: avgDeliveryTime,
            onTimeRate,
            fulfillmentRate: Math.round(fulfillmentRate * 100) / 100,
            exceptionRate: Math.round(exceptionRate * 100) / 100,
            totalOrders,
            completedOrders,
            disputedOrders,
            cancelledOrders,
            ordersByStatus
        };
    }

    /**
     * Calculate average duration between two status changes
     */
    private async calculateAvgDuration(
        sellerId: string,
        periodStart: Date,
        periodEnd: Date,
        fromStatus: string,
        toStatus: string
    ): Promise<number> {
        try {
            // Get orders in period
            const ordersList = await db
                .select({ id: orders.id })
                .from(orders)
                .where(
                    and(
                        eq(orders.sellerId, sellerId),
                        gte(orders.createdAt, periodStart),
                        lte(orders.createdAt, periodEnd)
                    )
                );

            if (ordersList.length === 0) return 0;

            const orderIds = ordersList.map(o => o.id);
            const durations: number[] = [];

            // For each order, find the time between status changes
            for (const orderId of orderIds) {
                const events = await db
                    .select()
                    .from(orderEvents)
                    .where(eq(orderEvents.orderId, orderId))
                    .orderBy(orderEvents.timestamp);

                const fromEvent = events.find(e =>
                    e.eventType?.toLowerCase().includes(fromStatus.toLowerCase())
                );
                const toEvent = events.find(e =>
                    e.eventType?.toLowerCase().includes(toStatus.toLowerCase())
                );

                if (fromEvent && toEvent && fromEvent.timestamp && toEvent.timestamp) {
                    const durationMs = toEvent.timestamp.getTime() - fromEvent.timestamp.getTime();
                    const durationHours = durationMs / (1000 * 60 * 60);
                    durations.push(durationHours);
                }
            }

            if (durations.length === 0) return 0;

            const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
            return Math.round(avgDuration * 100) / 100;
        } catch (error) {
            safeLogger.error('Error calculating avg duration:', error);
            return 0;
        }
    }

    /**
     * Calculate on-time delivery rate
     */
    private async calculateOnTimeRate(
        sellerId: string,
        periodStart: Date,
        periodEnd: Date
    ): Promise<number> {
        try {
            const ordersList = await db
                .select()
                .from(orders)
                .where(
                    and(
                        eq(orders.sellerId, sellerId),
                        gte(orders.createdAt, periodStart),
                        lte(orders.createdAt, periodEnd),
                        eq(orders.status, 'delivered')
                    )
                );

            if (ordersList.length === 0) return 100; // Default to 100% if no delivered orders

            let onTimeCount = 0;
            for (const order of ordersList) {
                if (order.estimatedDelivery && order.actualDelivery) {
                    if (order.actualDelivery <= order.estimatedDelivery) {
                        onTimeCount++;
                    }
                } else {
                    // If no estimated delivery, assume on-time
                    onTimeCount++;
                }
            }

            return Math.round((onTimeCount / ordersList.length) * 100);
        } catch (error) {
            safeLogger.error('Error calculating on-time rate:', error);
            return 0;
        }
    }

    /**
     * Get performance trends over time
     */
    async getPerformanceTrends(
        sellerId: string,
        periodDays: number = 90,
        intervalDays: number = 7
    ): Promise<PerformanceTrend[]> {
        try {
            const trends: PerformanceTrend[] = [];
            const endDate = new Date();

            for (let i = 0; i < periodDays; i += intervalDays) {
                const periodEnd = new Date(endDate);
                periodEnd.setDate(periodEnd.getDate() - i);

                const periodStart = new Date(periodEnd);
                periodStart.setDate(periodStart.getDate() - intervalDays);

                const metrics = await this.calculateMetrics(sellerId, periodStart, periodEnd);

                trends.push({
                    period: periodStart.toISOString().split('T')[0],
                    avgTimeToShip: metrics.avgTimeToShipHours,
                    avgDeliveryTime: metrics.avgDeliveryTimeHours,
                    onTimeRate: metrics.onTimeRate,
                    orderCount: metrics.totalOrders
                });
            }

            return trends.reverse(); // Oldest to newest
        } catch (error) {
            safeLogger.error('Error getting performance trends:', error);
            throw error;
        }
    }

    /**
     * Compare seller performance to platform average
     */
    async compareToAverage(sellerId: string, periodDays: number = 30): Promise<{
        seller: FulfillmentMetrics;
        platform: FulfillmentMetrics;
        comparison: {
            timeToShipDiff: number;
            deliveryTimeDiff: number;
            onTimeRateDiff: number;
        };
    }> {
        try {
            const periodStart = new Date();
            periodStart.setDate(periodStart.getDate() - periodDays);
            const periodEnd = new Date();

            // Get seller metrics
            const sellerMetrics = await this.getSellerMetrics(sellerId, periodDays);

            // Calculate platform average (all sellers)
            const allSellers = await db.select({ id: users.id }).from(users);
            const platformMetrics: FulfillmentMetrics[] = [];

            for (const seller of allSellers.slice(0, 100)) { // Limit to 100 for performance
                const metrics = await this.calculateMetrics(seller.id, periodStart, periodEnd);
                if (metrics.totalOrders > 0) {
                    platformMetrics.push(metrics);
                }
            }

            const platformAvg: FulfillmentMetrics = {
                avgTimeToShipHours: this.average(platformMetrics.map(m => m.avgTimeToShipHours)),
                avgDeliveryTimeHours: this.average(platformMetrics.map(m => m.avgDeliveryTimeHours)),
                onTimeRate: this.average(platformMetrics.map(m => m.onTimeRate)),
                fulfillmentRate: this.average(platformMetrics.map(m => m.fulfillmentRate)),
                exceptionRate: this.average(platformMetrics.map(m => m.exceptionRate)),
                totalOrders: platformMetrics.reduce((sum, m) => sum + m.totalOrders, 0),
                completedOrders: platformMetrics.reduce((sum, m) => sum + m.completedOrders, 0),
                disputedOrders: platformMetrics.reduce((sum, m) => sum + m.disputedOrders, 0),
                cancelledOrders: platformMetrics.reduce((sum, m) => sum + m.cancelledOrders, 0),
                ordersByStatus: []
            };

            return {
                seller: sellerMetrics,
                platform: platformAvg,
                comparison: {
                    timeToShipDiff: sellerMetrics.avgTimeToShipHours - platformAvg.avgTimeToShipHours,
                    deliveryTimeDiff: sellerMetrics.avgDeliveryTimeHours - platformAvg.avgDeliveryTimeHours,
                    onTimeRateDiff: sellerMetrics.onTimeRate - platformAvg.onTimeRate
                }
            };
        } catch (error) {
            safeLogger.error('Error comparing to average:', error);
            throw error;
        }
    }

    /**
     * Cache metrics for performance
     */
    private async cacheMetrics(
        sellerId: string,
        periodStart: Date,
        periodEnd: Date,
        metrics: FulfillmentMetrics
    ): Promise<void> {
        try {
            await db
                .insert(fulfillmentMetrics)
                .values({
                    sellerId,
                    periodStart,
                    periodEnd,
                    avgTimeToShipHours: metrics.avgTimeToShipHours.toString(),
                    avgDeliveryTimeHours: metrics.avgDeliveryTimeHours.toString(),
                    onTimeRate: metrics.onTimeRate.toString(),
                    fulfillmentRate: metrics.fulfillmentRate.toString(),
                    exceptionRate: metrics.exceptionRate.toString(),
                    totalOrders: metrics.totalOrders,
                    completedOrders: metrics.completedOrders,
                    disputedOrders: metrics.disputedOrders,
                    cancelledOrders: metrics.cancelledOrders,
                    metadata: JSON.stringify({ ordersByStatus: metrics.ordersByStatus })
                })
                .onConflictDoUpdate({
                    target: [fulfillmentMetrics.sellerId, fulfillmentMetrics.periodStart, fulfillmentMetrics.periodEnd],
                    set: {
                        avgTimeToShipHours: metrics.avgTimeToShipHours.toString(),
                        avgDeliveryTimeHours: metrics.avgDeliveryTimeHours.toString(),
                        onTimeRate: metrics.onTimeRate.toString(),
                        fulfillmentRate: metrics.fulfillmentRate.toString(),
                        exceptionRate: metrics.exceptionRate.toString(),
                        totalOrders: metrics.totalOrders,
                        completedOrders: metrics.completedOrders,
                        disputedOrders: metrics.disputedOrders,
                        cancelledOrders: metrics.cancelledOrders,
                        metadata: JSON.stringify({ ordersByStatus: metrics.ordersByStatus }),
                        updatedAt: new Date()
                    }
                });
        } catch (error) {
            safeLogger.error('Error caching metrics:', error);
            // Don't throw - caching is optional
        }
    }

    /**
     * Get cached metrics if available and fresh
     */
    private async getCachedMetrics(
        sellerId: string,
        periodStart: Date,
        periodEnd: Date
    ): Promise<FulfillmentMetrics | null> {
        try {
            const cached = await db
                .select()
                .from(fulfillmentMetrics)
                .where(
                    and(
                        eq(fulfillmentMetrics.sellerId, sellerId),
                        eq(fulfillmentMetrics.periodStart, periodStart),
                        eq(fulfillmentMetrics.periodEnd, periodEnd)
                    )
                )
                .limit(1);

            if (cached.length === 0) return null;

            const c = cached[0];

            // Check if cache is fresh (< 1 hour old)
            const cacheAge = Date.now() - (c.updatedAt?.getTime() || 0);
            if (cacheAge > 60 * 60 * 1000) return null;

            const metadata = c.metadata ? JSON.parse(c.metadata as string) : {};

            return {
                avgTimeToShipHours: parseFloat(c.avgTimeToShipHours || '0'),
                avgDeliveryTimeHours: parseFloat(c.avgDeliveryTimeHours || '0'),
                onTimeRate: parseFloat(c.onTimeRate || '0'),
                fulfillmentRate: parseFloat(c.fulfillmentRate || '0'),
                exceptionRate: parseFloat(c.exceptionRate || '0'),
                totalOrders: c.totalOrders || 0,
                completedOrders: c.completedOrders || 0,
                disputedOrders: c.disputedOrders || 0,
                cancelledOrders: c.cancelledOrders || 0,
                ordersByStatus: metadata.ordersByStatus || []
            };
        } catch (error) {
            safeLogger.error('Error getting cached metrics:', error);
            return null;
        }
    }

    private getEmptyMetrics(): FulfillmentMetrics {
        return {
            avgTimeToShipHours: 0,
            avgDeliveryTimeHours: 0,
            onTimeRate: 100,
            fulfillmentRate: 0,
            exceptionRate: 0,
            totalOrders: 0,
            completedOrders: 0,
            disputedOrders: 0,
            cancelledOrders: 0,
            ordersByStatus: []
        };
    }

    private average(numbers: number[]): number {
        if (numbers.length === 0) return 0;
        return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    }
}

export const fulfillmentMetricsService = new FulfillmentMetricsService();

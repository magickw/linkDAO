
import { db } from '../db';
import { orders, trackingRecords, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { NotificationService } from './notificationService';

export interface IDeliveryEstimateService {
    calculateInitialEstimate(sellerId: string, method: string, destination: any): Promise<{ minDate: Date, maxDate: Date }>;
    updateEstimateFromCarrier(orderId: string, trackingInfo: any): Promise<void>;
    recalculateOnDelay(orderId: string, delayReason: string): Promise<void>;
}

export class DeliveryEstimateService implements IDeliveryEstimateService {
    private notificationService: NotificationService;

    constructor() {
        this.notificationService = new NotificationService();
    }

    /**
     * Calculate initial delivery estimate based on seller processing time + shipping method
     * Requirement 13.2
     */
    async calculateInitialEstimate(sellerId: string, method: string, destination: any): Promise<{ minDate: Date, maxDate: Date }> {
        try {
            // 1. Get Seller Processing Time (Requirement 13.8)
            // Ideally fetch from seller profile or historical average. Defaults to 2.
            const processingDays = await this.getSellerProcessingTime(sellerId);

            // 2. Get Shipping Method Transit Time
            // In a real system, this would come from a rates lookup or carrier standards.
            let transitDaysMin = 3;
            let transitDaysMax = 5;

            const normalizedMethod = method.toLowerCase();
            if (normalizedMethod.includes('express') || normalizedMethod.includes('priority') || normalizedMethod.includes('next day')) {
                transitDaysMin = 1;
                transitDaysMax = 3;
            } else if (normalizedMethod.includes('standard') || normalizedMethod.includes('ground')) {
                transitDaysMin = 3;
                transitDaysMax = 7;
            } else if (normalizedMethod.includes('international')) {
                transitDaysMin = 7;
                transitDaysMax = 21;
            }

            // 3. Calculate Dates
            const now = new Date();
            const minDate = new Date(now);
            minDate.setDate(now.getDate() + processingDays + transitDaysMin);

            const maxDate = new Date(now);
            maxDate.setDate(now.getDate() + processingDays + transitDaysMax);

            return { minDate, maxDate };
        } catch (error) {
            safeLogger.error('Error calculating initial estimate:', error);
            // Fallback
            const now = new Date();
            const fallback = new Date(now);
            fallback.setDate(now.getDate() + 7);
            return { minDate: fallback, maxDate: fallback };
        }
    }

    /**
     * Update estimate when carrier provides explicit date
     * Requirement 13.3
     */
    async updateEstimateFromCarrier(orderId: string, trackingInfo: any): Promise<void> {
        try {
            // Check for Imminent Delivery (Requirement 13.6)
            if (trackingInfo.status?.toUpperCase() === 'OUT_FOR_DELIVERY') {
                await this.notifyImminentDelivery(orderId);
            }

            if (!trackingInfo.estimatedDelivery) return;

            const newEstimate = new Date(trackingInfo.estimatedDelivery);
            if (isNaN(newEstimate.getTime())) return;

            // Update in DB
            await db.update(orders).set({
                estimatedDeliveryMin: newEstimate,
                estimatedDeliveryMax: newEstimate, // Carrier gives single point estimate usually
                estimatedDelivery: newEstimate // Legacy field
            }).where(eq(orders.id, orderId));

            // Check for significant change (Requirement 13.7)
            await this.checkSignificantChange(orderId, newEstimate);

        } catch (error) {
            safeLogger.error('Error updating estimate from carrier:', error);
        }
    }

    /**
     * Recalculate on delay (exception)
     * Requirement 13.4
     */
    async recalculateOnDelay(orderId: string, delayReason: string): Promise<void> {
        try {
            safeLogger.info(`Recalculating estimate for ${orderId} due to ${delayReason}`);

            // Fetch current order to get current max date
            const order = await db.select().from(orders).where(eq(orders.id, orderId)).then(rows => rows[0]);
            if (!order || !order.estimatedDeliveryMax) return;

            // Add 3 days buffer for unknown delays
            const newMax = new Date(order.estimatedDeliveryMax);
            newMax.setDate(newMax.getDate() + 3);

            const newMin = new Date(order.estimatedDeliveryMin || order.estimatedDeliveryMax);
            newMin.setDate(newMin.getDate() + 3);

            // Update DB
            await db.update(orders).set({
                estimatedDeliveryMin: newMin,
                estimatedDeliveryMax: newMax,
                estimatedDelivery: newMax // Update unified field too
            }).where(eq(orders.id, orderId));

            // Notify user about delay
            if (order.buyerId) {
                await this.notificationService.enqueueNotification({
                    userId: order.buyerId,
                    type: 'ORDER_UPDATE',
                    title: 'Delivery Delayed',
                    message: `Your order delivery has been delayed: ${delayReason}. New estimate: ${newMax.toDateString()}`,
                    data: { orderId }
                });
            }

        } catch (error) {
            safeLogger.error('Error recalculating on delay:', error);
        }
    }

    /**
     * Check for significant change in delivery date (> 2 days)
     * Requirement 13.7
     */
    private async checkSignificantChange(orderId: string, newDate: Date) {
        try {
            const order = await db.select().from(orders).where(eq(orders.id, orderId)).then(rows => rows[0]);
            if (!order || !order.estimatedDelivery) return;

            const oldDate = new Date(order.estimatedDelivery);
            const diffTime = Math.abs(newDate.getTime() - oldDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 2) {
                if (order.buyerId) {
                    await this.notificationService.enqueueNotification({
                        userId: order.buyerId,
                        type: 'ORDER_UPDATE',
                        title: 'Delivery Update',
                        message: `Your order delivery estimate has changed significanty to ${newDate.toDateString()}`,
                        data: { orderId }
                    });
                }
            }
        } catch (e) {
            safeLogger.error('Error checking significant change', e);
        }
    }

    private async notifyImminentDelivery(orderId: string) {
        try {
            const order = await db.select().from(orders).where(eq(orders.id, orderId)).then(rows => rows[0]);
            if (order && order.buyerId) {
                await this.notificationService.enqueueNotification({
                    userId: order.buyerId,
                    type: 'ORDER_UPDATE',
                    title: 'Out for Delivery',
                    message: 'Your order is out for delivery and should arrive today!',
                    data: { orderId }
                });
            }
        } catch (e) {
            safeLogger.error('Error notifying imminent delivery', e);
        }
    }

    private async getSellerProcessingTime(sellerId: string): Promise<number> {
        // Mock implementation for Requirement 13.8
        // In future: db.select().from(users).where...
        return 2;
    }
}

export const deliveryEstimateService = new DeliveryEstimateService();

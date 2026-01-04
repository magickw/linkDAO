import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';

export interface DeliveryEstimate {
    minDate: Date;
    maxDate: Date;
    confidence: 'high' | 'medium' | 'low';
    factors: string[]; // e.g., "Holiday season", "Weather delay"
}

export class DeliveryEstimateService {
    private databaseService: DatabaseService;

    constructor() {
        this.databaseService = new DatabaseService();
    }

    /**
     * Calculate initial delivery estimate based on seller and shipping method
     */
    async calculateInitialEstimate(
        sellerId: string,
        shippingMethodId: string,
        destinationZip: string
    ): Promise<DeliveryEstimate> {
        try {
            // Logic:
            // 1. Get seller's average handling time
            // 2. Get shipping method's average transit time to zone
            // 3. Add buffer based on factors (weekend, holiday)

            const handlingTimeDays = 2; // Mock avg
            const transitTimeDays = 4; // Mock avg

            const today = new Date();
            const minDays = handlingTimeDays + transitTimeDays;
            const maxDays = minDays + 2;

            const minDate = new Date(today);
            minDate.setDate(today.getDate() + minDays);

            const maxDate = new Date(today);
            maxDate.setDate(today.getDate() + maxDays);

            return {
                minDate,
                maxDate,
                confidence: 'medium',
                factors: ['Standard Transit']
            };
        } catch (error) {
            safeLogger.error('Error calculating estimate:', error);
            // Return fallback
            const today = new Date();
            const fallback = new Date(today);
            fallback.setDate(today.getDate() + 7);
            return {
                minDate: fallback,
                maxDate: fallback,
                confidence: 'low',
                factors: ['Fallback Estimate']
            };
        }
    }

    /**
     * Update estimate based on tracking event
     */
    async updateEstimateFromTracking(orderId: string, trackingEvent: any): Promise<void> {
        try {
            // If carrier provides new ETA, update DB
            if (trackingEvent.estimated_delivery) {
                const newEta = new Date(trackingEvent.estimated_delivery);

                // Update Order model
                await this.databaseService.updateOrder(orderId, {
                    estimatedDeliveryMin: newEta, // Using single date for now if carrier specific
                    estimatedDeliveryMax: newEta
                });

                safeLogger.info(`Updated delivery estimate for order ${orderId} to ${newEta}`);
            }
        } catch (error) {
            safeLogger.error('Error updating estimate from tracking:', error);
        }
    }
}

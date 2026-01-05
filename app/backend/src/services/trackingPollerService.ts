import cron from 'node-cron';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { trackingRecords, orders } from '../db/schema';
import { eq, and, notInArray, lt } from 'drizzle-orm';
import { ShippingService } from './shippingService';
import { OrderTimelineService } from './orderTimelineService';
import { NotificationService } from './notificationService';
import { OrderStatus } from '../models/Order';
import { OrderService } from './orderService';

export class TrackingPollerService {
    private shippingService: ShippingService;
    private orderTimelineService: OrderTimelineService;
    private notificationService: NotificationService;
    private orderService: OrderService; // Need this to update order status
    private trackingJob: any = null;
    private isProcessing: boolean = false;

    constructor() {
        this.shippingService = new ShippingService();
        this.orderTimelineService = new OrderTimelineService();
        this.notificationService = new NotificationService();
        this.orderService = new OrderService();
    }

    /**
     * Start the tracking poller
     */
    start(): void {
        safeLogger.info('Starting TrackingPollerService...');

        // Run every hour: 0 * * * *
        // Can be adjusted to every 30 mins or configurable
        this.trackingJob = cron.schedule('0 * * * *', async () => {
            await this.processTrackingUpdates();
        });

        safeLogger.info('TrackingPollerService started successfully');
    }

    /**
     * Stop the poller
     */
    stop(): void {
        if (this.trackingJob) {
            this.trackingJob.stop();
            this.trackingJob = null;
        }
    }

    /**
     * Process tracking updates for active shipments
     */
    private async processTrackingUpdates(): Promise<void> {
        if (this.isProcessing) {
            safeLogger.warn('Tracking poller job already running, skipping...');
            return;
        }

        this.isProcessing = true;
        let processedCount = 0;
        let errorCount = 0;

        try {
            safeLogger.info('Running tracking poller job...');

            // Find active tracking records
            // Status IS NOT Delivered, Cancelled, Returned
            // And lastUpdated < 1 hour ago (to avoid constant polling if we just updated? Or strictly poll all active)
            // Ideally we poll all active every hour.

            const activeRecords = await db.select()
                .from(trackingRecords)
                .where(
                    notInArray(trackingRecords.status, ['DELIVERED', 'Delivered', 'CANCELLED', 'Cancelled', 'RETURNED', 'Returned', 'FAILURE', 'Failure'])
                );

            safeLogger.info(`Found ${activeRecords.length} active tracking records to poll.`);

            for (const record of activeRecords) {
                try {
                    // Fetch latest info from carrier
                    const trackingInfo = await this.shippingService.trackShipment(record.trackingNumber, record.carrier);

                    // Check if status changed
                    if (trackingInfo.status !== record.status) {
                        safeLogger.info(`Order ${record.orderId} tracking status changed: ${record.status} -> ${trackingInfo.status}`);

                        // Update tracking record
                        await db.update(trackingRecords)
                            .set({
                                status: trackingInfo.status,
                                trackingData: JSON.stringify(trackingInfo),
                                events: JSON.stringify(trackingInfo.events),
                                lastUpdated: new Date()
                            })
                            .where(eq(trackingRecords.id, record.id));

                        // Sync to timeline
                        if (record.orderId) {
                            await this.orderTimelineService.syncCarrierTracking(record.orderId, trackingInfo);
                        }

                        // Handle Delivery
                        if (trackingInfo.status.toLowerCase().includes('delivered')) {
                            await this.handleDelivery(record.orderId, trackingInfo);
                        }

                        // Handle Exception
                        if (trackingInfo.status.toLowerCase().includes('exception')) {
                            await this.handleException(record.orderId, trackingInfo);
                        }
                    } else {
                        // Just update timestamp
                        await db.update(trackingRecords)
                            .set({ lastUpdated: new Date() })
                            .where(eq(trackingRecords.id, record.id));
                    }
                    processedCount++;
                } catch (err) {
                    safeLogger.error(`Error processing tracking record ${record.id} (${record.trackingNumber}):`, err);
                    errorCount++;
                }
            }

            safeLogger.info(`Tracking poller job completed. Processed ${processedCount}, Errors ${errorCount}.`);

        } catch (error) {
            safeLogger.error('Error in tracking poller job:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Handle delivery confirmation
     */
    private async handleDelivery(orderId: string | null, trackingInfo: any): Promise<void> {
        if (!orderId) return;

        try {
            // Update order status
            await this.orderService.updateOrderStatus(orderId, OrderStatus.DELIVERED);

            // Notify buyer
            const order = await this.orderService.getOrderById(orderId);
            if (order) {
                await this.notificationService.notifyOrderStatusChange(order.buyerWalletAddress, orderId, OrderStatus.DELIVERED);
                // Maybe notify seller too?
                await this.notificationService.notifyOrderStatusChange(order.sellerWalletAddress, orderId, OrderStatus.DELIVERED);
            }
        } catch (error) {
            safeLogger.error(`Error handling delivery for order ${orderId}:`, error);
        }
    }

    /**
     * Handle delivery exception
     */
    private async handleException(orderId: string | null, trackingInfo: any): Promise<void> {
        if (!orderId) return;

        try {
            const order = await this.orderService.getOrderById(orderId);
            if (order) {
                // Notify seller about exception
                await this.notificationService.enqueueNotification({
                    userId: order.sellerId, // or lookup user by wallet
                    type: 'ORDER_UPDATE',
                    title: 'Delivery Exception',
                    message: `There is an exception with the delivery for Order #${orderId}: ${trackingInfo.status}`,
                    data: { orderId, trackingInfo },
                    priority: 'high'
                });
            }
        } catch (error) {
            safeLogger.error(`Error handling exception for order ${orderId}:`, error);
        }
    }
}

export const trackingPollerService = new TrackingPollerService();

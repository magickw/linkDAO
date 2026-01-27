import EasyPost from '@easypost/api';
import { db } from '../../db';
import { orders, shippingLabels } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';
import { orderAutomationService } from './orderAutomationService';

// Initialize with env key or fallback to prevent startup crash
const easypostApiKey = process.env.EASYPOST_API_KEY || 'TEST_KEY_PLACEHOLDER';
const easypost = new EasyPost(easypostApiKey);

export interface Address {
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

class ShippingIntegrationService {
    /**
     * Get shipping rates for an order
     */
    async getRates(
        fromAddress: Address,
        toAddress: Address,
        parcel: Parcel
    ): Promise<ShippingRate[]> {
        try {
            const shipment = await easypost.Shipment.create({
                to_address: this.formatAddress(toAddress),
                from_address: this.formatAddress(fromAddress),
                parcel: {
                    length: parcel.length,
                    width: parcel.width,
                    height: parcel.height,
                    weight: parcel.weight
                }
            });

            const rates = shipment.rates?.map((rate: any) => ({
                id: rate.id,
                carrier: rate.carrier,
                service: rate.service,
                rate: rate.rate,
                currency: rate.currency,
                deliveryDays: rate.delivery_days || 0,
                deliveryDate: rate.delivery_date || ''
            })) || [];

            return rates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
        } catch (error) {
            safeLogger.error('Error getting shipping rates:', error);
            throw new Error('Failed to get shipping rates');
        }
    }

    /**
     * Purchase shipping label
     */
    async purchaseLabel(
        orderId: string,
        rateId: string
    ): Promise<ShippingLabel> {
        try {
            // Get the shipment
            const shipment = await easypost.Shipment.retrieve(rateId.split('_')[0]);

            // Buy the label
            const boughtShipment = await easypost.Shipment.buy(shipment.id, {
                rate: { id: rateId }
            });

            // Store in database
            await db.insert(shippingLabels).values({
                orderId,
                easypostShipmentId: boughtShipment.id,
                easypostTrackerId: boughtShipment.tracker?.id || null,
                trackingNumber: boughtShipment.tracking_code || '',
                carrier: boughtShipment.selected_rate?.carrier || '',
                service: boughtShipment.selected_rate?.service || '',
                labelUrl: boughtShipment.postage_label?.label_url || '',
                trackingUrl: boughtShipment.tracker?.public_url || '',
                postageLabelPdfUrl: boughtShipment.postage_label?.label_pdf_url || '',
                rateAmount: boughtShipment.selected_rate?.rate || '0',
                rateCurrency: boughtShipment.selected_rate?.currency || 'USD',
                status: 'purchased',
                fromAddress: JSON.stringify(boughtShipment.from_address),
                toAddress: JSON.stringify(boughtShipment.to_address),
                parcelInfo: JSON.stringify(boughtShipment.parcel),
                purchasedAt: new Date()
            });

            // Update order with tracking info
            await db.update(orders)
                .set({
                    trackingNumber: boughtShipment.tracking_code as any as string,
                    trackingCarrier: boughtShipment.selected_rate?.carrier,
                    status: 'shipped'
                })
                .where(eq(orders.id, orderId));

            // Trigger automation (will progress to SHIPPED status)
            await orderAutomationService.processOrder(orderId);

            return {
                id: boughtShipment.id,
                trackingNumber: boughtShipment.tracking_code || '',
                trackingUrl: boughtShipment.tracker?.public_url || '',
                labelUrl: boughtShipment.postage_label?.label_url || '',
                carrier: boughtShipment.selected_rate?.carrier || '',
                service: boughtShipment.selected_rate?.service || '',
                rate: boughtShipment.selected_rate?.rate || '0'
            };
        } catch (error) {
            safeLogger.error('Error purchasing shipping label:', error);
            throw new Error('Failed to purchase shipping label');
        }
    }

    /**
     * Get tracking information
     */
    async getTracking(trackingNumber: string, carrier?: string): Promise<any> {
        try {
            let tracker;

            if (carrier) {
                // Create tracker if we have carrier info
                tracker = await easypost.Tracker.create({
                    tracking_code: trackingNumber,
                    carrier: carrier.toLowerCase()
                });
            } else {
                // Try to retrieve existing tracker
                const trackers = await easypost.Tracker.all({ tracking_code: trackingNumber });
                tracker = trackers.trackers?.[0];
            }

            if (!tracker) {
                throw new Error('Tracking information not found');
            }

            return {
                trackingNumber: tracker.tracking_code,
                carrier: tracker.carrier,
                status: tracker.status,
                estimatedDelivery: tracker.est_delivery_date,
                publicUrl: tracker.public_url,
                events: tracker.tracking_details?.map((event: any) => ({
                    status: event.status,
                    message: event.message,
                    location: `${event.tracking_location?.city || ''}, ${event.tracking_location?.state || ''}`,
                    timestamp: event.datetime
                })) || []
            };
        } catch (error) {
            safeLogger.error('Error getting tracking info:', error);
            throw new Error('Failed to get tracking information');
        }
    }

    /**
     * Handle EasyPost webhook
     */
    async handleWebhook(webhookData: any): Promise<void> {
        try {
            const { description, result } = webhookData;

            if (description === 'tracker.updated') {
                await this.handleTrackerUpdate(result);
            } else if (description === 'batch.updated') {
                // Handle batch updates if needed
                safeLogger.info('Batch update received:', result);
            }
        } catch (error) {
            safeLogger.error('Error handling webhook:', error);
        }
    }

    /**
     * Handle tracker update from webhook
     */
    private async handleTrackerUpdate(tracker: any): Promise<void> {
        try {
            const trackingNumber = tracker.tracking_code;

            // Find order with this tracking number
            const orderResult = await db
                .select()
                .from(orders)
                .where(eq(orders.trackingNumber, trackingNumber))
                .limit(1);

            if (orderResult.length === 0) {
                safeLogger.warn(`No order found for tracking number: ${trackingNumber}`);
                return;
            }

            const order = orderResult[0];

            // Update shipping label with tracking events
            await db.update(shippingLabels)
                .set({
                    trackingEvents: JSON.stringify(tracker.tracking_details),
                    status: tracker.status,
                    lastTrackingUpdate: new Date()
                })
                .where(eq(shippingLabels.trackingNumber, trackingNumber));

            // If delivered, update order
            if (tracker.status === 'delivered') {
                await db.update(orders)
                    .set({
                        status: 'delivered',
                        actualDelivery: new Date()
                    })
                    .where(eq(orders.id, order.id));

                await db.update(shippingLabels)
                    .set({
                        deliveredAt: new Date()
                    })
                    .where(eq(shippingLabels.trackingNumber, trackingNumber));

                // Trigger automation (will schedule auto-completion)
                await orderAutomationService.processOrder(order.id);
            }

            safeLogger.info(`Updated tracking for order ${order.id}: ${tracker.status}`);
        } catch (error) {
            safeLogger.error('Error handling tracker update:', error);
        }
    }

    /**
     * Get label for an order
     */
    async getLabelForOrder(orderId: string): Promise<any> {
        try {
            const labelResult = await db
                .select()
                .from(shippingLabels)
                .where(eq(shippingLabels.orderId, orderId))
                .limit(1);

            if (labelResult.length === 0) {
                return null;
            }

            const label = labelResult[0];
            return {
                id: label.id,
                trackingNumber: label.trackingNumber,
                trackingUrl: label.trackingUrl,
                labelUrl: label.labelUrl,
                postageLabelPdfUrl: label.postageLabelPdfUrl,
                carrier: label.carrier,
                service: label.service,
                rate: label.rateAmount,
                status: label.status,
                purchasedAt: label.purchasedAt,
                deliveredAt: label.deliveredAt
            };
        } catch (error) {
            safeLogger.error('Error getting label for order:', error);
            return null;
        }
    }

    /**
     * Validate address
     */
    async validateAddress(address: Address): Promise<{ valid: boolean; suggestions?: Address[] }> {
        try {
            const verifiedAddress = await easypost.Address.createAndVerify(
                this.formatAddress(address)
            );

            return {
                valid: true,
                suggestions: verifiedAddress.verifications?.delivery?.success ? [] : [
                    this.parseAddress(verifiedAddress)
                ]
            };
        } catch (error: any) {
            if (error.message?.includes('Unable to verify address')) {
                return {
                    valid: false,
                    suggestions: []
                };
            }
            throw error;
        }
    }

    /**
     * Format address for EasyPost
     */
    private formatAddress(address: Address): any {
        return {
            name: address.name,
            street1: address.street1,
            street2: address.street2 || undefined,
            city: address.city,
            state: address.state,
            zip: address.zip,
            country: address.country,
            phone: address.phone || undefined,
            email: address.email || undefined
        };
    }

    /**
     * Parse EasyPost address to our format
     */
    private parseAddress(easypostAddress: any): Address {
        return {
            name: easypostAddress.name,
            street1: easypostAddress.street1,
            street2: easypostAddress.street2,
            city: easypostAddress.city,
            state: easypostAddress.state,
            zip: easypostAddress.zip,
            country: easypostAddress.country,
            phone: easypostAddress.phone,
            email: easypostAddress.email
        };
    }
}

export const shippingIntegrationService = new ShippingIntegrationService();

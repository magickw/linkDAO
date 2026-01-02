import { safeLogger } from '../utils/safeLogger';

export interface ShipmentDetails {
    addressFrom: any;
    addressTo: any;
    parcels: any[];
    carrier?: string;
}

export interface TrackingEvent {
    status: string;
    substatus?: string;
    description: string;
    timestamp: string;
    location?: string;
}

export interface TrackingInfo {
    trackingNumber: string;
    carrier: string;
    status: 'UNKNOWN' | 'PRE_TRANSIT' | 'TRANSIT' | 'DELIVERED' | 'RETURNED' | 'FAILURE';
    estimatedDelivery?: string;
    events: TrackingEvent[];
}

export class ShippingProviderService {
    /**
     * Simulate generating a shipping label
     */
    async createShipment(details: ShipmentDetails): Promise<{
        shipmentId: string;
        labelUrl: string;
        trackingNumber: string;
        carrier: string;
        rate: number;
        currency: string;
    }> {
        safeLogger.info('Mock: Creating shipment', details);

        // Simulate API latency
        await new Promise(resolve => setTimeout(resolve, 800));

        const carrier = details.carrier || 'mock-carrier';
        const trackingNumber = `MOCK-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;

        return {
            shipmentId: `shp_${Date.now()}`,
            labelUrl: `https://example.com/labels/${trackingNumber}.pdf`,
            trackingNumber,
            carrier,
            rate: 12.50,
            currency: 'USD'
        };
    }

    /**
     * Simulate fetching real-time tracking info
     */
    async getTrackingStatus(trackingNumber: string, carrier: string): Promise<TrackingInfo> {
        safeLogger.info(`Mock: Fetching tracking for ${carrier} - ${trackingNumber}`);

        // Simulate API latency
        await new Promise(resolve => setTimeout(resolve, 500));

        // Deterministic mock data based on tracking number
        const isDelivered = trackingNumber.includes('8') || trackingNumber.toLowerCase().includes('del');
        const isError = trackingNumber.toLowerCase().includes('err');

        if (isError) {
            return {
                trackingNumber,
                carrier,
                status: 'FAILURE',
                events: []
            };
        }

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        const events: TrackingEvent[] = [
            {
                status: 'PRE_TRANSIT',
                description: 'Shipping label created, awaiting carrier pickup',
                timestamp: twoDaysAgo.toISOString(),
                location: 'Seller Warehouse, CA'
            },
            {
                status: 'TRANSIT',
                description: 'Picked up by carrier',
                timestamp: twoDaysAgo.toISOString(),
                location: 'Seller Warehouse, CA'
            },
            {
                status: 'TRANSIT',
                description: 'Arrived at sorting facility',
                timestamp: yesterday.toISOString(),
                location: 'Los Angeles, CA'
            }
        ];

        if (isDelivered) {
            events.push({
                status: 'TRANSIT',
                description: 'Out for delivery',
                timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
                location: 'New York, NY'
            });
            events.push({
                status: 'DELIVERED',
                description: 'Delivered to front porch',
                timestamp: now.toISOString(),
                location: 'New York, NY'
            });
        }

        return {
            trackingNumber,
            carrier,
            status: isDelivered ? 'DELIVERED' : 'TRANSIT',
            estimatedDelivery: isDelivered ? now.toISOString() : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            events: events.reverse() // Most recent first
        };
    }
}

export const shippingProviderService = new ShippingProviderService();

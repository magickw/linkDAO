import axios from 'axios';
import type {
    ShippingRate,
    ShippingLabel,
    ShippingAddress,
    Parcel,
    TrackingInfo
} from '../types/fulfillment';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

// Create axios instance with auth
const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

class ShippingService {
    /**
     * Get shipping rates for an order
     */
    async getRates(
        fromAddress: ShippingAddress,
        toAddress: ShippingAddress,
        parcel: Parcel
    ): Promise<ShippingRate[]> {
        const response = await axios.post<{ data: ShippingRate[] }>(
            `${API_BASE}/api/shipping/rates`,
            { fromAddress, toAddress, parcel },
            { headers: getAuthHeaders() }
        );
        return response.data.data;
    }

    /**
     * Purchase shipping label
     */
    async purchaseLabel(orderId: string, rateId: string): Promise<ShippingLabel> {
        const response = await axios.post<{ data: ShippingLabel }>(
            `${API_BASE}/api/shipping/labels`,
            { orderId, rateId },
            { headers: getAuthHeaders() }
        );
        return response.data.data;
    }

    /**
     * Get shipping label for an order
     */
    async getLabel(orderId: string): Promise<ShippingLabel | null> {
        try {
            const response = await axios.get<{ data: ShippingLabel }>(
                `${API_BASE}/api/shipping/labels/${orderId}`,
                { headers: getAuthHeaders() }
            );
            return response.data.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Get tracking information
     */
    async getTracking(trackingNumber: string, carrier?: string): Promise<TrackingInfo> {
        const response = await axios.get<{ data: TrackingInfo }>(
            `${API_BASE}/api/shipping/track/${trackingNumber}`,
            { params: { carrier }, headers: getAuthHeaders() }
        );
        return response.data.data;
    }

    /**
     * Validate an address
     */
    async validateAddress(address: ShippingAddress): Promise<{
        valid: boolean;
        suggestions?: ShippingAddress[];
    }> {
        const response = await axios.post<{ data: { valid: boolean; suggestions?: ShippingAddress[] } }>(
            `${API_BASE}/api/shipping/validate-address`,
            { address },
            { headers: getAuthHeaders() }
        );
        return response.data.data;
    }

    /**
     * Download shipping label PDF
     */
    async downloadLabel(labelUrl: string): Promise<void> {
        // Open in new tab for download
        window.open(labelUrl, '_blank');
    }

    /**
     * Print shipping label
     */
    async printLabel(labelUrl: string): Promise<void> {
        const printWindow = window.open(labelUrl, '_blank');
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    }
}

export const shippingService = new ShippingService();

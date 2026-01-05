import { enhancedAuthService } from './enhancedAuthService';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? (window.location.hostname === 'localhost' ? 'http://localhost:10000' : 'https://api.linkdao.io') : 'http://localhost:10000');
const SELLER_WORKFLOW_API_BASE = `${API_BASE_URL}/api/seller/orders`;

export interface IWorkflowOrder {
    id: string;
    buyerId: string;
    totalAmount: number;
    status: 'PENDING' | 'PAID' | 'PROCESSING' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
    paymentStatus: string;
    shippingAddress: {
        fullName: string;
        streetAddress: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    items: Array<{
        title: string;
        quantity: number;
        price: number;
    }>;
    createdAt: string;
}

export interface IWorkflowDashboard {
    newOrders: IWorkflowOrder[];
    processingOrders: IWorkflowOrder[];
    readyToShipOrders: IWorkflowOrder[];
    shippedOrders: IWorkflowOrder[];
}

export interface IPackingSlip {
    orderId: string;
    orderDate: string;
    buyerName: string;
    shippingAddress: string;
    items: Array<{
        description: string;
        quantity: number;
    }>;
}

class SellerWorkflowService {
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...await enhancedAuthService.getAuthHeaders(),
        };

        const response = await fetch(`${SELLER_WORKFLOW_API_BASE}${endpoint}`, {
            ...options,
            headers: {
                ...headers,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'An error occurred' }));
            throw new Error(error.message || `Request failed with status ${response.status}`);
        }

        return response.json();
    }

    async getDashboard(): Promise<IWorkflowDashboard> {
        return this.request<IWorkflowDashboard>('/dashboard');
    }

    async startProcessing(orderId: string): Promise<{ success: boolean; message: string }> {
        return this.request<{ success: boolean; message: string }>(`/${orderId}/process`, {
            method: 'POST',
        });
    }

    async markReadyToShip(orderId: string, packageDetails: any): Promise<{ success: boolean; labelUrl: string; trackingNumber: string }> {
        return this.request<{ success: boolean; labelUrl: string; trackingNumber: string }>(`/${orderId}/ready`, {
            method: 'POST',
            body: JSON.stringify(packageDetails),
        });
    }

    async confirmShipment(orderId: string, trackingNumber: string, carrier: string): Promise<{ success: boolean; message: string }> {
        return this.request<{ success: boolean; message: string }>(`/${orderId}/ship`, {
            method: 'POST',
            body: JSON.stringify({ trackingNumber, carrier }),
        });
    }

    async getPackingSlip(orderId: string): Promise<IPackingSlip> {
        return this.request<IPackingSlip>(`/${orderId}/packing-slip`);
    }
}

export const sellerWorkflowService = new SellerWorkflowService();

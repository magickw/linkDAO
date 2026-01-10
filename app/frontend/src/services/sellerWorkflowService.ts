import { enhancedRequestManager } from './enhancedRequestManager';
import { enhancedAuthService } from './enhancedAuthService';
import {
    SellerWorkflowDashboard,
    ShippingLabelResult,
    PackingSlip,
    ServiceDetails,
    ScheduleServiceInput,
    AddDeliverableInput,
    ServiceDeliverable
} from '../types/seller';

const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
// Matches backend route mount: app.use('/api/sellers/workflow', sellerWorkflowRoutes);
const WORKFLOW_API_BASE = `${BACKEND_API_BASE_URL}/api/sellers/workflow`;

class SellerWorkflowService {
    private endpoints = {
        getDashboard: () => `${WORKFLOW_API_BASE}/dashboard`,
        startProcessing: (orderId: string) => `${WORKFLOW_API_BASE}/${orderId}/process`,
        markReadyToShip: (orderId: string) => `${WORKFLOW_API_BASE}/${orderId}/ready`,
        confirmShipment: (orderId: string) => `${WORKFLOW_API_BASE}/${orderId}/ship`,
        getPackingSlip: (orderId: string) => `${WORKFLOW_API_BASE}/${orderId}/packing-slip`,
        // Service endpoints
        scheduleService: (orderId: string) => `${WORKFLOW_API_BASE}/${orderId}/service/schedule`,
        getServiceDetails: (orderId: string) => `${WORKFLOW_API_BASE}/${orderId}/service`,
        addDeliverable: (orderId: string) => `${WORKFLOW_API_BASE}/${orderId}/service/deliverables`,
        removeDeliverable: (orderId: string, deliverableId: string) => `${WORKFLOW_API_BASE}/${orderId}/service/deliverables/${deliverableId}`,
        startService: (orderId: string) => `${WORKFLOW_API_BASE}/${orderId}/service/start`,
        completeService: (orderId: string) => `${WORKFLOW_API_BASE}/${orderId}/service/complete`,
    };

    private async getAuthHeaders(): Promise<Record<string, string>> {
        const headers = await enhancedAuthService.getAuthHeaders();
        const walletAddress = enhancedAuthService.getWalletAddress();
        // Use type assertion to ensure compatibility with Record<string, string>
        const authHeaders = headers as unknown as Record<string, string>;

        if (walletAddress) {
            authHeaders['X-Wallet-Address'] = walletAddress;
        }
        return authHeaders;
    }

    /**
     * Get orders dashboard grouped by status
     */
    async getOrderDashboard(): Promise<SellerWorkflowDashboard> {
        const headers = await this.getAuthHeaders();
        return await enhancedRequestManager.request<SellerWorkflowDashboard>(
            this.endpoints.getDashboard(),
            {
                method: 'GET',
                headers
            }
        );
    }

    /**
     * Start processing an order (transition to PROCESSING)
     */
    async startProcessing(orderId: string): Promise<void> {
        const headers = await this.getAuthHeaders();
        await enhancedRequestManager.request<void>(
            this.endpoints.startProcessing(orderId),
            {
                method: 'POST',
                headers
            }
        );
    }

    /**
     * Mark order as ready to ship and generate label
     */
    async markReadyToShip(orderId: string, packageDetails: any): Promise<ShippingLabelResult> {
        const headers = await this.getAuthHeaders();
        return await enhancedRequestManager.request<ShippingLabelResult>(
            this.endpoints.markReadyToShip(orderId),
            {
                method: 'POST',
                headers,
                body: JSON.stringify(packageDetails)
            }
        );
    }

    /**
     * Confirm shipment and add tracking
     */
    async confirmShipment(orderId: string, trackingNumber: string, carrier: string): Promise<void> {
        const headers = await this.getAuthHeaders();
        await enhancedRequestManager.request<void>(
            this.endpoints.confirmShipment(orderId),
            {
                method: 'POST',
                headers,
                body: JSON.stringify({ trackingNumber, carrier })
            }
        );
    }

    /**
     * Get packing slip data
     */
    async getPackingSlip(orderId: string): Promise<PackingSlip> {
        const headers = await this.getAuthHeaders();
        return await enhancedRequestManager.request<PackingSlip>(
            this.endpoints.getPackingSlip(orderId),
            {
                method: 'GET',
                headers
            }
        );
    }

    // ==================== SERVICE DELIVERY METHODS ====================

    /**
     * Schedule a service delivery
     */
    async scheduleService(orderId: string, schedule: ScheduleServiceInput): Promise<{ success: boolean; scheduledDate: string; scheduledTime: string; timezone: string }> {
        const headers = await this.getAuthHeaders();
        return await enhancedRequestManager.request<{ success: boolean; scheduledDate: string; scheduledTime: string; timezone: string }>(
            this.endpoints.scheduleService(orderId),
            {
                method: 'POST',
                headers,
                body: JSON.stringify(schedule)
            }
        );
    }

    /**
     * Get service details for an order
     */
    async getServiceDetails(orderId: string): Promise<ServiceDetails> {
        const headers = await this.getAuthHeaders();
        return await enhancedRequestManager.request<ServiceDetails>(
            this.endpoints.getServiceDetails(orderId),
            {
                method: 'GET',
                headers
            }
        );
    }

    /**
     * Add a deliverable to a service order
     */
    async addDeliverable(orderId: string, deliverable: AddDeliverableInput): Promise<{ success: boolean; deliverable: ServiceDeliverable; totalDeliverables: number }> {
        const headers = await this.getAuthHeaders();
        return await enhancedRequestManager.request<{ success: boolean; deliverable: ServiceDeliverable; totalDeliverables: number }>(
            this.endpoints.addDeliverable(orderId),
            {
                method: 'POST',
                headers,
                body: JSON.stringify(deliverable)
            }
        );
    }

    /**
     * Remove a deliverable from a service order
     */
    async removeDeliverable(orderId: string, deliverableId: string): Promise<{ success: boolean; remainingDeliverables: number }> {
        const headers = await this.getAuthHeaders();
        return await enhancedRequestManager.request<{ success: boolean; remainingDeliverables: number }>(
            this.endpoints.removeDeliverable(orderId, deliverableId),
            {
                method: 'DELETE',
                headers
            }
        );
    }

    /**
     * Start a service
     */
    async startService(orderId: string): Promise<{ success: boolean; message: string }> {
        const headers = await this.getAuthHeaders();
        return await enhancedRequestManager.request<{ success: boolean; message: string }>(
            this.endpoints.startService(orderId),
            {
                method: 'POST',
                headers
            }
        );
    }

    /**
     * Mark service as complete
     */
    async completeService(orderId: string, completionNotes?: string): Promise<{ success: boolean; completedAt: string }> {
        const headers = await this.getAuthHeaders();
        return await enhancedRequestManager.request<{ success: boolean; completedAt: string }>(
            this.endpoints.completeService(orderId),
            {
                method: 'POST',
                headers,
                body: JSON.stringify({ completionNotes })
            }
        );
    }
}

export const sellerWorkflowService = new SellerWorkflowService();

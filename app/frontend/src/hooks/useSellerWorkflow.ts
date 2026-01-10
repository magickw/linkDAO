import { useState, useEffect, useCallback } from 'react';
import { sellerWorkflowService } from '../services/sellerWorkflowService';
import {
    SellerWorkflowDashboard,
    ShippingLabelResult,
    PackingSlip,
    ServiceDetails,
    ScheduleServiceInput,
    AddDeliverableInput,
    ServiceDeliverable
} from '../types/seller';
import { useToast } from '../context/ToastContext';

export function useSellerWorkflow(isActive: boolean = false) {
    const [dashboardData, setDashboardData] = useState<SellerWorkflowDashboard | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const fetchDashboard = useCallback(async () => {
        if (!isActive) return;

        setLoading(true);
        setError(null);
        try {
            const data = await sellerWorkflowService.getOrderDashboard();
            setDashboardData(data);
        } catch (err: any) {
            console.error('Error fetching seller workflow dashboard:', err);
            setError(err.message || 'Failed to load orders');
            // Don't show toast on initial load error to avoid spamming if user just logged in
        } finally {
            setLoading(false);
        }
    }, [isActive]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const startProcessing = async (orderId: string) => {
        try {
            await sellerWorkflowService.startProcessing(orderId);
            addToast('Order status updated to Processing', 'success');
            fetchDashboard(); // Refresh data
            return true;
        } catch (err: any) {
            addToast(err.message || 'Failed to update order status', 'error');
            return false;
        }
    };

    const markReadyToShip = async (orderId: string, packageDetails: any): Promise<ShippingLabelResult | null> => {
        try {
            const result = await sellerWorkflowService.markReadyToShip(orderId, packageDetails);
            addToast(`Label generated! Tracking: ${result.trackingNumber}`, 'success');
            fetchDashboard();
            return result;
        } catch (err: any) {
            addToast(err.message || 'Failed to generate shipping label', 'error');
            return null;
        }
    };

    const confirmShipment = async (orderId: string, trackingNumber: string, carrier: string) => {
        try {
            await sellerWorkflowService.confirmShipment(orderId, trackingNumber, carrier);
            addToast('Order marked as Shipped', 'success');
            fetchDashboard();
            return true;
        } catch (err: any) {
            addToast(err.message || 'Failed to confirm shipment', 'error');
            return false;
        }
    };

    const getPackingSlip = async (orderId: string): Promise<PackingSlip | null> => {
        try {
            return await sellerWorkflowService.getPackingSlip(orderId);
        } catch (err: any) {
            addToast(err.message || 'Failed to get packing slip', 'error');
            return null;
        }
    };

    // ==================== SERVICE DELIVERY METHODS ====================

    const scheduleService = async (orderId: string, schedule: ScheduleServiceInput): Promise<boolean> => {
        try {
            await sellerWorkflowService.scheduleService(orderId, schedule);
            addToast('Service scheduled successfully', 'success');
            fetchDashboard();
            return true;
        } catch (err: any) {
            addToast(err.message || 'Failed to schedule service', 'error');
            return false;
        }
    };

    const getServiceDetails = async (orderId: string): Promise<ServiceDetails | null> => {
        try {
            return await sellerWorkflowService.getServiceDetails(orderId);
        } catch (err: any) {
            addToast(err.message || 'Failed to get service details', 'error');
            return null;
        }
    };

    const addDeliverable = async (orderId: string, deliverable: AddDeliverableInput): Promise<ServiceDeliverable | null> => {
        try {
            const result = await sellerWorkflowService.addDeliverable(orderId, deliverable);
            addToast('Deliverable added successfully', 'success');
            fetchDashboard();
            return result.deliverable;
        } catch (err: any) {
            addToast(err.message || 'Failed to add deliverable', 'error');
            return null;
        }
    };

    const removeDeliverable = async (orderId: string, deliverableId: string): Promise<boolean> => {
        try {
            await sellerWorkflowService.removeDeliverable(orderId, deliverableId);
            addToast('Deliverable removed', 'success');
            fetchDashboard();
            return true;
        } catch (err: any) {
            addToast(err.message || 'Failed to remove deliverable', 'error');
            return false;
        }
    };

    const startService = async (orderId: string): Promise<boolean> => {
        try {
            await sellerWorkflowService.startService(orderId);
            addToast('Service started', 'success');
            fetchDashboard();
            return true;
        } catch (err: any) {
            addToast(err.message || 'Failed to start service', 'error');
            return false;
        }
    };

    const completeService = async (orderId: string, completionNotes?: string): Promise<boolean> => {
        try {
            await sellerWorkflowService.completeService(orderId, completionNotes);
            addToast('Service marked as complete', 'success');
            fetchDashboard();
            return true;
        } catch (err: any) {
            addToast(err.message || 'Failed to complete service', 'error');
            return false;
        }
    };

    const completeDigitalDelivery = async (orderId: string, deliveryNotes?: string): Promise<boolean> => {
        try {
            await sellerWorkflowService.completeDigitalDelivery(orderId, deliveryNotes);
            addToast('Digital product delivered successfully', 'success');
            fetchDashboard();
            return true;
        } catch (err: any) {
            addToast(err.message || 'Failed to complete digital delivery', 'error');
            return false;
        }
    };

    return {
        dashboardData,
        loading,
        error,
        refresh: fetchDashboard,
        startProcessing,
        markReadyToShip,
        confirmShipment,
        getPackingSlip,
        // Service methods
        scheduleService,
        getServiceDetails,
        addDeliverable,
        removeDeliverable,
        startService,
        completeService,
        // Digital product delivery
        completeDigitalDelivery
    };
}

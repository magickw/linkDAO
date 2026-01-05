import { useState, useEffect, useCallback } from 'react';
import { sellerWorkflowService, IWorkflowDashboard, IWorkflowOrder } from '../services/sellerWorkflowService';
import { useToast } from '../context/ToastContext';

export function useSellerWorkflow(isActive: boolean = false) {
    const [dashboardData, setDashboardData] = useState<IWorkflowDashboard | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const fetchDashboard = useCallback(async () => {
        if (!isActive) return;

        setLoading(true);
        setError(null);
        try {
            const data = await sellerWorkflowService.getDashboard();
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

    const markReadyToShip = async (orderId: string, packageDetails: any) => {
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

    const getPackingSlip = async (orderId: string) => {
        try {
            return await sellerWorkflowService.getPackingSlip(orderId);
        } catch (err: any) {
            addToast(err.message || 'Failed to get packing slip', 'error');
            return null;
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
        getPackingSlip
    };
}

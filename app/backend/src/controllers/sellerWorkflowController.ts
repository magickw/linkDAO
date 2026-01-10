import { Request, Response } from 'express';
import { SellerWorkflowService } from '../services/sellerWorkflowService';
import { AppError, ValidationError } from '../middleware/errorHandler';
import { safeLogger } from '../utils/safeLogger';

const sellerWorkflowService = new SellerWorkflowService();

export class SellerWorkflowController {
    /**
     * Get seller order dashboard
     */
    async getDashboard(req: Request, res: Response): Promise<Response> {
        try {
            // Assuming authMiddleware populates req.user
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const dashboard = await sellerWorkflowService.getOrderDashboard(sellerId);
            return res.json(dashboard);
        } catch (error: any) {
            safeLogger.error('Error getting seller dashboard:', error);
            return res.status(500).json({ error: error.message || 'Failed to get dashboard' });
        }
    }

    /**
     * Start processing an order
     */
    async startProcessing(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderId } = req.params;

            await sellerWorkflowService.startProcessing(orderId, sellerId);

            return res.status(200).json({ message: 'Order processing started' });
        } catch (error: any) {
            safeLogger.error('Error starting processing:', error);
            const status = error.message === 'Unauthorized' ? 403 : 500;
            return res.status(status).json({ error: error.message || 'Failed to start processing' });
        }
    }

    /**
     * Mark order as ready to ship (generate label)
     */
    async markReadyToShip(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderId } = req.params;
            const packageDetails = req.body; // weight, dims, etc.

            const result = await sellerWorkflowService.markReadyToShip(orderId, sellerId, packageDetails);

            return res.json(result);
        } catch (error: any) {
            safeLogger.error('Error marking ready to ship:', error);
            const status = error.message === 'Unauthorized' ? 403 : 500;
            return res.status(status).json({ error: error.message || 'Failed to mark ready to ship' });
        }
    }

    /**
     * Confirm shipment (add tracking)
     */
    async confirmShipment(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderId } = req.params;
            const { trackingNumber, carrier } = req.body;

            if (!trackingNumber || !carrier) {
                return res.status(400).json({ error: 'Tracking number and carrier are required' });
            }

            const result = await sellerWorkflowService.confirmShipment(orderId, sellerId, trackingNumber, carrier);

            return res.json(result);
        } catch (error: any) {
            safeLogger.error('Error confirming shipment:', error);
            const status = error.message === 'Unauthorized' ? 403 : 500;
            return res.status(status).json({ error: error.message || 'Failed to confirm shipment' });
        }
    }

    /**
     * Get packing slip
     */
    async getPackingSlip(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderId } = req.params;

            const slip = await sellerWorkflowService.getPackingSlip(orderId, sellerId);

            return res.json(slip);
        } catch (error: any) {
            safeLogger.error('Error getting packing slip:', error);
            const status = error.message === 'Unauthorized' ? 403 :
                           error.message === 'Order not found' ? 404 : 500;
            return res.status(status).json({ error: error.message || 'Failed to get packing slip' });
        }
    }

    /**
     * Bulk print packing slips
     */
    async bulkPrintPackingSlips(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderIds } = req.body;

            if (!Array.isArray(orderIds) || orderIds.length === 0) {
                return res.status(400).json({ error: 'orderIds must be a non-empty array' });
            }

            if (orderIds.length > 50) {
                return res.status(400).json({ error: 'Cannot process more than 50 orders at once' });
            }

            const result = await sellerWorkflowService.bulkPrintPackingSlips(orderIds, sellerId);

            return res.status(200).json({
                success: true,
                data: result,
                metadata: {
                    total: orderIds.length,
                    successful: result.successful.length,
                    failed: result.failed.length
                }
            });
        } catch (error: any) {
            safeLogger.error('Error bulk printing packing slips:', error);
            return res.status(500).json({ error: error.message || 'Failed to bulk print packing slips' });
        }
    }

    /**
     * Bulk print shipping labels
     */
    async bulkPrintShippingLabels(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderIds } = req.body;

            if (!Array.isArray(orderIds) || orderIds.length === 0) {
                return res.status(400).json({ error: 'orderIds must be a non-empty array' });
            }

            if (orderIds.length > 50) {
                return res.status(400).json({ error: 'Cannot process more than 50 orders at once' });
            }

            const result = await sellerWorkflowService.bulkPrintShippingLabels(orderIds, sellerId);

            return res.status(200).json({
                success: true,
                data: result,
                metadata: {
                    total: orderIds.length,
                    successful: result.successful.length,
                    failed: result.failed.length
                }
            });
        } catch (error: any) {
            safeLogger.error('Error bulk printing shipping labels:', error);
            return res.status(500).json({ error: error.message || 'Failed to bulk print shipping labels' });
        }
    }

    /**
     * Bulk ship orders
     */
    async bulkShipOrders(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orders } = req.body;

            if (!Array.isArray(orders) || orders.length === 0) {
                return res.status(400).json({ error: 'orders must be a non-empty array' });
            }

            if (orders.length > 50) {
                return res.status(400).json({ error: 'Cannot process more than 50 orders at once' });
            }

            // Validate each order has required fields
            for (const order of orders) {
                if (!order.orderId || !order.trackingNumber) {
                    return res.status(400).json({ error: 'Each order must have orderId and trackingNumber' });
                }
            }

            const result = await sellerWorkflowService.bulkShipOrders(orders, sellerId);

            return res.status(200).json({
                success: true,
                data: result,
                metadata: {
                    total: orders.length,
                    successful: result.successful.length,
                    failed: result.failed.length
                }
            });
        } catch (error: any) {
            safeLogger.error('Error bulk shipping orders:', error);
            return res.status(500).json({ error: error.message || 'Failed to bulk ship orders' });
        }
    }

    // ==================== SERVICE DELIVERY ENDPOINTS ====================

    /**
     * Schedule a service delivery
     */
    async scheduleService(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderId } = req.params;
            const { date, time, timezone, notes } = req.body;

            if (!date || !time || !timezone) {
                return res.status(400).json({ error: 'Date, time, and timezone are required' });
            }

            const result = await sellerWorkflowService.scheduleService(orderId, sellerId, {
                date,
                time,
                timezone,
                notes
            });

            return res.json(result);
        } catch (error: any) {
            safeLogger.error('Error scheduling service:', error);
            const status = error.message === 'Unauthorized' ? 403 :
                           error.message === 'Order not found' ? 404 : 500;
            return res.status(status).json({ error: error.message || 'Failed to schedule service' });
        }
    }

    /**
     * Add a deliverable to a service order
     */
    async addServiceDeliverable(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderId } = req.params;
            const { type, url, name, description } = req.body;

            if (!type || !url || !name) {
                return res.status(400).json({ error: 'Type, url, and name are required' });
            }

            if (!['file', 'link', 'document'].includes(type)) {
                return res.status(400).json({ error: 'Type must be file, link, or document' });
            }

            const result = await sellerWorkflowService.addServiceDeliverable(orderId, sellerId, {
                type,
                url,
                name,
                description
            });

            return res.json(result);
        } catch (error: any) {
            safeLogger.error('Error adding deliverable:', error);
            const status = error.message === 'Unauthorized' ? 403 :
                           error.message === 'Order not found' ? 404 : 500;
            return res.status(status).json({ error: error.message || 'Failed to add deliverable' });
        }
    }

    /**
     * Remove a deliverable from a service order
     */
    async removeServiceDeliverable(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderId, deliverableId } = req.params;

            const result = await sellerWorkflowService.removeServiceDeliverable(orderId, sellerId, deliverableId);

            return res.json(result);
        } catch (error: any) {
            safeLogger.error('Error removing deliverable:', error);
            const status = error.message === 'Unauthorized' ? 403 :
                           error.message === 'Order not found' ? 404 : 500;
            return res.status(status).json({ error: error.message || 'Failed to remove deliverable' });
        }
    }

    /**
     * Start a service
     */
    async startService(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderId } = req.params;

            await sellerWorkflowService.startService(orderId, sellerId);

            return res.json({ success: true, message: 'Service started' });
        } catch (error: any) {
            safeLogger.error('Error starting service:', error);
            const status = error.message === 'Unauthorized' ? 403 :
                           error.message === 'Order not found' ? 404 : 500;
            return res.status(status).json({ error: error.message || 'Failed to start service' });
        }
    }

    /**
     * Mark service as complete
     */
    async markServiceComplete(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderId } = req.params;
            const { completionNotes } = req.body;

            const result = await sellerWorkflowService.markServiceComplete(orderId, sellerId, completionNotes);

            return res.json(result);
        } catch (error: any) {
            safeLogger.error('Error marking service complete:', error);
            const status = error.message === 'Unauthorized' ? 403 :
                           error.message === 'Order not found' ? 404 : 500;
            return res.status(status).json({ error: error.message || 'Failed to mark service complete' });
        }
    }

    /**
     * Get service details
     */
    async getServiceDetails(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderId } = req.params;

            const result = await sellerWorkflowService.getServiceDetails(orderId, sellerId);

            return res.json(result);
        } catch (error: any) {
            safeLogger.error('Error getting service details:', error);
            const status = error.message === 'Unauthorized' ? 403 :
                           error.message === 'Order not found' ? 404 : 500;
            return res.status(status).json({ error: error.message || 'Failed to get service details' });
        }
    }

    /**
     * Complete digital product delivery (for non-service digital goods)
     */
    async completeDigitalDelivery(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { orderId } = req.params;
            const { deliveryNotes } = req.body;

            const result = await sellerWorkflowService.completeDigitalDelivery(orderId, sellerId, deliveryNotes);

            return res.json(result);
        } catch (error: any) {
            safeLogger.error('Error completing digital delivery:', error);
            const status = error.message === 'Unauthorized' ? 403 :
                           error.message === 'Order not found' ? 404 : 500;
            return res.status(status).json({ error: error.message || 'Failed to complete digital delivery' });
        }
    }
}

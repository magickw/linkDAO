import { Request, Response } from 'express';
import { SellerWorkflowService } from '../services/sellerWorkflowService';
import { AppError, ValidationError } from '../middleware/errorHandler';

const sellerWorkflowService = new SellerWorkflowService();

export class SellerWorkflowController {
    /**
     * Get seller order dashboard
     */
    async getDashboard(req: Request, res: Response): Promise<Response> {
        try {
            // Assuming authMiddleware populates req.user
            const sellerId = (req as any).user?.id;
            if (!sellerId) throw new AppError('User not authenticated', 401);

            const dashboard = await sellerWorkflowService.getOrderDashboard(sellerId);
            return res.json(dashboard);
        } catch (error: any) {
            if (error instanceof AppError) throw error;
            throw new AppError(error.message);
        }
    }

    /**
     * Start processing an order
     */
    async startProcessing(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) throw new AppError('User not authenticated', 401);

            const { orderId } = req.params;

            await sellerWorkflowService.startProcessing(orderId, sellerId);

            return res.status(200).json({ message: 'Order processing started' });
        } catch (error: any) {
            if (error instanceof AppError) throw error;
            throw new AppError(error.message);
        }
    }

    /**
     * Mark order as ready to ship (generate label)
     */
    async markReadyToShip(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) throw new AppError('User not authenticated', 401);

            const { orderId } = req.params;
            const packageDetails = req.body; // weight, dims, etc.

            const result = await sellerWorkflowService.markReadyToShip(orderId, sellerId, packageDetails);

            return res.json(result);
        } catch (error: any) {
            if (error instanceof AppError) throw error;
            throw new AppError(error.message);
        }
    }

    /**
     * Confirm shipment (add tracking)
     */
    async confirmShipment(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) throw new AppError('User not authenticated', 401);

            const { orderId } = req.params;
            const { trackingNumber, carrier } = req.body;

            if (!trackingNumber || !carrier) {
                throw new ValidationError('Tracking number and carrier are required');
            }

            const result = await sellerWorkflowService.confirmShipment(orderId, sellerId, trackingNumber, carrier);

            return res.json(result);
        } catch (error: any) {
            if (error instanceof AppError) throw error;
            throw new AppError(error.message);
        }
    }

    /**
     * Get packing slip
     */
    async getPackingSlip(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) throw new AppError('User not authenticated', 401);

            const { orderId } = req.params;

            const slip = await sellerWorkflowService.getPackingSlip(orderId, sellerId);

            return res.json(slip);
        } catch (error: any) {
            if (error instanceof AppError) throw error;
            throw new AppError(error.message);
        }
    }

    /**
     * Bulk print packing slips
     */
    async bulkPrintPackingSlips(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) throw new AppError('User not authenticated', 401);

            const { orderIds } = req.body;

            if (!Array.isArray(orderIds) || orderIds.length === 0) {
                throw new ValidationError('orderIds must be a non-empty array');
            }

            if (orderIds.length > 50) {
                throw new ValidationError('Cannot process more than 50 orders at once');
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
            if (error instanceof AppError) throw error;
            throw new AppError(error.message);
        }
    }

    /**
     * Bulk print shipping labels
     */
    async bulkPrintShippingLabels(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) throw new AppError('User not authenticated', 401);

            const { orderIds } = req.body;

            if (!Array.isArray(orderIds) || orderIds.length === 0) {
                throw new ValidationError('orderIds must be a non-empty array');
            }

            if (orderIds.length > 50) {
                throw new ValidationError('Cannot process more than 50 orders at once');
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
            if (error instanceof AppError) throw error;
            throw new AppError(error.message);
        }
    }

    /**
     * Bulk ship orders
     */
    async bulkShipOrders(req: Request, res: Response): Promise<Response> {
        try {
            const sellerId = (req as any).user?.id;
            if (!sellerId) throw new AppError('User not authenticated', 401);

            const { orders } = req.body;

            if (!Array.isArray(orders) || orders.length === 0) {
                throw new ValidationError('orders must be a non-empty array');
            }

            if (orders.length > 50) {
                throw new ValidationError('Cannot process more than 50 orders at once');
            }

            // Validate each order has required fields
            for (const order of orders) {
                if (!order.orderId || !order.trackingNumber) {
                    throw new ValidationError('Each order must have orderId and trackingNumber');
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
            if (error instanceof AppError) throw error;
            throw new AppError(error.message);
        }
    }
}

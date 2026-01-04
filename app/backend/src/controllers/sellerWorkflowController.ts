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
}

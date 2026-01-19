import { Request, Response } from 'express';
import { fulfillmentDashboardService } from '../services/fulfillmentDashboardService';
import { safeLogger } from '../utils/safeLogger';
import { apiResponse } from '../utils/apiResponse';

class FulfillmentDashboardController {
    /**
     * GET /api/seller/fulfillment/dashboard
     * Get complete dashboard data
     */
    async getDashboard(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json(apiResponse.error('Authentication required', 401));
                return;
            }

            const dashboard = await fulfillmentDashboardService.getDashboardData(userId);

            res.json(apiResponse.success(dashboard, 'Dashboard data retrieved'));
        } catch (error) {
            safeLogger.error('Error getting dashboard:', error);
            res.status(500).json(apiResponse.error('Failed to get dashboard data'));
        }
    }

    /**
     * GET /api/seller/fulfillment/queue/:queueType
     * Get specific queue (ready_to_ship, overdue, in_transit, requires_attention)
     */
    async getQueue(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json(apiResponse.error('Authentication required', 401));
                return;
            }

            const { queueType } = req.params;
            const limit = parseInt(req.query.limit as string) || 50;

            let queue;
            switch (queueType) {
                case 'ready_to_ship':
                    queue = await fulfillmentDashboardService.getReadyToShipQueue(userId, limit);
                    break;
                case 'overdue':
                    queue = await fulfillmentDashboardService.getOverdueQueue(userId, limit);
                    break;
                case 'in_transit':
                    queue = await fulfillmentDashboardService.getInTransitQueue(userId, limit);
                    break;
                case 'requires_attention':
                    queue = await fulfillmentDashboardService.getRequiresAttentionQueue(userId, limit);
                    break;
                default:
                    res.status(400).json(apiResponse.error('Invalid queue type', 400));
                    return;
            }

            res.json(apiResponse.success(queue, `${queueType} queue retrieved`));
        } catch (error) {
            safeLogger.error('Error getting queue:', error);
            res.status(500).json(apiResponse.error('Failed to get queue'));
        }
    }

    /**
     * POST /api/seller/fulfillment/bulk-action
     * Perform bulk action on orders
     */
    async performBulkAction(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json(apiResponse.error('Authentication required', 401));
                return;
            }

            const { orderIds, action } = req.body;

            if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
                res.status(400).json(apiResponse.error('orderIds must be a non-empty array', 400));
                return;
            }

            if (!['mark_shipped', 'print_labels', 'export_csv'].includes(action)) {
                res.status(400).json(apiResponse.error('Invalid action', 400));
                return;
            }

            const result = await fulfillmentDashboardService.performBulkAction(
                userId,
                orderIds,
                action
            );

            res.json(apiResponse.success(result, 'Bulk action completed'));
        } catch (error) {
            safeLogger.error('Error performing bulk action:', error);
            res.status(500).json(apiResponse.error('Failed to perform bulk action'));
        }
    }
}

export const fulfillmentDashboardController = new FulfillmentDashboardController();

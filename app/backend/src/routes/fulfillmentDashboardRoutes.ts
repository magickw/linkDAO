import express from 'express';
import { fulfillmentDashboardController } from '../controllers/fulfillmentDashboardController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/seller/fulfillment/dashboard
 * Get complete dashboard data
 */
router.get('/dashboard', fulfillmentDashboardController.getDashboard.bind(fulfillmentDashboardController));

/**
 * GET /api/seller/fulfillment/queue/:queueType
 * Get specific queue (ready_to_ship, overdue, in_transit, requires_attention)
 */
router.get('/queue/:queueType', fulfillmentDashboardController.getQueue.bind(fulfillmentDashboardController));

/**
 * POST /api/seller/fulfillment/bulk-action
 * Perform bulk action on orders
 */
router.post('/bulk-action', fulfillmentDashboardController.performBulkAction.bind(fulfillmentDashboardController));

export default router;

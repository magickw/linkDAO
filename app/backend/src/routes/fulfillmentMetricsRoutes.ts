import express from 'express';
import { fulfillmentMetricsController } from '../controllers/fulfillmentMetricsController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/seller/metrics/fulfillment
 * Get fulfillment metrics for authenticated seller
 */
router.get('/fulfillment', fulfillmentMetricsController.getMetrics.bind(fulfillmentMetricsController));

/**
 * GET /api/seller/metrics/performance
 * Get performance trends over time
 */
router.get('/performance', fulfillmentMetricsController.getPerformanceTrends.bind(fulfillmentMetricsController));

/**
 * GET /api/seller/metrics/comparison
 * Compare seller performance to platform average
 */
router.get('/comparison', fulfillmentMetricsController.getComparison.bind(fulfillmentMetricsController));

export default router;

import { Router } from 'express';
import { sellerReturnPerformanceController } from '../controllers/sellerReturnPerformanceController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

/**
 * Seller Return Performance Routes
 * 
 * API endpoints for seller return performance analytics
 * All routes require admin authentication
 */

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuthMiddleware);

/**
 * @route   GET /api/admin/returns/seller/:sellerId/metrics
 * @desc    Get return metrics for a specific seller
 * @access  Admin
 * @query   startDate, endDate (optional)
 */
router.get(
  '/seller/:sellerId/metrics',
  sellerReturnPerformanceController.getSellerMetrics.bind(sellerReturnPerformanceController)
);

/**
 * @route   GET /api/admin/returns/seller/:sellerId/compliance
 * @desc    Get compliance metrics for a specific seller
 * @access  Admin
 * @query   startDate, endDate (optional)
 */
router.get(
  '/seller/:sellerId/compliance',
  sellerReturnPerformanceController.getSellerCompliance.bind(sellerReturnPerformanceController)
);

/**
 * @route   GET /api/admin/returns/seller/:sellerId/comparison
 * @desc    Compare seller performance against platform averages
 * @access  Admin
 * @query   startDate, endDate (optional)
 */
router.get(
  '/seller/:sellerId/comparison',
  sellerReturnPerformanceController.compareSellerPerformance.bind(sellerReturnPerformanceController)
);

/**
 * @route   GET /api/admin/returns/platform/averages
 * @desc    Get platform-wide return averages
 * @access  Admin
 * @query   startDate, endDate (optional)
 */
router.get(
  '/platform/averages',
  sellerReturnPerformanceController.getPlatformAverages.bind(sellerReturnPerformanceController)
);

/**
 * @route   GET /api/admin/returns/sellers/performance
 * @desc    Get all sellers' performance metrics
 * @access  Admin
 * @query   startDate, endDate, sortBy, order, limit (optional)
 */
router.get(
  '/sellers/performance',
  sellerReturnPerformanceController.getAllSellersPerformance.bind(sellerReturnPerformanceController)
);

export default router;

import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { sellerAnalyticsController } from '../controllers/sellerAnalyticsController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply rate limiting for analytics endpoints
const analyticsRateLimit = rateLimitingMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many analytics requests, please try again later'
});

router.use(analyticsRateLimit);

/**
 * @route GET /api/seller-analytics/:sellerId/metrics
 * @desc Get comprehensive seller performance metrics
 * @access Private
 * @param {string} sellerId - UUID of the seller
 * @query {string} startDate - Optional start date (ISO string)
 * @query {string} endDate - Optional end date (ISO string)
 */
router.get(
  '/:sellerId/metrics',
  sellerAnalyticsController.getSellerPerformanceMetrics.bind(sellerAnalyticsController)
);

/**
 * @route GET /api/seller-analytics/:sellerId/tier-progression
 * @desc Get seller tier progression analysis
 * @access Private
 * @param {string} sellerId - UUID of the seller
 */
router.get(
  '/:sellerId/tier-progression',
  sellerAnalyticsController.getSellerTierProgression.bind(sellerAnalyticsController)
);

/**
 * @route GET /api/seller-analytics/:sellerId/insights
 * @desc Get seller performance insights and recommendations
 * @access Private
 * @param {string} sellerId - UUID of the seller
 */
router.get(
  '/:sellerId/insights',
  sellerAnalyticsController.getSellerPerformanceInsights.bind(sellerAnalyticsController)
);

/**
 * @route GET /api/seller-analytics/:sellerId/bottlenecks
 * @desc Detect performance bottlenecks and provide solutions
 * @access Private
 * @param {string} sellerId - UUID of the seller
 */
router.get(
  '/:sellerId/bottlenecks',
  sellerAnalyticsController.detectPerformanceBottlenecks.bind(sellerAnalyticsController)
);

/**
 * @route POST /api/seller-analytics/:sellerId/track
 * @desc Track seller performance metrics
 * @access Private
 * @param {string} sellerId - UUID of the seller
 * @body {string} metricType - Type of metric to track
 * @body {number} value - Metric value
 * @body {object} metadata - Optional metadata
 */
router.post(
  '/:sellerId/track',
  sellerAnalyticsController.trackSellerPerformance.bind(sellerAnalyticsController)
);

/**
 * @route GET /api/seller-analytics/:sellerId/trends
 * @desc Get seller performance trends
 * @access Private
 * @param {string} sellerId - UUID of the seller
 * @query {string} metricType - Type of metric to get trends for
 * @query {string} period - Period for trends (day, week, month)
 * @query {number} limit - Number of data points to return
 */
router.get(
  '/:sellerId/trends',
  sellerAnalyticsController.getSellerPerformanceTrends.bind(sellerAnalyticsController)
);

/**
 * @route POST /api/seller-analytics/:sellerId/report
 * @desc Generate automated seller performance report
 * @access Private
 * @param {string} sellerId - UUID of the seller
 * @body {string} reportType - Type of report (weekly, monthly, quarterly)
 * @body {boolean} includeRecommendations - Whether to include recommendations
 */
router.post(
  '/:sellerId/report',
  sellerAnalyticsController.generateSellerReport.bind(sellerAnalyticsController)
);

/**
 * @route GET /api/seller-analytics/:sellerId/dashboard
 * @desc Get seller analytics dashboard data
 * @access Private
 * @param {string} sellerId - UUID of the seller
 * @query {string} startDate - Optional start date (ISO string)
 * @query {string} endDate - Optional end date (ISO string)
 */
router.get(
  '/:sellerId/dashboard',
  sellerAnalyticsController.getSellerAnalyticsDashboard.bind(sellerAnalyticsController)
);

/**
 * @route GET /api/seller-analytics/:sellerId/comparison
 * @desc Get seller performance comparison with benchmarks
 * @access Private
 * @param {string} sellerId - UUID of the seller
 */
router.get(
  '/:sellerId/comparison',
  sellerAnalyticsController.getSellerPerformanceComparison.bind(sellerAnalyticsController)
);

/**
 * @route GET /api/seller-analytics/:sellerId/export
 * @desc Export seller analytics data
 * @access Private
 * @param {string} sellerId - UUID of the seller
 * @query {string} startDate - Optional start date (ISO string)
 * @query {string} endDate - Optional end date (ISO string)
 * @query {string} format - Export format (json, csv)
 */
router.get(
  '/:sellerId/export',
  sellerAnalyticsController.exportSellerAnalytics.bind(sellerAnalyticsController)
);

export default router;

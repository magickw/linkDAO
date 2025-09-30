import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authMiddleware } from '../middleware/authMiddleware';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication middleware to all analytics routes
router.use(authMiddleware);

// Apply rate limiting to prevent abuse
router.use(apiLimiter);

/**
 * @route GET /api/analytics/overview
 * @desc Get overview metrics including GMV, user acquisition, and transaction success rates
 * @access Private
 * @query startDate - Optional start date for filtering
 * @query endDate - Optional end date for filtering
 */
router.get('/overview', analyticsController.getOverviewMetrics.bind(analyticsController));

/**
 * @route GET /api/analytics/user-behavior
 * @desc Get user behavior analytics including page views, session data, and user journey
 * @access Private
 * @query startDate - Optional start date for filtering
 * @query endDate - Optional end date for filtering
 */
router.get('/user-behavior', analyticsController.getUserBehaviorAnalytics.bind(analyticsController));

/**
 * @route GET /api/analytics/sales
 * @desc Get sales analytics including daily sales, top products, and revenue breakdown
 * @access Private
 * @query startDate - Optional start date for filtering
 * @query endDate - Optional end date for filtering
 */
router.get('/sales', analyticsController.getSalesAnalytics.bind(analyticsController));

/**
 * @route GET /api/analytics/seller/:sellerId
 * @desc Get seller-specific analytics including performance metrics and customer insights
 * @access Private
 * @param sellerId - UUID of the seller
 * @query startDate - Optional start date for filtering
 * @query endDate - Optional end date for filtering
 */
router.get('/seller/:sellerId', analyticsController.getSellerAnalytics.bind(analyticsController));

/**
 * @route GET /api/analytics/market-trends
 * @desc Get market trends and seasonal patterns
 * @access Private
 */
router.get('/market-trends', analyticsController.getMarketTrends.bind(analyticsController));

/**
 * @route GET /api/analytics/anomalies
 * @desc Get anomaly detection alerts
 * @access Private
 */
router.get('/anomalies', analyticsController.getAnomalyAlerts.bind(analyticsController));

/**
 * @route GET /api/analytics/dashboard
 * @desc Get real-time dashboard metrics
 * @access Private
 */
router.get('/dashboard', analyticsController.getRealTimeDashboard.bind(analyticsController));

/**
 * @route GET /api/analytics/health
 * @desc Get platform health metrics
 * @access Private
 */
router.get('/health', analyticsController.getPlatformHealth.bind(analyticsController));

/**
 * @route POST /api/analytics/track/event
 * @desc Track user events for analytics
 * @access Private
 * @body userId - UUID of the user
 * @body sessionId - Session identifier
 * @body eventType - Type of event being tracked
 * @body eventData - Event-specific data
 * @body metadata - Optional metadata (pageUrl, userAgent, etc.)
 */
router.post('/track/event', analyticsController.trackUserEvent.bind(analyticsController));

/**
 * @route POST /api/analytics/track/transaction
 * @desc Track transaction events for analytics
 * @access Private
 * @body transactionId - Transaction identifier
 * @body orderId - Order UUID
 * @body type - Transaction type
 * @body amount - Transaction amount
 * @body currency - Currency used
 * @body Additional transaction metadata
 */
router.post('/track/transaction', analyticsController.trackTransaction.bind(analyticsController));

/**
 * @route POST /api/analytics/report
 * @desc Generate custom analytics reports
 * @access Private
 * @body reportType - Type of report to generate
 * @body parameters - Report parameters
 */
router.post('/report', analyticsController.generateReport.bind(analyticsController));

/**
 * @route GET /api/analytics/export
 * @desc Export analytics data
 * @access Private
 * @query startDate - Start date for export
 * @query endDate - End date for export
 * @query format - Export format (json, csv)
 */
router.get('/export', analyticsController.exportAnalytics.bind(analyticsController));

export default router;
import express from 'express';
import { AdvancedAnalyticsController } from '../controllers/advancedAnalyticsController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();
const advancedAnalyticsController = new AdvancedAnalyticsController();

// Get comprehensive marketplace analytics
router.get('/marketplace', 
  authMiddleware, 
  advancedAnalyticsController.getMarketplaceAnalytics.bind(advancedAnalyticsController)
);

// Get time series data for a specific metric
router.get('/timeseries', 
  authMiddleware, 
  advancedAnalyticsController.getTimeSeriesData.bind(advancedAnalyticsController)
);

// Generate AI-powered insights
router.get('/insights', 
  authMiddleware, 
  advancedAnalyticsController.generateInsights.bind(advancedAnalyticsController)
);

// Get real-time metrics
router.get('/realtime', 
  authMiddleware, 
  advancedAnalyticsController.getRealTimeMetrics.bind(advancedAnalyticsController)
);

// Get user behavior analytics
router.get('/user-behavior', 
  authMiddleware, 
  advancedAnalyticsController.getUserBehaviorAnalytics.bind(advancedAnalyticsController)
);

// Get seller performance analytics
router.get('/seller-performance/:sellerId?', 
  authMiddleware, 
  advancedAnalyticsController.getSellerPerformanceAnalytics.bind(advancedAnalyticsController)
);

// Get all seller performance analytics (aggregated)
router.get('/seller-performance', 
  authMiddleware, 
  advancedAnalyticsController.getAllSellerPerformanceAnalytics.bind(advancedAnalyticsController)
);

// Export analytics data
router.get('/export', 
  authMiddleware, 
  advancedAnalyticsController.exportAnalyticsData.bind(advancedAnalyticsController)
);

// Configure analytics alerts
router.post('/alerts', 
  authMiddleware, 
  advancedAnalyticsController.configureAlerts.bind(advancedAnalyticsController)
);

export { router as advancedAnalyticsRouter };
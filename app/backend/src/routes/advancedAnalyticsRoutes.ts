/**
 * Advanced Analytics Routes
 * API routes for marketplace analytics and insights
 */

import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import {
  getMarketplaceAnalytics,
  getTimeSeriesData,
  getAnalyticsInsights,
  getRealTimeMetrics,
  getUserBehaviorAnalytics,
  getSellerPerformanceAnalytics,
  exportAnalyticsData,
  configureAnalyticsAlerts,
  getDashboardData
} from '../controllers/advancedAnalyticsController';

const router = Router();

// Main analytics endpoints
router.get('/overview', getMarketplaceAnalytics);
router.get('/dashboard', getDashboardData);
router.get('/realtime', getRealTimeMetrics);
router.get('/insights', getAnalyticsInsights);

// Time series data
router.get('/metrics/:metric/timeseries', getTimeSeriesData);

// Specific analytics types
router.get('/user-behavior', getUserBehaviorAnalytics);
router.get('/seller-performance', getSellerPerformanceAnalytics);

// Data export
router.get('/export', exportAnalyticsData);

// Configuration
router.post('/alerts/configure', csrfProtection,  configureAnalyticsAlerts);

export { router as advancedAnalyticsRouter };

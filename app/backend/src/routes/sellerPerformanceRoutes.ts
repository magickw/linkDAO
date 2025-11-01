import { Router } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { sellerPerformanceMonitoringService } from '../services/sellerPerformanceMonitoringService';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Validation schemas
const metricsSchema = z.object({
  metrics: z.array(z.object({
    sellerId: z.string(),
    timestamp: z.string(),
    componentLoadTimes: z.object({
      sellerOnboarding: z.number(),
      sellerProfile: z.number(),
      sellerDashboard: z.number(),
      sellerStore: z.number(),
    }),
    apiResponseTimes: z.object({
      getProfile: z.number(),
      updateProfile: z.number(),
      getListings: z.number(),
      createListing: z.number(),
      getDashboard: z.number(),
    }),
    cacheMetrics: z.object({
      hitRate: z.number(),
      missRate: z.number(),
      invalidationTime: z.number(),
      averageRetrievalTime: z.number(),
    }),
    errorMetrics: z.object({
      totalErrors: z.number(),
      errorRate: z.number(),
      criticalErrors: z.number(),
      recoveredErrors: z.number(),
      errorsByType: z.record(z.number()),
    }),
    userExperienceMetrics: z.object({
      timeToInteractive: z.number(),
      firstContentfulPaint: z.number(),
      largestContentfulPaint: z.number(),
      cumulativeLayoutShift: z.number(),
      firstInputDelay: z.number(),
    }),
    mobileMetrics: z.object({
      touchResponseTime: z.number(),
      scrollPerformance: z.number(),
      gestureRecognitionTime: z.number(),
      batteryImpact: z.number(),
    }),
    realTimeMetrics: z.object({
      webSocketConnectionTime: z.number(),
      messageDeliveryTime: z.number(),
      liveUpdateLatency: z.number(),
      connectionStability: z.number(),
    }),
  }))
});

const regressionTestSchema = z.object({
  testType: z.enum(['load', 'stress', 'endurance', 'spike', 'volume'])
});

const alertSchema = z.object({
  alertType: z.enum(['performance', 'error', 'availability', 'security']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  description: z.string(),
  metrics: z.any(),
  actions: z.array(z.object({
    action: z.string(),
    description: z.string(),
    automated: z.boolean()
  }))
});

/**
 * POST /api/seller-performance/:sellerId/metrics
 * Store performance metrics for a seller
 */
router.post(
  '/:sellerId/metrics',
  authMiddleware,
  validateRequest({ body: metricsSchema }),
  async (req, res) => {
    try {
      const { sellerId } = req.params;
      const { metrics } = req.body;

      await sellerPerformanceMonitoringService.storePerformanceMetrics(sellerId, metrics);

      res.json({
        success: true,
        message: 'Performance metrics stored successfully',
        data: {
          sellerId,
          metricsCount: metrics.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      safeLogger.error('Error storing performance metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to store performance metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/seller-performance/:sellerId/dashboard
 * Get performance dashboard data for a seller
 */
router.get(
  '/:sellerId/dashboard',
  authMiddleware,
  async (req, res) => {
    try {
      const { sellerId } = req.params;

      const dashboardData = await sellerPerformanceMonitoringService.getPerformanceDashboard(sellerId);

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      safeLogger.error('Error getting performance dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance dashboard',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/seller-performance/:sellerId/regression-test
 * Run automated performance regression test
 */
router.post(
  '/:sellerId/regression-test',
  authMiddleware,
  validateRequest({ body: regressionTestSchema }),
  async (req, res) => {
    try {
      const { sellerId } = req.params;
      const { testType } = req.body;

      const testResult = await sellerPerformanceMonitoringService.runPerformanceRegressionTest(
        sellerId,
        testType
      );

      res.json({
        success: true,
        data: testResult
      });
    } catch (error) {
      safeLogger.error('Error running performance regression test:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to run performance regression test',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/seller-performance/:sellerId/alerts
 * Get performance alerts for a seller
 */
router.get(
  '/:sellerId/alerts',
  authMiddleware,
  async (req, res) => {
    try {
      const { sellerId } = req.params;
      const { severity } = req.query;

      const alerts = await sellerPerformanceMonitoringService.getPerformanceAlerts(
        sellerId,
        severity as any
      );

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      safeLogger.error('Error getting performance alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance alerts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/seller-performance/:sellerId/alerts
 * Create a performance alert
 */
router.post(
  '/:sellerId/alerts',
  authMiddleware,
  validateRequest({ body: alertSchema }),
  async (req, res) => {
    try {
      const { sellerId } = req.params;
      const alertData = req.body;

      const alert = await sellerPerformanceMonitoringService.createPerformanceAlert(
        sellerId,
        alertData
      );

      res.status(201).json({
        success: true,
        data: alert
      });
    } catch (error) {
      safeLogger.error('Error creating performance alert:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create performance alert',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/seller-performance/:sellerId/alerts/:alertId/resolve
 * Resolve a performance alert
 */
router.put(
  '/:sellerId/alerts/:alertId/resolve',
  authMiddleware,
  async (req, res) => {
    try {
      const { alertId } = req.params;

      await sellerPerformanceMonitoringService.resolvePerformanceAlert(alertId);

      res.json({
        success: true,
        message: 'Performance alert resolved successfully'
      });
    } catch (error) {
      safeLogger.error('Error resolving performance alert:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve performance alert',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/seller-performance/:sellerId/recommendations
 * Get performance recommendations for a seller
 */
router.get(
  '/:sellerId/recommendations',
  authMiddleware,
  async (req, res) => {
    try {
      const { sellerId } = req.params;

      const recommendations = await sellerPerformanceMonitoringService.getPerformanceRecommendations(sellerId);

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      safeLogger.error('Error getting performance recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance recommendations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/seller-performance/:sellerId/trends
 * Get performance trends for a seller
 */
router.get(
  '/:sellerId/trends',
  authMiddleware,
  async (req, res) => {
    try {
      const { sellerId } = req.params;
      const { metric, period = 'day', limit = '30' } = req.query;

      const trends = await sellerPerformanceMonitoringService.getPerformanceTrends(
        sellerId,
        metric as string,
        period as any,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      safeLogger.error('Error getting performance trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance trends',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/seller-performance/health
 * Health check endpoint for performance monitoring service
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      service: 'seller-performance-monitoring',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'seller-performance-monitoring',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

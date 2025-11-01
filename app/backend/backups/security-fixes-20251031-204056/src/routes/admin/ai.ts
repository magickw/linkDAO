import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { openaiService } from '../../services/ai/openaiService';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { contentModerationAI } from '../../services/ai/contentModerationAI';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { predictiveAnalyticsService } from '../../services/ai/predictiveAnalyticsService';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { aiCacheService } from '../../services/ai/aiCacheService';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { aiUsageMonitor } from '../../services/ai/aiUsageMonitorService';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { communityRecommendationController } from '../../controllers/communityRecommendationController';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';

const router = express.Router();

/**
 * Middleware to check if AI services are available
 */
const checkAIAvailability = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!openaiService.isAvailable()) {
    return res.status(503).json({
      error: 'AI services are currently unavailable',
      message: 'OpenAI API key not configured'
    });
  }
  next();
};

/**
 * Middleware to require admin authentication
 * TODO: Replace with actual authentication middleware
 */
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // TODO: Implement actual authentication check
  // For now, just pass through
  next();
};

// Apply middleware
router.use(requireAdmin);
router.use(checkAIAvailability);

/**
 * POST /api/admin/ai/moderate
 * Moderate content using AI
 */
router.post('/moderate', csrfProtection,  async (req, res) => {
  try {
    const { contentId, content } = req.body;

    if (!contentId || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['contentId', 'content']
      });
    }

    const result = await contentModerationAI.analyzeContent(contentId, content);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    safeLogger.error('Content moderation error:', error);
    res.status(500).json({
      error: 'Content moderation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/ai/moderate/batch
 * Batch moderate multiple pieces of content
 */
router.post('/moderate/batch', csrfProtection,  async (req, res) => {
  try {
    const { contents } = req.body;

    if (!Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'contents must be a non-empty array'
      });
    }

    const results = await contentModerationAI.analyzeContentBatch(contents);

    res.json({
      success: true,
      data: Object.fromEntries(results)
    });
  } catch (error: any) {
    safeLogger.error('Batch moderation error:', error);
    res.status(500).json({
      error: 'Batch moderation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/ai/insights/churn/:userId
 * Predict user churn probability
 */
router.get('/insights/churn/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const prediction = await predictiveAnalyticsService.predictUserChurn(userId);

    res.json({
      success: true,
      data: prediction
    });
  } catch (error: any) {
    safeLogger.error('Churn prediction error:', error);
    res.status(500).json({
      error: 'Churn prediction failed',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/ai/insights/content-performance
 * Predict content engagement and viral potential
 */
router.post('/insights/content-performance', csrfProtection,  async (req, res) => {
  try {
    const { contentType, metadata } = req.body;

    if (!contentType) {
      return res.status(400).json({
        error: 'Missing required field: contentType'
      });
    }

    const prediction = await predictiveAnalyticsService.predictContentEngagement(
      contentType,
      metadata || {}
    );

    res.json({
      success: true,
      data: prediction
    });
  } catch (error: any) {
    safeLogger.error('Content performance prediction error:', error);
    res.status(500).json({
      error: 'Content performance prediction failed',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/ai/insights/anomaly-detection
 * Detect anomalies in platform metrics
 */
router.post('/insights/anomaly-detection', csrfProtection,  async (req, res) => {
  try {
    const { metrics } = req.body;

    if (!metrics || !metrics.timeRange) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['metrics.timeRange']
      });
    }

    const anomalies = await predictiveAnalyticsService.detectAnomalies(metrics);

    res.json({
      success: true,
      data: anomalies
    });
  } catch (error: any) {
    safeLogger.error('Anomaly detection error:', error);
    res.status(500).json({
      error: 'Anomaly detection failed',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/ai/insights/seller/:sellerId/performance
 * Predict seller performance trends
 */
router.get('/insights/seller/:sellerId/performance', async (req, res) => {
  try {
    const { sellerId } = req.params;

    const prediction = await predictiveAnalyticsService.predictSellerPerformance(sellerId);

    res.json({
      success: true,
      data: prediction
    });
  } catch (error: any) {
    safeLogger.error('Seller performance prediction error:', error);
    res.status(500).json({
      error: 'Seller performance prediction failed',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/ai/insights/platform-health
 * Analyze overall platform health
 */
router.get('/insights/platform-health', async (req, res) => {
  try {
    const { timeRange } = req.query;

    const analysis = await predictiveAnalyticsService.analyzePlatformHealth(
      (timeRange as string) || '30d'
    );

    res.json({
      success: true,
      data: analysis
    });
  } catch (error: any) {
    safeLogger.error('Platform health analysis error:', error);
    res.status(500).json({
      error: 'Platform health analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/ai/insights/trends
 * Generate trend analysis and insights
 */
router.post('/insights/trends', csrfProtection,  async (req, res) => {
  try {
    const { historicalData, metricName, forecastDays } = req.body;

    if (!historicalData || !metricName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['historicalData', 'metricName']
      });
    }

    const prediction = await openaiService.predictTrends({
      historicalData,
      metricName,
      forecastDays: forecastDays || 30
    });

    res.json({
      success: true,
      data: prediction
    });
  } catch (error: any) {
    safeLogger.error('Trend prediction error:', error);
    res.status(500).json({
      error: 'Trend prediction failed',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/ai/insights/generate
 * Generate custom insights from data
 */
router.post('/insights/generate', csrfProtection,  async (req, res) => {
  try {
    const { type, context, timeRange } = req.body;

    if (!type || !context) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['type', 'context']
      });
    }

    // Handle community recommendation requests
    if (type === 'community_recommendations' || type === 'community_engagement') {
      return await communityRecommendationController.generateAIRecommendations(req, res);
    }

    const validTypes = ['user_behavior', 'content_trends', 'seller_performance', 'platform_health'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid type',
        validTypes
      });
    }

    const insights = await openaiService.generateInsight({
      type,
      context,
      timeRange
    });

    res.json({
      success: true,
      data: { insights }
    });
  } catch (error: any) {
    safeLogger.error('Insight generation error:', error);
    res.status(500).json({
      error: 'Insight generation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/ai/community-recommendations
 * Get personalized community recommendations for a user
 */
router.post('/community-recommendations', csrfProtection,  communityRecommendationController.getRecommendations);

/**
 * POST /api/admin/ai/community-engagement-insights
 * Get community engagement insights
 */
router.post('/community-engagement-insights', csrfProtection,  communityRecommendationController.getEngagementInsights);

/**
 * GET /api/admin/ai/usage
 * Get AI usage metrics and costs
 */
router.get('/usage', async (req, res) => {
  try {
    const metrics = openaiService.getUsageMetrics();

    res.json({
      success: true,
      data: metrics
    });
  } catch (error: any) {
    safeLogger.error('Usage metrics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve usage metrics',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/ai/usage/reset
 * Reset AI usage metrics
 */
router.post('/usage/reset', csrfProtection,  async (req, res) => {
  try {
    openaiService.resetUsageMetrics();

    res.json({
      success: true,
      message: 'Usage metrics reset successfully'
    });
  } catch (error: any) {
    safeLogger.error('Usage reset error:', error);
    res.status(500).json({
      error: 'Failed to reset usage metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/ai/health
 * Check AI service health
 */
router.get('/health', async (req, res) => {
  const isAvailable = openaiService.isAvailable();

  res.json({
    success: true,
    data: {
      available: isAvailable,
      status: isAvailable ? 'operational' : 'unavailable',
      message: isAvailable
        ? 'AI services are operational'
        : 'OpenAI API key not configured'
    }
  });
});

/**
 * GET /api/admin/ai/usage/report
 * Get detailed usage report with budget tracking
 */
router.get('/usage/report', async (req, res) => {
  try {
    const { period } = req.query;
    const report = await aiUsageMonitor.getUsageReport(period as any || 'monthly');

    res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    safeLogger.error('Usage report error:', error);
    res.status(500).json({
      error: 'Failed to generate usage report',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/ai/usage/check-budget
 * Check if current usage is within budget
 */
router.get('/usage/check-budget', async (req, res) => {
  try {
    const { period } = req.query;
    const status = await aiUsageMonitor.checkBudget(period as any || 'daily');

    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    safeLogger.error('Budget check error:', error);
    res.status(500).json({
      error: 'Failed to check budget',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/ai/cache/stats
 * Get cache statistics and savings
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const [stats, savings] = await Promise.all([
      aiCacheService.getStats(),
      aiUsageMonitor.getCacheSavings()
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        savings
      }
    });
  } catch (error: any) {
    safeLogger.error('Cache stats error:', error);
    res.status(500).json({
      error: 'Failed to get cache statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/ai/cache/clear
 * Clear all AI caches
 */
router.post('/cache/clear', csrfProtection,  async (req, res) => {
  try {
    await aiCacheService.clearAll();

    res.json({
      success: true,
      message: 'AI cache cleared successfully'
    });
  } catch (error: any) {
    safeLogger.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/ai/recommendations
 * Get optimization recommendations
 */
router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = await aiUsageMonitor.getOptimizationRecommendations();

    res.json({
      success: true,
      data: { recommendations }
    });
  } catch (error: any) {
    safeLogger.error('Recommendations error:', error);
    res.status(500).json({
      error: 'Failed to get recommendations',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/ai/estimate-cost
 * Estimate cost for an operation before running it
 */
router.post('/estimate-cost', csrfProtection,  async (req, res) => {
  try {
    const { operation } = req.body;

    if (!operation || !operation.type) {
      return res.status(400).json({
        error: 'Missing required field: operation.type'
      });
    }

    const estimate = aiUsageMonitor.estimateCost(operation);

    res.json({
      success: true,
      data: { estimatedCost: estimate }
    });
  } catch (error: any) {
    safeLogger.error('Cost estimation error:', error);
    res.status(500).json({
      error: 'Failed to estimate cost',
      message: error.message
    });
  }
});

export default router;
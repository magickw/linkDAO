import express from 'express';
import { openaiService } from '../services/ai/openaiService';
import { contentModerationAI } from '../services/ai/contentModerationAI';
import { predictiveAnalyticsService } from '../services/ai/predictiveAnalyticsService';

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
router.post('/moderate', async (req, res) => {
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
    console.error('Content moderation error:', error);
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
router.post('/moderate/batch', async (req, res) => {
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
    console.error('Batch moderation error:', error);
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
    console.error('Churn prediction error:', error);
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
router.post('/insights/content-performance', async (req, res) => {
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
    console.error('Content performance prediction error:', error);
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
router.post('/insights/anomaly-detection', async (req, res) => {
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
    console.error('Anomaly detection error:', error);
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
    console.error('Seller performance prediction error:', error);
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
    console.error('Platform health analysis error:', error);
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
router.post('/insights/trends', async (req, res) => {
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
    console.error('Trend prediction error:', error);
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
router.post('/insights/generate', async (req, res) => {
  try {
    const { type, context, timeRange } = req.body;

    if (!type || !context) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['type', 'context']
      });
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
    console.error('Insight generation error:', error);
    res.status(500).json({
      error: 'Insight generation failed',
      message: error.message
    });
  }
});

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
    console.error('Usage metrics error:', error);
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
router.post('/usage/reset', async (req, res) => {
  try {
    openaiService.resetUsageMetrics();

    res.json({
      success: true,
      message: 'Usage metrics reset successfully'
    });
  } catch (error: any) {
    console.error('Usage reset error:', error);
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

export default router;

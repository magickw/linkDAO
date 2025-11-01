import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { aiInsightsEngine } from '../services/aiInsightsEngine';
import { predictiveAnalyticsService } from '../services/predictiveAnalyticsService';
import { anomalyDetectionService } from '../services/anomalyDetectionService';
import { automatedInsightService } from '../services/automatedInsightService';
import { trendAnalysisService } from '../services/trendAnalysisService';

export class AIInsightsController {
  /**
   * Get comprehensive insights report
   */
  async getInsightsReport(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = 'daily' } = req.query;
      
      const report = await aiInsightsEngine.generateComprehensiveReport(
        timeframe as 'hourly' | 'daily' | 'weekly' | 'monthly'
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      safeLogger.error('Error getting insights report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate insights report'
      });
    }
  }

  /**
   * Get AI engine status
   */
  async getEngineStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await aiInsightsEngine.getEngineStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      safeLogger.error('Error getting engine status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get engine status'
      });
    }
  }

  /**
   * Start AI insights engine
   */
  async startEngine(req: Request, res: Response): Promise<void> {
    try {
      await aiInsightsEngine.start();

      res.json({
        success: true,
        message: 'AI Insights Engine started successfully'
      });
    } catch (error) {
      safeLogger.error('Error starting engine:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start AI Insights Engine'
      });
    }
  }

  /**
   * Stop AI insights engine
   */
  async stopEngine(req: Request, res: Response): Promise<void> {
    try {
      await aiInsightsEngine.stop();

      res.json({
        success: true,
        message: 'AI Insights Engine stopped successfully'
      });
    } catch (error) {
      safeLogger.error('Error stopping engine:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop AI Insights Engine'
      });
    }
  }

  /**
   * Update engine configuration
   */
  async updateEngineConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      await aiInsightsEngine.updateConfig(config);

      res.json({
        success: true,
        message: 'Engine configuration updated successfully'
      });
    } catch (error) {
      safeLogger.error('Error updating engine config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update engine configuration'
      });
    }
  }

  /**
   * Get filtered insights
   */
  async getInsights(req: Request, res: Response): Promise<void> {
    try {
      const { type, timeframe, limit = 50 } = req.query;
      
      const insights = await aiInsightsEngine.getInsights(
        type as any,
        timeframe as string,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      safeLogger.error('Error getting insights:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get insights'
      });
    }
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { days = 7 } = req.query;
      
      const analytics = await aiInsightsEngine.getPerformanceAnalytics(
        parseInt(days as string)
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      safeLogger.error('Error getting performance analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get performance analytics'
      });
    }
  }

  /**
   * Get predictive analytics
   */
  async getPredictiveAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { type, horizon = 7 } = req.query;
      let predictions: any;

      switch (type) {
        case 'user_growth':
          predictions = await predictiveAnalyticsService.predictUserGrowth(
            parseInt(horizon as string)
          );
          break;
        case 'content_volume':
          predictions = await predictiveAnalyticsService.predictContentVolume(
            parseInt(horizon as string)
          );
          break;
        case 'system_load':
          predictions = await predictiveAnalyticsService.predictSystemLoad(
            parseInt(horizon as string)
          );
          break;
        case 'business_metrics':
          const { metrics = 'revenue,orders' } = req.query;
          predictions = await predictiveAnalyticsService.predictBusinessMetrics(
            (metrics as string).split(','),
            parseInt(horizon as string)
          );
          break;
        default:
          // Get all predictions
          const [userGrowth, contentVolume, systemLoad] = await Promise.all([
            predictiveAnalyticsService.predictUserGrowth(parseInt(horizon as string)),
            predictiveAnalyticsService.predictContentVolume(parseInt(horizon as string)),
            predictiveAnalyticsService.predictSystemLoad(parseInt(horizon as string))
          ]);
          predictions = {
            userGrowth,
            contentVolume,
            systemLoad
          };
      }

      res.json({
        success: true,
        data: predictions
      });
    } catch (error) {
      safeLogger.error('Error getting predictive analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get predictive analytics'
      });
    }
  }

  /**
   * Get anomaly detection results
   */
  async getAnomalies(req: Request, res: Response): Promise<void> {
    try {
      const anomalies = await anomalyDetectionService.monitorRealTimeAnomalies();

      res.json({
        success: true,
        data: anomalies
      });
    } catch (error) {
      safeLogger.error('Error getting anomalies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get anomaly detection results'
      });
    }
  }

  /**
   * Get anomaly statistics
   */
  async getAnomalyStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { days = 7 } = req.query;
      
      const statistics = await anomalyDetectionService.getAnomalyStatistics(
        parseInt(days as string)
      );

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      safeLogger.error('Error getting anomaly statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get anomaly statistics'
      });
    }
  }

  /**
   * Configure anomaly thresholds
   */
  async configureAnomalyThresholds(req: Request, res: Response): Promise<void> {
    try {
      const thresholds = req.body;
      await anomalyDetectionService.configureThresholds(thresholds);

      res.json({
        success: true,
        message: 'Anomaly thresholds configured successfully'
      });
    } catch (error) {
      safeLogger.error('Error configuring anomaly thresholds:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to configure anomaly thresholds'
      });
    }
  }

  /**
   * Investigate specific anomaly
   */
  async investigateAnomaly(req: Request, res: Response): Promise<void> {
    try {
      const { anomalyId } = req.params;
      
      const investigation = await anomalyDetectionService.investigateAnomaly(anomalyId);

      res.json({
        success: true,
        data: investigation
      });
    } catch (error) {
      safeLogger.error('Error investigating anomaly:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to investigate anomaly'
      });
    }
  }

  /**
   * Get trend analysis
   */
  async getTrendAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { 
        metrics = 'user_registrations,revenue,active_users,orders',
        timeframe = 'daily',
        lookbackDays = 30
      } = req.query;

      const trends = await trendAnalysisService.analyzeTrends(
        (metrics as string).split(','),
        timeframe as any,
        parseInt(lookbackDays as string)
      );

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      safeLogger.error('Error getting trend analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trend analysis'
      });
    }
  }

  /**
   * Get seasonal patterns
   */
  async getSeasonalPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { 
        metric,
        timeframe = 'daily',
        lookbackDays = 90
      } = req.query;

      if (!metric) {
        res.status(400).json({
          success: false,
          error: 'Metric parameter is required'
        });
        return;
      }

      const patterns = await trendAnalysisService.detectSeasonalPatterns(
        metric as string,
        timeframe as any,
        parseInt(lookbackDays as string)
      );

      res.json({
        success: true,
        data: patterns
      });
    } catch (error) {
      safeLogger.error('Error getting seasonal patterns:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get seasonal patterns'
      });
    }
  }

  /**
   * Generate trend alerts
   */
  async generateTrendAlerts(req: Request, res: Response): Promise<void> {
    try {
      const thresholds = req.body;
      
      const alerts = await trendAnalysisService.generateTrendAlerts(thresholds);

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      safeLogger.error('Error generating trend alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate trend alerts'
      });
    }
  }

  /**
   * Create trend visualization
   */
  async createTrendVisualization(req: Request, res: Response): Promise<void> {
    try {
      const { trendId, includeForecasts = true } = req.query;

      if (!trendId) {
        res.status(400).json({
          success: false,
          error: 'Trend ID is required'
        });
        return;
      }

      // This would need to get the trend analysis first
      // For now, return a mock response
      res.json({
        success: true,
        message: 'Trend visualization endpoint - implementation needed'
      });
    } catch (error) {
      safeLogger.error('Error creating trend visualization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create trend visualization'
      });
    }
  }

  /**
   * Forecast metric
   */
  async forecastMetric(req: Request, res: Response): Promise<void> {
    try {
      const { 
        metric,
        horizonDays = 7,
        modelType = 'auto'
      } = req.query;

      if (!metric) {
        res.status(400).json({
          success: false,
          error: 'Metric parameter is required'
        });
        return;
      }

      const forecast = await trendAnalysisService.forecastMetric(
        metric as string,
        parseInt(horizonDays as string),
        modelType as any
      );

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      safeLogger.error('Error forecasting metric:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to forecast metric'
      });
    }
  }

  /**
   * Get trend statistics
   */
  async getTrendStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      
      const statistics = await trendAnalysisService.getTrendStatistics(
        parseInt(days as string)
      );

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      safeLogger.error('Error getting trend statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trend statistics'
      });
    }
  }

  /**
   * Get insight analytics
   */
  async getInsightAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      
      const analytics = await automatedInsightService.getInsightAnalytics(
        parseInt(days as string)
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      safeLogger.error('Error getting insight analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get insight analytics'
      });
    }
  }

  /**
   * Generate natural language insight
   */
  async generateNaturalLanguageInsight(req: Request, res: Response): Promise<void> {
    try {
      const insight = req.body;
      
      const naturalLanguageInsight = await automatedInsightService.generateNaturalLanguageInsight(insight);

      res.json({
        success: true,
        data: naturalLanguageInsight
      });
    } catch (error) {
      safeLogger.error('Error generating natural language insight:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate natural language insight'
      });
    }
  }

  /**
   * Track insight outcome
   */
  async trackInsightOutcome(req: Request, res: Response): Promise<void> {
    try {
      const tracking = req.body;
      
      await automatedInsightService.trackInsightOutcome(tracking);

      res.json({
        success: true,
        message: 'Insight outcome tracked successfully'
      });
    } catch (error) {
      safeLogger.error('Error tracking insight outcome:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track insight outcome'
      });
    }
  }

  /**
   * Evaluate prediction accuracy
   */
  async evaluatePredictionAccuracy(req: Request, res: Response): Promise<void> {
    try {
      const { predictionId, actualValue } = req.body;

      if (!predictionId || actualValue === undefined) {
        res.status(400).json({
          success: false,
          error: 'Prediction ID and actual value are required'
        });
        return;
      }

      const evaluation = await predictiveAnalyticsService.evaluatePredictionAccuracy(
        predictionId,
        parseFloat(actualValue)
      );

      res.json({
        success: true,
        data: evaluation
      });
    } catch (error) {
      safeLogger.error('Error evaluating prediction accuracy:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to evaluate prediction accuracy'
      });
    }
  }
}

export const aiInsightsController = new AIInsightsController();

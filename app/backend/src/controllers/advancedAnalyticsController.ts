import { Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { AdvancedAnalyticsService } from '../services/advancedAnalyticsService';

const advancedAnalyticsService = new AdvancedAnalyticsService();

type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d" | "1y";

interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  period: AnalyticsPeriod;
}

function isValidAnalyticsPeriod(period: any): period is AnalyticsPeriod {
  return ["24h", "7d", "30d", "90d", "1y"].includes(period);
}

export class AdvancedAnalyticsController {
  /**
   * Get comprehensive marketplace analytics
   */
  async getMarketplaceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { start, end, period } = req.query;
      
      if (!start || !end || !period) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: start, end, period'
        });
        return;
      }

      if (!isValidAnalyticsPeriod(period)) {
        res.status(400).json({
          success: false,
          error: 'Invalid period. Must be one of: "24h", "7d", "30d", "90d", "1y"'
        });
        return;
      }

      const timeRange: AnalyticsTimeRange = {
        start: new Date(start as string),
        end: new Date(end as string),
        period: period
      };

      const analytics = await advancedAnalyticsService.getMarketplaceAnalytics(timeRange);
      
      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting marketplace analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve marketplace analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get time series data for a specific metric
   */
  async getTimeSeriesData(req: Request, res: Response): Promise<void> {
    try {
      const { metric, start, end, granularity, period } = req.query;
      
      if (!metric || !start || !end || !period) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: metric, start, end, period'
        });
        return;
      }

      if (!isValidAnalyticsPeriod(period)) {
        res.status(400).json({
          success: false,
          error: 'Invalid period. Must be one of: "24h", "7d", "30d", "90d", "1y"'
        });
        return;
      }

      const timeRange: AnalyticsTimeRange = {
        start: new Date(start as string),
        end: new Date(end as string),
        period: period
      };

      const data = await advancedAnalyticsService.getTimeSeriesData(
        metric as string,
        timeRange,
        granularity as any
      );
      
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting time series data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve time series data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate AI-powered insights
   */
  async generateInsights(req: Request, res: Response): Promise<void> {
    try {
      const { start, end, period } = req.query;
      
      if (!start || !end || !period) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: start, end, period'
        });
        return;
      }

      if (!isValidAnalyticsPeriod(period)) {
        res.status(400).json({
          success: false,
          error: 'Invalid period. Must be one of: "24h", "7d", "30d", "90d", "1y"'
        });
        return;
      }

      const timeRange: AnalyticsTimeRange = {
        start: new Date(start as string),
        end: new Date(end as string),
        period: period
      };

      const insights = await advancedAnalyticsService.generateInsights(timeRange);
      
      res.json({
        success: true,
        data: insights,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error generating insights:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await advancedAnalyticsService.getRealTimeMetrics();
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting real-time metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve real-time metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { start, end, period } = req.query;

      if (!isValidAnalyticsPeriod(period)) {
        res.status(400).json({
          success: false,
          error: 'Invalid period. Must be one of: "24h", "7d", "30d", "90d", "1y"'
        });
        return;
      }
      
      const timeRange: AnalyticsTimeRange = {
        start: start ? new Date(start as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: end ? new Date(end as string) : new Date(),
        period: period || '7d'
      };

      const analytics = await advancedAnalyticsService.getUserBehaviorAnalytics(timeRange);
      
      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting user behavior analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user behavior analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get seller performance analytics
   */
  async getSellerPerformanceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      
      const analytics = await advancedAnalyticsService.getSellerPerformanceAnalytics(sellerId);
      
      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting seller performance analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seller performance analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all seller performance analytics (aggregated)
   */
  async getAllSellerPerformanceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await advancedAnalyticsService.getSellerPerformanceAnalytics();
      
      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting all seller performance analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seller performance analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(req: Request, res: Response): Promise<void> {
    try {
      const { start, end, format, period } = req.query;
      
      if (!start || !end || !period) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: start, end, period'
        });
        return;
      }

      if (!isValidAnalyticsPeriod(period)) {
        res.status(400).json({
          success: false,
          error: 'Invalid period. Must be one of: "24h", "7d", "30d", "90d", "1y"'
        });
        return;
      }

      const timeRange: AnalyticsTimeRange = {
        start: new Date(start as string),
        end: new Date(end as string),
        period: period
      };

      const exportData = await advancedAnalyticsService.exportAnalyticsData(
        timeRange,
        format as any
      );
      
      res.json({
        success: true,
        data: exportData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error exporting analytics data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export analytics data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Configure analytics alerts
   */
  async configureAlerts(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      await advancedAnalyticsService.configureAlerts(config);
      
      res.json({
        success: true,
        message: 'Alerts configured successfully'
      });
    } catch (error) {
      safeLogger.error('Error configuring alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to configure alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
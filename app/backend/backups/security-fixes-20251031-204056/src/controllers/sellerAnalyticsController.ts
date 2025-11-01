import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { sellerAnalyticsService } from '../services/sellerAnalyticsService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { z } from 'zod';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

// Validation schemas
const sellerIdSchema = z.object({
  sellerId: z.string().uuid('Invalid seller ID format')
});

const dateRangeSchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined)
});

const reportTypeSchema = z.object({
  reportType: z.enum(['weekly', 'monthly', 'quarterly']),
  includeRecommendations: z.boolean().optional().default(true)
});

const performanceTrackingSchema = z.object({
  metricType: z.string().min(1, 'Metric type is required'),
  value: z.number(),
  metadata: z.any().optional()
});

const trendsSchema = z.object({
  metricType: z.string().min(1, 'Metric type is required'),
  period: z.enum(['day', 'week', 'month']).optional().default('day'),
  limit: z.number().min(1).max(365).optional().default(30)
});

export class SellerAnalyticsController {
  /**
   * Get comprehensive seller performance metrics
   */
  async getSellerPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = sellerIdSchema.parse(req.params);
      const { startDate, endDate } = dateRangeSchema.parse(req.query);

      const metrics = await sellerAnalyticsService.getSellerPerformanceMetrics(
        sellerId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting seller performance metrics:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seller performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get seller tier progression analysis
   */
  async getSellerTierProgression(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = sellerIdSchema.parse(req.params);

      const tierProgression = await sellerAnalyticsService.getSellerTierProgression(sellerId);

      res.json({
        success: true,
        data: tierProgression,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting seller tier progression:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seller tier progression',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get seller performance insights and recommendations
   */
  async getSellerPerformanceInsights(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = sellerIdSchema.parse(req.params);

      const insights = await sellerAnalyticsService.getSellerPerformanceInsights(sellerId);

      res.json({
        success: true,
        data: insights,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting seller performance insights:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seller performance insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Detect performance bottlenecks and provide solutions
   */
  async detectPerformanceBottlenecks(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = sellerIdSchema.parse(req.params);

      const bottlenecks = await sellerAnalyticsService.detectPerformanceBottlenecks(sellerId);

      res.json({
        success: true,
        data: bottlenecks,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error detecting performance bottlenecks:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to detect performance bottlenecks',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Track seller performance metrics
   */
  async trackSellerPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = sellerIdSchema.parse(req.params);
      const { metricType, value, metadata } = performanceTrackingSchema.parse(req.body);

      await sellerAnalyticsService.trackSellerPerformance(
        sellerId,
        metricType,
        value,
        metadata
      );

      res.json({
        success: true,
        message: 'Performance metric tracked successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error tracking seller performance:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to track seller performance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get seller performance trends
   */
  async getSellerPerformanceTrends(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = sellerIdSchema.parse(req.params);
      const { metricType, period, limit } = trendsSchema.parse(req.query);

      const trends = await sellerAnalyticsService.getSellerPerformanceTrends(
        sellerId,
        metricType,
        period,
        limit
      );

      res.json({
        success: true,
        data: {
          sellerId,
          metricType,
          period,
          trends
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting seller performance trends:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seller performance trends',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate automated seller performance report
   */
  async generateSellerReport(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = sellerIdSchema.parse(req.params);
      const { reportType, includeRecommendations } = reportTypeSchema.parse(req.body);

      const report = await sellerAnalyticsService.generateSellerReport(
        sellerId,
        reportType,
        includeRecommendations
      );

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error generating seller report:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to generate seller report',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get seller analytics dashboard data
   */
  async getSellerAnalyticsDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = sellerIdSchema.parse(req.params);
      const { startDate, endDate } = dateRangeSchema.parse(req.query);

      // Get all dashboard data in parallel
      const [
        metrics,
        insights,
        tierProgression,
        bottlenecks
      ] = await Promise.all([
        sellerAnalyticsService.getSellerPerformanceMetrics(sellerId, startDate, endDate),
        sellerAnalyticsService.getSellerPerformanceInsights(sellerId),
        sellerAnalyticsService.getSellerTierProgression(sellerId),
        sellerAnalyticsService.detectPerformanceBottlenecks(sellerId)
      ]);

      const dashboard = {
        sellerId,
        dateRange: { startDate, endDate },
        metrics,
        insights: insights.insights.slice(0, 5), // Top 5 insights
        tierProgression,
        bottlenecks: bottlenecks.bottlenecks.slice(0, 3), // Top 3 bottlenecks
        performanceScore: bottlenecks.performanceScore,
        lastUpdated: new Date().toISOString()
      };

      res.json({
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting seller analytics dashboard:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seller analytics dashboard',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get seller performance comparison with benchmarks
   */
  async getSellerPerformanceComparison(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = sellerIdSchema.parse(req.params);

      const [metrics, insights] = await Promise.all([
        sellerAnalyticsService.getSellerPerformanceMetrics(sellerId),
        sellerAnalyticsService.getSellerPerformanceInsights(sellerId)
      ]);

      const comparison = {
        sellerId,
        sellerMetrics: {
          conversionRate: metrics.conversionRate,
          averageOrderValue: metrics.averageOrderValue,
          customerSatisfaction: metrics.customerSatisfaction,
          responseTime: metrics.responseTime
        },
        benchmarks: insights.benchmarks,
        performance: {
          conversionRateVsIndustry: ((metrics.conversionRate - insights.benchmarks.industryAverage.conversionRate) / insights.benchmarks.industryAverage.conversionRate * 100).toFixed(1),
          aovVsIndustry: ((metrics.averageOrderValue - insights.benchmarks.industryAverage.averageOrderValue) / insights.benchmarks.industryAverage.averageOrderValue * 100).toFixed(1),
          satisfactionVsIndustry: ((metrics.customerSatisfaction - insights.benchmarks.industryAverage.customerSatisfaction) / insights.benchmarks.industryAverage.customerSatisfaction * 100).toFixed(1),
          responseTimeVsIndustry: ((insights.benchmarks.industryAverage.responseTime - metrics.responseTime) / insights.benchmarks.industryAverage.responseTime * 100).toFixed(1)
        },
        ranking: insights.benchmarks.sellerRanking
      };

      res.json({
        success: true,
        data: comparison,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting seller performance comparison:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seller performance comparison',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Export seller analytics data
   */
  async exportSellerAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = sellerIdSchema.parse(req.params);
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      const format = req.query.format as string || 'json';

      const report = await sellerAnalyticsService.generateSellerReport(
        sellerId,
        'monthly',
        true
      );

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=seller-analytics-${sellerId}.csv`);
        
        // Convert to CSV format
        const csvData = [
          'Metric,Value',
          `Total Sales,$${report.metrics.totalSales}`,
          `Total Orders,${report.metrics.totalOrders}`,
          `Average Order Value,$${report.metrics.averageOrderValue}`,
          `Conversion Rate,${report.metrics.conversionRate}%`,
          `Customer Satisfaction,${report.metrics.customerSatisfaction}/5`,
          `Response Time,${report.metrics.responseTime}s`,
          `Revenue Growth,${report.metrics.revenueGrowth}%`,
          `Performance Score,${report.bottlenecks.performanceScore}/100`
        ].join('\n');
        
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=seller-analytics-${sellerId}.json`);
        res.json(report);
      }
    } catch (error) {
      safeLogger.error('Error exporting seller analytics:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to export seller analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const sellerAnalyticsController = new SellerAnalyticsController();
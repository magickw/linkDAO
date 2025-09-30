import { Request, Response } from 'express';
import { analyticsService, AnalyticsService } from '../services/analyticsService';
import { z } from 'zod';

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined)
});

const sellerAnalyticsSchema = z.object({
  sellerId: z.string().uuid(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined)
});

const reportSchema = z.object({
  reportType: z.enum(['overview', 'sales', 'users', 'seller', 'trends', 'anomalies']),
  parameters: z.object({
    startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
    endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
    sellerId: z.string().uuid().optional()
  }).optional()
});

const eventTrackingSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string(),
  eventType: z.string(),
  eventData: z.any(),
  metadata: z.object({
    pageUrl: z.string().optional(),
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    deviceType: z.string().optional(),
    browser: z.string().optional(),
    referrer: z.string().optional()
  }).optional()
});

const transactionTrackingSchema = z.object({
  transactionId: z.string(),
  orderId: z.string().uuid(),
  type: z.string(),
  amount: z.number(),
  currency: z.string(),
  feeAmount: z.number().optional(),
  gasUsed: z.number().optional(),
  gasPrice: z.number().optional(),
  blockNumber: z.number().optional(),
  transactionHash: z.string().optional(),
  status: z.string(),
  processingTime: z.number().optional(),
  errorMessage: z.string().optional()
});

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = analyticsService;
  }

  /**
   * Get overview metrics including GMV, user acquisition, and transaction success rates
   */
  async getOverviewMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      
      const metrics = await this.analyticsService.getOverviewMetrics(startDate, endDate);
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting overview metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve overview metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user behavior analytics including page views, session data, and user journey
   */
  async getUserBehaviorAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      
      const behaviorData = await this.analyticsService.getUserBehaviorData(startDate, endDate);
      
      res.json({
        success: true,
        data: behaviorData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting user behavior analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user behavior analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get sales analytics including daily sales, top products, and revenue breakdown
   */
  async getSalesAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      
      const salesData = await this.analyticsService.getSalesAnalytics(startDate, endDate);
      
      res.json({
        success: true,
        data: salesData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting sales analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve sales analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get seller-specific analytics including performance metrics and customer insights
   */
  async getSellerAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId, startDate, endDate } = sellerAnalyticsSchema.parse({
        sellerId: req.params.sellerId,
        ...req.query
      });
      
      const sellerData = await this.analyticsService.getSellerAnalytics(sellerId, startDate, endDate);
      
      res.json({
        success: true,
        data: sellerData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting seller analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seller analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get market trends and seasonal patterns
   */
  async getMarketTrends(req: Request, res: Response): Promise<void> {
    try {
      const trends = await this.analyticsService.getMarketTrends();
      
      res.json({
        success: true,
        data: trends,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting market trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve market trends',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get anomaly detection alerts
   */
  async getAnomalyAlerts(req: Request, res: Response): Promise<void> {
    try {
      const anomalies = await this.analyticsService.detectAnomalies();
      
      res.json({
        success: true,
        data: anomalies,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting anomaly alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve anomaly alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Track user events for analytics
   */
  async trackUserEvent(req: Request, res: Response): Promise<void> {
    try {
      const eventData = eventTrackingSchema.parse(req.body);
      
      await this.analyticsService.trackUserEvent(
        eventData.userId,
        eventData.sessionId,
        eventData.eventType,
        eventData.eventData,
        eventData.metadata
      );
      
      res.json({
        success: true,
        message: 'Event tracked successfully'
      });
    } catch (error) {
      console.error('Error tracking user event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track user event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Track transaction events for analytics
   */
  async trackTransaction(req: Request, res: Response): Promise<void> {
    try {
      const parsedData = transactionTrackingSchema.parse(req.body);
      
      // Ensure all required fields are present with defaults for optional ones
      const transactionData = {
        transactionId: parsedData.transactionId,
        orderId: parsedData.orderId,
        type: parsedData.type,
        amount: parsedData.amount,
        currency: parsedData.currency,
        feeAmount: parsedData.feeAmount ?? 0,
        gasUsed: parsedData.gasUsed ?? 0,
        gasPrice: parsedData.gasPrice ?? 0,
        blockNumber: parsedData.blockNumber ?? 0,
        transactionHash: parsedData.transactionHash ?? '',
        status: parsedData.status,
        processingTime: parsedData.processingTime ?? 0,
        errorMessage: parsedData.errorMessage ?? ''
      };
      
      await this.analyticsService.trackTransaction(transactionData);
      
      res.json({
        success: true,
        message: 'Transaction tracked successfully'
      });
    } catch (error) {
      console.error('Error tracking transaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate custom analytics reports
   */
  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportType, parameters } = reportSchema.parse(req.body);
      
      const report = await this.analyticsService.generateReport(reportType, parameters || {});
      
      res.json({
        success: true,
        data: {
          reportType,
          generatedAt: new Date().toISOString(),
          data: report
        }
      });
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get real-time dashboard metrics
   */
  async getRealTimeDashboard(req: Request, res: Response): Promise<void> {
    try {
      const [
        overviewMetrics,
        recentAnomalies,
        activeUsers
      ] = await Promise.all([
        this.analyticsService.getOverviewMetrics(),
        this.analyticsService.detectAnomalies(),
        this.analyticsService.getUserBehaviorData()
      ]);

      const dashboard = {
        overview: overviewMetrics,
        anomalies: recentAnomalies.slice(0, 5), // Latest 5 anomalies
        activeUsers: activeUsers.deviceBreakdown,
        lastUpdated: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Error getting real-time dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get platform health metrics
   */
  async getPlatformHealth(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.analyticsService.getOverviewMetrics();
      
      const health = {
        status: 'healthy',
        uptime: process.uptime(),
        transactionSuccessRate: metrics.transactionSuccessRate,
        activeUsers: metrics.activeUsers,
        systemLoad: {
          cpu: process.cpuUsage(),
          memory: process.memoryUsage()
        },
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Error getting platform health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve platform health',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      const format = req.query.format as string || 'json';
      
      const [
        overview,
        sales,
        userBehavior
      ] = await Promise.all([
        this.analyticsService.getOverviewMetrics(startDate, endDate),
        this.analyticsService.getSalesAnalytics(startDate, endDate),
        this.analyticsService.getUserBehaviorData(startDate, endDate)
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        dateRange: { startDate, endDate },
        overview,
        sales,
        userBehavior
      };

      if (format === 'csv') {
        // Convert to CSV format
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
        
        // Simple CSV conversion for overview metrics
        const csvData = [
          'Metric,Value',
          `Total Users,${overview.totalUsers}`,
          `Total Orders,${overview.totalOrders}`,
          `Total Revenue,${overview.totalRevenue}`,
          `Conversion Rate,${overview.conversionRate}%`,
          `Transaction Success Rate,${overview.transactionSuccessRate}%`
        ].join('\n');
        
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.json');
        res.json(exportData);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export analytics data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const analyticsController = new AnalyticsController();
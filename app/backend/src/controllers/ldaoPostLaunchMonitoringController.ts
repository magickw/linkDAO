import { Request, Response } from 'express';
import { ldaoPostLaunchMonitoringService } from '../services/ldaoPostLaunchMonitoringService';
import { logger } from '../utils/logger';

export class LDAOPostLaunchMonitoringController {
  async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      const timeRange = {
        start: startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate as string) : new Date()
      };

      const metrics = await ldaoPostLaunchMonitoringService.getSystemMetrics(timeRange);
      
      res.json({
        success: true,
        data: metrics,
        timeRange
      });
    } catch (error) {
      logger.error('Error getting system metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system metrics'
      });
    }
  }

  async getUserBehaviorAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      const timeRange = {
        start: startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate as string) : new Date()
      };

      const analytics = await ldaoPostLaunchMonitoringService.analyzeUserBehavior(timeRange);
      
      res.json({
        success: true,
        data: analytics,
        timeRange
      });
    } catch (error) {
      logger.error('Error getting user behavior analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user behavior analytics'
      });
    }
  }

  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      const timeRange = {
        start: startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate as string) : new Date()
      };

      const performance = await ldaoPostLaunchMonitoringService.getPerformanceMetrics(timeRange);
      
      res.json({
        success: true,
        data: performance,
        timeRange
      });
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics'
      });
    }
  }

  async getOptimizationRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const recommendations = await ldaoPostLaunchMonitoringService.generateOptimizationRecommendations();
      
      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length
      });
    } catch (error) {
      logger.error('Error getting optimization recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve optimization recommendations'
      });
    }
  }

  async getFeatureRoadmap(req: Request, res: Response): Promise<void> {
    try {
      const roadmap = await ldaoPostLaunchMonitoringService.createFeatureRoadmap();
      
      res.json({
        success: true,
        data: roadmap
      });
    } catch (error) {
      logger.error('Error getting feature roadmap:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve feature roadmap'
      });
    }
  }

  async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const [metrics, analytics, performance, recommendations] = await Promise.all([
        ldaoPostLaunchMonitoringService.getSystemMetrics(timeRange),
        ldaoPostLaunchMonitoringService.analyzeUserBehavior(timeRange),
        ldaoPostLaunchMonitoringService.getPerformanceMetrics(timeRange),
        ldaoPostLaunchMonitoringService.generateOptimizationRecommendations()
      ]);

      res.json({
        success: true,
        data: {
          metrics,
          analytics,
          performance,
          recommendations: recommendations.slice(0, 3), // Top 3 recommendations
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data'
      });
    }
  }

  async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const timeRange = {
        start: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        end: new Date()
      };

      const metrics = await ldaoPostLaunchMonitoringService.getSystemMetrics(timeRange);
      const performance = await ldaoPostLaunchMonitoringService.getPerformanceMetrics(timeRange);

      const healthStatus = {
        overall: 'healthy',
        components: {
          api: performance.errorRates['/api/ldao/purchase'] < 0.05 ? 'healthy' : 'degraded',
          database: performance.databaseQueryPerformance['purchase_queries'] < 100 ? 'healthy' : 'slow',
          blockchain: performance.smartContractGasUsage['token_purchase'] < 100000 ? 'healthy' : 'expensive',
          cache: performance.cacheHitRates['price_cache'] > 0.8 ? 'healthy' : 'degraded'
        },
        metrics: {
          errorRate: metrics.errorRate,
          responseTime: metrics.responseTime,
          conversionRate: metrics.conversionRate
        },
        timestamp: new Date().toISOString()
      };

      // Determine overall health
      const componentStatuses = Object.values(healthStatus.components);
      if (componentStatuses.includes('degraded') || componentStatuses.includes('slow')) {
        healthStatus.overall = 'degraded';
      }
      if (componentStatuses.includes('expensive')) {
        healthStatus.overall = 'warning';
      }

      res.json({
        success: true,
        data: healthStatus
      });
    } catch (error) {
      logger.error('Error getting health status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve health status'
      });
    }
  }

  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { severity, limit = 50 } = req.query;
      
      // Mock alerts data - in practice, retrieve from alerting system
      const alerts = [
        {
          id: '1',
          type: 'high_error_rate',
          severity: 'critical',
          message: 'Purchase API error rate exceeded 5%',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          resolved: false
        },
        {
          id: '2',
          type: 'slow_response',
          severity: 'warning',
          message: 'DEX trading response time above 2 seconds',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          resolved: true
        },
        {
          id: '3',
          type: 'low_conversion',
          severity: 'warning',
          message: 'Conversion rate dropped below 2%',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          resolved: false
        }
      ];

      let filteredAlerts = alerts;
      if (severity) {
        filteredAlerts = alerts.filter(alert => alert.severity === severity);
      }

      res.json({
        success: true,
        data: filteredAlerts.slice(0, Number(limit)),
        total: filteredAlerts.length
      });
    } catch (error) {
      logger.error('Error getting alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alerts'
      });
    }
  }

  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { userId } = req.body;

      // Mock alert acknowledgment - in practice, update alerting system
      logger.info(`Alert ${alertId} acknowledged by user ${userId}`);

      res.json({
        success: true,
        message: 'Alert acknowledged successfully'
      });
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert'
      });
    }
  }

  async exportMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { format = 'json', startDate, endDate } = req.query;
      
      const timeRange = {
        start: startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate as string) : new Date()
      };

      const [metrics, analytics, performance] = await Promise.all([
        ldaoPostLaunchMonitoringService.getSystemMetrics(timeRange),
        ldaoPostLaunchMonitoringService.analyzeUserBehavior(timeRange),
        ldaoPostLaunchMonitoringService.getPerformanceMetrics(timeRange)
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        timeRange,
        metrics,
        analytics,
        performance
      };

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=ldao-metrics.csv');
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=ldao-metrics.json');
        res.json(exportData);
      }
    } catch (error) {
      logger.error('Error exporting metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export metrics'
      });
    }
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion - in practice, use a proper CSV library
    const headers = ['Metric', 'Value', 'Timestamp'];
    const rows = [
      ['Total Purchases', data.metrics.totalPurchases, data.exportDate],
      ['Total Volume', data.metrics.totalVolume, data.exportDate],
      ['Conversion Rate', data.metrics.conversionRate, data.exportDate],
      ['Error Rate', data.metrics.errorRate, data.exportDate],
      ['Response Time', data.metrics.responseTime, data.exportDate]
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export const ldaoPostLaunchMonitoringController = new LDAOPostLaunchMonitoringController();
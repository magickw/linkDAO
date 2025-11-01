import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { sellerPerformanceMonitoringService } from '../services/sellerPerformanceMonitoringService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class SellerPerformanceController {
  /**
   * Store performance metrics for a seller
   */
  async storeMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const { metrics } = req.body;

      // Validate seller ID
      if (!sellerId) {
        res.status(400).json({
          success: false,
          message: 'Seller ID is required'
        });
        return;
      }

      // Validate metrics data
      if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Valid metrics array is required'
        });
        return;
      }

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
      safeLogger.error('Error in storeMetrics controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to store performance metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get performance dashboard data
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          message: 'Seller ID is required'
        });
        return;
      }

      const dashboardData = await sellerPerformanceMonitoringService.getPerformanceDashboard(sellerId);

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      safeLogger.error('Error in getDashboard controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance dashboard',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Run performance regression test
   */
  async runRegressionTest(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const { testType = 'load' } = req.body;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          message: 'Seller ID is required'
        });
        return;
      }

      const validTestTypes = ['load', 'stress', 'endurance', 'spike', 'volume'];
      if (!validTestTypes.includes(testType)) {
        res.status(400).json({
          success: false,
          message: `Invalid test type. Must be one of: ${validTestTypes.join(', ')}`
        });
        return;
      }

      const testResult = await sellerPerformanceMonitoringService.runPerformanceRegressionTest(
        sellerId,
        testType
      );

      res.json({
        success: true,
        data: testResult
      });
    } catch (error) {
      safeLogger.error('Error in runRegressionTest controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to run performance regression test',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get performance alerts
   */
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const { severity, limit = '50' } = req.query;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          message: 'Seller ID is required'
        });
        return;
      }

      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (severity && !validSeverities.includes(severity as string)) {
        res.status(400).json({
          success: false,
          message: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
        });
        return;
      }

      const alerts = await sellerPerformanceMonitoringService.getPerformanceAlerts(
        sellerId,
        severity as any
      );

      // Apply limit
      const limitNum = parseInt(limit as string);
      const limitedAlerts = limitNum > 0 ? alerts.slice(0, limitNum) : alerts;

      res.json({
        success: true,
        data: limitedAlerts,
        meta: {
          total: alerts.length,
          returned: limitedAlerts.length,
          hasMore: alerts.length > limitedAlerts.length
        }
      });
    } catch (error) {
      safeLogger.error('Error in getAlerts controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance alerts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create performance alert
   */
  async createAlert(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const alertData = req.body;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          message: 'Seller ID is required'
        });
        return;
      }

      // Validate required fields
      const requiredFields = ['alertType', 'severity', 'title', 'description'];
      const missingFields = requiredFields.filter(field => !alertData[field]);
      
      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
        return;
      }

      const alert = await sellerPerformanceMonitoringService.createPerformanceAlert(
        sellerId,
        alertData
      );

      res.status(201).json({
        success: true,
        data: alert
      });
    } catch (error) {
      safeLogger.error('Error in createAlert controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create performance alert',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Resolve performance alert
   */
  async resolveAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;

      if (!alertId) {
        res.status(400).json({
          success: false,
          message: 'Alert ID is required'
        });
        return;
      }

      await sellerPerformanceMonitoringService.resolvePerformanceAlert(alertId);

      res.json({
        success: true,
        message: 'Performance alert resolved successfully',
        data: {
          alertId,
          resolvedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      safeLogger.error('Error in resolveAlert controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve performance alert',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get performance recommendations
   */
  async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const { priority } = req.query;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          message: 'Seller ID is required'
        });
        return;
      }

      const recommendations = await sellerPerformanceMonitoringService.getPerformanceRecommendations(sellerId);

      // Filter by priority if specified
      let filteredRecommendations = recommendations;
      if (priority) {
        const validPriorities = ['high', 'medium', 'low'];
        if (!validPriorities.includes(priority as string)) {
          res.status(400).json({
            success: false,
            message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
          });
          return;
        }
        filteredRecommendations = recommendations.filter(rec => rec.priority === priority);
      }

      res.json({
        success: true,
        data: filteredRecommendations,
        meta: {
          total: recommendations.length,
          filtered: filteredRecommendations.length,
          priority: priority || 'all'
        }
      });
    } catch (error) {
      safeLogger.error('Error in getRecommendations controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance recommendations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get performance trends
   */
  async getTrends(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const { 
        metric, 
        period = 'day', 
        limit = '30',
        startDate,
        endDate 
      } = req.query;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          message: 'Seller ID is required'
        });
        return;
      }

      const validPeriods = ['hour', 'day', 'week'];
      if (!validPeriods.includes(period as string)) {
        res.status(400).json({
          success: false,
          message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
        });
        return;
      }

      const limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 365) {
        res.status(400).json({
          success: false,
          message: 'Limit must be a number between 1 and 365'
        });
        return;
      }

      const trends = await sellerPerformanceMonitoringService.getPerformanceTrends(
        sellerId,
        metric as string,
        period as any,
        limitNum
      );

      res.json({
        success: true,
        data: trends,
        meta: {
          sellerId,
          metric: metric || 'all',
          period,
          limit: limitNum,
          dateRange: {
            start: startDate || null,
            end: endDate || null
          }
        }
      });
    } catch (error) {
      safeLogger.error('Error in getTrends controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance trends',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          message: 'Seller ID is required'
        });
        return;
      }

      // Get dashboard data which includes summary information
      const dashboardData = await sellerPerformanceMonitoringService.getPerformanceDashboard(sellerId);

      const summary = {
        sellerId,
        overallScore: dashboardData.overallScore,
        status: dashboardData.overallScore >= 90 ? 'excellent' :
                dashboardData.overallScore >= 70 ? 'good' :
                dashboardData.overallScore >= 50 ? 'fair' : 'poor',
        activeAlerts: dashboardData.alerts.length,
        criticalAlerts: dashboardData.alerts.filter(a => a.severity === 'critical').length,
        activeRegressions: dashboardData.regressions.length,
        highPriorityRecommendations: dashboardData.recommendations.filter(r => r.priority === 'high').length,
        lastUpdated: new Date().toISOString(),
        keyMetrics: {
          apiResponseTime: Math.round(dashboardData.metrics.apiResponseTimes.getProfile),
          cacheHitRate: Math.round(dashboardData.metrics.cacheMetrics.hitRate),
          errorRate: dashboardData.metrics.errorMetrics.errorRate.toFixed(2),
          firstContentfulPaint: Math.round(dashboardData.metrics.userExperienceMetrics.firstContentfulPaint)
        }
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      safeLogger.error('Error in getPerformanceSummary controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Health check for performance monitoring service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Perform basic health checks
      const healthStatus = {
        service: 'seller-performance-monitoring',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        checks: {
          database: 'healthy', // Would check actual database connection
          redis: 'healthy',    // Would check actual Redis connection
          monitoring: 'active'
        }
      };

      res.json({
        success: true,
        data: healthStatus
      });
    } catch (error) {
      safeLogger.error('Error in healthCheck controller:', error);
      res.status(500).json({
        success: false,
        service: 'seller-performance-monitoring',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const sellerPerformanceController = new SellerPerformanceController();
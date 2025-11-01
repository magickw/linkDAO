import { Router, Request, Response } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { dataOperationMonitoringService } from '../services/dataOperationMonitoringService';
import { csrfProtection } from '../middleware/csrfProtection';
import { monitoringDashboardService } from '../services/monitoringDashboardService';
import { csrfProtection } from '../middleware/csrfProtection';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { csrfProtection } from '../middleware/csrfProtection';
import { dataIssueAlertingService } from '../services/dataIssueAlertingService';
import { csrfProtection } from '../middleware/csrfProtection';
import { userExperienceMetricsService } from '../services/userExperienceMetricsService';
import { csrfProtection } from '../middleware/csrfProtection';
import { logger } from '../utils/logger';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Get comprehensive monitoring overview
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const dataMetrics = dataOperationMonitoringService.getMetrics();
    const dashboardData = monitoringDashboardService.getDashboardData();
    const performanceMetrics = performanceMonitoringService.getMetrics();
    const healthStatus = dataOperationMonitoringService.getHealthStatus();

    res.json({
      status: 'success',
      data: {
        health: healthStatus,
        summary: {
          database: {
            totalQueries: dataMetrics.database.overall.queryCount,
            averageQueryTime: dataMetrics.database.overall.averageQueryTime,
            errorRate: dataMetrics.database.overall.queryCount > 0 
              ? (dataMetrics.database.overall.errorCount / dataMetrics.database.overall.queryCount) * 100 
              : 0,
            slowQueries: dataMetrics.database.overall.slowQueryCount,
            activeConnections: dataMetrics.database.overall.activeConnections
          },
          api: {
            totalEndpoints: dataMetrics.api.endpoints.size,
            totalRequests: performanceMetrics.overall.requestCount,
            averageResponseTime: performanceMetrics.overall.averageResponseTime,
            errorRate: performanceMetrics.overall.errorRate * 100,
            throughput: performanceMetrics.overall.throughput
          },
          alerts: {
            total: dataMetrics.alerts.length,
            critical: dataMetrics.alerts.filter(a => a.severity === 'critical').length,
            unresolved: dataMetrics.alerts.filter(a => !a.resolved).length,
            recent: dataMetrics.alerts.filter(a => 
              Date.now() - a.timestamp.getTime() < 3600000 // Last hour
            ).length
          }
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get monitoring overview', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve monitoring data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get database metrics
router.get('/database', async (req: Request, res: Response) => {
  try {
    const metrics = dataOperationMonitoringService.getDatabaseMetrics();
    
    res.json({
      status: 'success',
      data: {
        overall: metrics.overall,
        slowestQueries: metrics.slowestQueries.slice(0, 10),
        slowestTables: metrics.slowestTables.slice(0, 10),
        errorProneQueries: metrics.errorProneQueries.slice(0, 10),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get database metrics', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve database metrics'
    });
  }
});

// Get API metrics
router.get('/api', async (req: Request, res: Response) => {
  try {
    const metrics = dataOperationMonitoringService.getAPIMetrics();
    
    res.json({
      status: 'success',
      data: {
        endpoints: metrics.endpoints.slice(0, 20), // Limit to top 20
        slowestEndpoints: metrics.slowestEndpoints.slice(0, 10),
        errorProneEndpoints: metrics.errorProneEndpoints.slice(0, 10),
        mostUsedEndpoints: metrics.mostUsedEndpoints.slice(0, 10),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get API metrics', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve API metrics'
    });
  }
});

// Get alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { type, severity, limit = '50', resolved } = req.query;
    let alerts = dataOperationMonitoringService.getRecentAlerts(parseInt(limit as string));

    // Filter by type if specified
    if (type) {
      alerts = dataOperationMonitoringService.getAlertsByType(type as any);
    }

    // Filter by severity if specified
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Filter by resolved status if specified
    if (resolved !== undefined) {
      const isResolved = resolved === 'true';
      alerts = alerts.filter(alert => !!alert.resolved === isResolved);
    }

    res.json({
      status: 'success',
      data: {
        alerts: alerts.slice(0, parseInt(limit as string)),
        summary: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length,
          resolved: alerts.filter(a => a.resolved).length,
          unresolved: alerts.filter(a => !a.resolved).length
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get alerts', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve alerts'
    });
  }
});

// Resolve alert
router.post('/alerts/:alertId/resolve', csrfProtection,  async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const resolved = dataOperationMonitoringService.resolveAlert(alertId);

    if (resolved) {
      res.json({
        status: 'success',
        message: 'Alert resolved successfully',
        data: { alertId, resolvedAt: new Date().toISOString() }
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'Alert not found or already resolved'
      });
    }
  } catch (error) {
    logger.error('Failed to resolve alert', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to resolve alert'
    });
  }
});

// Get performance trends
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const { hours = '24' } = req.query;
    const hoursNum = parseInt(hours as string);
    
    const trends = monitoringDashboardService.getPerformanceTrends(hoursNum);
    const healthStatus = dataOperationMonitoringService.getHealthStatus();

    res.json({
      status: 'success',
      data: {
        trends,
        currentHealth: healthStatus,
        timeRange: {
          hours: hoursNum,
          from: new Date(Date.now() - hoursNum * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get performance trends', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve performance trends'
    });
  }
});

// Get comprehensive report
router.get('/report', async (req: Request, res: Response) => {
  try {
    const report = dataOperationMonitoringService.generateReport();
    const performanceReport = performanceMonitoringService.generateReport();
    const dashboardData = monitoringDashboardService.getDashboardData();

    res.json({
      status: 'success',
      data: {
        dataOperations: report,
        performance: performanceReport,
        system: {
          current: dashboardData.current,
          alertRules: dashboardData.rules.length,
          totalAlerts: dashboardData.alerts.length
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to generate monitoring report', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate monitoring report'
    });
  }
});

// Get health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const dataHealth = dataOperationMonitoringService.getHealthStatus();
    const performanceHealth = performanceMonitoringService.getHealthStatus();
    
    const overallStatus = dataHealth.status === 'unhealthy' || performanceHealth.status === 'unhealthy' 
      ? 'unhealthy' 
      : dataHealth.status === 'degraded' || performanceHealth.status === 'degraded'
      ? 'degraded'
      : 'healthy';

    res.json({
      status: 'success',
      data: {
        overall: {
          status: overallStatus,
          timestamp: new Date().toISOString()
        },
        dataOperations: dataHealth,
        performance: performanceHealth,
        services: {
          monitoring: 'healthy',
          alerting: 'healthy',
          metrics: 'healthy'
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get health status', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve health status'
    });
  }
});

// Get specific query metrics
router.get('/database/queries/:queryType', async (req: Request, res: Response) => {
  try {
    const { queryType } = req.params;
    const metrics = dataOperationMonitoringService.getMetrics();
    
    const queryMetrics = Array.from(metrics.database.queries.entries())
      .filter(([key]) => key.includes(queryType))
      .map(([key, metrics]) => ({ queryKey: key, ...metrics }));

    if (queryMetrics.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Query type not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        queryType,
        metrics: queryMetrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get query metrics', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve query metrics'
    });
  }
});

// Get specific endpoint metrics
router.get('/api/endpoints/*', async (req: Request, res: Response) => {
  try {
    const endpoint = req.params[0]; // Get the full path after /endpoints/
    const { method = 'GET' } = req.query;
    
    const metrics = dataOperationMonitoringService.getMetrics();
    const endpointKey = `${method} /${endpoint}`;
    const endpointMetrics = metrics.api.endpoints.get(endpointKey);

    if (!endpointMetrics) {
      return res.status(404).json({
        status: 'error',
        message: 'Endpoint metrics not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        endpoint: endpointKey,
        metrics: endpointMetrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get endpoint metrics', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve endpoint metrics'
    });
  }
});

// Get alerting status and configuration
router.get('/alerting', async (req: Request, res: Response) => {
  try {
    const alertConfigs = dataIssueAlertingService.getAlertConfigs();
    const activeAlerts = dataIssueAlertingService.getActiveAlerts();
    const consistencyChecks = dataIssueAlertingService.getConsistencyChecks();

    res.json({
      status: 'success',
      data: {
        alertConfigs: alertConfigs.map(config => ({
          id: config.id,
          name: config.name,
          description: config.description,
          enabled: config.enabled,
          severity: config.severity,
          cooldownMinutes: config.cooldownMinutes,
          conditionCount: config.conditions.length,
          actionCount: config.actions.length
        })),
        activeAlerts: activeAlerts.map(alert => ({
          id: alert.id,
          name: alert.name,
          message: alert.message,
          severity: alert.severity,
          triggeredAt: alert.triggeredAt,
          escalationLevel: alert.escalationLevel,
          notificationsSent: alert.notificationsSent
        })),
        consistencyChecks: consistencyChecks.map(check => ({
          id: check.id,
          name: check.name,
          enabled: check.enabled,
          intervalMinutes: check.intervalMinutes,
          lastChecked: check.lastChecked
        })),
        summary: {
          totalConfigs: alertConfigs.length,
          enabledConfigs: alertConfigs.filter(c => c.enabled).length,
          activeAlerts: activeAlerts.length,
          criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
          totalChecks: consistencyChecks.length,
          enabledChecks: consistencyChecks.filter(c => c.enabled).length
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get alerting status', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve alerting status'
    });
  }
});

// Acknowledge alert
router.post('/alerting/alerts/:alertId/acknowledge', csrfProtection,  async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;

    if (!acknowledgedBy) {
      return res.status(400).json({
        status: 'error',
        message: 'acknowledgedBy is required'
      });
    }

    const acknowledged = dataIssueAlertingService.acknowledgeAlert(alertId, acknowledgedBy);

    if (acknowledged) {
      res.json({
        status: 'success',
        message: 'Alert acknowledged successfully',
        data: { alertId, acknowledgedBy, acknowledgedAt: new Date().toISOString() }
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'Alert not found or already acknowledged'
      });
    }
  } catch (error) {
    logger.error('Failed to acknowledge alert', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to acknowledge alert'
    });
  }
});

// Resolve alerting alert
router.post('/alerting/alerts/:alertId/resolve', csrfProtection,  async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const resolved = await dataIssueAlertingService.resolveAlert(alertId);

    if (resolved) {
      res.json({
        status: 'success',
        message: 'Alert resolved successfully',
        data: { alertId, resolvedAt: new Date().toISOString() }
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'Alert not found or already resolved'
      });
    }
  } catch (error) {
    logger.error('Failed to resolve alerting alert', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to resolve alert'
    });
  }
});

// Get user experience metrics
router.get('/ux', async (req: Request, res: Response) => {
  try {
    const { timeWindow = '60' } = req.query;
    const timeWindowMinutes = parseInt(timeWindow as string);
    
    const uxReport = userExperienceMetricsService.generateUXReport(timeWindowMinutes);

    res.json({
      status: 'success',
      data: {
        ...uxReport,
        timeWindow: {
          minutes: timeWindowMinutes,
          from: new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get UX metrics', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve UX metrics'
    });
  }
});

// Record UX metrics (for frontend to report)
router.post('/ux/page-load', csrfProtection,  async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      page,
      loadTime,
      timeToFirstByte,
      domContentLoaded,
      firstContentfulPaint,
      largestContentfulPaint,
      cumulativeLayoutShift,
      firstInputDelay
    } = req.body;

    if (!sessionId || !page || loadTime === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'sessionId, page, and loadTime are required'
      });
    }

    userExperienceMetricsService.recordPageLoad({
      sessionId,
      page,
      loadTime,
      timeToFirstByte: timeToFirstByte || 0,
      domContentLoaded: domContentLoaded || 0,
      firstContentfulPaint: firstContentfulPaint || 0,
      largestContentfulPaint: largestContentfulPaint || 0,
      cumulativeLayoutShift: cumulativeLayoutShift || 0,
      firstInputDelay: firstInputDelay || 0
    });

    res.json({
      status: 'success',
      message: 'Page load metrics recorded'
    });
  } catch (error) {
    logger.error('Failed to record page load metrics', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record page load metrics'
    });
  }
});

// Record UX interaction
router.post('/ux/interaction', csrfProtection,  async (req: Request, res: Response) => {
  try {
    const { sessionId, type, element, page, metadata } = req.body;

    if (!sessionId || !type || !page) {
      return res.status(400).json({
        status: 'error',
        message: 'sessionId, type, and page are required'
      });
    }

    userExperienceMetricsService.recordInteraction({
      sessionId,
      type,
      element,
      page,
      metadata
    });

    res.json({
      status: 'success',
      message: 'Interaction recorded'
    });
  } catch (error) {
    logger.error('Failed to record interaction', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record interaction'
    });
  }
});

// Record UX error
router.post('/ux/error', csrfProtection,  async (req: Request, res: Response) => {
  try {
    const { sessionId, type, message, stack, page, severity } = req.body;

    if (!sessionId || !type || !message || !page) {
      return res.status(400).json({
        status: 'error',
        message: 'sessionId, type, message, and page are required'
      });
    }

    userExperienceMetricsService.recordError({
      sessionId,
      type,
      message,
      stack,
      page,
      severity: severity || 'medium'
    });

    res.json({
      status: 'success',
      message: 'Error recorded'
    });
  } catch (error) {
    logger.error('Failed to record UX error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record UX error'
    });
  }
});

// Start UX session
router.post('/ux/session/start', csrfProtection,  async (req: Request, res: Response) => {
  try {
    const { sessionId, userAgent, userId } = req.body;

    if (!sessionId || !userAgent) {
      return res.status(400).json({
        status: 'error',
        message: 'sessionId and userAgent are required'
      });
    }

    userExperienceMetricsService.startSession(sessionId, userAgent, userId);

    res.json({
      status: 'success',
      message: 'Session started',
      data: { sessionId, startedAt: new Date().toISOString() }
    });
  } catch (error) {
    logger.error('Failed to start UX session', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to start session'
    });
  }
});

// End UX session
router.post('/ux/session/end', csrfProtection,  async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'sessionId is required'
      });
    }

    userExperienceMetricsService.endSession(sessionId);

    res.json({
      status: 'success',
      message: 'Session ended',
      data: { sessionId, endedAt: new Date().toISOString() }
    });
  } catch (error) {
    logger.error('Failed to end UX session', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to end session'
    });
  }
});

// Reset metrics (for testing/maintenance)
router.post('/reset', csrfProtection,  async (req: Request, res: Response) => {
  try {
    // Only allow in development or with proper authorization
    if (process.env.NODE_ENV === 'production' && !req.headers.authorization) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to reset metrics in production'
      });
    }

    dataOperationMonitoringService.resetMetrics();
    performanceMonitoringService.resetMetrics();
    userExperienceMetricsService.resetMetrics();
    
    logger.info('Monitoring metrics reset', {
      requestedBy: req.ip,
      timestamp: new Date().toISOString()
    });

    res.json({
      status: 'success',
      message: 'Monitoring metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to reset metrics', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset metrics'
    });
  }
});

export default router;
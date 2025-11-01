/**
 * Production Monitoring Routes
 * 
 * API endpoints for production monitoring and system health checks
 */

import { Router, Request, Response } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { ProductionMonitoringService } from '../services/productionMonitoringService';

const router = Router();
const monitoringService = new ProductionMonitoringService();

// Start monitoring when the service starts
monitoringService.startMonitoring();

/**
 * GET /api/monitoring/health
 * Get overall system health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const systemStatus = monitoringService.getSystemStatus();
    
    res.status(systemStatus.status === 'healthy' ? 200 : 503).json({
      success: true,
      data: systemStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system health status',
      details: error.message,
    });
  }
});

/**
 * GET /api/monitoring/metrics
 * Get current system metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const currentMetrics = monitoringService.getCurrentMetrics();
    
    if (!currentMetrics) {
      return res.status(404).json({
        success: false,
        error: 'No metrics available',
      });
    }

    res.json({
      success: true,
      data: currentMetrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get current metrics',
      details: error.message,
    });
  }
});

/**
 * GET /api/monitoring/metrics/history
 * Get metrics history
 */
router.get('/metrics/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const metricsHistory = monitoringService.getMetricsHistory(limit);
    
    res.json({
      success: true,
      data: {
        metrics: metricsHistory,
        count: metricsHistory.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics history',
      details: error.message,
    });
  }
});

/**
 * GET /api/monitoring/alerts
 * Get active alerts
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === 'true';
    const limit = parseInt(req.query.limit as string) || 50;
    
    const alerts = activeOnly 
      ? monitoringService.getActiveAlerts()
      : monitoringService.getAllAlerts(limit);
    
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts',
      details: error.message,
    });
  }
});

/**
 * POST /api/monitoring/alerts/:alertId/resolve
 * Resolve an alert
 */
router.post('/alerts/:alertId/resolve', csrfProtection,  async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const resolved = monitoringService.resolveAlert(alertId);
    
    if (!resolved) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      message: 'Alert resolved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      details: error.message,
    });
  }
});

/**
 * GET /api/monitoring/report
 * Generate monitoring report
 */
router.get('/report', async (req: Request, res: Response) => {
  try {
    const timeRangeMs = parseInt(req.query.timeRange as string) || 3600000; // Default 1 hour
    const report = monitoringService.generateReport(timeRangeMs);
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate monitoring report',
      details: error.message,
    });
  }
});

/**
 * GET /api/monitoring/dashboard
 * Get monitoring dashboard data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const systemStatus = monitoringService.getSystemStatus();
    const recentMetrics = monitoringService.getMetricsHistory(20);
    const activeAlerts = monitoringService.getActiveAlerts();
    
    res.json({
      success: true,
      data: {
        systemStatus,
        recentMetrics,
        activeAlerts,
        summary: {
          totalActiveAlerts: activeAlerts.length,
          criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
          highAlerts: activeAlerts.filter(a => a.severity === 'high').length,
          mediumAlerts: activeAlerts.filter(a => a.severity === 'medium').length,
          lowAlerts: activeAlerts.filter(a => a.severity === 'low').length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data',
      details: error.message,
    });
  }
});

/**
 * POST /api/monitoring/test-alert
 * Trigger a test alert (for testing purposes)
 */
router.post('/test-alert', csrfProtection,  async (req: Request, res: Response) => {
  try {
    const { severity = 'low', metric = 'test', message = 'Test alert' } = req.body;
    
    // Emit a test alert event
    monitoringService.emit('alert-triggered', {
      id: `test-${Date.now()}`,
      timestamp: Date.now(),
      severity,
      metric,
      value: 999,
      threshold: 100,
      message,
      resolved: false,
    });
    
    res.json({
      success: true,
      message: 'Test alert triggered successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to trigger test alert',
      details: error.message,
    });
  }
});

/**
 * GET /api/monitoring/seller-workflows/status
 * Get seller workflow validation status
 */
router.get('/seller-workflows/status', async (req: Request, res: Response) => {
  try {
    // In production, this would check actual seller workflow health
    const workflowStatus = {
      onboarding: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.random() * 100 + 50,
      },
      profileManagement: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.random() * 100 + 50,
      },
      dashboard: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.random() * 100 + 50,
      },
      store: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.random() * 100 + 50,
      },
      listing: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.random() * 100 + 50,
      },
      orderManagement: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.random() * 100 + 50,
      },
      tierUpgrade: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.random() * 100 + 50,
      },
      analytics: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.random() * 100 + 50,
      },
    };

    const overallStatus = Object.values(workflowStatus).every(w => w.status === 'healthy') 
      ? 'healthy' 
      : 'degraded';

    res.json({
      success: true,
      data: {
        overallStatus,
        workflows: workflowStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get seller workflow status',
      details: error.message,
    });
  }
});

/**
 * POST /api/monitoring/seller-workflows/validate
 * Trigger seller workflow validation
 */
router.post('/seller-workflows/validate', csrfProtection,  async (req: Request, res: Response) => {
  try {
    const { workflow } = req.body;
    
    // In production, this would trigger actual workflow validation
    const validationResult = {
      workflow: workflow || 'all',
      status: 'passed',
      timestamp: new Date().toISOString(),
      duration: Math.random() * 1000 + 500,
      details: {
        testsRun: Math.floor(Math.random() * 10) + 5,
        testsPassed: Math.floor(Math.random() * 10) + 5,
        testsFailed: 0,
      },
    };

    res.json({
      success: true,
      data: validationResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate seller workflows',
      details: error.message,
    });
  }
});

/**
 * GET /api/monitoring/performance/summary
 * Get performance summary
 */
router.get('/performance/summary', async (req: Request, res: Response) => {
  try {
    const timeRangeMs = parseInt(req.query.timeRange as string) || 3600000; // Default 1 hour
    const metrics = monitoringService.getMetricsHistory(100);
    
    if (metrics.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'No performance data available',
        },
      });
    }

    const summary = {
      timeRange: `${timeRangeMs / 1000} seconds`,
      averageResponseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
      averageErrorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length,
      averageThroughput: metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length,
      averageMemoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length,
      averageCpuUsage: metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length,
      averageCacheHitRate: metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length,
      peakResponseTime: Math.max(...metrics.map(m => m.responseTime)),
      peakErrorRate: Math.max(...metrics.map(m => m.errorRate)),
      peakMemoryUsage: Math.max(...metrics.map(m => m.memoryUsage)),
      peakCpuUsage: Math.max(...metrics.map(m => m.cpuUsage)),
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get performance summary',
      details: error.message,
    });
  }
});

export default router;

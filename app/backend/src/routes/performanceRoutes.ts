import { Router } from 'express';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { logger } from '../utils/logger';

const router = Router();

// Get performance metrics
router.get('/metrics', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    let timeRange;
    if (start && end) {
      timeRange = {
        start: new Date(start as string),
        end: new Date(end as string)
      };
    }

    const metrics = performanceMonitoringService.getMetrics(timeRange);
    
    res.json({
      success: true,
      data: metrics,
      count: metrics.length
    });
  } catch (error) {
    logger.error('Failed to fetch performance metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics'
    });
  }
});

// Get performance report
router.get('/report', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    let timeRange;
    if (start && end) {
      timeRange = {
        start: new Date(start as string),
        end: new Date(end as string)
      };
    }

    const report = performanceMonitoringService.getPerformanceReport(timeRange);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Failed to generate performance report', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report'
    });
  }
});

// Get performance alerts
router.get('/alerts', async (req, res) => {
  try {
    const { resolved } = req.query;
    const alerts = performanceMonitoringService.getAlerts(resolved === 'true');
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    logger.error('Failed to fetch performance alerts', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance alerts'
    });
  }
});

// Resolve alert
router.post('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const success = performanceMonitoringService.resolveAlert(alertId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
  } catch (error) {
    logger.error('Failed to resolve performance alert', { error, alertId: req.params.alertId });
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert'
    });
  }
});

// Get health status
router.get('/health', async (req, res) => {
  try {
    const healthStatus = performanceMonitoringService.getHealthStatus();
    
    res.status(healthStatus.status === 'critical' ? 503 : 200).json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    logger.error('Failed to fetch health status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health status'
    });
  }
});

// Update thresholds
router.put('/thresholds', async (req, res) => {
  try {
    const thresholds = req.body;
    
    // Validate thresholds
    const validThresholds = {
      responseTime: thresholds.responseTime && thresholds.responseTime > 0,
      errorRate: thresholds.errorRate && thresholds.errorRate >= 0 && thresholds.errorRate <= 100,
      memoryUsage: thresholds.memoryUsage && thresholds.memoryUsage > 0,
      cpuUsage: thresholds.cpuUsage && thresholds.cpuUsage >= 0 && thresholds.cpuUsage <= 100,
      databaseQueryTime: thresholds.databaseQueryTime && thresholds.databaseQueryTime > 0
    };

    if (!Object.values(validThresholds).every(Boolean)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid threshold values'
      });
    }

    performanceMonitoringService.updateThresholds(thresholds);
    
    res.json({
      success: true,
      message: 'Thresholds updated successfully',
      data: thresholds
    });
  } catch (error) {
    logger.error('Failed to update performance thresholds', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update thresholds'
    });
  }
});

// Get real-time metrics stream (Server-Sent Events)
router.get('/stream', async (req, res) => {
  try {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial data
    const initialReport = performanceMonitoringService.getPerformanceReport();
    res.write(`data: ${JSON.stringify({ type: 'report', data: initialReport })}\n\n`);

    // Listen for new metrics and alerts
    const onMetric = (metric: any) => {
      res.write(`data: ${JSON.stringify({ type: 'metric', data: metric })}\n\n`);
    };

    const onAlert = (alert: any) => {
      res.write(`data: ${JSON.stringify({ type: 'alert', data: alert })}\n\n`);
    };

    const onAlertResolved = (alert: any) => {
      res.write(`data: ${JSON.stringify({ type: 'alert_resolved', data: alert })}\n\n`);
    };

    performanceMonitoringService.on('metric', onMetric);
    performanceMonitoringService.on('alert', onAlert);
    performanceMonitoringService.on('alertResolved', onAlertResolved);

    // Send periodic health updates
    const healthInterval = setInterval(() => {
      const healthStatus = performanceMonitoringService.getHealthStatus();
      res.write(`data: ${JSON.stringify({ type: 'health', data: healthStatus })}\n\n`);
    }, 30000); // Every 30 seconds

    // Clean up on disconnect
    req.on('close', () => {
      performanceMonitoringService.removeListener('metric', onMetric);
      performanceMonitoringService.removeListener('alert', onAlert);
      performanceMonitoringService.removeListener('alertResolved', onAlertResolved);
      clearInterval(healthInterval);
    });

  } catch (error) {
    logger.error('Failed to establish performance stream', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to establish performance stream'
    });
  }
});

export default router;
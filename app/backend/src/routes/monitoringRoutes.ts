import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { monitoringDashboardService } from '../services/monitoringDashboardService';
import { asyncHandler } from '../middleware/globalErrorHandler';
import { successResponse, errorResponse } from '../utils/apiResponse';

const router = Router();

// Get dashboard overview
router.get('/dashboard', asyncHandler(async (req, res) => {
  const timeRange = req.query.timeRange ? {
    start: new Date(req.query.start as string),
    end: new Date(req.query.end as string)
  } : undefined;

  const dashboardData = monitoringDashboardService.getDashboardData(timeRange);
  
  successResponse(res, {
    current: dashboardData.current,
    summary: {
      totalMetrics: dashboardData.history.length,
      totalAlerts: dashboardData.alerts.length,
      activeRules: dashboardData.rules.filter(r => r.enabled).length,
      systemStatus: dashboardData.current?.system.status || 'unknown'
    },
    recentAlerts: dashboardData.alerts.slice(-10),
    activeRules: dashboardData.rules.filter(r => r.enabled)
  });
}));

// Get performance trends
router.get('/trends', asyncHandler(async (req, res) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const trends = monitoringDashboardService.getPerformanceTrends(hours);
  
  successResponse(res, {
    timeRange: `${hours} hours`,
    trends,
    summary: {
      dataPoints: trends.responseTime.length,
      avgResponseTime: trends.responseTime.length > 0 ? 
        trends.responseTime.reduce((sum, t) => sum + t.avg, 0) / trends.responseTime.length : 0,
      avgThroughput: trends.throughput.length > 0 ?
        trends.throughput.reduce((sum, t) => sum + t.value, 0) / trends.throughput.length : 0,
      avgErrorRate: trends.errorRate.length > 0 ?
        trends.errorRate.reduce((sum, t) => sum + t.value, 0) / trends.errorRate.length : 0
    }
  });
}));

// Get alert statistics
router.get('/alerts/statistics', asyncHandler(async (req, res) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const stats = monitoringDashboardService.getAlertStatistics(hours);
  
  successResponse(res, {
    timeRange: `${hours} hours`,
    statistics: stats,
    alertRate: stats.total / hours, // alerts per hour
    criticalRate: (stats.critical / stats.total) * 100 || 0 // percentage of critical alerts
  });
}));

// Get all alerts with filtering
router.get('/alerts', asyncHandler(async (req, res) => {
  const { severity, acknowledged, resolved, limit = '50' } = req.query;
  const dashboardData = monitoringDashboardService.getDashboardData();
  
  let alerts = dashboardData.alerts;
  
  // Apply filters
  if (severity) {
    alerts = alerts.filter(a => a.severity === severity);
  }
  
  if (acknowledged !== undefined) {
    const isAcknowledged = acknowledged === 'true';
    alerts = alerts.filter(a => !!a.acknowledged === isAcknowledged);
  }
  
  if (resolved !== undefined) {
    const isResolved = resolved === 'true';
    alerts = alerts.filter(a => !!a.resolved === isResolved);
  }
  
  // Sort by timestamp (newest first) and limit
  alerts = alerts
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, parseInt(limit as string));
  
  successResponse(res, {
    alerts: alerts.map(alert => ({
      ...alert,
      timestamp: new Date(alert.timestamp).toISOString(),
      resolved: alert.resolved ? new Date(alert.resolved).toISOString() : undefined,
      age: Date.now() - alert.timestamp
    })),
    total: alerts.length,
    filters: { severity, acknowledged, resolved, limit }
  });
}));

// Acknowledge alert
router.post('/alerts/:alertId/acknowledge', csrfProtection,  asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const success = monitoringDashboardService.acknowledgeAlert(alertId);
  
  if (success) {
    successResponse(res, {
      acknowledged: true,
      alertId,
      timestamp: new Date().toISOString()
    });
  } else {
    errorResponse(res, 'ALERT_NOT_FOUND', `Alert ${alertId} not found`, 404);
  }
}));

// Resolve alert
router.post('/alerts/:alertId/resolve', csrfProtection,  asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const success = monitoringDashboardService.resolveAlert(alertId);
  
  if (success) {
    successResponse(res, {
      resolved: true,
      alertId,
      timestamp: new Date().toISOString()
    });
  } else {
    errorResponse(res, 'ALERT_NOT_FOUND', `Alert ${alertId} not found`, 404);
  }
}));

// Get alert rules
router.get('/rules', asyncHandler(async (req, res) => {
  const dashboardData = monitoringDashboardService.getDashboardData();
  
  successResponse(res, {
    rules: dashboardData.rules.map(rule => ({
      ...rule,
      lastTriggered: monitoringDashboardService['lastAlertTimes'].get(rule.id) || null
    })),
    summary: {
      total: dashboardData.rules.length,
      enabled: dashboardData.rules.filter(r => r.enabled).length,
      disabled: dashboardData.rules.filter(r => !r.enabled).length,
      critical: dashboardData.rules.filter(r => r.severity === 'critical').length,
      warnings: dashboardData.rules.filter(r => r.severity === 'warning').length
    }
  });
}));

// Update alert rule
router.put('/rules/:ruleId', csrfProtection,  asyncHandler(async (req, res) => {
  const { ruleId } = req.params;
  const updates = req.body;
  
  // Validate updates
  const allowedFields = ['enabled', 'cooldown', 'severity'];
  const validUpdates: any = {};
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      validUpdates[field] = updates[field];
    }
  }
  
  if (Object.keys(validUpdates).length === 0) {
    return errorResponse(res, 'INVALID_UPDATES', 'No valid fields to update', 400);
  }
  
  try {
    monitoringDashboardService.updateAlertRule(ruleId, validUpdates);
    
    successResponse(res, {
      updated: true,
      ruleId,
      updates: validUpdates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', `Failed to update rule: ${error}`, 500);
  }
}));

// Get system metrics for external monitoring tools (Prometheus format)
router.get('/metrics/prometheus', asyncHandler(async (req, res) => {
  const dashboardData = monitoringDashboardService.getDashboardData();
  const current = dashboardData.current;
  
  if (!current) {
    return errorResponse(res, 'NO_METRICS', 'No metrics available', 503);
  }
  
  // Generate Prometheus-style metrics
  const metrics = [
    `# HELP marketplace_system_status System health status (0=unhealthy, 1=degraded, 2=healthy)`,
    `# TYPE marketplace_system_status gauge`,
    `marketplace_system_status{environment="${current.system.environment}"} ${
      current.system.status === 'healthy' ? 2 : current.system.status === 'degraded' ? 1 : 0
    }`,
    
    `# HELP marketplace_uptime_seconds System uptime in seconds`,
    `# TYPE marketplace_uptime_seconds counter`,
    `marketplace_uptime_seconds ${Math.floor(current.system.uptime / 1000)}`,
    
    `# HELP marketplace_response_time_seconds Response time in seconds`,
    `# TYPE marketplace_response_time_seconds histogram`,
    `marketplace_response_time_seconds_sum ${current.performance.responseTime.avg / 1000}`,
    `marketplace_response_time_seconds_count ${current.performance.requestCount}`,
    `marketplace_response_time_seconds{quantile="0.95"} ${current.performance.responseTime.p95 / 1000}`,
    `marketplace_response_time_seconds{quantile="0.99"} ${current.performance.responseTime.p99 / 1000}`,
    
    `# HELP marketplace_error_rate Error rate percentage`,
    `# TYPE marketplace_error_rate gauge`,
    `marketplace_error_rate ${current.performance.errorRate}`,
    
    `# HELP marketplace_throughput_requests_per_second Request throughput`,
    `# TYPE marketplace_throughput_requests_per_second gauge`,
    `marketplace_throughput_requests_per_second ${current.performance.throughput}`,
    
    `# HELP marketplace_memory_usage_bytes Memory usage in bytes`,
    `# TYPE marketplace_memory_usage_bytes gauge`,
    `marketplace_memory_usage_bytes{type="used"} ${current.resources.memory.used}`,
    `marketplace_memory_usage_bytes{type="total"} ${current.resources.memory.total}`,
    
    `# HELP marketplace_memory_usage_percent Memory usage percentage`,
    `# TYPE marketplace_memory_usage_percent gauge`,
    `marketplace_memory_usage_percent ${current.resources.memory.usage}`,
    
    `# HELP marketplace_active_alerts Number of active alerts`,
    `# TYPE marketplace_active_alerts gauge`,
    `marketplace_active_alerts{severity="critical"} ${current.alerts.critical}`,
    `marketplace_active_alerts{severity="warning"} ${current.alerts.warnings}`,
    
    `# HELP marketplace_service_status Service health status (0=unhealthy, 1=degraded, 2=healthy)`,
    `# TYPE marketplace_service_status gauge`,
    ...current.services.map(service => 
      `marketplace_service_status{service="${service.name}",impact="${service.impact}"} ${
        service.status === 'healthy' ? 2 : service.status === 'degraded' ? 1 : 0
      }`
    ),
    
    `# HELP marketplace_dependency_status Dependency health status (0=unhealthy, 1=degraded, 2=healthy)`,
    `# TYPE marketplace_dependency_status gauge`,
    ...current.dependencies.map(dep => 
      `marketplace_dependency_status{dependency="${dep.name}",impact="${dep.impact}"} ${
        dep.status === 'healthy' ? 2 : dep.status === 'degraded' ? 1 : 0
      }`
    )
  ];
  
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics.join('\n') + '\n');
}));

// Get real-time metrics (for WebSocket or Server-Sent Events)
router.get('/metrics/realtime', asyncHandler(async (req, res) => {
  const dashboardData = monitoringDashboardService.getDashboardData();
  const current = dashboardData.current;
  
  if (!current) {
    return errorResponse(res, 'NO_METRICS', 'No metrics available', 503);
  }
  
  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Send initial data
  res.write(`data: ${JSON.stringify({
    type: 'metrics',
    timestamp: current.timestamp,
    data: current
  })}\n\n`);
  
  // Send updates every 30 seconds
  const interval = setInterval(() => {
    const latestData = monitoringDashboardService.getDashboardData();
    if (latestData.current) {
      res.write(`data: ${JSON.stringify({
        type: 'metrics',
        timestamp: latestData.current.timestamp,
        data: latestData.current
      })}\n\n`);
    }
  }, 30000);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
}));

// Health check for monitoring service itself
router.get('/health', (req, res) => {
  const dashboardData = monitoringDashboardService.getDashboardData();
  const isHealthy = dashboardData.current !== null;
  
  if (isHealthy) {
    successResponse(res, {
      status: 'healthy',
      metricsCount: dashboardData.history.length,
      alertsCount: dashboardData.alerts.length,
      rulesCount: dashboardData.rules.length,
      lastUpdate: dashboardData.current?.timestamp
    });
  } else {
    res.status(503).json({
      success: false,
      error: {
        code: 'MONITORING_UNHEALTHY',
        message: 'Monitoring service has no metrics data'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId
      }
    });
  }
});

// Serve monitoring dashboard HTML
router.get('/dashboard/view', (req, res) => {
  const path = require('path');
  res.sendFile(path.join(__dirname, '../public/monitoring-dashboard.html'));
});

export default router;

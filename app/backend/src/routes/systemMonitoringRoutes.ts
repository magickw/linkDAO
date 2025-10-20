/**
 * System Monitoring Routes
 * 
 * Enhanced health check and monitoring endpoints for comprehensive
 * system observability and operational insights.
 */

import { Router } from 'express';
import { healthMonitoringService } from '../services/healthMonitoringService';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/globalErrorHandler';

const router = Router();

/**
 * @route GET /api/monitoring/health/comprehensive
 * @desc Comprehensive health check with detailed service status
 * @access Public
 */
router.get('/health/comprehensive', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    const healthData = await healthMonitoringService.performComprehensiveHealthCheck();
    const responseTime = Date.now() - startTime;
    
    // Determine overall status
    const overallStatus = healthData.services.every(s => s.status === 'healthy') ? 'healthy' :
                         healthData.services.some(s => s.status === 'unhealthy' && s.critical) ? 'unhealthy' : 'degraded';
    
    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: healthData.services,
      dependencies: healthData.dependencies,
      metrics: {
        ...healthData.metrics,
        healthCheckResponseTime: responseTime
      },
      alerts: healthData.alerts || []
    };
    
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: overallStatus !== 'unhealthy',
      data: response,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId,
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Comprehensive health check failed:', error);
    errorResponse(res, 'HEALTH_CHECK_FAILED', 'Health check service unavailable', 503);
  }
}));

/**
 * @route GET /api/monitoring/metrics/performance
 * @desc Get detailed performance metrics
 * @access Public
 */
router.get('/metrics/performance', asyncHandler(async (req, res) => {
  const metrics = await healthMonitoringService.getPerformanceMetrics();
  
  successResponse(res, {
    timestamp: new Date().toISOString(),
    performance: {
      responseTime: {
        avg: metrics.responseTime.avg,
        p50: metrics.responseTime.p50,
        p95: metrics.responseTime.p95,
        p99: metrics.responseTime.p99,
        max: metrics.responseTime.max
      },
      throughput: {
        requestsPerSecond: metrics.throughput.rps,
        requestsPerMinute: metrics.throughput.rpm,
        totalRequests: metrics.throughput.total
      },
      errorRate: {
        percentage: metrics.errorRate.percentage,
        total: metrics.errorRate.total,
        byStatusCode: metrics.errorRate.byStatusCode
      },
      memory: {
        heapUsed: metrics.memory.heapUsed,
        heapTotal: metrics.memory.heapTotal,
        external: metrics.memory.external,
        rss: metrics.memory.rss,
        usagePercentage: Math.round((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100)
      },
      cpu: {
        usage: metrics.cpu.usage,
        loadAverage: metrics.cpu.loadAverage
      },
      eventLoop: {
        lag: metrics.eventLoop.lag,
        utilization: metrics.eventLoop.utilization
      }
    },
    trends: metrics.trends || {}
  });
}));

/**
 * @route GET /api/monitoring/services/:serviceName/health
 * @desc Get health status for a specific service
 * @access Public
 */
router.get('/services/:serviceName/health', asyncHandler(async (req, res) => {
  const { serviceName } = req.params;
  const serviceHealth = await healthMonitoringService.getServiceHealth(serviceName);
  
  if (!serviceHealth) {
    return errorResponse(res, 'SERVICE_NOT_FOUND', `Service '${serviceName}' not found`, 404);
  }
  
  const statusCode = serviceHealth.status === 'healthy' ? 200 :
                    serviceHealth.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    success: serviceHealth.status !== 'unhealthy',
    data: {
      service: serviceName,
      status: serviceHealth.status,
      lastCheck: serviceHealth.lastCheck,
      responseTime: serviceHealth.responseTime,
      uptime: serviceHealth.uptime,
      details: serviceHealth.details,
      metrics: serviceHealth.metrics,
      history: serviceHealth.history?.slice(-10) || [] // Last 10 checks
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId,
      version: '1.0.0'
    }
  });
}));

/**
 * @route GET /api/monitoring/database/health
 * @desc Detailed database health check
 * @access Public
 */
router.get('/database/health', asyncHandler(async (req, res) => {
  const dbHealth = await healthMonitoringService.getDatabaseHealth();
  
  successResponse(res, {
    status: dbHealth.status,
    connection: {
      active: dbHealth.connection.active,
      pool: {
        total: dbHealth.connection.pool.total,
        idle: dbHealth.connection.pool.idle,
        waiting: dbHealth.connection.pool.waiting
      }
    },
    performance: {
      queryTime: dbHealth.performance.avgQueryTime,
      slowQueries: dbHealth.performance.slowQueries,
      connectionTime: dbHealth.performance.connectionTime
    },
    storage: {
      size: dbHealth.storage.size,
      freeSpace: dbHealth.storage.freeSpace,
      usage: dbHealth.storage.usage
    },
    replication: dbHealth.replication || null,
    lastCheck: dbHealth.lastCheck
  });
}));

/**
 * @route GET /api/monitoring/cache/health
 * @desc Cache system health check
 * @access Public
 */
router.get('/cache/health', asyncHandler(async (req, res) => {
  const cacheHealth = await healthMonitoringService.getCacheHealth();
  
  successResponse(res, {
    status: cacheHealth.status,
    connection: {
      active: cacheHealth.connection.active,
      responseTime: cacheHealth.connection.responseTime
    },
    performance: {
      hitRate: cacheHealth.performance.hitRate,
      missRate: cacheHealth.performance.missRate,
      evictionRate: cacheHealth.performance.evictionRate
    },
    memory: {
      used: cacheHealth.memory.used,
      available: cacheHealth.memory.available,
      fragmentation: cacheHealth.memory.fragmentation
    },
    keys: {
      total: cacheHealth.keys.total,
      expired: cacheHealth.keys.expired,
      expiring: cacheHealth.keys.expiring
    },
    lastCheck: cacheHealth.lastCheck
  });
}));

/**
 * @route GET /api/monitoring/external-services/health
 * @desc External services health check
 * @access Public
 */
router.get('/external-services/health', asyncHandler(async (req, res) => {
  const externalHealth = await healthMonitoringService.getExternalServicesHealth();
  
  successResponse(res, {
    status: externalHealth.status,
    services: externalHealth.services.map(service => ({
      name: service.name,
      status: service.status,
      url: service.url,
      responseTime: service.responseTime,
      lastCheck: service.lastCheck,
      error: service.error || null,
      uptime: service.uptime
    })),
    summary: {
      total: externalHealth.services.length,
      healthy: externalHealth.services.filter(s => s.status === 'healthy').length,
      degraded: externalHealth.services.filter(s => s.status === 'degraded').length,
      unhealthy: externalHealth.services.filter(s => s.status === 'unhealthy').length
    }
  });
}));

/**
 * @route GET /api/monitoring/alerts
 * @desc Get active system alerts
 * @access Public
 */
router.get('/alerts', asyncHandler(async (req, res) => {
  const alerts = await healthMonitoringService.getActiveAlerts();
  
  successResponse(res, {
    alerts: alerts.map(alert => ({
      id: alert.id,
      level: alert.level,
      service: alert.service,
      message: alert.message,
      timestamp: alert.timestamp,
      acknowledged: alert.acknowledged,
      details: alert.details
    })),
    summary: {
      total: alerts.length,
      critical: alerts.filter(a => a.level === 'critical').length,
      warning: alerts.filter(a => a.level === 'warning').length,
      info: alerts.filter(a => a.level === 'info').length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length
    }
  });
}));

/**
 * @route POST /api/monitoring/alerts/:alertId/acknowledge
 * @desc Acknowledge a system alert
 * @access Public
 */
router.post('/alerts/:alertId/acknowledge', asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const { acknowledgedBy } = req.body;
  
  const result = await healthMonitoringService.acknowledgeAlert(alertId, acknowledgedBy);
  
  if (result.success) {
    successResponse(res, {
      message: 'Alert acknowledged successfully',
      alert: result.alert
    });
  } else {
    errorResponse(res, 'ALERT_NOT_FOUND', 'Alert not found or already acknowledged', 404);
  }
}));

/**
 * @route GET /api/monitoring/system/info
 * @desc Get system information and configuration
 * @access Public
 */
router.get('/system/info', asyncHandler(async (req, res) => {
  const systemInfo = await healthMonitoringService.getSystemInfo();
  
  successResponse(res, {
    system: {
      platform: systemInfo.platform,
      arch: systemInfo.arch,
      nodeVersion: systemInfo.nodeVersion,
      uptime: systemInfo.uptime,
      hostname: systemInfo.hostname
    },
    application: {
      name: systemInfo.app.name,
      version: systemInfo.app.version,
      environment: systemInfo.app.environment,
      startTime: systemInfo.app.startTime,
      pid: systemInfo.app.pid
    },
    resources: {
      memory: systemInfo.resources.memory,
      cpu: systemInfo.resources.cpu,
      disk: systemInfo.resources.disk
    },
    configuration: {
      database: {
        type: systemInfo.config.database.type,
        host: systemInfo.config.database.host,
        port: systemInfo.config.database.port,
        ssl: systemInfo.config.database.ssl
      },
      cache: {
        type: systemInfo.config.cache.type,
        host: systemInfo.config.cache.host,
        port: systemInfo.config.cache.port
      },
      features: systemInfo.config.features
    }
  });
}));

/**
 * @route GET /api/monitoring/logs/recent
 * @desc Get recent system logs
 * @access Public
 */
router.get('/logs/recent', asyncHandler(async (req, res) => {
  const { level = 'info', limit = 100, service } = req.query;
  
  const logs = await healthMonitoringService.getRecentLogs({
    level: level as string,
    limit: parseInt(limit as string),
    service: service as string
  });
  
  successResponse(res, {
    logs: logs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      service: log.service,
      message: log.message,
      metadata: log.metadata
    })),
    summary: {
      total: logs.length,
      byLevel: logs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    }
  });
}));

/**
 * @route GET /api/monitoring/dependencies/status
 * @desc Get status of all system dependencies
 * @access Public
 */
router.get('/dependencies/status', asyncHandler(async (req, res) => {
  const dependencies = await healthMonitoringService.getDependenciesStatus();
  
  successResponse(res, {
    dependencies: dependencies.map(dep => ({
      name: dep.name,
      type: dep.type,
      status: dep.status,
      version: dep.version,
      critical: dep.critical,
      responseTime: dep.responseTime,
      lastCheck: dep.lastCheck,
      error: dep.error || null
    })),
    summary: {
      total: dependencies.length,
      healthy: dependencies.filter(d => d.status === 'healthy').length,
      degraded: dependencies.filter(d => d.status === 'degraded').length,
      unhealthy: dependencies.filter(d => d.status === 'unhealthy').length,
      critical: dependencies.filter(d => d.critical).length
    }
  });
}));

/**
 * @route GET /api/monitoring/capacity/analysis
 * @desc Get system capacity analysis and recommendations
 * @access Public
 */
router.get('/capacity/analysis', asyncHandler(async (req, res) => {
  const analysis = await healthMonitoringService.getCapacityAnalysis();
  
  successResponse(res, {
    current: {
      cpu: analysis.current.cpu,
      memory: analysis.current.memory,
      disk: analysis.current.disk,
      network: analysis.current.network,
      database: analysis.current.database
    },
    trends: {
      cpu: analysis.trends.cpu,
      memory: analysis.trends.memory,
      requests: analysis.trends.requests
    },
    projections: {
      timeToCapacity: analysis.projections.timeToCapacity,
      recommendedScaling: analysis.projections.recommendedScaling,
      bottlenecks: analysis.projections.bottlenecks
    },
    recommendations: analysis.recommendations.map(rec => ({
      type: rec.type,
      priority: rec.priority,
      description: rec.description,
      impact: rec.impact,
      effort: rec.effort
    }))
  });
}));

export default router;
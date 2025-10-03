import { Router } from 'express';
import { healthMonitoringService } from '../services/healthMonitoringService';
import { asyncHandler } from '../middleware/globalErrorHandler';
import { successResponse, errorResponse } from '../utils/apiResponse';

const router = Router();

// Basic health check endpoint
router.get('/health', asyncHandler(async (req, res) => {
  await healthMonitoringService.handleHealthCheck(req, res);
}));

// Simple ping endpoint
router.get('/ping', (req, res) => {
  healthMonitoringService.handlePing(req, res);
});

// Detailed status endpoint
router.get('/status', asyncHandler(async (req, res) => {
  await healthMonitoringService.handleStatus(req, res);
}));

// Individual service health checks
router.get('/health/database', asyncHandler(async (req, res) => {
  const health = await healthMonitoringService.performHealthCheck();
  const dbHealth = health.services.find(s => s.name === 'database');
  
  if (dbHealth) {
    res.json({
      success: true,
      data: dbHealth,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId
      }
    });
  } else {
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_HEALTH_UNKNOWN',
        message: 'Database health status unknown'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId
      }
    });
  }
}));

router.get('/health/cache', asyncHandler(async (req, res) => {
  const health = await healthMonitoringService.performHealthCheck();
  const cacheHealth = health.services.find(s => s.name === 'cache');
  
  if (cacheHealth) {
    res.json({
      success: true,
      data: cacheHealth,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId
      }
    });
  } else {
    res.status(503).json({
      success: false,
      error: {
        code: 'CACHE_HEALTH_UNKNOWN',
        message: 'Cache health status unknown'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId
      }
    });
  }
}));

router.get('/health/external', asyncHandler(async (req, res) => {
  const health = await healthMonitoringService.performHealthCheck();
  const externalHealth = health.services.find(s => s.name === 'external_services');
  
  if (externalHealth) {
    res.json({
      success: true,
      data: externalHealth,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId
      }
    });
  } else {
    res.status(503).json({
      success: false,
      error: {
        code: 'EXTERNAL_HEALTH_UNKNOWN',
        message: 'External services health status unknown'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId
      }
    });
  }
}));

// Enhanced metrics endpoint with performance data
router.get('/metrics', (req, res) => {
  const startTime = Date.now();
  const metrics = healthMonitoringService.getMetrics();
  const responseTime = Date.now() - startTime;
  
  // Record this response time
  healthMonitoringService.recordResponseTime(responseTime);
  
  successResponse(res, {
    ...metrics,
    responseTime,
    endpoint: '/metrics'
  });
});

// Service-specific health endpoints
router.get('/health/services/:serviceName', asyncHandler(async (req, res) => {
  const { serviceName } = req.params;
  const serviceDetails = await healthMonitoringService.getServiceDetails(serviceName);
  
  if (!serviceDetails) {
    return errorResponse(res, 'SERVICE_NOT_FOUND', `Service '${serviceName}' not found`, 404);
  }
  
  const statusCode = serviceDetails.status === 'healthy' ? 200 : 
                    serviceDetails.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    success: serviceDetails.status !== 'unhealthy',
    data: serviceDetails,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    }
  });
}));

// Dependency impact assessment endpoint
router.get('/health/dependencies', asyncHandler(async (req, res) => {
  const dependencyImpact = await healthMonitoringService.getDependencyImpact();
  
  successResponse(res, {
    dependencies: dependencyImpact,
    summary: {
      total: dependencyImpact.length,
      healthy: dependencyImpact.filter(d => d.status === 'healthy').length,
      degraded: dependencyImpact.filter(d => d.status === 'degraded').length,
      unhealthy: dependencyImpact.filter(d => d.status === 'unhealthy').length,
      criticalImpact: dependencyImpact.filter(d => d.impact === 'critical').length
    }
  });
}));

// Active alerts endpoint
router.get('/health/alerts', (req, res) => {
  const alerts = healthMonitoringService.getActiveAlerts();
  
  successResponse(res, {
    alerts,
    summary: {
      total: alerts.length,
      critical: alerts.filter(a => a.level === 'critical').length,
      warnings: alerts.filter(a => a.level === 'warning').length
    }
  });
});

// Performance metrics endpoint
router.get('/metrics/performance', (req, res) => {
  const metrics = healthMonitoringService.getMetrics();
  
  successResponse(res, {
    responseTime: metrics.responseTime,
    throughput: metrics.throughput,
    errorRate: metrics.errorRate,
    memory: {
      used: metrics.memory.heapUsed,
      total: metrics.memory.heapTotal,
      usage: Math.round((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100)
    },
    cpu: metrics.cpu,
    uptime: metrics.uptime
  });
});

// System status summary endpoint
router.get('/status/summary', asyncHandler(async (req, res) => {
  const health = await healthMonitoringService.performHealthCheck();
  
  const summary = {
    status: health.status,
    timestamp: health.timestamp,
    uptime: health.uptime,
    version: health.version,
    environment: health.environment,
    services: {
      total: health.services.length,
      healthy: health.services.filter(s => s.status === 'healthy').length,
      degraded: health.services.filter(s => s.status === 'degraded').length,
      unhealthy: health.services.filter(s => s.status === 'unhealthy').length
    },
    dependencies: {
      total: health.dependencies.length,
      healthy: health.dependencies.filter(d => d.status === 'healthy').length,
      degraded: health.dependencies.filter(d => d.status === 'degraded').length,
      unhealthy: health.dependencies.filter(d => d.status === 'unhealthy').length
    },
    alerts: health.alerts,
    metrics: {
      errorRate: health.metrics.errorRate,
      avgResponseTime: health.metrics.responseTime.avg,
      throughput: health.metrics.throughput,
      memoryUsage: Math.round((health.metrics.memory.heapUsed / health.metrics.memory.heapTotal) * 100)
    }
  };
  
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    success: health.status !== 'unhealthy',
    data: summary,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    }
  });
}));

// Readiness probe endpoint (for Kubernetes/container orchestration)
router.get('/ready', asyncHandler(async (req, res) => {
  const health = await healthMonitoringService.performHealthCheck();
  
  // System is ready if no critical services are unhealthy
  const criticalServices = health.services.filter(s => 
    s.impact === 'critical' && s.status === 'unhealthy'
  );
  const criticalDependencies = health.dependencies.filter(d => 
    d.impact === 'critical' && d.status === 'unhealthy'
  );
  
  const isReady = criticalServices.length === 0 && criticalDependencies.length === 0;
  
  if (isReady) {
    successResponse(res, {
      ready: true,
      message: 'Service is ready to accept traffic'
    });
  } else {
    res.status(503).json({
      success: false,
      data: {
        ready: false,
        message: 'Service is not ready - critical dependencies unavailable',
        criticalIssues: [
          ...criticalServices.map(s => `Service ${s.name}: ${s.error || 'unhealthy'}`),
          ...criticalDependencies.map(d => `Dependency ${d.name}: ${d.error || 'unhealthy'}`)
        ]
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId
      }
    });
  }
}));

// Liveness probe endpoint (for Kubernetes/container orchestration)
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  successResponse(res, {
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: healthMonitoringService.getUptime()
  });
});

export default router;
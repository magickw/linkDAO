import { Router } from 'express';
import { healthMonitoringService } from '../services/healthMonitoringService';
import { asyncHandler } from '../middleware/globalErrorHandler';

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

// Metrics endpoint
router.get('/metrics', (req, res) => {
  const metrics = healthMonitoringService.getMetrics();
  res.json({
    success: true,
    data: metrics,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    }
  });
});

export default router;
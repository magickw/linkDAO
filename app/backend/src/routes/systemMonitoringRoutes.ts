import * as express from 'express';
import { Request, Response } from 'express';
import { comprehensiveMonitoringService } from '../services/comprehensiveMonitoringService';
import { errorLoggingService } from '../services/errorLoggingService';
import { enhancedRateLimitingService } from '../middleware/enhancedRateLimiting';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/enhancedErrorHandler';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = express.Router();

// Apply admin authentication to all monitoring routes
router.use(adminAuthMiddleware);

/**
 * Get current system health status
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const healthStatus = await comprehensiveMonitoringService.getCurrentHealthStatus();
  
  ApiResponse.success(res, healthStatus);
}));

/**
 * Get system metrics for a specified time period
 */
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const hours = parseInt(req.query.hours as string) || 1;
  const metrics = comprehensiveMonitoringService.getMetrics(hours);
  
  // Calculate summary statistics
  const summary = {
    totalDataPoints: metrics.length,
    timeRange: {
      start: metrics.length > 0 ? metrics[0].timestamp : null,
      end: metrics.length > 0 ? metrics[metrics.length - 1].timestamp : null,
      hours
    },
    averages: metrics.length > 0 ? {
      memoryUsage: Math.round(metrics.reduce((sum, m) => sum + m.system.memory.heapUsed, 0) / metrics.length / 1024 / 1024),
      responseTime: Math.round(metrics.reduce((sum, m) => sum + m.application.averageResponseTime, 0) / metrics.length),
      errorRate: Math.round(metrics.reduce((sum, m) => sum + m.application.errorRate, 0) / metrics.length * 100) / 100
    } : null
  };
  
  ApiResponse.success(res, {
    metrics,
    summary
  });
}));

/**
 * Get error statistics and patterns
 */
router.get('/errors', asyncHandler(async (req: Request, res: Response) => {
  const errorStats = errorLoggingService.getErrorStats();
  const errorPatterns = errorLoggingService.getErrorPatterns();
  
  ApiResponse.success(res, {
    statistics: errorStats,
    patterns: errorPatterns,
    summary: {
      totalErrors: errorStats.totalErrors,
      errorRate: errorStats.errorRate,
      topCategories: Object.entries(errorStats.errorsByCategory)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      topSeverities: Object.entries(errorStats.errorsBySeverity)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    }
  });
}));

/**
 * Get rate limiting statistics
 */
router.get('/rate-limits', asyncHandler(async (req: Request, res: Response) => {
  const rateLimitStats = await enhancedRateLimitingService.getStatistics();
  
  ApiResponse.success(res, {
    statistics: rateLimitStats,
    summary: {
      totalRequests: rateLimitStats.totalRequests,
      blockedRequests: rateLimitStats.blockedRequests,
      blockRate: rateLimitStats.totalRequests > 0 
        ? Math.round((rateLimitStats.blockedRequests / rateLimitStats.totalRequests) * 10000) / 100
        : 0,
      topConsumers: rateLimitStats.topConsumers.slice(0, 10)
    }
  });
}));

/**
 * Get active alerts
 */
router.get('/alerts', asyncHandler(async (req: Request, res: Response) => {
  const acknowledged = req.query.acknowledged === 'true';
  const alerts = comprehensiveMonitoringService.getAlerts(acknowledged);
  
  const summary = {
    total: alerts.length,
    bySeverity: alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recent: alerts.filter(a => 
      new Date(a.timestamp).getTime() > Date.now() - 3600000 // Last hour
    ).length
  };
  
  ApiResponse.success(res, {
    alerts,
    summary
  });
}));

/**
 * Acknowledge an alert
 */
router.post('/alerts/:alertId/acknowledge', asyncHandler(async (req: Request, res: Response) => {
  const { alertId } = req.params;
  
  await comprehensiveMonitoringService.acknowledgeAlert(alertId);
  
  ApiResponse.success(res, {
    message: 'Alert acknowledged successfully',
    alertId,
    acknowledgedAt: new Date().toISOString()
  });
}));

/**
 * Get monitoring thresholds
 */
router.get('/thresholds', asyncHandler(async (req: Request, res: Response) => {
  const thresholds = comprehensiveMonitoringService.getThresholds();
  
  ApiResponse.success(res, {
    thresholds,
    description: {
      errorRate: 'Maximum errors per minute before alerting',
      responseTime: 'Maximum average response time in milliseconds',
      memoryUsage: 'Maximum memory usage percentage',
      cpuUsage: 'Maximum CPU usage percentage',
      diskUsage: 'Maximum disk usage percentage',
      dbConnectionPool: 'Maximum database connection pool usage percentage',
      cacheHitRate: 'Minimum cache hit rate percentage',
      rateLimitViolations: 'Maximum rate limit violations per minute'
    }
  });
}));

/**
 * Update monitoring thresholds
 */
router.put('/thresholds', asyncHandler(async (req: Request, res: Response) => {
  const newThresholds = req.body;
  
  // Validate thresholds
  const validKeys = [
    'errorRate', 'responseTime', 'memoryUsage', 'cpuUsage', 
    'diskUsage', 'dbConnectionPool', 'cacheHitRate', 'rateLimitViolations'
  ];
  
  const invalidKeys = Object.keys(newThresholds).filter(key => !validKeys.includes(key));
  if (invalidKeys.length > 0) {
    return ApiResponse.badRequest(res, 'Invalid threshold keys', { invalidKeys });
  }
  
  // Validate threshold values
  for (const [key, value] of Object.entries(newThresholds)) {
    if (typeof value !== 'number' || value < 0) {
      return ApiResponse.badRequest(res, `Invalid threshold value for ${key}`, { 
        key, 
        value, 
        expected: 'positive number' 
      });
    }
  }
  
  comprehensiveMonitoringService.updateThresholds(newThresholds);
  
  ApiResponse.success(res, {
    message: 'Thresholds updated successfully',
    updatedThresholds: newThresholds,
    currentThresholds: comprehensiveMonitoringService.getThresholds()
  });
}));

/**
 * Reset rate limit for a specific key
 */
router.post('/rate-limits/reset', asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.body;
  
  if (!key) {
    return ApiResponse.badRequest(res, 'Rate limit key is required');
  }
  
  await enhancedRateLimitingService.resetRateLimit(key);
  
  ApiResponse.success(res, {
    message: 'Rate limit reset successfully',
    key,
    resetAt: new Date().toISOString()
  });
}));

/**
 * Block a specific key
 */
router.post('/rate-limits/block', asyncHandler(async (req: Request, res: Response) => {
  const { key, durationMs = 300000 } = req.body; // Default 5 minutes
  
  if (!key) {
    return ApiResponse.badRequest(res, 'Rate limit key is required');
  }
  
  if (typeof durationMs !== 'number' || durationMs <= 0) {
    return ApiResponse.badRequest(res, 'Duration must be a positive number in milliseconds');
  }
  
  await enhancedRateLimitingService.blockKey(key, durationMs);
  
  ApiResponse.success(res, {
    message: 'Key blocked successfully',
    key,
    durationMs,
    blockedUntil: new Date(Date.now() + durationMs).toISOString()
  });
}));

/**
 * Unblock a specific key
 */
router.post('/rate-limits/unblock', asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.body;
  
  if (!key) {
    return ApiResponse.badRequest(res, 'Rate limit key is required');
  }
  
  await enhancedRateLimitingService.unblockKey(key);
  
  ApiResponse.success(res, {
    message: 'Key unblocked successfully',
    key,
    unblockedAt: new Date().toISOString()
  });
}));

/**
 * Get system performance summary
 */
router.get('/performance', asyncHandler(async (req: Request, res: Response) => {
  const hours = parseInt(req.query.hours as string) || 1;
  const metrics = comprehensiveMonitoringService.getMetrics(hours);
  
  if (metrics.length === 0) {
    return ApiResponse.success(res, {
      message: 'No performance data available',
      timeRange: { hours }
    });
  }
  
  // Calculate performance statistics
  const responseTimes = metrics.map(m => m.application.averageResponseTime);
  const memoryUsages = metrics.map(m => m.system.memory.heapUsed);
  const errorRates = metrics.map(m => m.application.errorRate);
  
  const performance = {
    responseTime: {
      current: responseTimes[responseTimes.length - 1],
      average: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      p95: calculatePercentile(responseTimes, 95),
      p99: calculatePercentile(responseTimes, 99)
    },
    memory: {
      current: Math.round(memoryUsages[memoryUsages.length - 1] / 1024 / 1024),
      average: Math.round(memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length / 1024 / 1024),
      min: Math.round(Math.min(...memoryUsages) / 1024 / 1024),
      max: Math.round(Math.max(...memoryUsages) / 1024 / 1024),
      trend: calculateTrend(memoryUsages)
    },
    errors: {
      current: errorRates[errorRates.length - 1],
      average: Math.round(errorRates.reduce((a, b) => a + b, 0) / errorRates.length * 100) / 100,
      total: errorRates.reduce((a, b) => a + b, 0),
      trend: calculateTrend(errorRates)
    },
    uptime: process.uptime(),
    dataPoints: metrics.length,
    timeRange: {
      start: metrics[0].timestamp,
      end: metrics[metrics.length - 1].timestamp,
      hours
    }
  };
  
  ApiResponse.success(res, performance);
}));

// Helper functions
function calculatePercentile(values: number[], percentile: number): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  const first = values[0];
  const last = values[values.length - 1];
  
  return first === 0 ? 0 : Math.round(((last - first) / first) * 10000) / 100; // Percentage change
}

export default router;
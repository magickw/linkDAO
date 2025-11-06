import { Router } from 'express';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import PerformanceMonitoringController from '../controllers/performanceMonitoringController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';
import { body, query, param } from 'express-validator';

/**
 * Performance Monitoring Routes
 * Provides endpoints for comprehensive performance monitoring and optimization
 */
export function createPerformanceMonitoringRoutes(pool: Pool, redis: Redis): Router {
  const router = Router();
  const controller = new PerformanceMonitoringController(pool, redis);

  // Validation middleware
  const validateTimeWindow = query('timeWindow')
    .optional()
    .isInt({ min: 60000, max: 86400000 }) // 1 minute to 24 hours
    .withMessage('Time window must be between 1 minute and 24 hours in milliseconds');

  const validateLimit = query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000');

  const validateUserFeedback = [
    body('pathName')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Path name is required and must be less than 100 characters'),
    body('perceivedPerformance')
      .isIn(['fast', 'acceptable', 'slow', 'very_slow'])
      .withMessage('Perceived performance must be one of: fast, acceptable, slow, very_slow'),
    body('actualDuration')
      .isFloat({ min: 0 })
      .withMessage('Actual duration must be a positive number'),
    body('userId')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('User ID must be less than 50 characters'),
    body('userAgent')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('User agent must be less than 500 characters')
  ];

  /**
   * GET /api/performance/dashboard
   * Get comprehensive performance dashboard data
   */
  router.get('/dashboard', 
    authMiddleware,
    validateTimeWindow,
    validateRequest,
    async (req, res) => {
      await controller.getPerformanceDashboard(req, res);
    }
  );

  /**
   * GET /api/performance/benchmarks
   * Get benchmark data or run new benchmarks
   */
  router.get('/benchmarks',
    authMiddleware,
    query('type').optional().isIn(['comprehensive', 'history']).withMessage('Type must be comprehensive or history'),
    validateRequest,
    async (req, res) => {
      await controller.runBenchmarks(req, res);
    }
  );

  /**
   * POST /api/performance/benchmarks/run
   * Run comprehensive performance benchmarks
   */
  router.post('/benchmarks/run',
    authMiddleware,
    async (req, res) => {
      // Set type to comprehensive for POST requests
      req.query.type = 'comprehensive';
      await controller.runBenchmarks(req, res);
    }
  );

  /**
   * GET /api/performance/render
   * Get Render-specific performance metrics
   */
  router.get('/render',
    authMiddleware,
    validateLimit,
    validateRequest,
    async (req, res) => {
      await controller.getRenderMetrics(req, res);
    }
  );

  /**
   * GET /api/performance/profiling
   * Get error recovery and cache profiling data
   */
  router.get('/profiling',
    authMiddleware,
    validateTimeWindow,
    validateRequest,
    async (req, res) => {
      await controller.getProfilingData(req, res);
    }
  );

  /**
   * GET /api/performance/critical-paths
   * Get critical path performance summary
   */
  router.get('/critical-paths',
    authMiddleware,
    validateLimit,
    validateRequest,
    async (req, res) => {
      await controller.getCriticalPathData(req, res);
    }
  );

  /**
   * GET /api/performance/critical-paths/:pathName
   * Get specific critical path performance data
   */
  router.get('/critical-paths/:pathName',
    authMiddleware,
    param('pathName')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Path name must be between 1 and 100 characters'),
    validateLimit,
    validateRequest,
    async (req, res) => {
      await controller.getCriticalPathData(req, res);
    }
  );

  /**
   * POST /api/performance/feedback
   * Record user feedback for critical path performance
   */
  router.post('/feedback',
    validateUserFeedback,
    validateRequest,
    async (req, res) => {
      await controller.recordUserFeedback(req, res);
    }
  );

  /**
   * GET /api/performance/alerts
   * Get performance alerts
   */
  router.get('/alerts',
    authMiddleware,
    query('severity')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Severity must be one of: low, medium, high, critical'),
    validateLimit,
    validateRequest,
    async (req, res) => {
      await controller.getPerformanceAlerts(req, res);
    }
  );

  /**
   * GET /api/performance/report
   * Generate comprehensive performance report
   */
  router.get('/report',
    authMiddleware,
    query('format')
      .optional()
      .isIn(['json', 'pdf', 'html'])
      .withMessage('Format must be one of: json, pdf, html'),
    query('timeRange')
      .optional()
      .matches(/^\d+[hmsd]$/)
      .withMessage('Time range must be in format: number followed by h/m/s/d (e.g., 1h, 30m, 7d)'),
    validateRequest,
    async (req, res) => {
      await controller.generatePerformanceReport(req, res);
    }
  );

  /**
   * GET /api/performance/health
   * Quick health check endpoint for performance monitoring
   */
  router.get('/health', async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Quick health checks
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          status: 'healthy',
          uptime,
          responseTime,
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024)
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  });

  /**
   * GET /api/performance/metrics/system
   * Get basic system performance metrics (public endpoint for monitoring)
   */
  router.get('/metrics/system', async (req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Convert to Prometheus-style metrics format
      const metrics = [
        `# HELP nodejs_memory_heap_used_bytes Process heap memory used`,
        `# TYPE nodejs_memory_heap_used_bytes gauge`,
        `nodejs_memory_heap_used_bytes ${memoryUsage.heapUsed}`,
        ``,
        `# HELP nodejs_memory_heap_total_bytes Process heap memory total`,
        `# TYPE nodejs_memory_heap_total_bytes gauge`,
        `nodejs_memory_heap_total_bytes ${memoryUsage.heapTotal}`,
        ``,
        `# HELP nodejs_memory_rss_bytes Process resident set size`,
        `# TYPE nodejs_memory_rss_bytes gauge`,
        `nodejs_memory_rss_bytes ${memoryUsage.rss}`,
        ``,
        `# HELP nodejs_process_uptime_seconds Process uptime in seconds`,
        `# TYPE nodejs_process_uptime_seconds gauge`,
        `nodejs_process_uptime_seconds ${process.uptime()}`,
        ``,
        `# HELP nodejs_cpu_user_seconds_total Process CPU user time`,
        `# TYPE nodejs_cpu_user_seconds_total counter`,
        `nodejs_cpu_user_seconds_total ${cpuUsage.user / 1000000}`,
        ``,
        `# HELP nodejs_cpu_system_seconds_total Process CPU system time`,
        `# TYPE nodejs_cpu_system_seconds_total counter`,
        `nodejs_cpu_system_seconds_total ${cpuUsage.system / 1000000}`
      ].join('\n');

      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      res.status(500).send('# Error generating metrics');
    }
  });

  return router;
}

export default createPerformanceMonitoringRoutes;
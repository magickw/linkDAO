import { Router, Request, Response } from 'express';
import { cacheService } from '../services/cacheService';
import { cacheWarmingService } from '../services/cacheWarmingService';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { rateLimitWithCache } from '../middleware/cachingMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * @route GET /api/cache/stats
 * @desc Get cache statistics
 * @access Public (with rate limiting)
 */
router.get('/stats',
  rateLimitWithCache(req => `cache_stats:${req.ip}`, 10, 60), // 10 requests per minute
  async (req: Request, res: Response) => {
    try {
      const stats = await cacheService.getStats();
      return successResponse(res, stats, 200);
    } catch (error) {
      safeLogger.error('Failed to get cache stats', { error });
      return errorResponse(
        res,
        'CACHE_STATS_ERROR',
        'Failed to retrieve cache statistics',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * @route GET /api/cache/health
 * @desc Get cache health status
 * @access Public (with rate limiting)
 */
router.get('/health',
  rateLimitWithCache(req => `cache_health:${req.ip}`, 20, 60), // 20 requests per minute
  async (req: Request, res: Response) => {
    try {
      const health = await cacheService.healthCheck();
      const statusCode = health.connected ? 200 : 503;
      
      return res.status(statusCode).json({
        success: health.connected,
        data: health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Cache health check failed', { error });
      return errorResponse(
        res,
        'CACHE_HEALTH_ERROR',
        'Cache health check failed',
        503,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * @route POST /api/cache/warm
 * @desc Trigger cache warming
 * @access Protected (admin only - simplified for demo)
 * @body {string} type - Warmup type: 'full' or 'quick' (default: 'quick')
 */
router.post('/warm',
  csrfProtection,
  rateLimitWithCache(req => `cache_warm:${req.ip}`, 2, 300), // 2 requests per 5 minutes
  async (req: Request, res: Response) => {
    try {
      const { type = 'quick' } = req.body;

      if (!['full', 'quick'].includes(type)) {
        return errorResponse(
          res,
          'INVALID_WARMUP_TYPE',
          'Invalid warmup type. Must be "full" or "quick"',
          400
        );
      }

      // Check if warming is already in progress
      if (cacheWarmingService.isWarmingInProgress()) {
        return errorResponse(
          res,
          'WARMUP_IN_PROGRESS',
          'Cache warming is already in progress',
          409
        );
      }

      // Trigger warmup asynchronously
      const warmupPromise = cacheWarmingService.triggerWarmup(type as 'full' | 'quick');
      
      // Don't wait for completion, return immediately
      warmupPromise.catch(error => {
        safeLogger.error('Cache warming failed', { error });
      });

      return successResponse(res, {
        message: `Cache warming (${type}) started`,
        queueStatus: cacheWarmingService.getQueueStatus()
      }, 202);
    } catch (error) {
      safeLogger.error('Failed to trigger cache warming', { error });
      return errorResponse(
        res,
        'CACHE_WARM_ERROR',
        'Failed to trigger cache warming',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * @route GET /api/cache/warm/status
 * @desc Get cache warming status
 * @access Public (with rate limiting)
 */
router.get('/warm/status',
  rateLimitWithCache(req => `cache_warm_status:${req.ip}`, 30, 60), // 30 requests per minute
  async (req: Request, res: Response) => {
    try {
      const stats = cacheWarmingService.getStats();
      const queueStatus = cacheWarmingService.getQueueStatus();
      const isInProgress = cacheWarmingService.isWarmingInProgress();

      return successResponse(res, {
        isInProgress,
        stats,
        queueStatus
      }, 200);
    } catch (error) {
      safeLogger.error('Failed to get cache warming status', { error });
      return errorResponse(
        res,
        'CACHE_WARM_STATUS_ERROR',
        'Failed to get cache warming status',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * @route DELETE /api/cache/invalidate/:pattern
 * @desc Invalidate cache entries by pattern
 * @access Protected (admin only - simplified for demo)
 * @param {string} pattern - Cache key pattern to invalidate
 */
router.delete('/invalidate/:pattern',
  csrfProtection,
  rateLimitWithCache(req => `cache_invalidate:${req.ip}`, 5, 60), // 5 requests per minute
  async (req: Request, res: Response) => {
    try {
      const { pattern } = req.params;

      if (!pattern || pattern.length < 3) {
        return errorResponse(
          res,
          'INVALID_PATTERN',
          'Pattern must be at least 3 characters long',
          400
        );
      }

      const deletedCount = await cacheService.invalidatePattern(pattern);

      return successResponse(res, {
        message: `Invalidated ${deletedCount} cache entries`,
        pattern,
        deletedCount
      }, 200);
    } catch (error) {
      safeLogger.error('Failed to invalidate cache', { error });
      return errorResponse(
        res,
        'CACHE_INVALIDATE_ERROR',
        'Failed to invalidate cache entries',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * @route DELETE /api/cache/clear
 * @desc Clear all cache entries (dangerous operation)
 * @access Protected (admin only - simplified for demo)
 */
router.delete('/clear',
  csrfProtection,
  rateLimitWithCache(req => `cache_clear:${req.ip}`, 1, 300), // 1 request per 5 minutes
  async (req: Request, res: Response) => {
    try {
      // This is a dangerous operation, so we require confirmation
      const { confirm } = req.body;

      if (confirm !== 'CLEAR_ALL_CACHE') {
        return errorResponse(
          res,
          'CONFIRMATION_REQUIRED',
          'This operation requires confirmation. Send { "confirm": "CLEAR_ALL_CACHE" } in the request body',
          400
        );
      }

      // Clear all cache patterns
      const patterns = ['seller:*', 'listings:*', 'reputation:*', 'search:*', 'categories:*'];
      let totalDeleted = 0;

      for (const pattern of patterns) {
        const deleted = await cacheService.invalidatePattern(pattern);
        totalDeleted += deleted;
      }

      return successResponse(res, {
        message: `Cleared ${totalDeleted} cache entries`,
        totalDeleted
      }, 200);
    } catch (error) {
      safeLogger.error('Failed to clear cache', { error });
      return errorResponse(
        res,
        'CACHE_CLEAR_ERROR',
        'Failed to clear cache',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * @route GET /api/cache/keys/:pattern
 * @desc Get cache keys matching a pattern
 * @access Protected (admin only - simplified for demo)
 * @param {string} pattern - Pattern to search for
 * @query {number} limit - Maximum number of keys to return (default: 100, max: 1000)
 */
router.get('/keys/:pattern',
  rateLimitWithCache(req => `cache_keys:${req.ip}`, 10, 60), // 10 requests per minute
  async (req: Request, res: Response) => {
    try {
      const { pattern } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);

      if (!pattern || pattern.length < 2) {
        return errorResponse(
          res,
          'INVALID_PATTERN',
          'Pattern must be at least 2 characters long',
          400
        );
      }

      // This would need to be implemented in the cache service
      // For now, return a placeholder response
      return successResponse(res, {
        pattern,
        keys: [], // Placeholder - would contain actual keys
        count: 0,
        limit
      }, 200);
    } catch (error) {
      safeLogger.error('Failed to get cache keys', { error });
      return errorResponse(
        res,
        'CACHE_KEYS_ERROR',
        'Failed to get cache keys',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * @route GET /api/cache/memory
 * @desc Get memory usage information
 * @access Public (with rate limiting)
 */
router.get('/memory',
  rateLimitWithCache(req => `cache_memory:${req.ip}`, 20, 60), // 20 requests per minute
  async (req: Request, res: Response) => {
    try {
      const health = await cacheService.healthCheck();
      
      // Get additional memory information if available
      let memoryInfo = {
        redis: {
          memoryUsage: health.memoryUsage || 'N/A',
          keyCount: health.keyCount || 0
        },
        process: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        }
      };

      return successResponse(res, memoryInfo, 200);
    } catch (error) {
      safeLogger.error('Failed to get memory information', { error });
      return errorResponse(
        res,
        'CACHE_MEMORY_ERROR',
        'Failed to get memory information',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

export default router;

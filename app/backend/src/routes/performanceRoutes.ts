import express from 'express';
import { Request, Response } from 'express';
import PerformanceOptimizationIntegration from '../middleware/performanceOptimizationIntegration';

const router = express.Router();

// This would be injected by the main application
let performanceOptimizer: PerformanceOptimizationIntegration;

export function setPerformanceOptimizer(optimizer: PerformanceOptimizationIntegration) {
  performanceOptimizer = optimizer;
}

/**
 * Get performance metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    if (!performanceOptimizer) {
      return res.status(503).json({
        success: false,
        error: 'Performance optimizer not initialized'
      });
    }

    const metrics = performanceOptimizer.getMetrics();
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        metrics,
        summary: {
          status: metrics.averageResponseTime < 1000 ? 'healthy' : 
                 metrics.averageResponseTime < 2000 ? 'degraded' : 'critical',
          responseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
          cacheEfficiency: `${(metrics.cacheHitRate * 100).toFixed(1)}%`,
          compressionSavings: `${(metrics.compressionRate * 100).toFixed(1)}%`,
          poolUtilization: `${metrics.poolUtilization.toFixed(1)}%`
        }
      }
    });

  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance metrics'
    });
  }
});

/**
 * Get comprehensive performance report
 */
router.get('/report', async (req: Request, res: Response) => {
  try {
    if (!performanceOptimizer) {
      return res.status(503).json({
        success: false,
        error: 'Performance optimizer not initialized'
      });
    }

    const report = await performanceOptimizer.getPerformanceReport();
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        report
      }
    });

  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report'
    });
  }
});

/**
 * Trigger manual optimization
 */
router.post('/optimize', async (req: Request, res: Response) => {
  try {
    if (!performanceOptimizer) {
      return res.status(503).json({
        success: false,
        error: 'Performance optimizer not initialized'
      });
    }

    await performanceOptimizer.runOptimization();
    
    res.json({
      success: true,
      data: {
        message: 'Performance optimization completed',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error running optimization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run optimization'
    });
  }
});

/**
 * Reset performance metrics
 */
router.post('/metrics/reset', async (req: Request, res: Response) => {
  try {
    if (!performanceOptimizer) {
      return res.status(503).json({
        success: false,
        error: 'Performance optimizer not initialized'
      });
    }

    performanceOptimizer.resetMetrics();
    
    res.json({
      success: true,
      data: {
        message: 'Performance metrics reset',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error resetting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics'
    });
  }
});

/**
 * Get cache statistics
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const { cacheService } = await import('../services/cacheService');
    const stats = await cacheService.getStats();
    const healthCheck = await cacheService.healthCheck();
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        stats,
        health: healthCheck,
        recommendations: []
      }
    });

  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics'
    });
  }
});

/**
 * Clear cache
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    const { pattern } = req.body;
    const { cacheService } = await import('../services/cacheService');
    
    let clearedCount = 0;
    if (pattern) {
      clearedCount = await cacheService.invalidatePattern(pattern);
    } else {
      // Clear all cache - would need to implement this method
      clearedCount = await cacheService.invalidatePattern('*');
    }
    
    res.json({
      success: true,
      data: {
        message: `Cleared ${clearedCount} cache entries`,
        pattern: pattern || 'all',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

/**
 * Warm cache
 */
router.post('/cache/warm', async (req: Request, res: Response) => {
  try {
    const { cacheService } = await import('../services/cacheService');
    await cacheService.warmCache();
    
    res.json({
      success: true,
      data: {
        message: 'Cache warming initiated',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error warming cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to warm cache'
    });
  }
});

/**
 * Get database performance metrics
 */
router.get('/database/metrics', async (req: Request, res: Response) => {
  try {
    if (!performanceOptimizer) {
      return res.status(503).json({
        success: false,
        error: 'Performance optimizer not initialized'
      });
    }

    const metrics = performanceOptimizer.getMetrics();
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        database: metrics.components.database || {},
        connectionPool: metrics.components.connectionPool || {},
        indexing: metrics.components.indexing || {}
      }
    });

  } catch (error) {
    console.error('Error getting database metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database metrics'
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        optimizer: performanceOptimizer ? 'available' : 'unavailable',
        cache: 'unknown',
        database: 'unknown'
      }
    };

    // Check cache health
    try {
      const { cacheService } = await import('../services/cacheService');
      const cacheHealth = await cacheService.healthCheck();
      health.components.cache = cacheHealth.connected ? 'healthy' : 'unhealthy';
    } catch (error) {
      health.components.cache = 'error';
    }

    // Check database health
    if (performanceOptimizer) {
      const metrics = performanceOptimizer.getMetrics();
      health.components.database = metrics.databaseQueryTime < 2000 ? 'healthy' : 'degraded';
    }

    // Determine overall status
    const unhealthyComponents = Object.values(health.components).filter(
      status => status === 'unhealthy' || status === 'error' || status === 'unavailable'
    );

    if (unhealthyComponents.length > 0) {
      health.status = unhealthyComponents.length === Object.keys(health.components).length ? 'critical' : 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status !== 'critical',
      data: health
    });

  } catch (error) {
    console.error('Error checking performance health:', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      data: {
        status: 'critical',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;
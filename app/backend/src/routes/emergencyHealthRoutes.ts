import express from 'express';
import { optimizedDb } from '../services/optimizedDatabaseManager';
import { memoryManager } from '../services/memoryManager';
import { Redis } from 'ioredis';

const router = express.Router();

// Emergency health check - minimal dependencies
router.get('/emergency-health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Basic health indicators
    const health = {
      status: 'unknown',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: 0,
      memory: {
        status: 'unknown',
        usage: 0,
        rss: 0
      },
      database: {
        status: 'unknown',
        connections: 0,
        responseTime: 0
      },
      emergency: {
        mode: false,
        fixes_applied: false
      }
    };

    // Memory check
    try {
      const memStats = memoryManager.getMemoryStats();
      health.memory = {
        status: memStats.status,
        usage: memStats.memoryPercent,
        rss: memStats.rssMB
      };
    } catch (error) {
      health.memory.status = 'error';
    }

    // Database check
    try {
      const dbHealth = await optimizedDb.healthCheck();
      health.database = {
        status: dbHealth.healthy ? 'healthy' : 'unhealthy',
        connections: dbHealth.stats.totalCount,
        responseTime: dbHealth.stats.responseTime || 0
      };
    } catch (error) {
      health.database.status = 'error';
    }

    // Emergency mode check
    try {
      // Check if Redis is enabled before attempting connection
      if (process.env.REDIS_ENABLED !== 'false' && process.env.REDIS_ENABLED !== '0') {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        
        // Handle placeholder values
        if (redisUrl !== 'your_redis_url' && redisUrl !== 'redis://your_redis_url') {
          const redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 1,
            connectTimeout: 5000,
            retryStrategy: () => null // Don't retry on health check
          });
          
          const emergencyMode = await redis.get('emergency_mode');
          const fixesApplied = await redis.get('emergency:applied_at');
          
          health.emergency = {
            mode: emergencyMode === 'true',
            fixes_applied: !!fixesApplied
          };
          
          await redis.quit();
        }
      }
    } catch (error) {
      // Redis unavailable - assume emergency mode
      health.emergency.mode = true;
    }

    // Overall status
    const memoryOk = health.memory.status !== 'critical' && health.memory.status !== 'error';
    const databaseOk = health.database.status === 'healthy';
    const responseTimeOk = (Date.now() - startTime) < 5000;

    if (memoryOk && databaseOk && responseTimeOk) {
      health.status = 'healthy';
    } else if (health.memory.status === 'critical' || health.database.status === 'error') {
      health.status = 'critical';
    } else {
      health.status = 'degraded';
    }

    health.responseTime = Date.now() - startTime;

    // Set appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);

  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime
    });
  }
});

// Emergency memory cleanup endpoint
router.post('/emergency-memory-cleanup', async (req, res) => {
  try {
    console.log('🚨 Emergency memory cleanup requested');
    const beforeStats = memoryManager.getMemoryStats();
    
    // Force cleanup
    const afterStats = memoryManager.forceCleanup();
    
    res.json({
      success: true,
      message: 'Memory cleanup completed',
      before: beforeStats,
      after: afterStats,
      freed: beforeStats.heapUsedMB - afterStats.heapUsedMB
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Emergency database cleanup endpoint
router.post('/emergency-db-cleanup', async (req, res) => {
  try {
    console.log('🚨 Emergency database cleanup requested');
    
    const beforeStats = optimizedDb.getPoolStats();
    
    // Force cleanup connections
    await optimizedDb.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE state = 'idle' 
      AND query_start < NOW() - INTERVAL '30 seconds'
    `);
    
    const afterStats = optimizedDb.getPoolStats();
    
    res.json({
      success: true,
      message: 'Database cleanup completed',
      before: beforeStats,
      after: afterStats,
      freed_connections: beforeStats.totalCount - afterStats.totalCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
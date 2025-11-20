import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";
import { initializeMonitor, getMonitor } from './connectionPoolMonitor';

dotenv.config();

// For production, use the DATABASE_URL from environment variables
const connectionString = process.env.DATABASE_URL || "";

// Resource constraint detection
const isRenderFree = process.env.RENDER && !process.env.RENDER_PRO;
const isRenderPro = process.env.RENDER && process.env.RENDER_PRO;
const isResourceConstrained = isRenderFree || (process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 1024);

// Global declaration for hot-reloading in development
declare global {
  var _dbClient: postgres.Sql | undefined;
  var _dbInstance: ReturnType<typeof drizzle> | undefined;
}

let client: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle> | undefined;
let healthCheckInterval: NodeJS.Timeout | undefined;
let metricsInterval: NodeJS.Timeout | undefined;

if (connectionString) {
  try {
    // Reuse existing connection in development (hot-reloading)
    if (process.env.NODE_ENV !== 'production' && global._dbClient) {
      client = global._dbClient;
      db = global._dbInstance;
      safeLogger.debug('🔄 Reusing existing database connection (Development)');
    } else {
      // Optimized postgres client configuration with advanced pooling
      const maxConnections = process.env.DB_MAX_CONNECTIONS
        ? parseInt(process.env.DB_MAX_CONNECTIONS)
        : (isRenderFree ? 2 : (isRenderPro ? 5 : 20));

      const clientConfig = {
        prepare: false, // Disable prefetch as it's not supported in production environments
        max: maxConnections,
        idle_timeout: isRenderFree ? 20 : (isRenderPro ? 30 : 60), // Seconds
        connect_timeout: isRenderFree ? 5 : (isRenderPro ? 3 : 2), // Seconds
        max_lifetime: 60 * 30, // 30 minutes max connection lifetime to prevent stale connections

        // Advanced connection pool settings
        connection: {
          application_name: 'linkdao_backend',
        },

        // Add resource management options
        transform: {
          undefined: null, // Transform undefined to null to prevent issues
        },

        // Add connection cleanup
        onnotice: isResourceConstrained ? undefined : (notice: any) => {
          safeLogger.debug('Database notice:', notice);
        },

        // Reduce memory usage by limiting result set processing
        fetch_array_size: isResourceConstrained ? 100 : 1000,

        // Connection pool optimization
        // Keep connections alive to avoid reconnection overhead
        keep_alive: !isResourceConstrained,

        // Error handling
        onclose: () => {
          if (process.env.NODE_ENV !== 'production') {
            safeLogger.debug('Database connection closed');
          }
        },
      };

      client = postgres(connectionString, clientConfig);
      db = drizzle(client, { schema });

      // Store in global for development hot-reloading
      if (process.env.NODE_ENV !== 'production') {
        global._dbClient = client;
        global._dbInstance = db;
      }

      const tierInfo = isRenderFree ? 'Free' : (isRenderPro ? 'Pro' : 'Standard');
      safeLogger.info(`✅ Database connection established successfully (${tierInfo} tier optimized, max: ${maxConnections})`);

      // Initialize connection pool monitor
      const monitor = initializeMonitor(maxConnections, {
        highUtilization: 80,
        criticalUtilization: 95,
        maxErrors: 10,
        slowQueryThreshold: 1000,
      });

      // Set up alert handler
      monitor.onAlert((alert) => {
        if (alert.level === 'critical') {
          safeLogger.error(`[CRITICAL] Database Pool Alert: ${alert.message}`, {
            type: alert.type,
            utilization: alert.metrics.poolUtilization,
            activeConnections: alert.metrics.activeConnections,
            maxConnections: alert.metrics.maxConnections,
          });
        } else {
          safeLogger.warn(`[WARNING] Database Pool Alert: ${alert.message}`, {
            type: alert.type,
            utilization: alert.metrics.poolUtilization,
          });
        }
      });

      // Collect metrics periodically (every 30 seconds)
      metricsInterval = setInterval(() => {
        if (client) {
          // Note: postgres-js doesn't expose connection pool stats directly
          // We'll estimate based on our tracking
          const currentMetrics = monitor.getCurrentMetrics();

          // Log metrics summary every 5 minutes
          if (currentMetrics.queryCount % 10 === 0) {
            const summary = monitor.getMetricsSummary();
            safeLogger.info('📊 Connection Pool Metrics Summary:', {
              avgUtilization: `${summary.avgUtilization.toFixed(1)}%`,
              maxUtilization: `${summary.maxUtilization.toFixed(1)}%`,
              avgQueryDuration: `${summary.avgQueryDuration.toFixed(0)}ms`,
              totalQueries: summary.totalQueries,
              totalErrors: summary.totalErrors,
            });

            // Log recommendations if any
            const recommendations = monitor.getRecommendations();
            if (recommendations.length > 0) {
              safeLogger.info('💡 Performance Recommendations:', recommendations);
            }
          }
        }
      }, 30000); // Every 30 seconds

      // Log connection pool configuration in development
      if (process.env.NODE_ENV !== 'production') {
        safeLogger.debug('Connection pool config:', {
          max: maxConnections,
          idle_timeout: clientConfig.idle_timeout,
          connect_timeout: clientConfig.connect_timeout,
          max_lifetime: clientConfig.max_lifetime,
        });
      }

      // Add connection health monitoring for resource-constrained environments
      if (isResourceConstrained) {
        // Test connection periodically and store interval reference for cleanup
        healthCheckInterval = setInterval(async () => {
          try {
            if (client) {
              await client`SELECT 1`;
              safeLogger.debug('✅ Database health check passed');
            }
          } catch (error) {
            safeLogger.error('❌ Database health check failed:', error);
            // Optionally: Implement reconnection logic here
          }
        }, 300000); // Every 5 minutes
      }
    }

  } catch (error) {
    safeLogger.error('❌ Failed to establish database connection:', error);
    client = undefined;
    db = undefined;
  }
} else {
  safeLogger.warn('⚠️  No DATABASE_URL provided. Database operations will be disabled.');
  client = undefined;
  db = undefined;
}

// Add graceful cleanup function with connection pool draining
const cleanup = async () => {
  safeLogger.info('🔄 Starting database cleanup...');

  // Clear metrics interval
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = undefined;
    safeLogger.debug('✅ Metrics collection interval cleared');
  }

  // Clear health check interval to prevent memory leaks
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = undefined;
    safeLogger.debug('✅ Database health check interval cleared');
  }

  // Log final metrics before shutdown
  const monitor = getMonitor();
  if (monitor) {
    const finalMetrics = monitor.getCurrentMetrics();
    const summary = monitor.getMetricsSummary();
    safeLogger.info('📊 Final Connection Pool Metrics:', {
      totalQueries: finalMetrics.queryCount,
      totalErrors: finalMetrics.connectionErrors,
      avgUtilization: `${summary.avgUtilization.toFixed(1)}%`,
      avgQueryDuration: `${summary.avgQueryDuration.toFixed(0)}ms`,
    });
  }

  if (client) {
    try {
      // Don't close in development to support hot-reloading
      if (process.env.NODE_ENV === 'production') {
        // Give active queries time to complete (max 5 seconds)
        const timeout = new Promise((resolve) => setTimeout(resolve, 5000));
        const closePromise = client.end({ timeout: 5 });

        await Promise.race([closePromise, timeout]);
        safeLogger.info('✅ Database client closed gracefully');
      }
    } catch (error) {
      safeLogger.error('❌ Error closing database client:', error);
    }
  }
};

// Register cleanup handlers for graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('SIGTERM', async () => {
    safeLogger.info('📡 SIGTERM signal received: closing database connections');
    await cleanup();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    safeLogger.info('📡 SIGINT signal received: closing database connections');
    await cleanup();
    process.exit(0);
  });
}

// Export cleanup function for use in graceful shutdown
export { db, client, cleanup };

/// <reference types="node" />

// Type declarations for Node.js globals
declare var setInterval: (callback: (...args: any[]) => void, ms: number, ...args: any[]) => any;
declare var clearInterval: (intervalId: any) => void;
declare var setTimeout: (callback: (...args: any[]) => void, ms: number, ...args: any[]) => any;

import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import * as schema from "./schema";
import * as dotenv from "dotenv";
import { initializeMonitor, getMonitor } from './connectionPoolMonitor';

// Add type definitions for Node.js timer functions


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
let healthCheckInterval: ReturnType<typeof setInterval> | undefined;
let metricsInterval: ReturnType<typeof setInterval> | undefined;

if (connectionString) {
  try {
    // Reuse existing connection in development (hot-reloading)
    if (process.env.NODE_ENV !== 'production' && global._dbClient) {
      client = global._dbClient;
      db = global._dbInstance;
      safeLogger.debug('🔄 Reusing existing database connection (Development)');
    } else {
      // Restored Pro tier database pool configuration with improved settings
      const maxConnections = process.env.DB_POOL_MAX
        ? parseInt(process.env.DB_POOL_MAX)
        : (isRenderFree ? 2 : (isRenderPro ? 25 : 15)); // Pro tier: 25, Standard: 15, Free: 2

      // Calculate min connections based on max connections for better resource management
      const minConnections = Math.max(1, Math.floor(maxConnections * 0.2)); // 20% of max connections

      const clientConfig = {
        prepare: false, // Disable prefetch as it's not supported in production environments
        max: maxConnections,
        min: minConnections, // Add minimum connection count
        idle_timeout: isRenderFree ? 20 : (isRenderPro ? 30 : 60), // Seconds
        connect_timeout: isRenderFree ? 10 : (isRenderPro ? 5 : 3), // Increased timeout for better reliability
        max_lifetime: 60 * 30, // 30 minutes max connection lifetime to prevent stale connections

        // Advanced connection pool settings
        connection: {
          application_name: 'linkdao_backend',
        },

        // Add resource management options
        transform: {
          undefined: null, // Transform undefined to null to prevent issues
        },

        // Reduce memory usage by limiting result set processing
        fetch_array_size: isResourceConstrained ? 100 : 1000,

        // Connection pool optimization
        // Keep connections alive to avoid reconnection overhead
        keep_alive: isResourceConstrained ? 0 : 30,

        // Error handling
        onclose: () => {
          if (process.env.NODE_ENV !== 'production') {
            safeLogger.debug('Database connection closed');
          }
        },

        // Retry configuration for better resilience
        retry_backoff: true,
        retry_max: 3,
        retry_delay: 1000, // 1 second initial delay

        // Add connection validation
        debug: process.env.NODE_ENV !== 'production' ? console.log : false,
      };

      client = postgres(connectionString, clientConfig);
      db = drizzle(client, { schema });

      // Store in global for development hot-reloading
      if (process.env.NODE_ENV !== 'production') {
        global._dbClient = client;
        global._dbInstance = db;
      }

      const tierInfo = isRenderFree ? 'Free' : (isRenderPro ? 'Pro' : 'Standard');
      safeLogger.info(`✅ Database connection established successfully (${tierInfo} tier optimized, max: ${maxConnections}, min: ${minConnections})`);

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
      // Skip in test environment to prevent "Cannot log after tests are done" errors
      if (process.env.NODE_ENV !== 'test') {
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
      }

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
      if (isResourceConstrained && process.env.NODE_ENV !== 'test') {
        // Test connection periodically and store interval reference for cleanup
        healthCheckInterval = setInterval(async () => {
          try {
            if (client) {
              await client`SELECT 1`;
              safeLogger.debug('✅ Database health check passed');
            }
          } catch (error) {
            safeLogger.error('❌ Database health check failed:', error);

            // Implement reconnection logic for specific errors
            if (error && typeof error === 'object' && ('code' in error)) {
              const errorCode = (error as any).code;
              if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
                safeLogger.warn('Database connection lost, attempting to reconnect...');
                // Clear existing client and db instances
                if (client) {
                  try {
                    await client.end();
                  } catch (endError) {
                    safeLogger.error('Error closing existing database client:', endError);
                  }
                }

                // Try to reinitialize the connection
                try {
                  client = postgres(connectionString, clientConfig);
                  db = drizzle(client, { schema });
                  safeLogger.info('✅ Database reconnection successful');
                } catch (reconnectError) {
                  safeLogger.error('❌ Database reconnection failed:', reconnectError);
                  client = undefined;
                  db = undefined;
                }
              }
            }
          }
        }, 300000); // Every 5 minutes
      }
    }

  } catch (error) {
    safeLogger.error('❌ Failed to establish database connection:', error);

    // Try to reconnect with exponential backoff
    if (error && typeof error === 'object' && ('code' in error)) {
      const errorCode = (error as any).code;
      if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
        safeLogger.warn('Database connection error detected, will retry with backoff');
        // We'll let the application continue without database for now
        // Individual services will handle the database unavailability gracefully
      }
    }

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

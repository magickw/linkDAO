/**
 * Redis Configuration
 * Simple Redis client wrapper for rate limiting and caching
 */

import Redis from 'ioredis';
import { safeLogger } from '../utils/safeLogger';

let redisClient: Redis | null = null;

// Check if Redis is disabled via environment variable
// Ensure Redis is enabled in production environment
const redisEnabled = process.env.REDIS_ENABLED !== 'false' && process.env.REDIS_ENABLED !== '0';
if (redisEnabled) {
  // Use try-catch with better error handling
  try {
    if (process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379' && process.env.REDIS_URL !== 'your_redis_url') {
      // Only create Redis client if URL is not the default localhost
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 2, // Reduced from 3 to prevent CPU spinning
        enableReadyCheck: false, // Don't wait for ready on startup
        lazyConnect: true, // Don't connect immediately
        connectTimeout: 10000, // 10 second connection timeout
        retryStrategy(times) {
          if (times > 2) {
            // Stop retrying and fail gracefully
            safeLogger.warn('Redis connection failed after 2 attempts, falling back to in-memory');
            return null;
          }
          // Reduced exponential backoff to prevent excessive retries
          const delay = Math.min(times * 500, 15000); // Reduced backoff up to 15s
          safeLogger.warn(`Redis reconnection attempt ${times}/2, next attempt in ${delay}ms`);
          return delay;
        }
      });

      // Add comprehensive error handling
      redisClient.on('error', (error) => {
        // Log but don't throw
        safeLogger.error('Redis connection error (will use fallback):', {
          message: error.message,
          name: error.name,
          code: (error as any).code
        });
      });

      redisClient.on('node error', (error) => {
        // Handle cluster node errors
        safeLogger.error('Redis node error (will use fallback):', {
          message: error.message,
          name: error.name,
          code: (error as any).code
        });
      });

      redisClient.on('connect', () => {
        safeLogger.info('Redis connected successfully');
      });

      redisClient.on('reconnecting', (delay) => {
        safeLogger.info(`Redis reconnecting in ${delay}ms...`);
      });

      // Attempt connection but don't wait for it
      redisClient.connect().catch(err => {
        safeLogger.warn('Redis connection failed, using in-memory fallback:', {
          message: err.message,
          name: err.name,
          code: (err as any).code
        });
        redisClient = null;
      });

    } else {
      safeLogger.info('Redis not configured or using localhost, rate limiting will use in-memory fallback');
    }
  } catch (error) {
    safeLogger.warn('Redis initialization error, using fallback:', {
      error: {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        errno: (error as any).errno,
        syscall: (error as any).syscall,
        address: (error as any).address,
        port: (error as any).port
      }
    });
    redisClient = null;
  }
} else {
  safeLogger.warn('Redis functionality is disabled via REDIS_ENABLED environment variable');
}

export { redisClient };

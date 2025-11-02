/**
 * Redis Configuration
 * Simple Redis client wrapper for rate limiting and caching
 */

import Redis from 'ioredis';

let redisClient: Redis | null = null;

// Use try-catch with better error handling
try {
  if (process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379') {
    // Only create Redis client if URL is not the default localhost
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false, // Don't wait for ready on startup
      lazyConnect: true, // Don't connect immediately
      retryStrategy(times) {
        if (times > 3) {
          // Stop retrying and fail gracefully
          console.warn('Redis connection failed after 3 attempts, falling back to in-memory');
          return null;
        }
        return Math.min(times * 100, 2000);
      }
    });

    redisClient.on('error', (error) => {
      // Log but don't throw
      console.warn('Redis connection error (will use fallback):', error.message);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });

    // Attempt connection but don't wait for it
    redisClient.connect().catch(err => {
      console.warn('Redis connection failed, using in-memory fallback:', err.message);
      redisClient = null;
    });

  } else {
    console.log('Redis not configured or using localhost, rate limiting will use in-memory fallback');
  }
} catch (error) {
  console.warn('Redis initialization error, using fallback:', error);
  redisClient = null;
}

export { redisClient };

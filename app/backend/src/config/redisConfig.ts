/**
 * Redis Configuration
 * Simple Redis client wrapper for rate limiting and caching
 */

import Redis from 'ioredis';
import { safeLogger } from '../utils/safeLogger';

let redisClient: Redis | null = null;

try {
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true
    });

    redisClient.on('error', (error) => {
      safeLogger.error('Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      safeLogger.info('Redis connected successfully');
    });

  } else {
    safeLogger.warn('REDIS_URL not configured, rate limiting will use in-memory fallback');
  }
} catch (error) {
  safeLogger.error('Redis initialization error:', error);
}

export { redisClient };

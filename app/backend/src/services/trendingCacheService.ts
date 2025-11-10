/**
 * Trending Cache Service
 *
 * Caches trending post scores using Redis for performance optimization
 */

import { createClient } from 'redis';
import { safeLogger } from '../utils/safeLogger';

class TrendingCacheService {
  private client: any;
  private connected: boolean = false;
  private useRedis: boolean = true; // Flag to enable/disable Redis functionality
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private readonly CACHE_PREFIX = 'trending:';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    // Check if Redis is disabled
    if (process.env.REDIS_ENABLED === 'false' || process.env.REDIS_ENABLED === '0') {
      this.useRedis = false;
      safeLogger.warn('Redis functionality is disabled via REDIS_ENABLED environment variable for trending cache');
    }
    
    if (this.useRedis) {
      this.initializeClient();
    } else {
      safeLogger.info('⚠️  Trending cache will operate in fallback mode (no caching) - Redis disabled');
    }
  }

  private async initializeClient() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Handle placeholder values
      if (redisUrl === 'your_redis_url' || redisUrl === 'redis://your_redis_url') {
        redisUrl = 'redis://localhost:6379';
      }

      safeLogger.info('🔗 Attempting Redis connection to:', redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 10000, // 10 seconds timeout
          reconnectStrategy: (attempts) => {
            this.reconnectAttempts = attempts;
            if (attempts > this.maxReconnectAttempts) {
              safeLogger.error('Redis max reconnection attempts reached, disabling Redis functionality for trending cache', {
                attempts,
                maxReconnectAttempts: this.maxReconnectAttempts,
                redisUrl: redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
              });
              this.useRedis = false;
              return false; // Stop reconnecting
            }
            
            // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, 16s...
            const delay = Math.min(Math.pow(2, attempts - 1) * 1000, 30000); // Cap at 30 seconds
            safeLogger.warn(`Redis reconnection attempt ${attempts}/${this.maxReconnectAttempts}, next attempt in ${delay}ms for trending cache`, {
              attempts,
              delay,
              redisUrl: redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
            });
            
            return delay;
          }
        }
      });

      this.client.on('error', (err: Error) => {
        safeLogger.error('Redis Client Error for trending cache:', {
          error: {
            name: err.name,
            message: err.message,
            code: (err as any).code,
            errno: (err as any).errno,
            syscall: (err as any).syscall,
            address: (err as any).address,
            port: (err as any).port,
            stack: err.stack
          },
          reconnectAttempts: this.reconnectAttempts,
          maxReconnectAttempts: this.maxReconnectAttempts,
          useRedis: this.useRedis,
          connected: this.connected
        });
        this.connected = false;
        
        // If connection fails repeatedly, disable Redis functionality
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.useRedis = false;
          safeLogger.warn('Redis functionality has been disabled due to persistent connection errors for trending cache', {
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
          });
        }
      });

      this.client.on('connect', () => {
        safeLogger.info('✅ Redis connected for trending cache');
        this.connected = true;
        this.reconnectAttempts = 0; // Reset on successful connection
      });

      this.client.on('ready', () => {
        safeLogger.info('✅ Redis ready for trending cache');
        this.connected = true;
        this.reconnectAttempts = 0; // Reset on successful connection
      });

      this.client.on('end', () => {
        safeLogger.info('Redis connection closed for trending cache');
        this.connected = false;
        
        // If we're disconnected and tried to reconnect too many times, disable Redis
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.useRedis = false;
          safeLogger.warn('Redis functionality has been disabled due to disconnection for trending cache');
        }
      });

      await this.client.connect();
    } catch (error) {
      safeLogger.error('Failed to initialize Redis client for trending cache:', {
        error: {
          name: error.name,
          message: error.message,
          code: (error as any).code,
          errno: (error as any).errno,
          syscall: (error as any).syscall,
          address: (error as any).address,
          port: (error as any).port
        },
        redisUrl: (process.env.REDIS_URL || 'redis://localhost:6379').replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      });
      safeLogger.info('⚠️  Trending cache will operate in fallback mode (no caching)');
      this.useRedis = false; // Disable Redis on connection failure
      this.connected = false;
    }
  }

  /**
   * Get trending scores from cache
   */
  async getTrendingScores(timeRange: string): Promise<any[] | null> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, returning null for trending scores:', timeRange);
      return null; // Cache miss in fallback mode
    }

    try {
      const cacheKey = `${this.CACHE_PREFIX}${timeRange}`;
      const cachedData = await this.client.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      return null;
    } catch (error) {
      safeLogger.error('Error getting trending scores from cache:', error);
      this.useRedis = false; // Disable Redis on failure
      return null;
    }
  }

  /**
   * Set trending scores in cache
   */
  async setTrendingScores(timeRange: string, scores: any[]): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, skipping trending scores cache:', timeRange);
      return; // Skip caching in fallback mode
    }

    try {
      const cacheKey = `${this.CACHE_PREFIX}${timeRange}`;
      await this.client.setEx(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(scores)
      );
    } catch (error) {
      safeLogger.error('Error setting trending scores in cache:', error);
      this.useRedis = false; // Disable Redis on failure
    }
  }

  /**
   * Invalidate trending cache for a specific time range
   */
  async invalidateTrendingCache(timeRange?: string): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, skipping trending cache invalidation');
      return;
    }

    try {
      if (timeRange) {
        const cacheKey = `${this.CACHE_PREFIX}${timeRange}`;
        await this.client.del(cacheKey);
      } else {
        // Invalidate all trending caches
        const keys = await this.client.keys(`${this.CACHE_PREFIX}*`);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      }
    } catch (error) {
      safeLogger.error('Error invalidating trending cache:', error);
      this.useRedis = false; // Disable Redis on failure
    }
  }

  /**
   * Get engagement cache for a post
   */
  async getEngagementCache(postId: number): Promise<any | null> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, returning null for engagement cache:', postId);
      return null;
    }

    try {
      const cacheKey = `engagement:${postId}`;
      const cachedData = await this.client.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      return null;
    } catch (error) {
      safeLogger.error('Error getting engagement cache:', error);
      this.useRedis = false; // Disable Redis on failure
      return null;
    }
  }

  /**
   * Set engagement cache for a post
   */
  async setEngagementCache(postId: number, data: any, ttl: number = 60): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, skipping engagement cache:', postId);
      return;
    }

    try {
      const cacheKey = `engagement:${postId}`;
      await this.client.setEx(cacheKey, ttl, JSON.stringify(data));
    } catch (error) {
      safeLogger.error('Error setting engagement cache:', error);
      this.useRedis = false; // Disable Redis on failure
    }
  }

  /**
   * Invalidate engagement cache for a post
   */
  async invalidateEngagementCache(postId: number): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, skipping engagement cache invalidation:', postId);
      return;
    }

    try {
      const cacheKey = `engagement:${postId}`;
      await this.client.del(cacheKey);
    } catch (error) {
      safeLogger.error('Error invalidating engagement cache:', error);
      this.useRedis = false; // Disable Redis on failure
    }
  }

  /**
   * Get cache stats
   */
  async getCacheStats(): Promise<any> {
    if (!this.useRedis) {
      return {
        connected: false,
        enabled: false,
        keys: 0,
        message: 'Redis not connected - operating in fallback mode'
      };
    }

    try {
      const keys = await this.client.keys('*');
      const trendingKeys = await this.client.keys(`${this.CACHE_PREFIX}*`);
      const engagementKeys = await this.client.keys('engagement:*');

      return {
        connected: true,
        enabled: true,
        totalKeys: keys.length,
        trendingKeys: trendingKeys.length,
        engagementKeys: engagementKeys.length,
        cacheTTL: this.CACHE_TTL
      };
    } catch (error) {
      safeLogger.error('Error getting cache stats:', error);
      this.useRedis = false; // Disable Redis on failure
      return {
        connected: false,
        enabled: false,
        error: 'Failed to retrieve cache stats'
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client && this.useRedis) {
      try {
        await this.client.quit();
        this.useRedis = false;
        this.connected = false;
      } catch (error) {
        safeLogger.error('Error closing Redis connection:', error);
        this.useRedis = false;
        this.connected = false;
      }
    }
  }
  
  /**
   * Check if Redis is enabled for this service
   */
  isRedisEnabled(): boolean {
    return this.useRedis;
  }
}

export const trendingCacheService = new TrendingCacheService();

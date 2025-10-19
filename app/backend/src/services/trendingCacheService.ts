/**
 * Trending Cache Service
 *
 * Caches trending post scores using Redis for performance optimization
 */

import { createClient } from 'redis';

class TrendingCacheService {
  private client: any;
  private connected: boolean = false;
  private readonly CACHE_PREFIX = 'trending:';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err: Error) => {
        console.error('Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected for trending cache');
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      console.log('⚠️  Trending cache will operate in fallback mode (no caching)');
      this.connected = false;
    }
  }

  /**
   * Get trending scores from cache
   */
  async getTrendingScores(timeRange: string): Promise<any[] | null> {
    if (!this.connected) {
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
      console.error('Error getting trending scores from cache:', error);
      return null;
    }
  }

  /**
   * Set trending scores in cache
   */
  async setTrendingScores(timeRange: string, scores: any[]): Promise<void> {
    if (!this.connected) {
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
      console.error('Error setting trending scores in cache:', error);
    }
  }

  /**
   * Invalidate trending cache for a specific time range
   */
  async invalidateTrendingCache(timeRange?: string): Promise<void> {
    if (!this.connected) {
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
      console.error('Error invalidating trending cache:', error);
    }
  }

  /**
   * Get engagement cache for a post
   */
  async getEngagementCache(postId: number): Promise<any | null> {
    if (!this.connected) {
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
      console.error('Error getting engagement cache:', error);
      return null;
    }
  }

  /**
   * Set engagement cache for a post
   */
  async setEngagementCache(postId: number, data: any, ttl: number = 60): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const cacheKey = `engagement:${postId}`;
      await this.client.setEx(cacheKey, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Error setting engagement cache:', error);
    }
  }

  /**
   * Invalidate engagement cache for a post
   */
  async invalidateEngagementCache(postId: number): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const cacheKey = `engagement:${postId}`;
      await this.client.del(cacheKey);
    } catch (error) {
      console.error('Error invalidating engagement cache:', error);
    }
  }

  /**
   * Get cache stats
   */
  async getCacheStats(): Promise<any> {
    if (!this.connected) {
      return {
        connected: false,
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
        totalKeys: keys.length,
        trendingKeys: trendingKeys.length,
        engagementKeys: engagementKeys.length,
        cacheTTL: this.CACHE_TTL
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        connected: false,
        error: 'Failed to retrieve cache stats'
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
}

export const trendingCacheService = new TrendingCacheService();

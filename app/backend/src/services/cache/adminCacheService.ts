import Redis from 'ioredis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

interface DashboardMetrics {
  pendingModerations: number;
  pendingSellerApplications: number;
  openDisputes: number;
  suspendedUsers: number;
  totalUsers: number;
  totalSellers: number;
}

interface UserCacheData {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  lastActive?: string;
}

/**
 * Redis Caching Service for Admin Data
 * Reduces database load by caching frequently accessed data
 */
export class AdminCacheService {
  private redis: Redis;
  private defaultTTL: number = 300; // 5 minutes default
  private keyPrefix: string = 'admin:';

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.redis.on('connect', () => {
      console.log('Admin cache service connected to Redis');
    });

    this.redis.on('error', (error) => {
      console.error('Redis cache error:', error);
    });
  }

  /**
   * Generate cache key with prefix
   */
  private getKey(key: string, prefix?: string): string {
    return `${prefix || this.keyPrefix}${key}`;
  }

  /**
   * Get cached dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics | null> {
    try {
      const cached = await this.redis.get(this.getKey('dashboard:metrics'));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached dashboard metrics:', error);
      return null;
    }
  }

  /**
   * Cache dashboard metrics
   */
  async cacheDashboardMetrics(metrics: DashboardMetrics, ttl: number = 30): Promise<void> {
    try {
      await this.redis.setex(
        this.getKey('dashboard:metrics'),
        ttl,
        JSON.stringify(metrics)
      );
    } catch (error) {
      console.error('Error caching dashboard metrics:', error);
    }
  }

  /**
   * Get cached user data
   */
  async getUser(userId: string): Promise<UserCacheData | null> {
    try {
      const cached = await this.redis.get(this.getKey(`user:${userId}`));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached user:', error);
      return null;
    }
  }

  /**
   * Cache user data
   */
  async cacheUser(user: UserCacheData, ttl: number = 600): Promise<void> {
    try {
      await this.redis.setex(
        this.getKey(`user:${user.id}`),
        ttl,
        JSON.stringify(user)
      );
    } catch (error) {
      console.error('Error caching user:', error);
    }
  }

  /**
   * Get cached user list with pagination
   */
  async getUserList(page: number, filters?: Record<string, any>): Promise<any | null> {
    try {
      const filterKey = filters ? `:${JSON.stringify(filters)}` : '';
      const cached = await this.redis.get(this.getKey(`users:list:${page}${filterKey}`));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached user list:', error);
      return null;
    }
  }

  /**
   * Cache user list
   */
  async cacheUserList(
    page: number,
    data: any,
    filters?: Record<string, any>,
    ttl: number = 120
  ): Promise<void> {
    try {
      const filterKey = filters ? `:${JSON.stringify(filters)}` : '';
      await this.redis.setex(
        this.getKey(`users:list:${page}${filterKey}`),
        ttl,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Error caching user list:', error);
    }
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(`user:${userId}`));
      
      // Invalidate all user list caches
      const pattern = this.getKey('users:list:*');
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Error invalidating user cache:', error);
    }
  }

  /**
   * Get cached moderation queue
   */
  async getModerationQueue(filters?: Record<string, any>): Promise<any | null> {
    try {
      const filterKey = filters ? `:${JSON.stringify(filters)}` : '';
      const cached = await this.redis.get(this.getKey(`moderation:queue${filterKey}`));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached moderation queue:', error);
      return null;
    }
  }

  /**
   * Cache moderation queue
   */
  async cacheModerationQueue(
    data: any,
    filters?: Record<string, any>,
    ttl: number = 60
  ): Promise<void> {
    try {
      const filterKey = filters ? `:${JSON.stringify(filters)}` : '';
      await this.redis.setex(
        this.getKey(`moderation:queue${filterKey}`),
        ttl,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Error caching moderation queue:', error);
    }
  }

  /**
   * Invalidate moderation queue cache
   */
  async invalidateModerationQueue(): Promise<void> {
    try {
      const pattern = this.getKey('moderation:queue*');
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Error invalidating moderation queue cache:', error);
    }
  }

  /**
   * Get cached analytics data
   */
  async getAnalytics(metric: string, timeRange: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(this.getKey(`analytics:${metric}:${timeRange}`));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached analytics:', error);
      return null;
    }
  }

  /**
   * Cache analytics data
   */
  async cacheAnalytics(
    metric: string,
    timeRange: string,
    data: any,
    ttl: number = 300
  ): Promise<void> {
    try {
      await this.redis.setex(
        this.getKey(`analytics:${metric}:${timeRange}`),
        ttl,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Error caching analytics:', error);
    }
  }

  /**
   * Get cached AI moderation result
   */
  async getAIModerationResult(contentId: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(this.getKey(`ai:moderation:${contentId}`));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached AI result:', error);
      return null;
    }
  }

  /**
   * Cache AI moderation result
   */
  async cacheAIModerationResult(
    contentId: string,
    result: any,
    ttl: number = 3600
  ): Promise<void> {
    try {
      await this.redis.setex(
        this.getKey(`ai:moderation:${contentId}`),
        ttl,
        JSON.stringify(result)
      );
    } catch (error) {
      console.error('Error caching AI result:', error);
    }
  }

  /**
   * Generic get from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const fullKey = this.getKey(key, options?.prefix);
      const cached = await this.redis.get(fullKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error(`Error getting cached key ${key}:`, error);
      return null;
    }
  }

  /**
   * Generic set to cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = this.getKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;
      await this.redis.setex(fullKey, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting cached key ${key}:`, error);
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = this.getKey(key, options?.prefix);
      await this.redis.del(fullKey);
    } catch (error) {
      console.error(`Error deleting cached key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string, options?: CacheOptions): Promise<void> {
    try {
      const fullPattern = this.getKey(pattern, options?.prefix);
      const keys = await this.redis.keys(fullPattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(`Error deleting pattern ${pattern}:`, error);
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string, options?: CacheOptions): Promise<number> {
    try {
      const fullKey = this.getKey(key, options?.prefix);
      const result = await this.redis.incr(fullKey);
      
      // Set expiry if provided
      if (options?.ttl) {
        await this.redis.expire(fullKey, options.ttl);
      }
      
      return result;
    } catch (error) {
      console.error(`Error incrementing key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options?.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error(`Error checking key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set with expiry at specific time
   */
  async setExpireAt(key: string, value: any, timestamp: number, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = this.getKey(key, options?.prefix);
      await this.redis.set(fullKey, JSON.stringify(value));
      await this.redis.expireat(fullKey, timestamp);
    } catch (error) {
      console.error(`Error setting key with expireAt ${key}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connectedClients: number;
    usedMemory: string;
    totalKeys: number;
    hitRate?: number;
  }> {
    try {
      const info = await this.redis.info('stats');
      const memory = await this.redis.info('memory');
      const dbSize = await this.redis.dbsize();
      
      // Parse stats
      const stats = {
        connectedClients: 0,
        usedMemory: '0',
        totalKeys: dbSize,
      };
      
      // Extract memory usage
      const memoryMatch = memory.match(/used_memory_human:([^\r\n]+)/);
      if (memoryMatch) {
        stats.usedMemory = memoryMatch[1];
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        connectedClients: 0,
        usedMemory: '0',
        totalKeys: 0,
      };
    }
  }

  /**
   * Clear all admin cache
   */
  async clearAll(): Promise<void> {
    try {
      const pattern = this.getKey('*');
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      console.log(`Cleared ${keys.length} cache keys`);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(data: {
    dashboardMetrics?: DashboardMetrics;
    topUsers?: UserCacheData[];
    recentAnalytics?: any;
  }): Promise<void> {
    try {
      // Cache dashboard metrics
      if (data.dashboardMetrics) {
        await this.cacheDashboardMetrics(data.dashboardMetrics);
      }
      
      // Cache top users
      if (data.topUsers) {
        for (const user of data.topUsers) {
          await this.cacheUser(user);
        }
      }
      
      // Cache recent analytics
      if (data.recentAnalytics) {
        await this.cacheAnalytics('overview', '24h', data.recentAnalytics);
      }
      
      console.log('Cache warmed up successfully');
    } catch (error) {
      console.error('Error warming up cache:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

// Export singleton
export const adminCacheService = new AdminCacheService();

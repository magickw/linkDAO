import Redis from 'ioredis';
import { safeLogger } from '../utils/safeLogger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags: string[];
}

export class CommunityCacheService {
  private static instance: CommunityCacheService;
  private redis: Redis;
  private localCache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly MAX_LOCAL_CACHE_SIZE = 1000;

  private constructor() {
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      safeLogger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      safeLogger.info('Redis connected successfully');
    });

    // Clean up expired local cache entries every minute
    setInterval(() => {
      this.cleanupLocalCache();
    }, 60000);
  }

  public static getInstance(): CommunityCacheService {
    if (!CommunityCacheService.instance) {
      CommunityCacheService.instance = new CommunityCacheService();
    }
    return CommunityCacheService.instance;
  }

  /**
   * Get data from cache (local first, then Redis)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check local cache first
      const localEntry = this.localCache.get(key);
      if (localEntry && localEntry.expiresAt > Date.now()) {
        return localEntry.data;
      }

      // Check Redis
      const redisValue = await this.redis.get(key);
      if (redisValue) {
        const entry: CacheEntry<T> = JSON.parse(redisValue);
        
        // Cache in local if not expired
        if (entry.expiresAt > Date.now()) {
          this.setLocalCache(key, entry);
        }
        
        return entry.data;
      }

      return null;
    } catch (error) {
      safeLogger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache (both local and Redis)
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || this.DEFAULT_TTL;
      const tags = options.tags || [];
      const expiresAt = Date.now() + (ttl * 1000);

      const entry: CacheEntry<T> = {
        data,
        expiresAt,
        tags
      };

      // Set in local cache
      this.setLocalCache(key, entry);

      // Set in Redis
      await this.redis.setex(key, ttl, JSON.stringify(entry));

      // Add to tag sets for invalidation
      if (tags.length > 0) {
        await this.addToTagSets(key, tags);
      }
    } catch (error) {
      safeLogger.error('Cache set error:', error);
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<void> {
    try {
      // Remove from local cache
      this.localCache.delete(key);

      // Remove from Redis
      await this.redis.del(key);
    } catch (error) {
      safeLogger.error('Cache delete error:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = `cache:tag:${tag}`;
      const keys = await this.redis.smembers(tagKey);
      
      if (keys.length > 0) {
        // Remove from local cache
        keys.forEach(key => this.localCache.delete(key));
        
        // Remove from Redis
        await this.redis.del(...keys);
        
        // Remove tag set
        await this.redis.del(tagKey);
      }
    } catch (error) {
      safeLogger.error('Cache invalidate by tag error:', error);
    }
  }

  /**
   * Invalidate multiple tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    await Promise.all(tags.map(tag => this.invalidateByTag(tag)));
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, options);
    return data;
  }

  /**
   * Warm up cache with common data
   */
  async warmupCommunityCache(communityId: string): Promise<void> {
    try {
      const cacheKeys = [
        `community:${communityId}`,
        `community:${communityId}:members`,
        `community:${communityId}:stats`,
        `community:${communityId}:posts:recent`,
        `community:${communityId}:proposals:active`
      ];

      // This would typically call the actual services to fetch data
      // For now, we'll just log the warmup action
      safeLogger.info(`Warming up cache for community: ${communityId}`, { cacheKeys });
    } catch (error) {
      safeLogger.error('Cache warmup error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    localCacheSize: number;
    redisConnected: boolean;
    redisMemory?: string;
  }> {
    try {
      const redisMemory = this.redis.status === 'ready' 
        ? await this.redis.info('memory').then(info => {
            const match = info.match(/used_memory_human:(.+)/);
            return match ? match[1].trim() : 'unknown';
          }).catch(() => 'unknown')
        : 'unknown';

      return {
        localCacheSize: this.localCache.size,
        redisConnected: this.redis.status === 'ready',
        redisMemory
      };
    } catch (error) {
      safeLogger.error('Cache stats error:', error);
      return {
        localCacheSize: this.localCache.size,
        redisConnected: false
      };
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear(): Promise<void> {
    try {
      this.localCache.clear();
      await this.redis.flushdb();
    } catch (error) {
      safeLogger.error('Cache clear error:', error);
    }
  }

  private setLocalCache<T>(key: string, entry: CacheEntry<T>): void {
    // Remove oldest entries if cache is too large
    if (this.localCache.size >= this.MAX_LOCAL_CACHE_SIZE) {
      const oldestKey = this.localCache.keys().next().value;
      if (oldestKey) {
        this.localCache.delete(oldestKey);
      }
    }
    
    this.localCache.set(key, entry);
  }

  private cleanupLocalCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache.entries()) {
      if (entry.expiresAt <= now) {
        this.localCache.delete(key);
      }
    }
  }

  private async addToTagSets(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    tags.forEach(tag => {
      const tagKey = `cache:tag:${tag}`;
      pipeline.sadd(tagKey, key);
      pipeline.expire(tagKey, 3600); // Tag sets expire after 1 hour
    });
    
    await pipeline.exec();
  }

  /**
   * Generate cache key with namespace
   */
  static generateKey(...parts: string[]): string {
    return parts.join(':');
  }

  /**
   * Generate community-specific cache key
   */
  static generateCommunityKey(communityId: string, type: string, identifier?: string): string {
    const parts = ['community', communityId, type];
    if (identifier) {
      parts.push(identifier);
    }
    return this.generateKey(...parts);
  }

  /**
   * Generate user-specific cache key
   */
  static generateUserKey(userAddress: string, type: string, identifier?: string): string {
    const parts = ['user', userAddress.toLowerCase(), type];
    if (identifier) {
      parts.push(identifier);
    }
    return this.generateKey(...parts);
  }

  /**
   * Generate search cache key
   */
  static generateSearchKey(query: string, filters: Record<string, any> = {}): string {
    const filterString = JSON.stringify(filters);
    const hash = Buffer.from(filterString).toString('base64').replace(/[/+=]/g, '');
    return this.generateKey('search', query.toLowerCase(), hash);
  }
}

export const communityCacheService = CommunityCacheService.getInstance();
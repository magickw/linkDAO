import { safeLogger } from '../utils/safeLogger';
import { redisService } from './redisService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface QueryCacheOptions {
  ttl?: number; // Time to live in seconds (default: 300 = 5 minutes)
  keyPrefix?: string;
  enabled?: boolean;
}

/**
 * Query Cache Service
 * Caches database query results to reduce load and improve performance
 */
export class QueryCacheService {
  private static instance: QueryCacheService;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly MEMORY_CACHE_LIMIT = 500; // Max items in memory cache
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly MAX_RESULT_SIZE = 1024 * 1024; // 1MB max result size

  private constructor() {}

  public static getInstance(): QueryCacheService {
    if (!QueryCacheService.instance) {
      QueryCacheService.instance = new QueryCacheService();
    }
    return QueryCacheService.instance;
  }

  /**
   * Get cached query result
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first (if available)
      if (redisService.isRedisConnected()) {
        const redisKey = this.buildRedisKey(key);
        const cached = await (redisService.getClient() as any).get(redisKey);
        if (cached) {
          const parsed = JSON.parse(cached) as CacheEntry<T>;

          // Check if expired
          if (Date.now() - parsed.timestamp < parsed.ttl * 1000) {
            safeLogger.debug(`Cache hit (Redis): ${key}`);
            return parsed.data;
          } else {
            // Remove expired entry
            await redisService.getClient().del(redisKey);
          }
        }
      }

      // Fallback to memory cache
      if (this.memoryCache.has(key)) {
        const entry = this.memoryCache.get(key)!;

        // Check if expired
        if (Date.now() - entry.timestamp < entry.ttl * 1000) {
          safeLogger.debug(`Cache hit (Memory): ${key}`);
          return entry.data;
        } else {
          // Remove expired entry
          this.memoryCache.delete(key);
        }
      }

      safeLogger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      safeLogger.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Set cached query result
   */
  public async set<T>(key: string, data: T, options: QueryCacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl ?? this.DEFAULT_TTL;
      const enabled = options.enabled ?? true;

      if (!enabled) {
        safeLogger.debug(`Cache disabled for key: ${key}`);
        return;
      }

      // Check result size
      const dataSize = JSON.stringify(data).length;
      if (dataSize > this.MAX_RESULT_SIZE) {
        safeLogger.warn(`Result too large to cache (${dataSize} bytes): ${key}`);
        return;
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };

      // Store in Redis (if available)
      if (redisService.isRedisConnected()) {
        const redisKey = this.buildRedisKey(key);
        await (redisService.getClient() as any).setEx(
          redisKey,
          ttl,
          JSON.stringify(entry)
        );
        safeLogger.debug(`Cached in Redis: ${key} (TTL: ${ttl}s, Size: ${dataSize} bytes)`);
      } else {
        // Store in memory cache
        this.memoryCache.set(key, entry);

        // Enforce memory cache limit (LRU eviction)
        if (this.memoryCache.size > this.MEMORY_CACHE_LIMIT) {
          const oldestKey = this.findOldestEntry();
          if (oldestKey) {
            this.memoryCache.delete(oldestKey);
            safeLogger.debug(`Evicted from memory cache (LRU): ${oldestKey}`);
          }
        }

        safeLogger.debug(`Cached in memory: ${key} (TTL: ${ttl}s, Size: ${dataSize} bytes)`);
      }
    } catch (error) {
      safeLogger.error('Error setting cache:', error);
    }
  }

  /**
   * Invalidate cache entry
   */
  public async invalidate(key: string): Promise<void> {
    try {
      // Remove from Redis
      if (redisService.isRedisConnected()) {
        const redisKey = this.buildRedisKey(key);
        await (redisService.getClient() as any).del(redisKey);
      }

      // Remove from memory cache
      this.memoryCache.delete(key);

      safeLogger.debug(`Cache invalidated: ${key}`);
    } catch (error) {
      safeLogger.error('Error invalidating cache:', error);
    }
  }

  /**
   * Invalidate multiple cache entries by pattern
   */
  public async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Remove from Redis by pattern
      if (redisService.isRedisConnected()) {
        const client = redisService.getClient() as any;
        const keys = await client.keys(this.buildRedisKey(pattern));
        if (keys.length > 0) {
          await client.del(...keys);
          safeLogger.info(`Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
        }
      }

      // Remove from memory cache by pattern
      const regex = new RegExp(pattern);
      const keysToDelete: string[] = [];
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.memoryCache.delete(key));

      if (keysToDelete.length > 0) {
        safeLogger.info(`Invalidated ${keysToDelete.length} memory cache entries matching pattern: ${pattern}`);
      }
    } catch (error) {
      safeLogger.error('Error invalidating cache pattern:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  public async clear(): Promise<void> {
    try {
      // Clear Redis
      if (redisService.isRedisConnected()) {
        const client = redisService.getClient() as any;
        const keys = await client.keys(this.buildRedisKey('*'));
        if (keys.length > 0) {
          await client.del(...keys);
          safeLogger.info(`Cleared ${keys.length} Redis cache entries`);
        }
      }

      // Clear memory cache
      this.memoryCache.clear();
      safeLogger.info('Cleared all memory cache entries');
    } catch (error) {
      safeLogger.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    memoryCacheSize: number;
    memoryCacheLimit: number;
    redisConnected: boolean;
  } {
    return {
      memoryCacheSize: this.memoryCache.size,
      memoryCacheLimit: this.MEMORY_CACHE_LIMIT,
      redisConnected: redisService.isRedisConnected()
    };
  }

  /**
   * Build Redis key with prefix
   */
  private buildRedisKey(key: string): string {
    return `query_cache:${key}`;
  }

  /**
   * Find oldest cache entry for LRU eviction
   */
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}

export const queryCacheService = QueryCacheService.getInstance();
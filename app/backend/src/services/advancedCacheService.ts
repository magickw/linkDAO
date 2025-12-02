import Redis from 'ioredis';
import { logger } from '../utils/logger';

/**
 * Advanced Caching Service
 * 
 * Provides multi-layer caching with Redis and in-memory options:
 * - Redis distributed caching
 * - In-memory LRU cache
 * - Cache warming strategies
 * - Intelligent cache invalidation
 * - Performance monitoring
 */

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize?: number; // Maximum number of items (for in-memory)
  strategy: 'lru' | 'fifo' | 'ttl';
  persistToDisk?: boolean;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictionCount: number;
  totalRequests: number;
  averageLatency: number;
  memoryUsage: number;
  redisMemoryUsage: number;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export class AdvancedCacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private cacheMetrics: CacheMetrics = {
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
    totalRequests: 0,
    averageLatency: 0,
    memoryUsage: 0,
    redisMemoryUsage: 0
  };
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly MEMORY_CACHE_LIMIT = 1000;

  constructor() {
    this.initializeRedis();
    this.startMetricsCollection();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        keyPrefix: 'linkdao:',
        // Enable compression for large values
        enableAutoPipelining: true,
        maxRetriesPerRequest: 3
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.redis = null;
      });

      // Test connection
      await this.redis.ping();
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.redis = null;
    }
  }

  /**
   * Get value from cache (Redis first, then memory)
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    let value: T | null = null;
    let cacheHit = false;

    try {
      // Try Redis first
      if (this.redis) {
        const redisValue = await this.redis.get(key);
        if (redisValue) {
          value = JSON.parse(redisValue);
          cacheHit = true;
        }
      }

      // Fallback to memory cache
      if (!value && this.memoryCache.has(key)) {
        const entry = this.memoryCache.get(key)!;
        
        // Check if entry is still valid
        if (Date.now() - entry.timestamp < entry.ttl) {
          value = entry.value;
          entry.accessCount++;
          entry.lastAccessed = Date.now();
          cacheHit = true;
        } else {
          this.memoryCache.delete(key);
        }
      }

      // Update metrics
      this.updateMetrics(cacheHit, Date.now() - startTime);

      return value;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache (both Redis and memory)
   */
  async set<T>(
    key: string, 
    value: T, 
    config: Partial<CacheConfig> = {}
  ): Promise<void> {
    const {
      ttl = this.DEFAULT_TTL,
      maxSize = this.MEMORY_CACHE_LIMIT,
      strategy = 'lru'
    } = config;

    try {
      const serializedValue = JSON.stringify(value);
      const timestamp = Date.now();

      // Set in Redis
      if (this.redis) {
        await this.redis.setex(key, ttl, serializedValue);
      }

      // Set in memory cache
      const memoryEntry: CacheEntry<T> = {
        key,
        value,
        timestamp,
        ttl: ttl * 1000, // Convert to milliseconds
        accessCount: 0,
        lastAccessed: timestamp
      };

      // Apply cache size limits and eviction strategy
      if (this.memoryCache.size >= maxSize) {
        this.evictMemoryEntry(strategy);
      }

      this.memoryCache.set(key, memoryEntry);

      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<void> {
    try {
      // Delete from Redis
      if (this.redis) {
        await this.redis.del(key);
      }

      // Delete from memory
      this.memoryCache.delete(key);

      logger.debug(`Cache delete: ${key}`);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  /**
   * Clear cache
   */
  async clear(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        // Clear by pattern
        if (this.redis) {
          const keys = await this.redis.keys(`${pattern}*`);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        }

        // Clear memory cache by pattern
        for (const key of this.memoryCache.keys()) {
          if (key.startsWith(pattern)) {
            this.memoryCache.delete(key);
          }
        }
      } else {
        // Clear all
        if (this.redis) {
          await this.redis.flushdb();
        }
        this.memoryCache.clear();
      }

      logger.info(`Cache cleared: ${pattern || 'all'}`);
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Evict memory cache entry based on strategy
   */
  private evictMemoryEntry(strategy: 'lru' | 'fifo' | 'ttl'): void {
    let keyToDelete: string | null = null;

    switch (strategy) {
      case 'lru':
        // Find least recently used
        let oldestAccess = Date.now();
        for (const [key, entry] of this.memoryCache.entries()) {
          if (entry.lastAccessed < oldestAccess) {
            oldestAccess = entry.lastAccessed;
            keyToDelete = key;
          }
        }
        break;

      case 'fifo':
        // Find oldest entry
        let oldestTimestamp = Date.now();
        for (const [key, entry] of this.memoryCache.entries()) {
          if (entry.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.timestamp;
            keyToDelete = key;
          }
        }
        break;

      case 'ttl':
        // Find expired entry
        let earliestExpiry = Infinity;
        for (const [key, entry] of this.memoryCache.entries()) {
          const expiryTime = entry.timestamp + entry.ttl;
          if (expiryTime < earliestExpiry) {
            earliestExpiry = expiryTime;
            keyToDelete = key;
          }
        }
        break;
    }

    if (keyToDelete) {
      this.memoryCache.delete(keyToDelete);
      this.cacheMetrics.evictionCount++;
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(dataLoaders: Array<{
    key: string;
    loader: () => Promise<any>;
    ttl?: number;
    priority?: number;
  }>): Promise<void> {
    logger.info('Starting cache warming');
    
    // Sort by priority (higher priority first)
    const sortedLoaders = dataLoaders.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const loader of sortedLoaders) {
      try {
        const value = await loader.loader();
        await this.set(loader.key, value, { ttl: loader.ttl });
        logger.debug(`Cache warmed: ${loader.key}`);
      } catch (error) {
        logger.error(`Failed to warm cache for ${loader.key}:`, error);
      }
    }

    logger.info('Cache warming completed');
  }

  /**
   * Invalidate cache entries by pattern or tags
   */
  async invalidate(pattern: string): Promise<void> {
    await this.clear(pattern);
    logger.info(`Cache invalidated: ${pattern}`);
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    // This would require a tag-based cache implementation
    // For now, we'll use pattern matching
    for (const tag of tags) {
      await this.invalidate(`tag:${tag}`);
    }
  }

  /**
   * Get or set value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    config: Partial<CacheConfig> = {}
  ): Promise<T> {
    let value = await this.get<T>(key);
    
    if (value === null) {
      value = await loader();
      await this.set(key, value, config);
    }
    
    return value;
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        results.set(key, value);
      })
    );
    
    return results;
  }

  /**
   * Set multiple values in cache
   */
  async mset<T>(
    entries: Array<{ key: string; value: T; config?: Partial<CacheConfig> }>
  ): Promise<void> {
    await Promise.all(
      entries.map(entry => this.set(entry.key, entry.value, entry.config))
    );
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(hit: boolean, latency: number): void {
    this.cacheMetrics.totalRequests++;
    
    if (hit) {
      this.cacheMetrics.averageLatency = 
        (this.cacheMetrics.averageLatency * (this.cacheMetrics.totalRequests - 1) + latency) / 
        this.cacheMetrics.totalRequests;
    } else {
      this.cacheMetrics.averageLatency = 
        (this.cacheMetrics.averageLatency * (this.cacheMetrics.totalRequests - 1) + latency) / 
        this.cacheMetrics.totalRequests;
    }

    this.cacheMetrics.hitRate = 
      (this.cacheMetrics.hitRate * (this.cacheMetrics.totalRequests - 1) + (hit ? 1 : 0)) / 
      this.cacheMetrics.totalRequests;
    
    this.cacheMetrics.missRate = 1 - this.cacheMetrics.hitRate;
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // Memory usage
      this.cacheMetrics.memoryUsage = this.memoryCache.size;

      // Redis metrics
      if (this.redis) {
        const info = await this.redis.info('memory');
        this.cacheMetrics.redisMemoryUsage = parseInt(info.used_memory);
      }

      // Log metrics
      logger.debug('Cache metrics:', {
        hitRate: `${(this.cacheMetrics.hitRate * 100).toFixed(1)}%`,
        memoryCacheSize: this.cacheMetrics.memoryUsage,
        redisMemory: `${(this.cacheMetrics.redisMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
        averageLatency: `${this.cacheMetrics.averageLatency.toFixed(2)}ms`,
        evictions: this.cacheMetrics.evictionCount
      });
    } catch (error) {
      logger.error('Failed to collect metrics:', error);
    }
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.cacheMetrics };
  }

  /**
   * Get cache health status
   */
  async getHealthStatus(): Promise<{
    redisConnected: boolean;
    memoryCacheSize: number;
    hitRate: number;
    averageLatency: number;
    status: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const redisConnected = this.redis !== null && this.redis.status === 'ready';
    const memoryCacheSize = this.memoryCache.size;
    const hitRate = this.cacheMetrics.hitRate;
    const averageLatency = this.cacheMetrics.averageLatency;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!redisConnected && memoryCacheSize < 100) {
      status = 'unhealthy';
    } else if (!redisConnected || hitRate < 0.5 || averageLatency > 100) {
      status = 'degraded';
    }

    return {
      redisConnected,
      memoryCacheSize,
      hitRate,
      averageLatency,
      status
    };
  }

  /**
   * Preload commonly accessed data
   */
  async preloadCommonData(): Promise<void> {
    const commonDataLoaders = [
      {
        key: 'system:config',
        loader: async () => {
          // Load system configuration
          return { version: '1.0.0', environment: process.env.NODE_ENV };
        },
        ttl: 3600 // 1 hour
      },
      {
        key: 'marketplace:categories',
        loader: async () => {
          // Load marketplace categories
          // This would query the database
          return [];
        },
        ttl: 1800 // 30 minutes
      },
      {
        key: 'community:trending',
        loader: async () => {
          // Load trending communities
          return [];
        },
        ttl: 600 // 10 minutes
      }
    ];

    await this.warmCache(commonDataLoaders);
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Check memory cache for expired entries
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      this.memoryCache.delete(key);
    }

    if (expiredKeys.length > 0) {
      logger.info(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Close connections and cleanup
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
    this.memoryCache.clear();
    logger.info('Cache service closed');
  }
}

export const cacheService = new AdvancedCacheService();
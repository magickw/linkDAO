import { Redis, Cluster } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { LRUCache } from 'lru-cache';
import { performance } from 'perf_hooks';

interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };
  cluster?: {
    nodes: Array<{ host: string; port: number }>;
    options: any;
  };
  memory: {
    maxSize: number;
    ttl: number;
  };
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  memoryUsage: number;
}

export class CachingStrategiesService {
  protected redis: Redis | Cluster;
  protected memoryCache: LRUCache<string, CacheEntry<any>>;
  private stats: CacheStats;
  protected config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memoryUsage: 0,
    };

    // Initialize Redis connection
    if (config.cluster) {
      this.redis = new Cluster(config.cluster.nodes, config.cluster.options);
    } else {
      this.redis = new Redis({
        ...config.redis,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
      });
    }

    // Initialize memory cache
    this.memoryCache = new LRUCache({
      max: config.memory.maxSize,
      ttl: config.memory.ttl,
      updateAgeOnGet: true,
      allowStale: false,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Type assertion to handle the union type issue
    const redisClient: any = this.redis;
    
    redisClient.on('error', (error: any) => {
      safeLogger.error('Redis error:', error);
    });

    redisClient.on('connect', () => {
      safeLogger.info('Redis connected');
    });

    redisClient.on('ready', () => {
      safeLogger.info('Redis ready');
    });
  }

  // Multi-level caching strategy
  async get<T>(key: string, fallback?: () => Promise<T>, ttl: number = 3600): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      // Level 1: Memory cache (fastest)
      const memoryResult = this.getFromMemory<T>(key);
      if (memoryResult !== null) {
        this.stats.hits++;
        return memoryResult;
      }

      // Level 2: Redis cache
      const redisResult = await this.getFromRedis<T>(key);
      if (redisResult !== null) {
        // Store in memory cache for faster future access
        this.setInMemory(key, redisResult, ttl);
        this.stats.hits++;
        return redisResult;
      }

      // Level 3: Fallback function (database, API, etc.)
      if (fallback) {
        const fallbackResult = await fallback();
        if (fallbackResult !== null) {
          // Store in both caches
          await this.set(key, fallbackResult, ttl);
          return fallbackResult;
        }
      }

      this.stats.misses++;
      return null;
    } finally {
      const duration = performance.now() - startTime;
      if (duration > 100) { // Log slow cache operations
        safeLogger.warn(`Slow cache operation for key ${key}: ${duration.toFixed(2)}ms`);
      }
    }
  }

  // Set data in both memory and Redis
  async set<T>(key: string, data: T, ttl: number = 3600): Promise<void> {
    try {
      // Set in memory cache
      this.setInMemory(key, data, ttl);
      
      // Set in Redis
      await this.setInRedis(key, data, ttl);
      
      this.stats.sets++;
    } catch (error) {
      safeLogger.error('Error setting cache:', error);
      throw error;
    }
  }

  // Delete from both caches
  async delete(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await this.redis.del(key);
      this.stats.deletes++;
    } catch (error) {
      safeLogger.error('Error deleting from cache:', error);
      throw error;
    }
  }

  // Batch operations
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    const results: Array<T | null> = new Array(keys.length).fill(null);
    const redisKeys: string[] = [];
    const redisIndexes: number[] = [];

    // Check memory cache first
    keys.forEach((key, index) => {
      const memoryResult = this.getFromMemory<T>(key);
      if (memoryResult !== null) {
        results[index] = memoryResult;
        this.stats.hits++;
      } else {
        redisKeys.push(key);
        redisIndexes.push(index);
      }
    });

    // Get remaining keys from Redis
    if (redisKeys.length > 0) {
      try {
        const redisResults = await this.redis.mget(...redisKeys);
        redisResults.forEach((result, redisIndex) => {
          const originalIndex = redisIndexes[redisIndex];
          if (result) {
            const parsed = JSON.parse(result);
            results[originalIndex] = parsed;
            // Store in memory cache
            this.setInMemory(keys[originalIndex], parsed, 3600);
            this.stats.hits++;
          } else {
            this.stats.misses++;
          }
        });
      } catch (error) {
        safeLogger.error('Error in mget:', error);
        redisKeys.forEach(() => this.stats.misses++);
      }
    }

    return results;
  }

  async mset<T>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<void> {
    try {
      // Set in memory cache
      entries.forEach(({ key, data, ttl = 3600 }) => {
        this.setInMemory(key, data, ttl);
      });

      // Batch set in Redis
      const pipeline = this.redis.pipeline();
      entries.forEach(({ key, data, ttl = 3600 }) => {
        pipeline.setex(key, ttl, JSON.stringify(data));
      });
      
      await pipeline.exec();
      this.stats.sets += entries.length;
    } catch (error) {
      safeLogger.error('Error in mset:', error);
      throw error;
    }
  }

  // Cache patterns for specific use cases
  
  // Write-through cache
  async writeThrough<T>(
    key: string,
    data: T,
    persistFunction: (data: T) => Promise<void>,
    ttl: number = 3600
  ): Promise<void> {
    try {
      // Write to persistent storage first
      await persistFunction(data);
      
      // Then update cache
      await this.set(key, data, ttl);
    } catch (error) {
      safeLogger.error('Write-through cache error:', error);
      throw error;
    }
  }

  // Write-behind cache (async write)
  async writeBehind<T>(
    key: string,
    data: T,
    persistFunction: (data: T) => Promise<void>,
    ttl: number = 3600
  ): Promise<void> {
    try {
      // Update cache immediately
      await this.set(key, data, ttl);
      
      // Schedule async write to persistent storage
      setImmediate(async () => {
        try {
          await persistFunction(data);
        } catch (error) {
          safeLogger.error('Write-behind persist error:', error);
          // Could implement retry logic here
        }
      });
    } catch (error) {
      safeLogger.error('Write-behind cache error:', error);
      throw error;
    }
  }

  // Cache-aside pattern with automatic refresh
  async cacheAside<T>(
    key: string,
    loadFunction: () => Promise<T>,
    ttl: number = 3600,
    refreshThreshold: number = 0.8
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      // Check if cache needs refresh (proactive refresh)
      const entry = this.memoryCache.get(key);
      if (entry) {
        const age = Date.now() - entry.timestamp;
        const refreshTime = ttl * 1000 * refreshThreshold;
        
        if (age > refreshTime) {
          // Refresh cache in background
          setImmediate(async () => {
            try {
              const fresh = await loadFunction();
              await this.set(key, fresh, ttl);
            } catch (error) {
              safeLogger.error('Background refresh error:', error);
            }
          });
        }
      }
      
      return cached;
    }

    // Load from source and cache
    const data = await loadFunction();
    await this.set(key, data, ttl);
    return data;
  }

  // Distributed cache invalidation
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      // Delete from Redis
      const deleted = await this.redis.del(...keys);
      
      // Delete from memory cache
      keys.forEach(key => {
        const unprefixedKey = key.replace(this.config.redis.keyPrefix, '');
        this.memoryCache.delete(unprefixedKey);
      });

      this.stats.deletes += deleted;
      return deleted;
    } catch (error) {
      safeLogger.error('Error invalidating pattern:', error);
      throw error;
    }
  }

  // Cache warming
  async warmCache<T>(
    entries: Array<{ key: string; loader: () => Promise<T>; ttl?: number }>
  ): Promise<void> {
    const warmPromises = entries.map(async ({ key, loader, ttl = 3600 }) => {
      try {
        const data = await loader();
        await this.set(key, data, ttl);
      } catch (error) {
        safeLogger.error(`Error warming cache for key ${key}:`, error);
      }
    });

    await Promise.allSettled(warmPromises);
  }

  // Private helper methods
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (entry) {
      entry.hits++;
      return entry.data;
    }
    return null;
  }

  private setInMemory<T>(key: string, data: T, ttl: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    };
    this.memoryCache.set(key, entry, { ttl: ttl * 1000 });
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    try {
      const result = await this.redis.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      safeLogger.error('Redis get error:', error);
      return null;
    }
  }

  private async setInRedis<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      safeLogger.error('Redis set error:', error);
      throw error;
    }
  }

  // Monitoring and analytics
  getStats(): CacheStats {
    const totalOperations = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalOperations > 0 ? this.stats.hits / totalOperations : 0;
    this.stats.memoryUsage = this.memoryCache.size;
    return { ...this.stats };
  }

  async getRedisInfo(): Promise<any> {
    try {
      const info = await this.redis.info();
      return this.parseRedisInfo(info);
    } catch (error) {
      safeLogger.error('Error getting Redis info:', error);
      return null;
    }
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    });
    
    return result;
  }

  // Cleanup
  async close(): Promise<void> {
    this.memoryCache.clear();
    await this.redis.quit();
  }
}

// Cache key generators
export class CacheKeyGenerator {
  static product(id: string): string {
    return `product:${id}`;
  }

  static productList(filters: any, page: number, limit: number): string {
    const filterHash = Buffer.from(JSON.stringify(filters)).toString('base64');
    return `products:${filterHash}:${page}:${limit}`;
  }

  static userProfile(userId: string): string {
    return `user:${userId}`;
  }

  static userOrders(userId: string, status?: string): string {
    return `orders:${userId}${status ? `:${status}` : ''}`;
  }

  static reputation(userId: string): string {
    return `reputation:${userId}`;
  }

  static searchResults(query: string, filters: any): string {
    const filterHash = Buffer.from(JSON.stringify(filters)).toString('base64');
    const queryHash = Buffer.from(query).toString('base64');
    return `search:${queryHash}:${filterHash}`;
  }

  static analytics(metric: string, timeframe: string): string {
    return `analytics:${metric}:${timeframe}`;
  }
}

// Cache decorators for automatic caching
export function Cached(ttl: number = 3600, keyGenerator?: (...args: any[]) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cache = this.cache as CachingStrategiesService;
      if (!cache) {
        return method.apply(this, args);
      }

      const key = keyGenerator ? keyGenerator(...args) : `${propertyName}:${JSON.stringify(args)}`;
      
      return cache.cacheAside(key, () => method.apply(this, args), ttl);
    };
    
    return descriptor;
  };
}

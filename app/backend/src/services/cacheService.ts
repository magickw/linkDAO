import Redis from 'ioredis';
import { performance } from 'perf_hooks';

interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
    maxRetriesPerRequest: number;
    connectTimeout: number;
    commandTimeout: number;
  };
  ttl: {
    SELLER_PROFILE: number;
    LISTINGS: number;
    REPUTATION: number;
    AUTH_SESSION: number;
    SEARCH_RESULTS: number;
    DEFAULT: number;
  };
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  avgResponseTime: number;
  memoryUsage: number;
  connectedClients: number;
}

export class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    responseTimeSum: 0
  };

  constructor() {
    this.config = this.loadConfig();
    this.initializeRedis();
  }

  private loadConfig(): CacheConfig {
    return {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'marketplace:',
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        commandTimeout: 5000
      },
      ttl: {
        SELLER_PROFILE: 300,  // 5 minutes
        LISTINGS: 60,         // 1 minute
        REPUTATION: 600,      // 10 minutes
        AUTH_SESSION: 3600,   // 1 hour
        SEARCH_RESULTS: 300,  // 5 minutes
        DEFAULT: 300          // 5 minutes
      }
    };
  }

  private initializeRedis(): void {
    try {
      // Use Redis URL if provided (for cloud services like Render)
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest,
          connectTimeout: this.config.redis.connectTimeout,
          commandTimeout: this.config.redis.commandTimeout,
          keyPrefix: this.config.redis.keyPrefix,
          lazyConnect: true  // Add this to ensure consistent behavior
        });
      } else {
        this.redis = new Redis({
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
          db: this.config.redis.db,
          keyPrefix: this.config.redis.keyPrefix,
          maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest,
          connectTimeout: this.config.redis.connectTimeout,
          commandTimeout: this.config.redis.commandTimeout,
          lazyConnect: true
        });
      }

      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isConnected = false;
    }
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
    });

    this.redis.on('ready', () => {
      console.log('✅ Redis ready for operations');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('🔌 Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', (delay) => {
      console.log(`🔄 Redis reconnecting in ${delay}ms...`);
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }
    
    try {
      // Check if redis client has connect method (ioredis)
      if (this.redis && typeof this.redis.connect === 'function') {
        await this.redis.connect();
      } else {
        // If no connect method, assume already connected or connectionless client
        // Check connection status by pinging
        await this.redis.ping();
        this.isConnected = true;
      }
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.redis) {
      await this.redis.quit();
      console.log('🔌 Redis connection closed gracefully');
    }
  }

  // Core cache operations
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    this.stats.totalRequests++;

    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const value = await this.redis.get(key);
      const endTime = performance.now();
      this.stats.responseTimeSum += (endTime - startTime);

      if (value !== null) {
        this.stats.hits++;
        return JSON.parse(value);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const serializedValue = JSON.stringify(value);
      const cacheTTL = ttl || this.config.ttl.DEFAULT;

      if (cacheTTL > 0) {
        await this.redis.setex(key, cacheTTL, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }

      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async invalidate(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`Cache invalidate error for key ${key}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        const deletedCount = await this.redis.del(...keys);
        return deletedCount;
      }
      return 0;
    } catch (error) {
      console.error(`Cache invalidate pattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  // Marketplace-specific cache methods
  async cacheSellerProfile(walletAddress: string, profile: any): Promise<boolean> {
    const key = `seller:profile:${walletAddress.toLowerCase()}`;
    return this.set(key, profile, this.config.ttl.SELLER_PROFILE);
  }

  async getCachedSellerProfile(walletAddress: string): Promise<any | null> {
    const key = `seller:profile:${walletAddress.toLowerCase()}`;
    return this.get(key);
  }

  async invalidateSellerProfile(walletAddress: string): Promise<boolean> {
    const key = `seller:profile:${walletAddress.toLowerCase()}`;
    return this.invalidate(key);
  }

  async cacheListings(filters: any, listings: any[]): Promise<boolean> {
    const key = `listings:${this.generateFilterHash(filters)}`;
    return this.set(key, listings, this.config.ttl.LISTINGS);
  }

  async getCachedListings(filters: any): Promise<any[] | null> {
    const key = `listings:${this.generateFilterHash(filters)}`;
    return this.get(key);
  }

  async invalidateListings(): Promise<number> {
    return this.invalidatePattern('listings:*');
  }

  async cacheReputation(walletAddress: string, reputation: any): Promise<boolean> {
    const key = `reputation:${walletAddress.toLowerCase()}`;
    return this.set(key, reputation, this.config.ttl.REPUTATION);
  }

  async getCachedReputation(walletAddress: string): Promise<any | null> {
    const key = `reputation:${walletAddress.toLowerCase()}`;
    return this.get(key);
  }

  async invalidateReputation(walletAddress: string): Promise<boolean> {
    const key = `reputation:${walletAddress.toLowerCase()}`;
    return this.invalidate(key);
  }

  async cacheAuthSession(sessionId: string, sessionData: any): Promise<boolean> {
    const key = `auth:session:${sessionId}`;
    return this.set(key, sessionData, this.config.ttl.AUTH_SESSION);
  }

  async getCachedAuthSession(sessionId: string): Promise<any | null> {
    const key = `auth:session:${sessionId}`;
    return this.get(key);
  }

  async invalidateAuthSession(sessionId: string): Promise<boolean> {
    const key = `auth:session:${sessionId}`;
    return this.invalidate(key);
  }

  async cacheSearchResults(query: string, filters: any, results: any[]): Promise<boolean> {
    const key = `search:${this.generateSearchHash(query, filters)}`;
    return this.set(key, results, this.config.ttl.SEARCH_RESULTS);
  }

  async getCachedSearchResults(query: string, filters: any): Promise<any[] | null> {
    const key = `search:${this.generateSearchHash(query, filters)}`;
    return this.get(key);
  }

  async invalidateSearchResults(): Promise<number> {
    return this.invalidatePattern('search:*');
  }

  // Batch operations
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const values = await this.redis.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs: Array<[string, any]>, ttl?: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const pipeline = this.redis.pipeline();
      const cacheTTL = ttl || this.config.ttl.DEFAULT;

      keyValuePairs.forEach(([key, value]) => {
        const serializedValue = JSON.stringify(value);
        if (cacheTTL > 0) {
          pipeline.setex(key, cacheTTL, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  // Rate limiting support
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const rateLimitKey = `ratelimit:${key}`;
      const current = await this.redis.incr(rateLimitKey);

      if (current === 1) {
        await this.redis.expire(rateLimitKey, windowSeconds);
      }

      const remaining = Math.max(0, limit - current);
      const allowed = current <= limit;
      const resetTime = Date.now() + (windowSeconds * 1000);

      return { allowed, remaining, resetTime };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, remaining: limit, resetTime: Date.now() + (windowSeconds * 1000) };
    }
  }

  // Cache warming
  async warmCache(): Promise<void> {
    console.log('🔥 Starting cache warming...');

    try {
      // Warm popular listings
      await this.warmPopularListings();
      
      // Warm category data
      await this.warmCategoryData();
      
      console.log('✅ Cache warming completed');
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  private async warmPopularListings(): Promise<void> {
    // This would typically fetch popular listings from database
    const popularListings = []; // Placeholder
    await this.cacheListings({ popular: true }, popularListings);
  }

  private async warmCategoryData(): Promise<void> {
    // This would typically fetch categories from database
    const categories = []; // Placeholder
    await this.set('categories:all', categories, this.config.ttl.DEFAULT * 4); // Cache for longer
  }

  // Health check and monitoring
  async healthCheck(): Promise<{
    connected: boolean;
    latency: number;
    memoryUsage?: string;
    keyCount?: number;
  }> {
    try {
      const startTime = performance.now();
      await this.redis.ping();
      const endTime = performance.now();
      const latency = endTime - startTime;

      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');

      return {
        connected: true,
        latency,
        memoryUsage: this.parseRedisInfo(info, 'used_memory_human'),
        keyCount: this.parseRedisKeyspace(keyspace)
      };
    } catch (error) {
      console.error('Cache health check failed:', error);
      return {
        connected: false,
        latency: -1
      };
    }
  }

  async getStats(): Promise<CacheStats> {
    const hitRate = this.stats.totalRequests > 0 ? this.stats.hits / this.stats.totalRequests : 0;
    const avgResponseTime = this.stats.totalRequests > 0 ? this.stats.responseTimeSum / this.stats.totalRequests : 0;

    try {
      const info = await this.redis.info('memory');
      const clients = await this.redis.info('clients');
      
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate,
        totalRequests: this.stats.totalRequests,
        avgResponseTime,
        memoryUsage: parseInt(this.parseRedisInfo(info, 'used_memory') || '0'),
        connectedClients: parseInt(this.parseRedisInfo(clients, 'connected_clients') || '0')
      };
    } catch (error) {
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate,
        totalRequests: this.stats.totalRequests,
        avgResponseTime,
        memoryUsage: 0,
        connectedClients: 0
      };
    }
  }

  // Utility methods
  private generateFilterHash(filters: any): string {
    const crypto = require('crypto');
    const filterString = JSON.stringify(filters, Object.keys(filters).sort());
    return crypto.createHash('md5').update(filterString).digest('hex');
  }

  private generateSearchHash(query: string, filters: any): string {
    const crypto = require('crypto');
    const searchString = JSON.stringify({ query, filters }, Object.keys({ query, filters }).sort());
    return crypto.createHash('md5').update(searchString).digest('hex');
  }

  private parseRedisInfo(info: string, key: string): string | undefined {
    const lines = info.split('\r\n');
    const line = lines.find(l => l.startsWith(key));
    return line ? line.split(':')[1] : undefined;
  }

  private parseRedisKeyspace(keyspace: string): number {
    const lines = keyspace.split('\r\n');
    const dbLine = lines.find(l => l.startsWith('db0:'));
    if (dbLine) {
      const match = dbLine.match(/keys=(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  }
}

// Singleton instance
export const cacheService = new CacheService();
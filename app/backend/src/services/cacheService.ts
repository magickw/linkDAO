import Redis from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { redisService } from './redisService'; // Import the shared Redis service

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
  private redis: Redis | null = null; // Make redis nullable
  private isConnected: boolean = false;
  private useRedis: boolean = true; // Flag to enable/disable Redis functionality
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    responseTimeSum: 0
  };
  private statsResetInterval: ReturnType<typeof setInterval> | null = null;
  private static loggedInit: boolean = false;

  constructor() {
    // Check if Redis is disabled or if we're in a memory-critical environment
    const isMemoryCritical = process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 512;
    const isEmergencyMode = process.env.EMERGENCY_MODE === 'true';
    
    // Default to enabled unless explicitly disabled
    const redisEnabled = process.env.REDIS_ENABLED;

    if (redisEnabled === 'false' || redisEnabled === '0' || isMemoryCritical || isEmergencyMode) {
      this.useRedis = false;
      if (!CacheService.loggedInit) {
        if (isMemoryCritical) {
          safeLogger.warn('Redis functionality is disabled due to memory-critical environment (<512MB)');
        } else if (isEmergencyMode) {
          safeLogger.warn('Redis functionality is disabled due to emergency mode');
        } else {
          safeLogger.warn('Redis functionality is disabled via REDIS_ENABLED environment variable');
        }
        CacheService.loggedInit = true;
      }
    } else {
      this.config = this.loadConfig();
      this.initializeRedis();
    }

    // Reset stats every hour to prevent unbounded growth
    this.statsResetInterval = setInterval(() => {
      const oldStats = { ...this.stats };
      this.stats = {
        hits: 0,
        misses: 0,
        totalRequests: 0,
        responseTimeSum: 0
      };
      safeLogger.info('Cache stats reset to prevent memory growth', {
        previousStats: {
          hits: oldStats.hits,
          misses: oldStats.misses,
          totalRequests: oldStats.totalRequests,
          hitRate: oldStats.totalRequests > 0 ? (oldStats.hits / oldStats.totalRequests * 100).toFixed(2) + '%' : '0%'
        }
      });
    }, 3600000); // 1 hour
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
    if (!this.useRedis) {
      safeLogger.info('Redis is disabled, skipping initialization');
      return;
    }

    try {
      // Don't make assumptions during initialization - just check if the service is enabled
      // The actual connection status will be checked dynamically during operations
      const redisStatus = redisService.getRedisStatus();
      if (redisStatus.enabled) {
        safeLogger.info('✅ Shared Redis service is enabled, will check connection dynamically');
        this.isConnected = redisStatus.connected; // Initialize with current connection state
      } else {
        safeLogger.warn('⚠️ Shared Redis service is not enabled, Redis functionality disabled for cache');
        this.useRedis = false;
      }
    } catch (error) {
      safeLogger.error('Failed to initialize Redis with shared service:', {
        error: {
          name: error.name,
          message: error.message,
          code: (error as any).code,
          errno: (error as any).errno,
          syscall: (error as any).syscall,
          address: (error as any).address,
          port: (error as any).port
        }
      });
      this.useRedis = false;
      this.isConnected = false;
      this.redis = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.redis) {
      safeLogger.warn('Redis client not available, skipping event handler setup');
      return;
    }

    this.redis.on('connect', () => {
      safeLogger.info('✅ Redis connected successfully');
      this.isConnected = true;
    });

    this.redis.on('ready', () => {
      safeLogger.info('✅ Redis ready for operations');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      safeLogger.error('❌ Redis connection error:', {
        message: error.message,
        name: error.name,
        code: (error as any).code,
        errno: (error as any).errno,
        syscall: (error as any).syscall,
        address: (error as any).address,
        port: (error as any).port
      });
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      safeLogger.info('🔌 Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', (delay) => {
      safeLogger.info(`🔄 Redis reconnecting in ${delay}ms...`);
    });

    // Add global error handler to prevent unhandled errors
    this.redis.on('node error', (error) => {
      safeLogger.error('❌ Redis node error:', {
        message: error.message,
        name: error.name,
        code: (error as any).code
      });
    });
  }

  async connect(): Promise<void> {
    if (!this.useRedis) {
      safeLogger.info('Redis is disabled, skipping connection attempt');
      return;
    }

    // Use the shared Redis service for connection
    try {
      await redisService.connect();
      const status = redisService.getRedisStatus();
      this.isConnected = status.connected;
      if (this.isConnected) {
        safeLogger.info('Cache service connected via shared Redis service');
      } else {
        safeLogger.warn('Cache service failed to connect via shared Redis service');
        this.useRedis = false;
      }
    } catch (error) {
      safeLogger.error('Failed to connect cache service via shared Redis service:', {
        error: {
          name: error.name,
          message: error.message,
          code: (error as any).code,
          errno: (error as any).errno,
          syscall: (error as any).syscall,
          address: (error as any).address,
          port: (error as any).port
        }
      });
      this.useRedis = false; // Disable Redis on connection failure
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Clear stats reset interval
    if (this.statsResetInterval) {
      clearInterval(this.statsResetInterval);
      this.statsResetInterval = null;
    }

    if (this.isConnected && this.redis && this.useRedis) {
      try {
        await this.redis.quit();
        this.useRedis = false;
        this.isConnected = false;
        safeLogger.info('🔌 Redis connection closed gracefully');
      } catch (error) {
        safeLogger.error('Error disconnecting Redis:', error);
        this.useRedis = false;
        this.isConnected = false;
      }
    }
  }

  // Core cache operations
  async get<T>(key: string): Promise<T | null> {
    // Check if Redis is truly available by checking the shared service status
    const redisStatus = redisService.getRedisStatus();
    if (!redisStatus.enabled || !redisStatus.connected) {
      safeLogger.warn('Redis is disabled or not available, cache miss for key:', key);
      this.stats.misses++;
      return null;
    }

    const startTime = performance.now();
    this.stats.totalRequests++;

    try {
      const value = await redisService.get(key);
      const endTime = performance.now();
      this.stats.responseTimeSum += (endTime - startTime);

      if (value !== null) {
        this.stats.hits++;
        return value as T;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      const endTime = performance.now();
      this.stats.responseTimeSum += (endTime - startTime);
      this.stats.misses++;

      safeLogger.error(`Cache get error for key "${key}":`, error);
      return null; // Don't disable Redis on individual operation failure
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    // Check if Redis is truly available by checking the shared service status
    const redisStatus = redisService.getRedisStatus();
    if (!redisStatus.enabled || !redisStatus.connected) {
      safeLogger.warn('Redis is disabled or not available, skipping cache set for key:', key);
      return false;
    }

    try {
      // Add size limit check (1MB max per cache entry)
      const serializedValue = JSON.stringify(value);
      if (serializedValue.length > 1000000) {
        safeLogger.warn(`Cache value too large for key ${key}: ${serializedValue.length} bytes, skipping cache`);
        return false;
      }

      const cacheTTL = ttl || this.config.ttl.DEFAULT;

      if (cacheTTL > 0) {
        await redisService.setex(key, cacheTTL, serializedValue);
      } else {
        await redisService.set(key, value, cacheTTL);
      }

      return true;
    } catch (error) {
      safeLogger.error(`Cache set error for key ${key}:`, error);
      return false; // Don't disable Redis on individual operation failure
    }
  }

  async invalidate(key: string): Promise<boolean> {
    // Check if Redis is truly available by checking the shared service status
    const redisStatus = redisService.getRedisStatus();
    if (!redisStatus.enabled || !redisStatus.connected) {
      safeLogger.warn('Redis is disabled or not available, skipping cache invalidation for key:', key);
      return false;
    }

    try {
      await redisService.del(key);
      return true;
    } catch (error) {
      safeLogger.error(`Cache invalidate error for key ${key}:`, error);
      return false; // Don't disable Redis on individual operation failure
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    // Check if Redis is truly available by checking the shared service status
    const redisStatus = redisService.getRedisStatus();
    if (!redisStatus.enabled || !redisStatus.connected) {
      safeLogger.warn('Redis is disabled or not available, skipping cache invalidation for pattern:', pattern);
      return 0;
    }

    try {
      const keys = await redisService.keys(pattern);
      let deletedCount = 0;
      for (const key of keys) {
        await redisService.del(key);
        deletedCount++;
      }
      return deletedCount;
    } catch (error) {
      safeLogger.error(`Cache invalidate pattern error for pattern ${pattern}:`, error);
      return 0; // Don't disable Redis on individual operation failure
    }
  }

  async exists(key: string): Promise<boolean> {
    // Check if Redis is truly available by checking the shared service status
    const redisStatus = redisService.getRedisStatus();
    if (!redisStatus.enabled || !redisStatus.connected) {
      safeLogger.warn('Redis is disabled or not available, returning false for exists check:', key);
      return false;
    }

    try {
      return await redisService.exists(key);
    } catch (error) {
      safeLogger.error(`Cache exists error for key ${key}:`, error);
      return false; // Don't disable Redis on individual operation failure
    }
  }

  async ttl(key: string): Promise<number> {
    // Check if Redis is truly available by checking the shared service status
    const redisStatus = redisService.getRedisStatus();
    if (!redisStatus.enabled || !redisStatus.connected) {
      safeLogger.warn('Redis is disabled or not available, returning -1 for TTL check:', key);
      return -1;
    }

    try {
      return await redisService.ttl(key);
    } catch (error) {
      safeLogger.error(`Cache TTL error for key ${key}:`, error);
      return -1; // Don't disable Redis on individual operation failure
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
    // Check if Redis is truly available by checking the shared service status
    const redisStatus = redisService.getRedisStatus();
    if (!redisStatus.enabled || !redisStatus.connected) {
      safeLogger.warn('Redis is disabled or not available, returning null array for mget');
      return keys.map(() => null);
    }

    try {
      // Since redisService doesn't have mget, we'll fetch keys individually
      const results: (T | null)[] = [];
      for (const key of keys) {
        const value = await redisService.get(key);
        results.push(value as T | null);
      }
      return results;
    } catch (error) {
      safeLogger.error('Cache mget error:', error);
      return keys.map(() => null); // Don't disable Redis on individual operation failure
    }
  }

  async mset(keyValuePairs: Array<[string, any]>, ttl?: number): Promise<boolean> {
    // Check if Redis is truly available by checking the shared service status
    const redisStatus = redisService.getRedisStatus();
    if (!redisStatus.enabled || !redisStatus.connected) {
      safeLogger.warn('Redis is disabled or not available, skipping mset operation');
      return false;
    }

    try {
      const cacheTTL = ttl || this.config.ttl.DEFAULT;

      // Since redisService doesn't have pipeline, we'll set keys individually
      for (const [key, value] of keyValuePairs) {
        if (cacheTTL > 0) {
          await redisService.setex(key, cacheTTL, JSON.stringify(value));
        } else {
          await redisService.set(key, value);
        }
      }

      return true;
    } catch (error) {
      safeLogger.error('Cache mset error:', error);
      return false; // Don't disable Redis on individual operation failure
    }
  }

  // Rate limiting support
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    // Check if Redis is truly available by checking the shared service status
    const redisStatus = redisService.getRedisStatus();
    if (!redisStatus.enabled || !redisStatus.connected) {
      safeLogger.warn('Redis is disabled or not available, allowing rate limit check for key:', key);
      return { allowed: true, remaining: limit, resetTime: Date.now() + (windowSeconds * 1000) };
    }

    try {
      const rateLimitKey = `ratelimit:${key}`;
      return await redisService.checkRateLimit(rateLimitKey, limit, windowSeconds);
    } catch (error) {
      safeLogger.error('Rate limit check error:', error);
      return { allowed: true, remaining: limit, resetTime: Date.now() + (windowSeconds * 1000) }; // Don't disable Redis on individual operation failure
    }
  }

  // Cache warming
  async warmCache(): Promise<void> {
    safeLogger.info('🔥 Starting cache warming...');

    try {
      // Warm popular listings
      await this.warmPopularListings();

      // Warm category data
      await this.warmCategoryData();

      safeLogger.info('✅ Cache warming completed');
    } catch (error) {
      safeLogger.error('Cache warming error:', error);
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
    enabled: boolean;
    latency: number;
    memoryUsage?: string;
    keyCount?: number;
  }> {
    // Check if Redis is truly available by checking the shared service status
    const redisStatus = redisService.getRedisStatus();
    if (!redisStatus.enabled) {
      return {
        connected: false,
        enabled: false,
        latency: -1
      };
    }

    try {
      const startTime = performance.now();
      const result = await redisService.testConnection();
      const endTime = performance.now();
      const latency = endTime - startTime;

      return {
        connected: result.connected,
        enabled: redisStatus.enabled,
        latency: result.connected ? latency : -1
      };
    } catch (error) {
      safeLogger.error('Cache health check failed:', error);
      return {
        connected: false,
        enabled: redisStatus.enabled,
        latency: -1
      };
    }
  }

  async getStats(): Promise<CacheStats> {
    const hitRate = this.stats.totalRequests > 0 ? this.stats.hits / this.stats.totalRequests : 0;
    const avgResponseTime = this.stats.totalRequests > 0 ? this.stats.responseTimeSum / this.stats.totalRequests : 0;

    // Check if Redis is truly available by checking the shared service status
    const redisStatus = redisService.getRedisStatus();
    if (!redisStatus.enabled) {
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

    // Just return basic stats since redisService doesn't provide detailed info
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      totalRequests: this.stats.totalRequests,
      avgResponseTime,
      memoryUsage: 0, // Not available from our Redis service
      connectedClients: 0 // Not available from our Redis service
    };
  }

  // Utility methods
  isRedisEnabled(): boolean {
    return this.useRedis;
  }

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

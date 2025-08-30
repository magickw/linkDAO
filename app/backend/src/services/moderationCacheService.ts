import Redis from 'ioredis';
import { TextHashResult } from './textHashingService';
import { PerceptualHashResult } from './perceptualHashingService';

export interface CachedModerationResult {
  contentId: string;
  decision: 'allow' | 'limit' | 'block' | 'review';
  confidence: number;
  categories: string[];
  vendorScores: Record<string, number>;
  timestamp: number;
  ttl: number;
}

export interface CachedUserReputation {
  userId: string;
  score: number;
  level: 'new' | 'low' | 'medium' | 'high' | 'trusted';
  violationCount: number;
  helpfulReports: number;
  lastUpdated: number;
}

export interface CacheStats {
  hitRate: number;
  totalRequests: number;
  totalHits: number;
  memoryUsage: number;
  keyCount: number;
}

/**
 * Redis-based caching service for moderation results and user reputation
 * Provides fast access to frequently used data and reduces API calls
 */
export class ModerationCacheService {
  private redis: Redis;
  private stats = {
    totalRequests: 0,
    totalHits: 0
  };

  // Cache TTL configurations (in seconds)
  private readonly TTL_CONFIG = {
    MODERATION_RESULT: 3600, // 1 hour
    USER_REPUTATION: 1800, // 30 minutes
    CONTENT_HASH: 86400, // 24 hours
    DUPLICATE_CHECK: 7200, // 2 hours
    VENDOR_RESULT: 1800, // 30 minutes
    POLICY_CONFIG: 3600 // 1 hour
  };

  // Cache key prefixes
  private readonly KEYS = {
    MODERATION: 'mod:result:',
    REPUTATION: 'rep:user:',
    TEXT_HASH: 'hash:text:',
    IMAGE_HASH: 'hash:img:',
    DUPLICATE: 'dup:check:',
    VENDOR: 'vendor:',
    POLICY: 'policy:',
    STATS: 'stats:cache'
  };

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis cache');
    });
  }

  /**
   * Cache moderation result
   */
  async cacheModerationResult(result: CachedModerationResult): Promise<void> {
    const key = `${this.KEYS.MODERATION}${result.contentId}`;
    const value = JSON.stringify(result);
    
    await this.redis.setex(key, this.TTL_CONFIG.MODERATION_RESULT, value);
  }

  /**
   * Get cached moderation result
   */
  async getModerationResult(contentId: string): Promise<CachedModerationResult | null> {
    this.stats.totalRequests++;
    
    const key = `${this.KEYS.MODERATION}${contentId}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      this.stats.totalHits++;
      return JSON.parse(cached);
    }
    
    return null;
  }

  /**
   * Cache user reputation data
   */
  async cacheUserReputation(reputation: CachedUserReputation): Promise<void> {
    const key = `${this.KEYS.REPUTATION}${reputation.userId}`;
    const value = JSON.stringify(reputation);
    
    await this.redis.setex(key, this.TTL_CONFIG.USER_REPUTATION, value);
  }

  /**
   * Get cached user reputation
   */
  async getUserReputation(userId: string): Promise<CachedUserReputation | null> {
    this.stats.totalRequests++;
    
    const key = `${this.KEYS.REPUTATION}${userId}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      this.stats.totalHits++;
      return JSON.parse(cached);
    }
    
    return null;
  }

  /**
   * Cache text content hash for duplicate detection
   */
  async cacheTextHash(contentId: string, hashResult: TextHashResult): Promise<void> {
    const key = `${this.KEYS.TEXT_HASH}${hashResult.contentHash}`;
    const value = JSON.stringify({ contentId, ...hashResult });
    
    await this.redis.setex(key, this.TTL_CONFIG.CONTENT_HASH, value);
  }

  /**
   * Check for duplicate text content
   */
  async checkTextDuplicate(contentHash: string): Promise<{ contentId: string; hashResult: TextHashResult } | null> {
    this.stats.totalRequests++;
    
    const key = `${this.KEYS.TEXT_HASH}${contentHash}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      this.stats.totalHits++;
      const data = JSON.parse(cached);
      return {
        contentId: data.contentId,
        hashResult: {
          contentHash: data.contentHash,
          semanticHash: data.semanticHash,
          normalizedText: data.normalizedText,
          wordCount: data.wordCount
        }
      };
    }
    
    return null;
  }

  /**
   * Cache image perceptual hash
   */
  async cacheImageHash(contentId: string, hashResult: PerceptualHashResult): Promise<void> {
    const key = `${this.KEYS.IMAGE_HASH}${hashResult.hash}`;
    const value = JSON.stringify({ contentId, ...hashResult });
    
    await this.redis.setex(key, this.TTL_CONFIG.CONTENT_HASH, value);
  }

  /**
   * Check for duplicate image content
   */
  async checkImageDuplicate(hash: string): Promise<{ contentId: string; hashResult: PerceptualHashResult } | null> {
    this.stats.totalRequests++;
    
    const key = `${this.KEYS.IMAGE_HASH}${hash}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      this.stats.totalHits++;
      const data = JSON.parse(cached);
      return {
        contentId: data.contentId,
        hashResult: {
          hash: data.hash,
          algorithm: data.algorithm,
          confidence: data.confidence
        }
      };
    }
    
    return null;
  }

  /**
   * Cache vendor API result
   */
  async cacheVendorResult(vendor: string, contentHash: string, result: any): Promise<void> {
    const key = `${this.KEYS.VENDOR}${vendor}:${contentHash}`;
    const value = JSON.stringify({
      result,
      timestamp: Date.now()
    });
    
    await this.redis.setex(key, this.TTL_CONFIG.VENDOR_RESULT, value);
  }

  /**
   * Get cached vendor result
   */
  async getVendorResult(vendor: string, contentHash: string): Promise<any | null> {
    this.stats.totalRequests++;
    
    const key = `${this.KEYS.VENDOR}${vendor}:${contentHash}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      this.stats.totalHits++;
      const data = JSON.parse(cached);
      return data.result;
    }
    
    return null;
  }

  /**
   * Batch cache multiple moderation results
   */
  async batchCacheModerationResults(results: CachedModerationResult[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    results.forEach(result => {
      const key = `${this.KEYS.MODERATION}${result.contentId}`;
      const value = JSON.stringify(result);
      pipeline.setex(key, this.TTL_CONFIG.MODERATION_RESULT, value);
    });
    
    await pipeline.exec();
  }

  /**
   * Batch get multiple moderation results
   */
  async batchGetModerationResults(contentIds: string[]): Promise<Map<string, CachedModerationResult>> {
    this.stats.totalRequests += contentIds.length;
    
    const keys = contentIds.map(id => `${this.KEYS.MODERATION}${id}`);
    const results = await this.redis.mget(...keys);
    
    const resultMap = new Map<string, CachedModerationResult>();
    
    results.forEach((result, index) => {
      if (result) {
        this.stats.totalHits++;
        const contentId = contentIds[index];
        resultMap.set(contentId, JSON.parse(result));
      }
    });
    
    return resultMap;
  }

  /**
   * Invalidate cache for specific content
   */
  async invalidateContent(contentId: string): Promise<void> {
    const keys = [
      `${this.KEYS.MODERATION}${contentId}`,
      `${this.KEYS.DUPLICATE}${contentId}`
    ];
    
    await this.redis.del(...keys);
  }

  /**
   * Invalidate user reputation cache
   */
  async invalidateUserReputation(userId: string): Promise<void> {
    const key = `${this.KEYS.REPUTATION}${userId}`;
    await this.redis.del(key);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    const info = await this.redis.info('memory');
    const keyCount = await this.redis.dbsize();
    
    // Parse memory usage from Redis info
    const memoryMatch = info.match(/used_memory:(\d+)/);
    const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
    
    const hitRate = this.stats.totalRequests > 0 
      ? this.stats.totalHits / this.stats.totalRequests 
      : 0;
    
    return {
      hitRate,
      totalRequests: this.stats.totalRequests,
      totalHits: this.stats.totalHits,
      memoryUsage,
      keyCount
    };
  }

  /**
   * Clear all cache data (use with caution)
   */
  async clearAll(): Promise<void> {
    await this.redis.flushdb();
    this.stats.totalRequests = 0;
    this.stats.totalHits = 0;
  }

  /**
   * Set cache expiration for specific key pattern
   */
  async expirePattern(pattern: string, ttl: number): Promise<number> {
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) return 0;
    
    const pipeline = this.redis.pipeline();
    keys.forEach(key => pipeline.expire(key, ttl));
    
    await pipeline.exec();
    return keys.length;
  }

  /**
   * Get memory usage by key pattern
   */
  async getMemoryUsageByPattern(pattern: string): Promise<{ pattern: string; keyCount: number; estimatedSize: number }> {
    const keys = await this.redis.keys(pattern);
    let estimatedSize = 0;
    
    // Sample a few keys to estimate average size
    const sampleSize = Math.min(keys.length, 10);
    if (sampleSize > 0) {
      const sampleKeys = keys.slice(0, sampleSize);
      const pipeline = this.redis.pipeline();
      sampleKeys.forEach(key => pipeline.memory('usage', key));
      
      const results = await pipeline.exec();
      const totalSampleSize = results?.reduce((sum, result) => {
        return sum + (result?.[1] as number || 0);
      }, 0) || 0;
      
      const avgSize = totalSampleSize / sampleSize;
      estimatedSize = avgSize * keys.length;
    }
    
    return {
      pattern,
      keyCount: keys.length,
      estimatedSize
    };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export const moderationCacheService = new ModerationCacheService();
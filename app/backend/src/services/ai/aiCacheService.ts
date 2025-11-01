import Redis from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import crypto from 'crypto';

/**
 * AI Cache Service
 * Caches AI responses to reduce API costs and improve response times
 */
export class AICacheService {
  private redis: Redis | null = null;
  private static instance: AICacheService;
  private useCache: boolean = false;

  // Cache TTLs (in seconds)
  private readonly TTL_SHORT = 5 * 60; // 5 minutes
  private readonly TTL_MEDIUM = 60 * 60; // 1 hour
  private readonly TTL_LONG = 24 * 60 * 60; // 24 hours
  private readonly TTL_VERY_LONG = 7 * 24 * 60 * 60; // 7 days

  private constructor() {
    this.initializeRedis();
  }

  static getInstance(): AICacheService {
    if (!AICacheService.instance) {
      AICacheService.instance = new AICacheService();
    }
    return AICacheService.instance;
  }

  private initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              safeLogger.warn('Redis connection failed after 3 retries. Caching disabled.');
              return null;
            }
            return Math.min(times * 100, 2000);
          },
        });

        this.redis.on('connect', () => {
          safeLogger.info('✅ AI Cache (Redis) connected successfully');
          this.useCache = true;
        });

        this.redis.on('error', (err) => {
          safeLogger.error('Redis connection error:', err.message);
          this.useCache = false;
        });
      } else {
        safeLogger.warn('REDIS_URL not configured. AI caching disabled.');
        this.useCache = false;
      }
    } catch (error) {
      safeLogger.error('Failed to initialize Redis:', error);
      this.useCache = false;
    }
  }

  /**
   * Check if caching is available
   */
  isAvailable(): boolean {
    return this.useCache && this.redis !== null;
  }

  /**
   * Generate cache key from input parameters
   */
  private generateCacheKey(namespace: string, params: any): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(params))
      .digest('hex')
      .substring(0, 16);

    return `ai:${namespace}:${hash}`;
  }

  /**
   * Cache content moderation results
   * TTL: 24 hours (content doesn't change frequently)
   */
  async cacheModeration(contentId: string, result: any): Promise<void> {
    if (!this.isAvailable()) return;

    const key = `ai:moderation:${contentId}`;
    try {
      await this.redis!.setex(key, this.TTL_LONG, JSON.stringify(result));
    } catch (error) {
      safeLogger.error('Failed to cache moderation result:', error);
    }
  }

  async getModeration(contentId: string): Promise<any | null> {
    if (!this.isAvailable()) return null;

    const key = `ai:moderation:${contentId}`;
    try {
      const cached = await this.redis!.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      safeLogger.error('Failed to retrieve cached moderation:', error);
      return null;
    }
  }

  /**
   * Cache churn predictions
   * TTL: 1 hour (user behavior changes slowly)
   */
  async cacheChurnPrediction(userId: string, prediction: any): Promise<void> {
    if (!this.isAvailable()) return;

    const key = `ai:churn:${userId}`;
    try {
      await this.redis!.setex(key, this.TTL_MEDIUM, JSON.stringify(prediction));
    } catch (error) {
      safeLogger.error('Failed to cache churn prediction:', error);
    }
  }

  async getChurnPrediction(userId: string): Promise<any | null> {
    if (!this.isAvailable()) return null;

    const key = `ai:churn:${userId}`;
    try {
      const cached = await this.redis!.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      safeLogger.error('Failed to retrieve cached churn prediction:', error);
      return null;
    }
  }

  /**
   * Cache anomaly detection results
   * TTL: 5 minutes (metrics change frequently)
   */
  async cacheAnomalyDetection(metrics: any, result: any): Promise<void> {
    if (!this.isAvailable()) return;

    const key = this.generateCacheKey('anomalies', metrics);
    try {
      await this.redis!.setex(key, this.TTL_SHORT, JSON.stringify(result));
    } catch (error) {
      safeLogger.error('Failed to cache anomaly detection:', error);
    }
  }

  async getAnomalyDetection(metrics: any): Promise<any | null> {
    if (!this.isAvailable()) return null;

    const key = this.generateCacheKey('anomalies', metrics);
    try {
      const cached = await this.redis!.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      safeLogger.error('Failed to retrieve cached anomaly detection:', error);
      return null;
    }
  }

  /**
   * Cache platform health analysis
   * TTL: 1 hour (aggregated metrics change slowly)
   */
  async cachePlatformHealth(timeRange: string, analysis: any): Promise<void> {
    if (!this.isAvailable()) return;

    const key = `ai:health:${timeRange}`;
    try {
      await this.redis!.setex(key, this.TTL_MEDIUM, JSON.stringify(analysis));
    } catch (error) {
      safeLogger.error('Failed to cache platform health:', error);
    }
  }

  async getPlatformHealth(timeRange: string): Promise<any | null> {
    if (!this.isAvailable()) return null;

    const key = `ai:health:${timeRange}`;
    try {
      const cached = await this.redis!.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      safeLogger.error('Failed to retrieve cached platform health:', error);
      return null;
    }
  }

  /**
   * Cache seller performance predictions
   * TTL: 1 hour
   */
  async cacheSellerPerformance(sellerId: string, prediction: any): Promise<void> {
    if (!this.isAvailable()) return;

    const key = `ai:seller:${sellerId}`;
    try {
      await this.redis!.setex(key, this.TTL_MEDIUM, JSON.stringify(prediction));
    } catch (error) {
      safeLogger.error('Failed to cache seller performance:', error);
    }
  }

  async getSellerPerformance(sellerId: string): Promise<any | null> {
    if (!this.isAvailable()) return null;

    const key = `ai:seller:${sellerId}`;
    try {
      const cached = await this.redis!.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      safeLogger.error('Failed to retrieve cached seller performance:', error);
      return null;
    }
  }

  /**
   * Cache generic insights
   * TTL: 1 hour (general insights change slowly)
   */
  async cacheInsight(type: string, context: any, insight: string): Promise<void> {
    if (!this.isAvailable()) return;

    const key = this.generateCacheKey(`insight:${type}`, context);
    try {
      await this.redis!.setex(key, this.TTL_MEDIUM, insight);
    } catch (error) {
      safeLogger.error('Failed to cache insight:', error);
    }
  }

  async getInsight(type: string, context: any): Promise<string | null> {
    if (!this.isAvailable()) return null;

    const key = this.generateCacheKey(`insight:${type}`, context);
    try {
      return await this.redis!.get(key);
    } catch (error) {
      safeLogger.error('Failed to retrieve cached insight:', error);
      return null;
    }
  }

  /**
   * Cache trend predictions
   * TTL: 7 days (historical data doesn't change)
   */
  async cacheTrendPrediction(data: any, prediction: any): Promise<void> {
    if (!this.isAvailable()) return;

    const key = this.generateCacheKey('trends', data);
    try {
      await this.redis!.setex(key, this.TTL_VERY_LONG, JSON.stringify(prediction));
    } catch (error) {
      safeLogger.error('Failed to cache trend prediction:', error);
    }
  }

  async getTrendPrediction(data: any): Promise<any | null> {
    if (!this.isAvailable()) return null;

    const key = this.generateCacheKey('trends', data);
    try {
      const cached = await this.redis!.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      safeLogger.error('Failed to retrieve cached trend prediction:', error);
      return null;
    }
  }

  /**
   * Invalidate specific cache entries
   */
  async invalidateModeration(contentId: string): Promise<void> {
    if (!this.isAvailable()) return;

    const key = `ai:moderation:${contentId}`;
    try {
      await this.redis!.del(key);
    } catch (error) {
      safeLogger.error('Failed to invalidate moderation cache:', error);
    }
  }

  async invalidateChurnPrediction(userId: string): Promise<void> {
    if (!this.isAvailable()) return;

    const key = `ai:churn:${userId}`;
    try {
      await this.redis!.del(key);
    } catch (error) {
      safeLogger.error('Failed to invalidate churn prediction cache:', error);
    }
  }

  /**
   * Clear all AI caches
   */
  async clearAll(): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const keys = await this.redis!.keys('ai:*');
      if (keys.length > 0) {
        await this.redis!.del(...keys);
        safeLogger.info(`Cleared ${keys.length} AI cache entries`);
      }
    } catch (error) {
      safeLogger.error('Failed to clear AI cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    cacheEnabled: boolean;
    keysByNamespace: Record<string, number>;
  }> {
    if (!this.isAvailable()) {
      return {
        totalKeys: 0,
        cacheEnabled: false,
        keysByNamespace: {},
      };
    }

    try {
      const keys = await this.redis!.keys('ai:*');
      const keysByNamespace: Record<string, number> = {};

      keys.forEach(key => {
        const namespace = key.split(':')[1];
        keysByNamespace[namespace] = (keysByNamespace[namespace] || 0) + 1;
      });

      return {
        totalKeys: keys.length,
        cacheEnabled: true,
        keysByNamespace,
      };
    } catch (error) {
      safeLogger.error('Failed to get cache stats:', error);
      return {
        totalKeys: 0,
        cacheEnabled: false,
        keysByNamespace: {},
      };
    }
  }

  /**
   * Estimate cost savings from caching
   */
  async estimateSavings(avgCostPerRequest: number = 0.02): Promise<{
    cacheHits: number;
    estimatedSavings: number;
  }> {
    if (!this.isAvailable()) {
      return { cacheHits: 0, estimatedSavings: 0 };
    }

    try {
      const stats = await this.getStats();
      const cacheHits = stats.totalKeys; // Approximation

      return {
        cacheHits,
        estimatedSavings: cacheHits * avgCostPerRequest,
      };
    } catch (error) {
      safeLogger.error('Failed to estimate savings:', error);
      return { cacheHits: 0, estimatedSavings: 0 };
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.useCache = false;
    }
  }
}

export const aiCacheService = AICacheService.getInstance();

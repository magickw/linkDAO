import { Request, Response, NextFunction } from 'express';
import { cacheService } from './cacheService';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface CacheConfig {
  ttl: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  shouldCache?: (req: Request, res: Response) => boolean;
  varyBy?: string[]; // Headers to vary cache by
  tags?: string[]; // Cache tags for invalidation
}

interface CachedApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
  etag: string;
  tags: string[];
  varyBy: Record<string, string>;
}

export class ApiResponseCacheService {
  private static instance: ApiResponseCacheService;
  private hitCount = 0;
  private missCount = 0;
  private cacheConfigs = new Map<string, CacheConfig>();

  public static getInstance(): ApiResponseCacheService {
    if (!ApiResponseCacheService.instance) {
      ApiResponseCacheService.instance = new ApiResponseCacheService();
    }
    return ApiResponseCacheService.instance;
  }

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Initialize default cache configurations for different endpoints
   */
  private initializeDefaultConfigs(): void {
    // Seller profile caching - 5 minutes
    this.cacheConfigs.set('/api/marketplace/seller/*', {
      ttl: 300,
      tags: ['seller', 'profile'],
      varyBy: ['walletAddress'],
      shouldCache: (req, res) => res.statusCode === 200 && req.method === 'GET'
    });

    // Marketplace listings caching - 2 minutes
    this.cacheConfigs.set('/marketplace/listings', {
      ttl: 120,
      tags: ['listings', 'marketplace'],
      varyBy: ['limit', 'sortBy', 'sortOrder'],
      shouldCache: (req, res) => res.statusCode === 200 && req.method === 'GET'
    });

    // Reputation caching - 10 minutes
    this.cacheConfigs.set('/marketplace/reputation/*', {
      ttl: 600,
      tags: ['reputation'],
      varyBy: ['walletAddress'],
      shouldCache: (req, res) => res.statusCode === 200 && req.method === 'GET'
    });

    // Health check caching - 30 seconds
    this.cacheConfigs.set('/health*', {
      ttl: 30,
      tags: ['health'],
      shouldCache: (req, res) => res.statusCode === 200
    });

    // Search results caching - 5 minutes
    this.cacheConfigs.set('/api/search/*', {
      ttl: 300,
      tags: ['search'],
      varyBy: ['q', 'type', 'limit'],
      shouldCache: (req, res) => res.statusCode === 200 && req.method === 'GET'
    });
  }

  /**
   * Create caching middleware for API responses
   */
  public createCacheMiddleware(config?: CacheConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Find matching cache configuration
        const cacheConfig = config || this.findMatchingConfig(req);
        if (!cacheConfig) {
          return next();
        }

        // Generate cache key
        const cacheKey = this.generateCacheKey(req, cacheConfig);
        
        // Check for cached response
        const cachedResponse = await this.getCachedResponse(cacheKey);
        if (cachedResponse && this.isCacheValid(cachedResponse, cacheConfig.ttl)) {
          // Check conditional requests (ETag)
          const clientETag = req.get('If-None-Match');
          if (clientETag === cachedResponse.etag) {
            this.hitCount++;
            return res.status(304).set('X-Cache', 'HIT-304').end();
          }

          // Serve cached response
          this.hitCount++;
          logger.debug('Serving cached API response', {
            cacheKey: cacheKey.substring(0, 8),
            endpoint: `${req.method} ${req.path}`,
            age: Date.now() - cachedResponse.timestamp
          });

          return res
            .status(cachedResponse.statusCode)
            .set(cachedResponse.headers)
            .set({
              'X-Cache': 'HIT',
              'X-Cache-Age': Math.floor((Date.now() - cachedResponse.timestamp) / 1000).toString(),
              'ETag': cachedResponse.etag
            })
            .json(cachedResponse.body);
        }

        // Cache miss - intercept response to cache it
        this.missCount++;
        this.interceptResponse(req, res, cacheKey, cacheConfig);
        next();
      } catch (error) {
        logger.error('API response cache error:', error);
        next();
      }
    };
  }

  /**
   * Find matching cache configuration for request
   */
  private findMatchingConfig(req: Request): CacheConfig | null {
    for (const [pattern, config] of this.cacheConfigs.entries()) {
      if (this.matchesPattern(req.path, pattern)) {
        return config;
      }
    }
    return null;
  }

  /**
   * Check if path matches pattern (supports wildcards)
   */
  private matchesPattern(path: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(path);
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(req: Request, config: CacheConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    const method = req.method;
    const path = req.path;
    const walletAddress = (req as any).walletAddress || '';
    
    // Include vary-by parameters
    const varyParams: Record<string, string> = {};
    if (config.varyBy) {
      for (const param of config.varyBy) {
        if (param === 'walletAddress') {
          varyParams[param] = walletAddress;
        } else {
          varyParams[param] = req.query[param] as string || req.get(param) || '';
        }
      }
    }

    const keyData = `api_cache:${method}:${path}:${JSON.stringify(varyParams)}`;
    return crypto.createHash('sha256').update(keyData).digest('hex');
  }

  /**
   * Intercept response to cache it
   */
  private interceptResponse(req: Request, res: Response, cacheKey: string, config: CacheConfig): void {
    const originalJson = res.json;
    const originalSend = res.send;

    res.json = function(body: any) {
      if (config.shouldCache && config.shouldCache(req, res)) {
        ApiResponseCacheService.getInstance().cacheResponse(cacheKey, {
          statusCode: res.statusCode,
          headers: res.getHeaders() as Record<string, string>,
          body,
          config
        });
      }
      
      res.set('X-Cache', 'MISS');
      return originalJson.call(this, body);
    };

    res.send = function(body: any) {
      if (config.shouldCache && config.shouldCache(req, res)) {
        ApiResponseCacheService.getInstance().cacheResponse(cacheKey, {
          statusCode: res.statusCode,
          headers: res.getHeaders() as Record<string, string>,
          body,
          config
        });
      }
      
      res.set('X-Cache', 'MISS');
      return originalSend.call(this, body);
    };
  }

  /**
   * Cache API response
   */
  private async cacheResponse(cacheKey: string, data: {
    statusCode: number;
    headers: Record<string, string>;
    body: any;
    config: CacheConfig;
  }): Promise<void> {
    try {
      const etag = this.generateETag(data.body);
      const varyBy: Record<string, string> = {};
      
      // Extract vary-by values from headers
      if (data.config.varyBy) {
        for (const header of data.config.varyBy) {
          varyBy[header] = data.headers[header.toLowerCase()] || '';
        }
      }

      const cachedResponse: CachedApiResponse = {
        statusCode: data.statusCode,
        headers: { ...data.headers, etag },
        body: data.body,
        timestamp: Date.now(),
        etag,
        tags: data.config.tags || [],
        varyBy
      };

      await cacheService.set(`api_response:${cacheKey}`, cachedResponse, data.config.ttl);
      
      // Store cache tags for invalidation
      if (data.config.tags) {
        for (const tag of data.config.tags) {
          await this.addCacheTag(tag, cacheKey);
        }
      }

      logger.debug('Cached API response', {
        cacheKey: cacheKey.substring(0, 8),
        ttl: data.config.ttl,
        tags: data.config.tags
      });
    } catch (error) {
      logger.error('Error caching API response:', error);
    }
  }

  /**
   * Get cached response
   */
  private async getCachedResponse(cacheKey: string): Promise<CachedApiResponse | null> {
    try {
      return await cacheService.get<CachedApiResponse>(`api_response:${cacheKey}`);
    } catch (error) {
      logger.error('Error getting cached response:', error);
      return null;
    }
  }

  /**
   * Check if cached response is still valid
   */
  private isCacheValid(cachedResponse: CachedApiResponse, ttl: number): boolean {
    const age = Date.now() - cachedResponse.timestamp;
    return age < (ttl * 1000);
  }

  /**
   * Generate ETag for response body
   */
  private generateETag(body: any): string {
    const content = typeof body === 'string' ? body : JSON.stringify(body);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Add cache tag for invalidation
   */
  private async addCacheTag(tag: string, cacheKey: string): Promise<void> {
    try {
      const tagKey = `cache_tag:${tag}`;
      const existingKeys = await cacheService.get<string[]>(tagKey) || [];
      
      if (!existingKeys.includes(cacheKey)) {
        existingKeys.push(cacheKey);
        await cacheService.set(tagKey, existingKeys, 3600); // 1 hour TTL for tags
      }
    } catch (error) {
      logger.error('Error adding cache tag:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  public async invalidateByTags(tags: string[]): Promise<void> {
    try {
      const keysToInvalidate = new Set<string>();

      for (const tag of tags) {
        const tagKey = `cache_tag:${tag}`;
        const cacheKeys = await cacheService.get<string[]>(tagKey) || [];
        
        for (const cacheKey of cacheKeys) {
          keysToInvalidate.add(`api_response:${cacheKey}`);
        }

        // Remove the tag itself
        await cacheService.invalidate(tagKey);
      }

      // Invalidate all cache keys
      for (const key of keysToInvalidate) {
        await cacheService.invalidate(key);
      }

      logger.info(`Invalidated cache for tags: ${tags.join(', ')}`);
    } catch (error) {
      logger.error('Error invalidating cache by tags:', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  public async invalidateByPattern(pattern: string): Promise<void> {
    try {
      await cacheService.invalidate(`api_response:*${pattern}*`);
      logger.info(`Invalidated cache for pattern: ${pattern}`);
    } catch (error) {
      logger.error('Error invalidating cache by pattern:', error);
    }
  }

  /**
   * Warm cache for specific endpoints
   */
  public async warmCache(requests: Array<{ method: string; path: string; query?: any }>): Promise<void> {
    logger.info(`Warming cache for ${requests.length} requests`);

    for (const request of requests) {
      try {
        // This would need to be implemented to make actual requests
        // For now, just log the warming attempt
        logger.debug('Cache warming request', request);
      } catch (error) {
        logger.error('Error warming cache:', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    hitCount: number;
    missCount: number;
    hitRate: number;
    totalRequests: number;
    configCount: number;
  } {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests,
      configCount: this.cacheConfigs.size
    };
  }

  /**
   * Reset cache statistics
   */
  public resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Add or update cache configuration
   */
  public setCacheConfig(pattern: string, config: CacheConfig): void {
    this.cacheConfigs.set(pattern, config);
    logger.info(`Cache configuration set for pattern: ${pattern}`, config);
  }

  /**
   * Remove cache configuration
   */
  public removeCacheConfig(pattern: string): boolean {
    const removed = this.cacheConfigs.delete(pattern);
    if (removed) {
      logger.info(`Cache configuration removed for pattern: ${pattern}`);
    }
    return removed;
  }
}

export const apiResponseCacheService = ApiResponseCacheService.getInstance();

// Export pre-configured middleware
export const defaultApiCache = apiResponseCacheService.createCacheMiddleware();
export const shortTermCache = apiResponseCacheService.createCacheMiddleware({
  ttl: 60, // 1 minute
  shouldCache: (req, res) => res.statusCode === 200 && req.method === 'GET'
});
export const longTermCache = apiResponseCacheService.createCacheMiddleware({
  ttl: 3600, // 1 hour
  shouldCache: (req, res) => res.statusCode === 200 && req.method === 'GET'
});
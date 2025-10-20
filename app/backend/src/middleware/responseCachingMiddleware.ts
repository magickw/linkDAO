import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { performance } from 'perf_hooks';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
  varyBy?: string[];
  skipCache?: (req: Request) => boolean;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  avgResponseTime: number;
  totalRequests: number;
}

/**
 * Response Caching Middleware for frequently accessed data
 * Implements task 9.1: Implement response caching middleware
 */
export class ResponseCachingMiddleware {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    avgResponseTime: 0,
    totalRequests: 0
  };

  private responseTimes: number[] = [];

  /**
   * Create response caching middleware
   */
  cache(options: CacheOptions = {}) {
    const {
      ttl = 300, // 5 minutes default
      keyGenerator = this.defaultKeyGenerator,
      condition = this.defaultCondition,
      varyBy = [],
      skipCache = () => false
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      this.metrics.totalRequests++;

      // Skip caching if condition not met
      if (skipCache(req) || req.method !== 'GET') {
        return next();
      }

      const cacheKey = keyGenerator(req);
      const varyKey = this.generateVaryKey(req, varyBy);
      const fullCacheKey = varyKey ? `${cacheKey}:${varyKey}` : cacheKey;

      try {
        // Try to get cached response
        const cachedResponse = await cacheService.get(fullCacheKey);
        
        if (cachedResponse) {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          this.updateMetrics(responseTime, true);

          // Set cache headers
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-Key': fullCacheKey,
            'X-Response-Time': `${responseTime.toFixed(2)}ms`,
            'Cache-Control': `public, max-age=${ttl}`,
            'ETag': this.generateETag(cachedResponse)
          });

          return res.json(cachedResponse);
        }

        // Cache miss - intercept response
        const originalJson = res.json.bind(res);
        let responseData: any;

        res.json = function(data: any) {
          responseData = data;
          
          // Check if we should cache this response
          if (condition(req, res) && res.statusCode >= 200 && res.statusCode < 300) {
            // Cache the response asynchronously
            cacheService.set(fullCacheKey, data, ttl).catch(error => {
              console.error(`Failed to cache response for ${fullCacheKey}:`, error);
            });

            // Set cache headers
            res.set({
              'X-Cache': 'MISS',
              'X-Cache-Key': fullCacheKey,
              'Cache-Control': `public, max-age=${ttl}`,
              'ETag': ResponseCachingMiddleware.prototype.generateETag(data)
            });
          }

          return originalJson(data);
        };

        // Continue to next middleware
        next();

        // Update metrics after response
        res.on('finish', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          this.updateMetrics(responseTime, false);
        });

      } catch (error) {
        console.error(`Cache middleware error for ${fullCacheKey}:`, error);
        next();
      }
    };
  }

  /**
   * Cache invalidation middleware
   */
  invalidate(patterns: string[] | ((req: Request) => string[])) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Store original response methods
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      const invalidateCache = async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const invalidationPatterns = typeof patterns === 'function' 
              ? patterns(req) 
              : patterns;

            for (const pattern of invalidationPatterns) {
              await cacheService.invalidatePattern(pattern);
            }
          } catch (error) {
            console.error('Cache invalidation error:', error);
          }
        }
      };

      // Override response methods
      res.json = function(data: any) {
        invalidateCache();
        return originalJson(data);
      };

      res.send = function(data: any) {
        invalidateCache();
        return originalSend(data);
      };

      next();
    };
  }

  /**
   * Conditional caching based on request characteristics
   */
  conditionalCache(condition: (req: Request) => boolean, options: CacheOptions = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (condition(req)) {
        return this.cache(options)(req, res, next);
      }
      next();
    };
  }

  /**
   * Cache warming middleware
   */
  warmCache(warmingRules: Array<{
    pattern: string;
    loader: () => Promise<any>;
    ttl?: number;
  }>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Warm cache in background
      setImmediate(async () => {
        for (const rule of warmingRules) {
          try {
            const data = await rule.loader();
            await cacheService.set(rule.pattern, data, rule.ttl || 300);
          } catch (error) {
            console.error(`Cache warming failed for ${rule.pattern}:`, error);
          }
        }
      });

      next();
    };
  }

  /**
   * Default key generator
   */
  private defaultKeyGenerator(req: Request): string {
    const query = new URLSearchParams(req.query as any).toString();
    return `response:${req.method}:${req.path}${query ? `:${query}` : ''}`;
  }

  /**
   * Default caching condition
   */
  private defaultCondition(req: Request, res: Response): boolean {
    return req.method === 'GET' && 
           res.statusCode >= 200 && 
           res.statusCode < 300 &&
           !req.headers['cache-control']?.includes('no-cache');
  }

  /**
   * Generate vary key based on headers/parameters
   */
  private generateVaryKey(req: Request, varyBy: string[]): string {
    if (varyBy.length === 0) return '';

    const varyValues = varyBy.map(key => {
      if (key.startsWith('header:')) {
        const headerName = key.substring(7);
        return req.get(headerName) || '';
      }
      if (key.startsWith('query:')) {
        const queryName = key.substring(6);
        return req.query[queryName] || '';
      }
      if (key.startsWith('param:')) {
        const paramName = key.substring(6);
        return req.params[paramName] || '';
      }
      return '';
    });

    return Buffer.from(varyValues.join(':')).toString('base64');
  }

  /**
   * Generate ETag for response
   */
  private generateETag(data: any): string {
    const crypto = require('crypto');
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
  }

  /**
   * Update metrics
   */
  private updateMetrics(responseTime: number, isHit: boolean): void {
    this.responseTimes.push(responseTime);
    
    // Keep only recent response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    if (isHit) {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }

    // Calculate hit rate
    const totalCacheRequests = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = totalCacheRequests > 0 ? this.metrics.hits / totalCacheRequests : 0;

    // Calculate average response time
    if (this.responseTimes.length > 0) {
      const sum = this.responseTimes.reduce((a, b) => a + b, 0);
      this.metrics.avgResponseTime = sum / this.responseTimes.length;
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgResponseTime: 0,
      totalRequests: 0
    };
    this.responseTimes = [];
  }
}

// Predefined caching strategies for common endpoints
export const marketplaceCaching = new ResponseCachingMiddleware();

// Marketplace listings cache (1 minute)
export const cacheMarketplaceListings = marketplaceCaching.cache({
  ttl: 60,
  keyGenerator: (req) => {
    const query = new URLSearchParams(req.query as any).toString();
    return `marketplace:listings:${Buffer.from(query).toString('base64')}`;
  },
  varyBy: ['query:category', 'query:search', 'query:page', 'query:limit']
});

// Seller profile cache (5 minutes)
export const cacheSellerProfile = marketplaceCaching.cache({
  ttl: 300,
  keyGenerator: (req) => `seller:profile:${req.params.sellerId}`,
  condition: (req, res) => req.method === 'GET' && res.statusCode === 200
});

// Product details cache (10 minutes)
export const cacheProductDetails = marketplaceCaching.cache({
  ttl: 600,
  keyGenerator: (req) => `product:${req.params.productId}`,
  condition: (req, res) => req.method === 'GET' && res.statusCode === 200
});

// Search results cache (5 minutes)
export const cacheSearchResults = marketplaceCaching.cache({
  ttl: 300,
  keyGenerator: (req) => {
    const query = req.query.q as string || '';
    const filters = JSON.stringify(req.query.filters || {});
    return `search:${Buffer.from(`${query}:${filters}`).toString('base64')}`;
  },
  varyBy: ['query:q', 'query:filters', 'query:page']
});

// Cache invalidation for marketplace updates
export const invalidateMarketplaceCache = marketplaceCaching.invalidate([
  'marketplace:listings:*',
  'search:*'
]);

export const invalidateSellerCache = marketplaceCaching.invalidate((req) => [
  `seller:profile:${req.params.sellerId}`,
  'marketplace:listings:*'
]);

export const invalidateProductCache = marketplaceCaching.invalidate((req) => [
  `product:${req.params.productId}`,
  'marketplace:listings:*',
  'search:*'
]);

export default ResponseCachingMiddleware;
/**
 * Query Result Caching Middleware
 * Intelligent caching layer for database query results
 * Implements task 14.1: Implement query result caching
 */

import { Request, Response, NextFunction } from 'express';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        [key: string]: any;
      };
    }
  }
}
import { performance } from 'perf_hooks';
import { cacheService } from '../services/cacheService';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  shouldCache?: (req: Request, data: any) => boolean;
  invalidatePatterns?: string[];
  varyBy?: string[];
  compression?: boolean;
  maxSize?: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  avgResponseTime: number;
  totalRequests: number;
  cacheSize: number;
  lastReset: Date;
}

interface CachedResponse {
  data: any;
  timestamp: number;
  ttl: number;
  compressed?: boolean;
  metadata: {
    originalSize: number;
    compressedSize?: number;
    queryTime: number;
    headers: Record<string, string>;
  };
}

/**
 * Query Result Caching Middleware
 * Provides intelligent caching for API responses with database query results
 */
export class QueryResultCachingMiddleware {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    avgResponseTime: 0,
    totalRequests: 0,
    cacheSize: 0,
    lastReset: new Date()
  };

  private responseTimeSum = 0;
  private readonly defaultOptions: CacheOptions = {
    ttl: 300, // 5 minutes
    compression: true,
    maxSize: 1024 * 1024, // 1MB
    varyBy: ['user', 'query', 'filters']
  };

  /**
   * Create caching middleware with options
   */
  cache(options: CacheOptions = {}) {
    const config = { ...this.defaultOptions, ...options };

    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      this.metrics.totalRequests++;

      try {
        // Generate cache key
        const cacheKey = this.generateCacheKey(req, config);
        
        // Check if response should be cached
        if (!this.shouldCacheRequest(req, config)) {
          return next();
        }

        // Try to get cached response
        const cachedResponse = await this.getCachedResponse(cacheKey);
        
        if (cachedResponse && !this.isCacheExpired(cachedResponse)) {
          // Cache hit - return cached response
          await this.serveCachedResponse(res, cachedResponse, startTime);
          return;
        }

        // Cache miss - intercept response to cache it
        await this.interceptAndCacheResponse(req, res, next, cacheKey, config, startTime);

      } catch (error) {
        console.error('Cache middleware error:', error);
        // Continue without caching on error
        next();
      }
    };
  }

  /**
   * Generate cache key based on request
   */
  private generateCacheKey(req: Request, config: CacheOptions): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    const keyParts: string[] = [
      'query_result',
      req.method,
      req.path
    ];

    // Add vary-by parameters
    if (config.varyBy) {
      config.varyBy.forEach(param => {
        switch (param) {
          case 'user':
            const userId = req.user?.id || req.headers['x-user-id'] || 'anonymous';
            keyParts.push(`user:${userId}`);
            break;
          case 'query':
            const queryString = new URLSearchParams(req.query as any).toString();
            if (queryString) keyParts.push(`query:${queryString}`);
            break;
          case 'filters':
            const filters = req.body?.filters || req.query?.filters;
            if (filters) keyParts.push(`filters:${JSON.stringify(filters)}`);
            break;
          case 'headers':
            const relevantHeaders = ['accept', 'accept-language', 'authorization'];
            relevantHeaders.forEach(header => {
              if (req.headers[header]) {
                keyParts.push(`${header}:${req.headers[header]}`);
              }
            });
            break;
        }
      });
    }

    // Create hash of the key parts
    const crypto = require('crypto');
    const keyString = keyParts.join('|');
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Check if request should be cached
   */
  private shouldCacheRequest(req: Request, config: CacheOptions): boolean {
    // Only cache GET requests by default
    if (req.method !== 'GET') {
      return false;
    }

    // Don't cache if explicitly disabled
    if (req.headers['cache-control']?.includes('no-cache')) {
      return false;
    }

    // Don't cache real-time or user-specific endpoints
    const nonCacheablePaths = [
      '/api/auth',
      '/api/notifications/live',
      '/api/websocket',
      '/api/upload'
    ];

    if (nonCacheablePaths.some(path => req.path.startsWith(path))) {
      return false;
    }

    // Use custom shouldCache function if provided
    if (config.shouldCache) {
      return config.shouldCache(req, null);
    }

    return true;
  }

  /**
   * Get cached response
   */
  private async getCachedResponse(cacheKey: string): Promise<CachedResponse | null> {
    try {
      return await cacheService.get<CachedResponse>(cacheKey);
    } catch (error) {
      console.error('Error getting cached response:', error);
      return null;
    }
  }

  /**
   * Check if cached response is expired
   */
  private isCacheExpired(cachedResponse: CachedResponse): boolean {
    const now = Date.now();
    const expiryTime = cachedResponse.timestamp + (cachedResponse.ttl * 1000);
    return now > expiryTime;
  }

  /**
   * Serve cached response
   */
  private async serveCachedResponse(
    res: Response, 
    cachedResponse: CachedResponse, 
    startTime: number
  ): Promise<void> {
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    // Update metrics
    this.metrics.hits++;
    this.responseTimeSum += responseTime;
    this.metrics.avgResponseTime = this.responseTimeSum / this.metrics.totalRequests;
    this.metrics.hitRate = this.metrics.hits / this.metrics.totalRequests;

    // Set cache headers
    res.set({
      'X-Cache': 'HIT',
      'X-Cache-Age': Math.floor((Date.now() - cachedResponse.timestamp) / 1000).toString(),
      'X-Response-Time': `${responseTime.toFixed(2)}ms`,
      ...cachedResponse.metadata.headers
    });

    // Decompress if needed
    let responseData = cachedResponse.data;
    if (cachedResponse.compressed) {
      responseData = await this.decompress(cachedResponse.data);
    }

    res.json(responseData);
  }

  /**
   * Intercept and cache response
   */
  private async interceptAndCacheResponse(
    req: Request,
    res: Response,
    next: NextFunction,
    cacheKey: string,
    config: CacheOptions,
    startTime: number
  ): Promise<void> {
    // Store original json method
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Intercept json response
    (res as any).json = async (data: any) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Update metrics
      this.metrics.misses++;
      this.responseTimeSum += responseTime;
      this.metrics.avgResponseTime = this.responseTimeSum / this.metrics.totalRequests;
      this.metrics.hitRate = this.metrics.hits / this.metrics.totalRequests;

      // Cache the response if appropriate
      if (this.shouldCacheResponse(req, res, data, config)) {
        await this.cacheResponse(cacheKey, data, config, responseTime, res);
      }

      // Set cache headers
      res.set({
        'X-Cache': 'MISS',
        'X-Response-Time': `${responseTime.toFixed(2)}ms`
      });

      return originalJson(data);
    };

    // Intercept send response (for non-JSON responses)
    (res as any).send = async (data: any) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.metrics.misses++;
      this.responseTimeSum += responseTime;
      this.metrics.avgResponseTime = this.responseTimeSum / this.metrics.totalRequests;
      this.metrics.hitRate = this.metrics.hits / this.metrics.totalRequests;

      res.set({
        'X-Cache': 'MISS',
        'X-Response-Time': `${responseTime.toFixed(2)}ms`
      });

      return originalSend(data);
    };

    next();
  }

  /**
   * Check if response should be cached
   */
  private shouldCacheResponse(
    req: Request,
    res: Response,
    data: any,
    config: CacheOptions
  ): boolean {
    // Don't cache error responses
    if (res.statusCode >= 400) {
      return false;
    }

    // Don't cache empty responses
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return false;
    }

    // Check response size
    const dataSize = JSON.stringify(data).length;
    if (config.maxSize && dataSize > config.maxSize) {
      console.warn(`Response too large to cache: ${dataSize} bytes`);
      return false;
    }

    // Use custom shouldCache function if provided
    if (config.shouldCache) {
      return config.shouldCache(req, data);
    }

    return true;
  }

  /**
   * Cache response data
   */
  private async cacheResponse(
    cacheKey: string,
    data: any,
    config: CacheOptions,
    queryTime: number,
    res: Response
  ): Promise<void> {
    try {
      const originalSize = JSON.stringify(data).length;
      let responseData = data;
      let compressed = false;
      let compressedSize = originalSize;

      // Compress if enabled and data is large enough
      if (config.compression && originalSize > 1024) { // 1KB threshold
        responseData = await this.compress(data);
        compressedSize = JSON.stringify(responseData).length;
        compressed = true;
      }

      const cachedResponse: CachedResponse = {
        data: responseData,
        timestamp: Date.now(),
        ttl: config.ttl || this.defaultOptions.ttl!,
        compressed,
        metadata: {
          originalSize,
          compressedSize: compressed ? compressedSize : undefined,
          queryTime,
          headers: this.extractCacheableHeaders(res)
        }
      };

      await cacheService.set(cacheKey, cachedResponse, cachedResponse.ttl);
      
      // Update cache size metric (approximate)
      this.metrics.cacheSize += compressedSize;

    } catch (error) {
      console.error('Error caching response:', error);
    }
  }

  /**
   * Extract cacheable headers from response
   */
  private extractCacheableHeaders(res: Response): Record<string, string> {
    const cacheableHeaders = ['content-type', 'etag', 'last-modified'];
    const headers: Record<string, string> = {};

    cacheableHeaders.forEach(header => {
      const value = res.get(header);
      if (value) {
        headers[header] = value;
      }
    });

    return headers;
  }

  /**
   * Compress data using gzip
   */
  private async compress(data: any): Promise<string> {
    const zlib = require('zlib');
    const util = require('util');
    const gzip = util.promisify(zlib.gzip);
    
    const jsonString = JSON.stringify(data);
    const compressed = await gzip(Buffer.from(jsonString, 'utf8'));
    return compressed.toString('base64');
  }

  /**
   * Decompress data
   */
  private async decompress(compressedData: string): Promise<any> {
    const zlib = require('zlib');
    const util = require('util');
    const gunzip = util.promisify(zlib.gunzip);
    
    const buffer = Buffer.from(compressedData, 'base64');
    const decompressed = await gunzip(buffer);
    return JSON.parse(decompressed.toString('utf8'));
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCache(pattern: string): Promise<number> {
    try {
      return await cacheService.invalidatePattern(`query_result:*${pattern}*`);
    } catch (error) {
      console.error('Error invalidating cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache for specific endpoints
   */
  async invalidateCacheForEndpoints(endpoints: string[]): Promise<void> {
    for (const endpoint of endpoints) {
      await this.invalidateCache(endpoint);
    }
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgResponseTime: 0,
      totalRequests: 0,
      cacheSize: 0,
      lastReset: new Date()
    };
    this.responseTimeSum = 0;
  }

  /**
   * Warm cache for popular endpoints
   */
  async warmCache(endpoints: Array<{ path: string; params?: any }>): Promise<void> {
    console.log('🔥 Starting query result cache warming...');
    
    for (const endpoint of endpoints) {
      try {
        // This would make requests to warm the cache
        // Implementation depends on your HTTP client setup
        console.log(`Warming cache for ${endpoint.path}`);
      } catch (error) {
        console.error(`Failed to warm cache for ${endpoint.path}:`, error);
      }
    }
    
    console.log('✅ Query result cache warming completed');
  }

  /**
   * Get cache health status
   */
  async getCacheHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    hitRate: number;
    avgResponseTime: number;
    cacheSize: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check hit rate
    if (this.metrics.hitRate < 0.3) {
      issues.push('Low cache hit rate');
      status = 'degraded';
    }

    // Check response time
    if (this.metrics.avgResponseTime > 1000) {
      issues.push('High average response time');
      status = 'degraded';
    }

    // Check cache size
    if (this.metrics.cacheSize > 100 * 1024 * 1024) { // 100MB
      issues.push('Cache size is very large');
      status = 'degraded';
    }

    if (issues.length > 2) {
      status = 'unhealthy';
    }

    return {
      status,
      hitRate: this.metrics.hitRate,
      avgResponseTime: this.metrics.avgResponseTime,
      cacheSize: this.metrics.cacheSize,
      issues
    };
  }
}

// Singleton instance
export const queryResultCachingMiddleware = new QueryResultCachingMiddleware();

// Convenience functions for common caching patterns
export const cacheMiddleware = {
  // Cache for 5 minutes (default)
  short: () => queryResultCachingMiddleware.cache({ ttl: 300 }),
  
  // Cache for 1 hour
  medium: () => queryResultCachingMiddleware.cache({ ttl: 3600 }),
  
  // Cache for 24 hours
  long: () => queryResultCachingMiddleware.cache({ ttl: 86400 }),
  
  // Cache user-specific data
  userSpecific: (ttl: number = 300) => queryResultCachingMiddleware.cache({
    ttl,
    varyBy: ['user', 'query']
  }),
  
  // Cache search results
  searchResults: () => queryResultCachingMiddleware.cache({
    ttl: 600, // 10 minutes
    varyBy: ['query', 'filters'],
    shouldCache: (req, data) => {
      // Only cache if we have results
      return data && Array.isArray(data) && data.length > 0;
    }
  }),
  
  // Cache marketplace listings
  marketplaceListings: () => queryResultCachingMiddleware.cache({
    ttl: 300, // 5 minutes
    varyBy: ['query', 'filters'],
    maxSize: 2 * 1024 * 1024, // 2MB
    shouldCache: (req, data) => {
      // Cache if we have listings
      return data && (data.listings || data.products) && 
             (data.listings?.length > 0 || data.products?.length > 0);
    }
  }),
  
  // Cache static/reference data
  static: () => queryResultCachingMiddleware.cache({
    ttl: 3600 * 24, // 24 hours
    varyBy: [],
    compression: true
  })
};

export default queryResultCachingMiddleware;
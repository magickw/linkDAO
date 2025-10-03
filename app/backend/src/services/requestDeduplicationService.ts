import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { cacheService } from './cacheService';
import { logger } from '../utils/logger';

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  requestId: string;
}

interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
  etag?: string;
}

export class RequestDeduplicationService {
  private static instance: RequestDeduplicationService;
  private pendingRequests = new Map<string, PendingRequest>();
  private responseCache = new Map<string, CachedResponse>();
  private maxCacheSize = 1000;
  private defaultTTL = 300; // 5 minutes

  public static getInstance(): RequestDeduplicationService {
    if (!RequestDeduplicationService.instance) {
      RequestDeduplicationService.instance = new RequestDeduplicationService();
    }
    return RequestDeduplicationService.instance;
  }

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Generate a unique key for request deduplication
   */
  public generateRequestKey(req: Request): string {
    const method = req.method;
    const path = req.path;
    const query = JSON.stringify(req.query);
    const body = req.method !== 'GET' ? JSON.stringify(req.body) : '';
    const walletAddress = (req as any).walletAddress || '';
    
    const keyData = `${method}:${path}:${query}:${body}:${walletAddress}`;
    return crypto.createHash('sha256').update(keyData).digest('hex');
  }

  /**
   * Generate cache key for response caching
   */
  public generateCacheKey(req: Request): string {
    const method = req.method;
    const path = req.path;
    const query = JSON.stringify(req.query);
    const walletAddress = (req as any).walletAddress || '';
    
    // Only cache GET requests and some safe POST requests
    if (method === 'GET' || this.isCacheableRequest(req)) {
      const keyData = `cache:${method}:${path}:${query}:${walletAddress}`;
      return crypto.createHash('sha256').update(keyData).digest('hex');
    }
    
    return '';
  }

  /**
   * Check if request is cacheable
   */
  private isCacheableRequest(req: Request): boolean {
    const cacheablePaths = [
      '/marketplace/listings',
      '/marketplace/reputation',
      '/api/marketplace/seller',
      '/health'
    ];

    return req.method === 'GET' || 
           cacheablePaths.some(path => req.path.startsWith(path));
  }

  /**
   * Middleware for request deduplication
   */
  public deduplicationMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip deduplication for non-idempotent operations
        if (!this.shouldDeduplicate(req)) {
          return next();
        }

        const requestKey = this.generateRequestKey(req);
        const existingRequest = this.pendingRequests.get(requestKey);

        if (existingRequest) {
          // Request is already in progress, wait for it
          logger.debug('Deduplicating concurrent request', {
            requestKey: requestKey.substring(0, 8),
            method: req.method,
            path: req.path
          });

          try {
            const result = await existingRequest.promise;
            return res.status(result.statusCode).set(result.headers).json(result.body);
          } catch (error) {
            // If the original request failed, allow this one to proceed
            logger.warn('Original request failed, proceeding with duplicate', error);
          }
        }

        // Create a promise for this request
        const requestPromise = this.executeRequest(req, res, next);
        
        this.pendingRequests.set(requestKey, {
          promise: requestPromise,
          timestamp: Date.now(),
          requestId: (req as any).requestId || 'unknown'
        });

        // Execute the request
        try {
          const result = await requestPromise;
          return result;
        } finally {
          // Clean up pending request
          this.pendingRequests.delete(requestKey);
        }
      } catch (error) {
        logger.error('Request deduplication error:', error);
        // Continue with normal request processing on error
        next();
      }
    };
  }

  /**
   * Execute request and capture response
   */
  private executeRequest(req: Request, res: Response, next: NextFunction): Promise<any> {
    return new Promise((resolve, reject) => {
      // Capture the original response methods
      const originalSend = res.send;
      const originalJson = res.json;
      const originalStatus = res.status;
      
      let statusCode = 200;
      let responseBody: any;
      let responseHeaders: Record<string, string> = {};

      // Override status method
      res.status = function(code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      // Override json method
      res.json = function(body: any) {
        responseBody = body;
        responseHeaders = this.getHeaders() as Record<string, string>;
        
        const result = {
          statusCode,
          headers: responseHeaders,
          body: responseBody
        };
        
        resolve(result);
        return originalJson.call(this, body);
      };

      // Override send method
      res.send = function(body: any) {
        responseBody = body;
        responseHeaders = this.getHeaders() as Record<string, string>;
        
        const result = {
          statusCode,
          headers: responseHeaders,
          body: responseBody
        };
        
        resolve(result);
        return originalSend.call(this, body);
      };

      // Handle errors
      res.on('error', (error) => {
        reject(error);
      });

      // Continue with normal middleware chain
      next();
    });
  }

  /**
   * Response caching middleware
   */
  public responseCacheMiddleware(ttl: number = this.defaultTTL) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Only cache GET requests and specific endpoints
        if (!this.isCacheableRequest(req)) {
          return next();
        }

        const cacheKey = this.generateCacheKey(req);
        if (!cacheKey) {
          return next();
        }

        // Check for cached response
        const cachedResponse = await this.getCachedResponse(cacheKey);
        if (cachedResponse && this.isCacheValid(cachedResponse, ttl)) {
          // Check if client has the same version (ETag)
          const clientETag = req.get('If-None-Match');
          if (clientETag && cachedResponse.etag === clientETag) {
            return res.status(304).end();
          }

          logger.debug('Serving cached response', {
            cacheKey: cacheKey.substring(0, 8),
            method: req.method,
            path: req.path
          });

          return res
            .status(cachedResponse.statusCode)
            .set(cachedResponse.headers)
            .set('X-Cache', 'HIT')
            .json(cachedResponse.body);
        }

        // Cache miss - capture response for caching
        const originalJson = res.json;
        const originalSend = res.send;

        res.json = function(body: any) {
          // Cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const etag = generateETag(body);
            const cachedResponse: CachedResponse = {
              statusCode: res.statusCode,
              headers: { ...res.getHeaders() as Record<string, string>, etag },
              body,
              timestamp: Date.now(),
              etag
            };
            
            RequestDeduplicationService.getInstance().setCachedResponse(cacheKey, cachedResponse);
            res.set('ETag', etag);
          }
          
          res.set('X-Cache', 'MISS');
          return originalJson.call(this, body);
        };

        res.send = function(body: any) {
          // Cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const etag = generateETag(body);
            const cachedResponse: CachedResponse = {
              statusCode: res.statusCode,
              headers: { ...res.getHeaders() as Record<string, string>, etag },
              body,
              timestamp: Date.now(),
              etag
            };
            
            RequestDeduplicationService.getInstance().setCachedResponse(cacheKey, cachedResponse);
            res.set('ETag', etag);
          }
          
          res.set('X-Cache', 'MISS');
          return originalSend.call(this, body);
        };

        next();
      } catch (error) {
        logger.error('Response cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Check if request should be deduplicated
   */
  private shouldDeduplicate(req: Request): boolean {
    // Only deduplicate safe methods and specific endpoints
    const safeMethodsForDeduplication = ['GET', 'HEAD', 'OPTIONS'];
    const deduplicatablePaths = [
      '/marketplace/listings',
      '/marketplace/reputation',
      '/api/marketplace/seller',
      '/health'
    ];

    return safeMethodsForDeduplication.includes(req.method) ||
           deduplicatablePaths.some(path => req.path.startsWith(path));
  }

  /**
   * Get cached response
   */
  private async getCachedResponse(cacheKey: string): Promise<CachedResponse | null> {
    try {
      // Try memory cache first
      const memoryCache = this.responseCache.get(cacheKey);
      if (memoryCache) {
        return memoryCache;
      }

      // Try Redis cache
      const redisCache = await cacheService.get<CachedResponse>(`response:${cacheKey}`);
      if (redisCache) {
        // Store in memory cache for faster access
        this.responseCache.set(cacheKey, redisCache);
        return redisCache;
      }

      return null;
    } catch (error) {
      logger.error('Error getting cached response:', error);
      return null;
    }
  }

  /**
   * Set cached response
   */
  private async setCachedResponse(cacheKey: string, response: CachedResponse): Promise<void> {
    try {
      // Store in memory cache
      this.responseCache.set(cacheKey, response);
      
      // Limit memory cache size
      if (this.responseCache.size > this.maxCacheSize) {
        const oldestKey = this.responseCache.keys().next().value;
        this.responseCache.delete(oldestKey);
      }

      // Store in Redis cache with TTL
      await cacheService.set(`response:${cacheKey}`, response, this.defaultTTL);
    } catch (error) {
      logger.error('Error setting cached response:', error);
    }
  }

  /**
   * Check if cached response is still valid
   */
  private isCacheValid(cachedResponse: CachedResponse, ttl: number): boolean {
    const age = Date.now() - cachedResponse.timestamp;
    return age < (ttl * 1000);
  }

  /**
   * Invalidate cache for specific patterns
   */
  public async invalidateCache(pattern: string): Promise<void> {
    try {
      // Clear memory cache
      for (const [key, response] of this.responseCache.entries()) {
        if (key.includes(pattern)) {
          this.responseCache.delete(key);
        }
      }

      // Clear Redis cache
      await cacheService.invalidate(`response:*${pattern}*`);
      
      logger.info(`Cache invalidated for pattern: ${pattern}`);
    } catch (error) {
      logger.error('Error invalidating cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    memoryCacheSize: number;
    pendingRequestsCount: number;
    hitRate: number;
    averageResponseTime: number;
  } {
    return {
      memoryCacheSize: this.responseCache.size,
      pendingRequestsCount: this.pendingRequests.size,
      hitRate: 0, // Would need to track hits/misses
      averageResponseTime: 0 // Would need to track response times
    };
  }

  /**
   * Start cleanup interval for expired entries
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 1000); // Run every minute
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    // Clean up pending requests
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > maxAge) {
        this.pendingRequests.delete(key);
      }
    }

    // Clean up response cache
    for (const [key, response] of this.responseCache.entries()) {
      if (now - response.timestamp > this.defaultTTL * 1000) {
        this.responseCache.delete(key);
      }
    }
  }
}

/**
 * Generate ETag for response body
 */
function generateETag(body: any): string {
  const content = typeof body === 'string' ? body : JSON.stringify(body);
  return crypto.createHash('md5').update(content).digest('hex');
}

export const requestDeduplicationService = RequestDeduplicationService.getInstance();

// Export middleware functions
export const deduplicationMiddleware = requestDeduplicationService.deduplicationMiddleware();
export const responseCacheMiddleware = (ttl?: number) => 
  requestDeduplicationService.responseCacheMiddleware(ttl);
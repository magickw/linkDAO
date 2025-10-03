import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
  invalidateOn?: string[];
  varyBy?: string[];
}

interface CacheMiddlewareConfig {
  sellerProfile: CacheOptions;
  listings: CacheOptions;
  reputation: CacheOptions;
  searchResults: CacheOptions;
  default: CacheOptions;
}

class CachingMiddleware {
  private config: CacheMiddlewareConfig;

  constructor() {
    this.config = {
      sellerProfile: {
        ttl: 300, // 5 minutes
        keyGenerator: (req) => `seller:profile:${req.params.walletAddress?.toLowerCase()}`,
        condition: (req, res) => req.method === 'GET' && res.statusCode === 200,
        invalidateOn: ['POST', 'PUT', 'PATCH'],
        varyBy: ['walletAddress']
      },
      listings: {
        ttl: 60, // 1 minute
        keyGenerator: (req) => {
          const query = new URLSearchParams(req.query as any).toString();
          return `listings:${Buffer.from(query).toString('base64')}`;
        },
        condition: (req, res) => req.method === 'GET' && res.statusCode === 200,
        invalidateOn: ['POST', 'PUT', 'PATCH', 'DELETE'],
        varyBy: ['query']
      },
      reputation: {
        ttl: 600, // 10 minutes
        keyGenerator: (req) => `reputation:${req.params.walletAddress?.toLowerCase()}`,
        condition: (req, res) => req.method === 'GET' && res.statusCode === 200,
        invalidateOn: ['POST', 'PUT'],
        varyBy: ['walletAddress']
      },
      searchResults: {
        ttl: 300, // 5 minutes
        keyGenerator: (req) => {
          const query = req.query.q as string || '';
          const filters = JSON.stringify(req.query.filters || {});
          return `search:${Buffer.from(`${query}:${filters}`).toString('base64')}`;
        },
        condition: (req, res) => req.method === 'GET' && res.statusCode === 200,
        invalidateOn: ['POST', 'PUT', 'PATCH', 'DELETE'],
        varyBy: ['query', 'filters']
      },
      default: {
        ttl: 300, // 5 minutes
        keyGenerator: (req) => `${req.method}:${req.originalUrl}`,
        condition: (req, res) => req.method === 'GET' && res.statusCode === 200,
        invalidateOn: ['POST', 'PUT', 'PATCH', 'DELETE'],
        varyBy: []
      }
    };
  }

  // Main caching middleware factory
  cache(type: keyof CacheMiddlewareConfig = 'default', customOptions?: Partial<CacheOptions>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const options = { ...this.config[type], ...customOptions };
      const cacheKey = options.keyGenerator!(req);

      // Skip caching for non-GET requests unless explicitly configured
      if (req.method !== 'GET' && !options.condition) {
        return next();
      }

      try {
        // Try to get from cache first
        const cachedData = await cacheService.get(cacheKey);
        
        if (cachedData && req.method === 'GET') {
          console.log(`Cache hit: ${cacheKey}`);
          
          // Set cache headers
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
            'Cache-Control': `public, max-age=${options.ttl}`
          });
          
          return res.json(cachedData);
        }

        // Store original json method
        const originalJson = res.json.bind(res);
        
        // Override json method to cache the response
        res.json = function(data: any) {
          // Check if we should cache this response
          if (options.condition!(req, res)) {
            // Cache the response asynchronously
            cacheService.set(cacheKey, data, options.ttl).catch(error => {
              console.error(`Failed to cache response for ${cacheKey}:`, error);
            });
            
            // Set cache headers
            res.set({
              'X-Cache': 'MISS',
              'X-Cache-Key': cacheKey,
              'Cache-Control': `public, max-age=${options.ttl}`
            });
          }
          
          return originalJson(data);
        };

        next();
      } catch (error) {
        console.error(`Caching middleware error for ${cacheKey}:`, error);
        // Continue without caching on error
        next();
      }
    };
  }

  // Cache invalidation middleware
  invalidate(type: keyof CacheMiddlewareConfig = 'default', customOptions?: Partial<CacheOptions>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const options = { ...this.config[type], ...customOptions };

      // Check if this method should trigger invalidation
      if (!options.invalidateOn?.includes(req.method)) {
        return next();
      }

      // Store original json method to invalidate after successful response
      const originalJson = res.json.bind(res);
      
      res.json = function(data: any) {
        // Only invalidate on successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Invalidate related cache entries
          invalidateRelatedCache(req, type, options).catch(error => {
            console.error('Cache invalidation failed:', error);
          });
        }
        
        return originalJson(data);
      };

      next();
    };
  }

  // Seller profile specific caching
  sellerProfileCache() {
    return this.cache('sellerProfile');
  }

  // Listings specific caching
  listingsCache() {
    return this.cache('listings');
  }

  // Reputation specific caching
  reputationCache() {
    return this.cache('reputation');
  }

  // Search results specific caching
  searchResultsCache() {
    return this.cache('searchResults');
  }

  // Cache warming middleware
  warmCache(urls: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Warm cache in background
      warmCacheInBackground(urls).catch(error => {
        console.error('Cache warming failed:', error);
      });
      
      next();
    };
  }

  // Cache statistics middleware
  cacheStats() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const stats = await cacheService.getStats();
        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to get cache stats:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve cache statistics'
        });
      }
    };
  }

  // Cache health check middleware
  cacheHealthCheck() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const health = await cacheService.healthCheck();
        res.json({
          success: true,
          data: health,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Cache health check failed:', error);
        res.status(500).json({
          success: false,
          error: 'Cache health check failed'
        });
      }
    };
  }
}

// Helper function to invalidate related cache entries
async function invalidateRelatedCache(
  req: Request, 
  type: keyof CacheMiddlewareConfig, 
  options: CacheOptions
): Promise<void> {
  try {
    switch (type) {
      case 'sellerProfile':
        if (req.params.walletAddress) {
          await cacheService.invalidateSellerProfile(req.params.walletAddress);
          // Also invalidate listings for this seller
          await cacheService.invalidateListings();
        }
        break;

      case 'listings':
        await cacheService.invalidateListings();
        // Also invalidate search results
        await cacheService.invalidateSearchResults();
        break;

      case 'reputation':
        if (req.params.walletAddress) {
          await cacheService.invalidateReputation(req.params.walletAddress);
        }
        break;

      case 'searchResults':
        await cacheService.invalidateSearchResults();
        break;

      default:
        // For default type, try to invalidate based on the request
        const cacheKey = options.keyGenerator!(req);
        await cacheService.invalidate(cacheKey);
        break;
    }

    console.log(`Cache invalidated for ${type} after ${req.method} ${req.originalUrl}`);
  } catch (error) {
    console.error(`Failed to invalidate cache for ${type}:`, error);
  }
}

// Helper function to warm cache in background
async function warmCacheInBackground(urls: string[]): Promise<void> {
  try {
    // This would typically fetch popular content and cache it
    console.log(`Warming cache for ${urls.length} URLs`);
    
    // Example: warm popular listings
    await cacheService.warmCache();
    
    console.log('Cache warming completed');
  } catch (error) {
    console.error('Cache warming failed:', error);
  }
}

// Rate limiting with cache
export function rateLimitWithCache(
  identifier: (req: Request) => string,
  limit: number = 100,
  windowSeconds: number = 3600
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = identifier(req);
      const result = await cacheService.checkRateLimit(key, limit, windowSeconds);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      });

      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue without rate limiting on error
      next();
    }
  };
}

// Conditional caching based on user preferences or feature flags
export function conditionalCache(
  condition: (req: Request) => boolean,
  cacheType: keyof CacheMiddlewareConfig = 'default'
) {
  const middleware = new CachingMiddleware();
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return middleware.cache(cacheType)(req, res, next);
    }
    next();
  };
}

// Cache bypass for development or debugging
export function cacheBypass(bypassHeader: string = 'X-Cache-Bypass') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.headers[bypassHeader.toLowerCase()]) {
      res.set('X-Cache', 'BYPASS');
      return next();
    }
    next();
  };
}

// Export singleton instance
export const cachingMiddleware = new CachingMiddleware();

// Export individual middleware functions
export {
  CachingMiddleware,
  CacheOptions,
  CacheMiddlewareConfig
};
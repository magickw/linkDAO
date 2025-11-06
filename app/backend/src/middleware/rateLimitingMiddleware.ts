import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';
import { productionConfig } from '../config/productionConfig';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
  onLimitReached?: (req: Request, res: Response) => void; // Custom limit reached handler
  message?: string; // Custom error message
  standardHeaders?: boolean; // Include rate limit headers
  legacyHeaders?: boolean; // Include legacy X-RateLimit headers
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
  remaining: number;
}

export class RateLimitingService {
  private static instance: RateLimitingService;
  private defaultConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.'
  };

  public static getInstance(): RateLimitingService {
    if (!RateLimitingService.instance) {
      RateLimitingService.instance = new RateLimitingService();
    }
    return RateLimitingService.instance;
  }

  /**
   * Create rate limiting middleware with custom configuration
   */
  public createRateLimit(config: Partial<RateLimitConfig> = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.generateKey(req, finalConfig.keyGenerator);
        const rateLimitInfo = await this.checkRateLimit(key, finalConfig);

        // Add rate limit headers
        if (finalConfig.standardHeaders) {
          res.set({
            'RateLimit-Limit': finalConfig.maxRequests.toString(),
            'RateLimit-Remaining': Math.max(0, rateLimitInfo.remaining).toString(),
            'RateLimit-Reset': new Date(rateLimitInfo.resetTime).toISOString(),
            'RateLimit-Policy': `${finalConfig.maxRequests};w=${Math.floor(finalConfig.windowMs / 1000)}`
          });
        }

        if (finalConfig.legacyHeaders) {
          res.set({
            'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, rateLimitInfo.remaining).toString(),
            'X-RateLimit-Reset': Math.floor(rateLimitInfo.resetTime / 1000).toString()
          });
        }

        // Check if rate limit exceeded
        if (rateLimitInfo.count > finalConfig.maxRequests) {
          const retryAfter = Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000);
          
          res.set({
            'Retry-After': retryAfter.toString()
          });

          if (finalConfig.onLimitReached) {
            finalConfig.onLimitReached(req, res);
          } else {
            res.status(429).json({
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: finalConfig.message,
                details: {
                  limit: finalConfig.maxRequests,
                  windowMs: finalConfig.windowMs,
                  retryAfter
                }
              }
            });
          }
          return;
        }

        // Increment counter for this request
        await this.incrementCounter(key, finalConfig, req, res);
        next();
      } catch (error) {
        logger.error('Rate limiting error:', error);
        // Don't block requests if rate limiting fails
        next();
      }
    };
  }

  /**
   * Check current rate limit status for a key
   */
  private async checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const resetTime = now + config.windowMs;

    try {
      // Get current count from cache
      const currentCount = await cacheService.get<number>(`rate_limit:${key}`) || 0;
      const remaining = Math.max(0, config.maxRequests - currentCount);

      return {
        count: currentCount,
        resetTime,
        remaining
      };
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      // Return safe defaults if cache fails
      return {
        count: 0,
        resetTime,
        remaining: config.maxRequests
      };
    }
  }

  /**
   * Increment the request counter
   */
  private async incrementCounter(
    key: string, 
    config: RateLimitConfig, 
    req: Request, 
    res: Response
  ): Promise<void> {
    try {
      const cacheKey = `rate_limit:${key}`;
      const ttl = Math.ceil(config.windowMs / 1000);
      
      // Get current count
      const currentCount = await cacheService.get<number>(cacheKey) || 0;
      
      // Increment counter
      await cacheService.set(cacheKey, currentCount + 1, ttl);

      // Log rate limit activity for monitoring
      if (currentCount > config.maxRequests * 0.8) {
        logger.warn('High rate limit usage detected', {
          key,
          count: currentCount + 1,
          limit: config.maxRequests,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: `${req.method} ${req.path}`
        });
      }
    } catch (error) {
      logger.error('Error incrementing rate limit counter:', error);
    }
  }

  /**
   * Generate cache key for rate limiting
   */
  private generateKey(req: Request, customKeyGenerator?: (req: Request) => string): string {
    if (customKeyGenerator) {
      return customKeyGenerator(req);
    }

    // Default key generation strategy
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const endpoint = `${req.method}:${req.route?.path || req.path}`;
    
    // Include wallet address if available for authenticated requests
    const walletAddress = (req as any).walletAddress || '';
    
    return `${ip}:${endpoint}:${walletAddress}`.replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  /**
   * Get rate limit status for a specific key
   */
  public async getRateLimitStatus(key: string, config: RateLimitConfig): Promise<RateLimitInfo> {
    return this.checkRateLimit(key, config);
  }

  /**
   * Reset rate limit for a specific key
   */
  public async resetRateLimit(key: string): Promise<void> {
    try {
      await cacheService.invalidate(`rate_limit:${key}`);
      logger.info(`Rate limit reset for key: ${key}`);
    } catch (error) {
      logger.error('Error resetting rate limit:', error);
      throw error;
    }
  }

  /**
   * Get rate limiting statistics
   */
  public async getRateLimitStats(): Promise<{
    totalKeys: number;
    activeKeys: string[];
    topConsumers: Array<{ key: string; count: number }>;
  }> {
    try {
      // This would need to be implemented based on your cache service capabilities
      // For now, return basic stats
      return {
        totalKeys: 0,
        activeKeys: [],
        topConsumers: []
      };
    } catch (error) {
      logger.error('Error getting rate limit stats:', error);
      return {
        totalKeys: 0,
        activeKeys: [],
        topConsumers: []
      };
    }
  }
}

type LegacyRateLimitOptions = Partial<RateLimitConfig> & { max?: number };

/**
 * Helper exported for existing route imports expecting a function-style middleware factory.
 */
export function rateLimitingMiddleware(options: LegacyRateLimitOptions = {}) {
  const { max, ...rest } = options;
  const config: Partial<RateLimitConfig> = {
    ...rest,
    ...(typeof max === 'number' ? { maxRequests: max } : {}),
  };
  return RateLimitingService.getInstance().createRateLimit(config);
}

// Pre-configured rate limiters for different use cases
export const rateLimitingService = RateLimitingService.getInstance();

// General API rate limiter
export const generalRateLimit = rateLimitingService.createRateLimit({
  windowMs: productionConfig.rateLimiting.general.windowMs,
  maxRequests: productionConfig.rateLimiting.general.max,
  message: productionConfig.rateLimiting.general.message
});

// Feed rate limiter
export const feedRateLimit = rateLimitingService.createRateLimit({
  windowMs: productionConfig.rateLimiting.feed.windowMs,
  maxRequests: productionConfig.rateLimiting.feed.max,
  message: productionConfig.rateLimiting.feed.message
});

// Create post rate limiter
export const createPostRateLimit = rateLimitingService.createRateLimit({
  windowMs: productionConfig.rateLimiting.createPost.windowMs,
  maxRequests: productionConfig.rateLimiting.createPost.max,
  message: productionConfig.rateLimiting.createPost.message
});

// Authentication rate limiter (more restrictive)
export const authRateLimit = rateLimitingService.createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: (req: Request) => {
    const ip = req.ip || 'unknown';
    const walletAddress = req.body?.walletAddress || '';
    return `auth:${ip}:${walletAddress}`;
  }
});

// Profile update rate limiter
export const profileUpdateRateLimit = rateLimitingService.createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  message: 'Too many profile updates, please try again later.',
  keyGenerator: (req: Request) => {
    const walletAddress = (req as any).walletAddress || req.ip;
    return `profile_update:${walletAddress}`;
  }
});

// Marketplace listing creation rate limiter
export const listingCreationRateLimit = rateLimitingService.createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3,
  message: 'Too many listing creations, please try again later.',
  keyGenerator: (req: Request) => {
    const walletAddress = (req as any).walletAddress || req.ip;
    return `listing_creation:${walletAddress}`;
  }
});

// Search rate limiter (higher limit for read operations)
export const searchRateLimit = rateLimitingService.createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 200,
  message: 'Too many search requests, please try again later.',
  skipSuccessfulRequests: true // Don't count successful searches
});

// Heavy operation rate limiter (very restrictive)
export const heavyOperationRateLimit = rateLimitingService.createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 1,
  message: 'Heavy operation in progress, please wait before trying again.',
  keyGenerator: (req: Request) => {
    const walletAddress = (req as any).walletAddress || req.ip;
    return `heavy_op:${walletAddress}`;
  }
});

// Reputation update rate limiter
export const reputationRateLimit = rateLimitingService.createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Too many reputation requests, please try again later.',
  keyGenerator: (req: Request) => {
    const walletAddress = req.params?.walletAddress || req.ip;
    return `reputation:${walletAddress}`;
  }
});

// File upload rate limiter
export const fileUploadRateLimit = rateLimitingService.createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Too many file uploads, please try again later.',
  keyGenerator: (req: Request) => {
    const walletAddress = (req as any).walletAddress || req.ip;
    return `file_upload:${walletAddress}`;
  }
});

// Export rate limit configurations for different tiers
export const RATE_LIMIT_TIERS = {
  FREE: {
    windowMs: 60 * 1000,
    maxRequests: 50
  },
  PREMIUM: {
    windowMs: 60 * 1000,
    maxRequests: 200
  },
  ENTERPRISE: {
    windowMs: 60 * 1000,
    maxRequests: 1000
  }
};

// Middleware to apply different rate limits based on user tier
export const tieredRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const userTier = (req as any).userTier || 'FREE';
  const config = RATE_LIMIT_TIERS[userTier as keyof typeof RATE_LIMIT_TIERS] || RATE_LIMIT_TIERS.FREE;
  
  const rateLimiter = rateLimitingService.createRateLimit({
    ...config,
    keyGenerator: (req: Request) => {
      const walletAddress = (req as any).walletAddress || req.ip;
      return `tiered:${userTier}:${walletAddress}`;
    }
  });
  
  return rateLimiter(req, res, next);
};

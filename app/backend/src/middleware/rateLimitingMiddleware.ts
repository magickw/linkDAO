import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';
import { productionConfig } from '../config/productionConfig';
import { ApiResponse } from '../utils/apiResponse';

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
            ApiResponse.tooManyRequests(res, finalConfig.message || 'Too many requests, please try again later.');
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
    } catch (error) {
      logger.error('Error resetting rate limit:', error);
    }
  }

  /**
   * Get all rate limit keys (for monitoring/debugging)
   */
  public async getAllRateLimitKeys(): Promise<string[]> {
    try {
      // This would depend on your cache implementation
      // For Redis, you might use KEYS or SCAN command
      // For simplicity, we'll return an empty array
      return [];
    } catch (error) {
      logger.error('Error getting rate limit keys:', error);
      return [];
    }
  }
}

export default RateLimitingService;
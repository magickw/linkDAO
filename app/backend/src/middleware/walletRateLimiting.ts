/**
 * Wallet-Based Rate Limiting Middleware
 * Implements rate limiting based on wallet address in addition to IP-based limiting
 * Prevents abuse from Web3 authenticated users
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest } from './authMiddleware';
import { safeLogger } from '../utils/safeLogger';
import { redisClient } from '../config/redisConfig';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Create wallet-based rate limiter
 * Uses wallet address as the key if authenticated, falls back to IP
 */
export function walletRateLimit(config: RateLimitConfig) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.maxRequests,
    message: config.message || 'Too many requests from this wallet, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: config.skipSuccessfulRequests || false,
    skipFailedRequests: config.skipFailedRequests || false,

    // Use wallet address if authenticated, otherwise use IP
    keyGenerator: (req: Request): string => {
      const authReq = req as AuthenticatedRequest;
      if (authReq.user && authReq.user.walletAddress) {
        return `wallet:${authReq.user.walletAddress.toLowerCase()}`;
      }
      return `ip:${req.ip || req.connection.remoteAddress || 'unknown'}`;
    },

    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      const identifier = authReq.user?.walletAddress || req.ip;

      safeLogger.warn('Rate limit exceeded', {
        identifier,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent')
      });

      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: config.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(config.windowMs / 1000),
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    },

    // Skip certain requests (e.g., health checks)
    skip: (req: Request): boolean => {
      return req.path === '/health' || req.path === '/ping';
    }
  });
}

/**
 * Wallet-specific rate limits for different endpoint categories
 */

// General API rate limit: 100 requests per 15 minutes per wallet
export const walletGeneralRateLimit = walletRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many API requests from this wallet. Please try again in 15 minutes.'
});

// Authentication rate limit: 20 login attempts per 15 minutes per wallet
export const walletAuthRateLimit = walletRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // Increased to prevent blocking during retry loops
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  skipSuccessfulRequests: true // Don't count successful logins
});

// Marketplace actions: 50 requests per hour per wallet (listings, orders, etc.)
export const walletMarketplaceRateLimit = walletRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50,
  message: 'Too many marketplace actions. Please try again in 1 hour.'
});

// Verification requests: 3 per day per wallet
export const walletVerificationRateLimit = walletRateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 3,
  message: 'Too many verification attempts today. Please try again tomorrow.'
});

// Message/chat: 100 messages per hour per wallet
export const walletMessagingRateLimit = walletRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100,
  message: 'Too many messages sent. Please slow down.'
});

// Search queries: 60 per minute per wallet
export const walletSearchRateLimit = walletRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  message: 'Too many search requests. Please slow down.'
});

/**
 * Redis-based wallet rate limiter for distributed systems
 * Use this if you're running multiple server instances
 */
export class RedisWalletRateLimiter {
  private readonly prefix = 'rate_limit:';

  /**
   * Check if wallet has exceeded rate limit
   */
  async checkRateLimit(
    walletAddress: string,
    action: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    try {
      const key = `${this.prefix}${action}:${walletAddress.toLowerCase()}`;
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - windowSeconds;

      // Use Redis sorted set to track requests with timestamps
      if (!redisClient) {
        // Fallback to allowing if Redis is not available
        return {
          allowed: true,
          remaining: maxRequests,
          resetAt: new Date(Date.now() + windowSeconds * 1000)
        };
      }

      try {
        // Remove old requests outside the window
        await redisClient.zremrangebyscore(key, 0, windowStart);

        // Count requests in current window
        const requestCount = await redisClient.zcard(key);

        if (requestCount >= maxRequests) {
          // Get the oldest request timestamp to calculate reset time
          const oldestRequest = await redisClient.zrange(key, 0, 0, 'WITHSCORES');
          const resetAt = oldestRequest.length > 1
            ? new Date((parseInt(oldestRequest[1]) + windowSeconds) * 1000)
            : new Date(Date.now() + windowSeconds * 1000);

          return {
            allowed: false,
            remaining: 0,
            resetAt
          };
        }

        // Add current request to the sorted set
        await redisClient.zadd(key, now, `${now}:${Math.random()}`);

        // Set expiration to clean up old keys
        await redisClient.expire(key, windowSeconds);

        return {
          allowed: true,
          remaining: maxRequests - requestCount - 1,
          resetAt: new Date(Date.now() + windowSeconds * 1000)
        };
      } catch (error) {
        safeLogger.error('Redis error in wallet rate limiting, falling back to allow:', {
          error: {
            message: error.message,
            name: error.name,
            code: (error as any).code
          },
          key,
          walletAddress
        });

        // Fallback to allowing if Redis operation fails
        return {
          allowed: true,
          remaining: maxRequests,
          resetAt: new Date(Date.now() + windowSeconds * 1000)
        };
      }

    } catch (error) {
      safeLogger.error('Redis rate limiter error:', error);
      // Fail open - allow request if Redis has issues
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: new Date(Date.now() + windowSeconds * 1000)
      };
    }
  }

  /**
   * Middleware factory for Redis-based wallet rate limiting
   */
  createMiddleware(
    action: string,
    maxRequests: number,
    windowSeconds: number,
    message?: string
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authReq = req as AuthenticatedRequest;

      // Skip if not authenticated or no wallet address
      if (!authReq.user || !authReq.user.walletAddress) {
        return next();
      }

      const result = await this.checkRateLimit(
        authReq.user.walletAddress,
        action,
        maxRequests,
        windowSeconds
      );

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

      if (!result.allowed) {
        safeLogger.warn('Wallet rate limit exceeded', {
          walletAddress: authReq.user.walletAddress,
          action,
          path: req.path
        });

        return res.status(429).json({
          success: false,
          error: 'WALLET_RATE_LIMIT_EXCEEDED',
          message: message || 'Too many requests from this wallet.',
          retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
          metadata: {
            timestamp: new Date().toISOString(),
            resetAt: result.resetAt.toISOString()
          }
        });
      }

      next();
    };
  }
}

export const redisWalletRateLimiter = new RedisWalletRateLimiter();

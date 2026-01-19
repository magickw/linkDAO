/**
 * Rate Limiting Middleware for Checkout Endpoints
 *
 * Prevents abuse and ensures fair usage of checkout endpoints
 * Uses Redis for distributed rate limiting across multiple servers
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import { safeLogger } from '../utils/safeLogger';
import { apiResponse } from '../utils/apiResponse';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export class RedisRateLimiter {
  private client: RedisClientType | null = null;
  private isConnected = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(100 * Math.pow(2, retries), 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        safeLogger.error('Redis Rate Limiter Error:', err);
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      safeLogger.error('Failed to initialize Redis rate limiter:', error);
      // Continue without Redis - will use in-memory fallback
    }
  }

  /**
   * Create rate limit middleware
   */
  createMiddleware(config: RateLimitConfig) {
    const self = this;
    const {
      windowMs,
      maxRequests,
      message = 'Too many requests, please try again later.',
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = this.defaultKeyGenerator
    } = config;

    // In-memory fallback if Redis unavailable
    const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const key = `ratelimit:${keyGenerator(req)}`;
        const now = Date.now();

        let current: number;
        let resetTime: number;

        if (self.isConnected && self.client) {
          // Use Redis for distributed rate limiting
          const multi = self.client.multi();
          multi.incr(key);
          multi.pExpire(key, windowMs);
          multi.pTTL(key);

          const results = await multi.exec();
          current = results[0] as number;
          const ttl = results[2] as number;
          resetTime = now + ttl;
        } else {
          // Fallback to in-memory rate limiting
          const record = inMemoryStore.get(key);

          if (!record || now > record.resetTime) {
            inMemoryStore.set(key, { count: 1, resetTime: now + windowMs });
            current = 1;
            resetTime = now + windowMs;
          } else {
            record.count++;
            current = record.count;
            resetTime = record.resetTime;
          }

          // Cleanup old entries
          if (Math.random() < 0.01) {
            for (const [k, v] of inMemoryStore.entries()) {
              if (now > v.resetTime) {
                inMemoryStore.delete(k);
              }
            }
          }
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current).toString());
        res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());

        if (current > maxRequests) {
          safeLogger.warn(`Rate limit exceeded for ${key}: ${current}/${maxRequests}`);
          res.status(429).json(
            apiResponse.error(`${message}. Retry after ${Math.ceil((resetTime - now) / 1000)}s`, 429)
          );
          return;
        }

        // Intercept response to handle skip options
        if (skipSuccessfulRequests || skipFailedRequests) {
          const originalJson = res.json.bind(res);
          res.json = function (body: any) {
            const shouldSkip =
              (skipSuccessfulRequests && res.statusCode < 400) ||
              (skipFailedRequests && res.statusCode >= 400);

            if (shouldSkip && self.isConnected && self.client) {
              // Decrement count
              self.client.decr(key).catch((err) => {
                safeLogger.error('Failed to decrement rate limit:', err);
              });
            }

            return originalJson(body);
          };
        }

        next();
      } catch (error) {
        safeLogger.error('Rate limiter error:', error);
        // On error, allow request through (fail open)
        next();
      }
    };
  }

  private defaultKeyGenerator(req: Request): string {
    // Use user ID if authenticated, otherwise IP address
    const userId = (req as any).user?.id || (req as any).user?.walletAddress;
    return userId || req.ip || 'unknown';
  }
}

// Create singleton instance
const rateLimiter = new RedisRateLimiter();

/**
 * Preset rate limit configurations for checkout endpoints
 */
export const checkoutRateLimits = {
  // Standard checkout operations - 20 requests per 15 minutes
  standard: rateLimiter.createMiddleware({
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
    message: 'Too many checkout requests. Please wait before trying again.'
  }),

  // Session creation - 10 per 15 minutes (prevent session spam)
  createSession: rateLimiter.createMiddleware({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: 'Too many session creation requests. Please wait before creating another session.'
  }),

  // Payment processing - 5 per 15 minutes (critical operation)
  processPayment: rateLimiter.createMiddleware({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many payment attempts. Please wait before trying again.',
    skipSuccessfulRequests: true // Only count failed attempts
  }),

  // Discount code validation - 30 per 15 minutes
  validateDiscount: rateLimiter.createMiddleware({
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
    message: 'Too many discount code attempts. Please wait before trying again.'
  }),

  // Tax calculation - 50 per 15 minutes
  calculateTax: rateLimiter.createMiddleware({
    windowMs: 15 * 60 * 1000,
    maxRequests: 50,
    message: 'Too many tax calculation requests.'
  }),

  // Address validation - 40 per 15 minutes
  validateAddress: rateLimiter.createMiddleware({
    windowMs: 15 * 60 * 1000,
    maxRequests: 40,
    message: 'Too many address validation requests.'
  })
};

/**
 * Custom rate limit for specific use cases
 */
export function createCustomRateLimit(config: RateLimitConfig) {
  return rateLimiter.createMiddleware(config);
}

export { rateLimiter };

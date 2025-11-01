/**
 * Comprehensive Rate Limiting Service
 * Implements rate limiting for API endpoints and user actions with abuse prevention
 */

import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import rateLimit from 'express-rate-limit';
import { safeLogger } from '../utils/safeLogger';
import RedisStore from 'rate-limit-redis';
import { safeLogger } from '../utils/safeLogger';
import Redis from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { securityConfig } from '../config/securityConfig';
import { safeLogger } from '../utils/safeLogger';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

export interface UserActionLimits {
  posts: { max: number; windowMs: number };
  comments: { max: number; windowMs: number };
  reactions: { max: number; windowMs: number };
  messages: { max: number; windowMs: number };
  follows: { max: number; windowMs: number };
  reports: { max: number; windowMs: number };
}

export interface IPBasedLimits {
  registration: { max: number; windowMs: number };
  login: { max: number; windowMs: number };
  passwordReset: { max: number; windowMs: number };
  apiCalls: { max: number; windowMs: number };
}

export class RateLimitingService {
  private static redis: Redis;
  private static store: RedisStore;

  // Default rate limits
  private static readonly DEFAULT_USER_LIMITS: UserActionLimits = {
    posts: { max: 10, windowMs: 60 * 60 * 1000 }, // 10 posts per hour
    comments: { max: 50, windowMs: 60 * 60 * 1000 }, // 50 comments per hour
    reactions: { max: 200, windowMs: 60 * 60 * 1000 }, // 200 reactions per hour
    messages: { max: 100, windowMs: 60 * 60 * 1000 }, // 100 messages per hour
    follows: { max: 20, windowMs: 60 * 60 * 1000 }, // 20 follows per hour
    reports: { max: 5, windowMs: 60 * 60 * 1000 } // 5 reports per hour
  };

  private static readonly DEFAULT_IP_LIMITS: IPBasedLimits = {
    registration: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 registrations per hour per IP
    login: { max: 10, windowMs: 15 * 60 * 1000 }, // 10 login attempts per 15 minutes per IP
    passwordReset: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 password resets per hour per IP
    apiCalls: { max: 1000, windowMs: 60 * 60 * 1000 } // 1000 API calls per hour per IP
  };

  /**
   * Initialize Redis connection for rate limiting
   */
  static initialize(): void {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_RATE_LIMIT_DB || '1'),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.store = new RedisStore({
        sendCommand: (...args: string[]) => this.redis.call(...args)
      });

      safeLogger.info('Rate limiting service initialized with Redis store');
    } catch (error) {
      safeLogger.warn('Redis not available for rate limiting, using memory store:', error);
      this.store = undefined as any; // Will use default memory store
    }
  }

  /**
   * Create general API rate limiter
   */
  static createAPIRateLimit(config?: Partial<RateLimitConfig>) {
    const defaultConfig: RateLimitConfig = {
      windowMs: securityConfig.rateLimiting.windowMs,
      max: securityConfig.rateLimiting.apiMaxRequests,
      message: {
        success: false,
        error: 'Too many API requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(securityConfig.rateLimiting.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) => {
        // Use user ID if authenticated, otherwise IP
        return (req as any).user?.id || req.ip;
      }
    };

    return rateLimit({
      ...defaultConfig,
      ...config,
      store: this.store,
      onLimitReached: (req: Request, res: Response) => {
        safeLogger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          userId: (req as any).user?.id,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Create authentication rate limiter
   */
  static createAuthRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: securityConfig.rateLimiting.authMaxAttempts,
      message: {
        success: false,
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: 900 // 15 minutes
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.store,
      keyGenerator: (req: Request) => `auth:${req.ip}`,
      skipSuccessfulRequests: true,
      onLimitReached: (req: Request, res: Response) => {
        safeLogger.warn(`Authentication rate limit exceeded for ${req.ip}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Create user action rate limiter
   */
  static createUserActionRateLimit(action: keyof UserActionLimits) {
    const limits = this.DEFAULT_USER_LIMITS[action];
    
    return rateLimit({
      windowMs: limits.windowMs,
      max: limits.max,
      message: {
        success: false,
        error: `Too many ${action} actions`,
        code: 'USER_ACTION_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(limits.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.store,
      keyGenerator: (req: Request) => {
        const userId = (req as any).user?.id;
        if (!userId) {
          throw new Error('User action rate limiting requires authentication');
        }
        return `user:${userId}:${action}`;
      },
      skip: (req: Request) => {
        // Skip rate limiting for authenticated users with special privileges
        const user = (req as any).user;
        return user?.role === 'admin' || user?.role === 'moderator';
      },
      onLimitReached: (req: Request, res: Response) => {
        const userId = (req as any).user?.id;
        safeLogger.warn(`User action rate limit exceeded for ${action}`, {
          userId,
          action,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Create IP-based rate limiter
   */
  static createIPRateLimit(limitType: keyof IPBasedLimits) {
    const limits = this.DEFAULT_IP_LIMITS[limitType];
    
    return rateLimit({
      windowMs: limits.windowMs,
      max: limits.max,
      message: {
        success: false,
        error: `Too many ${limitType} attempts from this IP`,
        code: 'IP_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(limits.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.store,
      keyGenerator: (req: Request) => `ip:${req.ip}:${limitType}`,
      onLimitReached: (req: Request, res: Response) => {
        safeLogger.warn(`IP rate limit exceeded for ${limitType}`, {
          ip: req.ip,
          limitType,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Create dynamic rate limiter based on user reputation
   */
  static createReputationBasedRateLimit(action: keyof UserActionLimits) {
    const baseLimits = this.DEFAULT_USER_LIMITS[action];
    
    return rateLimit({
      windowMs: baseLimits.windowMs,
      max: (req: Request) => {
        const user = (req as any).user;
        if (!user) return 1; // Very restrictive for unauthenticated users
        
        // Adjust limits based on user reputation
        const reputation = user.reputation || 0;
        let multiplier = 1;
        
        if (reputation >= 1000) multiplier = 2; // High reputation users get 2x limit
        else if (reputation >= 500) multiplier = 1.5; // Medium reputation users get 1.5x limit
        else if (reputation < 0) multiplier = 0.5; // Low reputation users get 0.5x limit
        
        return Math.floor(baseLimits.max * multiplier);
      },
      message: {
        success: false,
        error: `Rate limit exceeded for ${action}`,
        code: 'REPUTATION_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.store,
      keyGenerator: (req: Request) => {
        const userId = (req as any).user?.id;
        return userId ? `reputation:${userId}:${action}` : `ip:${req.ip}:${action}`;
      }
    });
  }

  /**
   * Create sliding window rate limiter for burst protection
   */
  static createSlidingWindowRateLimit(config: {
    windowMs: number;
    max: number;
    burstMax: number;
    burstWindowMs: number;
  }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = `sliding:${req.ip}:${req.path}`;
      const now = Date.now();
      
      try {
        // Check burst limit (short window)
        const burstKey = `${key}:burst`;
        const burstCount = await this.redis.incr(burstKey);
        
        if (burstCount === 1) {
          await this.redis.pexpire(burstKey, config.burstWindowMs);
        }
        
        if (burstCount > config.burstMax) {
          res.status(429).json({
            success: false,
            error: 'Burst rate limit exceeded',
            code: 'BURST_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(config.burstWindowMs / 1000)
          });
          return;
        }
        
        // Check sliding window limit
        const windowKey = `${key}:window`;
        const windowCount = await this.redis.incr(windowKey);
        
        if (windowCount === 1) {
          await this.redis.pexpire(windowKey, config.windowMs);
        }
        
        if (windowCount > config.max) {
          res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            code: 'SLIDING_WINDOW_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(config.windowMs / 1000)
          });
          return;
        }
        
        next();
      } catch (error) {
        safeLogger.error('Sliding window rate limit error:', error);
        // Fail open - allow request if Redis is down
        next();
      }
    };
  }

  /**
   * Check if IP is in whitelist
   */
  static isWhitelisted(ip: string): boolean {
    const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
    return whitelist.includes(ip);
  }

  /**
   * Check if IP is in blacklist
   */
  static isBlacklisted(ip: string): boolean {
    const blacklist = process.env.RATE_LIMIT_BLACKLIST?.split(',') || [];
    return blacklist.includes(ip);
  }

  /**
   * Create smart rate limiter with whitelist/blacklist support
   */
  static createSmartRateLimit(config: RateLimitConfig) {
    return rateLimit({
      ...config,
      store: this.store,
      skip: (req: Request) => {
        // Skip if whitelisted
        if (this.isWhitelisted(req.ip)) {
          return true;
        }
        
        // Apply custom skip logic if provided
        if (config.skip && config.skip(req)) {
          return true;
        }
        
        return false;
      },
      keyGenerator: (req: Request) => {
        // Block immediately if blacklisted
        if (this.isBlacklisted(req.ip)) {
          throw new Error('IP is blacklisted');
        }
        
        // Use custom key generator if provided
        if (config.keyGenerator) {
          return config.keyGenerator(req);
        }
        
        return req.ip;
      }
    });
  }

  /**
   * Get current rate limit status for a key
   */
  static async getRateLimitStatus(key: string): Promise<{
    totalHits: number;
    totalTime: number;
    remainingPoints: number;
    msBeforeNext: number;
  } | null> {
    try {
      if (!this.redis) return null;
      
      const result = await this.redis.get(key);
      if (!result) return null;
      
      const data = JSON.parse(result);
      return data;
    } catch (error) {
      safeLogger.error('Error getting rate limit status:', error);
      return null;
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  static async resetRateLimit(key: string): Promise<boolean> {
    try {
      if (!this.redis) return false;
      
      await this.redis.del(key);
      return true;
    } catch (error) {
      safeLogger.error('Error resetting rate limit:', error);
      return false;
    }
  }

  /**
   * Get rate limit statistics
   */
  static async getRateLimitStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    topLimitedIPs: Array<{ ip: string; hits: number }>;
  }> {
    try {
      if (!this.redis) {
        return { totalKeys: 0, activeKeys: 0, topLimitedIPs: [] };
      }
      
      const keys = await this.redis.keys('rl:*');
      const activeKeys = keys.length;
      
      // Get top limited IPs (simplified)
      const ipKeys = keys.filter(key => key.includes(':ip:'));
      const topLimitedIPs: Array<{ ip: string; hits: number }> = [];
      
      for (const key of ipKeys.slice(0, 10)) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const parsed = JSON.parse(data);
            const ip = key.split(':')[2];
            topLimitedIPs.push({ ip, hits: parsed.totalHits || 0 });
          }
        } catch (error) {
          // Skip invalid entries
        }
      }
      
      topLimitedIPs.sort((a, b) => b.hits - a.hits);
      
      return {
        totalKeys: keys.length,
        activeKeys,
        topLimitedIPs: topLimitedIPs.slice(0, 5)
      };
    } catch (error) {
      safeLogger.error('Error getting rate limit stats:', error);
      return { totalKeys: 0, activeKeys: 0, topLimitedIPs: [] };
    }
  }

  /**
   * Cleanup expired rate limit entries
   */
  static async cleanup(): Promise<number> {
    try {
      if (!this.redis) return 0;
      
      const keys = await this.redis.keys('rl:*');
      let cleaned = 0;
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          // Key exists but has no expiration, set a default expiration
          await this.redis.expire(key, 3600); // 1 hour
          cleaned++;
        }
      }
      
      return cleaned;
    } catch (error) {
      safeLogger.error('Error during rate limit cleanup:', error);
      return 0;
    }
  }
}

export default RateLimitingService;
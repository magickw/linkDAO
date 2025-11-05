import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
  tier?: 'free' | 'premium' | 'enterprise';
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface UserTier {
  tier: 'free' | 'premium' | 'enterprise';
  limits: {
    api: number;
    feed: number;
    websocket: number;
  };
}

export class IntelligentRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private userTiers: Map<string, UserTier> = new Map();

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // Initialize default user tiers
    this.initializeDefaultTiers();
  }

  private initializeDefaultTiers() {
    // Default tier limits (requests per minute)
    const defaultTiers: Record<string, UserTier> = {
      free: {
        tier: 'free',
        limits: {
          api: 60,      // 60 requests per minute
          feed: 30,     // 30 feed requests per minute
          websocket: 100 // 100 websocket events per minute
        }
      },
      premium: {
        tier: 'premium',
        limits: {
          api: 300,     // 300 requests per minute
          feed: 150,    // 150 feed requests per minute
          websocket: 500 // 500 websocket events per minute
        }
      },
      enterprise: {
        tier: 'enterprise',
        limits: {
          api: 1000,    // 1000 requests per minute
          feed: 500,    // 500 feed requests per minute
          websocket: 2000 // 2000 websocket events per minute
        }
      }
    };

    // Set default tiers for common IPs/users
    Object.entries(defaultTiers).forEach(([tier, config]) => {
      this.userTiers.set(tier, config);
    });
  }

  private cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      safeLogger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  private getUserTier(req: Request): UserTier {
    // Check if user is authenticated and has a specific tier
    const user = (req as any).user;
    if (user?.tier) {
      return this.userTiers.get(user.tier) || this.userTiers.get('free')!;
    }

    // Check for API key tier
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      // In a real implementation, you'd look up the API key tier from database
      return this.userTiers.get('premium')!;
    }

    // Default to free tier
    return this.userTiers.get('free')!;
  }

  private getKeyFromRequest(req: Request, keyGenerator?: (req: Request) => string): string {
    if (keyGenerator) {
      return keyGenerator(req);
    }

    // Use user wallet address if authenticated
    const user = (req as any).user;
    if (user?.walletAddress) {
      return `user:${user.walletAddress}`;
    }

    // Fall back to IP address
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  private isExternalAPIRequest(req: Request): boolean {
    const userAgent = req.get('User-Agent') || '';
    const referer = req.get('Referer') || '';
    
    // Check if request is from external services
    const externalIndicators = [
      'bot', 'crawler', 'spider', 'scraper',
      'curl', 'wget', 'postman', 'insomnia'
    ];

    return externalIndicators.some(indicator => 
      userAgent.toLowerCase().includes(indicator)
    ) || !referer.includes('linkdao.io');
  }

  public createRateLimit(config: RateLimitConfig) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.getKeyFromRequest(req, config.keyGenerator);
        const now = Date.now();
        const windowMs = config.windowMs;
        
        // Get user tier and adjust limits accordingly
        const userTier = this.getUserTier(req);
        let maxRequests = config.maxRequests;

        // Apply tier-based multipliers
        if (userTier.tier === 'premium') {
          maxRequests = Math.floor(maxRequests * 2);
        } else if (userTier.tier === 'enterprise') {
          maxRequests = Math.floor(maxRequests * 5);
        }

        // Reduce limits for external API requests
        if (this.isExternalAPIRequest(req)) {
          maxRequests = Math.floor(maxRequests * 0.5);
        }

        // Get or create rate limit entry
        let entry = this.store.get(key);
        
        if (!entry || now > entry.resetTime) {
          // Create new entry or reset expired one
          entry = {
            count: 0,
            resetTime: now + windowMs,
            firstRequest: now
          };
          this.store.set(key, entry);
        }

        // Check if request should be counted
        const shouldCount = !config.skipSuccessfulRequests && !config.skipFailedRequests;
        
        if (shouldCount) {
          entry.count++;
        }

        // Set rate limit headers
        const remaining = Math.max(0, maxRequests - entry.count);
        const resetTime = Math.ceil(entry.resetTime / 1000);

        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTime.toString(),
          'X-RateLimit-Window': windowMs.toString(),
          'X-RateLimit-Tier': userTier.tier
        });

        // Check if limit exceeded
        if (entry.count > maxRequests) {
          const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
          
          res.set('Retry-After', retryAfter.toString());

          if (config.onLimitReached) {
            config.onLimitReached(req, res);
          } else {
            res.status(429).json({
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Too many requests. Limit: ${maxRequests} per ${Math.floor(windowMs / 1000)}s`,
                retryAfter,
                tier: userTier.tier,
                upgradeMessage: userTier.tier === 'free' ? 'Upgrade to premium for higher limits' : undefined
              }
            });
          }
          return;
        }

        next();
      } catch (error) {
        safeLogger.error('Rate limiting error:', error);
        // Don't block requests on rate limiter errors
        next();
      }
    };
  }

  // Predefined rate limiters for common use cases
  public apiRateLimit = this.createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (req) => this.getKeyFromRequest(req)
  });

  public feedRateLimit = this.createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
    keyGenerator: (req) => `feed:${this.getKeyFromRequest(req)}`
  });

  public authRateLimit = this.createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    keyGenerator: (req) => `auth:${this.getKeyFromRequest(req)}`
  });

  public strictRateLimit = this.createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    keyGenerator: (req) => this.getKeyFromRequest(req)
  });

  // Method to upgrade user tier
  public upgradeUserTier(identifier: string, tier: 'free' | 'premium' | 'enterprise') {
    const tierConfig = this.userTiers.get(tier);
    if (tierConfig) {
      this.userTiers.set(identifier, tierConfig);
      safeLogger.info(`Upgraded user ${identifier} to ${tier} tier`);
    }
  }

  // Method to get current stats
  public getStats() {
    return {
      totalEntries: this.store.size,
      userTiers: this.userTiers.size,
      memoryUsage: process.memoryUsage()
    };
  }

  // Graceful shutdown
  public shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
    this.userTiers.clear();
  }
}

// Create singleton instance
export const intelligentRateLimiter = new IntelligentRateLimiter();

// Export commonly used rate limiters
export const apiRateLimit = intelligentRateLimiter.apiRateLimit;
export const feedRateLimit = intelligentRateLimiter.feedRateLimit;
export const authRateLimit = intelligentRateLimiter.authRateLimit;
export const strictRateLimit = intelligentRateLimiter.strictRateLimit;

// Export factory function for custom rate limits
export const createCustomRateLimit = (config: RateLimitConfig) => 
  intelligentRateLimiter.createRateLimit(config);

export default intelligentRateLimiter;
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { cacheService } from '../services/cacheService';
import { alertService } from '../services/alertService';

// Enhanced rate limiting configuration
export interface EnhancedRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response, info: RateLimitInfo) => void;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipIf?: (req: Request) => boolean;
  // Enhanced features
  dynamicLimit?: (req: Request) => number;
  burstLimit?: number;
  burstWindowMs?: number;
  whitelist?: string[];
  blacklist?: string[];
  trustProxy?: boolean;
  alertThreshold?: number; // Alert when usage exceeds this percentage
  blockDuration?: number; // How long to block after limit exceeded
  gracePeriod?: number; // Grace period before blocking
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
  remaining: number;
  blocked?: boolean;
  blockExpiry?: number;
  burstCount?: number;
  burstResetTime?: number;
}

interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  averageUsage: number;
  peakUsage: number;
  topConsumers: Array<{ key: string; count: number; blocked: boolean }>;
}

export class EnhancedRateLimitingService {
  private static instance: EnhancedRateLimitingService;
  private defaultConfig: EnhancedRateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
    burstLimit: 10,
    burstWindowMs: 1000, // 1 second
    alertThreshold: 80, // Alert at 80% usage
    blockDuration: 300000, // 5 minutes
    gracePeriod: 5000, // 5 seconds
    trustProxy: true
  };

  public static getInstance(): EnhancedRateLimitingService {
    if (!EnhancedRateLimitingService.instance) {
      EnhancedRateLimitingService.instance = new EnhancedRateLimitingService();
    }
    return EnhancedRateLimitingService.instance;
  }

  /**
   * Create enhanced rate limiting middleware
   */
  public createRateLimit(config: Partial<EnhancedRateLimitConfig> = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip if condition is met
        if (finalConfig.skipIf && finalConfig.skipIf(req)) {
          return next();
        }

        const key = this.generateKey(req, finalConfig);
        const ip = this.getClientIP(req, finalConfig.trustProxy);

        // Check whitelist/blacklist
        if (finalConfig.whitelist && finalConfig.whitelist.includes(ip)) {
          return next();
        }

        if (finalConfig.blacklist && finalConfig.blacklist.includes(ip)) {
          return this.sendBlockedResponse(res, finalConfig, {
            count: 0,
            resetTime: Date.now() + finalConfig.windowMs,
            remaining: 0,
            blocked: true,
            blockExpiry: Date.now() + (finalConfig.blockDuration || 300000)
          });
        }

        // Check if currently blocked
        const blockInfo = await this.checkBlockStatus(key);
        if (blockInfo.blocked) {
          return this.sendBlockedResponse(res, finalConfig, blockInfo);
        }

        // Get current rate limit status
        const rateLimitInfo = await this.checkRateLimit(key, finalConfig);
        
        // Check burst limit
        const burstInfo = await this.checkBurstLimit(key, finalConfig);
        
        // Determine effective limit (dynamic or static)
        const effectiveLimit = finalConfig.dynamicLimit 
          ? finalConfig.dynamicLimit(req) 
          : finalConfig.maxRequests;

        // Set rate limit headers
        this.setRateLimitHeaders(res, rateLimitInfo, effectiveLimit, finalConfig);

        // Check if limits exceeded
        const limitsExceeded = this.checkLimitsExceeded(rateLimitInfo, burstInfo, effectiveLimit, finalConfig);
        
        if (limitsExceeded.exceeded) {
          // Handle rate limit exceeded
          await this.handleRateLimitExceeded(key, req, res, finalConfig, rateLimitInfo, limitsExceeded.reason);
          return;
        }

        // Check for alert conditions
        await this.checkAlertConditions(key, req, rateLimitInfo, effectiveLimit, finalConfig);

        // Increment counters
        await this.incrementCounters(key, finalConfig, req, res);

        next();
      } catch (error) {
        logger.error('Enhanced rate limiting error:', {
          error: error.message,
          stack: error.stack,
          requestId: res.locals.requestId,
          ip: req.ip,
          url: req.originalUrl
        });
        // Don't block requests if rate limiting fails
        next();
      }
    };
  }

  /**
   * Check current rate limit status
   */
  private async checkRateLimit(key: string, config: EnhancedRateLimitConfig): Promise<RateLimitInfo> {
    const now = Date.now();
    const resetTime = now + config.windowMs;

    try {
      const cacheKey = `rate_limit:${key}`;
      const currentCount = await cacheService.get<number>(cacheKey) || 0;
      const remaining = Math.max(0, config.maxRequests - currentCount);

      return {
        count: currentCount,
        resetTime,
        remaining
      };
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      return {
        count: 0,
        resetTime,
        remaining: config.maxRequests
      };
    }
  }

  /**
   * Check burst limit status
   */
  private async checkBurstLimit(key: string, config: EnhancedRateLimitConfig): Promise<RateLimitInfo> {
    if (!config.burstLimit || !config.burstWindowMs) {
      return { count: 0, resetTime: 0, remaining: config.burstLimit || 0 };
    }

    const now = Date.now();
    const resetTime = now + config.burstWindowMs;

    try {
      const cacheKey = `burst_limit:${key}`;
      const currentCount = await cacheService.get<number>(cacheKey) || 0;
      const remaining = Math.max(0, config.burstLimit - currentCount);

      return {
        count: currentCount,
        resetTime,
        remaining,
        burstCount: currentCount,
        burstResetTime: resetTime
      };
    } catch (error) {
      logger.error('Error checking burst limit:', error);
      return {
        count: 0,
        resetTime,
        remaining: config.burstLimit
      };
    }
  }

  /**
   * Check if currently blocked
   */
  private async checkBlockStatus(key: string): Promise<RateLimitInfo> {
    try {
      const blockKey = `rate_limit_block:${key}`;
      const blockExpiry = await cacheService.get<number>(blockKey);
      
      if (blockExpiry && Date.now() < blockExpiry) {
        return {
          count: 0,
          resetTime: blockExpiry,
          remaining: 0,
          blocked: true,
          blockExpiry
        };
      }

      return {
        count: 0,
        resetTime: 0,
        remaining: 0,
        blocked: false
      };
    } catch (error) {
      logger.error('Error checking block status:', error);
      return {
        count: 0,
        resetTime: 0,
        remaining: 0,
        blocked: false
      };
    }
  }

  /**
   * Check if any limits are exceeded
   */
  private checkLimitsExceeded(
    rateLimitInfo: RateLimitInfo,
    burstInfo: RateLimitInfo,
    effectiveLimit: number,
    config: EnhancedRateLimitConfig
  ): { exceeded: boolean; reason?: string } {
    // Check main rate limit
    if (rateLimitInfo.count >= effectiveLimit) {
      return { exceeded: true, reason: 'rate_limit' };
    }

    // Check burst limit
    if (config.burstLimit && burstInfo.count >= config.burstLimit) {
      return { exceeded: true, reason: 'burst_limit' };
    }

    return { exceeded: false };
  }

  /**
   * Handle rate limit exceeded
   */
  private async handleRateLimitExceeded(
    key: string,
    req: Request,
    res: Response,
    config: EnhancedRateLimitConfig,
    rateLimitInfo: RateLimitInfo,
    reason: string
  ): Promise<void> {
    const now = Date.now();
    const blockDuration = config.blockDuration || 300000; // 5 minutes default
    const blockExpiry = now + blockDuration;

    // Set block if configured
    if (config.blockDuration) {
      const blockKey = `rate_limit_block:${key}`;
      await cacheService.set(blockKey, blockExpiry, Math.ceil(blockDuration / 1000));
    }

    // Log rate limit exceeded
    logger.warn('Rate limit exceeded', {
      key,
      reason,
      ip: this.getClientIP(req, config.trustProxy),
      userAgent: req.get('User-Agent'),
      endpoint: `${req.method} ${req.path}`,
      currentCount: rateLimitInfo.count,
      limit: config.maxRequests,
      blockExpiry: config.blockDuration ? new Date(blockExpiry).toISOString() : undefined,
      requestId: res.locals.requestId
    });

    // Create alert for repeated violations
    await this.createRateLimitAlert(key, req, reason, rateLimitInfo);

    // Send response
    const retryAfter = Math.ceil((rateLimitInfo.resetTime - now) / 1000);
    
    res.set({
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Blocked': config.blockDuration ? 'true' : 'false',
      'X-RateLimit-Block-Expiry': config.blockDuration ? new Date(blockExpiry).toISOString() : undefined
    });

    if (config.onLimitReached) {
      config.onLimitReached(req, res, { ...rateLimitInfo, blocked: true, blockExpiry });
    } else {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: config.message,
          details: {
            limit: config.maxRequests,
            windowMs: config.windowMs,
            retryAfter,
            reason,
            blocked: !!config.blockDuration,
            blockExpiry: config.blockDuration ? new Date(blockExpiry).toISOString() : undefined
          }
        },
        metadata: {
          requestId: res.locals.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Send blocked response
   */
  private sendBlockedResponse(
    res: Response,
    config: EnhancedRateLimitConfig,
    blockInfo: RateLimitInfo
  ): void {
    const retryAfter = blockInfo.blockExpiry 
      ? Math.ceil((blockInfo.blockExpiry - Date.now()) / 1000)
      : 300; // 5 minutes default

    res.set({
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Blocked': 'true',
      'X-RateLimit-Block-Expiry': blockInfo.blockExpiry 
        ? new Date(blockInfo.blockExpiry).toISOString() 
        : undefined
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_BLOCKED',
        message: 'You are temporarily blocked due to rate limit violations',
        details: {
          blocked: true,
          retryAfter,
          blockExpiry: blockInfo.blockExpiry 
            ? new Date(blockInfo.blockExpiry).toISOString() 
            : undefined
        }
      },
      metadata: {
        requestId: res.locals.requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Set rate limit headers
   */
  private setRateLimitHeaders(
    res: Response,
    rateLimitInfo: RateLimitInfo,
    effectiveLimit: number,
    config: EnhancedRateLimitConfig
  ): void {
    if (config.standardHeaders) {
      res.set({
        'RateLimit-Limit': effectiveLimit.toString(),
        'RateLimit-Remaining': Math.max(0, rateLimitInfo.remaining).toString(),
        'RateLimit-Reset': new Date(rateLimitInfo.resetTime).toISOString(),
        'RateLimit-Policy': `${effectiveLimit};w=${Math.floor(config.windowMs / 1000)}`
      });

      // Add burst limit headers if configured
      if (config.burstLimit && rateLimitInfo.burstCount !== undefined) {
        res.set({
          'RateLimit-Burst-Limit': config.burstLimit.toString(),
          'RateLimit-Burst-Remaining': Math.max(0, config.burstLimit - rateLimitInfo.burstCount).toString(),
          'RateLimit-Burst-Reset': rateLimitInfo.burstResetTime 
            ? new Date(rateLimitInfo.burstResetTime).toISOString() 
            : undefined
        });
      }
    }

    if (config.legacyHeaders) {
      res.set({
        'X-RateLimit-Limit': effectiveLimit.toString(),
        'X-RateLimit-Remaining': Math.max(0, rateLimitInfo.remaining).toString(),
        'X-RateLimit-Reset': Math.floor(rateLimitInfo.resetTime / 1000).toString()
      });
    }
  }

  /**
   * Check for alert conditions
   */
  private async checkAlertConditions(
    key: string,
    req: Request,
    rateLimitInfo: RateLimitInfo,
    effectiveLimit: number,
    config: EnhancedRateLimitConfig
  ): Promise<void> {
    if (!config.alertThreshold) return;

    const usagePercentage = (rateLimitInfo.count / effectiveLimit) * 100;
    
    if (usagePercentage >= config.alertThreshold) {
      logger.warn('High rate limit usage detected', {
        key,
        usagePercentage: Math.round(usagePercentage),
        count: rateLimitInfo.count,
        limit: effectiveLimit,
        ip: this.getClientIP(req, config.trustProxy),
        userAgent: req.get('User-Agent'),
        endpoint: `${req.method} ${req.path}`,
        requestId: 'unknown'
      });

      // Create alert if usage is very high
      if (usagePercentage >= 95) {
        await alertService.createAlert(
          'rate_limit_exceeded',
          'High Rate Limit Usage',
          `Rate limit usage at ${Math.round(usagePercentage)}% for ${key}`,
          'api',
          {
            key,
            usagePercentage,
            count: rateLimitInfo.count,
            limit: effectiveLimit,
            ip: this.getClientIP(req, config.trustProxy),
            endpoint: `${req.method} ${req.path}`
          },
          'medium'
        );
      }
    }
  }

  /**
   * Create alert for rate limit violations
   */
  private async createRateLimitAlert(
    key: string,
    req: Request,
    reason: string,
    rateLimitInfo: RateLimitInfo
  ): Promise<void> {
    try {
      // Check if this is a repeated violation
      const violationKey = `rate_limit_violations:${key}`;
      const violations = await cacheService.get<number>(violationKey) || 0;
      await cacheService.set(violationKey, violations + 1, 3600); // Track for 1 hour

      // Alert on repeated violations
      if (violations >= 3) {
        await alertService.createAlert(
          'security_breach',
          'Repeated Rate Limit Violations',
          `Multiple rate limit violations detected for ${key}`,
          'security',
          {
            key,
            violations: violations + 1,
            reason,
            ip: this.getClientIP(req, true),
            userAgent: req.get('User-Agent'),
            endpoint: `${req.method} ${req.path}`,
            count: rateLimitInfo.count
          },
          'high'
        );
      }
    } catch (error) {
      logger.error('Failed to create rate limit alert', { error: error.message });
    }
  }

  /**
   * Increment request counters
   */
  private async incrementCounters(key: string, config: EnhancedRateLimitConfig, req: Request, res: Response): Promise<void> {
    try {
      // Ensure cacheService is properly initialized
      if (!cacheService) {
        logger.warn('Cache service not available for rate limiting');
        return;
      }

      const now = Date.now();
      
      // Increment main counter
      const cacheKey = `rate_limit:${key}`;
      const ttl = Math.ceil(config.windowMs / 1000);
      
      // Ensure cacheService.get returns a valid value
      let currentCount: number | null = null;
      try {
        currentCount = await cacheService.get<number>(cacheKey);
      } catch (error) {
        logger.warn('Failed to get current rate limit count, defaulting to 0:', error);
        currentCount = null;
      }
      
      const count = currentCount !== null ? currentCount : 0;
      await cacheService.set(cacheKey, count + 1, ttl);

      // Increment burst counter if configured
      if (config.burstLimit && config.burstWindowMs) {
        const burstKey = `burst_limit:${key}`;
        const burstTtl = Math.ceil(config.burstWindowMs / 1000);
        
        let burstCount: number | null = null;
        try {
          burstCount = await cacheService.get<number>(burstKey);
        } catch (error) {
          logger.warn('Failed to get current burst count, defaulting to 0:', error);
          burstCount = null;
        }
        
        const bCount = burstCount !== null ? burstCount : 0;
        await cacheService.set(burstKey, bCount + 1, burstTtl);
      }

      // Track statistics
      await this.updateStatistics(key, req);

    } catch (error) {
      logger.error('Error incrementing rate limit counters:', error);
    }
  }

  /**
   * Update rate limiting statistics
   */
  private async updateStatistics(key: string, req: Request): Promise<void> {
    try {
      const statsKey = 'rate_limit_stats';
      const stats = await cacheService.get<RateLimitStats>(statsKey) || {
        totalRequests: 0,
        blockedRequests: 0,
        averageUsage: 0,
        peakUsage: 0,
        topConsumers: []
      };

      stats.totalRequests++;
      
      // Update top consumers
      const existingConsumer = stats.topConsumers.find(c => c.key === key);
      if (existingConsumer) {
        existingConsumer.count++;
      } else {
        stats.topConsumers.push({ key, count: 1, blocked: false });
      }

      // Keep only top 10 consumers
      stats.topConsumers = stats.topConsumers
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      await cacheService.set(statsKey, stats, 3600); // Cache for 1 hour
    } catch (error) {
      logger.error('Error updating rate limit statistics:', error);
    }
  }

  /**
   * Generate cache key for rate limiting
   */
  private generateKey(req: Request, config: EnhancedRateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    const ip = this.getClientIP(req, config.trustProxy);
    const userAgent = req.get('User-Agent') || 'unknown';
    const endpoint = `${req.method}:${req.route?.path || req.path}`;
    const walletAddress = (req as any).walletAddress || '';
    
    return `${ip}:${endpoint}:${walletAddress}`.replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  /**
   * Get client IP address with proxy support
   */
  private getClientIP(req: Request, trustProxy: boolean = true): string {
    if (trustProxy) {
      return req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
             req.get('X-Real-IP') ||
             req.get('X-Client-IP') ||
             req.ip ||
             req.socket.remoteAddress ||
             'unknown';
    }
    
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Get rate limiting statistics
   */
  public async getStatistics(): Promise<RateLimitStats> {
    try {
      const statsKey = 'rate_limit_stats';
      return await cacheService.get<RateLimitStats>(statsKey) || {
        totalRequests: 0,
        blockedRequests: 0,
        averageUsage: 0,
        peakUsage: 0,
        topConsumers: []
      };
    } catch (error) {
      logger.error('Error getting rate limit statistics:', error);
      return {
        totalRequests: 0,
        blockedRequests: 0,
        averageUsage: 0,
        peakUsage: 0,
        topConsumers: []
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  public async resetRateLimit(key: string): Promise<void> {
    try {
      await Promise.all([
        cacheService.invalidate(`rate_limit:${key}`),
        cacheService.invalidate(`burst_limit:${key}`),
        cacheService.invalidate(`rate_limit_block:${key}`),
        cacheService.invalidate(`rate_limit_violations:${key}`)
      ]);
      
      logger.info(`Rate limit reset for key: ${key}`);
    } catch (error) {
      logger.error('Error resetting rate limit:', error);
      throw error;
    }
  }

  /**
   * Block a specific key
   */
  public async blockKey(key: string, durationMs: number = 300000): Promise<void> {
    try {
      const blockKey = `rate_limit_block:${key}`;
      const blockExpiry = Date.now() + durationMs;
      await cacheService.set(blockKey, blockExpiry, Math.ceil(durationMs / 1000));
      
      logger.warn(`Key blocked: ${key} until ${new Date(blockExpiry).toISOString()}`);
    } catch (error) {
      logger.error('Error blocking key:', error);
      throw error;
    }
  }

  /**
   * Unblock a specific key
   */
  public async unblockKey(key: string): Promise<void> {
    try {
      await cacheService.invalidate(`rate_limit_block:${key}`);
      logger.info(`Key unblocked: ${key}`);
    } catch (error) {
      logger.error('Error unblocking key:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const enhancedRateLimitingService = EnhancedRateLimitingService.getInstance();

// Pre-configured enhanced rate limiters
export const enhancedGeneralRateLimit = enhancedRateLimitingService.createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
  burstLimit: 20,
  burstWindowMs: 1000,
  alertThreshold: 80,
  blockDuration: 300000,
  message: 'Too many requests from this IP, please try again later.'
});

export const enhancedAuthRateLimit = enhancedRateLimitingService.createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  burstLimit: 3,
  burstWindowMs: 1000,
  alertThreshold: 70,
  blockDuration: 600000, // 10 minutes
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: (req: Request) => {
    const ip = req.get('X-Forwarded-For')?.split(',')[0]?.trim() || req.ip || 'unknown';
    const walletAddress = req.body?.walletAddress || '';
    return `auth:${ip}:${walletAddress}`;
  }
});

export const enhancedApiRateLimit = enhancedRateLimitingService.createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 500,
  burstLimit: 100,
  burstWindowMs: 1000,
  alertThreshold: 85,
  dynamicLimit: (req: Request) => {
    // Higher limits for authenticated users
    const isAuthenticated = (req as any).user || (req as any).walletAddress;
    return isAuthenticated ? 1000 : 500;
  },
  skipIf: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/ping';
  }
});

// Service is already exported above

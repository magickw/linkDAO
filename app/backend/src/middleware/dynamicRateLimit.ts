import { Request, Response, NextFunction } from 'express';
import { rateLimitingService } from './rateLimitingMiddleware';
import { rateLimitConfigService } from '../services/rateLimitConfigService';
import { logger } from '../utils/logger';

/**
 * Dynamic rate limiting middleware that applies rules based on configuration
 */
export const dynamicRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Find matching rate limit rule
    const rule = rateLimitConfigService.findMatchingRule(req);
    
    if (!rule) {
      // No specific rule found, continue without rate limiting
      return next();
    }

    // Check if request should skip rate limiting
    if (rateLimitConfigService.shouldSkipRateLimit(req, rule)) {
      return next();
    }

    // Apply tier-based adjustments if user tier is available
    const userTier = (req as any).userTier || 'FREE';
    const adjustedRule = rateLimitConfigService.applyTierAdjustments(rule, userTier);

    // Create rate limiter with the rule configuration
    const rateLimiter = rateLimitingService.createRateLimit({
      windowMs: adjustedRule.windowMs,
      maxRequests: adjustedRule.maxRequests,
      message: adjustedRule.customMessage || 'Rate limit exceeded. Please try again later.',
      keyGenerator: (req: Request) => {
        const ip = req.ip || 'unknown';
        const walletAddress = (req as any).walletAddress || '';
        const endpoint = `${req.method}:${req.route?.path || req.path}`;
        return `${rule.id}:${ip}:${walletAddress}:${endpoint}`.replace(/[^a-zA-Z0-9:_-]/g, '_');
      },
      standardHeaders: true,
      onLimitReached: (req: Request, res: Response) => {
        // Log rate limit violations for monitoring
        logger.warn('Rate limit exceeded', {
          ruleId: rule.id,
          ruleName: rule.name,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: `${req.method} ${req.path}`,
          walletAddress: (req as any).walletAddress,
          userTier,
          limit: adjustedRule.maxRequests,
          window: adjustedRule.windowMs
        });

        // Send structured error response
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: adjustedRule.customMessage || 'Rate limit exceeded. Please try again later.',
            details: {
              rule: rule.name,
              limit: adjustedRule.maxRequests,
              windowMs: adjustedRule.windowMs,
              retryAfter: Math.ceil(adjustedRule.windowMs / 1000)
            }
          },
          metadata: {
            requestId: (req as any).requestId,
            timestamp: new Date().toISOString()
          }
        });
      }
    });

    // Apply the rate limiter
    return rateLimiter(req, res, next);
  } catch (error) {
    logger.error('Dynamic rate limiting error:', error);
    // Don't block requests if rate limiting fails
    next();
  }
};

/**
 * Middleware to extract user tier from request
 */
export const extractUserTier = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract user tier from various sources
    let userTier = 'FREE'; // Default tier

    // Check for tier in headers (for API keys)
    const tierHeader = req.get('X-User-Tier');
    if (tierHeader && ['FREE', 'PREMIUM', 'ENTERPRISE'].includes(tierHeader.toUpperCase())) {
      userTier = tierHeader.toUpperCase();
    }

    // Check for tier in user context (if authenticated)
    if ((req as any).user?.tier) {
      userTier = (req as any).user.tier;
    }

    // Check for tier based on wallet address (could be from database lookup)
    if ((req as any).walletAddress) {
      // This could be enhanced to lookup user tier from database
      // For now, we'll use the default or header value
    }

    // Attach tier to request
    (req as any).userTier = userTier;
    
    next();
  } catch (error) {
    logger.error('Error extracting user tier:', error);
    (req as any).userTier = 'FREE'; // Default to free tier on error
    next();
  }
};

/**
 * Middleware to add rate limit monitoring headers
 */
export const rateLimitMonitoring = (req: Request, res: Response, next: NextFunction) => {
  // Add monitoring headers
  res.set({
    'X-RateLimit-Service': 'marketplace-api',
    'X-RateLimit-Version': '1.0'
  });

  // Track response for rate limit analytics
  const originalSend = res.send;
  res.send = function(data) {
    // Log successful requests for analytics
    if (res.statusCode < 400) {
      logger.debug('Request completed successfully', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userTier: (req as any).userTier,
        walletAddress: (req as any).walletAddress,
        responseTime: Date.now() - (req as any).startTime
      });
    }

    return originalSend.call(this, data);
  };

  // Record request start time
  (req as any).startTime = Date.now();
  
  next();
};

/**
 * Create a custom rate limiter for specific endpoints
 */
export const createEndpointRateLimit = (config: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimitingService.createRateLimit({
    windowMs: config.windowMs,
    maxRequests: config.maxRequests,
    message: config.message || 'Rate limit exceeded for this endpoint.',
    keyGenerator: config.keyGenerator || ((req: Request) => {
      const ip = req.ip || 'unknown';
      const walletAddress = (req as any).walletAddress || '';
      return `custom:${ip}:${walletAddress}`;
    }),
    standardHeaders: true,
    onLimitReached: (req: Request, res: Response) => {
      logger.warn('Custom rate limit exceeded', {
        endpoint: `${req.method} ${req.path}`,
        ip: req.ip,
        walletAddress: (req as any).walletAddress,
        config
      });
    }
  });
};

/**
 * Rate limit bypass for internal services
 */
export const internalServiceBypass = (req: Request, res: Response, next: NextFunction) => {
  const internalToken = req.get('X-Internal-Token');
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;

  if (internalToken && expectedToken && internalToken === expectedToken) {
    // Mark request as internal to bypass rate limiting
    (req as any).isInternalRequest = true;
    res.set('X-Internal-Request', 'true');
  }

  next();
};

/**
 * Emergency rate limit override (for system maintenance)
 */
export const emergencyRateLimitOverride = (req: Request, res: Response, next: NextFunction) => {
  const emergencyMode = process.env.EMERGENCY_RATE_LIMIT_MODE;
  
  if (emergencyMode === 'STRICT') {
    // Apply very strict rate limiting
    const strictLimiter = rateLimitingService.createRateLimit({
      windowMs: 60 * 1000,
      maxRequests: 10,
      message: 'System is under maintenance. Strict rate limiting is in effect.'
    });
    return strictLimiter(req, res, next);
  } else if (emergencyMode === 'DISABLED') {
    // Disable rate limiting entirely
    logger.warn('Rate limiting disabled due to emergency mode');
    return next();
  }

  // Normal operation
  next();
};

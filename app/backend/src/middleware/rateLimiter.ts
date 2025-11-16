import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { safeLogger } from '../utils/safeLogger';
import { Request, Response } from 'express';

// Helper function to check if user is authenticated
const isAuthenticated = (req: Request): boolean => {
  // Check for session or authorization header
  return !!(req.headers.authorization || (req as any).session?.userId);
};

// General rate limiter for all requests
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased from 1000 to 2000 for better UX
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    safeLogger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Stricter rate limiter for API endpoints - with authentication-aware limits
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // Authenticated users get higher limits
    return isAuthenticated(req) ? 1500 : 500;
  },
  message: {
    error: 'API rate limit exceeded',
    message: 'Too many API requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
  handler: (req: Request, res: Response) => {
    safeLogger.warn(`API rate limit exceeded for IP: ${req.ip}, Path: ${req.path}, Authenticated: ${isAuthenticated(req)}`);
    res.status(429).json({
      error: 'API rate limit exceeded',
      message: 'Too many API requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// More lenient rate limiter for feed endpoints - increased for authenticated users
export const feedLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: (req: Request) => {
    // Authenticated users get much higher limits for profile/feed pages
    return isAuthenticated(req) ? 100 : 30;
  },
  message: {
    error: 'Feed rate limit exceeded',
    message: 'Too many feed requests, please try again in a minute.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // keyGenerator: ipKeyGenerator, // Removed to fix compilation error
  handler: (req: Request, res: Response) => {
    safeLogger.warn(`Feed rate limit exceeded for IP: ${req.ip}, User: ${req.query.forUser || 'anonymous'}, Authenticated: ${isAuthenticated(req)}`);
    res.status(429).json({
      error: 'Feed rate limit exceeded',
      message: 'Too many feed requests, please try again in a minute.',
      retryAfter: '1 minute'
    });
  }
});

// Rate limiter for post creation
export const createPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 post creations per 15 minutes
  message: {
    error: 'Post creation rate limit exceeded',
    message: 'Too many posts created, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    safeLogger.warn(`Post creation rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Post creation rate limit exceeded',
      message: 'Too many posts created, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Generic rate limiter function
export const rateLimiter = (options: { windowMs: number; max: number; message?: string }) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: 'Rate limit exceeded',
      message: options.message || 'Too many requests, please try again later.',
      retryAfter: `${options.windowMs / 60000} minutes`
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      safeLogger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests, please try again later.',
        retryAfter: `${options.windowMs / 60000} minutes`
      });
    }
  });
};
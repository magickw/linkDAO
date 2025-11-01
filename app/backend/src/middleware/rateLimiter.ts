import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { safeLogger } from '../utils/safeLogger';
import { Request, Response } from 'express';

// General rate limiter for all requests
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
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

// Stricter rate limiter for API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 API requests per windowMs
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
    safeLogger.warn(`API rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      error: 'API rate limit exceeded',
      message: 'Too many API requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Very strict rate limiter for feed endpoints to prevent spam
export const feedLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 feed requests per minute
  message: {
    error: 'Feed rate limit exceeded',
    message: 'Too many feed requests, please try again in a minute.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // keyGenerator: ipKeyGenerator, // Removed to fix compilation error
  handler: (req: Request, res: Response) => {
    safeLogger.warn(`Feed rate limit exceeded for IP: ${req.ip}, User: ${req.query.forUser || 'anonymous'}`);
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

import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export function createRateLimiter(windowMs: number = 15 * 60 * 1000, max: number = 100) {
  const store: RateLimitStore = {};

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Clean old entries
    Object.keys(store).forEach(k => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });

    // Initialize or update counter
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      store[key].count++;
    }

    // Check if limit exceeded
    if (store[key].count > max) {
      const resetTime = Math.ceil((store[key].resetTime - now) / 1000);
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': resetTime.toString(),
      });
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded',
        retryAfter: resetTime
      });
      return;
    }

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': (max - store[key].count).toString(),
      'X-RateLimit-Reset': Math.ceil((store[key].resetTime - now) / 1000).toString(),
    });

    next();
  };
}

// Specific rate limiters for different endpoints
export const generalLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
export const feedLimiter = createRateLimiter(60 * 1000, 10); // 10 requests per minute for feed
export const strictLimiter = createRateLimiter(60 * 1000, 5); // 5 requests per minute for sensitive endpoints
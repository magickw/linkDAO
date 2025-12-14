import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';

/**
 * Relaxed rate limiting configuration
 * Temporary fix to prevent legitimate requests from being blocked
 */

// Very permissive rate limiting for emergency fix
export const emergencyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Very high limit
  handler: (req, res) => {
    ApiResponse.tooManyRequests(res, 'Too many requests, please try again later');
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks and critical endpoints
    const skipPaths = ['/health', '/ping', '/status', '/api/health'];
    return skipPaths.some(path => req.path.includes(path));
  },
  keyGenerator: (req: Request) => {
    // Use IP address as key, but be more lenient
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

// API-specific rate limiting (more permissive)
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // High limit for API calls
  handler: (req, res) => {
    ApiResponse.tooManyRequests(res, 'API rate limit exceeded');
  },
  skip: (req: Request) => {
    // Skip for health and auth endpoints
    const skipPaths = ['/health', '/ping', '/status', '/api/health', '/api/auth/kyc'];
    return skipPaths.some(path => req.path.includes(path));
  }
});

// Auth rate limiting (still protective but not too strict)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Reasonable limit for auth attempts
  handler: (req, res) => {
    ApiResponse.tooManyRequests(res, 'Too many authentication attempts');
  }
});

// Disable rate limiting entirely for emergency (use with caution)
export const disableRateLimit = (req: Request, res: Response, next: Function) => {
  // Just pass through without any rate limiting
  next();
};
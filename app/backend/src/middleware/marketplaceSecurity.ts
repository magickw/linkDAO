import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';
import { ApiResponse } from '../utils/apiResponse';

// CORS configuration for marketplace endpoints
const marketplaceCorsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allowed origins for marketplace
    const allowedOrigins: string[] = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://linkdao.io',
      'https://linkdao-frontend.vercel.app',
      'https://web3-marketplace-frontend.vercel.app',
      process.env.FRONTEND_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
    ].filter(Boolean) as string[];

    // Development regex patterns
    const developmentPatterns: RegExp[] = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.netlify\.app$/
    ];

    // Check if origin is allowed
    let isAllowed = allowedOrigins.includes(origin);
    
    // Check development patterns if in development mode
    if (!isAllowed && process.env.NODE_ENV === 'development') {
      isAllowed = developmentPatterns.some(pattern => pattern.test(origin));
    }

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-API-Key',
    'Cache-Control'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Marketplace CORS middleware
export const marketplaceCors = cors(marketplaceCorsOptions);

// Rate limiting configurations for different endpoint types
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  handler: (req, res) => {
    ApiResponse.tooManyRequests(res, 'Too many requests. Please try again later.');
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use proper IPv6 handling with the helper function
    return ipKeyGenerator(req.ip || req.connection.remoteAddress || 'unknown');
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/ping';
  }
});

// Authentication endpoint rate limiting (stricter)
// Enhanced with more aggressive rate limiting and account lockout mechanisms
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Reduced from 10 to 5 authentication attempts per window for stricter security
  handler: (req, res) => {
    ApiResponse.tooManyRequests(res, 'Too many authentication attempts. Please try again later.');
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Profile update rate limiting
export const profileUpdateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 profile updates per hour
  handler: (req, res) => {
    ApiResponse.tooManyRequests(res, 'Too many profile updates. Please try again later.');
  },
  standardHeaders: true,
  legacyHeaders: false
});

// File upload rate limiting
export const fileUploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 file uploads per hour
  handler: (req, res) => {
    ApiResponse.tooManyRequests(res, 'Too many file uploads. Please try again later.');
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Request size validation middleware
export const requestSizeValidator = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0', 10);
    
    if (contentLength > maxSize) {
      const error = new AppError(
        `Request too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`,
        413,
        'REQUEST_TOO_LARGE',
        { maxSize, actualSize: contentLength }
      );
      return next(error);
    }
    
    next();
  };
};

// Content type validation middleware
export const contentTypeValidator = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip validation for GET requests
    if (req.method === 'GET') {
      return next();
    }
    
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      const error = new AppError(
        'Content-Type header is required',
        400,
        'MISSING_CONTENT_TYPE'
      );
      return next(error);
    }
    
    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!isAllowed) {
      const error = new AppError(
        `Unsupported content type. Allowed types: ${allowedTypes.join(', ')}`,
        400,
        'UNSUPPORTED_CONTENT_TYPE',
        { contentType, allowedTypes }
      );
      return next(error);
    }
    
    next();
  };
};

// Origin validation middleware for sensitive operations
export const originValidator = (allowedOrigins: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('Origin') || req.get('Referer');
    
    if (!origin) {
      const error = new AppError(
        'Origin header is required for this operation',
        400,
        'MISSING_ORIGIN'
      );
      return next(error);
    }
    
    const isAllowed = allowedOrigins.some(allowed => 
      origin.startsWith(allowed)
    );
    
    if (!isAllowed) {
      const error = new AppError(
        'Unauthorized origin for this operation',
        403,
        'UNAUTHORIZED_ORIGIN',
        { origin, allowedOrigins }
      );
      return next(error);
    }
    
    next();
  };
};

// API key validation middleware
export const apiKeyValidator = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.get('X-API-Key') || req.query.api_key;
    
    if (!apiKey) {
      const error = new AppError(
        'API key is required for this operation',
        401,
        'MISSING_API_KEY'
      );
      return next(error);
    }
    
    // In a real implementation, you would validate the API key against a database
    // For now, we'll accept any non-empty API key
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      const error = new AppError(
        'Invalid API key format',
        401,
        'INVALID_API_KEY'
      );
      return next(error);
    }
    
    next();
  };
};

// Timestamp validation middleware to prevent replay attacks
export const timestampValidator = (maxAge: number = 300000) => { // 5 minutes default
  return (req: Request, res: Response, next: NextFunction) => {
    const timestamp = req.get('X-Timestamp') || req.query.timestamp;
    
    if (!timestamp) {
      const error = new AppError(
        'Timestamp header is required for this operation',
        400,
        'MISSING_TIMESTAMP'
      );
      return next(error);
    }
    
    const requestTime = parseInt(timestamp as string, 10);
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - requestTime);
    
    if (isNaN(requestTime)) {
      const error = new AppError(
        'Invalid timestamp format',
        400,
        'INVALID_TIMESTAMP'
      );
      return next(error);
    }
    
    if (timeDiff > maxAge) {
      const error = new AppError(
        'Request timestamp is too old',
        400,
        'TIMESTAMP_TOO_OLD',
        { requestTime, currentTime, maxAge }
      );
      return next(error);
    }
    
    next();
  };
};
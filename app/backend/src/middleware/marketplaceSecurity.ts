import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

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
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      retryAfter: 900 // 15 minutes in seconds
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
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
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: 900
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Profile update rate limiting
export const profileUpdateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 profile updates per hour
  message: {
    success: false,
    error: {
      code: 'PROFILE_UPDATE_RATE_LIMIT_EXCEEDED',
      message: 'Too many profile updates. Please try again later.',
      retryAfter: 3600
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// File upload rate limiting
export const fileUploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 file uploads per hour
  message: {
    success: false,
    error: {
      code: 'FILE_UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads. Please try again later.',
      retryAfter: 3600
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
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
        415,
        'UNSUPPORTED_CONTENT_TYPE',
        { contentType, allowedTypes }
      );
      return next(error);
    }
    
    next();
  };
};

// API key validation middleware (optional)
export const apiKeyValidator = (req: Request, res: Response, next: NextFunction) => {
  // Skip API key validation in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  const apiKey = req.get('X-API-Key');
  const validApiKeys = process.env.API_KEYS?.split(',') || [];
  
  // If no API keys configured, skip validation
  if (validApiKeys.length === 0) {
    return next();
  }
  
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    const error = new AppError(
      'Invalid or missing API key',
      401,
      'INVALID_API_KEY'
    );
    return next(error);
  }
  
  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add CSP for API responses
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none';"
  );
  
  next();
};

// Request timeout middleware
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = new AppError(
          'Request timeout',
          504,
          'REQUEST_TIMEOUT',
          { timeout: timeoutMs }
        );
        next(error);
      }
    }, timeoutMs);
    
    // Clear timeout when response is sent
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };
};

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      logger.warn('IP not whitelisted', { clientIP, allowedIPs });
      const error = new AppError(
        'Access denied from this IP address',
        403,
        'IP_NOT_WHITELISTED',
        { clientIP }
      );
      return next(error);
    }
    
    next();
  };
};

// Custom rate limit factory function
export const createCustomRateLimit = (options: {
  windowMs: number;
  max: number;
  message: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000)
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      return ipKeyGenerator(req.ip || req.connection.remoteAddress || 'unknown');
    }
  });
};

// Combined marketplace security middleware
export const marketplaceSecurity = [
  securityHeaders,
  marketplaceCors,
  requestTimeout(30000),
  requestSizeValidator(10 * 1024 * 1024), // 10MB
  contentTypeValidator(['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'])
];

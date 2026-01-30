import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { ApiResponse } from '../utils/apiResponse';
import helmet from 'helmet';

// Security Headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL || "http://localhost:3001"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// CSRF Protection (using custom implementation)
// This middleware only does origin checking for non-API routes
// API routes use the dedicated csrfProtection middleware
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for API routes - they use the dedicated CSRF middleware
  if (req.path.startsWith('/api/')) {
    console.log(`[CSRF] Skipping origin check for API route: ${req.method} ${req.path}`);
    return next();
  }
  console.log(`[CSRF] Checking origin for non-API route: ${req.method} ${req.path}`);
  
  // For state-changing operations, verify origin/referer
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.origin || req.headers.referer;
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://www.linkdao.io',
      'https://linkdao.io',
      'https://linkdao.vercel.app',
      'http://localhost:3000',
      'http://localhost:10000'
    ].filter(Boolean);

    if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed!))) {
      return ApiResponse.forbidden(res, 'CSRF validation failed');
    }
  }
  next();
};

// Request Size Limits
export const requestSizeLimits = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const MAX_SIZE = 1024 * 1024; // 1MB

  if (contentLength > MAX_SIZE) {
    return ApiResponse.serverError(res, 'Request too large');
  }

  next();
};

// Content-Type Validation
export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];

    // Log for debugging repost requests
    if (req.path.includes('repost')) {
      console.log(`[CONTENT-TYPE-DEBUG] Repost request content-type: "${contentType}"`);
    }

    // Allow JSON, form-data, and urlencoded
    // Also allow anything with 'json' in it (e.g., application/json;charset=utf-8)
    const validTypes = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded', 'json'];

    // If there's no Content-Type header, allow it (modern clients usually send it, but be lenient)
    if (!contentType) {
      if (req.path.includes('repost')) {
        console.log(`[CONTENT-TYPE-DEBUG] No Content-Type header - allowing`);
      }
      return next();
    }

    // Check if content-type matches any valid type
    if (!validTypes.some(type => contentType.toLowerCase().includes(type))) {
      console.log(`[CONTENT-TYPE-VALIDATION] BLOCKED: Invalid Content-Type "${contentType}" for ${req.method} ${req.path}`);
      console.log(`[CONTENT-TYPE-VALIDATION] Valid types are: ${validTypes.join(', ')}`);
      return ApiResponse.serverError(res, 'Invalid Content-Type');
    }
  }
  next();
};

// Hide Server Info
export const hideServerInfo = (req: Request, res: Response, next: NextFunction) => {
  res.removeHeader('X-Powered-By');
  next();
};

// Security Logging
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const securityEvents = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/users/*/role',
    '/api/admin/*'
  ];

  const shouldLog = securityEvents.some(pattern => {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(req.path);
  });

  if (shouldLog) {
    safeLogger.info('[SECURITY]', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
  }

  next();
};

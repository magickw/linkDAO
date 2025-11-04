import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
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
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for API routes - they use JWT authentication
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
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
      return res.status(403).json({ 
        success: false, 
        message: 'CSRF validation failed' 
      });
    }
  }
  next();
};

// Request Size Limits
export const requestSizeLimits = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const MAX_SIZE = 1024 * 1024; // 1MB

  if (contentLength > MAX_SIZE) {
    return res.status(413).json({ 
      success: false, 
      message: 'Request too large' 
    });
  }

  next();
};

// Content-Type Validation
export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];
    // Allow JSON, form-data, and urlencoded
    const validTypes = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'];
    if (contentType && !validTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({ 
        success: false, 
        message: 'Invalid Content-Type' 
      });
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

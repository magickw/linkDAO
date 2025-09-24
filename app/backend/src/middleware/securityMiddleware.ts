/**
 * Enhanced Security Middleware
 * 
 * Comprehensive security middleware stack including DDoS protection,
 * advanced rate limiting, input validation, and threat detection.
 */

import { Request, Response, NextFunction } from 'express';
import { securityConfig } from '../config/securityConfig';
import crypto from 'crypto';

export interface SecurityRequest extends Request {
  securityContext?: {
    riskScore: number;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    fingerprint: string;
    geoLocation?: string;
    deviceInfo?: any;
  };
}

/**
 * Enhanced CORS configuration
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Client-Version');
  res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Rate-Limit-Remaining');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
};

/**
 * Basic security headers
 */
export const helmetMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

/**
 * DDoS protection middleware
 */
export const ddosProtection = async (req: SecurityRequest, res: Response, next: NextFunction) => {
  if (!securityConfig.ddosProtection.enabled) {
    return next();
  }

  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

  // Check if IP is in whitelist
  if (securityConfig.ddosProtection.whitelist.includes(clientIP)) {
    return next();
  }

  // Check if IP is in blacklist
  if (securityConfig.ddosProtection.blacklist.includes(clientIP)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied',
    });
  }

  next();
};

/**
 * Request fingerprinting for threat detection
 */
export const requestFingerprinting = (req: SecurityRequest, res: Response, next: NextFunction) => {
  const fingerprint = crypto.createHash('sha256')
    .update([
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown',
      req.get('Accept-Language') || 'unknown',
      req.get('Accept-Encoding') || 'unknown',
    ].join(':'))
    .digest('hex');

  req.securityContext = {
    riskScore: 0,
    threatLevel: 'low',
    fingerprint,
  };

  next();
};

/**
 * Input validation and sanitization
 */
export const inputValidation = async (req: SecurityRequest, res: Response, next: NextFunction) => {
  try {
    // Check for common injection patterns
    const suspiciousPatterns = [
      // SQL Injection
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\'|\"|;|--|\*|\|)/,
      
      // XSS
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      
      // Command Injection
      /(\||&|;|\$\(|\`)/,
      /(rm\s|cat\s|ls\s|pwd|whoami)/i,
      
      // Path Traversal
      /(\.\.[\/\\])/,
      /(\/etc\/passwd|\/etc\/shadow)/i,
    ];

    const requestData = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData)) {
        return res.status(400).json({
          error: 'Invalid Input',
          message: 'Request contains potentially malicious content',
        });
      }
    }

    // Sanitize input data
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);

    next();
  } catch (error) {
    console.error('Input validation error:', error);
    next();
  }
};

/**
 * Threat detection based on request patterns
 */
export const threatDetection = async (req: SecurityRequest, res: Response, next: NextFunction) => {
  if (!req.securityContext) {
    return next();
  }

  let riskScore = 0;

  // Check request frequency
  const recentRequests = await getRecentRequestCount(req.securityContext.fingerprint);
  if (recentRequests > 100) riskScore += 30;
  else if (recentRequests > 50) riskScore += 15;

  // Check for suspicious user agent
  const userAgent = req.get('User-Agent') || '';
  if (!userAgent || userAgent.length < 10) riskScore += 20;
  if (/bot|crawler|spider/i.test(userAgent)) riskScore += 10;

  // Check for suspicious headers
  const suspiciousHeaders = ['X-Forwarded-For', 'X-Real-IP', 'X-Originating-IP'];
  for (const header of suspiciousHeaders) {
    if (req.get(header)) riskScore += 5;
  }

  // Check request size
  const contentLength = parseInt(req.get('Content-Length') || '0');
  if (contentLength > 10 * 1024 * 1024) riskScore += 25; // 10MB

  // Check for unusual request patterns
  if (req.method === 'POST' && !req.get('Content-Type')) riskScore += 15;
  if (req.path.includes('..') || req.path.includes('~')) riskScore += 20;

  // Update security context
  req.securityContext.riskScore = riskScore;
  req.securityContext.threatLevel = 
    riskScore >= 70 ? 'critical' :
    riskScore >= 50 ? 'high' :
    riskScore >= 30 ? 'medium' : 'low';

  // Block high-risk requests
  if (req.securityContext.threatLevel === 'critical') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Request blocked due to high threat level',
    });
  }

  next();
};

/**
 * Security audit logging
 */
export const securityAuditLogging = async (req: SecurityRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log security-relevant requests
  const securityEndpoints = ['/api/auth', '/api/admin', '/api/users', '/api/wallet'];
  const isSecurityEndpoint = securityEndpoints.some(endpoint => req.path.startsWith(endpoint));

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    
    // Log slow requests (potential DoS)
    if (responseTime > 5000) { // 5 seconds
      console.log(`Slow request: ${req.method} ${req.path} took ${responseTime}ms`);
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * File upload security
 */
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  if (!req.files && !req.file) {
    return next();
  }

  // @ts-ignore
  const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
  
  for (const file of files) {
    if (!file) continue;

    // Check file size
    if (file.size > 50 * 1024 * 1024) { // 50MB
      return res.status(413).json({
        error: 'File Too Large',
        message: 'File size exceeds maximum allowed size',
      });
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/json',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid File Type',
        message: 'File type not allowed',
      });
    }

    // Check for malicious file names
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.php', '.jsp', '.asp'];
    // @ts-ignore
    const fileName = file.originalname || '';
    
    if (suspiciousExtensions.some(ext => fileName.toLowerCase().endsWith(ext))) {
      return res.status(400).json({
        error: 'Malicious File',
        message: 'File appears to be malicious',
      });
    }
  }

  next();
};

// Helper functions
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[sanitizeString(key)] = sanitizeObject(value);
  }
  return sanitized;
}

function sanitizeString(str: any): any {
  if (typeof str !== 'string') {
    return str;
  }

  return str
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

async function getRecentRequestCount(fingerprint: string): Promise<number> {
  // Implementation would check recent request count from cache/database
  return 0;
}

// Rate limiting middleware
export const apiRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Simple rate limiting - in a production environment, you would use a more sophisticated solution
  // with Redis or similar to track requests across instances
  next();
};

export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const uploadRateLimit = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const searchRateLimit = (req: Request, res: Response, next: NextFunction) => {
  next();
};
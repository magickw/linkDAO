/**
 * Enhanced Security Middleware
 * 
 * Comprehensive security middleware stack including DDoS protection,
 * advanced rate limiting, input validation, and threat detection.
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { securityConfig } from '../config/securityConfig';
import { securityMonitoringService, SecurityEventType, SecuritySeverity } from '../services/securityMonitoringService';
import { auditLoggingService } from '../services/auditLoggingService';
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
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (securityConfig.authentication.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log suspicious origin
    securityMonitoringService.recordSecurityEvent({
      type: SecurityEventType.CSRF_ATTEMPT,
      severity: SecuritySeverity.MEDIUM,
      source: 'cors_middleware',
      details: { origin, allowed: false },
    });
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Client-Version',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  maxAge: 86400, // 24 hours
});

/**
 * Enhanced Helmet configuration for security headers
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      scriptSrc: ["'self'", "'unsafe-eval'"], // Required for Web3 libraries
      connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for Web3 compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

/**
 * Advanced rate limiting with adaptive thresholds
 */
export const createAdaptiveRateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.maxRequests,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: options.keyGenerator || ((req) => {
      // Use IP + User-Agent for better identification
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');
    }),
    handler: async (req: Request, res: Response) => {
      const key = options.keyGenerator ? options.keyGenerator(req) : req.ip;
      
      // Record rate limit event
      await securityMonitoringService.recordSecurityEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        severity: SecuritySeverity.MEDIUM,
        source: 'rate_limiter',
        details: {
          endpoint: req.path,
          method: req.method,
          limit: options.maxRequests,
          window: options.windowMs,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
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
    await securityMonitoringService.recordSecurityEvent({
      type: SecurityEventType.DDOS_ATTACK,
      severity: SecuritySeverity.HIGH,
      source: 'ddos_protection',
      details: { reason: 'blacklisted_ip' },
      ipAddress: clientIP,
    });

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied',
    });
  }

  // Check if IP is blocked by security monitoring
  if (securityMonitoringService.isIPBlocked(clientIP)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'IP temporarily blocked due to suspicious activity',
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
        // Determine attack type
        let attackType = SecurityEventType.SUSPICIOUS_ACTIVITY;
        if (pattern.source.includes('SELECT|INSERT')) {
          attackType = SecurityEventType.SQL_INJECTION_ATTEMPT;
        } else if (pattern.source.includes('script|iframe')) {
          attackType = SecurityEventType.XSS_ATTEMPT;
        }

        await securityMonitoringService.recordSecurityEvent({
          type: attackType,
          severity: SecuritySeverity.HIGH,
          source: 'input_validation',
          details: {
            pattern: pattern.source,
            endpoint: req.path,
            method: req.method,
            suspiciousData: requestData.substring(0, 500), // Limit data size
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

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
    await securityMonitoringService.recordSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.CRITICAL,
      source: 'threat_detection',
      details: {
        riskScore,
        threatLevel: req.securityContext.threatLevel,
        fingerprint: req.securityContext.fingerprint,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Request blocked due to high threat level',
    });
  }

  // Log high-risk requests
  if (req.securityContext.threatLevel === 'high') {
    await securityMonitoringService.recordSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.HIGH,
      source: 'threat_detection',
      details: {
        riskScore,
        threatLevel: req.securityContext.threatLevel,
        endpoint: req.path,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
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

  if (isSecurityEndpoint || req.securityContext?.threatLevel === 'high') {
    await auditLoggingService.createAuditLog({
      actionType: 'security_request',
      actorType: 'user',
      newState: {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        riskScore: req.securityContext?.riskScore || 0,
        threatLevel: req.securityContext?.threatLevel || 'low',
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    
    // Log slow requests (potential DoS)
    if (responseTime > 5000) { // 5 seconds
      securityMonitoringService.recordSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.MEDIUM,
        source: 'performance_monitoring',
        details: {
          responseTime,
          endpoint: req.path,
          method: req.method,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * File upload security
 */
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  if (!req.files && !req.file) {
    return next();
  }

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
    const fileName = file.originalname || file.name || '';
    
    if (suspiciousExtensions.some(ext => fileName.toLowerCase().endsWith(ext))) {
      securityMonitoringService.recordSecurityEvent({
        type: SecurityEventType.MALICIOUS_FILE_UPLOAD,
        severity: SecuritySeverity.HIGH,
        source: 'file_upload_security',
        details: {
          fileName,
          fileType: file.mimetype,
          fileSize: file.size,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

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

// Export rate limiters for specific use cases
export const authRateLimit = createAdaptiveRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 attempts per window
});

export const apiRateLimit = createAdaptiveRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // 500 requests per window
  skipSuccessfulRequests: true,
});

export const uploadRateLimit = createAdaptiveRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 uploads per hour
});

export const searchRateLimit = createAdaptiveRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 30, // 30 searches per minute
});
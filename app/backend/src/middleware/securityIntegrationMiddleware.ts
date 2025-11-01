/**
 * Security Integration Middleware
 * Comprehensive security middleware that integrates all security measures
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

// Import all security components
import { validateRequest, securityValidation, rateLimitValidation } from './enhancedInputValidation';
import { enhancedCorsMiddleware } from './enhancedCorsMiddleware';
import { defaultFileUploadSecurity } from './enhancedFileUploadSecurity';
import { authSecurityManager } from './authenticationSecurityMiddleware';

export interface SecurityIntegrationConfig {
  enableCors: boolean;
  enableInputValidation: boolean;
  enableRateLimit: boolean;
  enableFileUploadSecurity: boolean;
  enableAuthSecurity: boolean;
  enableSecurityHeaders: boolean;
  enableRequestLogging: boolean;
  enableThreatDetection: boolean;
  rateLimitWindow: number;
  rateLimitMax: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Default security configuration
const DEFAULT_SECURITY_CONFIG: SecurityIntegrationConfig = {
  enableCors: true,
  enableInputValidation: true,
  enableRateLimit: true,
  enableFileUploadSecurity: true,
  enableAuthSecurity: true,
  enableSecurityHeaders: true,
  enableRequestLogging: true,
  enableThreatDetection: true,
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100,
  logLevel: 'info'
};

/**
 * Comprehensive Security Integration Manager
 */
export class SecurityIntegrationManager {
  private config: SecurityIntegrationConfig;
  private securityMetrics: {
    blockedRequests: number;
    suspiciousRequests: number;
    rateLimitHits: number;
    authFailures: number;
    fileUploadBlocks: number;
    corsBlocks: number;
  } = {
    blockedRequests: 0,
    suspiciousRequests: 0,
    rateLimitHits: 0,
    authFailures: 0,
    fileUploadBlocks: 0,
    corsBlocks: 0
  };

  constructor(config: Partial<SecurityIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Create comprehensive security middleware stack
   */
  public createSecurityStack() {
    const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

    // 1. Security headers (should be first)
    if (this.config.enableSecurityHeaders) {
      middlewares.push(this.createSecurityHeadersMiddleware());
    }

    // 2. Request logging
    if (this.config.enableRequestLogging) {
      middlewares.push(this.createRequestLoggingMiddleware());
    }

    // 3. CORS handling
    if (this.config.enableCors) {
      middlewares.push(enhancedCorsMiddleware);
    }

    // 4. Rate limiting
    if (this.config.enableRateLimit) {
      middlewares.push(rateLimitValidation(this.config.rateLimitWindow, this.config.rateLimitMax));
    }

    // 5. Threat detection
    if (this.config.enableThreatDetection) {
      middlewares.push(this.createThreatDetectionMiddleware());
    }

    // 6. Input validation and sanitization
    if (this.config.enableInputValidation) {
      middlewares.push(securityValidation);
    }

    // 7. Security monitoring
    middlewares.push(this.createSecurityMonitoringMiddleware());

    return middlewares;
  }

  /**
   * Security headers middleware
   */
  private createSecurityHeadersMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Set comprehensive security headers
      res.set({
        // Prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',
        
        // Prevent clickjacking
        'X-Frame-Options': 'DENY',
        
        // Enable XSS protection
        'X-XSS-Protection': '1; mode=block',
        
        // Strict transport security
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        
        // Referrer policy
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        
        // Content security policy
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' wss: https:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'"
        ].join('; '),
        
        // Permissions policy
        'Permissions-Policy': [
          'camera=()',
          'microphone=()',
          'geolocation=()',
          'payment=()',
          'usb=()',
          'magnetometer=()',
          'accelerometer=()',
          'gyroscope=()'
        ].join(', '),
        
        // Cross-origin policies
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        
        // Remove server information
        'Server': 'LinkDAO-API'
      });

      next();
    };
  }

  /**
   * Request logging middleware
   */
  private createRequestLoggingMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      
      // Attach request ID to response locals
      res.locals.requestId = requestId;

      // Log request
      if (this.config.logLevel === 'debug') {
        logger.debug('Incoming request', {
          requestId,
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          origin: req.get('Origin'),
          referer: req.get('Referer')
        });
      }

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any) {
        const responseTime = Date.now() - startTime;
        
        // Log response
        logger.info('Request completed', {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        // Log slow requests
        if (responseTime > 5000) {
          logger.warn('Slow request detected', {
            requestId,
            method: req.method,
            path: req.path,
            responseTime,
            ip: req.ip
          });
        }

        return originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  /**
   * Threat detection middleware
   */
  private createThreatDetectionMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const threatScore = await this.calculateThreatScore(req);
        
        // Attach threat score to request
        (req as any).threatScore = threatScore;

        // Block high-threat requests
        if (threatScore >= 80) {
          this.securityMetrics.blockedRequests++;
          
          logger.warn('High-threat request blocked', {
            threatScore,
            ip: req.ip,
            path: req.path,
            method: req.method,
            userAgent: req.get('User-Agent'),
            requestId: res.locals.requestId
          });
          
          return ApiResponse.forbidden(res, 'Request blocked due to security concerns');
        }

        // Log suspicious requests
        if (threatScore >= 50) {
          this.securityMetrics.suspiciousRequests++;
          
          logger.warn('Suspicious request detected', {
            threatScore,
            ip: req.ip,
            path: req.path,
            method: req.method,
            userAgent: req.get('User-Agent'),
            requestId: res.locals.requestId
          });
        }

        next();
      } catch (error) {
        logger.error('Threat detection error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        
        // Continue on error to avoid blocking legitimate requests
        next();
      }
    };
  }

  /**
   * Calculate threat score for request
   */
  private async calculateThreatScore(req: Request): Promise<number> {
    let score = 0;

    // Check IP reputation (simplified)
    const clientIP = req.ip || 'unknown';
    if (this.isKnownMaliciousIP(clientIP)) {
      score += 50;
    }

    // Check user agent
    const userAgent = req.get('User-Agent') || '';
    if (this.isSuspiciousUserAgent(userAgent)) {
      score += 30;
    }

    // Check request patterns
    if (this.hasSuspiciousRequestPattern(req)) {
      score += 25;
    }

    // Check request frequency
    const requestFrequency = await this.getRequestFrequency(clientIP);
    if (requestFrequency > 50) {
      score += 20;
    }

    // Check for common attack patterns
    if (this.hasAttackPatterns(req)) {
      score += 40;
    }

    // Check geographic location (if available)
    if (this.isFromHighRiskLocation(clientIP)) {
      score += 15;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Check if IP is known to be malicious
   */
  private isKnownMaliciousIP(ip: string): boolean {
    // In production, you would check against threat intelligence feeds
    const knownMaliciousIPs = [
      // Add known malicious IPs here
    ];
    
    return knownMaliciousIPs.includes(ip);
  }

  /**
   * Check if user agent is suspicious
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot|crawler|spider/i,
      /scanner|exploit|hack/i,
      /sqlmap|nikto|nmap|masscan/i,
      /python|curl|wget/i,
      /^$/,  // Empty user agent
      /.{200,}/ // Very long user agent
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Check for suspicious request patterns
   */
  private hasSuspiciousRequestPattern(req: Request): boolean {
    // Check for path traversal attempts
    if (req.path.includes('..') || req.path.includes('~')) {
      return true;
    }

    // Check for common attack paths
    const attackPaths = [
      '/admin', '/wp-admin', '/phpmyadmin',
      '/.env', '/.git', '/config',
      '/api/v1/admin', '/api/admin'
    ];

    if (attackPaths.some(path => req.path.startsWith(path))) {
      return true;
    }

    // Check for suspicious query parameters
    const queryString = JSON.stringify(req.query);
    const suspiciousParams = [
      /union\s+select/i,
      /script\s*>/i,
      /javascript:/i,
      /eval\s*\(/i
    ];

    return suspiciousParams.some(pattern => pattern.test(queryString));
  }

  /**
   * Get request frequency for IP
   */
  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  private async getRequestFrequency(ip: string): Promise<number> {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    // Clean up expired entries
    for (const [key, value] of this.requestCounts.entries()) {
      if (now > value.resetTime) {
        this.requestCounts.delete(key);
      }
    }

    // Get or create record
    let record = this.requestCounts.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      this.requestCounts.set(ip, record);
    }

    record.count++;
    return record.count;
  }

  /**
   * Check for attack patterns in request
   */
  private hasAttackPatterns(req: Request): boolean {
    const requestData = JSON.stringify({
      body: req.body,
      query: req.query,
      headers: req.headers
    });

    const attackPatterns = [
      // SQL injection
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      
      // XSS
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      
      // Command injection
      /(\||&|;|\$\(|\`)/,
      /(rm\s|cat\s|ls\s|pwd|whoami)/i,
      
      // LDAP injection
      /(\(|\)|&|\||!)/,
      
      // XML injection
      /<!ENTITY/i,
      /<!DOCTYPE/i
    ];

    return attackPatterns.some(pattern => pattern.test(requestData));
  }

  /**
   * Check if request is from high-risk location
   */
  private isFromHighRiskLocation(ip: string): boolean {
    // In production, you would use a GeoIP service
    // For now, return false
    return false;
  }

  /**
   * Security monitoring middleware
   */
  private createSecurityMonitoringMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Monitor security events
      const originalEnd = res.end;
      res.end = (chunk?: any, encoding?: any) => {
        // Track security metrics based on response
        if (res.statusCode === 403) {
          this.securityMetrics.blockedRequests++;
        } else if (res.statusCode === 401) {
          this.securityMetrics.authFailures++;
        } else if (res.statusCode === 429) {
          this.securityMetrics.rateLimitHits++;
        }

        return originalEnd.call(res, chunk, encoding);
      };

      next();
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get security metrics
   */
  public getSecurityMetrics() {
    return {
      ...this.securityMetrics,
      activeSessionsCount: authSecurityManager.getActiveSessionsCount(),
      failedAttemptsCount: authSecurityManager.getFailedAttemptsCount()
    };
  }

  /**
   * Reset security metrics
   */
  public resetSecurityMetrics(): void {
    this.securityMetrics = {
      blockedRequests: 0,
      suspiciousRequests: 0,
      rateLimitHits: 0,
      authFailures: 0,
      fileUploadBlocks: 0,
      corsBlocks: 0
    };
  }

  /**
   * Get configuration
   */
  public getConfig(): SecurityIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<SecurityIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create default instance
export const securityIntegrationManager = new SecurityIntegrationManager();

// Export pre-configured security stack
export const securityMiddlewareStack = securityIntegrationManager.createSecurityStack();

/**
 * Security health check middleware
 */
export const securityHealthCheck = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/health/security') {
    const metrics = securityIntegrationManager.getSecurityMetrics();
    const config = securityIntegrationManager.getConfig();
    
    return ApiResponse.success(res, {
      status: 'healthy',
      metrics,
      config: {
        enableCors: config.enableCors,
        enableInputValidation: config.enableInputValidation,
        enableRateLimit: config.enableRateLimit,
        enableFileUploadSecurity: config.enableFileUploadSecurity,
        enableAuthSecurity: config.enableAuthSecurity
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

export default {
  SecurityIntegrationManager,
  securityIntegrationManager,
  securityMiddlewareStack,
  securityHealthCheck
};

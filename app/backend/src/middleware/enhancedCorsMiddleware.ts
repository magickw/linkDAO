/**
 * Enhanced CORS Middleware
 * Secure cross-origin request handling with advanced security features
 */

import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { ApiResponse } from '../utils/apiResponse';

export interface CorsSecurityConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
  securityHeaders: boolean;
  strictOriginValidation: boolean;
  logBlocked: boolean;
  rateLimitPreflight: boolean;
}

export interface CorsSecurityContext {
  origin?: string;
  method: string;
  path: string;
  ip: string;
  userAgent?: string;
  referer?: string;
  timestamp: Date;
}

/**
 * Enhanced CORS middleware with security features
 */
export class EnhancedCorsMiddleware {
  private config: CorsSecurityConfig;
  private preflightCache: Map<string, { count: number; lastRequest: Date }> = new Map();
  private blockedOrigins: Set<string> = new Set();

  constructor(config: Partial<CorsSecurityConfig> = {}) {
    this.config = {
      allowedOrigins: this.getDefaultAllowedOrigins(),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Request-ID',
        'X-Correlation-ID',
        'X-Session-ID',
        'X-Wallet-Address',
        'X-Chain-ID',
        'X-API-Key',
        'X-Client-Version'
      ],
      exposedHeaders: [
        'X-Request-ID',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Total-Count'
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 200,
      securityHeaders: true,
      strictOriginValidation: true,
      logBlocked: true,
      rateLimitPreflight: true,
      ...config
    };
  }

  /**
   * Get default allowed origins based on environment
   */
  private getDefaultAllowedOrigins(): string[] {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
      case 'production':
        return [
          'https://linkdao.io',
          'https://www.linkdao.io',
          'https://app.linkdao.io',
          'https://marketplace.linkdao.io'
        ];
      
      case 'staging':
        return [
          'https://staging.linkdao.io',
          'https://staging-app.linkdao.io',
          'https://staging-marketplace.linkdao.io',
          'http://localhost:3000',
          'http://localhost:3001'
        ];
      
      case 'development':
      default:
        return [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:8080',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:8080'
        ];
    }
  }

  /**
   * Main CORS middleware
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const context = this.createSecurityContext(req);
      
      try {
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          this.handlePreflight(req, res, context);
          return;
        }

        // Handle actual requests
        this.handleActualRequest(req, res, context);
        next();
      } catch (error) {
        safeLogger.error('CORS middleware error:', error);
        this.handleCorsError(res, context, 'Internal CORS processing error');
      }
    };
  }

  /**
   * Handle preflight OPTIONS requests
   */
  private handlePreflight(req: Request, res: Response, context: CorsSecurityContext): void {
    const origin = req.get('Origin');
    const requestMethod = req.get('Access-Control-Request-Method');
    const requestHeaders = req.get('Access-Control-Request-Headers');

    // Rate limit preflight requests if enabled
    if (this.config.rateLimitPreflight && !this.checkPreflightRateLimit(context)) {
      this.handleCorsError(res, context, 'Too many preflight requests');
      return;
    }

    // Validate origin
    if (!this.isOriginAllowed(origin)) {
      this.handleCorsError(res, context, 'Origin not allowed by CORS policy');
      return;
    }

    // Validate requested method
    if (requestMethod && !this.config.allowedMethods.includes(requestMethod)) {
      this.handleCorsError(res, context, `Method ${requestMethod} not allowed by CORS policy`);
      return;
    }

    // Validate requested headers
    if (requestHeaders && !this.areHeadersAllowed(requestHeaders)) {
      this.handleCorsError(res, context, 'Requested headers not allowed by CORS policy');
      return;
    }

    // Set preflight response headers
    this.setPreflightHeaders(res, origin);

    // Log successful preflight
    console.debug('CORS preflight approved', {
      origin,
      requestMethod,
      requestHeaders,
      ip: context.ip,
      userAgent: context.userAgent
    });

    res.status(this.config.optionsSuccessStatus).end();
  }

  /**
   * Handle actual CORS requests
   */
  private handleActualRequest(req: Request, res: Response, context: CorsSecurityContext): void {
    const origin = req.get('Origin');

    // Validate origin for actual requests
    if (origin && !this.isOriginAllowed(origin)) {
      this.handleCorsError(res, context, 'Origin not allowed by CORS policy');
      return;
    }

    // Set CORS headers for actual requests
    this.setActualRequestHeaders(res, origin);

    // Set security headers if enabled
    if (this.config.securityHeaders) {
      this.setSecurityHeaders(res);
    }

    // Log successful CORS request
    if (origin) {
      console.debug('CORS request approved', {
        origin,
        method: context.method,
        path: context.path,
        ip: context.ip
      });
    }
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin?: string): boolean {
    if (!origin) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      return true;
    }

    // Check if origin is in blocked list
    if (this.blockedOrigins.has(origin)) {
      return false;
    }

    // Check against allowed origins
    if (this.config.allowedOrigins.includes(origin)) {
      return true;
    }

    // In development, allow localhost with any port
    if (process.env.NODE_ENV === 'development' && this.isLocalhostOrigin(origin)) {
      return true;
    }

    // Strict validation mode
    if (this.config.strictOriginValidation) {
      return false;
    }

    // Additional validation for wildcard subdomains (if configured)
    return this.checkWildcardOrigins(origin);
  }

  /**
   * Check if origin is localhost (for development)
   */
  private isLocalhostOrigin(origin: string): boolean {
    try {
      const url = new URL(origin);
      return url.hostname === 'localhost' || 
             url.hostname === '127.0.0.1' || 
             url.hostname === '0.0.0.0';
    } catch {
      return false;
    }
  }

  /**
   * Check wildcard origins (e.g., *.linkdao.io)
   */
  private checkWildcardOrigins(origin: string): boolean {
    try {
      const url = new URL(origin);
      const hostname = url.hostname;

      // Check for subdomain patterns
      const allowedDomains = ['linkdao.io'];
      return allowedDomains.some(domain => 
        hostname.endsWith(`.${domain}`) || hostname === domain
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if requested headers are allowed
   */
  private areHeadersAllowed(requestHeaders: string): boolean {
    const headers = requestHeaders.split(',').map(h => h.trim().toLowerCase());
    const allowedHeaders = this.config.allowedHeaders.map(h => h.toLowerCase());
    
    return headers.every(header => 
      allowedHeaders.includes(header) || 
      header.startsWith('x-') // Allow custom X- headers
    );
  }

  /**
   * Rate limit preflight requests
   */
  private checkPreflightRateLimit(context: CorsSecurityContext): boolean {
    const key = `${context.ip}:${context.origin}`;
    const now = new Date();
    const entry = this.preflightCache.get(key);

    if (!entry) {
      this.preflightCache.set(key, { count: 1, lastRequest: now });
      return true;
    }

    // Reset counter if more than 1 minute has passed
    if (now.getTime() - entry.lastRequest.getTime() > 60000) {
      this.preflightCache.set(key, { count: 1, lastRequest: now });
      return true;
    }

    // Allow up to 10 preflight requests per minute per IP/origin
    if (entry.count >= 10) {
      return false;
    }

    entry.count++;
    entry.lastRequest = now;
    return true;
  }

  /**
   * Set preflight response headers
   */
  private setPreflightHeaders(res: Response, origin?: string): void {
    res.set({
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': this.config.allowedMethods.join(', '),
      'Access-Control-Allow-Headers': this.config.allowedHeaders.join(', '),
      'Access-Control-Max-Age': this.config.maxAge.toString(),
      'Access-Control-Allow-Credentials': this.config.credentials.toString(),
      'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
    });
  }

  /**
   * Set actual request headers
   */
  private setActualRequestHeaders(res: Response, origin?: string): void {
    res.set({
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Credentials': this.config.credentials.toString(),
      'Access-Control-Expose-Headers': this.config.exposedHeaders.join(', '),
      'Vary': 'Origin'
    });
  }

  /**
   * Set additional security headers
   */
  private setSecurityHeaders(res: Response): void {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    });
  }

  /**
   * Create security context for logging and validation
   */
  private createSecurityContext(req: Request): CorsSecurityContext {
    return {
      origin: req.get('Origin'),
      method: req.method,
      path: req.path,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      timestamp: new Date()
    };
  }

  /**
   * Handle CORS errors
   */
  private handleCorsError(res: Response, context: CorsSecurityContext, message: string): void {
    if (this.config.logBlocked) {
      safeLogger.warn('CORS request blocked', {
        message,
        origin: context.origin,
        method: context.method,
        path: context.path,
        ip: context.ip,
        userAgent: context.userAgent,
        timestamp: context.timestamp.toISOString()
      });
    }

    // Add origin to temporary block list for repeated violations
    if (context.origin) {
      this.addToBlockList(context.origin);
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'CORS_ERROR',
        message,
        corsError: true,
        origin: context.origin,
        timestamp: context.timestamp.toISOString()
      }
    });
  }

  /**
   * Add origin to temporary block list
   */
  private addToBlockList(origin: string): void {
    this.blockedOrigins.add(origin);
    
    // Remove from block list after 5 minutes
    setTimeout(() => {
      this.blockedOrigins.delete(origin);
    }, 5 * 60 * 1000);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<CorsSecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Add allowed origin
   */
  public addAllowedOrigin(origin: string): void {
    if (!this.config.allowedOrigins.includes(origin)) {
      this.config.allowedOrigins.push(origin);
      safeLogger.info('Added new allowed CORS origin', { origin });
    }
  }

  /**
   * Remove allowed origin
   */
  public removeAllowedOrigin(origin: string): void {
    const index = this.config.allowedOrigins.indexOf(origin);
    if (index > -1) {
      this.config.allowedOrigins.splice(index, 1);
      safeLogger.info('Removed allowed CORS origin', { origin });
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): CorsSecurityConfig {
    return { ...this.config };
  }

  /**
   * Clear preflight cache
   */
  public clearPreflightCache(): void {
    this.preflightCache.clear();
  }

  /**
   * Get blocked origins
   */
  public getBlockedOrigins(): string[] {
    return Array.from(this.blockedOrigins);
  }
}

// Create default instance
export const enhancedCorsMiddleware = new EnhancedCorsMiddleware();

// Export middleware function
export const corsSecurityMiddleware = enhancedCorsMiddleware.middleware();

// Export pre-configured middlewares for different environments
export const developmentCorsMiddleware = new EnhancedCorsMiddleware({
  strictOriginValidation: false,
  logBlocked: false,
  rateLimitPreflight: false
}).middleware();

export const productionCorsMiddleware = new EnhancedCorsMiddleware({
  strictOriginValidation: true,
  logBlocked: true,
  rateLimitPreflight: true,
  securityHeaders: true
}).middleware();

export default enhancedCorsMiddleware;

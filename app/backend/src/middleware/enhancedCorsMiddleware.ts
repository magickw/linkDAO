/**
 * Enhanced CORS Middleware
 * Secure cross-origin request handling with advanced security features
 * Implements dynamic origin validation, environment-specific configurations,
 * and comprehensive logging with suspicious request detection
 */

import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { ApiResponse } from '../utils/apiResponse';

export interface CorsSecurityConfig {
  allowedOrigins: (string | RegExp)[];
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
  dynamicOriginValidation: boolean;
  suspiciousRequestDetection: boolean;
  vercelDeploymentSupport: boolean;
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
    // Set default config first to allow getDefaultAllowedOrigins to access it
    this.config = {
      allowedOrigins: [],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
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
        'X-Client-Version',
        'X-CSRF-Token',
        'x-csrf-token',
        'Cache-Control',
        'X-Device-ID',
        'X-Session-Token',
        'X-Refresh-Token',
        'Pragma',
        'Expires'
      ],
      exposedHeaders: [
        'X-Request-ID',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'RateLimit-Policy',
        'X-Total-Count',
        'X-Response-Time',
        'X-Backend-Status'
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 200,
      securityHeaders: true,
      strictOriginValidation: process.env.NODE_ENV === 'production',
      logBlocked: true,
      rateLimitPreflight: process.env.NODE_ENV === 'production',
      dynamicOriginValidation: true,
      suspiciousRequestDetection: true,
      vercelDeploymentSupport: true,
      ...config
    };

    // Now set the allowed origins after config is initialized
    this.config.allowedOrigins = this.getDefaultAllowedOrigins();
  }

  /**
   * Get default allowed origins based on environment with dynamic validation
   */
  private getDefaultAllowedOrigins(): (string | RegExp)[] {
    const env = process.env.NODE_ENV || 'development';
    
    // Base origins for each environment
    const baseOrigins: Record<string, (string | RegExp)[]> = {
      production: [
        'https://linkdao.io',
        'https://www.linkdao.io',
        'https://app.linkdao.io',
        'https://marketplace.linkdao.io',
        'https://api.linkdao.io',
        'https://linkdao-backend.onrender.com',
        // Vercel deployment patterns
        'https://linkdao.vercel.app',
        /^https:\/\/linkdao-.*\.vercel\.app$/,
        /^https:\/\/.*-linkdao\.vercel\.app$/,
        // Support for preview deployments
        /^https:\/\/linkdao-.*-.*\.vercel\.app$/
      ],
      
      staging: [
        'https://staging.linkdao.io',
        'https://staging-app.linkdao.io',
        'https://staging-marketplace.linkdao.io',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:8080',
        // Staging Vercel deployments
        /^https:\/\/staging-linkdao-.*\.vercel\.app$/
      ],
      
      development: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:8080',
        'https://localhost:3000',
        'https://localhost:3001',
        'https://localhost:8080',
        // Allow any localhost port in development
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^https:\/\/localhost:\d+$/
      ]
    };

    const origins = baseOrigins[env] || baseOrigins.development;

    // Add environment variable origins if specified
    const envOrigins = process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '';
    if (envOrigins) {
      const additionalOrigins = envOrigins.split(',').map(o => o.trim()).filter(Boolean);
      origins.push(...additionalOrigins);
    }

    // Add dynamic Vercel deployment support
    if (this.config.vercelDeploymentSupport) {
      origins.push(
        /^https:\/\/.*\.vercel\.app$/,
        /^https:\/\/.*-.*\.vercel\.app$/
      );
    }

    return origins;
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

    // Log successful preflight with comprehensive details
    safeLogger.debug('CORS preflight approved', {
      origin,
      requestMethod,
      requestHeaders,
      ip: context.ip,
      userAgent: context.userAgent,
      referer: context.referer,
      timestamp: context.timestamp.toISOString(),
      environment: process.env.NODE_ENV,
      path: context.path
    });

    res.status(this.config.optionsSuccessStatus).end();
  }

  /**
   * Handle actual CORS requests with enhanced monitoring
   */
  private handleActualRequest(req: Request, res: Response, context: CorsSecurityContext): void {
    const origin = req.get('Origin');

    // Detect suspicious requests if enabled
    if (this.config.suspiciousRequestDetection && this.isSuspiciousRequest(context)) {
      safeLogger.warn('Suspicious CORS request detected', {
        origin: context.origin,
        method: context.method,
        path: context.path,
        ip: context.ip,
        userAgent: context.userAgent,
        referer: context.referer,
        timestamp: context.timestamp.toISOString()
      });
    }

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

    // Log successful CORS request with comprehensive details
    if (origin) {
      safeLogger.debug('CORS request approved', {
        origin,
        method: context.method,
        path: context.path,
        ip: context.ip,
        userAgent: context.userAgent,
        referer: context.referer,
        timestamp: context.timestamp.toISOString(),
        environment: process.env.NODE_ENV
      });
    }
  }

  /**
   * Check if origin is allowed with dynamic validation
   */
  private isOriginAllowed(origin?: string): boolean {
    if (!origin) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      return true;
    }

    // Check if origin is in blocked list
    if (this.blockedOrigins.has(origin)) {
      safeLogger.warn('Origin blocked - in blocklist', { origin });
      return false;
    }

    // Check against allowed origins (both strings and RegExp)
    for (const allowedOrigin of this.config.allowedOrigins) {
      if (typeof allowedOrigin === 'string') {
        if (allowedOrigin === origin) {
          return true;
        }
      } else if (allowedOrigin instanceof RegExp) {
        if (allowedOrigin.test(origin)) {
          safeLogger.debug('Origin allowed by regex pattern', { origin, pattern: allowedOrigin.source });
          return true;
        }
      }
    }

    // Dynamic origin validation for development
    if (this.config.dynamicOriginValidation) {
      // In development, allow localhost with any port
      if (process.env.NODE_ENV === 'development' && this.isLocalhostOrigin(origin)) {
        safeLogger.debug('Origin allowed - localhost in development', { origin });
        return true;
      }

      // Check for Vercel deployment patterns
      if (this.config.vercelDeploymentSupport && this.isVercelDeployment(origin)) {
        safeLogger.debug('Origin allowed - Vercel deployment', { origin });
        return true;
      }

      // Check for LinkDAO subdomain patterns
      if (this.isLinkDAOSubdomain(origin)) {
        safeLogger.debug('Origin allowed - LinkDAO subdomain', { origin });
        return true;
      }
    }

    // Strict validation mode
    if (this.config.strictOriginValidation) {
      safeLogger.warn('Origin blocked - strict validation', { origin });
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
   * Check if origin is a Vercel deployment
   */
  private isVercelDeployment(origin: string): boolean {
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      
      // Check for Vercel deployment patterns
      const vercelPatterns = [
        /^.*\.vercel\.app$/,
        /^linkdao-.*\.vercel\.app$/,
        /^.*-linkdao\.vercel\.app$/,
        /^linkdao\.vercel\.app$/
      ];

      return vercelPatterns.some(pattern => pattern.test(hostname));
    } catch {
      return false;
    }
  }

  /**
   * Check if origin is a LinkDAO subdomain
   */
  private isLinkDAOSubdomain(origin: string): boolean {
    try {
      const url = new URL(origin);
      const hostname = url.hostname;

      // Check for LinkDAO subdomain patterns
      const linkdaoPatterns = [
        'linkdao.io',
        /^.*\.linkdao\.io$/,
        /^staging.*\.linkdao\.io$/,
        /^dev.*\.linkdao\.io$/,
        /^test.*\.linkdao\.io$/
      ];

      return linkdaoPatterns.some(pattern => {
        if (typeof pattern === 'string') {
          return hostname === pattern;
        }
        return pattern.test(hostname);
      });
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
      const allowedDomains = ['linkdao.io', 'vercel.app'];
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
   * Detect suspicious requests based on patterns
   */
  private isSuspiciousRequest(context: CorsSecurityContext): boolean {
    const { userAgent, referer, origin, method, path } = context;

    // Suspicious user agent patterns
    const suspiciousUserAgents = [
      /bot|crawler|spider/i,
      /scanner|exploit|hack/i,
      /curl|wget|postman/i,
      /python|java|go-http/i,
      /nikto|sqlmap|nmap/i
    ];

    if (userAgent && suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
      return true;
    }

    // Suspicious path patterns
    const suspiciousPaths = [
      /\/admin/i,
      /\/wp-admin/i,
      /\/phpmyadmin/i,
      /\.php$/i,
      /\.asp$/i,
      /\.jsp$/i,
      /\/config/i,
      /\/backup/i
    ];

    if (suspiciousPaths.some(pattern => pattern.test(path))) {
      return true;
    }

    // Suspicious origin patterns
    if (origin) {
      const suspiciousOrigins = [
        /localhost:\d{5,}/i, // High port numbers
        /\d+\.\d+\.\d+\.\d+/i, // Direct IP addresses
        /\.tk$|\.ml$|\.ga$/i // Suspicious TLDs
      ];

      if (suspiciousOrigins.some(pattern => pattern.test(origin))) {
        return true;
      }
    }

    // Suspicious method/path combinations
    if (method === 'POST' && path.includes('/api/admin')) {
      return true;
    }

    return false;
  }

  /**
   * Handle CORS errors with enhanced logging and monitoring
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
        referer: context.referer,
        timestamp: context.timestamp.toISOString(),
        environment: process.env.NODE_ENV,
        allowedOrigins: this.config.allowedOrigins.map(o => 
          typeof o === 'string' ? o : o.source
        ).slice(0, 5), // Log first 5 for debugging
        isSuspicious: this.config.suspiciousRequestDetection ? 
          this.isSuspiciousRequest(context) : false
      });
    }

    // Add origin to temporary block list for repeated violations
    if (context.origin) {
      this.addToBlockList(context.origin);
    }

    // Set CORS error headers for debugging
    res.set({
      'X-CORS-Error': 'true',
      'X-CORS-Message': message,
      'X-CORS-Origin': context.origin || 'none',
      'X-CORS-Timestamp': context.timestamp.toISOString()
    });

    res.status(403).json({
      success: false,
      error: {
        code: 'CORS_ERROR',
        message,
        corsError: true,
        origin: context.origin,
        timestamp: context.timestamp.toISOString(),
        requestId: res.get('X-Request-ID') || 'unknown'
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
   * Add origin to block list (public method for testing)
   */
  public addToBlockListForTesting(origin: string): void {
    this.addToBlockList(origin);
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

  /**
   * Get CORS statistics for monitoring
   */
  public getStatistics(): {
    preflightCacheSize: number;
    blockedOriginsCount: number;
    allowedOriginsCount: number;
    environment: string;
    config: Partial<CorsSecurityConfig>;
  } {
    return {
      preflightCacheSize: this.preflightCache.size,
      blockedOriginsCount: this.blockedOrigins.size,
      allowedOriginsCount: this.config.allowedOrigins.length,
      environment: process.env.NODE_ENV || 'development',
      config: {
        strictOriginValidation: this.config.strictOriginValidation,
        dynamicOriginValidation: this.config.dynamicOriginValidation,
        suspiciousRequestDetection: this.config.suspiciousRequestDetection,
        vercelDeploymentSupport: this.config.vercelDeploymentSupport,
        rateLimitPreflight: this.config.rateLimitPreflight,
        logBlocked: this.config.logBlocked
      }
    };
  }

  /**
   * Validate origin against current configuration (for testing/debugging)
   */
  public validateOrigin(origin: string): {
    allowed: boolean;
    reason: string;
    matchedPattern?: string;
  } {
    if (!origin) {
      return { allowed: true, reason: 'No origin header (mobile app/Postman)' };
    }

    if (this.blockedOrigins.has(origin)) {
      return { allowed: false, reason: 'Origin is temporarily blocked' };
    }

    // Check exact matches
    for (const allowedOrigin of this.config.allowedOrigins) {
      if (typeof allowedOrigin === 'string' && allowedOrigin === origin) {
        return { allowed: true, reason: 'Exact match', matchedPattern: allowedOrigin };
      }
      if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
        return { allowed: true, reason: 'Regex pattern match', matchedPattern: allowedOrigin.source };
      }
    }

    // Check dynamic validation
    if (this.config.dynamicOriginValidation) {
      if (process.env.NODE_ENV === 'development' && this.isLocalhostOrigin(origin)) {
        return { allowed: true, reason: 'Localhost in development mode' };
      }

      if (this.config.vercelDeploymentSupport && this.isVercelDeployment(origin)) {
        return { allowed: true, reason: 'Vercel deployment pattern' };
      }

      if (this.isLinkDAOSubdomain(origin)) {
        return { allowed: true, reason: 'LinkDAO subdomain pattern' };
      }
    }

    return { 
      allowed: false, 
      reason: this.config.strictOriginValidation ? 
        'Strict validation - origin not in allowed list' : 
        'Origin validation failed'
    };
  }

  /**
   * Clear all caches and reset state (for testing/maintenance)
   */
  public reset(): void {
    this.preflightCache.clear();
    this.blockedOrigins.clear();
    safeLogger.info('CORS middleware state reset');
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
  rateLimitPreflight: false,
  dynamicOriginValidation: true,
  suspiciousRequestDetection: false,
  vercelDeploymentSupport: true,
  securityHeaders: false
}).middleware();

export const stagingCorsMiddleware = new EnhancedCorsMiddleware({
  strictOriginValidation: false,
  logBlocked: true,
  rateLimitPreflight: true,
  dynamicOriginValidation: true,
  suspiciousRequestDetection: true,
  vercelDeploymentSupport: true,
  securityHeaders: true
}).middleware();

export const productionCorsMiddleware = new EnhancedCorsMiddleware({
  strictOriginValidation: true,
  logBlocked: true,
  rateLimitPreflight: true,
  dynamicOriginValidation: true,
  suspiciousRequestDetection: true,
  vercelDeploymentSupport: true,
  securityHeaders: true
}).middleware();

/**
 * Get environment-appropriate CORS middleware
 */
export const getEnvironmentCorsMiddleware = (): any => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return productionCorsMiddleware;
    case 'staging':
      return stagingCorsMiddleware;
    case 'development':
    default:
      return developmentCorsMiddleware;
  }
};

export default enhancedCorsMiddleware;

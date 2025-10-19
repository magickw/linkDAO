import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

// CORS configuration interface
export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
}

// Environment-specific CORS configurations
const CORS_CONFIGS = {
  development: {
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:8080'
    ],
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
      'X-Chain-ID'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'RateLimit-Policy'
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 200
  },
  
  production: {
    allowedOrigins: [
      'https://linkdao.io',
      'https://www.linkdao.io',
      'https://app.linkdao.io',
      'https://marketplace.linkdao.io'
    ],
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
      'X-Chain-ID'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'RateLimit-Policy'
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 200
  },
  
  staging: {
    allowedOrigins: [
      'https://staging.linkdao.io',
      'https://staging-app.linkdao.io',
      'https://staging-marketplace.linkdao.io',
      'http://localhost:3000', // For testing
      'http://localhost:3001'
    ],
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
      'X-Chain-ID'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'RateLimit-Policy'
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 200
  }
} as const;

/**
 * CORS utility class for managing cross-origin requests
 */
export class CorsManager {
  private config: CorsConfig;
  private environment: string;

  constructor(environment: string = process.env.NODE_ENV || 'development') {
    this.environment = environment;
    this.config = this.getConfigForEnvironment(environment);
  }

  /**
   * Get CORS configuration for specific environment
   */
  private getConfigForEnvironment(env: string): CorsConfig {
    const envConfig = CORS_CONFIGS[env as keyof typeof CORS_CONFIGS] || CORS_CONFIGS.development;
    
    // Add environment variables if available
    const additionalOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
    
    return {
      ...envConfig,
      allowedOrigins: [...envConfig.allowedOrigins, ...additionalOrigins]
    };
  }

  /**
   * Create CORS middleware with dynamic origin validation
   */
  public createCorsMiddleware() {
    return cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
          return callback(null, true);
        }

        // Check if origin is in allowed list
        if (this.config.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // In development, allow localhost with any port
        if (this.environment === 'development' && this.isLocalhostOrigin(origin)) {
          return callback(null, true);
        }

        // Log blocked origin for monitoring
        logger.warn('CORS origin blocked', {
          origin,
          environment: this.environment,
          allowedOrigins: this.config.allowedOrigins,
          userAgent: 'unknown', // Will be filled by request context
          timestamp: new Date().toISOString()
        });

        // Block the request
        const error = new Error(`Origin ${origin} not allowed by CORS policy`);
        (error as any).status = 403;
        callback(error, false);
      },
      
      methods: this.config.allowedMethods,
      allowedHeaders: this.config.allowedHeaders,
      exposedHeaders: this.config.exposedHeaders,
      credentials: this.config.credentials,
      maxAge: this.config.maxAge,
      preflightContinue: this.config.preflightContinue,
      optionsSuccessStatus: this.config.optionsSuccessStatus
    });
  }

  /**
   * Check if origin is localhost (for development)
   */
  private isLocalhostOrigin(origin: string): boolean {
    try {
      const url = new URL(origin);
      return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }

  /**
   * Validate origin against allowed list
   */
  public isOriginAllowed(origin: string): boolean {
    if (!origin) return true; // Allow requests with no origin
    
    if (this.config.allowedOrigins.includes(origin)) return true;
    
    if (this.environment === 'development' && this.isLocalhostOrigin(origin)) {
      return true;
    }
    
    return false;
  }

  /**
   * Get current CORS configuration
   */
  public getConfig(): CorsConfig {
    return { ...this.config };
  }

  /**
   * Update allowed origins dynamically
   */
  public addAllowedOrigin(origin: string): void {
    if (!this.config.allowedOrigins.includes(origin)) {
      this.config.allowedOrigins.push(origin);
      logger.info('Added new allowed CORS origin', { origin });
    }
  }

  /**
   * Remove allowed origin
   */
  public removeAllowedOrigin(origin: string): void {
    const index = this.config.allowedOrigins.indexOf(origin);
    if (index > -1) {
      this.config.allowedOrigins.splice(index, 1);
      logger.info('Removed allowed CORS origin', { origin });
    }
  }
}

// Create default CORS manager instance
export const corsManager = new CorsManager();

// Export pre-configured CORS middleware
export const corsMiddleware = corsManager.createCorsMiddleware();

/**
 * Enhanced CORS middleware with additional security checks
 */
export const enhancedCorsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  const userAgent = req.get('User-Agent');

  // Log CORS request for monitoring
  if (origin) {
    logger.debug('CORS request received', {
      origin,
      referer,
      userAgent,
      method: req.method,
      path: req.path,
      ip: req.ip
    });
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /bot|crawler|spider/i,
    /curl|wget|postman/i,
    /scanner|exploit/i
  ];

  if (userAgent && suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    logger.warn('Suspicious CORS request detected', {
      origin,
      userAgent,
      ip: req.ip,
      method: req.method,
      path: req.path
    });
  }

  // Apply standard CORS middleware
  corsMiddleware(req, res, next);
};

/**
 * CORS preflight handler for complex requests
 */
export const corsPreflightHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'OPTIONS') {
    const origin = req.get('Origin');
    const requestMethod = req.get('Access-Control-Request-Method');
    const requestHeaders = req.get('Access-Control-Request-Headers');

    logger.debug('CORS preflight request', {
      origin,
      requestMethod,
      requestHeaders,
      ip: req.ip
    });

    // Validate the preflight request
    if (!corsManager.isOriginAllowed(origin || '')) {
      return ApiResponse.forbidden(res, 'Origin not allowed by CORS policy');
    }

    if (requestMethod && !corsManager.getConfig().allowedMethods.includes(requestMethod)) {
      return ApiResponse.forbidden(res, `Method ${requestMethod} not allowed by CORS policy`);
    }

    // Set CORS headers for preflight
    res.set({
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': corsManager.getConfig().allowedMethods.join(', '),
      'Access-Control-Allow-Headers': corsManager.getConfig().allowedHeaders.join(', '),
      'Access-Control-Max-Age': corsManager.getConfig().maxAge.toString(),
      'Access-Control-Allow-Credentials': corsManager.getConfig().credentials.toString()
    });

    res.status(corsManager.getConfig().optionsSuccessStatus).end();
    return;
  }

  next();
};

/**
 * CORS error handler
 */
export const corsErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error.message && error.message.includes('CORS')) {
    logger.error('CORS error', {
      error: error.message,
      origin: req.get('Origin'),
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return ApiResponse.forbidden(res, 'Cross-origin request blocked by CORS policy', {
      origin: req.get('Origin'),
      allowedOrigins: corsManager.getConfig().allowedOrigins,
      requestId: res.locals.requestId
    });
  }

  next(error);
};

/**
 * Middleware to add security headers related to CORS
 */
export const corsSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Add security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  });

  next();
};

/**
 * Development-only CORS middleware (very permissive)
 */
export const developmentCorsMiddleware = cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*']
});

/**
 * Production CORS middleware (strict)
 */
export const productionCorsMiddleware = corsManager.createCorsMiddleware();

/**
 * Get appropriate CORS middleware based on environment
 */
export const getEnvironmentCorsMiddleware = (): any => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return productionCorsMiddleware;
    case 'staging':
      return corsManager.createCorsMiddleware();
    case 'development':
    default:
      return developmentCorsMiddleware;
  }
};

// Export CORS configurations for testing and documentation
export { CORS_CONFIGS };
import express, { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

interface GatewayConfig {
  cors: {
    origin: string[] | boolean;
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  rateLimit: {
    windowMs: number;
    max: number;
    message: string | object;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
  compression: {
    level: number;
    threshold: number;
    filter: (req: Request, res: Response) => boolean;
  };
  security: {
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean | object;
    hidePoweredBy: boolean;
    hsts: boolean;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: boolean | object;
    xssFilter: boolean;
  };
}

class APIGatewayManager {
  private config: GatewayConfig;
  private app: express.Application;

  constructor(app: express.Application) {
    this.app = app;
    this.config = this.loadConfiguration();
  }

  private loadConfiguration(): GatewayConfig {
    const isProduction = process.env.NODE_ENV === 'production';

    // CORS FIX: Hardcoded allowed origins (no environment variables)
    // This prevents multiple origins being set as a comma-separated string
    const allowedOrigins = isProduction
      ? [
          'https://www.linkdao.io',
          'https://linkdao.io',
          'https://linkdao.vercel.app',
          'https://www.linkdao.vercel.app'
        ]
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000'
        ];

    return {
      cors: {
        origin: isProduction ? allowedOrigins : true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: [
          'Origin',
          'X-Requested-With',
          'Content-Type',
          'Accept',
          'Authorization',
          'X-API-Key',
          'X-Request-ID'
        ]
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
      },
      compression: {
        level: 6,
        threshold: 1024,
        filter: (req: Request, res: Response) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        }
      },
      security: {
        contentSecurityPolicy: isProduction,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        dnsPrefetchControl: true,
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        hsts: isProduction,
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: false,
        referrerPolicy: { policy: 'same-origin' },
        xssFilter: true
      }
    };
  }

  setupMiddleware(): void {
    safeLogger.info('🛡️ Setting up API Gateway middleware...');

    // Security headers
    this.app.use(helmet(this.config.security));

    // CORS configuration
    this.app.use(cors(this.config.cors));

    // Compression
    this.app.use(compression(this.config.compression));

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request ID middleware
    this.app.use(this.requestIdMiddleware);

    // Request logging
    this.app.use(this.requestLoggingMiddleware);

    // Global rate limiting
    const limiter = rateLimit(this.config.rateLimit);
    this.app.use('/api/', limiter);

    // API-specific rate limits
    this.setupAPISpecificRateLimits();

    safeLogger.info('✅ API Gateway middleware configured');
  }

  private requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.headers['x-request-id'] as string ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    next();
  }

  private requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const requestId = req.headers['x-request-id'];

    // Log request
    safeLogger.info(`📥 ${req.method} ${req.path} [${requestId}]`);

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const statusEmoji = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';

      safeLogger.info(`📤 ${statusEmoji} ${status} ${req.method} ${req.path} [${requestId}] ${duration}ms`);
    });

    next();
  }

  private setupAPISpecificRateLimits(): void {
    // Authentication endpoints - stricter limits
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 attempts per window
      message: 'Too many authentication attempts, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/auth/', authLimiter);

    // Profile update endpoints - moderate limits
    const profileLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // 20 updates per window
      message: 'Too many profile updates, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/marketplace/seller/profile', profileLimiter);

    // Listing creation - moderate limits
    const listingLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50, // 50 listings per hour
      message: 'Too many listing creations, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/marketplace/listings', listingLimiter);
  }

  setupHealthChecks(): void {
    // Basic health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Detailed health check
    this.app.get('/health/detailed', async (req: Request, res: Response) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
          services: {
            database: await this.checkDatabaseHealth(),
            redis: await this.checkRedisHealth(),
            memory: this.getMemoryUsage(),
            cpu: process.cpuUsage()
          }
        };

        const overallHealthy = Object.values(health.services)
          .every(service => service.status === 'healthy');

        res.status(overallHealthy ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private async checkDatabaseHealth(): Promise<any> {
    try {
      // This would integrate with your database health check
      return { status: 'healthy', latency: 0 };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkRedisHealth(): Promise<any> {
    try {
      const { getRedisManager } = await import('./redis-production');
      const redisManager = getRedisManager();
      return await redisManager.healthCheck();
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private getMemoryUsage(): any {
    const usage = process.memoryUsage();
    return {
      status: 'healthy',
      rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(usage.external / 1024 / 1024)} MB`
    };
  }

  setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'];

      safeLogger.error(`💥 Error [${requestId}]:`, error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: process.env.NODE_ENV === 'production'
            ? 'An internal server error occurred'
            : error.message,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
    });
  }

  getConfiguration(): GatewayConfig {
    return this.config;
  }
}

export { APIGatewayManager, GatewayConfig };

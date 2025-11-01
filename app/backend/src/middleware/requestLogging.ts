import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { alertService } from '../services/alertService';

// Request logging interface
interface RequestLog {
  requestId: string;
  method: string;
  url: string;
  path: string;
  query: any;
  headers: {
    userAgent?: string;
    contentType?: string;
    authorization?: string;
    origin?: string;
    referer?: string;
  };
  ip: string;
  timestamp: string;
  responseTime?: number;
  statusCode?: number;
  contentLength?: number;
  error?: any;
}

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Request logging middleware
export const requestLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Add request ID to response locals for use in other middleware
  res.locals.requestId = requestId;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Create initial request log
  const requestLog: RequestLog = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    headers: {
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      authorization: req.get('Authorization') ? '[REDACTED]' : undefined,
      origin: req.get('Origin'),
      referer: req.get('Referer')
    },
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    timestamp: new Date().toISOString()
  };

  // Log incoming request
  logger.info(`Incoming ${req.method} ${req.originalUrl}`, {
    requestId,
    ip: requestLog.ip,
    userAgent: requestLog.headers.userAgent,
    query: Object.keys(req.query).length > 0 ? req.query : undefined
  });

  // Override res.json to capture response data
  const originalJson = res.json;
  res.json = function(body: any) {
    const responseTime = Date.now() - startTime;
    
    // Update request log with response data
    requestLog.responseTime = responseTime;
    requestLog.statusCode = res.statusCode;
    requestLog.contentLength = JSON.stringify(body).length;

    // Record performance metrics
    performanceMonitoringService.recordRequest(
      req.method,
      req.route?.path || req.path,
      responseTime,
      res.statusCode,
      res.statusCode >= 400 ? body.error : undefined
    );

    // Log response
    if (res.statusCode >= 500) {
      logger.error(`Request ${requestId} failed`, {
        ...requestLog,
        responseBody: body,
        performance: {
          responseTime,
          memoryUsage: process.memoryUsage()
        }
      });

      // Alert on server errors
      if (res.statusCode >= 500) {
        alertService.createAlert(
          'service_down',
          `Server Error: ${req.method} ${req.originalUrl}`,
          `Server error ${res.statusCode} occurred for ${req.method} ${req.originalUrl}`,
          'api',
          {
            statusCode: res.statusCode,
            responseTime,
            error: body.error,
            requestId
          },
          'high'
        );
      }
    } else if (res.statusCode >= 400) {
      logger.warn(`Request ${requestId} client error`, {
        ...requestLog,
        responseBody: body
      });
    } else {
      logger.info(`Request ${requestId} completed`, {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime,
        contentLength: requestLog.contentLength,
        performance: {
          responseTime
        }
      });
    }

    // Call original json method
    return originalJson.call(this, body);
  };

  // Handle response finish event for cases where res.json isn't called
  res.on('finish', () => {
    if (!requestLog.responseTime) {
      const responseTime = Date.now() - startTime;
      requestLog.responseTime = responseTime;
      requestLog.statusCode = res.statusCode;

      // Record performance metrics
      performanceMonitoringService.recordRequest(
        req.method,
        req.route?.path || req.path,
        responseTime,
        res.statusCode
      );

      logger.info(`Request ${requestId} finished`, {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime,
        performance: {
          responseTime
        }
      });
    }
  });

  next();
};

// Performance monitoring middleware
export const performanceMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Add start time to request for use in other middleware
  (req as any).startTime = startTime;
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Log slow requests (> 2 seconds)
    if (responseTime > 2000) {
      logger.warn(`Slow request detected`, {
        requestId: res.locals.requestId,
        method: req.method,
        url: req.originalUrl,
        responseTime,
        statusCode: res.statusCode,
        performance: {
          responseTime,
          memoryUsage: process.memoryUsage()
        }
      });

      // Alert on very slow requests
      if (responseTime > 5000) {
        alertService.alertSlowResponse(
          `${req.method} ${req.originalUrl}`,
          responseTime
        );
      }
    }
    
    // Log very slow requests (> 5 seconds) as errors
    if (responseTime > 5000) {
      logger.error(`Very slow request detected`, {
        requestId: res.locals.requestId,
        method: req.method,
        url: req.originalUrl,
        responseTime,
        statusCode: res.statusCode,
        query: req.query,
        body: req.body,
        performance: {
          responseTime,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        },
        critical: true
      });
    }
  });
  
  next();
};

// Request size monitoring middleware
export const requestSizeMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const contentLength = parseInt(req.get('Content-Length') || '0', 10);
  
  // Log large requests (> 5MB)
  if (contentLength > 5 * 1024 * 1024) {
    logger.warn(`Large request detected`, {
      requestId: res.locals.requestId,
      method: req.method,
      url: req.originalUrl,
      contentLength,
      contentType: req.get('Content-Type')
    });
  }
  
  next();
};

// Error correlation middleware
export const errorCorrelationMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Add request ID to error for correlation
  if (error && res.locals.requestId) {
    error.requestId = res.locals.requestId;
  }
  
  // Log error with full context
  logger.error(`Request ${res.locals.requestId} error`, {
    requestId: res.locals.requestId,
    method: req.method,
    url: req.originalUrl,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    request: {
      query: req.query,
      body: req.body,
      headers: {
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        origin: req.get('Origin')
      },
      ip: req.ip
    }
  });
  
  next(error);
};

// Health check exclusion middleware
export const healthCheckExclusionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip detailed logging for health check endpoints
  if (req.path === '/health' || req.path === '/ping' || req.path === '/') {
    return next();
  }
  
  // Apply logging for all other requests
  requestLoggingMiddleware(req, res, next);
};

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { alertService } from '../services/alertService';

// Enhanced request logging interface with more comprehensive data
interface EnhancedRequestLog {
  requestId: string;
  correlationId: string;
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
    xForwardedFor?: string;
    xRealIp?: string;
    accept?: string;
    acceptEncoding?: string;
    acceptLanguage?: string;
    cacheControl?: string;
    connection?: string;
    host?: string;
  };
  ip: string;
  timestamp: string;
  startTime: number;
  responseTime?: number;
  statusCode?: number;
  contentLength?: number;
  responseHeaders?: Record<string, string>;
  error?: any;
  user?: {
    id?: string;
    walletAddress?: string;
    sessionId?: string;
  };
  performance?: {
    memoryUsage?: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
    responseTime?: number;
    dbQueryTime?: number;
    cacheHits?: number;
    cacheMisses?: number;
  };
  security?: {
    suspicious?: boolean;
    riskScore?: number;
    threats?: string[];
  };
  business?: {
    operation?: string;
    entityId?: string;
    entityType?: string;
    outcome?: 'success' | 'failure' | 'partial';
  };
}

// Request context for tracking across middleware
interface RequestContext {
  requestId: string;
  correlationId: string;
  startTime: number;
  dbQueries: number;
  cacheOperations: { hits: number; misses: number };
  securityFlags: string[];
  businessContext?: {
    operation?: string;
    entityId?: string;
    entityType?: string;
  };
}

// Generate unique request ID with more entropy
const generateRequestId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 12);
  const counter = (global as any).requestCounter = ((global as any).requestCounter || 0) + 1;
  return `req_${timestamp}_${random}_${counter.toString(36)}`;
};

// Generate correlation ID if not provided
const generateCorrelationId = (req: Request): string => {
  return req.get('X-Correlation-ID') || 
         req.get('X-Request-ID') || 
         req.get('X-Trace-ID') ||
         generateRequestId();
};

// Enhanced request logging middleware with comprehensive monitoring
export const enhancedRequestLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const correlationId = generateCorrelationId(req);
  
  // Initialize request context
  const requestContext: RequestContext = {
    requestId,
    correlationId,
    startTime,
    dbQueries: 0,
    cacheOperations: { hits: 0, misses: 0 },
    securityFlags: []
  };

  // Add context to request and response
  (req as any).context = requestContext;
  res.locals.requestId = requestId;
  res.locals.correlationId = correlationId;
  res.locals.startTime = startTime;
  
  // Add correlation headers to response
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Create comprehensive request log
  const requestLog: EnhancedRequestLog = {
    requestId,
    correlationId,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    headers: {
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      authorization: req.get('Authorization') ? '[REDACTED]' : undefined,
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      xForwardedFor: req.get('X-Forwarded-For'),
      xRealIp: req.get('X-Real-IP'),
      accept: req.get('Accept'),
      acceptEncoding: req.get('Accept-Encoding'),
      acceptLanguage: req.get('Accept-Language'),
      cacheControl: req.get('Cache-Control'),
      connection: req.get('Connection'),
      host: req.get('Host')
    },
    ip: getClientIP(req),
    timestamp: new Date().toISOString(),
    startTime,
    user: {
      id: (req as any).user?.id || (req as any).userId,
      walletAddress: (req as any).user?.walletAddress || (req as any).walletAddress,
      sessionId: req.get('X-Session-ID') || (req as any).sessionId
    },
    security: {
      suspicious: false,
      riskScore: 0,
      threats: []
    }
  };

  // Perform security analysis
  performSecurityAnalysis(req, requestLog);

  // Log incoming request with appropriate level
  const logLevel = shouldLogRequest(req) ? 'info' : 'debug';
  logger[logLevel](`Incoming ${req.method} ${req.originalUrl}`, {
    requestId,
    correlationId,
    ip: requestLog.ip,
    userAgent: requestLog.headers.userAgent,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    contentLength: req.get('Content-Length'),
    security: requestLog.security?.suspicious ? requestLog.security : undefined
  });

  // Override res.json to capture response data
  const originalJson = res.json;
  res.json = function(body: any) {
    const responseTime = Date.now() - startTime;
    
    // Update request log with response data
    requestLog.responseTime = responseTime;
    requestLog.statusCode = res.statusCode;
    requestLog.contentLength = JSON.stringify(body).length;
    requestLog.responseHeaders = getResponseHeaders(res);
    requestLog.performance = {
      responseTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      dbQueryTime: (req as any).dbQueryTime || 0,
      cacheHits: requestContext.cacheOperations.hits,
      cacheMisses: requestContext.cacheOperations.misses
    };

    // Determine business outcome
    requestLog.business = {
      ...requestContext.businessContext,
      outcome: res.statusCode < 400 ? 'success' : 'failure'
    };

    // Record performance metrics
    recordPerformanceMetrics(req, res, responseTime, requestLog);

    // Log response with comprehensive data
    logResponse(requestLog, body);

    // Check for alerts
    checkForAlerts(requestLog, body);

    // Call original json method
    return originalJson.call(this, body);
  };

  // Handle response finish event for cases where res.json isn't called
  res.on('finish', () => {
    if (!requestLog.responseTime) {
      const responseTime = Date.now() - startTime;
      requestLog.responseTime = responseTime;
      requestLog.statusCode = res.statusCode;
      requestLog.responseHeaders = getResponseHeaders(res);
      requestLog.performance = {
        responseTime,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        dbQueryTime: (req as any).dbQueryTime || 0,
        cacheHits: requestContext.cacheOperations.hits,
        cacheMisses: requestContext.cacheOperations.misses
      };

      // Record performance metrics
      recordPerformanceMetrics(req, res, responseTime, requestLog);

      // Log completion
      logger.info(`Request ${requestId} finished`, {
        requestId,
        correlationId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime,
        performance: requestLog.performance
      });

      // Check for alerts
      checkForAlerts(requestLog);
    }
  });

  // Handle request errors
  res.on('error', (error) => {
    requestLog.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };

    logger.error(`Request ${requestId} error`, {
      requestId,
      correlationId,
      error: requestLog.error,
      request: {
        method: req.method,
        url: req.originalUrl,
        headers: requestLog.headers
      }
    });
  });

  next();
};

// Get real client IP address
function getClientIP(req: Request): string {
  return req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         req.get('X-Real-IP') ||
         req.get('X-Client-IP') ||
         req.ip ||
         req.socket.remoteAddress ||
         'unknown';
}

// Perform security analysis on incoming request
function performSecurityAnalysis(req: Request, requestLog: EnhancedRequestLog): void {
  const threats: string[] = [];
  let riskScore = 0;

  // Check for suspicious patterns in URL
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /data:.*base64/i,  // Data URI attacks
    /\beval\b/i,  // Code evaluation
    /\bexec\b/i   // Command execution
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(req.originalUrl) || pattern.test(JSON.stringify(req.query))) {
      threats.push(`Suspicious pattern detected: ${pattern.source}`);
      riskScore += 25;
    }
  }

  // Check for suspicious headers
  const userAgent = req.get('User-Agent') || '';
  if (!userAgent || userAgent.length < 10) {
    threats.push('Missing or suspicious User-Agent');
    riskScore += 10;
  }

  // Check for automated tools
  const automatedToolPatterns = [
    /curl/i, /wget/i, /python/i, /bot/i, /crawler/i, /spider/i
  ];
  
  if (automatedToolPatterns.some(pattern => pattern.test(userAgent))) {
    threats.push('Automated tool detected');
    riskScore += 5;
  }

  // Check request size
  const contentLength = parseInt(req.get('Content-Length') || '0', 10);
  if (contentLength > 10 * 1024 * 1024) { // 10MB
    threats.push('Large request size');
    riskScore += 15;
  }

  // Check for rapid requests (would need rate limiting data)
  // This would integrate with rate limiting service

  // Update security info
  requestLog.security = {
    suspicious: riskScore > 20,
    riskScore,
    threats
  };

  // Log security concerns
  if (requestLog.security.suspicious) {
    logger.warn(`Suspicious request detected`, {
      requestId: requestLog.requestId,
      ip: requestLog.ip,
      userAgent: requestLog.headers.userAgent,
      threats,
      riskScore,
      url: req.originalUrl
    });
  }
}

// Determine if request should be logged (skip health checks, etc.)
function shouldLogRequest(req: Request): boolean {
  const skipPaths = ['/health', '/ping', '/favicon.ico', '/robots.txt'];
  return !skipPaths.includes(req.path);
}

// Get response headers for logging
function getResponseHeaders(res: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerNames = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified'];
  
  for (const name of headerNames) {
    const value = res.get(name);
    if (value) {
      headers[name] = value;
    }
  }
  
  return headers;
}

// Record performance metrics
function recordPerformanceMetrics(
  req: Request, 
  res: Response, 
  responseTime: number, 
  requestLog: EnhancedRequestLog
): void {
  try {
    performanceMonitoringService.recordRequest(
      req.method,
      req.route?.path || req.path,
      responseTime,
      res.statusCode,
      res.statusCode >= 400 ? 'error' : undefined
    );

    // Additional metrics would be recorded here if the service supported it
    // For now, we rely on the existing recordRequest method
  } catch (error) {
    logger.error('Failed to record performance metrics', { error: error.message });
  }
}

// Log response with appropriate level and detail
function logResponse(requestLog: EnhancedRequestLog, responseBody?: any): void {
  const { statusCode, responseTime, requestId, correlationId } = requestLog;
  
  if (statusCode >= 500) {
    logger.error(`Request ${requestId} failed with server error`, {
      ...requestLog,
      responseBody: responseBody,
      critical: true
    });
  } else if (statusCode >= 400) {
    logger.warn(`Request ${requestId} failed with client error`, {
      ...requestLog,
      responseBody: responseBody
    });
  } else if (responseTime > 2000) {
    logger.warn(`Request ${requestId} completed slowly`, {
      ...requestLog,
      performance: requestLog.performance
    });
  } else {
    logger.info(`Request ${requestId} completed successfully`, {
      requestId,
      correlationId,
      method: requestLog.method,
      url: requestLog.url,
      statusCode,
      responseTime,
      contentLength: requestLog.contentLength,
      performance: {
        responseTime,
        cacheHits: requestLog.performance?.cacheHits,
        cacheMisses: requestLog.performance?.cacheMisses
      }
    });
  }
}

// Check for conditions that require alerts
function checkForAlerts(requestLog: EnhancedRequestLog, responseBody?: any): void {
  const { statusCode, responseTime, requestId, security } = requestLog;

  try {
    // Alert on server errors
    if (statusCode >= 500) {
      alertService.createAlert(
        'service_down',
        `Server Error: ${requestLog.method} ${requestLog.url}`,
        `Server error ${statusCode} occurred for ${requestLog.method} ${requestLog.url}`,
        'api',
        {
          statusCode,
          responseTime,
          error: responseBody?.error,
          requestId,
          correlationId: requestLog.correlationId
        },
        'high'
      );
    }

    // Alert on very slow requests
    if (responseTime > 5000) {
      alertService.alertSlowResponse(
        `${requestLog.method} ${requestLog.url}`,
        responseTime
      );
    }

    // Alert on suspicious activity
    if (security?.suspicious && security.riskScore > 50) {
      alertService.createAlert(
        'security_breach',
        `Suspicious Activity Detected`,
        `High-risk request detected from ${requestLog.ip}`,
        'security',
        {
          ip: requestLog.ip,
          userAgent: requestLog.headers.userAgent,
          threats: security.threats,
          riskScore: security.riskScore,
          requestId
        },
        'medium'
      );
    }

    // Alert on high error rates (would need additional tracking)
    // This could be implemented with a sliding window counter

  } catch (error) {
    logger.error('Failed to create alert', { error: error.message, requestId });
  }
}

// Middleware to track database queries
export const databaseQueryTrackingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const context = (req as any).context as RequestContext;
  if (!context) return next();

  // Track database query time
  const originalQuery = (req as any).db?.query;
  if (originalQuery) {
    (req as any).db.query = function(...args: any[]) {
      const start = Date.now();
      const result = originalQuery.apply(this, args);
      
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          const queryTime = Date.now() - start;
          (req as any).dbQueryTime = ((req as any).dbQueryTime || 0) + queryTime;
          context.dbQueries++;
        });
      }
      
      const queryTime = Date.now() - start;
      (req as any).dbQueryTime = ((req as any).dbQueryTime || 0) + queryTime;
      context.dbQueries++;
      return result;
    };
  }

  next();
};

// Middleware to track cache operations
export const cacheOperationTrackingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const context = (req as any).context as RequestContext;
  if (!context) return next();

  // This would integrate with your cache service to track hits/misses
  // Implementation depends on your cache service structure

  next();
};

// Middleware to set business context
export const businessContextMiddleware = (
  operation: string,
  entityType?: string
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const context = (req as any).context as RequestContext;
    if (context) {
      context.businessContext = {
        operation,
        entityType,
        entityId: req.params.id || req.body?.id
      };
    }
    next();
  };
};

// Export helper functions for use in routes
export const RequestLoggingHelpers = {
  addSecurityFlag: (req: Request, flag: string) => {
    const context = (req as any).context as RequestContext;
    if (context) {
      context.securityFlags.push(flag);
    }
  },

  incrementCacheHit: (req: Request) => {
    const context = (req as any).context as RequestContext;
    if (context) {
      context.cacheOperations.hits++;
    }
  },

  incrementCacheMiss: (req: Request) => {
    const context = (req as any).context as RequestContext;
    if (context) {
      context.cacheOperations.misses++;
    }
  },

  setBusinessContext: (req: Request, operation: string, entityId?: string, entityType?: string) => {
    const context = (req as any).context as RequestContext;
    if (context) {
      context.businessContext = { operation, entityId, entityType };
    }
  }
};

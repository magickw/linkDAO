import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';
import { PerformanceOptimizationManager } from '../config/performanceConfig';
import { safeLogger } from '../utils/safeLogger';

interface PerformanceRequest extends Request {
  startTime?: number;
  performanceManager?: PerformanceOptimizationManager;
}

export class PerformanceMiddleware {
  private performanceManager: PerformanceOptimizationManager;

  constructor(performanceManager: PerformanceOptimizationManager) {
    this.performanceManager = performanceManager;
  }

  // Middleware to track request performance
  trackRequestPerformance() {
    return (req: PerformanceRequest, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      req.startTime = startTime;
      req.performanceManager = this.performanceManager;

      // Track request start
      this.performanceManager.recordMetric('http.request.started', 1, 'count', {
        method: req.method,
        endpoint: req.route?.path || req.path,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        // Record response metrics
        req.performanceManager?.recordMetric('http.request.duration', responseTime, 'ms', {
          method: req.method,
          endpoint: req.route?.path || req.path,
          statusCode: res.statusCode.toString(),
        });

        req.performanceManager?.recordMetric('http.request.completed', 1, 'count', {
          method: req.method,
          endpoint: req.route?.path || req.path,
          statusCode: res.statusCode.toString(),
        });

        // Track errors
        if (res.statusCode >= 400) {
          req.performanceManager?.recordMetric('http.request.errors', 1, 'count', {
            method: req.method,
            endpoint: req.route?.path || req.path,
            statusCode: res.statusCode.toString(),
          });
        }

        // Log slow requests
        if (responseTime > 2000) {
          safeLogger.warn(`Slow request detected: ${req.method} ${req.path} took ${responseTime.toFixed(2)}ms`);
        }

        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  // Middleware for load balancing
  loadBalance() {
    return (req: PerformanceRequest, res: Response, next: NextFunction) => {
      const clientIp = req.ip || req.connection.remoteAddress;
      const region = req.get('CloudFront-Viewer-Country') || req.get('X-Region');

      try {
        const server = this.performanceManager.getNextServer(clientIp, region);
        
        if (server) {
          // Add server info to request headers for downstream services
          req.headers['x-assigned-server'] = server.id;
          req.headers['x-server-region'] = server.region || 'unknown';
          
          // Track connection
          this.performanceManager.getLoadBalancer()?.incrementConnections(server.id);
          
          // Cleanup on response end
          res.on('finish', () => {
            this.performanceManager.getLoadBalancer()?.decrementConnections(server.id);
          });
        }
      } catch (error) {
        safeLogger.error('Load balancing error:', error);
        // Continue without load balancing if there's an error
      }

      next();
    };
  }

  // Middleware for caching responses
  cacheResponse(ttl: number = 300) {
    return async (req: PerformanceRequest, res: Response, next: NextFunction) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = `response:${req.originalUrl}`;
      
      try {
        const cached = await this.performanceManager.getCachedData(cacheKey);
        
        if (cached) {
          this.performanceManager.recordMetric('cache.hit', 1, 'count', {
            endpoint: req.path,
          });
          
          res.set('X-Cache', 'HIT');
          return res.json(cached);
        }

        this.performanceManager.recordMetric('cache.miss', 1, 'count', {
          endpoint: req.path,
        });

        // Override res.json to cache the response
        const originalJson = res.json;
        res.json = function(data: any) {
          // Cache successful responses
          if (res.statusCode === 200) {
            req.performanceManager?.cacheData(cacheKey, data, ttl).catch(error => {
              safeLogger.error('Cache write error:', error);
            });
          }
          
          res.set('X-Cache', 'MISS');
          return originalJson.call(this, data);
        };

      } catch (error) {
        safeLogger.error('Cache middleware error:', error);
        // Continue without caching if there's an error
      }

      next();
    };
  }

  // Middleware for database query optimization
  optimizeDatabase() {
    return (req: PerformanceRequest, res: Response, next: NextFunction) => {
      // Add database service to request for easy access
      req.db = {
        query: async (sql: string, params: any[] = [], cacheKey?: string, cacheTTL?: number) => {
          const startTime = performance.now();
          
          try {
            const result = await req.performanceManager!.optimizeQuery(sql, params, cacheKey, cacheTTL);
            const endTime = performance.now();
            
            req.performanceManager!.recordMetric('database.query.duration', endTime - startTime, 'ms', {
              operation: sql.split(' ')[0].toUpperCase(), // SELECT, INSERT, UPDATE, DELETE
            });
            
            return result;
          } catch (error) {
            const endTime = performance.now();
            
            req.performanceManager!.recordMetric('database.query.error', 1, 'count', {
              operation: sql.split(' ')[0].toUpperCase(),
            });
            
            req.performanceManager!.recordMetric('database.query.duration', endTime - startTime, 'ms', {
              operation: sql.split(' ')[0].toUpperCase(),
              error: 'true',
            });
            
            throw error;
          }
        }
      };

      next();
    };
  }

  // Middleware for CDN asset handling
  handleCDNAssets() {
    return (req: PerformanceRequest, res: Response, next: NextFunction) => {
      // Add CDN helper to request
      req.cdn = {
        uploadAsset: async (key: string, buffer: Buffer, contentType: string) => {
          const startTime = performance.now();
          
          try {
            const url = await req.performanceManager!.uploadToCDN(key, buffer, contentType);
            const endTime = performance.now();
            
            req.performanceManager!.recordMetric('cdn.upload.duration', endTime - startTime, 'ms', {
              contentType,
              size: buffer.length.toString(),
            });
            
            return url;
          } catch (error) {
            const endTime = performance.now();
            
            req.performanceManager!.recordMetric('cdn.upload.error', 1, 'count', {
              contentType,
            });
            
            req.performanceManager!.recordMetric('cdn.upload.duration', endTime - startTime, 'ms', {
              contentType,
              error: 'true',
            });
            
            throw error;
          }
        }
      };

      next();
    };
  }

  // Middleware for performance monitoring
  monitorPerformance() {
    return (req: PerformanceRequest, res: Response, next: NextFunction) => {
      // Add monitoring helpers to request
      req.monitor = {
        recordMetric: (name: string, value: number, unit?: string, tags?: Record<string, string>) => {
          req.performanceManager!.recordMetric(name, value, unit, tags);
        },
        
        recordEvent: (event: string, data?: any) => {
          req.performanceManager!.recordMetric(`event.${event}`, 1, 'count', {
            endpoint: req.path,
            method: req.method,
            ...data,
          });
        },
        
        startTimer: (name: string) => {
          const startTime = performance.now();
          return {
            end: (tags?: Record<string, string>) => {
              const duration = performance.now() - startTime;
              req.performanceManager!.recordMetric(name, duration, 'ms', tags);
              return duration;
            }
          };
        }
      };

      next();
    };
  }

  // Error handling middleware for performance issues
  handlePerformanceErrors() {
    return (error: any, req: PerformanceRequest, res: Response, next: NextFunction) => {
      // Record error metrics
      this.performanceManager.recordMetric('error.occurred', 1, 'count', {
        type: error.name || 'UnknownError',
        endpoint: req.path,
        method: req.method,
      });

      // Log performance context if available
      if (req.startTime) {
        const errorTime = performance.now() - req.startTime;
        this.performanceManager.recordMetric('error.response_time', errorTime, 'ms', {
          type: error.name || 'UnknownError',
          endpoint: req.path,
        });
      }

      next(error);
    };
  }
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      performanceManager?: PerformanceOptimizationManager;
      db?: {
        query: (sql: string, params?: any[], cacheKey?: string, cacheTTL?: number) => Promise<any[]>;
      };
      cdn?: {
        uploadAsset: (key: string, buffer: Buffer, contentType: string) => Promise<string>;
      };
      monitor?: {
        recordMetric: (name: string, value: number, unit?: string, tags?: Record<string, string>) => void;
        recordEvent: (event: string, data?: any) => void;
        startTimer: (name: string) => { end: (tags?: Record<string, string>) => number };
      };
    }
  }
}
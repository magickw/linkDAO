import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { performanceMonitoringService } from '../services/performanceMonitoringService';

interface ExtendedRequest extends Request {
  startTime?: number;
  dbQueryTime?: number;
}

export function performanceMiddleware(req: ExtendedRequest, res: Response, next: NextFunction): void {
  // Record start time
  req.startTime = performance.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(this: Response, ...args: any[]) {
    if (req.startTime) {
      const responseTime = performance.now() - req.startTime;
      
      // Record the metric
      performanceMonitoringService.recordMetric({
        responseTime: Math.round(responseTime),
        endpoint: req.route?.path || req.path,
        method: req.method,
        statusCode: res.statusCode,
        databaseQueryTime: req.dbQueryTime,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      });
    }

    // Call original end
    return originalEnd.apply(this, args);
  };

  next();
}

// Database performance tracking
export function trackDatabaseQuery(queryTime: number): (req: ExtendedRequest, res: Response, next: NextFunction) => void {
  return (req: ExtendedRequest, res: Response, next: NextFunction) => {
    req.dbQueryTime = (req.dbQueryTime || 0) + queryTime;
    next();
  };
}

// Error tracking middleware
export function errorTrackingMiddleware(err: Error, req: ExtendedRequest, res: Response, next: NextFunction): void {
  if (req.startTime) {
    const responseTime = performance.now() - req.startTime;
    
    // Record error metric
    performanceMonitoringService.recordMetric({
      responseTime: Math.round(responseTime),
      endpoint: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode || 500,
      databaseQueryTime: req.dbQueryTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      errorCount: 1
    });
  }

  next(err);
}
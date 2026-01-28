import { Request, Response, NextFunction } from 'express';
import { healthMonitoringService } from '../services/healthMonitoringService';

// Middleware to track request metrics
export const metricsTrackingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Increment request counter
  healthMonitoringService.incrementRequestCount();
  
  // Track response to increment error counter if needed
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;
  
  // Track errors on response finish
  res.on('finish', () => {
    // Check if this is an error response (4xx or 5xx)
    if (res.statusCode >= 400) {
      healthMonitoringService.incrementErrorCount();
    }
  });
  
  // Override json method to maintain compatibility
  res.json = function(body: any) {
    return originalJson.call(this, body);
  };
  
  // Override send method to maintain compatibility
  res.send = function(body: any) {
    return originalSend.call(this, body);
  };
  
  // Override end method to maintain compatibility
  res.end = function(chunk?: any, encoding?: any) {
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

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
  res.json = function(body: any) {
    // Check if this is an error response
    if (res.statusCode >= 400 || (body && body.success === false)) {
      healthMonitoringService.incrementErrorCount();
    }
    
    // Call original json method
    return originalJson.call(this, body);
  };
  
  next();
};

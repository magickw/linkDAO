import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';

/**
 * Error Recovery Middleware
 * Provides fallback responses when services fail
 */

export const errorRecoveryMiddleware = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🚨 Error caught by recovery middleware:', error.message);
  
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }
  
  // Provide appropriate fallback responses based on the endpoint
  const path = req.path;
  
  if (path.includes('/health') || path.includes('/ping') || path.includes('/status')) {
    return res.status(200).json({
      success: true,
      status: 'degraded',
      message: 'Service running with limited functionality',
      timestamp: new Date().toISOString()
    });
  }
  
  if (path.includes('/api/auth/kyc')) {
    return res.status(200).json({
      success: true,
      data: {
        status: 'pending',
        verified: false,
        message: 'KYC service temporarily unavailable'
      }
    });
  }
  
  if (path.includes('/api/profiles')) {
    return ApiResponse.serviceUnavailable(res, 'Profile service temporarily unavailable');
  }
  
  if (path.includes('/api/feed')) {
    return res.status(200).json({
      success: true,
      data: {
        posts: [],
        pagination: { page: 1, limit: 20, total: 0, hasMore: false },
        message: 'Feed service temporarily unavailable'
      }
    });
  }
  
  if (path.includes('/marketplace')) {
    return res.status(200).json({
      success: true,
      data: {
        listings: [],
        categories: [],
        message: 'Marketplace service temporarily unavailable'
      }
    });
  }
  
  // Generic API error response
  if (path.startsWith('/api/')) {
    return ApiResponse.serviceUnavailable(res, 'Service temporarily unavailable');
  }
  
  // Default error response
  return ApiResponse.serverError(res, 'An unexpected error occurred');
};

export const serviceUnavailableHandler = (req: Request, res: Response, next: NextFunction) => {
  // Add a timeout to prevent hanging requests
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      ApiResponse.serverError(res, 'Request timed out');
    }
  }, 30000); // 30 second timeout
  
  // Clear timeout when response is sent
  res.on('finish', () => {
    clearTimeout(timeout);
  });
  
  next();
};
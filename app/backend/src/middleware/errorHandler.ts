import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { ApiResponse } from '../utils/apiResponse';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public code: string;
  public details?: any;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Export alias for backward compatibility
export { AppError as APIError };

// Common error types
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

// Error logging utility
const logError = (error: ApiError, req: Request) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      details: error.details
    }
  };

  if (error.statusCode && error.statusCode >= 500) {
    safeLogger.error('🚨 Server Error:', JSON.stringify(errorInfo, null, 2));
  } else if (error.statusCode && error.statusCode >= 400) {
    safeLogger.warn('⚠️  Client Error:', JSON.stringify(errorInfo, null, 2));
  } else {
    safeLogger.info('ℹ️  Request Info:', JSON.stringify(errorInfo, null, 2));
  }
};

// Main error handler middleware
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logError(error, req);

  // Handle specific error types
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let code = error.code || 'INTERNAL_ERROR';
  let details = error.details;

  // Handle CORS errors
  if (error.message === 'Not allowed by CORS') {
    statusCode = 403;
    code = 'CORS_ERROR';
    message = 'Origin not allowed by CORS policy';
  }

  // Handle validation errors from express-validator or zod
  if (error.name === 'ValidationError' || error.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid request data';
    details = error.details || (error as any).errors;
  }

  // Handle database errors
  if (error.name === 'SequelizeError' || error.name === 'DatabaseError') {
    statusCode = 500;
    code = 'DATABASE_ERROR';
    message = process.env.NODE_ENV === 'production' 
      ? 'Database operation failed' 
      : error.message;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Handle multer errors (file upload)
  if (error.name === 'MulterError') {
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    message = `File upload error: ${error.message}`;
  }

  // Prepare error response using ApiResponse
  const errorResponse = {
    code,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add request ID if available
  if (req.headers['x-request-id']) {
    (errorResponse as any).requestId = req.headers['x-request-id'];
  }

  // Send standardized error response
  switch (statusCode) {
    case 400:
      ApiResponse.badRequest(res, message, details);
      break;
    case 401:
      ApiResponse.unauthorized(res, message);
      break;
    case 403:
      ApiResponse.forbidden(res, message);
      break;
    case 404:
      ApiResponse.notFound(res, message);
      break;
    case 409:
      ApiResponse.conflict(res, message, details);
      break;
    case 422:
      ApiResponse.validationError(res, message, details);
      break;
    case 429:
      ApiResponse.tooManyRequests(res, message);
      break;
    case 503:
      ApiResponse.serviceUnavailable(res, message);
      break;
    default:
      ApiResponse.serverError(res, message, details);
  }
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl}`);
  next(error);
};

// Async error wrapper to catch async errors in route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  safeLogger.error('🚨 Unhandled Promise Rejection:', reason);
  safeLogger.error('Promise:', promise);
  
  // In production, we might want to gracefully shutdown
  if (process.env.NODE_ENV === 'production') {
    safeLogger.info('🛑 Shutting down due to unhandled promise rejection...');
    process.exit(1);
  }
});

// Uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  safeLogger.error('🚨 Uncaught Exception:', error);
  
  // Always exit on uncaught exceptions
  safeLogger.info('🛑 Shutting down due to uncaught exception...');
  process.exit(1);
});
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { errorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

// Enhanced global error handler for marketplace API endpoints
export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Default error values
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal Server Error';
  let details: any = undefined;

  // Handle known AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  }
  // Handle validation errors from express-validator
  else if (error.name === 'ValidationError' || (error.errors && Array.isArray(error.errors))) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = error.errors || error.details;
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }
  // Handle multer errors (file upload)
  else if (error.name === 'MulterError') {
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    message = `File upload error: ${error.message}`;
    details = { field: error.field, limit: error.limit };
  }
  // Handle CORS errors
  else if (error.message === 'Not allowed by CORS') {
    statusCode = 403;
    code = 'CORS_ERROR';
    message = 'Origin not allowed by CORS policy';
  }
  // Handle database connection errors
  else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    statusCode = 503;
    code = 'DATABASE_CONNECTION_ERROR';
    message = 'Database connection failed';
    details = { dbError: error.code };
  }
  // Handle database query errors
  else if (error.name === 'DatabaseError' || error.name === 'SequelizeError') {
    statusCode = 500;
    code = 'DATABASE_ERROR';
    message = process.env.NODE_ENV === 'production' 
      ? 'Database operation failed' 
      : error.message;
    details = process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined;
  }
  // Handle rate limiting errors
  else if (error.statusCode === 429 || error.message?.includes('rate limit')) {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests. Please try again later.';
    details = { retryAfter: error.retryAfter || 60 };
  }
  // Handle timeout errors
  else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    statusCode = 504;
    code = 'REQUEST_TIMEOUT';
    message = 'Request timeout. Please try again.';
  }
  // Handle network errors
  else if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
    statusCode = 503;
    code = 'NETWORK_ERROR';
    message = 'Network connection error';
  }
  // Handle syntax errors (malformed JSON)
  else if (error instanceof SyntaxError && error.message.includes('JSON')) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }
  // Handle unknown errors
  else {
    // Log unknown errors for investigation
    logger.error('Unknown error type encountered', {
      requestId: res.locals.requestId,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body
      }
    });

    // Use error message if available and safe
    if (error.message) {
      message = process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error';
    }
  }

  // Log error with appropriate level
  const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  const logMessage = `${req.method} ${req.originalUrl} - ${statusCode} ${code}`;
  
  logger[logLevel](logMessage, {
    requestId: res.locals.requestId,
    error: {
      code,
      message,
      statusCode,
      originalMessage: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    responseTime: (req as any).startTime ? Date.now() - (req as any).startTime : undefined
  });

  // Send standardized error response
  errorResponse(res, code, message, statusCode, details);
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

// Async error wrapper to catch async errors in route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Circuit breaker for external service calls
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        if (fallback) {
          return fallback();
        }
        throw new AppError('Service temporarily unavailable', 503, 'CIRCUIT_BREAKER_OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }
}

// Retry mechanism with exponential backoff
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      logger.warn(`Retrying operation (attempt ${attempt + 1}/${maxRetries})`, {
        error: error.message,
        delay
      });
    }
  }
  
  throw lastError;
};
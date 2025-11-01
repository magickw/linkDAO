import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { errorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

// Enhanced error tracking and correlation
interface ErrorContext {
  requestId: string;
  timestamp: string;
  method: string;
  url: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  correlationId?: string;
  sessionId?: string;
}

// User-friendly error messages mapping
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  'VALIDATION_ERROR': 'Please check your input and try again. Some fields may be missing or invalid.',
  'AUTHENTICATION_ERROR': 'Please sign in with your wallet to continue.',
  'AUTHORIZATION_ERROR': 'You don\'t have permission to perform this action.',
  'RATE_LIMIT_EXCEEDED': 'You\'re making requests too quickly. Please wait a moment and try again.',
  'DATABASE_ERROR': 'We\'re experiencing technical difficulties. Please try again in a few moments.',
  'NETWORK_ERROR': 'Connection issue detected. Please check your internet connection and try again.',
  'SERVICE_UNAVAILABLE': 'This service is temporarily unavailable. We\'re working to restore it.',
  'FILE_UPLOAD_ERROR': 'There was a problem uploading your file. Please check the file size and format.',
  'INVALID_TOKEN': 'Your session has expired. Please reconnect your wallet.',
  'TOKEN_EXPIRED': 'Your session has expired. Please reconnect your wallet.',
  'CORS_ERROR': 'This request is not allowed from your current location.',
  'REQUEST_TIMEOUT': 'The request took too long to complete. Please try again.',
  'INVALID_JSON': 'The request format is invalid. Please check your data and try again.',
  'ROUTE_NOT_FOUND': 'The requested page or endpoint could not be found.',
  'CIRCUIT_BREAKER_OPEN': 'This service is temporarily unavailable due to high error rates. Please try again later.'
};

// Actionable suggestions for common errors
const ERROR_SUGGESTIONS: Record<string, string[]> = {
  'VALIDATION_ERROR': [
    'Double-check all required fields are filled out',
    'Ensure email addresses and wallet addresses are in the correct format',
    'Check that numeric values are within acceptable ranges'
  ],
  'AUTHENTICATION_ERROR': [
    'Connect your wallet using the wallet button',
    'Make sure your wallet is unlocked',
    'Try refreshing the page and connecting again'
  ],
  'RATE_LIMIT_EXCEEDED': [
    'Wait 60 seconds before making another request',
    'Reduce the frequency of your requests',
    'Contact support if you need higher rate limits'
  ],
  'DATABASE_ERROR': [
    'Try refreshing the page',
    'Wait a few minutes and try again',
    'Contact support if the problem persists'
  ],
  'FILE_UPLOAD_ERROR': [
    'Ensure your file is under 10MB',
    'Use supported formats: JPG, PNG, GIF, PDF',
    'Try uploading a different file'
  ],
  'SERVICE_UNAVAILABLE': [
    'Check our status page for updates',
    'Try again in 15-30 minutes',
    'Use cached data if available'
  ]
};

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

  // Generate or get request ID for error correlation
  const requestId = res.locals.requestId || generateRequestId();
  res.locals.requestId = requestId;

  // Create error context for tracking and correlation
  const errorContext: ErrorContext = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id || (req as any).userId,
    correlationId: req.get('X-Correlation-ID') || requestId,
    sessionId: req.get('X-Session-ID') || (req as any).sessionId
  };

  // Default error values
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal Server Error';
  let userFriendlyMessage = 'An unexpected error occurred. Please try again.';
  let suggestions: string[] = [];
  let details: any = undefined;

  // Handle known AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
    userFriendlyMessage = USER_FRIENDLY_MESSAGES[code] || message;
    suggestions = ERROR_SUGGESTIONS[code] || [];
  }
  // Handle validation errors from express-validator
  else if (error.name === 'ValidationError' || (error.errors && Array.isArray(error.errors))) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    userFriendlyMessage = USER_FRIENDLY_MESSAGES['VALIDATION_ERROR'];
    suggestions = ERROR_SUGGESTIONS['VALIDATION_ERROR'];
    details = error.errors || error.details;
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
    userFriendlyMessage = USER_FRIENDLY_MESSAGES['INVALID_TOKEN'];
    suggestions = ERROR_SUGGESTIONS['AUTHENTICATION_ERROR'];
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
    userFriendlyMessage = USER_FRIENDLY_MESSAGES['TOKEN_EXPIRED'];
    suggestions = ERROR_SUGGESTIONS['AUTHENTICATION_ERROR'];
  }
  // Handle multer errors (file upload)
  else if (error.name === 'MulterError') {
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    message = `File upload error: ${error.message}`;
    userFriendlyMessage = USER_FRIENDLY_MESSAGES['FILE_UPLOAD_ERROR'];
    suggestions = ERROR_SUGGESTIONS['FILE_UPLOAD_ERROR'];
    details = { field: error.field, limit: error.limit };
  }
  // Handle CORS errors
  else if (error.message === 'Not allowed by CORS') {
    statusCode = 403;
    code = 'CORS_ERROR';
    message = 'Origin not allowed by CORS policy';
    userFriendlyMessage = USER_FRIENDLY_MESSAGES['CORS_ERROR'];
    suggestions = ['Try accessing from the official website', 'Contact support if you believe this is an error'];
  }
  // Handle database connection errors
  else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    statusCode = 503;
    code = 'DATABASE_CONNECTION_ERROR';
    message = 'Database connection failed';
    userFriendlyMessage = USER_FRIENDLY_MESSAGES['DATABASE_ERROR'];
    suggestions = ERROR_SUGGESTIONS['DATABASE_ERROR'];
    details = { dbError: error.code };
  }
  // Handle database query errors
  else if (error.name === 'DatabaseError' || error.name === 'SequelizeError') {
    statusCode = 500;
    code = 'DATABASE_ERROR';
    message = process.env.NODE_ENV === 'production' 
      ? 'Database operation failed' 
      : error.message;
    userFriendlyMessage = USER_FRIENDLY_MESSAGES['DATABASE_ERROR'];
    suggestions = ERROR_SUGGESTIONS['DATABASE_ERROR'];
    details = process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined;
  }
  // Handle rate limiting errors
  else if (error.statusCode === 429 || error.message?.includes('rate limit')) {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests. Please try again later.';
    userFriendlyMessage = USER_FRIENDLY_MESSAGES['RATE_LIMIT_EXCEEDED'];
    suggestions = ERROR_SUGGESTIONS['RATE_LIMIT_EXCEEDED'];
    details = { retryAfter: error.retryAfter || 60 };
  }
  // Handle timeout errors
  else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    statusCode = 504;
    code = 'REQUEST_TIMEOUT';
    message = 'Request timeout. Please try again.';
    userFriendlyMessage = USER_FRIENDLY_MESSAGES['REQUEST_TIMEOUT'];
    suggestions = ['Try again with a simpler request', 'Check your internet connection', 'Contact support if timeouts persist'];
  }
  // Handle network errors
  else if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
    statusCode = 503;
    code = 'NETWORK_ERROR';
    message = 'Network connection error';
    userFriendlyMessage = USER_FRIENDLY_MESSAGES['NETWORK_ERROR'];
    suggestions = ERROR_SUGGESTIONS['DATABASE_ERROR']; // Similar suggestions
  }
  // Handle syntax errors (malformed JSON)
  else if (error instanceof SyntaxError && error.message.includes('JSON')) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
    userFriendlyMessage = USER_FRIENDLY_MESSAGES['INVALID_JSON'];
    suggestions = ['Check that your request data is properly formatted', 'Ensure all quotes and brackets are matched', 'Try using a JSON validator'];
  }
  // Handle unknown errors
  else {
    // Log unknown errors for investigation
    logger.error('Unknown error type encountered', {
      ...errorContext,
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
    userFriendlyMessage = 'An unexpected error occurred. Our team has been notified.';
    suggestions = ['Try refreshing the page', 'Wait a few minutes and try again', 'Contact support if the problem persists'];
  }

  // Log error with enhanced context and correlation
  const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  const logMessage = `${req.method} ${req.originalUrl} - ${statusCode} ${code}`;
  
  logger[logLevel](logMessage, {
    ...errorContext,
    error: {
      code,
      message,
      statusCode,
      originalMessage: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      userFriendlyMessage,
      suggestions
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: statusCode >= 500 ? req.body : undefined, // Only log body for server errors
      headers: {
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        origin: req.get('Origin'),
        referer: req.get('Referer')
      }
    },
    responseTime: (req as any).startTime ? Date.now() - (req as any).startTime : undefined,
    environment: process.env.NODE_ENV,
    service: 'marketplace-api'
  });

  // Send enhanced error response with user-friendly messages and suggestions
  const enhancedDetails = {
    ...details,
    userFriendlyMessage,
    suggestions,
    requestId,
    timestamp: errorContext.timestamp,
    ...(process.env.NODE_ENV === 'development' && {
      technicalDetails: {
        originalMessage: error.message,
        errorType: error.name,
        stack: error.stack
      }
    })
  };

  errorResponse(res, code, message, statusCode, enhancedDetails);
};

// Generate unique request ID for error correlation
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND',
    {
      availableEndpoints: [
        'GET /health',
        'GET /api/marketplace/seller/{walletAddress}',
        'POST /api/marketplace/seller/profile',
        'GET /marketplace/listings',
        'POST /api/auth/wallet'
      ]
    }
  );
  next(error);
};

// Async error wrapper to catch async errors in route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Re-export circuit breaker and retry utilities from the dedicated service
export { circuitBreakerService, CircuitBreaker, RetryService } from '../services/circuitBreakerService';
export { fallbackService } from '../services/fallbackService';

// Legacy wrapper for backward compatibility
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  const { circuitBreakerService } = await import('../services/circuitBreakerService');
  
  return circuitBreakerService.executeWithRetry(
    operation,
    'legacy-retry-operation',
    {
      maxRetries,
      baseDelay,
      backoffMultiplier: 2,
      jitter: true
    }
  );
};

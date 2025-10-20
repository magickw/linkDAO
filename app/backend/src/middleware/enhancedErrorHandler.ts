import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse, errorResponse } from '../utils/apiResponse';

// Enhanced error class with more context
export class EnhancedAppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly requestId?: string;
  public readonly userId?: string;
  public readonly correlationId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  public setRequestContext(requestId?: string, userId?: string, correlationId?: string): this {
    (this as any).requestId = requestId;
    (this as any).userId = userId;
    (this as any).correlationId = correlationId;
    return this;
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      isOperational: this.isOperational,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId,
      correlationId: this.correlationId,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

// Error context interface for comprehensive logging
interface ErrorContext {
  requestId: string;
  correlationId: string;
  timestamp: string;
  method: string;
  url: string;
  path: string;
  query: any;
  body: any;
  headers: {
    userAgent?: string;
    contentType?: string;
    authorization?: string;
    origin?: string;
    referer?: string;
    xForwardedFor?: string;
  };
  ip: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  responseTime?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

// Enhanced error handler with comprehensive logging and monitoring
export const enhancedErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Generate or get request context
  const requestId = res.locals.requestId || generateRequestId();
  const correlationId = req.get('X-Correlation-ID') || req.get('X-Request-ID') || requestId;
  const startTime = (req as any).startTime || Date.now();
  const responseTime = Date.now() - startTime;

  // Create comprehensive error context
  const errorContext: ErrorContext = {
    requestId,
    correlationId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    body: sanitizeRequestBody(req.body),
    headers: {
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      authorization: req.get('Authorization') ? '[REDACTED]' : undefined,
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      xForwardedFor: req.get('X-Forwarded-For')
    },
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userId: (req as any).user?.id || (req as any).userId,
    sessionId: req.get('X-Session-ID') || (req as any).sessionId,
    userAgent: req.get('User-Agent'),
    responseTime,
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  };

  // Set request context on error if it's an EnhancedAppError
  if (error instanceof EnhancedAppError) {
    error.setRequestContext(requestId, errorContext.userId, correlationId);
  }

  // Determine error details
  const errorDetails = processError(error, errorContext);

  // Log error with comprehensive context
  logErrorWithContext(error, errorContext, errorDetails);

  // Track error metrics
  trackErrorMetrics(errorDetails.code, errorContext);

  // Send error response
  sendErrorResponse(res, errorDetails, errorContext);
};

// Process error to extract standardized details
function processError(error: any, context: ErrorContext) {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal Server Error';
  let userFriendlyMessage = 'An unexpected error occurred. Please try again.';
  let suggestions: string[] = [];
  let details: any = undefined;
  let isOperational = false;

  // Handle EnhancedAppError instances
  if (error instanceof EnhancedAppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
    isOperational = error.isOperational;
  }
  // Handle validation errors
  else if (error.name === 'ValidationError' || (error.errors && Array.isArray(error.errors))) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = error.errors || error.details;
    isOperational = true;
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
    isOperational = true;
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
    isOperational = true;
  }
  // Handle multer errors (file upload)
  else if (error.name === 'MulterError') {
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    message = `File upload error: ${error.message}`;
    details = { field: error.field, limit: error.limit };
    isOperational = true;
  }
  // Handle CORS errors
  else if (error.message === 'Not allowed by CORS') {
    statusCode = 403;
    code = 'CORS_ERROR';
    message = 'Origin not allowed by CORS policy';
    isOperational = true;
  }
  // Handle database errors
  else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    statusCode = 503;
    code = 'DATABASE_CONNECTION_ERROR';
    message = 'Database connection failed';
    details = { dbError: error.code };
    isOperational = false; // Infrastructure issue
  }
  // Handle rate limiting errors
  else if (error.statusCode === 429 || error.message?.includes('rate limit')) {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests. Please try again later.';
    details = { retryAfter: error.retryAfter || 60 };
    isOperational = true;
  }
  // Handle timeout errors
  else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    statusCode = 504;
    code = 'REQUEST_TIMEOUT';
    message = 'Request timeout. Please try again.';
    isOperational = true;
  }
  // Handle syntax errors (malformed JSON)
  else if (error instanceof SyntaxError && error.message.includes('JSON')) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
    isOperational = true;
  }
  // Handle unknown errors
  else {
    // Use error message if available and safe
    if (error.message) {
      message = process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error';
    }
    isOperational = false; // Unknown errors are not operational
  }

  // Get user-friendly messages and suggestions
  userFriendlyMessage = getUserFriendlyMessage(code) || userFriendlyMessage;
  suggestions = getErrorSuggestions(code);

  return {
    statusCode,
    code,
    message,
    userFriendlyMessage,
    suggestions,
    details,
    isOperational,
    originalError: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    }
  };
}

// Log error with comprehensive context
function logErrorWithContext(error: any, context: ErrorContext, errorDetails: any): void {
  const logLevel = errorDetails.statusCode >= 500 ? 'error' : 
                   errorDetails.statusCode >= 400 ? 'warn' : 'info';
  
  const logMessage = `${context.method} ${context.url} - ${errorDetails.statusCode} ${errorDetails.code}`;
  
  const logData = {
    requestId: context.requestId,
    correlationId: context.correlationId,
    timestamp: context.timestamp,
    error: {
      code: errorDetails.code,
      message: errorDetails.message,
      statusCode: errorDetails.statusCode,
      isOperational: errorDetails.isOperational,
      userFriendlyMessage: errorDetails.userFriendlyMessage,
      suggestions: errorDetails.suggestions,
      details: errorDetails.details,
      originalError: errorDetails.originalError,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    request: {
      method: context.method,
      url: context.url,
      path: context.path,
      query: context.query,
      body: context.body,
      headers: context.headers,
      ip: context.ip,
      userAgent: context.userAgent
    },
    user: {
      id: context.userId,
      sessionId: context.sessionId
    },
    performance: {
      responseTime: context.responseTime,
      memoryUsage: context.memoryUsage,
      cpuUsage: context.cpuUsage
    },
    environment: process.env.NODE_ENV,
    service: 'marketplace-api'
  };

  logger[logLevel](logMessage, logData);

  // Track error rate for monitoring
  logger.trackErrorRate(errorDetails.code);

  // Log critical errors with additional context
  if (!errorDetails.isOperational || errorDetails.statusCode >= 500) {
    logger.error('Critical error detected', {
      ...logData,
      critical: true,
      alertRequired: true
    });
  }
}

// Track error metrics for monitoring
function trackErrorMetrics(errorCode: string, context: ErrorContext): void {
  // This could integrate with metrics collection services like Prometheus
  // For now, we'll use the logger's error tracking
  logger.trackErrorRate(errorCode);
  
  // Track error patterns
  const errorPattern = `${context.method}:${context.path}:${errorCode}`;
  logger.info('Error pattern tracked', {
    pattern: errorPattern,
    requestId: context.requestId,
    timestamp: context.timestamp
  });
}

// Send standardized error response
function sendErrorResponse(res: Response, errorDetails: any, context: ErrorContext): void {
  // Set error correlation headers
  res.set({
    'X-Request-ID': context.requestId,
    'X-Correlation-ID': context.correlationId,
    'X-Error-Code': errorDetails.code
  });

  // Add retry-after header for rate limiting
  if (errorDetails.code === 'RATE_LIMIT_EXCEEDED' && errorDetails.details?.retryAfter) {
    res.set('Retry-After', errorDetails.details.retryAfter.toString());
  }

  // Prepare response details
  const responseDetails = {
    ...errorDetails.details,
    userFriendlyMessage: errorDetails.userFriendlyMessage,
    suggestions: errorDetails.suggestions,
    requestId: context.requestId,
    timestamp: context.timestamp,
    ...(process.env.NODE_ENV === 'development' && {
      technicalDetails: {
        originalMessage: errorDetails.originalError.message,
        errorType: errorDetails.originalError.name,
        stack: errorDetails.originalError.stack
      }
    })
  };

  // Use errorResponse utility for consistent formatting
  errorResponse(res, errorDetails.code, errorDetails.message, errorDetails.statusCode, responseDetails);
}

// Sanitize request body for logging (remove sensitive data)
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'privateKey', 'signature'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// User-friendly error messages
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

// Error suggestions for common issues
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

function getUserFriendlyMessage(code: string): string | undefined {
  return USER_FRIENDLY_MESSAGES[code];
}

function getErrorSuggestions(code: string): string[] {
  return ERROR_SUGGESTIONS[code] || [];
}

// Async error wrapper to catch async errors in route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error factory functions for common errors
export const ErrorFactory = {
  validation: (message: string, details?: any) => 
    new EnhancedAppError(message, 400, 'VALIDATION_ERROR', details),
  
  authentication: (message: string = 'Authentication required') => 
    new EnhancedAppError(message, 401, 'AUTHENTICATION_ERROR'),
  
  authorization: (message: string = 'Insufficient permissions') => 
    new EnhancedAppError(message, 403, 'AUTHORIZATION_ERROR'),
  
  notFound: (resource: string = 'Resource') => 
    new EnhancedAppError(`${resource} not found`, 404, 'NOT_FOUND'),
  
  rateLimit: (retryAfter: number = 60) => 
    new EnhancedAppError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter }),
  
  internal: (message: string = 'Internal server error', details?: any) => 
    new EnhancedAppError(message, 500, 'INTERNAL_ERROR', details, false),
  
  serviceUnavailable: (service: string) => 
    new EnhancedAppError(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE', undefined, false)
};
import { Response } from 'express';

// Standardized API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    pagination?: PaginationInfo;
    requestId?: string;
    timestamp: string;
    version?: string;
    warning?: {
      code: string;
      message: string;
      serviceName?: string;
      estimatedRestoration?: string;
    };
  };
}

// HTTP Status Code constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// Pagination interface
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Success response wrapper
export const successResponse = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  metadata?: Partial<ApiResponse['metadata']>
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || generateRequestId(),
      version: '1.0.0',
      ...metadata
    }
  };

  res.status(statusCode).json(response);
};

// Error response wrapper
export const errorResponse = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any
): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || generateRequestId(),
      version: '1.0.0'
    }
  };

  res.status(statusCode).json(response);
};

// Paginated response wrapper
export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  pagination: PaginationInfo,
  statusCode: number = 200
): void => {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || generateRequestId(),
      version: '1.0.0',
      pagination
    }
  };

  res.status(statusCode).json(response);
};

// Not found response (returns null data instead of 404 error)
export const notFoundResponse = <T>(
  res: Response,
  message: string = 'Resource not found'
): void => {
  const response: ApiResponse<T | null> = {
    success: true,
    data: null,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || generateRequestId(),
      version: '1.0.0'
    }
  };

  res.status(200).json(response);
};

// Validation error response
export const validationErrorResponse = (
  res: Response,
  errors: any[],
  message: string = 'Validation failed'
): void => {
  errorResponse(res, 'VALIDATION_ERROR', message, 400, { errors });
};

// Service unavailable response with fallback data
export const serviceUnavailableResponse = <T>(
  res: Response,
  fallbackData: T,
  serviceName: string,
  message?: string
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data: fallbackData,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || generateRequestId(),
      version: '1.0.0',
      warning: {
        code: 'SERVICE_DEGRADED',
        message: message || `${serviceName} is temporarily unavailable. Fallback data provided.`,
        serviceName,
        estimatedRestoration: '15-30 minutes'
      }
    }
  };

  res.status(200).json(response);
};

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Helper functions for creating response objects (without Express Response)
export const createSuccessResponse = <T>(
  data: T,
  metadata?: Partial<ApiResponse['metadata']>
): ApiResponse<T> => {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: '1.0.0',
      ...metadata
    }
  };
};

export const createErrorResponse = (
  code: string,
  message: string,
  details?: any
): ApiResponse => {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: '1.0.0'
    }
  };
};

// Helper function to create pagination info
export const createPaginationInfo = (
  page: number,
  limit: number,
  total: number
): PaginationInfo => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

// Response time tracking
export const withResponseTime = (startTime: number) => {
  return {
    responseTime: Date.now() - startTime
  };
};

// Enhanced API Response utility class
export class ApiResponse {
  static success<T>(res: Response, data: T, statusCode: number = HTTP_STATUS.OK, pagination?: PaginationInfo): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || generateRequestId(),
        version: '1.0.0',
        ...(pagination && { pagination })
      }
    };

    res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T): void {
    this.success(res, data, HTTP_STATUS.CREATED);
  }

  static noContent(res: Response): void {
    res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  static badRequest(res: Response, message: string, details?: any): void {
    this.error(res, 'BAD_REQUEST', message, HTTP_STATUS.BAD_REQUEST, details);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): void {
    this.error(res, 'UNAUTHORIZED', message, HTTP_STATUS.UNAUTHORIZED);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): void {
    this.error(res, 'FORBIDDEN', message, HTTP_STATUS.FORBIDDEN);
  }

  static notFound(res: Response, message: string = 'Resource not found'): void {
    this.error(res, 'NOT_FOUND', message, HTTP_STATUS.NOT_FOUND);
  }

  static conflict(res: Response, message: string, details?: any): void {
    this.error(res, 'CONFLICT', message, HTTP_STATUS.CONFLICT, details);
  }

  static validationError(res: Response, message: string, details?: any): void {
    this.error(res, 'VALIDATION_ERROR', message, HTTP_STATUS.UNPROCESSABLE_ENTITY, details);
  }

  static tooManyRequests(res: Response, message: string = 'Too many requests'): void {
    this.error(res, 'TOO_MANY_REQUESTS', message, HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  static serverError(res: Response, message: string = 'Internal server error', details?: any): void {
    this.error(res, 'INTERNAL_SERVER_ERROR', message, HTTP_STATUS.INTERNAL_SERVER_ERROR, details);
  }

  static serviceUnavailable(res: Response, message: string = 'Service temporarily unavailable'): void {
    this.error(res, 'SERVICE_UNAVAILABLE', message, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  private static error(res: Response, code: string, message: string, statusCode: number, details?: any): void {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details })
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || generateRequestId(),
        version: '1.0.0'
      }
    };

    res.status(statusCode).json(response);
  }
}

// Simple API response helpers (for backward compatibility)
export const apiResponse = {
  success: <T>(data: T, message?: string) => ({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }),
  
  error: (message: string, statusCode?: number) => ({
    success: false,
    error: message,
    statusCode,
    timestamp: new Date().toISOString()
  })
};
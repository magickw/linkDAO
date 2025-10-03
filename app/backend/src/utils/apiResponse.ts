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
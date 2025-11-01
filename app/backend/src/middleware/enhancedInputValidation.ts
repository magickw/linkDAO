/**
 * Enhanced Input Validation Middleware
 * Comprehensive input validation and sanitization for all API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { InputSanitizer, SANITIZATION_CONFIGS } from '../utils/sanitizer';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export interface ValidationSchema {
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  body?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

export interface ValidationOptions {
  sanitize?: boolean;
  sanitizationConfig?: keyof typeof SANITIZATION_CONFIGS;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  abortEarly?: boolean;
}

/**
 * Enhanced input validation middleware with sanitization
 */
export const validateRequest = (
  schema: ValidationSchema,
  options: ValidationOptions = {}
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        sanitize = true,
        sanitizationConfig = 'TEXT',
        allowUnknown = false,
        stripUnknown = true,
        abortEarly = false
      } = options;

      const validationOptions = {
        allowUnknown,
        stripUnknown,
        abortEarly
      };

      // Sanitize inputs first if enabled
      if (sanitize) {
        const config = SANITIZATION_CONFIGS[sanitizationConfig];
        
        if (req.body) {
          req.body = InputSanitizer.sanitizeObject(req.body, config);
        }
        
        if (req.query) {
          req.query = InputSanitizer.sanitizeObject(req.query, config);
        }
        
        if (req.params) {
          req.params = InputSanitizer.sanitizeObject(req.params, config);
        }
      }

      // Validate parameters
      if (schema.params) {
        const { error, value } = schema.params.validate(req.params, validationOptions);
        if (error) {
          logger.warn('Parameter validation failed', {
            path: req.path,
            method: req.method,
            params: req.params,
            error: error.details
          });
          
          return ApiResponse.validationError(res, 'Invalid parameters', {
            field: 'params',
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            }))
          });
        }
        req.params = value;
      }

      // Validate query parameters
      if (schema.query) {
        const { error, value } = schema.query.validate(req.query, validationOptions);
        if (error) {
          logger.warn('Query validation failed', {
            path: req.path,
            method: req.method,
            query: req.query,
            error: error.details
          });
          
          return ApiResponse.validationError(res, 'Invalid query parameters', {
            field: 'query',
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            }))
          });
        }
        req.query = value;
      }

      // Validate request body
      if (schema.body) {
        const { error, value } = schema.body.validate(req.body, validationOptions);
        if (error) {
          logger.warn('Body validation failed', {
            path: req.path,
            method: req.method,
            body: req.body,
            error: error.details
          });
          
          return ApiResponse.validationError(res, 'Invalid request body', {
            field: 'body',
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            }))
          });
        }
        req.body = value;
      }

      // Validate headers
      if (schema.headers) {
        const { error, value } = schema.headers.validate(req.headers, validationOptions);
        if (error) {
          logger.warn('Header validation failed', {
            path: req.path,
            method: req.method,
            headers: req.headers,
            error: error.details
          });
          
          return ApiResponse.validationError(res, 'Invalid headers', {
            field: 'headers',
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            }))
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return ApiResponse.serverError(res, 'Validation processing failed');
    }
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Pagination parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).optional()
  }),

  // ID parameter
  id: Joi.object({
    id: Joi.string().required().pattern(/^[a-zA-Z0-9_-]+$/)
  }),

  // Wallet address
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/),

  // ENS name
  ensName: Joi.string().pattern(/^[a-z0-9-]+\.eth$/),

  // Search query
  search: Joi.object({
    q: Joi.string().min(1).max(200).required(),
    category: Joi.string().optional(),
    sort: Joi.string().valid('relevance', 'date', 'price', 'rating').default('relevance'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // File upload metadata
  fileUpload: Joi.object({
    filename: Joi.string().max(255).required(),
    mimetype: Joi.string().required(),
    size: Joi.number().integer().min(1).max(50 * 1024 * 1024) // 50MB
  }),

  // Price information
  price: Joi.object({
    amount: Joi.number().positive().precision(18).required(),
    currency: Joi.string().valid('ETH', 'USDC', 'USDT', 'DAI').required()
  }),

  // Date range
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  })
};

/**
 * Pre-configured validation middleware for common use cases
 */
export const validatePagination = validateRequest({
  query: commonSchemas.pagination
});

export const validateId = validateRequest({
  params: commonSchemas.id
});

export const validateSearch = validateRequest({
  query: commonSchemas.search
}, { sanitizationConfig: 'SEARCH' });

/**
 * Marketplace-specific validation schemas
 */
export const marketplaceSchemas = {
  // Product listing creation
  createListing: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    price: commonSchemas.price.required(),
    category: Joi.string().valid(
      'Electronics', 'Fashion', 'Home & Garden', 'Sports', 
      'Books', 'Art', 'Digital', 'NFTs'
    ).required(),
    images: Joi.array().items(Joi.string().uri()).max(10).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    isDigital: Joi.boolean().default(false),
    isNFT: Joi.boolean().default(false),
    inventory: Joi.number().integer().min(0).when('isDigital', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),

  // Product listing update
  updateListing: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    description: Joi.string().min(10).max(2000).optional(),
    price: commonSchemas.price.optional(),
    category: Joi.string().valid(
      'Electronics', 'Fashion', 'Home & Garden', 'Sports', 
      'Books', 'Art', 'Digital', 'NFTs'
    ).optional(),
    images: Joi.array().items(Joi.string().uri()).max(10).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    inventory: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('active', 'inactive', 'sold').optional()
  }),

  // Cart operations
  addToCart: Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).max(100).required()
  }),

  updateCartItem: Joi.object({
    quantity: Joi.number().integer().min(1).max(100).required()
  }),

  // Order creation
  createOrder: Joi.object({
    items: Joi.array().items(Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      price: commonSchemas.price.required()
    })).min(1).required(),
    shippingAddress: Joi.object({
      street: Joi.string().max(200).required(),
      city: Joi.string().max(100).required(),
      state: Joi.string().max(100).required(),
      zipCode: Joi.string().max(20).required(),
      country: Joi.string().max(100).required()
    }).when('hasPhysicalItems', { is: true, then: Joi.required() }),
    paymentMethod: Joi.string().valid('crypto', 'fiat').required()
  })
};

/**
 * Authentication validation schemas
 */
export const authSchemas = {
  // Wallet connection
  walletConnect: Joi.object({
    walletAddress: commonSchemas.walletAddress.required(),
    signature: Joi.string().required(),
    message: Joi.string().required(),
    chainId: Joi.number().integer().valid(1, 5, 137, 80001).optional()
  }),

  // Profile update
  updateProfile: Joi.object({
    displayName: Joi.string().min(2).max(50).optional(),
    bio: Joi.string().max(500).optional(),
    profileImageUrl: Joi.string().uri().optional(),
    ensName: commonSchemas.ensName.optional(),
    socialLinks: Joi.object({
      twitter: Joi.string().uri().optional(),
      discord: Joi.string().optional(),
      website: Joi.string().uri().optional()
    }).optional()
  })
};

/**
 * Security validation middleware
 */
export const securityValidation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for suspicious patterns in all inputs
    const allInputs = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params
    });

    // SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(UNION\s+SELECT)/i,
      /(';\s*(DROP|DELETE|INSERT|UPDATE))/i
    ];

    // XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<img[^>]+src[^>]*=.*onerror/i
    ];

    // Command injection patterns
    const commandPatterns = [
      /(\||&|;|\$\(|\`)/,
      /(rm\s|cat\s|ls\s|pwd|whoami|curl\s|wget\s)/i,
      /(\.\.[\/\\])/,
      /(\/etc\/passwd|\/etc\/shadow)/i
    ];

    // Check for malicious patterns
    const maliciousPatterns = [...sqlPatterns, ...xssPatterns, ...commandPatterns];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(allInputs)) {
        logger.warn('Malicious input detected', {
          path: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          pattern: pattern.toString()
        });
        
        return ApiResponse.badRequest(res, 'Invalid input detected');
      }
    }

    // Check request size
    const contentLength = parseInt(req.get('Content-Length') || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB
      logger.warn('Large request detected', {
        path: req.path,
        method: req.method,
        contentLength,
        ip: req.ip
      });
      
      return ApiResponse.badRequest(res, 'Request too large');
    }

    // Check for excessive nesting in JSON
    if (req.body && typeof req.body === 'object') {
      const depth = getObjectDepth(req.body);
      if (depth > 10) {
        logger.warn('Deeply nested object detected', {
          path: req.path,
          method: req.method,
          depth,
          ip: req.ip
        });
        
        return ApiResponse.badRequest(res, 'Request structure too complex');
      }
    }

    next();
  } catch (error) {
    logger.error('Security validation error', {
      path: req.path,
      method: req.method,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return ApiResponse.serverError(res, 'Security validation failed');
  }
};

/**
 * Helper function to calculate object depth
 */
function getObjectDepth(obj: any, depth = 0): number {
  if (depth > 20) return depth; // Prevent stack overflow
  
  if (typeof obj !== 'object' || obj === null) {
    return depth;
  }
  
  if (Array.isArray(obj)) {
    return Math.max(depth, ...obj.map(item => getObjectDepth(item, depth + 1)));
  }
  
  const depths = Object.values(obj).map(value => getObjectDepth(value, depth + 1));
  return Math.max(depth, ...depths);
}

/**
 * Rate limiting validation
 */
export const rateLimitValidation = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of requests.entries()) {
      if (now > value.resetTime) {
        requests.delete(key);
      }
    }
    
    // Get or create client record
    let clientRecord = requests.get(clientId);
    if (!clientRecord || now > clientRecord.resetTime) {
      clientRecord = {
        count: 0,
        resetTime: now + windowMs
      };
      requests.set(clientId, clientRecord);
    }
    
    // Increment request count
    clientRecord.count++;
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - clientRecord.count).toString(),
      'X-RateLimit-Reset': new Date(clientRecord.resetTime).toISOString()
    });
    
    // Check if limit exceeded
    if (clientRecord.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        clientId,
        count: clientRecord.count,
        limit: maxRequests,
        path: req.path,
        method: req.method
      });
      
      return ApiResponse.tooManyRequests(res, 'Rate limit exceeded');
    }
    
    next();
  };
};

export default {
  validateRequest,
  commonSchemas,
  marketplaceSchemas,
  authSchemas,
  securityValidation,
  rateLimitValidation
};

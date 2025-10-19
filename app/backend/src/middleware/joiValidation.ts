import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponse } from '../utils/apiResponse';

// Joi validation schema interface
export interface JoiValidationSchema {
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  body?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

// Validation error details interface
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
  type: string;
}

// Custom Joi extensions for Web3 and marketplace validation
const customJoi = Joi.extend({
  type: 'walletAddress',
  base: Joi.string(),
  messages: {
    'walletAddress.invalid': 'Invalid Ethereum wallet address format'
  },
  validate(value, helpers) {
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(value)) {
      return { value, errors: helpers.error('walletAddress.invalid') };
    }
    return { value };
  }
}, {
  type: 'ensName',
  base: Joi.string(),
  messages: {
    'ensName.invalid': 'Invalid ENS name format'
  },
  validate(value, helpers) {
    const ensRegex = /^[a-z0-9-]+\.eth$/;
    if (!ensRegex.test(value)) {
      return { value, errors: helpers.error('ensName.invalid') };
    }
    return { value };
  }
}, {
  type: 'ipfsHash',
  base: Joi.string(),
  messages: {
    'ipfsHash.invalid': 'Invalid IPFS hash format'
  },
  validate(value, helpers) {
    const ipfsRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    if (!ipfsRegex.test(value)) {
      return { value, errors: helpers.error('ipfsHash.invalid') };
    }
    return { value };
  }
});

// Main validation middleware factory
export const validateRequest = (schema: JoiValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors: ValidationErrorDetail[] = [];

    try {
      // Validate params
      if (schema.params) {
        const { error, value } = schema.params.validate(req.params, { 
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });
        
        if (error) {
          errors.push(...formatJoiErrors(error, 'params'));
        } else {
          req.params = value;
        }
      }

      // Validate query
      if (schema.query) {
        const { error, value } = schema.query.validate(req.query, { 
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });
        
        if (error) {
          errors.push(...formatJoiErrors(error, 'query'));
        } else {
          req.query = value;
        }
      }

      // Validate body
      if (schema.body) {
        const { error, value } = schema.body.validate(req.body, { 
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });
        
        if (error) {
          errors.push(...formatJoiErrors(error, 'body'));
        } else {
          req.body = value;
        }
      }

      // Validate headers
      if (schema.headers) {
        const { error, value } = schema.headers.validate(req.headers, { 
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });
        
        if (error) {
          errors.push(...formatJoiErrors(error, 'headers'));
        }
      }

      if (errors.length > 0) {
        ApiResponse.validationError(res, 'Request validation failed', { errors });
        return;
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      ApiResponse.serverError(res, 'Validation processing failed');
    }
  };
};

// Format Joi validation errors
function formatJoiErrors(joiError: Joi.ValidationError, location: string): ValidationErrorDetail[] {
  return joiError.details.map(detail => ({
    field: `${location}.${detail.path.join('.')}`,
    message: detail.message,
    value: detail.context?.value,
    type: detail.type
  }));
}

// Common validation schemas
export const commonSchemas = {
  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('asc', 'desc').default('desc'),
    sortBy: Joi.string().optional()
  }),

  // ID parameter schema
  idParam: Joi.object({
    id: Joi.string().uuid().required()
  }),

  // Wallet address schema
  walletAddress: customJoi.walletAddress().required(),

  // ENS name schema
  ensName: customJoi.ensName().optional(),

  // IPFS hash schema
  ipfsHash: customJoi.ipfsHash().optional(),

  // Price schema
  price: Joi.object({
    amount: Joi.number().positive().precision(18).required(),
    currency: Joi.string().valid('ETH', 'USDC', 'USDT', 'DAI').required()
  }),

  // Image URL schema
  imageUrl: Joi.string().uri({ scheme: ['http', 'https', 'ipfs'] }).optional(),

  // Content schema with length limits
  content: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(2000).optional(),
    body: Joi.string().min(1).max(10000).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    category: Joi.string().max(50).optional()
  })
};

// Marketplace-specific validation schemas
export const marketplaceSchemas = {
  // Product listing validation
  createListing: {
    body: Joi.object({
      title: Joi.string().min(1).max(200).required(),
      description: Joi.string().min(1).max(2000).required(),
      category: Joi.string().valid(
        'electronics', 'fashion', 'home-garden', 'sports', 
        'books', 'art', 'digital', 'nfts', 'services'
      ).required(),
      price: commonSchemas.price.required(),
      images: Joi.array().items(commonSchemas.imageUrl).min(1).max(10).required(),
      isDigital: Joi.boolean().default(false),
      isNFT: Joi.boolean().default(false),
      inventory: Joi.when('isDigital', {
        is: false,
        then: Joi.number().integer().min(1).required(),
        otherwise: Joi.forbidden()
      }),
      tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
      shippingInfo: Joi.when('isDigital', {
        is: false,
        then: Joi.object({
          weight: Joi.number().positive().optional(),
          dimensions: Joi.object({
            length: Joi.number().positive(),
            width: Joi.number().positive(),
            height: Joi.number().positive()
          }).optional(),
          shippingCost: commonSchemas.price.optional()
        }).optional(),
        otherwise: Joi.forbidden()
      })
    })
  },

  // Get listings validation
  getListings: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      category: Joi.string().optional(),
      minPrice: Joi.number().positive().optional(),
      maxPrice: Joi.number().positive().optional(),
      sellerId: Joi.string().uuid().optional(),
      search: Joi.string().max(100).optional(),
      isDigital: Joi.boolean().optional(),
      isNFT: Joi.boolean().optional(),
      sortBy: Joi.string().valid('price', 'createdAt', 'title', 'popularity').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    })
  },

  // Seller profile validation
  updateSellerProfile: {
    body: Joi.object({
      storeName: Joi.string().min(3).max(100).required(),
      storeDescription: Joi.string().max(1000).optional(),
      coverImageUrl: commonSchemas.imageUrl.optional(),
      contactEmail: Joi.string().email().optional(),
      website: Joi.string().uri().optional(),
      socialLinks: Joi.object({
        twitter: Joi.string().uri().optional(),
        discord: Joi.string().uri().optional(),
        telegram: Joi.string().uri().optional()
      }).optional(),
      shippingPolicies: Joi.string().max(2000).optional(),
      returnPolicy: Joi.string().max(2000).optional()
    })
  }
};

// Authentication validation schemas
export const authSchemas = {
  // Wallet connection validation
  walletConnect: {
    body: Joi.object({
      walletAddress: commonSchemas.walletAddress,
      signature: Joi.string().required(),
      message: Joi.string().required(),
      chainId: Joi.number().integer().valid(1, 5, 137, 80001).default(1)
    })
  },

  // Profile update validation
  updateProfile: {
    body: Joi.object({
      displayName: Joi.string().min(2).max(50).optional(),
      bio: Joi.string().max(500).optional(),
      profileImageUrl: commonSchemas.imageUrl.optional(),
      ensName: commonSchemas.ensName,
      socialLinks: Joi.object({
        twitter: Joi.string().max(100).optional(),
        discord: Joi.string().max(100).optional(),
        website: Joi.string().uri().optional()
      }).optional(),
      preferences: Joi.object({
        emailNotifications: Joi.boolean().default(true),
        pushNotifications: Joi.boolean().default(true),
        marketingEmails: Joi.boolean().default(false)
      }).optional()
    })
  }
};

// Cart validation schemas
export const cartSchemas = {
  // Add item to cart
  addItem: {
    body: Joi.object({
      productId: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).max(100).required(),
      selectedOptions: Joi.object().optional()
    })
  },

  // Update cart item
  updateItem: {
    params: commonSchemas.idParam,
    body: Joi.object({
      quantity: Joi.number().integer().min(1).max(100).required()
    })
  },

  // Remove cart item
  removeItem: {
    params: commonSchemas.idParam
  }
};

// Order validation schemas
export const orderSchemas = {
  // Create order
  createOrder: {
    body: Joi.object({
      items: Joi.array().items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).required(),
          price: commonSchemas.price.required()
        })
      ).min(1).required(),
      shippingAddress: Joi.when('hasPhysicalItems', {
        is: true,
        then: Joi.object({
          fullName: Joi.string().min(2).max(100).required(),
          addressLine1: Joi.string().min(5).max(200).required(),
          addressLine2: Joi.string().max(200).optional(),
          city: Joi.string().min(2).max(100).required(),
          state: Joi.string().min(2).max(100).required(),
          postalCode: Joi.string().min(3).max(20).required(),
          country: Joi.string().length(2).required()
        }).required(),
        otherwise: Joi.forbidden()
      }),
      paymentMethod: Joi.string().valid('crypto', 'fiat').required(),
      paymentDetails: Joi.object().when('paymentMethod', {
        is: 'crypto',
        then: Joi.object({
          currency: Joi.string().valid('ETH', 'USDC', 'USDT', 'DAI').required(),
          transactionHash: Joi.string().optional()
        }),
        otherwise: Joi.object({
          stripePaymentIntentId: Joi.string().required()
        })
      })
    })
  }
};

// Export the custom Joi instance for use in other modules
export { customJoi as Joi };

// Validation middleware for specific use cases
export const validatePagination = validateRequest({ query: commonSchemas.pagination });
export const validateIdParam = validateRequest({ params: commonSchemas.idParam });

// Helper function to create validation middleware with custom error handling
export const createValidationMiddleware = (
  schema: JoiValidationSchema,
  options: {
    allowUnknown?: boolean;
    stripUnknown?: boolean;
    convert?: boolean;
  } = {}
) => {
  const defaultOptions = {
    allowUnknown: false,
    stripUnknown: true,
    convert: true,
    ...options
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validationPromises = [];

      if (schema.params) {
        validationPromises.push(
          schema.params.validateAsync(req.params, defaultOptions)
            .then(value => ({ type: 'params', value }))
            .catch(error => ({ type: 'params', error }))
        );
      }

      if (schema.query) {
        validationPromises.push(
          schema.query.validateAsync(req.query, defaultOptions)
            .then(value => ({ type: 'query', value }))
            .catch(error => ({ type: 'query', error }))
        );
      }

      if (schema.body) {
        validationPromises.push(
          schema.body.validateAsync(req.body, defaultOptions)
            .then(value => ({ type: 'body', value }))
            .catch(error => ({ type: 'body', error }))
        );
      }

      const results = await Promise.all(validationPromises);
      const errors: ValidationErrorDetail[] = [];

      for (const result of results) {
        if (result.error) {
          errors.push(...formatJoiErrors(result.error, result.type));
        } else {
          // Update request object with validated values
          (req as any)[result.type] = result.value;
        }
      }

      if (errors.length > 0) {
        ApiResponse.validationError(res, 'Request validation failed', { errors });
        return;
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      ApiResponse.serverError(res, 'Validation processing failed');
    }
  };
};
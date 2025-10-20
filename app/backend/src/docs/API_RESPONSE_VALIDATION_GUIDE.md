# API Response Standardization and Validation Guide

This guide explains how to use the comprehensive API response standardization and validation system implemented for the marketplace backend.

## Overview

The system provides:
- Standardized API response formats
- Joi-based request validation
- Input sanitization and security
- Pagination utilities
- Rate limiting
- CORS configuration
- Comprehensive error handling

## Components

### 1. API Response Utility (`utils/apiResponse.ts`)

Provides standardized response formats for all API endpoints.

#### Basic Usage

```typescript
import { ApiResponse } from '../utils/apiResponse';

// Success response
ApiResponse.success(res, data);

// Created response (201)
ApiResponse.created(res, newResource);

// Error responses
ApiResponse.badRequest(res, 'Invalid input');
ApiResponse.unauthorized(res, 'Authentication required');
ApiResponse.notFound(res, 'Resource not found');
ApiResponse.serverError(res, 'Internal server error');

// Paginated response
ApiResponse.success(res, data, 200, paginationInfo);
```

#### Response Format

All responses follow this standardized format:

```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2023-10-19T12:00:00.000Z",
    "requestId": "req_1697716800000_abc123",
    "version": "1.0.0",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "field": "body.title",
          "message": "Title is required",
          "type": "any.required"
        }
      ]
    }
  },
  "metadata": {
    "timestamp": "2023-10-19T12:00:00.000Z",
    "requestId": "req_1697716800000_abc123",
    "version": "1.0.0"
  }
}
```

### 2. Joi Validation Middleware (`middleware/joiValidation.ts`)

Provides comprehensive request validation using Joi schemas.

#### Basic Usage

```typescript
import { validateRequest, marketplaceSchemas } from '../middleware/joiValidation';

// Validate marketplace listing creation
router.post('/listings',
  validateRequest(marketplaceSchemas.createListing),
  async (req, res) => {
    // req.body is now validated and sanitized
    const listingData = req.body;
    // ... handle request
  }
);

// Custom validation schema
router.get('/products',
  validateRequest({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      category: Joi.string().optional(),
      search: Joi.string().max(100).optional()
    })
  }),
  async (req, res) => {
    // req.query is validated and converted to proper types
  }
);
```

#### Available Schemas

- `marketplaceSchemas.createListing` - Product listing creation
- `marketplaceSchemas.getListings` - Product listing queries
- `marketplaceSchemas.updateSellerProfile` - Seller profile updates
- `authSchemas.walletConnect` - Wallet authentication
- `authSchemas.updateProfile` - User profile updates
- `cartSchemas.addItem` - Add item to cart
- `cartSchemas.updateItem` - Update cart item
- `orderSchemas.createOrder` - Order creation

#### Custom Joi Extensions

The system includes custom Joi extensions for Web3 validation:

```typescript
import { Joi } from '../middleware/joiValidation';

const schema = Joi.object({
  walletAddress: Joi.walletAddress().required(),
  ensName: Joi.ensName().optional(),
  ipfsHash: Joi.ipfsHash().optional()
});
```

### 3. Pagination Utilities (`utils/pagination.ts`)

Handles pagination logic and metadata generation.

#### Basic Usage

```typescript
import { paginationUtils } from '../utils/pagination';

router.get('/products', async (req, res) => {
  // Extract pagination parameters
  const { page, limit, offset } = paginationUtils.extractPaginationFromRequest(req);
  
  // Query database
  const products = await db.select().from(productsTable).limit(limit).offset(offset);
  const total = await db.select({ count: count() }).from(productsTable);
  
  // Create paginated response
  const result = paginationUtils.createPaginatedResult(products, page, limit, total[0].count);
  
  ApiResponse.success(res, result.data, 200, result.pagination);
});
```

#### Configuration

```typescript
import { PaginationUtils } from '../utils/pagination';

// Custom pagination configuration
const customPagination = new PaginationUtils({
  defaultPage: 1,
  defaultLimit: 50,
  maxLimit: 200,
  minLimit: 1
});
```

### 4. Input Sanitization (`utils/sanitizer.ts`)

Provides comprehensive input sanitization and validation.

#### Basic Usage

```typescript
import { InputSanitizer, SANITIZATION_CONFIGS } from '../utils/sanitizer';

// Sanitize text input
const result = InputSanitizer.sanitizeString(userInput, SANITIZATION_CONFIGS.TEXT);
console.log(result.sanitized); // Clean text
console.log(result.warnings); // Array of warnings
console.log(result.blocked); // Array of blocked content

// Sanitize objects recursively
const cleanObject = InputSanitizer.sanitizeObject(userObject, SANITIZATION_CONFIGS.RICH_TEXT);

// Validate specific formats
const walletAddress = InputSanitizer.sanitizeWalletAddress('0x742d35Cc...');
const url = InputSanitizer.sanitizeURL('https://example.com');
const email = InputSanitizer.sanitizeEmail('user@example.com');
```

#### Middleware Usage

```typescript
import { textSanitization, richTextSanitization } from '../utils/sanitizer';

// Apply sanitization middleware
router.post('/posts',
  richTextSanitization, // Sanitizes request body, query, and params
  validateRequest(postSchema),
  async (req, res) => {
    // req.body is now sanitized
  }
);
```

### 5. Rate Limiting (`middleware/rateLimitingMiddleware.ts`)

Provides configurable rate limiting for API endpoints.

#### Basic Usage

```typescript
import { 
  generalRateLimit, 
  authRateLimit, 
  searchRateLimit,
  rateLimitingService 
} from '../middleware/rateLimitingMiddleware';

// Use pre-configured rate limiters
router.get('/products', generalRateLimit, handler);
router.post('/auth/login', authRateLimit, handler);
router.get('/search', searchRateLimit, handler);

// Custom rate limiter
const customRateLimit = rateLimitingService.createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50,
  message: 'Too many requests',
  keyGenerator: (req) => req.ip + ':' + req.path
});

router.post('/upload', customRateLimit, handler);
```

### 6. CORS Configuration (`middleware/corsMiddleware.ts`)

Provides environment-specific CORS configuration.

#### Basic Usage

```typescript
import { corsMiddleware, enhancedCorsMiddleware } from '../middleware/corsMiddleware';

// Basic CORS
app.use(corsMiddleware);

// Enhanced CORS with security checks
app.use(enhancedCorsMiddleware);
```

## Complete Route Example

Here's a complete example showing all components working together:

```typescript
import express from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { validateRequest, marketplaceSchemas } from '../middleware/joiValidation';
import { paginationUtils } from '../utils/pagination';
import { generalRateLimit } from '../middleware/rateLimitingMiddleware';
import { textSanitization } from '../utils/sanitizer';

const router = express.Router();

router.get('/products',
  // Rate limiting
  generalRateLimit,
  
  // Input validation
  validateRequest({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      category: Joi.string().optional(),
      search: Joi.string().max(100).optional()
    })
  }),
  
  async (req, res) => {
    try {
      // Extract pagination
      const { page, limit, offset } = paginationUtils.extractPaginationFromRequest(req);
      const { category, search } = req.query as any;

      // Database query (example)
      let query = db.select().from(products);
      
      if (category) {
        query = query.where(eq(products.category, category));
      }
      
      if (search) {
        query = query.where(ilike(products.title, `%${search}%`));
      }

      const [items, totalResult] = await Promise.all([
        query.limit(limit).offset(offset),
        db.select({ count: count() }).from(products)
      ]);

      const total = totalResult[0].count;
      const pagination = paginationUtils.createPaginationInfo(page, limit, total);

      // Standardized response
      ApiResponse.success(res, items, 200, pagination);
      
    } catch (error) {
      console.error('Error fetching products:', error);
      ApiResponse.serverError(res, 'Failed to fetch products');
    }
  }
);

router.post('/products',
  // Rate limiting
  generalRateLimit,
  
  // Input sanitization
  textSanitization,
  
  // Input validation
  validateRequest(marketplaceSchemas.createListing),
  
  async (req, res) => {
    try {
      const productData = req.body; // Validated and sanitized
      
      // Create product
      const newProduct = await db.insert(products).values({
        ...productData,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Return created response
      ApiResponse.created(res, newProduct[0]);
      
    } catch (error) {
      console.error('Error creating product:', error);
      ApiResponse.serverError(res, 'Failed to create product');
    }
  }
);

export default router;
```

## Error Handling

The system includes comprehensive error handling:

### Global Error Handler

```typescript
import { globalErrorHandler } from '../middleware/globalErrorHandler';

// Apply global error handler (should be last middleware)
app.use(globalErrorHandler);
```

### Custom Error Classes

```typescript
import { AppError } from '../middleware/errorHandler';

// Throw custom errors
throw new AppError('Resource not found', 404, 'NOT_FOUND');
```

## Best Practices

1. **Always use ApiResponse utility** for consistent response formats
2. **Apply validation middleware** to all routes that accept input
3. **Use appropriate rate limiting** based on endpoint sensitivity
4. **Sanitize user input** especially for content that will be stored or displayed
5. **Include pagination** for list endpoints
6. **Handle errors gracefully** with meaningful error messages
7. **Use proper HTTP status codes** for different scenarios
8. **Log important events** for monitoring and debugging

## Testing

The system includes comprehensive tests. Run them with:

```bash
npm test src/tests/apiResponseValidation.test.ts
```

## Configuration

Environment variables for configuration:

```env
# CORS
CORS_ALLOWED_ORIGINS=https://example.com,https://app.example.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# API
API_VERSION=1.0.0
```

## Monitoring

The system provides built-in monitoring capabilities:

- Request/response logging
- Performance metrics
- Error tracking
- Rate limit monitoring
- Security event logging

All logs include correlation IDs for easy debugging and monitoring.
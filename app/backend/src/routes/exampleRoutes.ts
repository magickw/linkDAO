import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { ApiResponse } from '../utils/apiResponse';
import { validateRequest, marketplaceSchemas, commonSchemas } from '../middleware/joiValidation';
import { paginationUtils } from '../utils/pagination';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';
import { textSanitization } from '../utils/sanitizer';

const router = express.Router();

/**
 * Example route demonstrating API response standardization and validation
 * GET /api/example/products
 */
router.get('/products',
  rateLimitingMiddleware(),
  validateRequest({
    query: commonSchemas.pagination.keys({
      category: commonSchemas.content.extract(['category']).optional(),
      search: commonSchemas.content.extract(['title']).optional()
    })
  }),
  async (req, res) => {
    try {
      // Extract pagination parameters
      const { page, limit, offset } = paginationUtils.extractPaginationFromRequest(req);
      const { category, search } = req.query as any;

      // Simulate database query
      const mockProducts = Array.from({ length: 100 }, (_, i) => ({
        id: `product-${i + 1}`,
        title: `Product ${i + 1}`,
        description: `Description for product ${i + 1}`,
        price: {
          amount: Math.random() * 1000,
          currency: 'ETH'
        },
        category: ['electronics', 'fashion', 'home'][i % 3],
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
      }));

      // Apply filters
      let filteredProducts = mockProducts;
      if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category);
      }
      if (search) {
        filteredProducts = filteredProducts.filter(p => 
          p.title.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Apply pagination
      const total = filteredProducts.length;
      const paginatedProducts = filteredProducts.slice(offset, offset + limit);

      // Create pagination info
      const pagination = paginationUtils.createPaginationInfo(page, limit, total);

      // Return standardized response
      ApiResponse.success(res, paginatedProducts, 200, pagination);
    } catch (error) {
      safeLogger.error('Error fetching products:', error);
      ApiResponse.serverError(res, 'Failed to fetch products');
    }
  }
);

/**
 * Example route demonstrating validation and sanitization
 * POST /api/example/products
 */
router.post('/products', csrfProtection, 
  rateLimitingMiddleware(),
  textSanitization,
  validateRequest(marketplaceSchemas.createListing),
  async (req, res) => {
    try {
      const productData = req.body;

      // Simulate product creation
      const newProduct = {
        id: `product-${Date.now()}`,
        ...productData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Return created response
      ApiResponse.created(res, newProduct);
    } catch (error) {
      safeLogger.error('Error creating product:', error);
      ApiResponse.serverError(res, 'Failed to create product');
    }
  }
);

/**
 * Example route demonstrating error handling
 * GET /api/example/products/:id
 */
router.get('/products/:id',
  rateLimitingMiddleware(),
  validateRequest({
    params: commonSchemas.idParam
  }),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Simulate product lookup
      if (id === 'not-found') {
        return ApiResponse.notFound(res, 'Product not found');
      }

      if (id === 'error') {
        throw new Error('Simulated server error');
      }

      const product = {
        id,
        title: `Product ${id}`,
        description: `Description for product ${id}`,
        price: {
          amount: 100.50,
          currency: 'ETH'
        },
        category: 'electronics',
        createdAt: new Date().toISOString()
      };

      ApiResponse.success(res, product);
    } catch (error) {
      safeLogger.error('Error fetching product:', error);
      ApiResponse.serverError(res, 'Failed to fetch product');
    }
  }
);

/**
 * Example route demonstrating validation errors
 * PUT /api/example/products/:id
 */
router.put('/products/:id', csrfProtection, 
  rateLimitingMiddleware(),
  textSanitization,
  validateRequest({
    params: commonSchemas.idParam,
    body: marketplaceSchemas.createListing.body.optional()
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Simulate product update
      const updatedProduct = {
        id,
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      ApiResponse.success(res, updatedProduct);
    } catch (error) {
      safeLogger.error('Error updating product:', error);
      ApiResponse.serverError(res, 'Failed to update product');
    }
  }
);

/**
 * Example route demonstrating different HTTP status codes
 * DELETE /api/example/products/:id
 */
router.delete('/products/:id', csrfProtection, 
  rateLimitingMiddleware(),
  validateRequest({
    params: commonSchemas.idParam
  }),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Simulate product deletion
      if (id === 'not-found') {
        return ApiResponse.notFound(res, 'Product not found');
      }

      if (id === 'forbidden') {
        return ApiResponse.forbidden(res, 'You do not have permission to delete this product');
      }

      // Return no content for successful deletion
      ApiResponse.noContent(res);
    } catch (error) {
      safeLogger.error('Error deleting product:', error);
      ApiResponse.serverError(res, 'Failed to delete product');
    }
  }
);

export default router;

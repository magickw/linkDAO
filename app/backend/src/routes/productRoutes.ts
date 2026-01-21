import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { ProductController } from '../controllers/productController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const productController = new ProductController();

// Category routes
router.post('/categories', csrfProtection, asyncHandler(productController.createCategory.bind(productController)));
router.get('/categories', asyncHandler(productController.getAllCategories.bind(productController)));
router.get('/categories/:id', asyncHandler(productController.getCategoryById.bind(productController)));
router.get('/categories/slug/:slug', asyncHandler(productController.getCategoryBySlug.bind(productController)));
router.get('/categories/parent/:parentId', asyncHandler(productController.getCategoriesByParent.bind(productController)));
router.put('/categories/:id', csrfProtection, asyncHandler(productController.updateCategory.bind(productController)));
router.delete('/categories/:id', csrfProtection, asyncHandler(productController.deleteCategory.bind(productController)));

// Product routes
router.get('/products', asyncHandler(productController.getAllProducts.bind(productController)));
router.post('/products', csrfProtection, asyncHandler(productController.createProduct.bind(productController)));
router.get('/products/search', asyncHandler(productController.searchProducts.bind(productController)));
router.get('/products/search/advanced', asyncHandler(productController.advancedSearch.bind(productController)));
router.get('/products/recommendations', asyncHandler(productController.getRecommendations.bind(productController)));
router.get('/products/compare', asyncHandler(productController.compareProducts.bind(productController)));
router.get('/products/suggestions', asyncHandler(productController.getSearchSuggestions.bind(productController)));
router.get('/products/seller/:sellerId', asyncHandler(productController.getProductsBySeller.bind(productController)));
router.get('/products/:id', asyncHandler(productController.getProductById.bind(productController)));
router.post('/products/:id/view', asyncHandler(productController.incrementViews.bind(productController)));
router.put('/products/:id', csrfProtection, asyncHandler(productController.updateProduct.bind(productController)));
router.delete('/products/:id', csrfProtection, asyncHandler(productController.deleteProduct.bind(productController)));

// Image upload routes
router.post('/products/images/upload', csrfProtection,
  ProductController.getUploadMiddleware().array('images', 10),
  asyncHandler(productController.uploadProductImages.bind(productController))
);

// Bulk operations
router.post('/products/bulk', csrfProtection, asyncHandler(productController.bulkUploadProducts.bind(productController)));
router.post('/products/csv/upload', csrfProtection,
  ProductController.getUploadMiddleware().single('csvFile'),
  asyncHandler(productController.uploadProductsCSV.bind(productController))
);

// Analytics
router.get('/products/:id/analytics', asyncHandler(productController.getProductAnalytics.bind(productController)));
router.get('/search/analytics', asyncHandler(productController.getSearchAnalytics.bind(productController)));
router.post('/search/optimize', csrfProtection, asyncHandler(productController.optimizeSearchPerformance.bind(productController)));

export default router;

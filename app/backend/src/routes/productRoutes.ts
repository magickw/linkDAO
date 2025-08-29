import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const productController = new ProductController();

// Category routes
router.post('/categories', asyncHandler(productController.createCategory.bind(productController)));
router.get('/categories', asyncHandler(productController.getAllCategories.bind(productController)));
router.get('/categories/:id', asyncHandler(productController.getCategoryById.bind(productController)));
router.get('/categories/slug/:slug', asyncHandler(productController.getCategoryBySlug.bind(productController)));
router.get('/categories/parent/:parentId', asyncHandler(productController.getCategoriesByParent.bind(productController)));
router.put('/categories/:id', asyncHandler(productController.updateCategory.bind(productController)));
router.delete('/categories/:id', asyncHandler(productController.deleteCategory.bind(productController)));

// Product routes
router.post('/products', asyncHandler(productController.createProduct.bind(productController)));
router.get('/products/search', asyncHandler(productController.searchProducts.bind(productController)));
router.get('/products/seller/:sellerId', asyncHandler(productController.getProductsBySeller.bind(productController)));
router.get('/products/:id', asyncHandler(productController.getProductById.bind(productController)));
router.put('/products/:id', asyncHandler(productController.updateProduct.bind(productController)));
router.delete('/products/:id', asyncHandler(productController.deleteProduct.bind(productController)));

// Image upload routes
router.post('/products/images/upload', 
  ProductController.getUploadMiddleware().array('images', 10),
  asyncHandler(productController.uploadProductImages.bind(productController))
);

// Bulk operations
router.post('/products/bulk', asyncHandler(productController.bulkUploadProducts.bind(productController)));
router.post('/products/csv/upload',
  ProductController.getUploadMiddleware().single('csvFile'),
  asyncHandler(productController.uploadProductsCSV.bind(productController))
);

// Analytics
router.get('/products/:id/analytics', asyncHandler(productController.getProductAnalytics.bind(productController)));

export default router;
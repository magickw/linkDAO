import { Router } from 'express';
import { sellerController } from '../controllers/sellerController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Seller Dashboard and Listing Management Routes (Protected)
router.use(authMiddleware); // All seller routes require authentication

// POST /api/sellers/listings - Create new product listing
router.post('/listings', 
  validateRequest({
    body: {
      title: { type: 'string', required: true, minLength: 3, maxLength: 500 },
      description: { type: 'string', required: true, minLength: 10 },
      category: { type: 'string', required: true, maxLength: 100 },
      priceCrypto: { type: 'number', required: true, min: 0 },
      currency: { type: 'string', optional: true, enum: ['USDC', 'ETH', 'MATIC'] },
      isPhysical: { type: 'boolean', optional: true },
      stock: { type: 'number', optional: true, min: 0 },
      metadataUri: { type: 'string', optional: true }
    }
  }),
  sellerController.createListing.bind(sellerController)
);

// PUT /api/sellers/listings/:id - Update existing listing
router.put('/listings/:id',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      title: { type: 'string', optional: true, minLength: 3, maxLength: 500 },
      description: { type: 'string', optional: true, minLength: 10 },
      category: { type: 'string', optional: true, maxLength: 100 },
      priceCrypto: { type: 'number', optional: true, min: 0 },
      currency: { type: 'string', optional: true, enum: ['USDC', 'ETH', 'MATIC'] },
      isPhysical: { type: 'boolean', optional: true },
      stock: { type: 'number', optional: true, min: 0 },
      status: { type: 'string', optional: true, enum: ['active', 'inactive', 'draft', 'sold_out'] },
      metadataUri: { type: 'string', optional: true }
    }
  }),
  sellerController.updateListing.bind(sellerController)
);

// DELETE /api/sellers/listings/:id - Delete listing
router.delete('/listings/:id',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  sellerController.deleteListing.bind(sellerController)
);

// GET /api/sellers/dashboard - Seller analytics and metrics
router.get('/dashboard',
  validateRequest({
    query: {
      period: { type: 'string', optional: true, enum: ['7d', '30d', '90d', '1y'] },
      includeOrders: { type: 'string', optional: true, enum: ['true', 'false'] },
      includeAnalytics: { type: 'string', optional: true, enum: ['true', 'false'] }
    }
  }),
  sellerController.getDashboard.bind(sellerController)
);

// PUT /api/sellers/profile - Update seller store information
router.put('/profile',
  validateRequest({
    body: {
      displayName: { type: 'string', optional: true, minLength: 2, maxLength: 100 },
      storeName: { type: 'string', optional: true, minLength: 2, maxLength: 100 },
      bio: { type: 'string', optional: true, maxLength: 500 },
      description: { type: 'string', optional: true, maxLength: 2000 },
      location: { type: 'string', optional: true, maxLength: 255 },
      websiteUrl: { type: 'string', optional: true },
      twitterHandle: { type: 'string', optional: true, maxLength: 50 },
      discordHandle: { type: 'string', optional: true, maxLength: 50 },
      telegramHandle: { type: 'string', optional: true, maxLength: 50 },
      ensHandle: { type: 'string', optional: true, maxLength: 100 }
    }
  }),
  sellerController.updateProfile.bind(sellerController)
);

// GET /api/sellers/listings - Get seller's own listings
router.get('/listings',
  validateRequest({
    query: {
      status: { type: 'string', optional: true, enum: ['active', 'inactive', 'draft', 'sold_out', 'suspended'] },
      category: { type: 'string', optional: true },
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 100 },
      sortBy: { type: 'string', optional: true, enum: ['created_at', 'updated_at', 'price', 'title'] },
      sortOrder: { type: 'string', optional: true, enum: ['asc', 'desc'] }
    }
  }),
  sellerController.getMyListings.bind(sellerController)
);

// GET /api/sellers/orders - Get seller's orders
router.get('/orders',
  validateRequest({
    query: {
      status: { type: 'string', optional: true, enum: ['pending', 'shipped', 'delivered', 'disputed', 'completed', 'cancelled'] },
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 100 },
      sortBy: { type: 'string', optional: true, enum: ['created_at', 'updated_at', 'amount'] },
      sortOrder: { type: 'string', optional: true, enum: ['asc', 'desc'] }
    }
  }),
  sellerController.getMyOrders.bind(sellerController)
);

// GET /api/sellers/analytics - Get seller analytics
router.get('/analytics',
  validateRequest({
    query: {
      period: { type: 'string', optional: true, enum: ['7d', '30d', '90d', '1y'] },
      metrics: { type: 'string', optional: true } // comma-separated list
    }
  }),
  sellerController.getAnalytics.bind(sellerController)
);

// GET /api/sellers/profile - Get seller profile
router.get('/profile', sellerController.getProfile.bind(sellerController));

// GET /api/sellers/stats - Get seller statistics
router.get('/stats', sellerController.getStats.bind(sellerController));

// POST /api/sellers/verify - Request seller verification
router.post('/verify',
  validateRequest({
    body: {
      verificationType: { type: 'string', required: true, enum: ['email', 'phone', 'kyc'] },
      verificationData: { type: 'object', optional: true }
    }
  }),
  sellerController.requestVerification.bind(sellerController)
);

// Legacy routes for backward compatibility
// Seller Applications Routes
router.get('/applications', sellerController.getSellerApplications.bind(sellerController));
router.get('/applications/:applicationId', sellerController.getSellerApplication.bind(sellerController));
router.post('/applications/:applicationId/review', sellerController.reviewSellerApplication.bind(sellerController));
router.get('/applications/:applicationId/risk-assessment', sellerController.getSellerRiskAssessment.bind(sellerController));

// Seller Performance Routes
router.get('/performance', sellerController.getSellerPerformance.bind(sellerController));
router.get('/performance/export', sellerController.exportSellerPerformance.bind(sellerController));

export default router;

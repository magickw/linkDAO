import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { sellerController } from '../controllers/sellerController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Public seller profile endpoint (no authentication required)
// GET /api/sellers/:walletAddress/profile - Get public seller profile by wallet address
router.get('/:walletAddress/profile', sellerController.getPublicSellerProfile.bind(sellerController));

// Seller Dashboard and Listing Management Routes (Protected)
router.use(authMiddleware); // All other seller routes require authentication

// POST /api/sellers/listings - Create new product listing
router.post('/listings', csrfProtection,
  validateRequest({
    body: {
      title: { type: 'string', required: true, minLength: 3, maxLength: 500 },
      description: { type: 'string', required: true, minLength: 10 },
      category: { type: 'string', required: true, maxLength: 100 },
      priceCrypto: { type: 'number', required: true, min: 0 },
      currency: { type: 'string', optional: true, enum: ['USDC', 'ETH', 'MATIC'] },
      isPhysical: { type: 'boolean', optional: true },
      inventory: { type: 'number', optional: true, min: 0 },
      metadataUri: { type: 'string', optional: true }
    }
  }),
  sellerController.createListing.bind(sellerController)
);

// PUT /api/sellers/listings/:id - Update existing listing
router.put('/listings/:id', csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      title: { type: 'string', optional: true, minLength: 3, maxLength: 500 },
      description: { type: 'string', optional: true, minLength: 10 },
      category: { type: 'string', optional: true, maxLength: 100 },
      price: { type: 'number', optional: true, min: 0 },
      priceCrypto: { type: 'number', optional: true, min: 0 },
      currency: { type: 'string', optional: true, enum: ['USDC', 'ETH', 'MATIC', 'USD', 'USDT'] },
      isPhysical: { type: 'boolean', optional: true },
      inventory: { type: 'number', optional: true, min: 0 },
      status: { type: 'string', optional: true, enum: ['active', 'inactive', 'draft', 'sold_out'] },
      metadataUri: { type: 'string', optional: true },
      // Enhanced fields
      images: { type: 'array', optional: true },
      tags: { type: 'array', optional: true },
      condition: { type: 'string', optional: true },
      escrowEnabled: { type: 'boolean', optional: true },
      shipping: { type: 'object', optional: true },
      specifications: { type: 'object', optional: true },
      variants: { type: 'array', optional: true },
      itemType: { type: 'string', optional: true },
      seoTitle: { type: 'string', optional: true },
      seoDescription: { type: 'string', optional: true }
    }
  }),
  sellerController.updateListing.bind(sellerController)
);

// DELETE /api/sellers/listings/:id - Delete listing
router.delete('/listings/:id', csrfProtection,
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
router.put('/profile', csrfProtection,
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
      ensHandle: { type: 'string', optional: true, maxLength: 100 },
      profileImageIpfs: { type: 'string', optional: true, maxLength: 255 },
      profileImageCdn: { type: 'string', optional: true, maxLength: 500 }
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

// GET /api/sellers/onboarding - Get onboarding steps
router.get('/onboarding', sellerController.getOnboardingProgress.bind(sellerController));

// PUT /api/sellers/onboarding/:stepId - Update onboarding step
router.put('/onboarding/:stepId', csrfProtection,
  validateRequest({
    params: {
      stepId: { type: 'string', required: true }
    },
    body: {
      completed: { type: 'boolean', required: true },
      data: { type: 'object', optional: true }
    }
  }),
  sellerController.updateOnboardingStepNew.bind(sellerController)
);

// GET /api/sellers/tier - Get seller tier information
router.get('/tier', sellerController.getSellerTier.bind(sellerController));

// GET /api/sellers/tier/progress - Get tier progress
router.get('/tier/progress', sellerController.getTierProgress.bind(sellerController));

// POST /api/sellers/tier/evaluate - Trigger tier evaluation
router.post('/tier/evaluate', csrfProtection, sellerController.triggerTierEvaluation.bind(sellerController));

// GET /api/sellers/tier/criteria - Get tier criteria
router.get('/tier/criteria', sellerController.getTierCriteria.bind(sellerController));

// GET /api/sellers/tier/history - Get tier evaluation history
router.get('/tier/history', sellerController.getTierEvaluationHistory.bind(sellerController));

// POST /api/sellers/verify - Request seller verification
router.post('/verify', csrfProtection,
  validateRequest({
    body: {
      verificationType: { type: 'string', required: true, enum: ['email', 'phone', 'kyc'] },
      verificationData: { type: 'object', optional: true }
    }
  }),
  sellerController.requestVerification.bind(sellerController)
);

// Application Management Routes (NEW - replaces legacy routes)
// POST /api/sellers/application/submit - Submit onboarding application for review (SELLER)
router.post('/application/submit', csrfProtection,
  sellerController.submitApplicationForReview.bind(sellerController)
);

// GET /api/sellers/application/status - Get application review status (SELLER)
router.get('/application/status',
  sellerController.getApplicationStatus.bind(sellerController)
);

// PUT /api/sellers/application/step/:stepId - Update onboarding step (SELLER)
router.put('/application/step/:stepId', csrfProtection,
  validateRequest({
    params: {
      stepId: { type: 'string', required: true }
    },
    body: {
      completed: { type: 'boolean', required: true }
    }
  }),
  sellerController.updateOnboardingStepNew.bind(sellerController)
);

// GET /api/sellers/application/progress - Get onboarding progress (SELLER)
router.get('/application/progress',
  sellerController.getOnboardingProgress.bind(sellerController)
);

// GET /api/sellers/admin/applications - List all applications (ADMIN)
router.get('/admin/applications',
  sellerController.getSellerApplicationsNew.bind(sellerController)
);

// POST /api/sellers/:applicationId/application/review - Review application (ADMIN)
// Note: This requires admin role, enforced in middleware
router.post('/:applicationId/application/review', csrfProtection,
  validateRequest({
    params: {
      applicationId: { type: 'string', required: true }
    },
    body: {
      status: { type: 'string', required: true, enum: ['approved', 'rejected', 'under_review'] },
      rejectionReason: { type: 'string', optional: true },
      adminNotes: { type: 'string', optional: true }
    }
  }),
  sellerController.reviewSellerApplicationNew.bind(sellerController)
);

// Legacy routes for backward compatibility
// Seller Applications Routes (DEPRECATED - use /application/* routes above)
router.get('/applications', sellerController.getSellerApplications.bind(sellerController));
router.get('/applications/:applicationId', sellerController.getSellerApplication.bind(sellerController));
router.post('/applications/:applicationId/review', csrfProtection, sellerController.reviewSellerApplicationNew.bind(sellerController));
router.get('/applications/:applicationId/risk-assessment', sellerController.getSellerRiskAssessment.bind(sellerController));

// Seller Performance Routes
router.get('/performance', sellerController.getSellerPerformance.bind(sellerController));
router.get('/performance/export', sellerController.exportSellerPerformance.bind(sellerController));

export default router;

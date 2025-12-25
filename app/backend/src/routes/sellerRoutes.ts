import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { sellerController } from '../controllers/sellerController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Seller Dashboard and Listing Management Routes (Protected)
router.use(authMiddleware); // All seller routes require authentication

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
      stock: { type: 'number', optional: true, min: 0 },
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
router.get('/onboarding', sellerController.getOnboardingSteps.bind(sellerController));

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
  sellerController.updateOnboardingStep.bind(sellerController)
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

// Legacy routes for backward compatibility
// Seller Applications Routes
router.get('/applications', sellerController.getSellerApplications.bind(sellerController));
router.get('/applications/:applicationId', sellerController.getSellerApplication.bind(sellerController));
router.post('/applications/:applicationId/review', csrfProtection,  sellerController.reviewSellerApplication.bind(sellerController));
router.get('/applications/:applicationId/risk-assessment', sellerController.getSellerRiskAssessment.bind(sellerController));

// Seller Performance Routes
router.get('/performance', sellerController.getSellerPerformance.bind(sellerController));
router.get('/performance/export', sellerController.exportSellerPerformance.bind(sellerController));

// Seller Tier Management Routes
router.get('/tier/current', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tierInfo = await sellerService.calculateSellerTier(walletAddress);
    res.json(tierInfo);
  } catch (error) {
    safeLogger.error('Error getting current seller tier:', error);
    res.status(500).json({ error: 'Failed to get seller tier information' });
  }
});

router.post('/tier/evaluate', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { autoUpgrade = true } = req.body;
    const tierUpdate = await sellerService.updateSellerTier(walletAddress, autoUpgrade);
    res.json(tierUpdate);
  } catch (error) {
    safeLogger.error('Error evaluating seller tier:', error);
    res.status(500).json({ error: 'Failed to evaluate seller tier' });
  }
});

router.get('/tier/history', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const history = await sellerService.getTierHistory(walletAddress, limit);
    res.json(history);
  } catch (error) {
    safeLogger.error('Error getting seller tier history:', error);
    res.status(500).json({ error: 'Failed to get tier history' });
  }
});

router.get('/tier/requirements/:tier', async (req: Request, res: Response) => {
  try {
    const { tier } = req.params;
    const requirements = await sellerService.getTierRequirements(tier);
    res.json(requirements);
  } catch (error) {
    safeLogger.error('Error getting tier requirements:', error);
    res.status(500).json({ error: 'Failed to get tier requirements' });
  }
});

router.get('/tier/benefits/:tier', async (req: Request, res: Response) => {
  try {
    const { tier } = req.params;
    const benefits = await sellerService.getTierBenefits(tier);
    res.json(benefits);
  } catch (error) {
    safeLogger.error('Error getting tier benefits:', error);
    res.status(500).json({ error: 'Failed to get tier benefits' });
  }
});

router.get('/tier/all', async (req: Request, res: Response) => {
  try {
    const allTiers = await sellerService.getAllTiers();
    res.json(allTiers);
  } catch (error) {
    safeLogger.error('Error getting all tiers:', error);
    res.status(500).json({ error: 'Failed to get tier information' });
  }
});

// Seller Tier Analytics Routes
router.get('/tier/analytics', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const analytics = await sellerAnalyticsService.getTierAnalytics(walletAddress);
    res.json(analytics);
  } catch (error) {
    safeLogger.error('Error getting seller tier analytics:', error);
    res.status(500).json({ error: 'Failed to get tier analytics' });
  }
});

router.get('/tier/distribution', async (req: Request, res: Response) => {
  try {
    const distribution = await sellerAnalyticsService.getTierDistributionAnalytics();
    res.json(distribution);
  } catch (error) {
    safeLogger.error('Error getting tier distribution analytics:', error);
    res.status(500).json({ error: 'Failed to get tier distribution analytics' });
  }
});

export default router;

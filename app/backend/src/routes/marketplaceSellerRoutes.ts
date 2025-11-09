import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import multer from 'multer';
import { sellerController } from '../controllers/sellerController';

const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Marketplace Seller Profile Routes
// These routes are mapped to match the frontend expectations at /api/marketplace/seller/...
router.get('/seller/:walletAddress', sellerController.getProfile.bind(sellerController));
router.post('/seller/profile', csrfProtection, sellerController.createProfile.bind(sellerController));
router.put('/seller/:walletAddress', csrfProtection, sellerController.updateProfile.bind(sellerController));

// Enhanced profile update with image support
router.put(
  '/seller/:walletAddress/enhanced',
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  sellerController.updateProfileEnhanced.bind(sellerController)
);

// Profile validation and completeness
router.get('/seller/:walletAddress/completeness', sellerController.getProfileCompleteness.bind(sellerController));
router.post('/seller/profile/validate', csrfProtection, sellerController.validateProfile.bind(sellerController));

// Seller statistics
router.get('/seller/stats/:walletAddress', sellerController.getSellerStats.bind(sellerController));

// Seller tier and progress
router.get('/seller/:walletAddress/tier', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { sellerProfileService } = await import('../services/sellerProfileService');
    
    const tier = await sellerProfileService.getSellerTier(walletAddress);
    
    res.json({
      success: true,
      data: tier
    });
  } catch (error) {
    console.error('Error fetching seller tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seller tier',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/seller/:walletAddress/tier/progress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { sellerProfileService } = await import('../services/sellerProfileService');
    
    const progress = await sellerProfileService.getTierProgress(walletAddress);
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error fetching tier progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tier progress',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ENS validation routes
router.post('/seller/ens/validate', csrfProtection,  sellerController.validateENS.bind(sellerController));
router.post('/seller/ens/verify-ownership', csrfProtection,  sellerController.verifyENSOwnership.bind(sellerController));

// Profile synchronization routes
router.post('/seller/:walletAddress/sync', csrfProtection,  sellerController.forceSyncProfile.bind(sellerController));
router.get('/seller/:walletAddress/sync/validate', sellerController.validateProfileSync.bind(sellerController));
router.get('/seller/:walletAddress/history', sellerController.getProfileHistory.bind(sellerController));

// Onboarding routes - using actual service implementation
router.get('/seller/onboarding/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { sellerProfileService } = await import('../services/sellerProfileService');
    
    const onboardingStatus = await sellerProfileService.getOnboardingStatus(walletAddress);
    
    res.json({
      success: true,
      data: onboardingStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get onboarding status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.put(
  '/seller/onboarding/:walletAddress/:stepId', csrfProtection, async (req, res) => {
    try {
      const { walletAddress, stepId } = req.params;
      const { completed } = req.body;
      
      // Normalize step ID: convert hyphens to underscores for backend compatibility
      // Frontend uses: 'profile-setup', Backend uses: 'profile_setup'
      const normalizedStep = stepId.replace(/-/g, '_');
      
      const { sellerProfileService } = await import('../services/sellerProfileService');
      
      // First ensure seller profile exists
      const existingProfile = await sellerProfileService.getProfile(walletAddress);
      if (!existingProfile) {
        // Create basic profile if it doesn't exist
        await sellerController.createProfile({
          body: {
            walletAddress,
            businessName: 'Seller',
            email: `${walletAddress}@example.com`,
            description: 'New seller profile'
          }
        } as any, {
          status: () => ({ json: (data: any) => data })
        } as any);
      }
      
      const onboardingStatus = await sellerProfileService.updateOnboardingStep(
        walletAddress,
        normalizedStep as keyof import('../types/sellerProfile').OnboardingSteps,
        completed
      );
      
      res.json({
        success: true,
        message: `Onboarding step ${stepId} updated successfully`,
        data: onboardingStatus
      });
    } catch (error) {
      console.error('Error updating onboarding step:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update onboarding step',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

export default router;

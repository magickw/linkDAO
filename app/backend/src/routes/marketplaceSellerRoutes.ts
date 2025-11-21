import { Router, Request, Response } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import multer from 'multer';
import { sellerController } from '../controllers/sellerController';
import { sellerProfileService } from '../services/sellerProfileService';
import { successResponse, errorResponse } from '../utils/apiResponse';

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

// NOTE: Seller Profile routes are now handled by sellerProfileRoutes
// This avoids conflicts and ensures proper onboarding flow support

// GET profile - Primary endpoint for fetching seller profile
router.get('/seller/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }

    const profile = await sellerProfileService.getProfile(walletAddress);

    // Return 404 if profile not found, not 500
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Seller profile not found'
      });
    }

    return successResponse(res, profile, 200);
  } catch (error) {
    return errorResponse(
      res,
      'PROFILE_FETCH_ERROR',
      'Failed to get seller profile',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

// PUT profile - Update seller profile
router.put('/seller/:walletAddress', csrfProtection, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }

    const updateData = req.body;
    const updatedProfile = await sellerProfileService.updateProfile(walletAddress, updateData);

    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        error: 'Seller profile not found'
      });
    }

    return successResponse(res, updatedProfile, 200);
  } catch (error) {
    return errorResponse(
      res,
      'PROFILE_UPDATE_ERROR',
      'Failed to update seller profile',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

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

// ENS validation routes
router.post('/seller/ens/validate', csrfProtection,  sellerController.validateENS.bind(sellerController));
router.post('/seller/ens/verify-ownership', csrfProtection,  sellerController.verifyENSOwnership.bind(sellerController));

// Profile synchronization routes
router.post('/seller/:walletAddress/sync', csrfProtection,  sellerController.forceSyncProfile.bind(sellerController));
router.get('/seller/:walletAddress/sync/validate', sellerController.validateProfileSync.bind(sellerController));
router.get('/seller/:walletAddress/history', sellerController.getProfileHistory.bind(sellerController));

// Onboarding routes - using actual service implementation
router.get('/seller/onboarding/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    
    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }
    
    const onboardingStatus = await sellerProfileService.getOnboardingStatus(walletAddress);
    
    return successResponse(res, onboardingStatus, 200);
  } catch (error) {
    return errorResponse(
      res,
      'ONBOARDING_FETCH_ERROR',
      'Failed to get onboarding status',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

router.put(
  '/seller/onboarding/:walletAddress/:stepId', 
  csrfProtection, 
  async (req: Request, res: Response) => {
    try {
      const { walletAddress, stepId } = req.params;
      const { completed } = req.body;
      
      // Validate wallet address format
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid wallet address format'
        });
      }
      
      // Validate completed parameter
      if (typeof completed !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Completed must be a boolean value'
        });
      }
      
      // Normalize step ID: convert hyphens to underscores for backend compatibility
      // Frontend uses: 'profile-setup', Backend uses: 'profile_setup'
      const normalizedStep = stepId.replace(/-/g, '_') as keyof import('../types/sellerProfile').OnboardingSteps;
      
      // Validate step parameter
      const validSteps = ['profile_setup', 'verification', 'payout_setup', 'first_listing'];
      if (!validSteps.includes(normalizedStep)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid onboarding step'
        });
      }
      
      // First ensure seller profile exists
      let existingProfile = await sellerProfileService.getProfile(walletAddress);
      if (!existingProfile) {
        // Create basic profile if it doesn't exist
        existingProfile = await sellerProfileService.createProfile({
          walletAddress,
          storeName: 'New Seller',
          displayName: 'New Seller'
        });
      }
      
      const onboardingStatus = await sellerProfileService.updateOnboardingStep(
        walletAddress,
        normalizedStep,
        completed
      );
      
      return successResponse(res, onboardingStatus, 200);
    } catch (error) {
      return errorResponse(
        res,
        'ONBOARDING_UPDATE_ERROR',
        'Failed to update onboarding step',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

export default router;
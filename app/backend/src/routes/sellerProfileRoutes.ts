import { Router, Request, Response } from 'express';
import { sellerProfileService } from '../services/sellerProfileService';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '../utils/apiResponse';
import { 
  CreateSellerProfileRequest, 
  UpdateSellerProfileRequest,
  SellerProfile,
  OnboardingStatus 
} from '../types/sellerProfile';

const router = Router();

/**
 * GET /api/marketplace/seller/{walletAddress}
 * Get seller profile by wallet address
 * Returns null data instead of 404 for missing profiles
 */
router.get('/seller/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return validationErrorResponse(res, [
        { field: 'walletAddress', message: 'Invalid wallet address format' }
      ], 'Invalid wallet address');
    }

    const profile = await sellerProfileService.getProfile(walletAddress);
    
    // Return null data instead of 404 error for missing profiles
    if (!profile) {
      return notFoundResponse<SellerProfile>(res, 'Seller profile not found');
    }

    return successResponse(res, profile, 200);
  } catch (error) {
    console.error('Error fetching seller profile:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid wallet address')) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: error.message }
        ]);
      }
    }

    return errorResponse(
      res,
      'PROFILE_FETCH_ERROR',
      'Failed to fetch seller profile',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

/**
 * POST /api/marketplace/seller/profile
 * Create or update seller profile
 */
router.post('/seller/profile', async (req: Request, res: Response) => {
  try {
    const profileData: CreateSellerProfileRequest = req.body;

    // Validate required fields
    if (!profileData.walletAddress) {
      return validationErrorResponse(res, [
        { field: 'walletAddress', message: 'Wallet address is required' }
      ]);
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(profileData.walletAddress)) {
      return validationErrorResponse(res, [
        { field: 'walletAddress', message: 'Invalid wallet address format' }
      ]);
    }

    // Validate ENS handle if provided
    if (profileData.ensHandle && !/^[a-zA-Z0-9-]+\.eth$/.test(profileData.ensHandle)) {
      return validationErrorResponse(res, [
        { field: 'ensHandle', message: 'Invalid ENS handle format' }
      ]);
    }

    // Check if profile already exists
    const existingProfile = await sellerProfileService.getProfile(profileData.walletAddress);
    
    let profile: SellerProfile;
    
    if (existingProfile) {
      // Update existing profile
      const updateData: UpdateSellerProfileRequest = {
        displayName: profileData.displayName,
        ensHandle: profileData.ensHandle,
        storeDescription: profileData.storeDescription,
        coverImageUrl: profileData.coverImageUrl
      };
      
      profile = await sellerProfileService.updateProfile(profileData.walletAddress, updateData);
    } else {
      // Create new profile
      profile = await sellerProfileService.createProfile(profileData);
    }

    return successResponse(res, profile, existingProfile ? 200 : 201);
  } catch (error) {
    console.error('Error creating/updating seller profile:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid wallet address') || error.message.includes('Invalid ENS handle')) {
        return validationErrorResponse(res, [
          { field: 'validation', message: error.message }
        ]);
      }
      
      if (error.message.includes('already exists')) {
        return errorResponse(
          res,
          'PROFILE_CONFLICT',
          'Seller profile already exists',
          409,
          { walletAddress: req.body.walletAddress }
        );
      }
    }

    return errorResponse(
      res,
      'PROFILE_CREATE_ERROR',
      'Failed to create or update seller profile',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

/**
 * GET /api/marketplace/seller/onboarding/{walletAddress}
 * Get onboarding status for a seller
 */
router.get('/seller/onboarding/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return validationErrorResponse(res, [
        { field: 'walletAddress', message: 'Invalid wallet address format' }
      ]);
    }

    const onboardingStatus = await sellerProfileService.getOnboardingStatus(walletAddress);
    
    return successResponse(res, onboardingStatus, 200);
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid wallet address')) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: error.message }
        ]);
      }
    }

    return errorResponse(
      res,
      'ONBOARDING_FETCH_ERROR',
      'Failed to fetch onboarding status',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

/**
 * PUT /api/marketplace/seller/onboarding/{walletAddress}/{step}
 * Update specific onboarding step
 */
router.put('/seller/onboarding/:walletAddress/:step', async (req: Request, res: Response) => {
  try {
    const { walletAddress, step } = req.params;
    const { completed } = req.body;

    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return validationErrorResponse(res, [
        { field: 'walletAddress', message: 'Invalid wallet address format' }
      ]);
    }

    // Validate step parameter
    const validSteps = ['profile_setup', 'verification', 'payout_setup', 'first_listing'];
    if (!validSteps.includes(step)) {
      return validationErrorResponse(res, [
        { field: 'step', message: 'Invalid onboarding step' }
      ]);
    }

    // Validate completed parameter
    if (typeof completed !== 'boolean') {
      return validationErrorResponse(res, [
        { field: 'completed', message: 'Completed must be a boolean value' }
      ]);
    }

    const onboardingStatus = await sellerProfileService.updateOnboardingStep(
      walletAddress, 
      step as keyof import('../types/sellerProfile').OnboardingSteps, 
      completed
    );
    
    return successResponse(res, onboardingStatus, 200);
  } catch (error) {
    console.error('Error updating onboarding step:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return notFoundResponse<OnboardingStatus>(res, 'Seller profile not found');
      }
      
      if (error.message.includes('Invalid wallet address')) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: error.message }
        ]);
      }
    }

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
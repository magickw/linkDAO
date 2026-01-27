import { Router, Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { sellerProfileService } from '../services/marketplace/sellerProfileService';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '../utils/apiResponse';
import { cachingMiddleware, rateLimitWithCache } from '../middleware/cachingMiddleware';
import { sanitizeWalletAddress } from '../utils/inputSanitization';
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
 * 
 * NOTE: This is the primary endpoint for seller profile operations
 * and should not be duplicated in other route files to avoid conflicts
 */
router.get('/seller/:walletAddress',
  rateLimitWithCache(req => `seller_profile:${req.ip}`, 60, 60), // 60 requests per minute
  cachingMiddleware.sellerProfileCache(),
  async (req: Request, res: Response) => {
    try {
      let { walletAddress } = req.params;

      // Validate wallet address format - more flexible validation
      if (!walletAddress) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Wallet address is required' }
        ], 'Wallet address required');
      }

      // Normalize wallet address to lowercase for consistent processing
      try {
        walletAddress = sanitizeWalletAddress(walletAddress);
      } catch (error) {
        // If sanitization fails, just log a warning and try to process it
        // This maintains backward compatibility with lenient validation
        console.warn('Wallet address sanitization failed:', walletAddress);
        walletAddress = walletAddress.toLowerCase();
      }

      const profile = await sellerProfileService.getProfile(walletAddress);

      // Return null data instead of 404 error for missing profiles
      if (!profile) {
        return notFoundResponse<SellerProfile>(res, 'Seller profile not found');
      }

      return successResponse(res, profile, 200);
    } catch (error) {
      safeLogger.error('Error fetching seller profile:', error);

      // Handle database connection errors specifically
      if (error && typeof error === 'object' && ('code' in error)) {
        const errorCode = (error as any).code;
        // If it's a database connection error, return 404 instead of 500
        // This prevents the service worker from aggressively backing off
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
          safeLogger.warn('Database connection error, returning 404 for seller profile:', errorCode);
          return res.status(404).json({
            success: false,
            error: 'Seller profile not found',
            message: 'Unable to connect to database. Profile may not exist or try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          });
        }
      }

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
 * PUT /api/marketplace/seller/{walletAddress}
 * Update existing seller profile
 * 
 * NOTE: This is the primary endpoint for seller profile updates
 * and should not be duplicated in other route files to avoid conflicts
 */
router.put('/seller/:walletAddress', csrfProtection,
  rateLimitWithCache(req => `seller_profile_update:${req.ip}`, 10, 60), // 10 updates per minute
  cachingMiddleware.invalidate('sellerProfile'),
  async (req: Request, res: Response) => {
    try {
      let { walletAddress } = req.params;
      const updates: UpdateSellerProfileRequest = req.body;

      // Normalize wallet address to lowercase for consistent processing
      try {
        walletAddress = sanitizeWalletAddress(walletAddress);
      } catch (error) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ], 'Invalid wallet address');
      }

      // Validate ENS handle if provided
      if (updates.ensHandle && !/^[a-zA-Z0-9-]+\.eth$/.test(updates.ensHandle)) {
        return validationErrorResponse(res, [
          { field: 'ensHandle', message: 'Invalid ENS handle format' }
        ]);
      }

      const profile = await sellerProfileService.updateProfile(walletAddress, updates);
      return successResponse(res, profile, 200);
    } catch (error) {
      safeLogger.error('Error updating seller profile:', error);

      // Handle database connection errors specifically
      if (error && typeof error === 'object' && ('code' in error)) {
        const errorCode = (error as any).code;
        // If it's a database connection error, return 404 instead of 500
        // This prevents the service worker from aggressively backing off
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
          safeLogger.warn('Database connection error, returning 404 for seller profile update:', errorCode);
          return res.status(404).json({
            success: false,
            error: 'Seller profile not found',
            message: 'Unable to connect to database. Profile may not exist or try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          });
        }
      }

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return notFoundResponse<SellerProfile>(res, 'Seller profile not found');
        }

        if (error.message.includes('Invalid wallet address') || error.message.includes('Invalid ENS handle')) {
          return validationErrorResponse(res, [
            { field: 'validation', message: error.message }
          ]);
        }
      }

      return errorResponse(
        res,
        'PROFILE_UPDATE_ERROR',
        'Failed to update seller profile',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * POST /api/marketplace/seller/profile
 * Create or update seller profile
 */
router.post('/seller/profile', csrfProtection,
  rateLimitWithCache(req => `seller_profile_update:${req.ip}`, 10, 60), // 10 updates per minute
  cachingMiddleware.invalidate('sellerProfile'),
  async (req: Request, res: Response) => {
    try {
      const profileData: CreateSellerProfileRequest = req.body;

      // Validate required fields
      if (!profileData.walletAddress) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Wallet address is required' }
        ]);
      }

      // Normalize wallet address to lowercase for consistent processing
      let normalizedAddress: string;
      try {
        normalizedAddress = sanitizeWalletAddress(profileData.walletAddress);
      } catch (error) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ]);
      }

      // Update profileData with normalized address
      profileData.walletAddress = normalizedAddress;

      // Validate ENS handle if provided
      if (profileData.ensHandle && !/^[a-zA-Z0-9-]+\.eth$/.test(profileData.ensHandle)) {
        return validationErrorResponse(res, [
          { field: 'ensHandle', message: 'Invalid ENS handle format' }
        ]);
      }

      // Check if profile already exists
      const existingProfile = await sellerProfileService.getProfile(normalizedAddress);

      let profile: SellerProfile;

      if (existingProfile) {
        // Update existing profile
        const updateData: UpdateSellerProfileRequest = {
          displayName: profileData.displayName,
          storeName: profileData.storeName,
          bio: profileData.bio,
          description: profileData.description,
          sellerStory: profileData.sellerStory,
          location: profileData.location,
          ensHandle: profileData.ensHandle,
          websiteUrl: profileData.websiteUrl,
          socialLinks: profileData.socialLinks,
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
      safeLogger.error('Error creating/updating seller profile:', error);

      // Handle database connection errors specifically
      if (error && typeof error === 'object' && ('code' in error)) {
        const errorCode = (error as any).code;
        // If it's a database connection error, return 404 instead of 500
        // This prevents the service worker from aggressively backing off
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
          safeLogger.warn('Database connection error, returning 404 for seller profile create/update:', errorCode);
          return res.status(404).json({
            success: false,
            error: 'Seller profile not found',
            message: 'Unable to connect to database. Profile may not exist or try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          });
        }
      }

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
router.get('/seller/onboarding/:walletAddress',
  rateLimitWithCache(req => `onboarding:${req.ip}`, 30, 60), // 30 requests per minute
  cachingMiddleware.cache('sellerProfile', { ttl: 180 }), // Cache for 3 minutes
  async (req: Request, res: Response) => {
    try {
      let { walletAddress } = req.params;

      // Validate wallet address format (0x + 40 hex characters = 42 total)
      if (!walletAddress) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Wallet address is required' }
        ]);
      }

      // Normalize wallet address to lowercase for consistent processing
      try {
        walletAddress = sanitizeWalletAddress(walletAddress);
      } catch (error) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ]);
      }

      const onboardingStatus = await sellerProfileService.getOnboardingStatus(walletAddress);

      return successResponse(res, onboardingStatus, 200);
    } catch (error) {
      safeLogger.error('Error fetching onboarding status:', error);

      // Handle database connection errors specifically
      if (error && typeof error === 'object' && ('code' in error)) {
        const errorCode = (error as any).code;
        // If it's a database connection error, return 404 instead of 500
        // This prevents the service worker from aggressively backing off
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
          safeLogger.warn('Database connection error, returning 404 for onboarding status:', errorCode);
          return res.status(404).json({
            success: false,
            error: 'Seller profile not found',
            message: 'Unable to connect to database. Profile may not exist or try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          });
        }
      }

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
router.put('/seller/onboarding/:walletAddress/:step', csrfProtection, async (req: Request, res: Response) => {
  try {
    let { walletAddress, step } = req.params;

    // Handle different request body formats
    let completed: boolean;
    if (typeof req.body.completed === 'boolean') {
      completed = req.body.completed;
    } else if (req.body.data && typeof req.body.data.completed === 'boolean') {
      completed = req.body.data.completed;
    } else {
      return validationErrorResponse(res, [
        { field: 'completed', message: 'Completed field is required and must be a boolean' }
      ]);
    }

    // Normalize wallet address to lowercase for consistent processing
    try {
      walletAddress = sanitizeWalletAddress(walletAddress);
    } catch (error) {
      return validationErrorResponse(res, [
        { field: 'walletAddress', message: 'Invalid wallet address format' }
      ]);
    }

    // Normalize step ID: convert hyphens to underscores for backend compatibility
    // Frontend uses: 'profile-setup', Backend uses: 'profile_setup'
    const normalizedStep = step.replace(/-/g, '_');

    // Validate step parameter (accept both formats)
    const validSteps = ['profile_setup', 'business_info', 'verification', 'payout_setup', 'first_listing'];
    if (!validSteps.includes(normalizedStep)) {
      return validationErrorResponse(res, [
        { field: 'step', message: 'Invalid onboarding step. Valid steps: profile-setup, business-info, verification, payout-setup, first-listing' }
      ]);
    }

    // Extract data from request body if available
    const stepData = req.body.data || req.body;

    const onboardingStatus = await sellerProfileService.updateOnboardingStep(
      walletAddress,
      normalizedStep as keyof import('../types/sellerProfile').OnboardingSteps,
      completed,
      stepData
    );

    return successResponse(res, onboardingStatus, 200);
  } catch (error) {
    safeLogger.error('Error updating onboarding step:', error);

    // Handle database connection errors specifically
    if (error && typeof error === 'object' && ('code' in error)) {
      const errorCode = (error as any).code;
      // If it's a database connection error, return 404 instead of 500
      // This prevents the service worker from aggressively backing off
      if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
        safeLogger.warn('Database connection error, returning 404 for onboarding step update:', errorCode);
        return res.status(404).json({
          success: false,
          error: 'Seller profile not found',
          message: 'Unable to connect to database. Profile may not exist or try again later.',
          code: 'DATABASE_CONNECTION_ERROR'
        });
      }
    }

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
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'Error',
        walletAddress: req.params.walletAddress,
        step: req.params.step
      }
    );
  }
});

/**
 * GET /api/marketplace/seller/{walletAddress}/tier
 * Get seller's current tier
 */
router.get('/seller/:walletAddress/tier',
  rateLimitWithCache(req => `seller_tier:${req.ip}`, 30, 60), // 30 requests per minute
  cachingMiddleware.cache('sellerProfile', { ttl: 300 }), // Cache for 5 minutes
  async (req: Request, res: Response) => {
    try {
      let { walletAddress } = req.params;

      // Normalize wallet address to lowercase for consistent processing
      try {
        walletAddress = sanitizeWalletAddress(walletAddress);
      } catch (error) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ]);
      }

      const profile = await sellerProfileService.getProfile(walletAddress);

      if (!profile) {
        return notFoundResponse<any>(res, 'Seller profile not found');
      }

      // Return just the tier information
      return successResponse(res, {
        walletAddress: profile.walletAddress,
        tier: profile.tier,
        tierDisplayName: profile.tier ? profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1) : 'Basic',
        isVerified: profile.isVerified,
        onboardingCompleted: profile.onboardingCompleted
      }, 200);
    } catch (error) {
      safeLogger.error('Error fetching seller tier:', error);

      // Handle database connection errors specifically
      if (error && typeof error === 'object' && ('code' in error)) {
        const errorCode = (error as any).code;
        // If it's a database connection error, return 404 instead of 500
        // This prevents the service worker from aggressively backing off
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
          safeLogger.warn('Database connection error, returning 404 for seller tier:', errorCode);
          return res.status(404).json({
            success: false,
            error: 'Seller profile not found',
            message: 'Unable to connect to database. Profile may not exist or try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          });
        }
      }

      if (error instanceof Error) {
        if (error.message.includes('Invalid wallet address')) {
          return validationErrorResponse(res, [
            { field: 'walletAddress', message: error.message }
          ]);
        }
      }

      return errorResponse(
        res,
        'TIER_FETCH_ERROR',
        'Failed to fetch seller tier',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * GET /api/marketplace/seller/{walletAddress}/tier/progress
 * Get seller's tier progression and next tier requirements
 */
router.get('/seller/:walletAddress/tier/progress',
  rateLimitWithCache(req => `seller_tier_progress:${req.ip}`, 30, 60), // 30 requests per minute
  cachingMiddleware.cache('sellerProfile', { ttl: 300 }), // Cache for 5 minutes
  async (req: Request, res: Response) => {
    try {
      let { walletAddress } = req.params;

      // Normalize wallet address to lowercase for consistent processing
      try {
        walletAddress = sanitizeWalletAddress(walletAddress);
      } catch (error) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ]);
      }

      const profile = await sellerProfileService.getProfile(walletAddress);

      if (!profile) {
        return notFoundResponse<any>(res, 'Seller profile not found');
      }

      // For now, return basic progression information
      // In a full implementation, this would connect to the tier upgrade service
      const tierProgress = {
        walletAddress: profile.walletAddress,
        currentTier: profile.tier,
        isVerified: profile.isVerified,
        onboardingCompleted: profile.onboardingCompleted,
        progressPercentage: profile.onboardingCompleted ? 100 : profile.profileCompleteness?.score || 0,
        nextTier: profile.tier === 'basic' ? 'bronze' : profile.tier === 'bronze' ? 'silver' : 'gold',
        requirements: {
          completed: profile.onboardingCompleted ? 4 : Math.min(4, Math.floor((profile.profileCompleteness?.score || 0) / 25)),
          total: 4
        }
      };

      return successResponse(res, tierProgress, 200);
    } catch (error) {
      safeLogger.error('Error fetching seller tier progress:', error);

      // Handle database connection errors specifically
      if (error && typeof error === 'object' && ('code' in error)) {
        const errorCode = (error as any).code;
        // If it's a database connection error, return 404 instead of 500
        // This prevents the service worker from aggressively backing off
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
          safeLogger.warn('Database connection error, returning 404 for seller tier progress:', errorCode);
          return res.status(404).json({
            success: false,
            error: 'Seller profile not found',
            message: 'Unable to connect to database. Profile may not exist or try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          });
        }
      }

      if (error instanceof Error) {
        if (error.message.includes('Invalid wallet address')) {
          return validationErrorResponse(res, [
            { field: 'walletAddress', message: error.message }
          ]);
        }
      }

      return errorResponse(
        res,
        'TIER_PROGRESS_FETCH_ERROR',
        'Failed to fetch seller tier progress',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });
// Duplicate router declaration removed

/**
 * GET /api/marketplace/seller/{walletAddress}/messaging-analytics
 * Get messaging analytics for seller dashboard
 */
router.get('/seller/:walletAddress/messaging-analytics',
  rateLimitWithCache(req => `seller_msg_analytics:${req.ip}`, 30, 60),
  cachingMiddleware.cache('sellerMessagingAnalytics', { ttl: 300 }),
  async (req: Request, res: Response) => {
    try {
      let { walletAddress } = req.params;

      // Normalize wallet address to lowercase for consistent processing
      try {
        walletAddress = sanitizeWalletAddress(walletAddress);
      } catch (error) {
        return validationErrorResponse(res, [{ field: 'walletAddress', message: 'Invalid wallet address' }]);
      }

      // Mock response for now, to be connected to actual messaging service when available
      // This stops the 404 errors on the frontend
      const analytics = {
        totalConversations: 0,
        unreadMessages: 0,
        responseRate: 100,
        responseTime: 0,
        activeChats: 0
      };

      return successResponse(res, analytics, 200);
    } catch (error) {
      safeLogger.error('Error fetching messaging analytics:', error);
      return errorResponse(res, 'ANALYTICS_ERROR', 'Failed to fetch messaging analytics', 500);
    }
  });

export default router;
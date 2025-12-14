import { Router, Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { ensValidationService } from '../services/ensValidationService';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '../utils/apiResponse';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = Router();

/**
 * Rate limiters for ENS validation endpoints
 */
const ensValidationRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: 'Too many ENS validation requests, please try again later',
});

const ensVerificationRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute (stricter for verification)
  message: 'Too many ENS verification requests, please try again later',
});

/**
 * POST /api/marketplace/seller/ens/validate
 * Validate ENS name and return full details
 */
router.post(
  '/seller/ens/validate',
  ensValidationRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { ensName } = req.body;

      // Validate required fields
      if (!ensName) {
        return validationErrorResponse(res, [
          { field: 'ensName', message: 'ENS name is required' },
        ]);
      }

      // Validate ENS name format
      if (typeof ensName !== 'string' || !ensName.trim()) {
        return validationErrorResponse(res, [
          { field: 'ensName', message: 'ENS name must be a non-empty string' },
        ]);
      }

      // Perform validation
      const validationResult = await ensValidationService.validateENS(ensName.trim());

      if (!validationResult.isValid) {
        return successResponse(
          res,
          {
            valid: false,
            ensName: validationResult.ensName,
            error: validationResult.error,
          },
          200
        );
      }

      // Return full ENS details
      return successResponse(
        res,
        {
          valid: true,
          ensName: validationResult.ensName,
          address: validationResult.address,
          owner: validationResult.owner,
          resolver: validationResult.resolver,
          profile: {
            avatar: validationResult.avatar,
            twitter: validationResult.twitter,
            github: validationResult.github,
            email: validationResult.email,
            url: validationResult.url,
            description: validationResult.description,
          },
        },
        200
      );
    } catch (error) {
      safeLogger.error('Error in ENS validation endpoint:', error);

      return errorResponse(
        res,
        'ENS_VALIDATION_ERROR',
        'Failed to validate ENS name',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * POST /api/marketplace/seller/ens/verify-ownership
 * Verify that a wallet address owns an ENS name
 */
router.post(
  '/seller/ens/verify-ownership',
  ensVerificationRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { ensName, walletAddress, storeVerification = false } = req.body;

      // Validate required fields
      const errors = [];
      if (!ensName) {
        errors.push({ field: 'ensName', message: 'ENS name is required' });
      }
      if (!walletAddress) {
        errors.push({ field: 'walletAddress', message: 'Wallet address is required' });
      }

      if (errors.length > 0) {
        return validationErrorResponse(res, errors);
      }

      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' },
        ]);
      }

      // Perform ownership verification
      let verificationResult;
      if (storeVerification) {
        // Verify and store in database
        verificationResult = await ensValidationService.verifyAndStoreENSOwnership(
          ensName.trim(),
          walletAddress
        );
      } else {
        // Just verify without storing
        verificationResult = await ensValidationService.verifyENSOwnership(
          ensName.trim(),
          walletAddress
        );
      }

      return successResponse(
        res,
        {
          verified: verificationResult.isOwner,
          ensName: verificationResult.ensName,
          walletAddress: verificationResult.walletAddress,
          verificationMethod: verificationResult.verificationMethod,
          resolvedAddress: verificationResult.resolvedAddress,
          reverseResolvedName: verificationResult.reverseResolvedName,
          error: verificationResult.error,
          stored: storeVerification && verificationResult.isOwner,
        },
        200
      );
    } catch (error) {
      safeLogger.error('Error in ENS ownership verification endpoint:', error);

      return errorResponse(
        res,
        'ENS_VERIFICATION_ERROR',
        'Failed to verify ENS ownership',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * GET /api/marketplace/seller/ens/verifications/:walletAddress
 * Get all ENS verifications for a wallet address
 */
router.get(
  '/seller/ens/verifications/:walletAddress',
  ensValidationRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      // Validate wallet address
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' },
        ]);
      }

      // Fetch verifications
      const verifications = await ensValidationService.getWalletENSVerifications(
        walletAddress
      );

      return successResponse(
        res,
        {
          walletAddress,
          verifications,
        },
        200
      );
    } catch (error) {
      safeLogger.error('Error in ENS verifications fetch endpoint:', error);

      return errorResponse(
        res,
        'ENS_VERIFICATIONS_FETCH_ERROR',
        'Failed to fetch ENS verifications',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * DELETE /api/marketplace/seller/ens/verifications/:walletAddress/:ensName
 * Remove an ENS verification for a wallet address
 */
router.delete(
  '/seller/ens/verifications/:walletAddress/:ensName',
  ensVerificationRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { walletAddress, ensName } = req.params;

      // Validate parameters
      const errors = [];
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        errors.push({ field: 'walletAddress', message: 'Invalid wallet address format' });
      }
      if (!ensName) {
        errors.push({ field: 'ensName', message: 'ENS name is required' });
      }

      if (errors.length > 0) {
        return validationErrorResponse(res, errors);
      }

      // Remove verification
      const result = await ensValidationService.revokeENSVerification(
        walletAddress,
        ensName
      );

      return successResponse(
        res,
        {
          removed: result,
          walletAddress,
          ensName,
        },
        200
      );
    } catch (error) {
      safeLogger.error('Error in ENS verification removal endpoint:', error);

      return errorResponse(
        res,
        'ENS_VERIFICATION_REMOVAL_ERROR',
        'Failed to remove ENS verification',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * GET /api/marketplace/seller/ens/profile/:ensName
 * Get ENS profile information
 */
router.get(
  '/seller/ens/profile/:ensName',
  ensValidationRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { ensName } = req.params;

      // Validate ENS name
      if (!ensName) {
        return validationErrorResponse(res, [
          { field: 'ensName', message: 'ENS name is required' },
        ]);
      }

      // Fetch ENS profile by validating the ENS name and getting its text records
      const validationResult = await ensValidationService.validateENS(ensName);

      return successResponse(
        res,
        {
          ensName,
          profile: {
            avatar: validationResult.avatar,
            twitter: validationResult.twitter,
            github: validationResult.github,
            email: validationResult.email,
            url: validationResult.url,
            description: validationResult.description,
          },
        },
        200
      );
    } catch (error) {
      safeLogger.error('Error in ENS profile fetch endpoint:', error);

      return errorResponse(
        res,
        'ENS_PROFILE_FETCH_ERROR',
        'Failed to fetch ENS profile',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * POST /api/marketplace/seller/ens/bulk-validate
 * Bulk validate multiple ENS names
 */
router.post(
  '/seller/ens/bulk-validate',
  ensValidationRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { ensNames } = req.body;

      // Validate required fields
      if (!ensNames || !Array.isArray(ensNames) || ensNames.length === 0) {
        return validationErrorResponse(res, [
          { field: 'ensNames', message: 'ENS names array is required and cannot be empty' },
        ]);
      }

      // Limit batch size
      if (ensNames.length > 50) {
        return validationErrorResponse(res, [
          { field: 'ensNames', message: 'Maximum 50 ENS names per request' },
        ]);
      }

      // Validate each ENS name format
      const validationErrors = [];
      for (let i = 0; i < ensNames.length; i++) {
        const ensName = ensNames[i];
        if (typeof ensName !== 'string' || !ensName.trim()) {
          validationErrors.push({ 
            field: `ensNames[${i}]`, 
            message: `ENS name at index ${i} must be a non-empty string` 
          });
        }
      }

      if (validationErrors.length > 0) {
        return validationErrorResponse(res, validationErrors);
      }

      // Perform bulk validation by validating each ENS name individually
      const results = [];
      for (const ensName of ensNames.map(name => name.trim())) {
        const result = await ensValidationService.validateENS(ensName);
        results.push({
          ensName,
          isValid: result.isValid,
          address: result.address,
          error: result.error,
        });
      }

      return successResponse(
        res,
        {
          results,
        },
        200
      );
    } catch (error) {
      safeLogger.error('Error in ENS bulk validation endpoint:', error);

      return errorResponse(
        res,
        'ENS_BULK_VALIDATION_ERROR',
        'Failed to validate ENS names',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

export default router;
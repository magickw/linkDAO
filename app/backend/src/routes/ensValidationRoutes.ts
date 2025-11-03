import { Router, Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { ensValidationService } from '../services/ensValidationService';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '../utils/apiResponse';
import { createCustomRateLimit } from '../middleware/marketplaceSecurity';

const router = Router();

/**
 * Rate limiters for ENS validation endpoints
 */
const ensValidationRateLimit = createCustomRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many ENS validation requests, please try again later',
});

const ensVerificationRateLimit = createCustomRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute (stricter for verification)
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
          verifications: verifications.map((v) => ({
            id: v.id,
            ensHandle: v.ensHandle,
            verificationMethod: v.verificationMethod,
            verificationData: v.verificationData ? JSON.parse(v.verificationData) : null,
            verifiedAt: v.verifiedAt,
            expiresAt: v.expiresAt,
            isActive: v.isActive,
          })),
          count: verifications.length,
        },
        200
      );
    } catch (error) {
      safeLogger.error('Error fetching ENS verifications:', error);

      return errorResponse(
        res,
        'ENS_FETCH_ERROR',
        'Failed to fetch ENS verifications',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * DELETE /api/marketplace/seller/ens/verifications/:walletAddress/:ensName
 * Revoke an ENS verification
 */
router.delete(
  '/seller/ens/verifications/:walletAddress/:ensName',
  ensVerificationRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { walletAddress, ensName } = req.params;

      // Validate wallet address
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' },
        ]);
      }

      // Validate ENS name
      if (!ensName) {
        return validationErrorResponse(res, [
          { field: 'ensName', message: 'ENS name is required' },
        ]);
      }

      // Revoke verification
      const revoked = await ensValidationService.revokeENSVerification(
        walletAddress,
        ensName
      );

      if (!revoked) {
        return errorResponse(
          res,
          'ENS_REVOKE_ERROR',
          'Failed to revoke ENS verification',
          500
        );
      }

      return successResponse(
        res,
        {
          message: 'ENS verification revoked successfully',
          walletAddress,
          ensName,
        },
        200
      );
    } catch (error) {
      safeLogger.error('Error revoking ENS verification:', error);

      return errorResponse(
        res,
        'ENS_REVOKE_ERROR',
        'Failed to revoke ENS verification',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * GET /api/marketplace/seller/ens/resolve/:ensName
 * Quick endpoint to resolve ENS name to address
 */
router.get(
  '/seller/ens/resolve/:ensName',
  ensValidationRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { ensName } = req.params;

      if (!ensName) {
        return validationErrorResponse(res, [
          { field: 'ensName', message: 'ENS name is required' },
        ]);
      }

      const address = await ensValidationService.resolveENSToAddress(ensName);

      if (!address) {
        return successResponse(
          res,
          {
            resolved: false,
            ensName,
            error: 'ENS name does not resolve to an address',
          },
          200
        );
      }

      return successResponse(
        res,
        {
          resolved: true,
          ensName,
          address,
        },
        200
      );
    } catch (error) {
      safeLogger.error('Error resolving ENS name:', error);

      return errorResponse(
        res,
        'ENS_RESOLVE_ERROR',
        'Failed to resolve ENS name',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * GET /api/marketplace/seller/ens/reverse/:walletAddress
 * Quick endpoint to reverse resolve address to ENS name
 */
router.get(
  '/seller/ens/reverse/:walletAddress',
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

      const ensName = await ensValidationService.resolveAddressToENS(walletAddress);

      if (!ensName) {
        return successResponse(
          res,
          {
            resolved: false,
            walletAddress,
            error: 'Address does not have a reverse ENS record',
          },
          200
        );
      }

      return successResponse(
        res,
        {
          resolved: true,
          walletAddress,
          ensName,
        },
        200
      );
    } catch (error) {
      safeLogger.error('Error reverse resolving address:', error);

      return errorResponse(
        res,
        'ENS_REVERSE_RESOLVE_ERROR',
        'Failed to reverse resolve address',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

export default router;

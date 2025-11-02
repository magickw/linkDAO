import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { secureSellerVerificationService } from '../services/secureSellerVerificationService';
import { successResponse, errorResponse, validationErrorResponse } from '../utils/apiResponse';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * Validation rules for seller verification
 */
const verificationValidation = [
  body('businessName')
    .isString()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Business name must be between 2 and 255 characters'),

  body('businessType')
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business type must be between 2 and 100 characters'),

  body('ein')
    .optional()
    .isString()
    .matches(/^\d{2}-\d{7}$/)
    .withMessage('EIN must be in format XX-XXXXXXX'),

  body('country')
    .isString()
    .isLength({ min: 2, max: 3 })
    .isISO31661Alpha2()
    .withMessage('Country must be a valid ISO 3166-1 alpha-2 code'),

  body('state')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must be less than 100 characters'),

  body('city')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),

  body('verificationType')
    .isString()
    .isIn(['basic', 'business', 'enterprise'])
    .withMessage('Verification type must be basic, business, or enterprise')
];

/**
 * @route POST /api/seller/verification/submit
 * @desc Submit seller verification request
 * @access Private (Authenticated sellers only)
 */
router.post(
  '/submit',
  authMiddleware,
  csrfProtection,
  verificationValidation,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return validationErrorResponse(res, errors.array());
      }

      if (!req.user) {
        return errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      const {
        businessName,
        businessType,
        ein,
        country,
        state,
        city,
        verificationType
      } = req.body;

      // Call verification service
      const result = await secureSellerVerificationService.submitVerification({
        sellerWalletAddress: req.user.walletAddress,
        businessName,
        businessType,
        ein,
        country,
        state,
        city,
        verificationType
      });

      if (!result.success) {
        return errorResponse(
          res,
          'VERIFICATION_FAILED',
          result.message,
          400,
          result.errors
        );
      }

      // Log successful verification submission
      safeLogger.info('Seller verification submitted', {
        walletAddress: req.user.walletAddress,
        provider: result.provider,
        status: result.status
      });

      return successResponse(res, {
        verificationId: result.verificationId,
        status: result.status,
        trustScore: result.trustScore,
        provider: result.provider,
        message: result.message
      }, 201);

    } catch (error) {
      safeLogger.error('Seller verification submission error:', error);
      return errorResponse(
        res,
        'VERIFICATION_ERROR',
        'Failed to process verification request',
        500
      );
    }
  }
);

/**
 * @route GET /api/seller/verification/status
 * @desc Get verification status for authenticated seller
 * @access Private (Authenticated sellers only)
 */
router.get(
  '/status',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      const result = await secureSellerVerificationService.getVerificationStatus(
        req.user.walletAddress
      );

      if (!result.success) {
        return errorResponse(
          res,
          'STATUS_FETCH_ERROR',
          result.message || 'Failed to fetch verification status',
          500
        );
      }

      return successResponse(res, {
        verified: result.verified,
        details: result.data || null
      });

    } catch (error) {
      safeLogger.error('Get verification status error:', error);
      return errorResponse(
        res,
        'STATUS_ERROR',
        'Failed to retrieve verification status',
        500
      );
    }
  }
);

/**
 * @route GET /api/seller/verification/status/:walletAddress
 * @desc Get public verification status for any seller
 * @access Public
 */
router.get(
  '/status/:walletAddress',
  async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return errorResponse(
          res,
          'INVALID_ADDRESS',
          'Invalid wallet address format',
          400
        );
      }

      const result = await secureSellerVerificationService.getVerificationStatus(
        walletAddress
      );

      if (!result.success) {
        return errorResponse(
          res,
          'STATUS_FETCH_ERROR',
          result.message || 'Failed to fetch verification status',
          500
        );
      }

      return successResponse(res, {
        walletAddress,
        verified: result.verified,
        details: result.data || null
      });

    } catch (error) {
      safeLogger.error('Get public verification status error:', error);
      return errorResponse(
        res,
        'STATUS_ERROR',
        'Failed to retrieve verification status',
        500
      );
    }
  }
);

/**
 * @route GET /api/seller/verification/admin/:walletAddress
 * @desc Get full verification details (Admin only)
 * @access Private (Admin only)
 */
router.get(
  '/admin/:walletAddress',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      // Check if user is admin
      if (!req.user.isAdmin) {
        return errorResponse(
          res,
          'FORBIDDEN',
          'Admin access required',
          403
        );
      }

      const { walletAddress } = req.params;

      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return errorResponse(
          res,
          'INVALID_ADDRESS',
          'Invalid wallet address format',
          400
        );
      }

      const result = await secureSellerVerificationService.getVerificationDetailsAdmin(
        walletAddress,
        req.user.walletAddress
      );

      if (!result.success) {
        return errorResponse(
          res,
          'DETAILS_FETCH_ERROR',
          result.message || 'Failed to fetch verification details',
          404
        );
      }

      return successResponse(res, {
        verification: result.verification,
        attempts: result.attempts
      });

    } catch (error) {
      safeLogger.error('Get admin verification details error:', error);
      return errorResponse(
        res,
        'DETAILS_ERROR',
        'Failed to retrieve verification details',
        500
      );
    }
  }
);

export default router;

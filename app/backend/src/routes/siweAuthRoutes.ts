import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { csrfProtection } from '../middleware/csrfProtection';
import { siweService } from '../services/siweService';
import { authController } from '../controllers/authController';
import { walletAuthRateLimit } from '../middleware/walletRateLimiting';
import { successResponse, errorResponse, validationErrorResponse } from '../utils/apiResponse';
import jwt from 'jsonwebtoken';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

const router = Router();

// Allow missing JWT_SECRET in development mode
const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (nodeEnv === 'development') {
    console.warn('⚠️  Using default JWT secret in development mode');
  } else {
    throw new Error('JWT_SECRET environment variable is required');
  }
}

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { ssl: 'require' });
const db = drizzle(sql);

/**
 * @route GET /api/auth/siwe/nonce
 * @desc Generate SIWE nonce for authentication
 * @access Public
 */
router.get('/siwe/nonce', async (req: Request, res: Response) => {
  try {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      return errorResponse(res, 'INVALID_ADDRESS', 'Wallet address is required', 400);
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return errorResponse(res, 'INVALID_ADDRESS', 'Invalid Ethereum address format', 400);
    }

    const nonce = siweService.generateNonce(address);

    return successResponse(res, {
      nonce,
      expiresIn: 600 // 10 minutes
    });

  } catch (error) {
    return errorResponse(res, 'NONCE_GENERATION_ERROR', 'Failed to generate nonce', 500);
  }
});

/**
 * @route POST /api/auth/siwe/verify
 * @desc Verify SIWE signature and authenticate user
 * @access Public
 */
router.post(
  '/siwe/verify',
  csrfProtection,
  walletAuthRateLimit,
  [
    body('message')
      .isString()
      .notEmpty()
      .withMessage('SIWE message is required'),
    body('signature')
      .isString()
      .isLength({ min: 130, max: 132 })
      .withMessage('Valid signature is required')
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return validationErrorResponse(res, errors.array());
      }

      const { message, signature } = req.body;

      // Verify SIWE signature
      const verificationResult = await siweService.verifySignature(message, signature);

      if (!verificationResult.success) {
        return errorResponse(
          res,
          verificationResult.errorCode || 'VERIFICATION_FAILED',
          verificationResult.error || 'SIWE verification failed',
          401
        );
      }

      const walletAddress = verificationResult.address!.toLowerCase();

      // Find or create user
      let user = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);

      if (user.length === 0) {
        // Create new user
        const newUser = await db
          .insert(users)
          .values({
            walletAddress,
            createdAt: new Date()
          })
          .returning();

        user = newUser;
      }

      const userData = user[0];

      // Generate JWT token
      if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error('JWT_SECRET not configured properly');
      }

      const token = jwt.sign(
        {
          userId: userData.id,
          walletAddress: userData.walletAddress,
          authMethod: 'siwe',
          timestamp: Date.now()
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      return successResponse(res, {
        token,
        user: {
          id: userData.id,
          walletAddress: userData.walletAddress,
          handle: userData.handle,
          profileCid: userData.profileCid
        },
        expiresIn: '24h',
        authMethod: 'siwe'
      }, 200);

    } catch (error) {
      return errorResponse(res, 'AUTHENTICATION_ERROR', 'SIWE authentication failed', 500);
    }
  }
);

/**
 * @route POST /api/auth/siwe/message
 * @desc Generate complete SIWE message for user to sign
 * @access Public
 */
router.post(
  '/siwe/message',
  [
    body('address')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Valid Ethereum address is required'),
    body('chainId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Chain ID must be a positive integer'),
    body('statement')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Statement must be less than 500 characters')
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return validationErrorResponse(res, errors.array());
      }

      const { address, chainId, statement } = req.body;

      // Generate nonce
      const nonce = siweService.generateNonce(address);

      // Create SIWE message
      const message = siweService.createMessage({
        address,
        nonce,
        chainId: chainId || 1,
        statement: statement || 'Sign in to LinkDAO',
        expirationTime: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      return successResponse(res, {
        message,
        nonce,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });

    } catch (error) {
      return errorResponse(res, 'MESSAGE_GENERATION_ERROR', 'Failed to generate SIWE message', 500);
    }
  }
);

/**
 * @route GET /api/auth/siwe/stats
 * @desc Get SIWE nonce statistics (for monitoring)
 * @access Public
 */
router.get('/siwe/stats', (req: Request, res: Response) => {
  const stats = siweService.getNonceStats();

  return successResponse(res, {
    nonces: stats,
    timestamp: new Date().toISOString()
  });
});

// Also export existing auth routes for backward compatibility
router.post('/wallet-connect', authController.walletConnect);
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.post('/logout', authController.logout);

export default router;

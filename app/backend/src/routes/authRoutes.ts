import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { authController } from '../controllers/authController';
import { adminAuthController } from '../controllers/adminAuthController';
import { authMiddleware } from '../middleware/authMiddleware';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication requests, please try again later',
    }
  }
});

const router = Router();

// Validation rules
const walletConnectValidation = [
  body('walletAddress')
    .isString()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Valid Ethereum wallet address is required'),
  body('signature')
    .isString()
    .isLength({ min: 130, max: 132 })
    .withMessage('Valid signature is required'),
  body('message')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Message is required')
];

const profileUpdateValidation = [
  body('displayName')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('bio')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('profileImageUrl')
    .optional()
    .isURL()
    .withMessage('Profile image must be a valid URL'),
  body('ensName')
    .optional()
    .isString()
    .matches(/^[a-zA-Z0-9-]+\.eth$/)
    .withMessage('ENS name must be a valid .eth domain')
];

/**
 * @route GET /api/auth/nonce
 * @desc Generate nonce for wallet authentication
 * @access Public
 */
router.get('/nonce', authRateLimit, (req, res) => {
  // Generate a simple random nonce
  const crypto = require('crypto');
  const nonce = crypto.randomBytes(32).toString('hex');

  res.json({
    success: true,
    data: {
      nonce,
      expiresIn: 600 // 10 minutes
    }
  });
});

/**
 * @route POST /api/auth/wallet-connect
 * @desc Authenticate with wallet signature
 * @access Public
 */
router.post('/wallet-connect', authRateLimit, csrfProtection,  walletConnectValidation, authController.walletConnect);

/**
 * @route GET /api/auth/profile
 * @desc Get authenticated user profile
 * @access Private
 */
router.get('/profile', authMiddleware, authController.getProfile);

/**
 * @route PUT /api/auth/profile
 * @desc Update authenticated user profile
 * @access Private
 */
router.put('/profile', csrfProtection,  authMiddleware, profileUpdateValidation, authController.updateProfile);

/**
 * @route POST /api/auth/logout
 * @desc Logout user and invalidate session
 * @access Private
 */
router.post('/logout', csrfProtection,  authMiddleware, authController.logout);

// Admin credentials login validation
const adminLoginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

/**
 * @route POST /api/auth/admin/login
 * @desc Admin login with email and password
 * @access Public
 */
router.post('/admin/login', csrfProtection,  adminLoginValidation, adminAuthController.adminLogin);

/**
 * @route POST /api/auth/admin/logout
 * @desc Admin logout and revoke session
 * @access Private (Admin)
 */
router.post('/admin/logout', csrfProtection,  authMiddleware, adminAuthController.adminLogout);

/**
 * @route GET /api/auth/admin/session
 * @desc Get admin session info
 * @access Private (Admin)
 */
router.get('/admin/session', authMiddleware, adminAuthController.getSessionInfo);

export default router;

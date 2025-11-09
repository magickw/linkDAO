import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { authController } from '../controllers/authController';
import { adminAuthController } from '../controllers/adminAuthController';
import { authMiddleware } from '../middleware/authMiddleware';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';

// Rate limiting for auth endpoints - increased from 20 to 60 requests per minute
// to accommodate multiple auth attempts and service worker retries
const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Increased from 20 to 60 requests per minute
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication requests, please try again later',
    }
  },
  // Skip validation for X-Forwarded-For header since we've configured trust proxy
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false
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
    .withMessage('Message is required'),
  body('referralCode')
    .optional()
    .isString()
    .isLength({ min: 6, max: 12 })
    .withMessage('Referral code must be 6-12 characters if provided')
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
  const message = `Sign this message to authenticate with LinkDAO.\n\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;

  res.json({
    success: true,
    data: {
      nonce,
      message,
      expiresIn: 600 // 10 minutes
    }
  });
});

/**
 * @route POST /api/auth/wallet
 * @desc Simple wallet authentication (development-friendly)
 * @access Public
 */
router.post('/wallet', authRateLimit, (req, res) => {
  const { walletAddress, signature, nonce } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      error: 'Wallet address is required'
    });
  }

  // In development, create a simple session token
  if (process.env.NODE_ENV === 'development') {
    const sessionToken = `dev_session_${walletAddress}_${Date.now()}`;
    
    return res.json({
      success: true,
      sessionToken,
      user: {
        id: `user_${walletAddress}`,
        address: walletAddress,
        handle: `user_${walletAddress.slice(0, 6)}`,
      }
    });
  }

  // In production, use proper signature verification
  // (This would call the full wallet-connect logic)
  return authController.walletConnect(req, res);
});

/**
 * @route POST /api/auth/wallet-connect
 * @desc Authenticate with wallet signature
 * @access Public
 */
const isDevelopment = process.env.NODE_ENV === 'development';
const authCsrfMiddleware = isDevelopment ? 
  (req: any, res: any, next: any) => next() : // Skip CSRF in development
  csrfProtection;

router.post('/wallet-connect', authRateLimit, authCsrfMiddleware, walletConnectValidation, authController.walletConnect);

/**
 * @route GET /api/auth/profile
 * @desc Get authenticated user profile
 * @access Private
 */
router.get('/profile', authMiddleware, authController.getProfile);

/**
 * @route GET /api/auth/status
 * @desc Check authentication status
 * @access Public
 */
router.get('/status', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.json({
      success: true,
      data: {
        authenticated: false,
        message: 'No token provided'
      }
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    return res.json({
      success: true,
      data: {
        authenticated: true,
        walletAddress: decoded.walletAddress || decoded.address,
        sessionId: decoded.userId || decoded.id,
        expiresAt: new Date(decoded.exp * 1000)
      }
    });
  } catch (error) {
    return res.json({
      success: true,
      data: {
        authenticated: false,
        message: 'Invalid token'
      }
    });
  }
});

/**
 * @route GET /api/auth/kyc/status
 * @desc Get KYC status for authenticated user
 * @access Private
 */
router.get('/kyc/status', authMiddleware, authController.getKYCStatus);

/**
 * @route GET /api/csrf-token
 * @desc Get CSRF token for secure requests
 * @access Public
 */
router.get('/csrf-token', (req, res) => {
  // Generate a simple CSRF token
  const crypto = require('crypto');
  const csrfToken = crypto.randomBytes(32).toString('hex');
  
  res.json({
    success: true,
    data: {
      csrfToken,
      expiresIn: 3600 // 1 hour
    }
  });
});

/**
 * @route GET /api/auth/csrf-token
 * @desc Get CSRF token for secure requests (alternative path)
 * @access Public
 */
router.get('/csrf-token', (req, res) => {
  // Generate a simple CSRF token
  const crypto = require('crypto');
  const csrfToken = crypto.randomBytes(32).toString('hex');
  
  res.json({
    success: true,
    data: {
      csrfToken,
      expiresIn: 3600 // 1 hour
    }
  });
});

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

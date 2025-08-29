import express from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken, requireKYC, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();
const authController = new AuthController();

/**
 * GET /api/auth/nonce/:address
 * Get authentication nonce for wallet signature
 * @param {address} string - Wallet address
 */
router.get('/nonce/:address', authController.getNonce);

/**
 * POST /api/auth/wallet
 * Web3 wallet authentication with signature verification
 * @body {address} string - Wallet address
 * @body {signature} string - Signed message
 * @body {message} string - Original message
 * @body {nonce} string - Authentication nonce
 */
router.post('/wallet', authController.authenticateWallet);

/**
 * POST /api/auth/login
 * Legacy login endpoint - generates a JWT token for the user
 * @body {address} string - Wallet address
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/register
 * Enhanced user registration with profile setup
 * @body {address} string - Wallet address
 * @body {handle} string - User handle
 * @body {ens} string - ENS name (optional)
 * @body {email} string - Email address (optional)
 * @body {preferences} object - User preferences (optional)
 * @body {privacySettings} object - Privacy settings (optional)
 */
router.post('/register', authController.register);

/**
 * GET /api/auth/me
 * Get current user profile with enhanced data
 * @header {Authorization} string - Bearer token
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

/**
 * PUT /api/auth/preferences
 * Update user preferences
 * @header {Authorization} string - Bearer token
 * @body {preferences} object - Updated preferences
 */
router.put('/preferences', authenticateToken, authController.updatePreferences);

/**
 * PUT /api/auth/privacy
 * Update privacy settings
 * @header {Authorization} string - Bearer token
 * @body {privacySettings} object - Updated privacy settings
 */
router.put('/privacy', authenticateToken, authController.updatePrivacySettings);

/**
 * POST /api/auth/kyc/initiate
 * Initiate KYC verification process
 * @header {Authorization} string - Bearer token
 * @body {tier} string - KYC tier (basic, intermediate, advanced)
 * @body {documents} array - Initial documents (optional)
 */
router.post('/kyc/initiate', authenticateToken, authController.initiateKYC);

/**
 * GET /api/auth/kyc/status
 * Get KYC verification status
 * @header {Authorization} string - Bearer token
 */
router.get('/kyc/status', authenticateToken, authController.getKYCStatus);

/**
 * POST /api/auth/logout
 * Logout and invalidate session
 * @header {Authorization} string - Bearer token
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 * @header {Authorization} string - Bearer token
 */
router.post('/refresh', authenticateToken, authController.refreshToken);

export default router;
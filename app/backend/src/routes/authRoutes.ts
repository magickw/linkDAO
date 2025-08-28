import express from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();
const authController = new AuthController();

/**
 * POST /api/auth/login
 * Login endpoint - generates a JWT token for the user
 * @body {address} string - Wallet address
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/register
 * Register endpoint - creates a user profile and generates a JWT token
 * @body {address} string - Wallet address
 * @body {handle} string - User handle
 * @body {ens} string - ENS name (optional)
 */
router.post('/register', authController.register);

/**
 * GET /api/auth/me
 * Get current user profile
 * @header {Authorization} string - Bearer token
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

export default router;
import { Router } from 'express';
import { AuthenticationController, authValidationRules } from '../controllers/authenticationController';
import { AuthenticationMiddleware } from '../middleware/authenticationMiddleware';
import { AuthenticationService } from '../services/authenticationService';

export function createAuthenticationRoutes(
  authService: AuthenticationService,
  authMiddleware: AuthenticationMiddleware
): Router {
  const router = Router();
  const controller = new AuthenticationController(authService);

  // Rate limiting for auth endpoints
  const authRateLimit = authMiddleware.authRateLimit(5, 15); // 5 attempts per 15 minutes

  /**
   * @route POST /api/auth/nonce
   * @desc Generate nonce for wallet authentication
   * @access Public
   */
  router.post(
    '/nonce',
    authRateLimit,
    authValidationRules.generateNonce,
    controller.generateNonce
  );

  /**
   * @route POST /api/auth/wallet
   * @desc Authenticate wallet with signature
   * @access Public
   */
  router.post(
    '/wallet',
    authRateLimit,
    authValidationRules.authenticateWallet,
    controller.authenticateWallet
  );

  /**
   * @route POST /api/auth/refresh
   * @desc Refresh authentication session
   * @access Public
   */
  router.post(
    '/refresh',
    authRateLimit,
    authValidationRules.refreshSession,
    controller.refreshSession
  );

  /**
   * @route GET /api/auth/status
   * @desc Check authentication status
   * @access Public (but returns different data based on auth)
   */
  router.get(
    '/status',
    authMiddleware.optionalAuth,
    controller.getAuthStatus
  );

  /**
   * @route POST /api/auth/logout
   * @desc Logout and invalidate session
   * @access Private
   */
  router.post(
    '/logout',
    authMiddleware.optionalAuth, // Optional because we want to handle logout even with invalid tokens
    controller.logout
  );

  /**
   * @route GET /api/auth/stats
   * @desc Get authentication statistics
   * @access Private (Admin only - would need additional middleware for admin check)
   */
  router.get(
    '/stats',
    authMiddleware.requireAuth,
    controller.getAuthStats
  );

  /**
   * @route GET /api/auth/health
   * @desc Health check for authentication service
   * @access Public
   */
  router.get('/health', controller.healthCheck);

  return router;
}

/**
 * Create authentication routes with default configuration
 */
export function createDefaultAuthRoutes(): Router {
  const connectionString = process.env.DATABASE_URL!;
  const jwtSecret = process.env.JWT_SECRET!;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  const authService = new AuthenticationService(connectionString, jwtSecret);
  const authMiddleware = new AuthenticationMiddleware(authService);

  return createAuthenticationRoutes(authService, authMiddleware);
}

export { AuthenticationService, AuthenticationMiddleware };
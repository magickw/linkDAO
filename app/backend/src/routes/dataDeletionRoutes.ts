/**
 * Data Deletion Routes
 * API endpoints for user data deletion (GDPR/Platform compliance)
 * Required by Facebook and LinkedIn for OAuth apps
 */

import { Router } from 'express';
import { dataDeletionController } from '../controllers/dataDeletionController';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = Router();

// Rate limiting for deletion endpoints (stricter limits due to destructive nature)
const deletionRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 deletion requests per hour
  message: 'Too many deletion requests. Please try again later.'
});

// Rate limiting for general endpoints
const generalRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
  message: 'Too many requests. Please try again later.'
});

/**
 * @route GET /api/data-deletion/policy
 * @desc Get data deletion policy information
 * @access Public
 */
router.get('/policy', dataDeletionController.getDataDeletionPolicy);

/**
 * @route GET /api/data-deletion/status/:confirmationCode
 * @desc Get deletion status by confirmation code
 * @access Public (anyone can check status with confirmation code)
 */
router.get('/status/:confirmationCode', dataDeletionController.getDeletionStatus);

/**
 * @route POST /api/data-deletion/facebook/callback
 * @desc Handle Facebook data deletion callback
 * @access Public (called by Facebook)
 * Facebook sends a signed_request parameter when user removes the app
 */
router.post('/facebook/callback', dataDeletionController.handleFacebookDeletionCallback);

/**
 * @route POST /api/data-deletion/linkedin/callback
 * @desc Handle LinkedIn data deletion callback
 * @access Public (called by LinkedIn)
 * LinkedIn sends a webhook when user revokes access
 */
router.post('/linkedin/callback', dataDeletionController.handleLinkedInDeletionCallback);

// Apply authentication for user-initiated routes
router.use(authMiddleware);

/**
 * @route GET /api/data-deletion/summary
 * @desc Get summary of user's stored data
 * @access Private (authenticated users)
 */
router.get('/summary', generalRateLimit, dataDeletionController.getUserDataSummary);

/**
 * @route POST /api/data-deletion/delete
 * @desc Delete specific categories of user data
 * @access Private (authenticated users)
 * @body { categories: { profile?, posts?, comments?, messages?, socialConnections?, follows?, bookmarks?, notifications?, preferences? } }
 */
router.post(
  '/delete',
  csrfProtection,
  deletionRateLimit,
  dataDeletionController.deleteUserData
);

/**
 * @route POST /api/data-deletion/delete-all
 * @desc Delete all user data
 * @access Private (authenticated users)
 * @body { confirmDelete: "DELETE_ALL_MY_DATA" }
 */
router.post(
  '/delete-all',
  csrfProtection,
  deletionRateLimit,
  dataDeletionController.deleteAllUserData
);

export default router;

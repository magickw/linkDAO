/**
 * Social Media OAuth Routes
 * Routes for OAuth flow and connection management
 */

import express from 'express';
import { socialMediaOAuthController } from '../controllers/socialMediaOAuthController';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = express.Router();

// Apply rate limiting to OAuth endpoints
const oauthRateLimiter = rateLimitingMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 30, // 30 requests per 15 minutes
  message: 'Too many OAuth requests, please try again later',
});

// Initiate OAuth flow
// POST /api/social-media/connect/:platform
router.post(
  '/connect/:platform',
  authMiddleware,
  csrfProtection,
  oauthRateLimiter,
  (req, res) => socialMediaOAuthController.initiateOAuth(req, res)
);

// OAuth callback (no auth required - state parameter validates)
// GET /api/social-media/callback/:platform
router.get(
  '/callback/:platform',
  oauthRateLimiter,
  (req, res) => socialMediaOAuthController.handleCallback(req, res)
);

// Get all connections
// GET /api/social-media/connections
router.get(
  '/connections',
  authMiddleware,
  (req, res) => socialMediaOAuthController.getConnections(req, res)
);

// Get specific connection
// GET /api/social-media/connections/:platform
router.get(
  '/connections/:platform',
  authMiddleware,
  (req, res) => socialMediaOAuthController.getConnection(req, res)
);

// Disconnect platform
// DELETE /api/social-media/connections/:platform
router.delete(
  '/connections/:platform',
  authMiddleware,
  csrfProtection,
  (req, res) => socialMediaOAuthController.disconnectPlatform(req, res)
);

// Refresh connection token
// POST /api/social-media/connections/:platform/refresh
router.post(
  '/connections/:platform/refresh',
  authMiddleware,
  csrfProtection,
  oauthRateLimiter,
  (req, res) => socialMediaOAuthController.refreshConnection(req, res)
);

export default router;

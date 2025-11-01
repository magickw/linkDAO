/**
 * View Tracking Routes
 *
 * Routes for tracking and retrieving post views
 */

import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { viewController } from '../controllers/viewController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Track a single post view (public - allows anonymous tracking)
router.post('/track', csrfProtection,  viewController.trackView.bind(viewController));

// Track multiple post views in batch (public)
router.post('/track-batch', csrfProtection,  viewController.trackBatchViews.bind(viewController));

// Get view count for a post (public)
router.get('/:postId/count', viewController.getViewCount.bind(viewController));

// Get detailed view analytics (public, but could be restricted)
router.get('/:postId/analytics', viewController.getViewAnalytics.bind(viewController));

export default router;

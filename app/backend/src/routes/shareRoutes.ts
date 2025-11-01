/**
 * Share Routes
 */

import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { shareController } from '../controllers/shareController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All share routes require authentication
router.use(authenticateToken);

// Track a share
router.post('/track', csrfProtection,  shareController.trackShare.bind(shareController));

// Get share count for a post
router.get('/:postId/count', shareController.getShareCount.bind(shareController));

// Get share breakdown
router.get('/:postId/breakdown', shareController.getShareBreakdown.bind(shareController));

// Get user's sharing history
router.get('/my-shares', shareController.getUserShares.bind(shareController));

export default router;

/**
 * Share Routes
 */

import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { shareController } from '../controllers/shareController';
import { authenticateToken } from '../middleware/auth';
import { postController } from '../controllers/postController';

const router = express.Router();

// Public route: Resolve share ID to either a post or status
// Uses postService which has internal fallback to check statuses
router.get('/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;

    const post = await postController.postService.getPostByShareId(shareId);
    if (post) {
      return res.json({
        success: true,
        data: {
          post: post
        }
      });
    }

    // Not found
    return res.status(404).json({
      success: false,
      error: 'Share not found'
    });
  } catch (error: any) {
    console.error('Error resolving share ID:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve share'
    });
  }
});

// All other share routes require authentication
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

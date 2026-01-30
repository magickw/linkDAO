/**
 * Share Routes
 */

import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { shareController } from '../controllers/shareController';
import { authenticateToken } from '../middleware/auth';
import { PostService } from '../services/postService';

const router = express.Router();

// Instantiate PostService to resolve shares
let postService: PostService;
try {
  postService = new PostService();
} catch (error) {
  console.error('Failed to initialize PostService in shareRoutes:', error);
}

// Public route: Resolve share ID to either a post or status
// Uses postService which has internal fallback to check statuses
router.get('/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    console.log(`[shareRoutes] Resolving share ID: ${shareId}`);

    if (!postService) {
      console.error('[shareRoutes] PostService not initialized');
      return res.status(500).json({
        success: false,
        error: 'Service unavailable'
      });
    }

    const post = await postService.getPostByShareId(shareId);
    console.log(`[shareRoutes] Post lookup result:`, post ? 'Found' : 'Not found');

    if (post) {
      return res.json({
        success: true,
        data: {
          post: post
        }
      });
    }

    // Not found
    console.log(`[shareRoutes] Share ID not found: ${shareId}`);
    return res.status(404).json({
      success: false,
      error: 'Share not found'
    });
  } catch (error: any) {
    console.error('[shareRoutes] Error resolving share ID:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve share'
    });
  }
});

// All other share routes require authentication
router.use(authenticateToken);

// Get user's sharing history (specific route before generic :postId pattern)
router.get('/my-shares', shareController.getUserShares.bind(shareController));

// Track a share
router.post('/track', csrfProtection, shareController.trackShare.bind(shareController));

// Get share count for a post
router.get('/:postId/count', shareController.getShareCount.bind(shareController));

// Get share breakdown
router.get('/:postId/breakdown', shareController.getShareBreakdown.bind(shareController));

export default router;

import { Router } from 'express';
import { postManagementService } from '../services/postManagementService';
import { authMiddleware } from '../middleware/authMiddleware';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * POST /api/posts/:id/pin
 * Pin a post to the top of the community feed
 * Requires authentication and admin/moderator role
 */
router.post('/:id/pin', authMiddleware, async (req, res) => {
    try {
        const { id: postId } = req.params;
        const { communityId } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        if (!communityId) {
            return res.status(400).json({
                success: false,
                message: 'Community ID is required',
            });
        }

        // TODO: Add admin/moderator permission check here
        // For now, allowing any authenticated user (will be restricted in production)

        const result = await postManagementService.pinPost({
            postId,
            userId,
            communityId,
        });

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        safeLogger.error('Error in pin post route:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

/**
 * DELETE /api/posts/:id/pin
 * Unpin a post
 * Requires authentication and admin/moderator role
 */
router.delete('/:id/pin', authMiddleware, async (req, res) => {
    try {
        const { id: postId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        // TODO: Add admin/moderator permission check here

        const result = await postManagementService.unpinPost(postId, userId);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        safeLogger.error('Error in unpin post route:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

/**
 * GET /api/communities/:id/pinned-posts
 * Get all pinned posts for a community
 */
router.get('/communities/:id/pinned-posts', async (req, res) => {
    try {
        const { id: communityId } = req.params;
        const { limit } = req.query;

        const pinnedPosts = await postManagementService.getPinnedPosts(
            communityId,
            limit ? String(limit) : '5'
        );

        return res.status(200).json({
            success: true,
            data: pinnedPosts,
        });
    } catch (error) {
        safeLogger.error('Error fetching pinned posts:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch pinned posts',
        });
    }
});

export default router;

import { Router, Request, Response } from 'express';
import { commentService } from '../services/commentService';
import { safeLogger } from '../utils/safeLogger';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

/**
 * POST /community-posts/:postId/comments
 * Create a new comment on a post
 */
router.post('/community-posts/:postId/comments', csrfProtection, authMiddleware, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    // Extract user address from authenticated request
    const userAddress = (req as any).user?.walletAddress;

    if (!userAddress) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    // For /community-posts/:postId/comments endpoint, always use the posts table
    const comment = await commentService.createComment({
      postId: postId,
      statusId: undefined,
      authorAddress: userAddress,
      content,
      // Explicitly set to undefined (not null) for top-level comments
      // This ensures the database stores NULL and isNull() queries work correctly
      parentCommentId: parentCommentId || undefined
    });

    return res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    safeLogger.error('Error creating comment:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create comment'
    });
  }
});

/**
 * GET /community-posts/:postId/comments
 * Get all comments for a post
 */
router.get('/community-posts/:postId/comments', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { sortBy = 'best', limit = '100' } = req.query;

    // For /community-posts/:postId/comments endpoint, always use the posts table
    const comments = await commentService.getCommentsByPost(
      postId,
      undefined,
      sortBy as 'best' | 'new' | 'top' | 'controversial',
      parseInt(limit as string)
    );

    return res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    safeLogger.error('Error fetching comments:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch comments'
    });
  }
});

/**
 * GET /comments/:commentId
 * Get a specific comment
 */
router.get('/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    const comment = await commentService.getCommentById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    return res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    safeLogger.error('Error fetching comment:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch comment'
    });
  }
});

/**
 * GET /comments/:commentId/replies
 * Get replies to a comment
 */
router.get('/comments/:commentId/replies', async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { limit = '50' } = req.query;

    const replies = await commentService.getCommentReplies(
      commentId,
      parseInt(limit as string)
    );

    return res.json({
      success: true,
      data: replies
    });
  } catch (error) {
    safeLogger.error('Error fetching comment replies:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch replies'
    });
  }
});

/**
 * PUT /comments/:commentId
 * Update a comment
 */
router.put('/comments/:commentId', csrfProtection, authMiddleware, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    // Extract user address from authenticated request
    const userAddress = (req as any).user?.walletAddress;

    if (!userAddress) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    const comment = await commentService.updateComment(
      commentId,
      userAddress,
      { content }
    );

    return res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    safeLogger.error('Error updating comment:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update comment'
    });
  }
});

/**
 * DELETE /comments/:commentId
 * Delete a comment
 */
router.delete('/comments/:commentId', csrfProtection, authMiddleware, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    // Extract user address from authenticated request
    const userAddress = (req as any).user?.walletAddress;

    if (!userAddress) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    await commentService.deleteComment(commentId, userAddress);

    return res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    safeLogger.error('Error deleting comment:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete comment'
    });
  }
});

/**
 * POST /comments/:commentId/vote
 * Vote on a comment
 */
router.post('/comments/:commentId/vote', csrfProtection, authMiddleware, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { voteType } = req.body;

    if (!voteType || !['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        error: 'Valid voteType (upvote/downvote) is required'
      });
    }

    const userId = (req as any).user?.id;
    const comment = await commentService.voteComment(commentId, voteType, userId);

    return res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    safeLogger.error('Error voting on comment:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to vote on comment'
    });
  }
});

export default router;
export { router as commentRoutes };

import { Router } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { db } from '../db';
import { posts, users, reactions } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

/**
 * Comment Voting Routes
 * Implements upvote/downvote functionality for comments
 */

// Vote on a comment (upvote/downvote)
router.post('/:communityId/comments/:commentId/vote', csrfProtection,  authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { voteType, amount = '1.0' } = req.body; // 'upvote' or 'downvote'
    const userAddress = req.user?.address;

    if (!userAddress) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vote type. Must be "upvote" or "downvote"'
      });
    }

    // Check if comment exists
    const comment = await db
      .select()
      .from(posts)
      .where(eq(posts.id, parseInt(commentId)))
      .limit(1);

    if (comment.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if user already voted
    const existingVote = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.postId, parseInt(commentId)),
          eq(reactions.userId, userAddress),
          eq(reactions.type, voteType)
        )
      )
      .limit(1);

    if (existingVote.length > 0) {
      // Remove vote (toggle off)
      await db
        .delete(reactions)
        .where(eq(reactions.id, existingVote[0].id));

      // Get updated vote counts
      const voteCounts = await getVoteCounts(parseInt(commentId));

      return res.json({
        success: true,
        message: 'Vote removed',
        data: {
          commentId,
          voteRemoved: true,
          ...voteCounts
        }
      });
    }

    // Remove opposite vote if exists
    const oppositeType = voteType === 'upvote' ? 'downvote' : 'upvote';
    await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.postId, parseInt(commentId)),
          eq(reactions.userId, userAddress),
          eq(reactions.type, oppositeType)
        )
      );

    // Add new vote
    await db.insert(reactions).values({
      postId: parseInt(commentId),
      userId: userAddress,
      type: voteType,
      amount: amount.toString(),
    });

    // Get updated vote counts
    const voteCounts = await getVoteCounts(parseInt(commentId));

    res.json({
      success: true,
      message: 'Vote recorded',
      data: {
        commentId,
        voteType,
        ...voteCounts
      }
    });
  } catch (error) {
    safeLogger.error('Error recording comment vote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record vote'
    });
  }
});

// Get comment votes
router.get('/:communityId/comments/:commentId/votes', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userAddress } = req.query;

    const voteCounts = await getVoteCounts(parseInt(commentId));
    
    // If user address provided, get their vote
    let userVote = null;
    if (userAddress) {
      const vote = await db
        .select()
        .from(reactions)
        .where(
          and(
            eq(reactions.postId, parseInt(commentId)),
            eq(reactions.userId, userAddress as string)
          )
        )
        .limit(1);

      userVote = vote.length > 0 ? vote[0].type : null;
    }

    res.json({
      success: true,
      data: {
        ...voteCounts,
        userVote
      }
    });
  } catch (error) {
    safeLogger.error('Error fetching comment votes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch votes'
    });
  }
});

// Helper method to get vote counts
async function getVoteCounts(commentId: number): Promise<{
  upvotes: number;
  downvotes: number;
  score: number;
}> {
  try {
    const votes = await db
      .select({
        type: reactions.type,
        count: sql<number>`count(*)::int`
      })
      .from(reactions)
      .where(eq(reactions.postId, commentId))
      .groupBy(reactions.type);

    const upvotes = votes.find(v => v.type === 'upvote')?.count || 0;
    const downvotes = votes.find(v => v.type === 'downvote')?.count || 0;
    const score = upvotes - downvotes;

    return { upvotes, downvotes, score };
  } catch (error) {
    safeLogger.error('Error counting votes:', error);
    return { upvotes: 0, downvotes: 0, score: 0 };
  }
}

export default router;

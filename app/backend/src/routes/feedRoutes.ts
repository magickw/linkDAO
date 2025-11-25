import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { feedController } from '../controllers/feedController';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/authMiddleware';
import { feedRateLimit } from '../middleware/rateLimitingMiddleware';

const router = express.Router();

// Apply rate limiting to all routes
router.use(feedRateLimit);

// Get personalized feed with filtering (optional authentication for personalization)
router.get('/',
  // Use optional auth - if user is authenticated, personalize feed; if not, show public feed
  (req, res, next) => {
    // Try to authenticate but don't fail if no token
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      // Extract token and try to verify it
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

          // Attach user to request
          (req as any).user = {
            address: decoded.walletAddress || decoded.address,
            walletAddress: decoded.walletAddress || decoded.address,
            userId: decoded.userId || decoded.id,
            id: decoded.userId || decoded.id || decoded.walletAddress || decoded.address,
            kycStatus: decoded.kycStatus,
            permissions: decoded.permissions || [],
            isAdmin: decoded.isAdmin || false
          };
        } catch (error) {
          // Token invalid, continue without user
          console.warn('Invalid token in feed request:', error);
        }
      }
    }
    // Continue to next middleware regardless
    next();
  },
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 },
      sort: { type: 'string', optional: true, enum: ['hot', 'new', 'top', 'following', 'rising'] },
      communities: { type: 'array', optional: true },
      timeRange: { type: 'string', optional: true, enum: ['hour', 'day', 'week', 'month', 'all'] },
      feedSource: { type: 'string', optional: true, enum: ['all', 'following'] }
    }
  }),
  feedController.getEnhancedFeed
);

// Get trending posts (public access)
router.get('/trending',
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 },
      timeRange: { type: 'string', optional: true, enum: ['hour', 'day', 'week'] }
    }
  }),
  feedController.getTrendingPosts
);

// Create new post (requires authentication)
router.post('/',
  authMiddleware, // Apply auth only to this route
  csrfProtection,
  validateRequest({
    body: {
      content: { type: 'string', required: true, minLength: 1, maxLength: 5000 },
      communityId: { type: 'string', optional: true },
      mediaUrls: { type: 'array', optional: true },
      tags: { type: 'array', optional: true },
      pollData: { type: 'object', optional: true }
    }
  }),
  feedController.createPost
);

// Update post (requires authentication)
router.put('/:id',
  authMiddleware, // Apply auth only to this route
  csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      content: { type: 'string', optional: true, minLength: 1, maxLength: 5000 },
      tags: { type: 'array', optional: true }
    }
  }),
  feedController.updatePost
);

// Delete post (requires authentication)
router.delete('/:id',
  authMiddleware, // Apply auth only to this route
  csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  feedController.deletePost
);

// Alias for delete post to handle legacy/stale client requests to /api/feed/posts/:id
router.delete('/posts/:id',
  authMiddleware, // Apply auth only to this route
  csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  feedController.deletePost
);

// Add reaction to post (requires authentication)
router.post('/:id/react',
  authMiddleware, // Apply auth only to this route
  csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      type: { type: 'string', required: true, enum: ['like', 'love', 'laugh', 'angry', 'sad'] },
      tokenAmount: { type: 'number', optional: true, min: 0 }
    }
  }),
  feedController.addReaction
);

// Send tip to post author (requires authentication)
router.post('/:id/tip',
  authMiddleware, // Apply auth only to this route
  csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      amount: { type: 'number', required: true, min: 0.001 },
      tokenType: { type: 'string', required: true },
      message: { type: 'string', optional: true, maxLength: 500 }
    }
  }),
  feedController.sendTip
);

// Get detailed engagement data for post (public access)
router.get('/:id/engagement',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  feedController.getEngagementData
);

// Share post (requires authentication)
router.post('/:id/share',
  authMiddleware, // Apply auth only to this route
  csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      targetType: { type: 'string', required: true, enum: ['community', 'direct_message', 'external'] },
      targetId: { type: 'string', optional: true },
      message: { type: 'string', optional: true, maxLength: 500 }
    }
  }),
  feedController.sharePost
);

// Get post comments (public access)
router.get('/:id/comments',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 100 },
      sortBy: { type: 'string', optional: true, enum: ['best', 'new', 'top', 'controversial'] }
    }
  }),
  feedController.getPostComments
);

// Add comment to post (requires authentication)
router.post('/:id/comments',
  authMiddleware, // Apply auth only to this route
  csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      content: { type: 'string', required: true, minLength: 1, maxLength: 2000 },
      parentCommentId: { type: 'string', optional: true }
    }
  }),
  feedController.addComment
);

// Get community engagement metrics (public access)
router.get('/community/:communityId/metrics',
  validateRequest({
    params: {
      communityId: { type: 'string', required: true }
    },
    query: {
      timeRange: { type: 'string', optional: true, enum: ['hour', 'day', 'week', 'month'] }
    }
  }),
  feedController.getCommunityEngagementMetrics
);

// Get community leaderboard (public access)
router.get('/community/:communityId/leaderboard',
  validateRequest({
    params: {
      communityId: { type: 'string', required: true }
    },
    query: {
      metric: { type: 'string', required: true, enum: ['posts', 'engagement', 'tips_received', 'tips_given'] },
      limit: { type: 'number', optional: true, min: 1, max: 50 }
    }
  }),
  feedController.getCommunityLeaderboard
);

// Get liked by data for post (public access)
router.get('/posts/:postId/engagement',
  validateRequest({
    params: {
      postId: { type: 'string', required: true }
    }
  }),
  feedController.getLikedByData
);

// Get content from IPFS by CID (public access)
router.get('/content/:cid',
  validateRequest({
    params: {
      cid: { type: 'string', required: true }
    }
  }),
  feedController.getContentFromIPFS
);

// Upvote post (requires authentication)
router.post('/:id/upvote',
  authMiddleware,
  csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  feedController.upvotePost
);

// Downvote post (requires authentication)
router.post('/:id/downvote',
  authMiddleware,
  csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  feedController.downvotePost
);

export default router;
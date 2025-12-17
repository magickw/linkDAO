import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { feedController } from '../controllers/feedController';
import { validateRequest } from '../middleware/validation';
import { AuthenticationMiddleware } from '../middleware/authenticationMiddleware';
import { createDefaultAuthRoutes } from './authenticationRoutes';
import { feedRateLimit } from '../middleware/rateLimitingMiddleware';
// Import the AuthenticationService directly
import { AuthenticationService } from '../services/authenticationService';

const router = express.Router();

// Apply rate limiting to all routes
router.use(feedRateLimit);

// Create authentication middleware instance
const connectionString = process.env.DATABASE_URL || '';
const jwtSecret = process.env.JWT_SECRET || 'development-secret-key-change-in-production';
const authService = new AuthenticationService(connectionString, jwtSecret);
const customAuthMiddleware = new AuthenticationMiddleware(authService);

// Get personalized feed with filtering (optional authentication for personalization)
router.get('/',
  // Use optional auth - if user is authenticated, personalize feed; if not, show public feed
  customAuthMiddleware.optionalAuth,
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 },
      sort: { type: 'string', optional: true, enum: ['hot', 'new', 'top', 'following', 'rising'] },
      communities: { type: 'array', optional: true },
      timeRange: { type: 'string', optional: true, enum: ['hour', 'day', 'week', 'month', 'all'] },
      feedSource: { type: 'string', optional: true, enum: ['all', 'following', 'trending'] }
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
  customAuthMiddleware.requireAuth, // Apply auth only to this route
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
  customAuthMiddleware.requireAuth, // Apply auth only to this route
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
  customAuthMiddleware.requireAuth, // Apply auth only to this route
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
  customAuthMiddleware.requireAuth, // Apply auth only to this route
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
  customAuthMiddleware.requireAuth, // Apply auth only to this route
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
  customAuthMiddleware.requireAuth, // Apply auth only to this route
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

// Get post by ID (public access)
router.get('/:id',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  feedController.getPostById
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
  customAuthMiddleware.requireAuth, // Apply auth only to this route
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
  customAuthMiddleware.requireAuth, // Apply auth only to this route
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
  customAuthMiddleware.requireAuth,
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
  customAuthMiddleware.requireAuth,
  csrfProtection,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  feedController.downvotePost
);

export default router;
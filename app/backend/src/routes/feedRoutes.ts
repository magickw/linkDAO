import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { feedController } from '../controllers/feedController';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = express.Router();

// Apply rate limiting to all routes
router.use(rateLimitingMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased limit each IP to 500 requests per windowMs
  message: 'Too many feed requests from this IP'
}));

// Get personalized feed with filtering (requires authentication)
router.get('/enhanced', 
  authMiddleware, // Apply auth only to this route
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 },
      sort: { type: 'string', optional: true, enum: ['hot', 'new', 'top', 'following'] },
      communities: { type: 'array', optional: true },
      timeRange: { type: 'string', optional: true, enum: ['hour', 'day', 'week', 'month', 'all'] }
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
      limit: { type: 'number', optional: true, min: 1, max: 50 },
      sort: { type: 'string', optional: true, enum: ['newest', 'oldest', 'top'] }
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

export default router;
import express from 'express';
import { feedController } from '../controllers/feedController';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = express.Router();

// Apply authentication middleware to all feed routes
router.use(authMiddleware);

// Apply rate limiting
router.use(rateLimitingMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many feed requests from this IP'
}));

// Get personalized feed with filtering
router.get('/enhanced', 
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

// Get trending posts
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

// Create new post
router.post('/',
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

// Update post
router.put('/:id',
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

// Delete post
router.delete('/:id',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  feedController.deletePost
);

// Add reaction to post
router.post('/:id/react',
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

// Send tip to post author
router.post('/:id/tip',
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

// Get detailed engagement data for post
router.get('/:id/engagement',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  feedController.getEngagementData
);

// Share post
router.post('/:id/share',
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

// Get post comments
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

// Add comment to post
router.post('/:id/comments',
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

export default router;
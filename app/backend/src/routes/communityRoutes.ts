import express from 'express';
import { communityController } from '../controllers/communityController';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = express.Router();

// Apply authentication middleware to protected routes
const authRequired = authMiddleware;

// Apply rate limiting
router.use(rateLimitingMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many community requests from this IP'
}));

// List communities with filtering (public)
router.get('/',
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 },
      category: { type: 'string', optional: true },
      search: { type: 'string', optional: true },
      sort: { type: 'string', optional: true, enum: ['newest', 'popular', 'active', 'members'] },
      tags: { type: 'array', optional: true }
    }
  }),
  communityController.listCommunities
);

// Get trending communities (public)
router.get('/trending',
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 20 },
      timeRange: { type: 'string', optional: true, enum: ['day', 'week', 'month'] }
    }
  }),
  communityController.getTrendingCommunities
);

// Get community details (public)
router.get('/:id',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  communityController.getCommunityDetails
);

// Create new community (auth required)
router.post('/',
  authRequired,
  validateRequest({
    body: {
      name: { type: 'string', required: true, minLength: 3, maxLength: 50 },
      displayName: { type: 'string', required: true, minLength: 3, maxLength: 100 },
      description: { type: 'string', required: true, minLength: 10, maxLength: 1000 },
      category: { type: 'string', required: true },
      tags: { type: 'array', optional: true },
      isPublic: { type: 'boolean', optional: true },
      iconUrl: { type: 'string', optional: true },
      bannerUrl: { type: 'string', optional: true },
      rules: { type: 'array', optional: true },
      governanceEnabled: { type: 'boolean', optional: true },
      stakingRequired: { type: 'boolean', optional: true },
      minimumStake: { type: 'number', optional: true, min: 0 }
    }
  }),
  communityController.createCommunity
);

// Update community (auth required)
router.put('/:id',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      displayName: { type: 'string', optional: true, minLength: 3, maxLength: 100 },
      description: { type: 'string', optional: true, minLength: 10, maxLength: 1000 },
      category: { type: 'string', optional: true },
      tags: { type: 'array', optional: true },
      isPublic: { type: 'boolean', optional: true },
      iconUrl: { type: 'string', optional: true },
      bannerUrl: { type: 'string', optional: true },
      rules: { type: 'array', optional: true }
    }
  }),
  communityController.updateCommunity
);

// Join community (auth required)
router.post('/:id/join',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  communityController.joinCommunity
);

// Leave community (auth required)
router.delete('/:id/leave',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  communityController.leaveCommunity
);

// Get community posts (public)
router.get('/:id/posts',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 },
      sort: { type: 'string', optional: true, enum: ['newest', 'oldest', 'hot', 'top'] },
      timeRange: { type: 'string', optional: true, enum: ['day', 'week', 'month', 'all'] }
    }
  }),
  communityController.getCommunityPosts
);

// Create post in community (auth required)
router.post('/:id/posts',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      content: { type: 'string', required: true, minLength: 1, maxLength: 5000 },
      mediaUrls: { type: 'array', optional: true },
      tags: { type: 'array', optional: true },
      pollData: { type: 'object', optional: true }
    }
  }),
  communityController.createCommunityPost
);

// Get community members (public)
router.get('/:id/members',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 },
      role: { type: 'string', optional: true, enum: ['member', 'moderator', 'admin'] }
    }
  }),
  communityController.getCommunityMembers
);

// Get community statistics (public)
router.get('/:id/stats',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  communityController.getCommunityStats
);

// Moderation actions (auth required, moderator only)
router.post('/:id/moderate',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      action: { type: 'string', required: true, enum: ['approve_post', 'reject_post', 'ban_user', 'unban_user', 'promote_user', 'demote_user'] },
      targetId: { type: 'string', required: true },
      reason: { type: 'string', optional: true, maxLength: 500 }
    }
  }),
  communityController.moderateContent
);

// Get community governance proposals (public)
router.get('/:id/governance',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 20 },
      status: { type: 'string', optional: true, enum: ['active', 'passed', 'rejected', 'expired'] }
    }
  }),
  communityController.getGovernanceProposals
);

// Create governance proposal (auth required)
router.post('/:id/governance',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
      description: { type: 'string', required: true, minLength: 20, maxLength: 2000 },
      type: { type: 'string', required: true, enum: ['rule_change', 'moderator_election', 'budget_allocation', 'feature_request'] },
      votingDuration: { type: 'number', optional: true, min: 1, max: 30 }, // days
      requiredStake: { type: 'number', optional: true, min: 0 }
    }
  }),
  communityController.createGovernanceProposal
);

// Vote on governance proposal (auth required)
router.post('/:id/governance/:proposalId/vote',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true },
      proposalId: { type: 'string', required: true }
    },
    body: {
      vote: { type: 'string', required: true, enum: ['yes', 'no', 'abstain'] },
      stakeAmount: { type: 'number', optional: true, min: 0 }
    }
  }),
  communityController.voteOnProposal
);

// Execute governance proposal (auth required)
router.post('/:id/governance/:proposalId/execute',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true },
      proposalId: { type: 'string', required: true }
    }
  }),
  communityController.executeProposal
);

// Get moderation queue (auth required, moderator only)
router.get('/:id/moderation/queue',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 },
      type: { type: 'string', optional: true, enum: ['posts', 'reports', 'all'] }
    }
  }),
  communityController.getModerationQueue
);

// Flag content (auth required)
router.post('/:id/flag',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      targetType: { type: 'string', required: true, enum: ['post', 'comment', 'user'] },
      targetId: { type: 'string', required: true },
      reason: { type: 'string', required: true, minLength: 10, maxLength: 500 },
      category: { type: 'string', required: true, enum: ['spam', 'harassment', 'inappropriate', 'other'] }
    }
  }),
  communityController.flagContent
);

// Search communities (public)
router.get('/search/query',
  validateRequest({
    query: {
      q: { type: 'string', required: true, minLength: 2 },
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 20 },
      category: { type: 'string', optional: true }
    }
  }),
  communityController.searchCommunities
);

export default router;
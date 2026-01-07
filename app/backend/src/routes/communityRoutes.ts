import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
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
  maxRequests: 200, // limit each IP to 200 requests per windowMs
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

// Fallback route for frontend compatibility - handle both /communities/trending and /trending
router.get('*/trending',
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 20 },
      timeRange: { type: 'string', optional: true, enum: ['day', 'week', 'month'] }
    }
  }),
  communityController.getTrendingCommunities
);

// Get communities created by user (auth required)
// IMPORTANT: This must come BEFORE /:id to avoid routing conflicts
router.get('/my-communities',
  authRequired,
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 100 }
    }
  }),
  communityController.getMyCommunities
);

// Get user's community memberships (auth required)
// IMPORTANT: This must come BEFORE /:id to avoid routing conflicts
router.get('/user/memberships',
  authRequired,
  communityController.getUserCommunityMemberships
);

// Get aggregated feed from followed communities (auth required)
// IMPORTANT: This must come BEFORE /:id to avoid routing conflicts
router.get('/feed',
  authRequired,
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 },
      sort: { type: 'string', optional: true, enum: ['new', 'newest', 'hot', 'top', 'rising'] },
      timeRange: { type: 'string', optional: true, enum: ['hour', 'day', 'week', 'month', 'year', 'all'] }
    }
  }),
  communityController.getFollowedCommunitiesFeed
);

// Get community details by slug or ID (public)
// The controller method handles both numeric IDs and slugs
router.get('/:id',
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  communityController.getCommunityDetails
);

// Create new community (auth required, CSRF optional for authenticated users)
router.post('/',
  authRequired,
  validateRequest({
    body: {
      name: { type: 'string', required: true, minLength: 3, maxLength: 50 },
      slug: { type: 'string', required: true, minLength: 3, maxLength: 64, pattern: '^[a-z0-9-]+$' },
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
router.put('/:id', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      displayName: { type: 'string', optional: true, minLength: 3, maxLength: 100 },
      slug: { type: 'string', optional: true, minLength: 3, maxLength: 64, pattern: '^[a-z0-9-]+$' },
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
router.post('/:id/join', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  communityController.joinCommunity
);

// Leave community (auth required)
router.delete('/:id/leave', csrfProtection,
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
      sort: { type: 'string', optional: true, enum: ['newest', 'new', 'oldest', 'hot', 'top'] },
      timeRange: { type: 'string', optional: true, enum: ['day', 'week', 'month', 'all'] }
    }
  }),
  communityController.getCommunityPosts
);

// Delete post in community (auth required)
router.delete('/:id/posts/:postId', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true },
      postId: { type: 'string', required: true }
    }
  }),
  communityController.deletePost
);

// Update post in community (auth required)
router.put('/:id/posts/:postId', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true },
      postId: { type: 'string', required: true }
    },
    body: {
      title: { type: 'string', optional: true, maxLength: 200 },
      content: { type: 'string', optional: true, minLength: 1, maxLength: 50000 },
      mediaUrls: { type: 'array', optional: true },
      tags: { type: 'array', optional: true }
    }
  }),
  communityController.updateCommunityPost
);

// Create post in community (auth required)
router.post('/:id/posts', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      title: { type: 'string', optional: true, maxLength: 200 },
      content: { type: 'string', required: true, minLength: 1, maxLength: 50000 },
      mediaUrls: { type: 'array', optional: true },
      tags: { type: 'array', optional: true },
      pollData: { type: 'object', optional: true }
    }
  }),
  communityController.createCommunityPost
);

// AI-assisted post creation in community (auth required)
router.post('/:id/posts/ai-assisted', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      title: { type: 'string', optional: true, maxLength: 200 },
      content: { type: 'string', optional: true, maxLength: 5000 },
      mediaUrls: { type: 'array', optional: true },
      tags: { type: 'array', optional: true },
      postType: { type: 'string', optional: true },
      aiAction: { type: 'string', optional: true, enum: ['generate_title', 'generate_content', 'generate_tags', 'improve_content'] },
      communityContext: { type: 'object', optional: true }
    }
  }),
  communityController.createAIAssistedPost
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
router.post('/:id/moderate', csrfProtection,
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
router.post('/:id/governance', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
      description: { type: 'string', required: true, minLength: 20, maxLength: 2000 },
      type: { type: 'string', required: true, enum: ['rule_change', 'moderator_election', 'budget_allocation', 'feature_request', 'spending', 'parameter_change', 'grant', 'membership'] },
      votingDuration: { type: 'number', optional: true, min: 1, max: 30 }, // days
      requiredStake: { type: 'number', optional: true, min: 0 }
    }
  }),
  communityController.createGovernanceProposal
);

// Vote on governance proposal (auth required)
router.post('/:id/governance/:proposalId/vote', csrfProtection,
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
router.post('/:id/governance/:proposalId/execute', csrfProtection,
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
router.post('/:id/flag', csrfProtection,
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

// Create delegation (auth required)
router.post('/:id/delegations', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      delegatorAddress: { type: 'string', required: true },
      delegateAddress: { type: 'string', required: true },
      expiryDate: { type: 'string', optional: true },
      metadata: { type: 'object', optional: true }
    }
  }),
  communityController.createDelegation
);

// Revoke delegation (auth required)
router.delete('/:id/delegations', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      delegatorAddress: { type: 'string', required: true }
    }
  }),
  communityController.revokeDelegation
);

// Get delegations as delegate (auth required)
router.get('/:id/delegations',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    query: {
      delegateAddress: { type: 'string', required: true },
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 }
    }
  }),
  communityController.getDelegationsAsDelegate
);

// Create proxy vote (auth required)
router.post('/proxy-votes', csrfProtection,
  authRequired,
  validateRequest({
    body: {
      proposalId: { type: 'string', required: true },
      proxyAddress: { type: 'string', required: true },
      voterAddress: { type: 'string', required: true },
      vote: { type: 'string', required: true, enum: ['yes', 'no', 'abstain'] },
      reason: { type: 'string', optional: true, maxLength: 500 }
    }
  }),
  communityController.createProxyVote
);

// Create multi-signature approval (auth required)
router.post('/multi-sig-approvals', csrfProtection,
  authRequired,
  validateRequest({
    body: {
      proposalId: { type: 'string', required: true },
      approverAddress: { type: 'string', required: true },
      signature: { type: 'string', optional: true },
      metadata: { type: 'object', optional: true }
    }
  }),
  communityController.createMultiSigApproval
);

// Get multi-signature approvals
router.get('/:proposalId/multi-sig-approvals',
  validateRequest({
    params: {
      proposalId: { type: 'string', required: true }
    },
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 }
    }
  }),
  communityController.getMultiSigApprovals
);

// Create automated execution (auth required)
router.post('/automated-executions', csrfProtection,
  authRequired,
  validateRequest({
    body: {
      proposalId: { type: 'string', required: true },
      executionType: { type: 'string', required: true, enum: ['scheduled', 'recurring', 'dependent'] },
      executionTime: { type: 'string', optional: true },
      recurrencePattern: { type: 'string', optional: true },
      dependencyProposalId: { type: 'string', optional: true },
      metadata: { type: 'object', optional: true }
    }
  }),
  communityController.createAutomatedExecution
);

// Get automated executions
router.get('/:proposalId/automated-executions',
  validateRequest({
    params: {
      proposalId: { type: 'string', required: true }
    },
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 50 }
    }
  }),
  communityController.getAutomatedExecutions
);

// Token-gated content routes

// Check if user has access to token-gated content
router.get('/token-gated-content/:contentId/access',
  authRequired,
  validateRequest({
    params: {
      contentId: { type: 'string', required: true }
    }
  }),
  communityController.checkContentAccess
);

// Grant access to token-gated content
router.post('/token-gated-content/:contentId/access', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      contentId: { type: 'string', required: true }
    },
    body: {
      accessLevel: { type: 'string', optional: true, enum: ['denied', 'view', 'interact', 'full'] }
    }
  }),
  communityController.grantContentAccess
);

// Create token-gated content
router.post('/:communityId/token-gated-content', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      communityId: { type: 'string', required: true }
    },
    body: {
      postId: { type: 'string', optional: true },
      gatingType: { type: 'string', required: true, enum: ['token_balance', 'nft_ownership', 'subscription'] },
      tokenAddress: { type: 'string', optional: true },
      tokenId: { type: 'string', optional: true },
      minimumBalance: { type: 'string', optional: true },
      subscriptionTier: { type: 'string', optional: true },
      accessType: { type: 'string', optional: true, enum: ['view', 'interact', 'full'] },
      metadata: { type: 'object', optional: true }
    }
  }),
  communityController.createTokenGatedContent
);

// Get token-gated content by post ID
router.get('/posts/:postId/token-gated-content',
  validateRequest({
    params: {
      postId: { type: 'string', required: true }
    }
  }),
  communityController.getTokenGatedContentByPost
);

// Subscription tier routes

// Create subscription tier
router.post('/:communityId/subscription-tiers', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      communityId: { type: 'string', required: true }
    },
    body: {
      name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      description: { type: 'string', optional: true, maxLength: 500 },
      price: { type: 'string', required: true },
      currency: { type: 'string', required: true, minLength: 1, maxLength: 10 },
      benefits: { type: 'array', optional: true },
      accessLevel: { type: 'string', required: true, enum: ['view', 'interact', 'full'] },
      durationDays: { type: 'number', optional: true, min: 1 },
      isActive: { type: 'boolean', optional: true },
      metadata: { type: 'object', optional: true }
    }
  }),
  communityController.createSubscriptionTier
);

// Get subscription tiers for a community
router.get('/:communityId/subscription-tiers',
  validateRequest({
    params: {
      communityId: { type: 'string', required: true }
    }
  }),
  communityController.getSubscriptionTiers
);

// Subscribe user to a tier
router.post('/:communityId/subscriptions', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      communityId: { type: 'string', required: true }
    },
    body: {
      tierId: { type: 'string', required: true },
      paymentTxHash: { type: 'string', optional: true },
      metadata: { type: 'object', optional: true }
    }
  }),
  communityController.subscribeUser
);

// Get user subscriptions
router.get('/:communityId/subscriptions',
  authRequired,
  validateRequest({
    params: {
      communityId: { type: 'string', required: true }
    }
  }),
  communityController.getUserSubscriptions
);

// Search authors within communities
router.get('/search-authors',
  validateRequest({
    query: {
      q: { type: 'string', required: true, minLength: 2 }
    }
  }),
  communityController.searchAuthors
);

// Get communities created by user (auth required)
router.get('/user/created',
  authRequired,
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 100 }
    }
  }),
  communityController.getUserCreatedCommunities
);

// AI Moderation endpoints (auth required)
router.post('/moderate', csrfProtection,
  authRequired,
  validateRequest({
    body: {
      content: { type: 'string', required: true, minLength: 1 },
      type: { type: 'string', required: true, enum: ['post', 'comment', 'message', 'profile'] },
      communityId: { type: 'string', optional: true }
    }
  }),
  communityController.moderateContent
);

// Get moderation statistics (auth required, moderator only)
router.get('/:id/moderation/stats',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    query: {
      timeRange: { type: 'string', optional: true, enum: ['day', 'week', 'month'] }
    }
  }),
  communityController.getModerationStats
);

// Update moderation feedback (auth required)
router.post('/moderation/feedback', csrfProtection,
  authRequired,
  validateRequest({
    body: {
      contentId: { type: 'string', required: true },
      moderationResult: { type: 'object', required: true },
      feedback: { type: 'string', required: true, enum: ['approved', 'rejected', 'escalated'] }
    }
  }),
  communityController.updateModerationFeedback
);

// Bulk Member Management Routes (auth required, moderator/admin only)

// Bulk add members
router.post('/:id/members/bulk-add', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      memberAddresses: { type: 'array', required: true, items: { type: 'string' } },
      defaultRole: { type: 'string', optional: true, enum: ['member', 'moderator', 'admin'] },
      defaultReputation: { type: 'number', optional: true, min: 0, max: 1000 },
      sendWelcomeMessage: { type: 'boolean', optional: true },
      skipExisting: { type: 'boolean', optional: true }
    }
  }),
  communityController.bulkAddMembers
);

// Bulk remove members
router.post('/:id/members/bulk-remove', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      memberAddresses: { type: 'array', required: true, items: { type: 'string' } },
      reason: { type: 'string', optional: true, maxLength: 500 }
    }
  }),
  communityController.bulkRemoveMembers
);

// Bulk update member roles
router.post('/:id/members/bulk-update-roles', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      memberAddresses: { type: 'array', required: true, items: { type: 'string' } },
      newRole: { type: 'string', required: true, enum: ['member', 'moderator', 'admin'] },
      reason: { type: 'string', optional: true, maxLength: 500 }
    }
  }),
  communityController.bulkUpdateMemberRoles
);

// Bulk update member reputation
router.post('/:id/members/bulk-update-reputation', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      memberAddresses: { type: 'array', required: true, items: { type: 'string' } },
      reputationChange: { type: 'number', required: true },
      reason: { type: 'string', optional: true, maxLength: 500 }
    }
  }),
  communityController.bulkUpdateMemberReputation
);

// Bulk ban members
router.post('/:id/members/bulk-ban', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      memberAddresses: { type: 'array', required: true, items: { type: 'string' } },
      reason: { type: 'string', required: true, minLength: 10, maxLength: 500 },
      banDuration: { type: 'number', optional: true, min: 1 } // Duration in days
    }
  }),
  communityController.bulkBanMembers
);

// Bulk unban members
router.post('/:id/members/bulk-unban', csrfProtection,
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      memberAddresses: { type: 'array', required: true, items: { type: 'string' } },
      reason: { type: 'string', optional: true, maxLength: 500 }
    }
  }),
  communityController.bulkUnbanMembers
);

// Export members
router.get('/:id/members/export',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    query: {
      format: { type: 'string', optional: true, enum: ['csv', 'json'] },
      includeInactive: { type: 'boolean', optional: true },
      fields: { type: 'array', optional: true, items: { type: 'string', enum: ['address', 'role', 'reputation', 'joinedAt', 'lastActivityAt', 'isActive'] } }
    }
  }),
  communityController.exportMembers
);

// Import members from CSV (requires multer middleware for file upload)
router.post('/:id/members/import', csrfProtection,
  authRequired,
  // Note: This would need multer middleware for file upload
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      defaultRole: { type: 'string', optional: true, enum: ['member', 'moderator', 'admin'] },
      defaultReputation: { type: 'number', optional: true, min: 0, max: 1000 },
      sendWelcomeMessage: { type: 'boolean', optional: true },
      skipExisting: { type: 'boolean', optional: true }
    }
  }),
  communityController.importMembers
);

// Get member statistics
router.get('/:id/members/statistics',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  communityController.getMemberStatistics
);

// Push Notification Routes (auth required)

// Get VAPID public key for client subscription
router.get('/notifications/vapid-public-key',
  communityController.getVapidPublicKey
);

// Register device subscription
router.post('/notifications/register', csrfProtection,
  authRequired,
  validateRequest({
    body: {
      subscription: { type: 'object', required: true }
    }
  }),
  communityController.registerDeviceSubscription
);

// Unregister device subscription
router.post('/notifications/unregister', csrfProtection,
  authRequired,
  validateRequest({
    body: {
      endpoint: { type: 'string', required: true }
    }
  }),
  communityController.unregisterDeviceSubscription
);

// Get notification preferences
router.get('/notifications/preferences',
  authRequired,
  communityController.getNotificationPreferences
);

// Update notification preferences
router.put('/notifications/preferences', csrfProtection,
  authRequired,
  validateRequest({
    body: {
      communityUpdates: { type: 'boolean', optional: true },
      newPosts: { type: 'boolean', optional: true },
      mentions: { type: 'boolean', optional: true },
      replies: { type: 'boolean', optional: true },
      communityInvites: { type: 'boolean', optional: true },
      governanceProposals: { type: 'boolean', optional: true },
      proposalResults: { type: 'boolean', optional: true },
      moderatorActions: { type: 'boolean', optional: true },
      systemUpdates: { type: 'boolean', optional: true }
    }
  }),
  communityController.updateNotificationPreferences
);

// Send test notification
router.post('/notifications/test', csrfProtection,
  authRequired,
  validateRequest({
    body: {
      title: { type: 'string', optional: true, maxLength: 100 },
      message: { type: 'string', optional: true, maxLength: 500 }
    }
  }),
  communityController.sendTestNotification
);

// Get notification statistics
router.get('/notifications/statistics',
  authRequired,
  validateRequest({
    query: {
      days: { type: 'number', optional: true, min: 1, max: 365 }
    }
  }),
  communityController.getNotificationStatistics
);

// Community Health Dashboard Routes (auth required, moderator/admin only)

// Get community health metrics
router.get('/:id/health/metrics',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  communityController.getCommunityHealthMetrics
);

// Get community health alerts
router.get('/:id/health/alerts',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  communityController.getCommunityHealthAlerts
);

// Get historical health metrics
router.get('/:id/health/historical',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    query: {
      days: { type: 'number', optional: true, min: 7, max: 365 }
    }
  }),
  communityController.getHistoricalHealthMetrics
);

// Get community benchmark comparison
router.get('/:id/health/benchmark',
  authRequired,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  communityController.getCommunityBenchmarkComparison
);

// Get health metrics for all user communities (admin dashboard)
router.get('/health/dashboard',
  authRequired,
  communityController.getAllCommunitiesHealthMetrics
);



export default router;
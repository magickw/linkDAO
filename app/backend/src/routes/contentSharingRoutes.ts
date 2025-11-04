import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { contentSharingController } from '../controllers/contentSharingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';
import rateLimit from 'express-rate-limit';

// Rate limiting for content sharing endpoints
const contentSharingRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'CONTENT_SHARING_RATE_LIMIT_EXCEEDED',
      message: 'Too many content sharing requests, please try again later',
    }
  }
});

const router = Router();

// Validation schemas
const generateShareableContentSchema = {
  params: {
    contentType: { type: 'string', required: true, enum: ['post', 'community', 'user_profile', 'nft', 'governance_proposal'] },
    contentId: { type: 'string', required: true }
  }
};

const generateContentPreviewSchema = {
  body: {
    content: { type: 'object', required: true },
    'content.id': { type: 'string', required: true },
    'content.type': { type: 'string', required: true, enum: ['post', 'community', 'user_profile', 'nft', 'governance_proposal'] },
    'content.title': { type: 'string', required: true },
    'content.url': { type: 'string', required: true }
  }
};

const shareToDirectMessageSchema = {
  body: {
    content: { type: 'object', required: true },
    'content.id': { type: 'string', required: true },
    'content.type': { type: 'string', required: true, enum: ['post', 'community', 'user_profile', 'nft', 'governance_proposal'] },
    options: { type: 'object', required: true },
    'options.conversationId': { type: 'string', optional: true },
    'options.recipientAddress': { type: 'string', optional: true },
    'options.message': { type: 'string', optional: true }
  }
};

const createCommunityInvitationSchema = {
  body: {
    communityId: { type: 'string', required: true },
    recipientAddress: { type: 'string', required: true },
    customMessage: { type: 'string', optional: true }
  }
};

const crossPostSchema = {
  body: {
    originalPostId: { type: 'string', required: true },
    targetCommunityIds: { type: 'array', required: true },
    attribution: { type: 'object', required: true },
    'attribution.originalAuthor': { type: 'string', required: true },
    'attribution.originalPostId': { type: 'string', required: true },
    'attribution.originalCommunityId': { type: 'string', optional: true },
    customMessage: { type: 'string', optional: true }
  }
};

const getSharingAnalyticsSchema = {
  params: {
    contentType: { type: 'string', required: true, enum: ['post', 'community', 'user_profile', 'nft', 'governance_proposal'] },
    contentId: { type: 'string', required: true }
  },
  query: {
    timeRange: { type: 'string', optional: true, enum: ['24h', '7d', '30d', 'all'] }
  }
};

const trackSharingEventSchema = {
  body: {
    contentId: { type: 'string', required: true },
    contentType: { type: 'string', required: true, enum: ['post', 'community', 'user_profile', 'nft', 'governance_proposal'] },
    shareType: { type: 'string', required: true, enum: ['direct_message', 'community_cross_post', 'external_share'] },
    metadata: { type: 'object', optional: true }
  }
};

const getUserSharingHistorySchema = {
  query: {
    page: { type: 'number', optional: true },
    limit: { type: 'number', optional: true },
    contentType: { type: 'string', optional: true, enum: ['post', 'community', 'user_profile', 'nft', 'governance_proposal'] },
    shareType: { type: 'string', optional: true, enum: ['direct_message', 'community_cross_post', 'external_share'] }
  }
};

const getTrendingSharedContentSchema = {
  query: {
    timeRange: { type: 'string', optional: true, enum: ['24h', '7d', '30d'] },
    contentType: { type: 'string', optional: true, enum: ['post', 'community', 'user_profile', 'nft', 'governance_proposal'] },
    limit: { type: 'number', optional: true }
  }
};

// Generate shareable content object
router.get(
  '/shareable/:contentType/:contentId',
  contentSharingRateLimit,
  validateRequest(generateShareableContentSchema),
  contentSharingController.generateShareableContent
);

// Generate content preview
router.post(
  '/preview',
  contentSharingRateLimit,
  validateRequest(generateContentPreviewSchema),
  contentSharingController.generateContentPreview
);

// Share content to direct message
router.post(
  '/share-to-message',
  contentSharingRateLimit,
  authMiddleware,
  validateRequest(shareToDirectMessageSchema),
  contentSharingController.shareToDirectMessage
);

// Create community invitation
router.post(
  '/community-invitation',
  contentSharingRateLimit,
  authMiddleware,
  validateRequest(createCommunityInvitationSchema),
  contentSharingController.createCommunityInvitation
);

// Cross-post content to communities
router.post(
  '/cross-post',
  contentSharingRateLimit,
  authMiddleware,
  validateRequest(crossPostSchema),
  contentSharingController.crossPostToCommunities
);

// Get sharing analytics
router.get(
  '/:contentType/:contentId/analytics',
  contentSharingRateLimit,
  validateRequest(getSharingAnalyticsSchema),
  contentSharingController.getSharingAnalytics
);

// Track sharing event
router.post(
  '/track-event',
  contentSharingRateLimit,
  authMiddleware,
  validateRequest(trackSharingEventSchema),
  contentSharingController.trackSharingEvent
);

// Get user's sharing history
router.get(
  '/history',
  contentSharingRateLimit,
  authMiddleware,
  validateRequest(getUserSharingHistorySchema),
  contentSharingController.getUserSharingHistory
);

// Get trending shared content
router.get(
  '/trending',
  contentSharingRateLimit,
  validateRequest(getTrendingSharedContentSchema),
  contentSharingController.getTrendingSharedContent
);

export { router as contentSharingRoutes };
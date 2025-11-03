import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { contentSharingController } from '../controllers/contentSharingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';

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
  validateRequest(generateShareableContentSchema),
  contentSharingController.generateShareableContent
);

// Generate content preview
router.post(
  '/preview',
  validateRequest(generateContentPreviewSchema),
  contentSharingController.generateContentPreview
);

// Share content to direct message
router.post(
  '/share-to-message',
  authMiddleware,
  validateRequest(shareToDirectMessageSchema),
  contentSharingController.shareToDirectMessage
);

// Create community invitation
router.post(
  '/community-invitation',
  authMiddleware,
  validateRequest(createCommunityInvitationSchema),
  contentSharingController.createCommunityInvitation
);

// Cross-post content to communities
router.post(
  '/cross-post',
  authMiddleware,
  validateRequest(crossPostSchema),
  contentSharingController.crossPostToCommunities
);

// Get sharing analytics
router.get(
  '/:contentType/:contentId/analytics',
  validateRequest(getSharingAnalyticsSchema),
  contentSharingController.getSharingAnalytics
);

// Track sharing event
router.post(
  '/track-event',
  authMiddleware,
  validateRequest(trackSharingEventSchema),
  contentSharingController.trackSharingEvent
);

// Get user's sharing history
router.get(
  '/history',
  authMiddleware,
  validateRequest(getUserSharingHistorySchema),
  contentSharingController.getUserSharingHistory
);

// Get trending shared content
router.get(
  '/trending',
  validateRequest(getTrendingSharedContentSchema),
  contentSharingController.getTrendingSharedContent
);

export { router as contentSharingRoutes };
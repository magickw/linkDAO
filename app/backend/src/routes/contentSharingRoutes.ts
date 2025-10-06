/**
 * Content Sharing Routes
 * API endpoints for sharing content between feed, communities, and messages
 * Implements requirements 4.2, 4.5, 4.6 from the interconnected social platform spec
 */

import { Router } from 'express';
import { contentSharingController } from '../controllers/contentSharingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Generate shareable content object
router.get(
  '/shareable/:contentType/:contentId',
  [
    param('contentType').isIn(['post', 'community', 'user_profile', 'nft', 'governance_proposal']),
    param('contentId').isUUID().withMessage('Invalid content ID'),
  ],
  validateRequest,
  contentSharingController.generateShareableContent
);

// Generate content preview
router.post(
  '/preview',
  [
    body('content').isObject().withMessage('Content object is required'),
    body('content.id').notEmpty().withMessage('Content ID is required'),
    body('content.type').isIn(['post', 'community', 'user_profile', 'nft', 'governance_proposal']),
    body('content.title').notEmpty().withMessage('Content title is required'),
    body('content.url').isURL().withMessage('Valid URL is required'),
  ],
  validateRequest,
  contentSharingController.generateContentPreview
);

// Share content to direct message
router.post(
  '/share-to-message',
  authMiddleware,
  [
    body('content').isObject().withMessage('Content object is required'),
    body('content.id').notEmpty().withMessage('Content ID is required'),
    body('content.type').isIn(['post', 'community', 'user_profile', 'nft', 'governance_proposal']),
    body('options').isObject().withMessage('Share options are required'),
    body('options.conversationId').optional().isUUID(),
    body('options.recipientAddress').optional().matches(/^0x[a-fA-F0-9]{40}$/),
    body('options.message').optional().isString().isLength({ max: 1000 }),
  ],
  validateRequest,
  contentSharingController.shareToDirectMessage
);

// Create community invitation
router.post(
  '/community-invitation',
  authMiddleware,
  [
    body('communityId').isUUID().withMessage('Valid community ID is required'),
    body('recipientAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Valid recipient address is required'),
    body('customMessage').optional().isString().isLength({ max: 500 }),
  ],
  validateRequest,
  contentSharingController.createCommunityInvitation
);

// Cross-post content to communities
router.post(
  '/cross-post',
  authMiddleware,
  [
    body('originalPostId').isUUID().withMessage('Valid original post ID is required'),
    body('targetCommunityIds').isArray({ min: 1 }).withMessage('At least one target community is required'),
    body('targetCommunityIds.*').isUUID().withMessage('All community IDs must be valid UUIDs'),
    body('attribution').isObject().withMessage('Attribution is required'),
    body('attribution.originalAuthor').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Valid original author address is required'),
    body('attribution.originalPostId').isUUID().withMessage('Valid original post ID is required'),
    body('attribution.originalCommunityId').optional().isUUID(),
    body('customMessage').optional().isString().isLength({ max: 500 }),
  ],
  validateRequest,
  contentSharingController.crossPostToCommunities
);

// Get sharing analytics
router.get(
  '/:contentType/:contentId/analytics',
  [
    param('contentType').isIn(['post', 'community', 'user_profile', 'nft', 'governance_proposal']),
    param('contentId').isUUID().withMessage('Invalid content ID'),
    query('timeRange').optional().isIn(['24h', '7d', '30d', 'all']),
  ],
  validateRequest,
  contentSharingController.getSharingAnalytics
);

// Track sharing event
router.post(
  '/track-event',
  authMiddleware,
  [
    body('contentId').isUUID().withMessage('Valid content ID is required'),
    body('contentType').isIn(['post', 'community', 'user_profile', 'nft', 'governance_proposal']),
    body('shareType').isIn(['direct_message', 'community_cross_post', 'external_share']),
    body('metadata').optional().isObject(),
  ],
  validateRequest,
  contentSharingController.trackSharingEvent
);

// Get user's sharing history
router.get(
  '/history',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('contentType').optional().isIn(['post', 'community', 'user_profile', 'nft', 'governance_proposal']),
    query('shareType').optional().isIn(['direct_message', 'community_cross_post', 'external_share']),
  ],
  validateRequest,
  contentSharingController.getUserSharingHistory
);

// Get trending shared content
router.get(
  '/trending',
  [
    query('timeRange').optional().isIn(['24h', '7d', '30d']).default('24h'),
    query('contentType').optional().isIn(['post', 'community', 'user_profile', 'nft', 'governance_proposal']),
    query('limit').optional().isInt({ min: 1, max: 50 }).default(20),
  ],
  validateRequest,
  contentSharingController.getTrendingSharedContent
);

export { router as contentSharingRoutes };
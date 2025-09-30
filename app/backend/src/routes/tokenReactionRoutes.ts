/**
 * Token Reaction Routes
 * API routes for token-based reactions
 */

import { Router } from 'express';
import { tokenReactionController } from '../controllers/tokenReactionController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { body, param, query } from 'express-validator';

const router = Router();

// Validation schemas
const createReactionValidation = [
  body('postId')
    .isInt({ min: 1 })
    .withMessage('postId must be a positive integer'),
  body('type')
    .isIn(['🔥', '🚀', '💎'])
    .withMessage('type must be one of: 🔥, 🚀, 💎'),
  body('amount')
    .isFloat({ min: 0.1, max: 10000 })
    .withMessage('amount must be between 0.1 and 10000'),
];

const getReactionsValidation = [
  query('postId')
    .isInt({ min: 1 })
    .withMessage('postId must be a positive integer'),
  query('reactionType')
    .optional()
    .isIn(['🔥', '🚀', '💎'])
    .withMessage('reactionType must be one of: 🔥, 🚀, 💎'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be non-negative'),
];

const postIdValidation = [
  param('postId')
    .isInt({ min: 1 })
    .withMessage('postId must be a positive integer'),
];

const reactionIdValidation = [
  param('reactionId')
    .isInt({ min: 1 })
    .withMessage('reactionId must be a positive integer'),
];

const userIdValidation = [
  param('userId')
    .isUUID()
    .withMessage('userId must be a valid UUID'),
];

// Routes

/**
 * @route   POST /api/reactions
 * @desc    Create a new token reaction
 * @access  Private
 */
router.post(
  '/',
  authenticateToken,
  createReactionValidation,
  validateRequest,
  tokenReactionController.createReaction
);

/**
 * @route   GET /api/reactions
 * @desc    Get reactions for a post with pagination
 * @access  Public
 * @query   postId, reactionType?, limit?, offset?
 */
router.get(
  '/',
  getReactionsValidation,
  validateRequest,
  tokenReactionController.getReactions
);

/**
 * @route   GET /api/reactions/types
 * @desc    Get available reaction types configuration
 * @access  Public
 */
router.get('/types', tokenReactionController.getReactionTypes);

/**
 * @route   GET /api/reactions/:postId/summaries
 * @desc    Get reaction summaries for a post
 * @access  Public (but user-specific data requires auth)
 */
router.get(
  '/:postId/summaries',
  postIdValidation,
  validateRequest,
  tokenReactionController.getReactionSummaries
);

/**
 * @route   GET /api/reactions/:postId/analytics
 * @desc    Get reaction analytics for a post
 * @access  Public
 */
router.get(
  '/:postId/analytics',
  postIdValidation,
  validateRequest,
  tokenReactionController.getReactionAnalytics
);

/**
 * @route   GET /api/reactions/:postId/top-reactors
 * @desc    Get top reactors for a post
 * @access  Public
 * @query   limit?
 */
router.get(
  '/:postId/top-reactors',
  postIdValidation,
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
  validateRequest,
  tokenReactionController.getTopReactors
);

/**
 * @route   GET /api/reactions/:postId/user/:userId
 * @desc    Get user's reactions for a post
 * @access  Private (own reactions) / Admin
 */
router.get(
  '/:postId/user/:userId',
  authenticateToken,
  postIdValidation,
  userIdValidation,
  validateRequest,
  tokenReactionController.getUserReactions
);

/**
 * @route   DELETE /api/reactions/:reactionId
 * @desc    Remove a reaction (unstake tokens)
 * @access  Private (own reactions only)
 */
router.delete(
  '/:reactionId',
  authenticateToken,
  reactionIdValidation,
  validateRequest,
  tokenReactionController.removeReaction
);

export default router;
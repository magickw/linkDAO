/**
 * Bookmark Routes
 */

import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { bookmarkController } from '../controllers/bookmarkController';
import { authenticateToken } from '../middleware/auth';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = express.Router();

// All bookmark routes require authentication
router.use(authenticateToken);

// Rate limiting for bookmark operations (prevent abuse)
const bookmarkRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute per user
  message: 'Too many bookmark requests. Please try again later.'
});

// Toggle bookmark
router.post('/toggle', csrfProtection, bookmarkRateLimit, bookmarkController.toggleBookmark.bind(bookmarkController));

// Get user's bookmarks (lighter rate limit for reads)
const readRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute per user
  message: 'Too many requests. Please try again later.'
});

router.get('/', readRateLimit, bookmarkController.getUserBookmarks.bind(bookmarkController));

// Check if post is bookmarked
router.get('/check/:postId', readRateLimit, bookmarkController.checkBookmark.bind(bookmarkController));

// Get bookmark count for a post
router.get('/:postId/count', readRateLimit, bookmarkController.getBookmarkCount.bind(bookmarkController));

export default router;

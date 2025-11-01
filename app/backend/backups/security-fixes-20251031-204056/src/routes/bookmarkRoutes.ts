/**
 * Bookmark Routes
 */

import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { bookmarkController } from '../controllers/bookmarkController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrfProtection';

const router = express.Router();

// All bookmark routes require authentication
router.use(authenticateToken);

// Toggle bookmark
router.post('/toggle', csrfProtection,  bookmarkController.toggleBookmark.bind(bookmarkController));

// Get user's bookmarks
router.get('/', bookmarkController.getUserBookmarks.bind(bookmarkController));

// Check if post is bookmarked
router.get('/check/:postId', bookmarkController.checkBookmark.bind(bookmarkController));

// Get bookmark count for a post
router.get('/:postId/count', bookmarkController.getBookmarkCount.bind(bookmarkController));

export default router;

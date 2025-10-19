/**
 * Bookmark Routes
 */

import express from 'express';
import { bookmarkController } from '../controllers/bookmarkController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All bookmark routes require authentication
router.use(authenticateToken);

// Toggle bookmark
router.post('/toggle', bookmarkController.toggleBookmark.bind(bookmarkController));

// Get user's bookmarks
router.get('/', bookmarkController.getUserBookmarks.bind(bookmarkController));

// Check if post is bookmarked
router.get('/check/:postId', bookmarkController.checkBookmark.bind(bookmarkController));

// Get bookmark count for a post
router.get('/:postId/count', bookmarkController.getBookmarkCount.bind(bookmarkController));

export default router;

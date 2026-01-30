/**
 * Mention Routes
 * API routes for mention-related operations
 */

import { Router } from 'express';
import { mentionController } from '../controllers/mentionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * Get mentions for the authenticated user
 * Query params:
 *  - limit: number (default: 50)
 *  - offset: number (default: 0)
 *  - unread: boolean (default: false)
 */
router.get('/', authMiddleware, (req, res) => mentionController.getMentions(req, res));

/**
 * Get unread mention count for the authenticated user
 */
router.get('/unread-count', authMiddleware, (req, res) => mentionController.getUnreadCount(req, res));

/**
 * Mark a specific mention as read
 */
router.post('/:mentionId/read', authMiddleware, (req, res) => mentionController.markAsRead(req, res));

/**
 * Mark all mentions as read for the authenticated user
 */
router.post('/mark-all-read', authMiddleware, (req, res) => mentionController.markAllAsRead(req, res));

export default router;

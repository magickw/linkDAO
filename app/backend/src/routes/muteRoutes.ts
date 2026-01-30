/**
 * Mute Routes
 * API routes for user muting operations
 */

import { Router } from 'express';
import { muteController } from '../controllers/muteController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * Mute a user
 * POST /api/mute
 * Body: { mutedUserId: string, reason?: string }
 */
router.post('/mute', authMiddleware, (req, res) => muteController.muteUser(req, res));

/**
 * Unmute a user
 * POST /api/unmute
 * Body: { mutedUserId: string }
 */
router.post('/unmute', authMiddleware, (req, res) => muteController.unmuteUser(req, res));

/**
 * Get all muted users for the authenticated user
 * GET /api/muted-users
 */
router.get('/muted-users', authMiddleware, (req, res) => muteController.getMutedUsers(req, res));

/**
 * Check if a specific user is muted
 * GET /api/mute/status/:userId
 */
router.get('/mute/status/:userId', authMiddleware, (req, res) => muteController.checkMuteStatus(req, res));

export default router;

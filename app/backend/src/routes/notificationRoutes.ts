/**
 * Notification Routes
 * API routes for push notifications
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { NotificationController } from '../controllers/notificationController';

const router = Router();
const controller = new NotificationController();

/**
 * POST /api/notifications/register
 * Register device token for push notifications
 */
router.post(
    '/register',
    authMiddleware,
    [
        body('token').isString().notEmpty(),
        body('platform').isIn(['ios', 'android']),
        body('deviceInfo').optional().isObject(),
    ],
    controller.registerToken
);

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get(
    '/preferences',
    authMiddleware,
    controller.getPreferences
);

/**
 * POST /api/notifications/preferences
 * Update user's notification preferences
 */
router.post(
    '/preferences',
    authMiddleware,
    [
        body('comments').optional().isBoolean(),
        body('reactions').optional().isBoolean(),
        body('tips').optional().isBoolean(),
        body('mentions').optional().isBoolean(),
        body('communityUpdates').optional().isBoolean(),
        body('moderation').optional().isBoolean(),
    ],
    controller.updatePreferences
);

/**
 * POST /api/notifications/send
 * Send push notification (internal use)
 */
router.post(
    '/send',
    authMiddleware,
    [
        body('userId').isString().notEmpty(),
        body('title').isString().notEmpty(),
        body('body').isString().notEmpty(),
        body('data').optional().isObject(),
    ],
    controller.sendNotification
);

export default router;

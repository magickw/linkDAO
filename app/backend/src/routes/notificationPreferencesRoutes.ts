import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import {
  getPreferences,
  updatePreferences,
  registerPushToken,
  unregisterPushToken,
  testNotification,
} from '../controllers/notificationPreferencesController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/notification-preferences
 * @desc    Get notification preferences for the authenticated user
 * @access  Private
 */
router.get('/', getPreferences);

/**
 * @route   PUT /api/notification-preferences
 * @desc    Update notification preferences for the authenticated user
 * @access  Private
 */
router.put('/', csrfProtection,  updatePreferences);

/**
 * @route   POST /api/notification-preferences/push-token
 * @desc    Register a push notification token
 * @access  Private
 */
router.post('/push-token', csrfProtection,  registerPushToken);

/**
 * @route   DELETE /api/notification-preferences/push-token
 * @desc    Unregister a push notification token
 * @access  Private
 */
router.delete('/push-token', csrfProtection,  unregisterPushToken);

/**
 * @route   POST /api/notification-preferences/test
 * @desc    Send a test notification (for debugging)
 * @access  Private
 */
router.post('/test', csrfProtection,  testNotification);

export default router;

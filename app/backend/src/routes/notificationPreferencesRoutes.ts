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
import { pushNotificationService } from '../services/pushNotificationService';
import rateLimit from 'express-rate-limit';

// Rate limiting for notification preferences endpoints
const notificationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'NOTIFICATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many notification requests, please try again later',
    }
  }
});

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);
router.use(notificationRateLimit);

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
 * @route   GET /api/notification-preferences/vapid-public-key
 * @desc    Get the VAPID public key for Web Push subscription
 * @access  Private
 */
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = pushNotificationService.getVapidPublicKey();
    const isEnabled = pushNotificationService.isWebPushEnabled();

    if (!publicKey) {
      return res.status(503).json({
        success: false,
        error: 'Web Push notifications are not configured on this server',
        isEnabled: false
      });
    }

    res.json({
      success: true,
      publicKey,
      isEnabled
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve VAPID public key'
    });
  }
});

/**
 * @route   POST /api/notification-preferences/test
 * @desc    Send a test notification (for debugging)
 * @access  Private
 */
router.post('/test', csrfProtection,  testNotification);

export default router;

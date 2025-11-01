import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import {
  registerMobilePushToken,
  unregisterMobilePushToken,
  updateMobileNotificationPreferences,
  getMobileNotificationPreferences,
  syncOfflineActions,
  getOfflineContent,
  uploadImage,
  prepareOfflineContent,
  getOfflineStats,
} from '../controllers/mobileController';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrfProtection';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/mobile/push/register
 * @desc    Register a mobile push notification token
 * @access  Private
 */
router.post('/push/register', csrfProtection,  registerMobilePushToken);

/**
 * @route   DELETE /api/mobile/push/unregister
 * @desc    Unregister a mobile push notification token
 * @access  Private
 */
router.delete('/push/unregister', csrfProtection,  unregisterMobilePushToken);

/**
 * @route   POST /api/mobile/push/preferences
 * @desc    Update mobile notification preferences
 * @access  Private
 */
router.post('/push/preferences', csrfProtection,  updateMobileNotificationPreferences);

/**
 * @route   GET /api/mobile/push/preferences
 * @desc    Get mobile notification preferences
 * @access  Private
 */
router.get('/push/preferences', getMobileNotificationPreferences);

/**
 * @route   POST /api/mobile/offline/sync
 * @desc    Sync offline actions
 * @access  Private
 */
router.post('/offline/sync', csrfProtection,  syncOfflineActions);

/**
 * @route   GET /api/mobile/offline/content
 * @desc    Get cached content for offline browsing
 * @access  Private
 */
router.get('/offline/content', getOfflineContent);

/**
 * @route   POST /api/mobile/offline/prepare
 * @desc    Prepare offline content for caching
 * @access  Private
 */
router.post('/offline/prepare', csrfProtection,  prepareOfflineContent);

/**
 * @route   GET /api/mobile/offline/stats
 * @desc    Get offline browsing statistics
 * @access  Private
 */
router.get('/offline/stats', getOfflineStats);

/**
 * @route   POST /api/mobile/upload/image
 * @desc    Upload image from mobile device
 * @access  Private
 */
router.post('/upload/image', csrfProtection,  uploadImage);

export default router;
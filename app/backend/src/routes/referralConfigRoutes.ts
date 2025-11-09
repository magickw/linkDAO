import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { referralConfigController } from '../controllers/referralConfigController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

// Apply authentication middleware (requires admin access)
router.use(adminAuthMiddleware);

/**
 * @route GET /api/referrals/config
 * @desc Get all referral configuration
 * @access Admin
 */
router.get('/', referralConfigController.getAllConfig.bind(referralConfigController));

/**
 * @route GET /api/referrals/config/settings
 * @desc Get referral program settings
 * @access Admin
 */
router.get('/settings', referralConfigController.getProgramSettings.bind(referralConfigController));

/**
 * @route GET /api/referrals/config/status
 * @desc Get referral program status
 * @access Admin
 */
router.get('/status', referralConfigController.getProgramStatus.bind(referralConfigController));

/**
 * @route PUT /api/referrals/config/:key
 * @desc Update a referral configuration value
 * @access Admin
 */
router.put('/:key', csrfProtection, referralConfigController.updateConfig.bind(referralConfigController));

export default router;
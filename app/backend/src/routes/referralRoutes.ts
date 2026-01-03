import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { referralController } from '../controllers/referralController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public routes
/**
 * @route GET /api/referrals/leaderboard
 * @desc Get referral leaderboard
 * @access Public
 */
router.get('/leaderboard', referralController.getReferralLeaderboard.bind(referralController));

// Apply authentication middleware to all protected routes
router.use(authMiddleware);

/**
 * @route POST /api/referrals
 * @desc Create a new referral relationship
 * @access Private
 */
router.post('/', csrfProtection, referralController.createReferral.bind(referralController));

/**
 * @route POST /api/referrals/validate
 * @desc Validate a referral code
 * @access Private
 */
router.post('/validate', csrfProtection, referralController.validateReferralCode.bind(referralController));

/**
 * @route GET /api/referrals/stats
 * @desc Get user's referral statistics
 * @access Private
 */
router.get('/stats', referralController.getReferralStats.bind(referralController));

/**
 * @route GET /api/referrals/history
 * @desc Get user's referral history
 * @access Private
 */
router.get('/history', referralController.getReferralHistory.bind(referralController));

/**
 * @route GET /api/referrals/:referralId/rewards
 * @desc Get referral rewards history
 * @access Private
 */
router.get('/:referralId/rewards', referralController.getReferralRewards.bind(referralController));

/**
 * @route POST /api/referrals/:referralId/deactivate
 * @desc Deactivate a referral
 * @access Private
 */
router.post('/:referralId/deactivate', csrfProtection, referralController.deactivateReferral.bind(referralController));

/**
 * @route GET /api/referrals/generate-code
 * @desc Generate a new referral code
 * @access Private
 */
router.get('/generate-code', referralController.generateReferralCode.bind(referralController));

/**
 * @route GET /api/referrals/analytics
 * @desc Get referral analytics
 * @access Private
 */
router.get('/analytics', referralController.getReferralAnalytics.bind(referralController));

/**
 * @route POST /api/referrals/claim-rewards
 * @desc Claim referral rewards
 * @access Private
 */
router.post('/claim-rewards', csrfProtection, referralController.claimRewards.bind(referralController));

export default router;

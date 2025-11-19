import { Router } from 'express';
import { onboardingController } from '../controllers/onboardingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * @route GET /api/onboarding/preferences
 * @desc Get user's onboarding preferences
 * @access Private
 */
router.get('/preferences', authMiddleware, (req, res) => {
    onboardingController.getUserPreferences(req, res);
});

/**
 * @route POST /api/onboarding/preferences
 * @desc Save user's onboarding preferences
 * @access Private
 */
router.post('/preferences', authMiddleware, (req, res) => {
    onboardingController.saveUserPreferences(req, res);
});

/**
 * @route POST /api/onboarding/skip
 * @desc Skip onboarding for the user
 * @access Private
 */
router.post('/skip', authMiddleware, (req, res) => {
    onboardingController.skipOnboarding(req, res);
});

/**
 * @route GET /api/onboarding/status
 * @desc Check if user needs onboarding
 * @access Private
 */
router.get('/status', authMiddleware, (req, res) => {
    onboardingController.needsOnboarding(req, res);
});

/**
 * @route GET /api/onboarding/categories
 * @desc Get available categories for selection
 * @access Public
 */
router.get('/categories', (req, res) => {
    onboardingController.getAvailableCategories(req, res);
});

/**
 * @route GET /api/onboarding/tags
 * @desc Get available tags for selection
 * @access Public
 */
router.get('/tags', (req, res) => {
    onboardingController.getAvailableTags(req, res);
});

export default router;

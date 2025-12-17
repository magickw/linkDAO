import { Router } from 'express';
import { onboardingController } from '../controllers/onboardingController';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

/**
 * @route GET /api/onboarding/preferences
 * @desc Get user's onboarding preferences
 * @access Private
 */
router.get('/preferences', authMiddleware, (req, res) => {
    onboardingController.getUserPreferences(req as AuthenticatedRequest, res);
});

/**
 * @route POST /api/onboarding/preferences
 * @desc Save user's onboarding preferences
 * @access Private
 */
router.post('/preferences', authMiddleware, (req, res) => {
    onboardingController.saveUserPreferences(req as AuthenticatedRequest, res);
});

/**
 * @route POST /api/onboarding/skip
 * @desc Skip onboarding for the user
 * @access Private
 */
router.post('/skip', authMiddleware, (req, res) => {
    onboardingController.skipOnboarding(req as AuthenticatedRequest, res);
});

/**
 * @route GET /api/onboarding/status
 * @desc Check if user needs onboarding
 * @access Private
 */
router.get('/status', authMiddleware, (req, res) => {
    onboardingController.needsOnboarding(req as AuthenticatedRequest, res);
});

/**
 * @route GET /api/onboarding/categories
 * @desc Get available categories for selection
 * @access Public
 */
router.get('/categories', (req, res) => {
    onboardingController.getAvailableCategories(req as AuthenticatedRequest, res);
});

/**
 * @route GET /api/onboarding/tags
 * @desc Get available tags for selection
 * @access Public
 */
router.get('/tags', (req, res) => {
    onboardingController.getAvailableTags(req as AuthenticatedRequest, res);
});

export default router;

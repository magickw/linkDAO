import { Router } from 'express';
import { BuyerProfileService } from '../services/buyerProfileService';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/user/buyer-profile
 * Get the buyer profile for the current user
 */
router.get('/', asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const profile = await BuyerProfileService.getOrCreateBuyerProfile(userId);

    res.json({
        success: true,
        data: profile
    });
}));

/**
 * GET /api/user/buyer-profile/stats
 * Get buyer statistics summary
 */
router.get('/stats', asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const stats = await BuyerProfileService.getBuyerStats(userId);

    if (!stats) {
        return res.status(404).json({
            success: false,
            error: 'Buyer profile not found'
        });
    }

    res.json({
        success: true,
        data: stats
    });
}));

/**
 * PUT /api/user/buyer-profile/preferences
 * Update buyer preferences
 */
router.put('/preferences', asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const profile = await BuyerProfileService.updatePreferences(userId, req.body);

    if (!profile) {
        return res.status(404).json({
            success: false,
            error: 'Buyer profile not found'
        });
    }

    res.json({
        success: true,
        data: profile,
        message: 'Preferences updated successfully'
    });
}));

/**
 * POST /api/user/buyer-profile/preferred-payment-method
 * Set preferred payment method
 */
router.post('/preferred-payment-method', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { paymentMethodId } = req.body;

    const profile = await BuyerProfileService.setPreferredPaymentMethod(userId, paymentMethodId);

    if (!profile) {
        return res.status(404).json({
            success: false,
            error: 'Buyer profile not found'
        });
    }

    res.json({
        success: true,
        data: profile,
        message: 'Preferred payment method updated'
    });
}));

/**
 * POST /api/user/buyer-profile/preferred-shipping-address
 * Set preferred shipping address
 */
router.post('/preferred-shipping-address', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { addressId } = req.body;

    const profile = await BuyerProfileService.setPreferredShippingAddress(userId, addressId);

    if (!profile) {
        return res.status(404).json({
            success: false,
            error: 'Buyer profile not found'
        });
    }

    res.json({
        success: true,
        data: profile,
        message: 'Preferred shipping address updated'
    });
}));

/**
 * POST /api/user/buyer-profile/preferred-billing-address
 * Set preferred billing address
 */
router.post('/preferred-billing-address', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { addressId } = req.body;

    const profile = await BuyerProfileService.setPreferredBillingAddress(userId, addressId);

    if (!profile) {
        return res.status(404).json({
            success: false,
            error: 'Buyer profile not found'
        });
    }

    res.json({
        success: true,
        data: profile,
        message: 'Preferred billing address updated'
    });
}));

/**
 * PUT /api/user/buyer-profile/visibility
 * Update profile visibility
 */
router.put('/visibility', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { visibility } = req.body;

    if (!['public', 'private', 'friends'].includes(visibility)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid visibility value. Must be: public, private, or friends'
        });
    }

    const profile = await BuyerProfileService.updateProfileVisibility(userId, visibility);

    if (!profile) {
        return res.status(404).json({
            success: false,
            error: 'Buyer profile not found'
        });
    }

    res.json({
        success: true,
        data: profile,
        message: 'Profile visibility updated'
    });
}));

export default router;

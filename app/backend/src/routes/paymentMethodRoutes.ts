import { Router } from 'express';
import { PaymentMethodService } from '../services/paymentMethodService';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/user/payment-methods
 * Get all payment methods for the current user
 * Query params: activeOnly (optional) - boolean, default true
 */
router.get('/', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const activeOnly = req.query.activeOnly !== 'false';

    const paymentMethods = await PaymentMethodService.getUserPaymentMethods(userId, activeOnly);

    res.json({
        success: true,
        data: paymentMethods
    });
}));

/**
 * GET /api/user/payment-methods/:id
 * Get a specific payment method by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const methodId = req.params.id;

    const paymentMethod = await PaymentMethodService.getPaymentMethodById(methodId, userId);

    if (!paymentMethod) {
        return res.status(404).json({
            success: false,
            error: 'Payment method not found'
        });
    }

    res.json({
        success: true,
        data: paymentMethod
    });
}));

/**
 * POST /api/user/payment-methods
 * Create a new payment method
 */
router.post('/', asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const paymentMethod = await PaymentMethodService.createPaymentMethod({
        userId,
        ...req.body
    });

    res.status(201).json({
        success: true,
        data: paymentMethod,
        message: 'Payment method added successfully'
    });
}));

/**
 * PUT /api/user/payment-methods/:id
 * Update an existing payment method
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const methodId = req.params.id;

    const paymentMethod = await PaymentMethodService.updatePaymentMethod(methodId, userId, req.body);

    if (!paymentMethod) {
        return res.status(404).json({
            success: false,
            error: 'Payment method not found'
        });
    }

    res.json({
        success: true,
        data: paymentMethod,
        message: 'Payment method updated successfully'
    });
}));

/**
 * DELETE /api/user/payment-methods/:id
 * Delete a payment method (soft delete)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const methodId = req.params.id;

    const success = await PaymentMethodService.deletePaymentMethod(methodId, userId);

    if (!success) {
        return res.status(404).json({
            success: false,
            error: 'Payment method not found'
        });
    }

    res.json({
        success: true,
        message: 'Payment method removed successfully'
    });
}));

/**
 * POST /api/user/payment-methods/:id/set-default
 * Set a payment method as default
 */
router.post('/:id/set-default', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const methodId = req.params.id;

    const paymentMethod = await PaymentMethodService.setDefaultPaymentMethod(methodId, userId);

    if (!paymentMethod) {
        return res.status(404).json({
            success: false,
            error: 'Payment method not found'
        });
    }

    res.json({
        success: true,
        data: paymentMethod,
        message: 'Default payment method updated successfully'
    });
}));

export default router;

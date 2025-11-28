import express from 'express';
import { checkoutController } from '../controllers/checkoutController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authenticationSecurityMiddleware';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { safeLogger } from '../utils/safeLogger';

const router = express.Router();

/**
 * Create checkout session
 * POST /api/checkout/session
 * Optional authentication - allows guest checkout
 */
router.post('/session',
    optionalAuthMiddleware,
    async (req, res) => {
        try {
            await checkoutController.createSession(req as AuthenticatedRequest, res);
        } catch (error) {
            safeLogger.error('Error in checkout session route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * Get session details
 * GET /api/checkout/session/:sessionId
 */
router.get('/session/:sessionId',
    async (req, res) => {
        try {
            await checkoutController.getSession(req as AuthenticatedRequest, res);
        } catch (error) {
            safeLogger.error('Error in get session route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * Process checkout
 * POST /api/checkout/process
 * Requires authentication
 */
router.post('/process',
    authMiddleware,
    async (req, res) => {
        try {
            await checkoutController.processCheckout(req as AuthenticatedRequest, res);
        } catch (error) {
            safeLogger.error('Error in process checkout route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * Validate checkout data
 * POST /api/checkout/validate
 */
router.post('/validate',
    async (req, res) => {
        try {
            await checkoutController.validateCheckout(req as AuthenticatedRequest, res);
        } catch (error) {
            safeLogger.error('Error in validate checkout route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * Apply discount code
 * POST /api/checkout/discount
 */
router.post('/discount',
    async (req, res) => {
        try {
            await checkoutController.applyDiscount(req as AuthenticatedRequest, res);
        } catch (error) {
            safeLogger.error('Error in apply discount route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;

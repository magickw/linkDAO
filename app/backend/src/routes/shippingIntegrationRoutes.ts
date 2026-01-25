import express from 'express';
import { shippingIntegrationController } from '../controllers/shippingIntegrationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * POST /api/shipping/rates
 * Get shipping rates for an order
 */
router.post('/rates', authMiddleware, shippingIntegrationController.getRates.bind(shippingIntegrationController));

/**
 * POST /api/shipping/labels
 * Purchase a shipping label
 */
router.post('/labels', authMiddleware, shippingIntegrationController.purchaseLabel.bind(shippingIntegrationController));

/**
 * GET /api/shipping/labels/:orderId
 * Get shipping label for an order
 */
router.get('/labels/:orderId', authMiddleware, shippingIntegrationController.getLabel.bind(shippingIntegrationController));

/**
 * GET /api/shipping/track/:trackingNumber
 * Get tracking information
 */
router.get('/track/:trackingNumber', shippingIntegrationController.getTracking.bind(shippingIntegrationController));

/**
 * POST /api/shipping/webhooks/easypost
 * Handle EasyPost webhooks (no auth - verified by signature)
 */
router.post('/webhooks/easypost', shippingIntegrationController.handleWebhook.bind(shippingIntegrationController));

/**
 * POST /api/shipping/validate-address
 * Validate an address
 */
router.post('/validate-address', authMiddleware, shippingIntegrationController.validateAddress.bind(shippingIntegrationController));

export default router;

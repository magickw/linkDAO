/**
 * Updated Checkout Routes with Rate Limiting and Enhanced Security
 */

import { Router } from 'express';
import { CheckoutController } from '../controllers/checkoutController';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { checkoutRateLimits } from '../middleware/checkoutRateLimiter';

const router = Router();
const checkoutController = new CheckoutController();

/**
 * Create checkout session
 * POST /api/checkout/session
 * Rate limited: 10 requests per 15 minutes
 */
router.post(
  '/session',
  authMiddleware,
  csrfProtection,
  checkoutRateLimits.createSession,
  checkoutController.createSession.bind(checkoutController)
);

/**
 * Get checkout session
 * GET /api/checkout/session/:sessionId
 * Rate limited: 20 requests per 15 minutes
 */
router.get(
  '/session/:sessionId',
  authMiddleware,
  checkoutRateLimits.standard,
  checkoutController.getSession.bind(checkoutController)
);

/**
 * Update checkout session
 * PUT /api/checkout/session/:sessionId
 * Rate limited: 20 requests per 15 minutes
 */
router.put(
  '/session/:sessionId',
  authMiddleware,
  csrfProtection,
  checkoutRateLimits.standard,
  checkoutController.updateSession.bind(checkoutController)
);

/**
 * Process checkout and create order
 * POST /api/checkout/process
 * Rate limited: 5 requests per 15 minutes (critical operation)
 * Only successful payments are counted against limit
 */
router.post(
  '/process',
  authMiddleware,
  csrfProtection,
  checkoutRateLimits.processPayment,
  checkoutController.processCheckout.bind(checkoutController)
);

/**
 * Validate address
 * POST /api/checkout/validate-address
 * Rate limited: 40 requests per 15 minutes
 */
router.post(
  '/validate-address',
  authMiddleware,
  checkoutRateLimits.validateAddress,
  checkoutController.validateAddress.bind(checkoutController)
);

/**
 * Apply discount code
 * POST /api/checkout/discount
 * Rate limited: 30 requests per 15 minutes
 */
router.post(
  '/discount',
  authMiddleware,
  csrfProtection,
  checkoutRateLimits.validateDiscount,
  checkoutController.applyDiscountCode.bind(checkoutController)
);

/**
 * Calculate tax
 * POST /api/checkout/calculate-tax
 * Rate limited: 50 requests per 15 minutes
 */
router.post(
  '/calculate-tax',
  authMiddleware,
  checkoutRateLimits.calculateTax,
  checkoutController.calculateTax.bind(checkoutController)
);

/**
 * Validate tax exemption certificate (B2B)
 * POST /api/checkout/validate-tax-exemption
 * Rate limited: 20 requests per 15 minutes
 */
router.post(
  '/validate-tax-exemption',
  authMiddleware,
  csrfProtection,
  checkoutRateLimits.standard,
  checkoutController.validateTaxExemption.bind(checkoutController)
);

/**
 * Cancel checkout session
 * DELETE /api/checkout/session/:sessionId
 * Rate limited: 20 requests per 15 minutes
 */
router.delete(
  '/session/:sessionId',
  authMiddleware,
  csrfProtection,
  checkoutRateLimits.standard,
  checkoutController.cancelSession.bind(checkoutController)
);

export default router;

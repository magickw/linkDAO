import express from 'express';
import { checkoutController } from '../controllers/checkoutController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authenticationSecurityMiddleware';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { safeLogger } from '../utils/safeLogger';
import { taxCalculationService } from '../services/taxCalculationService';
import { StripePaymentService } from '../services/stripePaymentService';

const router = express.Router();

// Initialize Stripe service for payment intent creation
const stripePaymentService = new StripePaymentService({
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  apiVersion: '2023-10-16',
});

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

/**
 * Calculate tax for checkout
 * POST /api/checkout/calculate-tax
 */
router.post('/calculate-tax',
    async (req, res) => {
        try {
            const { items, shippingAddress, shippingCost, currency, taxExemption } = req.body;

            // Validate required fields
            if (!items || !Array.isArray(items) || items.length === 0) {
                res.status(400).json({ error: 'Items are required' });
                return;
            }

            if (!shippingAddress || !shippingAddress.country) {
                res.status(400).json({ error: 'Shipping address with country is required' });
                return;
            }

            // Convert items to TaxableItem format
            const taxableItems = items.map((item: any) => ({
                id: item.id,
                name: item.name || item.title || 'Product',
                price: parseFloat(item.price || item.priceAmount || 0),
                quantity: item.quantity || 1,
                isDigital: item.isDigital || false,
                isTaxExempt: item.isTaxExempt || false,
                category: item.category
            }));

            // Calculate tax
            const taxResult = await taxCalculationService.calculateTax(
                taxableItems,
                shippingAddress,
                shippingCost || 0,
                currency || 'USD',
                taxExemption
            );

            res.status(200).json({
                success: true,
                data: taxResult
            });
        } catch (error) {
            safeLogger.error('Error calculating tax:', error);
            res.status(500).json({ error: 'Failed to calculate tax' });
        }
    }
);

/**
 * Get supported tax jurisdictions
 * GET /api/checkout/tax-jurisdictions
 */
router.get('/tax-jurisdictions',
    async (req, res) => {
        try {
            const jurisdictions = taxCalculationService.getSupportedJurisdictions();
            res.status(200).json({
                success: true,
                data: jurisdictions
            });
        } catch (error) {
            safeLogger.error('Error getting tax jurisdictions:', error);
            res.status(500).json({ error: 'Failed to get tax jurisdictions' });
        }
    }
);

/**
 * Validate tax exemption certificate
 * POST /api/checkout/validate-tax-exemption
 */
router.post('/validate-tax-exemption',
    async (req, res) => {
        try {
            await checkoutController.validateTaxExemption(req as AuthenticatedRequest, res);
        } catch (error) {
            safeLogger.error('Error validating tax exemption:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * Create Payment Intent for Mobile Payment Sheet
 * POST /api/checkout/payment-intent
 * Required for React Native Stripe Payment Sheet integration
 * Returns the parameters needed to initialize the native payment UI
 */
router.post('/payment-intent',
    authMiddleware,
    async (req, res) => {
        try {
            const { amount, currency = 'usd' } = req.body;
            const user = (req as AuthenticatedRequest).user;

            safeLogger.info('[Mobile Payment Sheet] Creating payment intent:', {
                userId: user?.address,
                amount,
                currency,
            });

            // Validate amount (Stripe minimum is $0.50 USD = 50 cents)
            if (!amount || amount < 50) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be at least $0.50 USD (50 cents)'
                });
            }

            // Validate user email
            if (!user?.email) {
                return res.status(400).json({
                    success: false,
                    error: 'User email is required'
                });
            }

            // Get or create Stripe customer
            const customerName = user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`.trim()
                : user.displayName || user.username || 'LinkDAO User';

            const customerId = await stripePaymentService.getOrCreateCustomer(
                user.email,
                customerName
            );

            // Create ephemeral key for customer (required for Payment Sheet)
            const ephemeralKey = await stripePaymentService.createEphemeralKey(customerId);

            // Create PaymentIntent
            const paymentIntentResult = await stripePaymentService.processPayment({
                amount: amount, // Amount is already in cents from mobile
                userAddress: user.address,
                paymentMethod: 'card',
                ldaoAmount: amount.toString(), // Metadata for tracking
            });

            if (!paymentIntentResult.success || !paymentIntentResult.clientSecret) {
                return res.status(500).json({
                    success: false,
                    error: paymentIntentResult.error || 'Failed to create payment intent'
                });
            }

            safeLogger.info('[Mobile Payment Sheet] Payment intent created successfully:', {
                paymentIntentId: paymentIntentResult.transactionId,
                customerId,
            });

            res.status(200).json({
                success: true,
                data: {
                    clientSecret: paymentIntentResult.clientSecret,
                    ephemeralKey: ephemeralKey.secret,
                    customer: customerId,
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
                }
            });
        } catch (error) {
            safeLogger.error('[Mobile Payment Sheet] Error creating payment intent:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create payment intent'
            });
        }
    }
);

export default router;

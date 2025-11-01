import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { body, query, param } from 'express-validator';
import { csrfProtection } from '../middleware/csrfProtection';
import { HybridPaymentController } from '../controllers/hybridPaymentController';
import { csrfProtection } from '../middleware/csrfProtection';
import { validateRequest } from '../middleware/validateRequest';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimiter } from '../middleware/rateLimiter';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();
const hybridPaymentController = new HybridPaymentController();

// Apply rate limiting to all hybrid payment routes
router.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many hybrid payment requests, please try again later'
}));

/**
 * @route POST /api/hybrid-payment/recommend-path
 * @desc Get optimal payment path recommendation
 * @access Public
 */
router.post('/recommend-path', csrfProtection, 
  [
    body('orderId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Order ID is required'),
    body('listingId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Listing ID is required'),
    body('buyerAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Buyer address must be a valid Ethereum address'),
    body('sellerAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Seller address must be a valid Ethereum address'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0.01'),
    body('currency')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('Currency must be a valid currency code'),
    body('preferredMethod')
      .optional()
      .isIn(['crypto', 'fiat', 'auto'])
      .withMessage('Preferred method must be crypto, fiat, or auto'),
    body('userCountry')
      .optional()
      .isString()
      .isLength({ min: 2, max: 3 })
      .withMessage('User country must be a valid country code')
  ],
  validateRequest,
  hybridPaymentController.getPaymentPathRecommendation.bind(hybridPaymentController)
);

/**
 * @route POST /api/hybrid-payment/checkout
 * @desc Process hybrid checkout with automatic path selection
 * @access Public
 */
router.post('/checkout', csrfProtection, 
  [
    body('orderId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Order ID is required'),
    body('listingId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Listing ID is required'),
    body('buyerAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Buyer address must be a valid Ethereum address'),
    body('sellerAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Seller address must be a valid Ethereum address'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0.01'),
    body('currency')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('Currency must be a valid currency code'),
    body('preferredMethod')
      .optional()
      .isIn(['crypto', 'fiat', 'auto'])
      .withMessage('Preferred method must be crypto, fiat, or auto'),
    body('userCountry')
      .optional()
      .isString()
      .isLength({ min: 2, max: 3 })
      .withMessage('User country must be a valid country code'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],
  validateRequest,
  hybridPaymentController.processHybridCheckout.bind(hybridPaymentController)
);

/**
 * @route POST /api/hybrid-payment/orders/:orderId/fulfill
 * @desc Handle order fulfillment actions (delivery confirmation, fund release, disputes)
 * @access Public
 */
router.post('/orders/:orderId/fulfill', csrfProtection, 
  [
    param('orderId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Order ID is required'),
    body('action')
      .isIn(['confirm_delivery', 'release_funds', 'dispute'])
      .withMessage('Action must be confirm_delivery, release_funds, or dispute'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],
  validateRequest,
  hybridPaymentController.handleOrderFulfillment.bind(hybridPaymentController)
);

/**
 * @route GET /api/hybrid-payment/orders/:orderId/status
 * @desc Get unified order status across both payment paths
 * @access Public
 */
router.get('/orders/:orderId/status',
  [
    param('orderId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Order ID is required')
  ],
  validateRequest,
  hybridPaymentController.getUnifiedOrderStatus.bind(hybridPaymentController)
);

/**
 * @route GET /api/hybrid-payment/comparison
 * @desc Get payment method comparison (crypto vs fiat)
 * @access Public
 */
router.get('/comparison',
  [
    query('buyerAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Buyer address must be a valid Ethereum address'),
    query('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0.01'),
    query('currency')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('Currency must be a valid currency code'),
    query('userCountry')
      .optional()
      .isString()
      .isLength({ min: 2, max: 3 })
      .withMessage('User country must be a valid country code')
  ],
  validateRequest,
  hybridPaymentController.getPaymentMethodComparison.bind(hybridPaymentController)
);

/**
 * @route GET /api/hybrid-payment/orders/:orderId/history
 * @desc Get order payment history
 * @access Public
 */
router.get('/orders/:orderId/history',
  [
    param('orderId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Order ID is required')
  ],
  validateRequest,
  hybridPaymentController.getOrderPaymentHistory.bind(hybridPaymentController)
);

/**
 * @route POST /api/hybrid-payment/orders/:orderId/switch-method
 * @desc Switch payment method for pending order
 * @access Public
 */
router.post('/orders/:orderId/switch-method', csrfProtection, 
  [
    param('orderId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Order ID is required'),
    body('newMethod')
      .isIn(['crypto', 'fiat'])
      .withMessage('New method must be crypto or fiat'),
    body('reason')
      .optional()
      .isString()
      .isLength({ min: 5, max: 500 })
      .withMessage('Reason must be between 5 and 500 characters')
  ],
  validateRequest,
  hybridPaymentController.switchPaymentMethod.bind(hybridPaymentController)
);

/**
 * @route GET /api/hybrid-payment/analytics
 * @desc Get hybrid payment analytics
 * @access Public
 */
router.get('/analytics',
  [
    query('timeframe')
      .optional()
      .isIn(['week', 'month', 'quarter', 'year'])
      .withMessage('Invalid timeframe'),
    query('userAddress')
      .optional()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address')
  ],
  validateRequest,
  hybridPaymentController.getHybridPaymentAnalytics.bind(hybridPaymentController)
);

/**
 * @route GET /api/hybrid-payment/health
 * @desc Health check for hybrid payment system
 * @access Public
 */
router.get('/health',
  hybridPaymentController.healthCheck.bind(hybridPaymentController)
);

export default router;
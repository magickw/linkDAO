import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { EnhancedFiatPaymentController } from '../controllers/enhancedFiatPaymentController';
import { validateRequest } from '../middleware/validateRequest';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();
const enhancedFiatPaymentController = new EnhancedFiatPaymentController();

// Apply rate limiting to all fiat payment routes
router.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many fiat payment requests, please try again later'
}));

/**
 * @route POST /api/enhanced-fiat-payment/process
 * @desc Process fiat payment
 * @access Public
 */
router.post('/process',
  [
    body('orderId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Order ID is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0.01'),
    body('currency')
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a valid 3-letter currency code'),
    body('paymentMethodId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Payment method ID is required'),
    body('provider')
      .isIn(['stripe', 'paypal', 'bank_transfer', 'apple_pay', 'google_pay'])
      .withMessage('Invalid payment provider'),
    body('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address'),
    body('convertToCrypto')
      .optional()
      .isObject()
      .withMessage('Convert to crypto must be an object'),
    body('convertToCrypto.targetToken')
      .optional()
      .isString()
      .withMessage('Target token must be a string'),
    body('convertToCrypto.targetChain')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Target chain must be a positive integer'),
    body('convertToCrypto.slippageTolerance')
      .optional()
      .isFloat({ min: 0.1, max: 10 })
      .withMessage('Slippage tolerance must be between 0.1 and 10'),
    body('convertToCrypto.recipientAddress')
      .optional()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Recipient address must be a valid Ethereum address')
  ],
  validateRequest,
  enhancedFiatPaymentController.processFiatPayment.bind(enhancedFiatPaymentController)
);

/**
 * @route GET /api/enhanced-fiat-payment/methods
 * @desc Get available payment methods for user
 * @access Public
 */
router.get('/methods',
  [
    query('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address'),
    query('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0.01'),
    query('currency')
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a valid 3-letter currency code'),
    query('country')
      .optional()
      .isString()
      .isLength({ min: 2, max: 3 })
      .withMessage('Country must be a valid country code')
  ],
  validateRequest,
  enhancedFiatPaymentController.getAvailablePaymentMethods.bind(enhancedFiatPaymentController)
);

/**
 * @route POST /api/enhanced-fiat-payment/setup-method
 * @desc Setup new payment method for user
 * @access Public
 */
router.post('/setup-method',
  [
    body('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address'),
    body('provider')
      .isIn(['stripe', 'paypal', 'bank_transfer'])
      .withMessage('Invalid payment provider'),
    body('methodType')
      .isIn(['card', 'bank_account', 'digital_wallet'])
      .withMessage('Invalid payment method type'),
    body('methodData')
      .isObject()
      .withMessage('Method data must be an object')
  ],
  validateRequest,
  enhancedFiatPaymentController.setupPaymentMethod.bind(enhancedFiatPaymentController)
);

/**
 * @route GET /api/enhanced-fiat-payment/selection-data
 * @desc Get payment method selection interface data
 * @access Public
 */
router.get('/selection-data',
  [
    query('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address'),
    query('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0.01'),
    query('currency')
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a valid 3-letter currency code'),
    query('country')
      .optional()
      .isString()
      .isLength({ min: 2, max: 3 })
      .withMessage('Country must be a valid country code')
  ],
  validateRequest,
  enhancedFiatPaymentController.getPaymentMethodSelectionData.bind(enhancedFiatPaymentController)
);

/**
 * @route POST /api/enhanced-fiat-payment/convert-crypto
 * @desc Process crypto conversion after fiat payment
 * @access Public
 */
router.post('/convert-crypto',
  [
    body('transactionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Transaction ID is required'),
    body('conversionDetails')
      .isObject()
      .withMessage('Conversion details must be an object'),
    body('conversionDetails.amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('conversionDetails.currency')
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a valid currency code'),
    body('conversionDetails.targetToken')
      .isString()
      .withMessage('Target token is required')
  ],
  validateRequest,
  enhancedFiatPaymentController.processCryptoConversion.bind(enhancedFiatPaymentController)
);

/**
 * @route GET /api/enhanced-fiat-payment/receipt/:transactionId
 * @desc Generate payment receipt
 * @access Public
 */
router.get('/receipt/:transactionId',
  [
    param('transactionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Transaction ID is required')
  ],
  validateRequest,
  enhancedFiatPaymentController.generateReceipt.bind(enhancedFiatPaymentController)
);

/**
 * @route POST /api/enhanced-fiat-payment/refund/:transactionId
 * @desc Refund fiat payment
 * @access Public
 */
router.post('/refund/:transactionId',
  [
    param('transactionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Transaction ID is required'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Refund amount must be a positive number'),
    body('reason')
      .optional()
      .isString()
      .isLength({ min: 5, max: 500 })
      .withMessage('Reason must be between 5 and 500 characters')
  ],
  validateRequest,
  enhancedFiatPaymentController.refundPayment.bind(enhancedFiatPaymentController)
);

/**
 * @route GET /api/enhanced-fiat-payment/transaction/:transactionId
 * @desc Get payment transaction details
 * @access Public
 */
router.get('/transaction/:transactionId',
  [
    param('transactionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Transaction ID is required')
  ],
  validateRequest,
  enhancedFiatPaymentController.getPaymentTransaction.bind(enhancedFiatPaymentController)
);

/**
 * @route GET /api/enhanced-fiat-payment/history/:userAddress
 * @desc Get payment history for user
 * @access Public
 */
router.get('/history/:userAddress',
  [
    param('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    query('status')
      .optional()
      .isIn(['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'disputed'])
      .withMessage('Invalid status filter'),
    query('provider')
      .optional()
      .isIn(['stripe', 'paypal', 'bank_transfer', 'apple_pay', 'google_pay'])
      .withMessage('Invalid provider filter')
  ],
  validateRequest,
  enhancedFiatPaymentController.getPaymentHistory.bind(enhancedFiatPaymentController)
);

/**
 * @route GET /api/enhanced-fiat-payment/statistics/:userAddress
 * @desc Get payment statistics
 * @access Public
 */
router.get('/statistics/:userAddress',
  [
    param('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address'),
    query('timeframe')
      .optional()
      .isIn(['week', 'month', 'quarter', 'year'])
      .withMessage('Invalid timeframe')
  ],
  validateRequest,
  enhancedFiatPaymentController.getPaymentStatistics.bind(enhancedFiatPaymentController)
);

/**
 * @route POST /api/enhanced-fiat-payment/validate-method
 * @desc Validate payment method
 * @access Public
 */
router.post('/validate-method',
  [
    body('paymentMethodId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Payment method ID is required'),
    body('provider')
      .isIn(['stripe', 'paypal', 'bank_transfer', 'apple_pay', 'google_pay'])
      .withMessage('Invalid payment provider'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('currency')
      .optional()
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a valid currency code')
  ],
  validateRequest,
  enhancedFiatPaymentController.validatePaymentMethod.bind(enhancedFiatPaymentController)
);

/**
 * @route GET /api/enhanced-fiat-payment/health
 * @desc Health check for fiat payment service
 * @access Public
 */
router.get('/health',
  enhancedFiatPaymentController.healthCheck.bind(enhancedFiatPaymentController)
);

export default router;
import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { body, query, param } from 'express-validator';
import { csrfProtection } from '../middleware/csrfProtection';
import { PaymentValidationController } from '../controllers/paymentValidationController';
import { csrfProtection } from '../middleware/csrfProtection';
import { validateRequest } from '../middleware/validateRequest';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimiter } from '../middleware/rateLimiter';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();
const paymentValidationController = new PaymentValidationController();

// Apply rate limiting to all payment validation routes
router.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many payment validation requests, please try again later'
}));

/**
 * @route POST /api/payment-validation/validate
 * @desc Validate a payment request
 * @access Public
 */
router.post('/validate', csrfProtection, 
  [
    body('paymentMethod')
      .isIn(['crypto', 'fiat', 'escrow'])
      .withMessage('Payment method must be crypto, fiat, or escrow'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0.01'),
    body('currency')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('Currency must be a valid currency code'),
    body('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address'),
    body('paymentDetails')
      .isObject()
      .withMessage('Payment details must be an object'),
    body('orderId')
      .optional()
      .isString()
      .withMessage('Order ID must be a string'),
    body('listingId')
      .optional()
      .isString()
      .withMessage('Listing ID must be a string')
  ],
  validateRequest,
  paymentValidationController.validatePayment.bind(paymentValidationController)
);

/**
 * @route POST /api/payment-validation/check-balance
 * @desc Check crypto balance for a user
 * @access Public
 */
router.post('/check-balance', csrfProtection, 
  [
    body('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address'),
    body('tokenAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Token address must be a valid Ethereum address'),
    body('amount')
      .isString()
      .withMessage('Amount must be a string'),
    body('chainId')
      .isInt({ min: 1 })
      .withMessage('Chain ID must be a positive integer')
  ],
  validateRequest,
  paymentValidationController.checkCryptoBalance.bind(paymentValidationController)
);

/**
 * @route POST /api/payment-validation/alternatives
 * @desc Get payment alternatives when primary method fails
 * @access Public
 */
router.post('/alternatives', csrfProtection, 
  [
    body('paymentRequest')
      .isObject()
      .withMessage('Payment request must be an object'),
    body('failureReason')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Failure reason is required')
  ],
  validateRequest,
  paymentValidationController.getPaymentAlternatives.bind(paymentValidationController)
);

/**
 * @route POST /api/payment-validation/estimate-fees
 * @desc Estimate payment fees for different methods
 * @access Public
 */
router.post('/estimate-fees', csrfProtection, 
  [
    body('paymentMethod')
      .isIn(['crypto', 'fiat', 'escrow'])
      .withMessage('Payment method must be crypto, fiat, or escrow'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0.01'),
    body('currency')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('Currency must be a valid currency code'),
    body('paymentDetails')
      .isObject()
      .withMessage('Payment details must be an object')
  ],
  validateRequest,
  paymentValidationController.estimatePaymentFees.bind(paymentValidationController)
);

/**
 * @route GET /api/payment-validation/availability
 * @desc Check availability of all payment methods for a user
 * @access Public
 */
router.get('/availability',
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
      .isLength({ min: 3, max: 10 })
      .withMessage('Currency must be a valid currency code'),
    query('country')
      .optional()
      .isString()
      .isLength({ min: 2, max: 3 })
      .withMessage('Country must be a valid country code')
  ],
  validateRequest,
  paymentValidationController.checkPaymentMethodAvailability.bind(paymentValidationController)
);

/**
 * @route GET /api/payment-validation/recommended
 * @desc Get recommended payment method for a transaction
 * @access Public
 */
router.get('/recommended',
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
      .isLength({ min: 3, max: 10 })
      .withMessage('Currency must be a valid currency code'),
    query('country')
      .optional()
      .isString()
      .isLength({ min: 2, max: 3 })
      .withMessage('Country must be a valid country code')
  ],
  validateRequest,
  paymentValidationController.getRecommendedPaymentMethod.bind(paymentValidationController)
);

/**
 * @route GET /api/payment-validation/method-available
 * @desc Check if specific payment method is available
 * @access Public
 */
router.get('/method-available',
  [
    query('method')
      .isIn(['crypto', 'fiat', 'escrow'])
      .withMessage('Method must be crypto, fiat, or escrow'),
    query('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address'),
    query('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0.01'),
    query('currency')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('Currency must be a valid currency code'),
    query('country')
      .optional()
      .isString()
      .isLength({ min: 2, max: 3 })
      .withMessage('Country must be a valid country code')
  ],
  validateRequest,
  paymentValidationController.isPaymentMethodAvailable.bind(paymentValidationController)
);

/**
 * @route GET /api/payment-validation/limits
 * @desc Get payment limits for a user
 * @access Public
 */
router.get('/limits',
  [
    query('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address'),
    query('method')
      .isIn(['crypto', 'fiat', 'escrow'])
      .withMessage('Method must be crypto, fiat, or escrow'),
    query('country')
      .optional()
      .isString()
      .isLength({ min: 2, max: 3 })
      .withMessage('Country must be a valid country code')
  ],
  validateRequest,
  paymentValidationController.getPaymentLimits.bind(paymentValidationController)
);

/**
 * @route GET /api/payment-validation/profile/:userAddress
 * @desc Get user's payment profile
 * @access Public
 */
router.get('/profile/:userAddress',
  [
    param('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address')
  ],
  validateRequest,
  paymentValidationController.getUserPaymentProfile.bind(paymentValidationController)
);

// Exchange Rate Routes

/**
 * @route GET /api/payment-validation/exchange-rate
 * @desc Get exchange rate between two currencies
 * @access Public
 */
router.get('/exchange-rate',
  [
    query('from')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('From currency must be a valid currency code'),
    query('to')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('To currency must be a valid currency code')
  ],
  validateRequest,
  paymentValidationController.getExchangeRate.bind(paymentValidationController)
);

/**
 * @route POST /api/payment-validation/exchange-rates
 * @desc Get multiple exchange rates
 * @access Public
 */
router.post('/exchange-rates', csrfProtection, 
  [
    body('pairs')
      .isArray({ min: 1 })
      .withMessage('Pairs must be a non-empty array'),
    body('pairs.*.from')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('From currency must be a valid currency code'),
    body('pairs.*.to')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('To currency must be a valid currency code')
  ],
  validateRequest,
  paymentValidationController.getMultipleExchangeRates.bind(paymentValidationController)
);

/**
 * @route POST /api/payment-validation/convert
 * @desc Convert currency amount
 * @access Public
 */
router.post('/convert', csrfProtection, 
  [
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0.01'),
    body('from')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('From currency must be a valid currency code'),
    body('to')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('To currency must be a valid currency code')
  ],
  validateRequest,
  paymentValidationController.convertCurrency.bind(paymentValidationController)
);

/**
 * @route GET /api/payment-validation/currencies
 * @desc Get supported currencies
 * @access Public
 */
router.get('/currencies',
  [
    query('type')
      .optional()
      .isIn(['fiat', 'crypto'])
      .withMessage('Type must be fiat or crypto')
  ],
  validateRequest,
  paymentValidationController.getSupportedCurrencies.bind(paymentValidationController)
);

/**
 * @route GET /api/payment-validation/currency/:currency
 * @desc Get currency information
 * @access Public
 */
router.get('/currency/:currency',
  [
    param('currency')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('Currency must be a valid currency code')
  ],
  validateRequest,
  paymentValidationController.getCurrencyInfo.bind(paymentValidationController)
);

/**
 * @route GET /api/payment-validation/trends
 * @desc Get rate trends and analysis
 * @access Public
 */
router.get('/trends',
  [
    query('from')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('From currency must be a valid currency code'),
    query('to')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('To currency must be a valid currency code')
  ],
  validateRequest,
  paymentValidationController.getRateTrends.bind(paymentValidationController)
);

/**
 * @route GET /api/payment-validation/historical
 * @desc Get historical exchange rates
 * @access Public
 */
router.get('/historical',
  [
    query('from')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('From currency must be a valid currency code'),
    query('to')
      .isString()
      .isLength({ min: 3, max: 10 })
      .withMessage('To currency must be a valid currency code'),
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ],
  validateRequest,
  paymentValidationController.getHistoricalRates.bind(paymentValidationController)
);

/**
 * @route GET /api/payment-validation/health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/health',
  paymentValidationController.healthCheck.bind(paymentValidationController)
);

export default router;
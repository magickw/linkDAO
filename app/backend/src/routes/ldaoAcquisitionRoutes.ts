import { Router } from 'express';
import { LDAOAcquisitionController } from '../controllers/ldaoAcquisitionController';
import { LDAOAcquisitionService } from '../services/ldaoAcquisitionService';
import { ldaoAcquisitionConfig } from '../config/ldaoAcquisitionConfig';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { body, query } from 'express-validator';

const router = Router();

// Initialize the service and controller
const acquisitionService = new LDAOAcquisitionService(ldaoAcquisitionConfig);
const acquisitionController = new LDAOAcquisitionController(acquisitionService);

// Validation middleware
const purchaseValidation = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      return true;
    }),
  body('paymentMethod')
    .isIn(['fiat', 'crypto'])
    .withMessage('Payment method must be either "fiat" or "crypto"'),
  body('userAddress')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User address is required'),
  body('paymentToken')
    .optional()
    .isString()
    .withMessage('Payment token must be a string'),
];

const earnValidation = [
  body('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('activityType')
    .isIn(['post', 'comment', 'referral', 'marketplace'])
    .withMessage('Activity type must be one of: post, comment, referral, marketplace'),
  body('activityId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Activity ID is required'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];

const swapValidation = [
  body('fromToken')
    .isString()
    .isLength({ min: 1 })
    .withMessage('From token is required'),
  body('toToken')
    .isString()
    .isLength({ min: 1 })
    .withMessage('To token is required'),
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      return true;
    }),
  body('userAddress')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User address is required'),
];

const bridgeValidation = [
  body('fromChain')
    .isString()
    .isLength({ min: 1 })
    .withMessage('From chain is required'),
  body('toChain')
    .isString()
    .isLength({ min: 1 })
    .withMessage('To chain is required'),
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      return true;
    }),
  body('userAddress')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User address is required'),
];

const historyValidation = [
  query('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  query('type')
    .optional()
    .isIn(['purchase', 'earning'])
    .withMessage('Type must be either "purchase" or "earning"'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];

const priceValidation = [
  query('amount')
    .optional()
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => {
      if (value && value <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      return true;
    }),
  query('paymentToken')
    .optional()
    .isString()
    .withMessage('Payment token must be a string'),
];

const stakingValidation = [
  query('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
];

// Routes

/**
 * @route POST /api/ldao/purchase
 * @desc Purchase LDAO tokens directly
 * @access Private
 */
router.post(
  '/purchase',
  authMiddleware,
  purchaseValidation,
  validateRequest,
  acquisitionController.purchaseTokens
);

/**
 * @route GET /api/ldao/price
 * @desc Get current LDAO price or quote for specific amount
 * @access Public
 */
router.get(
  '/price',
  priceValidation,
  validateRequest,
  acquisitionController.getPrice
);

/**
 * @route POST /api/ldao/earn
 * @desc Earn LDAO tokens through platform activities
 * @access Private
 */
router.post(
  '/earn',
  authMiddleware,
  earnValidation,
  validateRequest,
  acquisitionController.earnTokens
);

/**
 * @route GET /api/ldao/history
 * @desc Get user's LDAO transaction and earning history
 * @access Private
 */
router.get(
  '/history',
  authMiddleware,
  historyValidation,
  validateRequest,
  acquisitionController.getTransactionHistory
);

/**
 * @route GET /api/ldao/payment-methods
 * @desc Get supported payment methods and networks
 * @access Public
 */
router.get(
  '/payment-methods',
  acquisitionController.getPaymentMethods
);

/**
 * @route POST /api/ldao/swap
 * @desc Swap tokens on DEX for LDAO
 * @access Private
 */
router.post(
  '/swap',
  authMiddleware,
  swapValidation,
  validateRequest,
  acquisitionController.swapTokens
);

/**
 * @route POST /api/ldao/bridge
 * @desc Bridge LDAO tokens across chains
 * @access Private
 */
router.post(
  '/bridge',
  authMiddleware,
  bridgeValidation,
  validateRequest,
  acquisitionController.bridgeTokens
);

/**
 * @route GET /api/ldao/staking
 * @desc Get user's staking positions
 * @access Private
 */
router.get(
  '/staking',
  authMiddleware,
  stakingValidation,
  validateRequest,
  acquisitionController.getStakingPositions
);

/**
 * @route GET /api/ldao/status
 * @desc Get LDAO acquisition service status and configuration
 * @access Public
 */
router.get(
  '/status',
  acquisitionController.getServiceStatus
);

export default router;
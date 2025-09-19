import { Router } from 'express';
import { body, param } from 'express-validator';
import { EnhancedEscrowController } from '../controllers/enhancedEscrowController';
import { validateRequest } from '../middleware/validateRequest';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();
const enhancedEscrowController = new EnhancedEscrowController();

// Apply rate limiting to all escrow routes
router.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many escrow requests, please try again later'
}));

/**
 * @route POST /api/enhanced-escrow/validate
 * @desc Validate escrow creation request
 * @access Public
 */
router.post('/validate',
  [
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
    body('tokenAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Token address must be a valid Ethereum address'),
    body('amount')
      .isString()
      .withMessage('Amount must be a string'),
    body('escrowDuration')
      .optional()
      .isInt({ min: 1, max: 30 })
      .withMessage('Escrow duration must be between 1 and 30 days'),
    body('requiresDeliveryConfirmation')
      .optional()
      .isBoolean()
      .withMessage('Requires delivery confirmation must be a boolean')
  ],
  validateRequest,
  enhancedEscrowController.validateEscrowCreation.bind(enhancedEscrowController)
);

/**
 * @route POST /api/enhanced-escrow/create
 * @desc Create a new escrow
 * @access Public
 */
router.post('/create',
  [
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
    body('tokenAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Token address must be a valid Ethereum address'),
    body('amount')
      .isString()
      .withMessage('Amount must be a string')
  ],
  validateRequest,
  enhancedEscrowController.createEscrow.bind(enhancedEscrowController)
);

/**
 * @route POST /api/enhanced-escrow/:escrowId/lock-funds
 * @desc Lock funds in escrow
 * @access Public
 */
router.post('/:escrowId/lock-funds',
  [
    param('escrowId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Escrow ID is required'),
    body('amount')
      .isString()
      .withMessage('Amount must be a string'),
    body('tokenAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Token address must be a valid Ethereum address')
  ],
  validateRequest,
  enhancedEscrowController.lockFunds.bind(enhancedEscrowController)
);

/**
 * @route GET /api/enhanced-escrow/:escrowId
 * @desc Get escrow details
 * @access Public
 */
router.get('/:escrowId',
  [
    param('escrowId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Escrow ID is required')
  ],
  validateRequest,
  enhancedEscrowController.getEscrow.bind(enhancedEscrowController)
);

/**
 * @route GET /api/enhanced-escrow/:escrowId/status
 * @desc Get escrow status
 * @access Public
 */
router.get('/:escrowId/status',
  [
    param('escrowId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Escrow ID is required')
  ],
  validateRequest,
  enhancedEscrowController.getEscrowStatus.bind(enhancedEscrowController)
);

/**
 * @route GET /api/enhanced-escrow/:escrowId/recovery-options
 * @desc Get escrow recovery options
 * @access Public
 */
router.get('/:escrowId/recovery-options',
  [
    param('escrowId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Escrow ID is required')
  ],
  validateRequest,
  enhancedEscrowController.getEscrowRecoveryOptions.bind(enhancedEscrowController)
);

/**
 * @route POST /api/enhanced-escrow/:escrowId/confirm-delivery
 * @desc Confirm delivery
 * @access Public
 */
router.post('/:escrowId/confirm-delivery',
  [
    param('escrowId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Escrow ID is required'),
    body('deliveryInfo')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Delivery info is required')
  ],
  validateRequest,
  enhancedEscrowController.confirmDelivery.bind(enhancedEscrowController)
);

/**
 * @route POST /api/enhanced-escrow/:escrowId/approve
 * @desc Approve escrow (buyer confirms receipt)
 * @access Public
 */
router.post('/:escrowId/approve',
  [
    param('escrowId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Escrow ID is required'),
    body('buyerAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Buyer address must be a valid Ethereum address')
  ],
  validateRequest,
  enhancedEscrowController.approveEscrow.bind(enhancedEscrowController)
);

/**
 * @route POST /api/enhanced-escrow/:escrowId/dispute
 * @desc Open dispute
 * @access Public
 */
router.post('/:escrowId/dispute',
  [
    param('escrowId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Escrow ID is required'),
    body('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address'),
    body('reason')
      .isString()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Reason must be between 10 and 1000 characters')
  ],
  validateRequest,
  enhancedEscrowController.openDispute.bind(enhancedEscrowController)
);

/**
 * @route POST /api/enhanced-escrow/:escrowId/evidence
 * @desc Submit evidence for dispute
 * @access Public
 */
router.post('/:escrowId/evidence',
  [
    param('escrowId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Escrow ID is required'),
    body('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address'),
    body('evidence')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Evidence is required')
  ],
  validateRequest,
  enhancedEscrowController.submitEvidence.bind(enhancedEscrowController)
);

/**
 * @route POST /api/enhanced-escrow/:escrowId/vote
 * @desc Cast vote in community dispute resolution
 * @access Public
 */
router.post('/:escrowId/vote',
  [
    param('escrowId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Escrow ID is required'),
    body('voterAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Voter address must be a valid Ethereum address'),
    body('voteForBuyer')
      .isBoolean()
      .withMessage('Vote for buyer must be a boolean')
  ],
  validateRequest,
  enhancedEscrowController.castVote.bind(enhancedEscrowController)
);

/**
 * @route POST /api/enhanced-escrow/:escrowId/cancel
 * @desc Cancel escrow
 * @access Public
 */
router.post('/:escrowId/cancel',
  [
    param('escrowId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Escrow ID is required'),
    body('cancellerAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Canceller address must be a valid Ethereum address'),
    body('reason')
      .isString()
      .isLength({ min: 5, max: 500 })
      .withMessage('Reason must be between 5 and 500 characters')
  ],
  validateRequest,
  enhancedEscrowController.cancelEscrow.bind(enhancedEscrowController)
);

/**
 * @route POST /api/enhanced-escrow/:escrowId/retry
 * @desc Retry escrow operation
 * @access Public
 */
router.post('/:escrowId/retry',
  [
    param('escrowId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Escrow ID is required'),
    body('operation')
      .isIn(['fund', 'confirm', 'resolve'])
      .withMessage('Operation must be fund, confirm, or resolve')
  ],
  validateRequest,
  enhancedEscrowController.retryEscrowOperation.bind(enhancedEscrowController)
);

/**
 * @route GET /api/enhanced-escrow/reputation/:userAddress
 * @desc Get user reputation score
 * @access Public
 */
router.get('/reputation/:userAddress',
  [
    param('userAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('User address must be a valid Ethereum address')
  ],
  validateRequest,
  enhancedEscrowController.getUserReputation.bind(enhancedEscrowController)
);

/**
 * @route GET /api/enhanced-escrow/health
 * @desc Health check for escrow service
 * @access Public
 */
router.get('/health',
  enhancedEscrowController.healthCheck.bind(enhancedEscrowController)
);

export default router;
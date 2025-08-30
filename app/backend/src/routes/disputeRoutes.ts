import { Router } from 'express';
import { DisputeController } from '../controllers/disputeController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();
const disputeController = new DisputeController();

// Validation middleware
const createDisputeValidation = [
  body('escrowId').isInt({ min: 1 }).withMessage('Valid escrow ID is required'),
  body('reason').isLength({ min: 10, max: 1000 }).withMessage('Reason must be between 10 and 1000 characters'),
  body('disputeType').isIn([
    'product_not_received',
    'product_not_as_described', 
    'damaged_product',
    'unauthorized_transaction',
    'seller_misconduct',
    'buyer_misconduct',
    'other'
  ]).withMessage('Valid dispute type is required'),
  body('evidence').optional().isLength({ max: 5000 }).withMessage('Evidence must be less than 5000 characters')
];

const submitEvidenceValidation = [
  param('disputeId').isInt({ min: 1 }).withMessage('Valid dispute ID is required'),
  body('evidenceType').isIn(['text', 'image', 'document', 'video']).withMessage('Valid evidence type is required'),
  body('ipfsHash').isLength({ min: 1, max: 100 }).withMessage('IPFS hash is required'),
  body('description').isLength({ min: 1, max: 500 }).withMessage('Description is required and must be less than 500 characters')
];

const castVoteValidation = [
  param('disputeId').isInt({ min: 1 }).withMessage('Valid dispute ID is required'),
  body('verdict').isIn(['favor_buyer', 'favor_seller', 'partial_refund', 'no_fault']).withMessage('Valid verdict is required'),
  body('votingPower').isInt({ min: 1 }).withMessage('Valid voting power is required'),
  body('reasoning').optional().isLength({ max: 1000 }).withMessage('Reasoning must be less than 1000 characters')
];

const resolveDisputeValidation = [
  param('disputeId').isInt({ min: 1 }).withMessage('Valid dispute ID is required'),
  body('verdict').isIn(['favor_buyer', 'favor_seller', 'partial_refund', 'no_fault']).withMessage('Valid verdict is required'),
  body('refundAmount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be a positive number'),
  body('reasoning').isLength({ min: 10, max: 2000 }).withMessage('Reasoning must be between 10 and 2000 characters')
];

// Dispute management routes
router.post('/disputes', 
  authenticateToken, 
  createDisputeValidation, 
  validateRequest, 
  disputeController.createDispute
);

router.post('/disputes/:disputeId/evidence', 
  authenticateToken, 
  submitEvidenceValidation, 
  validateRequest, 
  disputeController.submitEvidence
);

router.post('/disputes/:disputeId/proceed-arbitration', 
  authenticateToken, 
  [param('disputeId').isInt({ min: 1 })], 
  validateRequest, 
  disputeController.proceedToArbitration
);

router.post('/disputes/:disputeId/vote', 
  authenticateToken, 
  castVoteValidation, 
  validateRequest, 
  disputeController.castCommunityVote
);

router.post('/disputes/:disputeId/resolve', 
  authenticateToken, 
  resolveDisputeValidation, 
  validateRequest, 
  disputeController.resolveAsArbitrator
);

// Dispute information routes
router.get('/disputes/:disputeId', 
  authenticateToken, 
  [param('disputeId').isInt({ min: 1 })], 
  validateRequest, 
  disputeController.getDisputeDetails
);

router.get('/disputes/analytics', 
  authenticateToken, 
  disputeController.getDisputeAnalytics
);

router.get('/disputes/user/history', 
  authenticateToken, 
  disputeController.getUserDisputeHistory
);

// Arbitrator routes
router.get('/disputes/arbitration/available', 
  authenticateToken, 
  [
    query('status').optional().isIn(['arbitration_pending', 'community_voting']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ], 
  validateRequest, 
  disputeController.getDisputesForArbitration
);

router.post('/arbitrator/apply', 
  authenticateToken, 
  [
    body('qualifications').isLength({ min: 50, max: 2000 }).withMessage('Qualifications must be between 50 and 2000 characters'),
    body('experience').optional().isLength({ max: 1000 }).withMessage('Experience must be less than 1000 characters')
  ], 
  validateRequest, 
  disputeController.applyForArbitrator
);

router.get('/arbitrator/dashboard', 
  authenticateToken, 
  disputeController.getArbitratorDashboard
);

export default router;
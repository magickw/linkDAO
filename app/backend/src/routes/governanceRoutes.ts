import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { governanceController } from '../controllers/governanceController';
import rateLimit from 'express-rate-limit';

// Rate limiting for governance endpoints
const governanceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: {
    success: false,
    error: {
      code: 'GOVERNANCE_RATE_LIMIT_EXCEEDED',
      message: 'Too many governance requests, please try again later',
    }
  }
});

const router = Router();

// Get all active proposals
router.get('/proposals/active', governanceRateLimit, governanceController.getAllActiveProposals);

// Search proposals
router.get('/proposals/search', governanceRateLimit, governanceController.searchProposals);

// Get proposals by DAO
router.get('/dao/:daoId/proposals', governanceRateLimit, governanceController.getProposalsByDao);

// Get proposals by Snapshot space
router.get('/space/:spaceId/proposals', governanceRateLimit, governanceController.getProposalsBySpace);

// Get specific proposal
router.get('/proposals/:proposalId', governanceRateLimit, governanceController.getProposal);

// Create new proposal
router.post('/proposals', governanceRateLimit, csrfProtection,  governanceController.createProposal);

// Vote on proposal
router.post('/proposals/:proposalId/vote', governanceRateLimit, csrfProtection,  governanceController.voteOnProposal);

// Get DAO treasury data
router.get('/dao/:daoId/treasury', governanceRateLimit, governanceController.getDAOTreasuryData);

// Get user voting power
router.get('/dao/:daoId/users/:userId/voting-power', governanceRateLimit, governanceController.getVotingPower);

// Delegate voting power
router.post('/delegate', governanceRateLimit, csrfProtection,  governanceController.delegateVotingPower);

// Revoke delegation
router.post('/revoke-delegation', governanceRateLimit, csrfProtection,  governanceController.revokeDelegation);

// Get user voting history
router.get('/users/:userId/voting-history', governanceRateLimit, governanceController.getUserVotingHistory);

export default router;

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

// Get general participation stats (for frontend compatibility)
router.get('/participation/general', governanceRateLimit, async (req, res) => {
  try {
    // Return mock/general participation data
    res.json({
      success: true,
      data: {
        totalParticipants: 0,
        activeProposals: 0,
        recentActivity: []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participation stats'
    });
  }
});

// Get general voting power (for frontend compatibility)
router.get('/voting-power/general/:userAddress', governanceRateLimit, async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    // Return mock voting power data
    res.json({
      success: true,
      data: {
        votingPower: '0',
        delegatedPower: '0',
        totalPower: '0'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voting power'
    });
  }
});

export default router;

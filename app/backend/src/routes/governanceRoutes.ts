import { Router } from 'express';
import { governanceController } from '../controllers/governanceController';

const router = Router();

// Get all active proposals
router.get('/proposals/active', governanceController.getAllActiveProposals);

// Search proposals
router.get('/proposals/search', governanceController.searchProposals);

// Get proposals by DAO
router.get('/dao/:daoId/proposals', governanceController.getProposalsByDao);

// Get proposals by Snapshot space
router.get('/space/:spaceId/proposals', governanceController.getProposalsBySpace);

// Get specific proposal
router.get('/proposals/:proposalId', governanceController.getProposal);

// Create new proposal
router.post('/proposals', governanceController.createProposal);

// Vote on proposal
router.post('/proposals/:proposalId/vote', governanceController.voteOnProposal);

// Get DAO treasury data
router.get('/dao/:daoId/treasury', governanceController.getDAOTreasuryData);

// Get user voting power
router.get('/dao/:daoId/users/:userId/voting-power', governanceController.getVotingPower);

// Delegate voting power
router.post('/delegate', governanceController.delegateVotingPower);

// Revoke delegation
router.post('/revoke-delegation', governanceController.revokeDelegation);

// Get user voting history
router.get('/users/:userId/voting-history', governanceController.getUserVotingHistory);

export default router;
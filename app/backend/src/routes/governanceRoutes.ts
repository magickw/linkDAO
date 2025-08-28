import { Router } from 'express';
import { GovernanceController } from '../controllers/governanceController';

const router = Router();
const governanceController = new GovernanceController();

/**
 * Governance and Reputation Routes
 */

// Voting Power
router.get('/governance/voting-power', (req, res, next) => {
  governanceController.getVotingPower(req, res).catch(next);
});

// Cast Vote
router.post('/governance/vote', (req, res, next) => {
  governanceController.castVote(req, res).catch(next);
});

// User Reputation
router.get('/governance/reputation/:address', (req, res, next) => {
  governanceController.getUserReputation(req, res).catch(next);
});

router.put('/governance/reputation/:address', (req, res, next) => {
  governanceController.updateUserReputation(req, res).catch(next);
});

// Proposal Evaluation
router.post('/governance/proposals/evaluate', (req, res, next) => {
  governanceController.evaluateProposal(req, res).catch(next);
});

// Voting Guidance
router.post('/governance/proposals/guidance', (req, res, next) => {
  governanceController.getVotingGuidance(req, res).catch(next);
});

// Proposal Outcome Prediction
router.post('/governance/proposals/predict', (req, res, next) => {
  governanceController.predictProposalOutcome(req, res).catch(next);
});

export default router;
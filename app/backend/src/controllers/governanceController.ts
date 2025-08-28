import { Request, Response } from 'express';
import { GovernanceService } from '../services/governanceService';
import { ReputationService } from '../services/reputationService';
import { ProposalEvaluationService } from '../services/proposalEvaluationService';
import { APIError, ValidationError } from '../middleware/errorHandler';

// Initialize services
const governanceService = new GovernanceService(
  process.env.RPC_URL || 'http://localhost:8545',
  '0x0000000000000000000000000000000000000000' // Placeholder contract address
);

const reputationService = new ReputationService();
const proposalEvaluationService = new ProposalEvaluationService();

export class GovernanceController {
  /**
   * Get user's voting power
   */
  async getVotingPower(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress, tokenBalance, totalSupply } = req.query as {
        userAddress: string;
        tokenBalance: string;
        totalSupply: string;
      };

      if (!userAddress || !tokenBalance || !totalSupply) {
        throw new ValidationError('Missing required parameters: userAddress, tokenBalance, totalSupply');
      }

      const votingPower = await governanceService.calculateVotingPower(
        userAddress,
        tokenBalance,
        totalSupply
      );

      return res.json(votingPower);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  /**
   * Cast a vote
   */
  async castVote(req: Request, res: Response): Promise<Response> {
    try {
      const { voterAddress, proposalId, support, reason, tokenBalance, totalSupply } = req.body;

      if (!voterAddress || proposalId === undefined || support === undefined || !tokenBalance || !totalSupply) {
        throw new ValidationError('Missing required fields: voterAddress, proposalId, support, tokenBalance, totalSupply');
      }

      const vote = await governanceService.castVote(
        voterAddress,
        proposalId,
        support,
        reason || '',
        tokenBalance,
        totalSupply
      );

      return res.json(vote);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  /**
   * Get user reputation
   */
  async getUserReputation(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;

      if (!address) {
        throw new ValidationError('Missing required parameter: address');
      }

      const reputation = await reputationService.getUserReputation(address);

      if (!reputation) {
        return res.json({
          address,
          totalScore: 0,
          tier: 'Novice',
          factors: {
            daoProposalSuccessRate: 0,
            votingParticipation: 0,
            investmentAdviceAccuracy: 0,
            communityContribution: 0,
            onchainActivity: 0
          },
          lastUpdated: new Date()
        });
      }

      return res.json(reputation);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  /**
   * Update user reputation
   */
  async updateUserReputation(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const factors = req.body;

      if (!address) {
        throw new ValidationError('Missing required parameter: address');
      }

      const reputation = await reputationService.updateUserReputation(address, factors);

      return res.json(reputation);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  /**
   * Evaluate a proposal
   */
  async evaluateProposal(req: Request, res: Response): Promise<Response> {
    try {
      const proposalData = req.body;

      if (!proposalData.id || !proposalData.title || !proposalData.description) {
        throw new ValidationError('Missing required proposal fields: id, title, description');
      }

      const evaluation = await proposalEvaluationService.evaluateProposal(proposalData);

      return res.json(evaluation);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  /**
   * Get voting guidance
   */
  async getVotingGuidance(req: Request, res: Response): Promise<Response> {
    try {
      const { proposal, userAddress } = req.body;

      if (!proposal || !userAddress) {
        throw new ValidationError('Missing required fields: proposal, userAddress');
      }

      const guidance = await proposalEvaluationService.getVotingGuidance(proposal, userAddress);

      return res.json({ guidance });
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  /**
   * Get proposal outcome prediction
   */
  async predictProposalOutcome(req: Request, res: Response): Promise<Response> {
    try {
      const proposalData = req.body;

      if (!proposalData.id) {
        throw new ValidationError('Missing required proposal field: id');
      }

      const prediction = await proposalEvaluationService.predictOutcome(proposalData);

      return res.json(prediction);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }
}
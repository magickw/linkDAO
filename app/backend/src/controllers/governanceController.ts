import { Request, Response } from 'express';
import { governanceService } from '../services/governanceService';

export class GovernanceController {
  async getProposal(req: Request, res: Response) {
    try {
      const { proposalId } = req.params;
      
      if (!proposalId) {
        return res.status(400).json({ error: 'Proposal ID is required' });
      }

      const proposal = await governanceService.getProposal(proposalId);
      res.json(proposal);
    } catch (error) {
      console.error('Error fetching proposal:', error);
      res.status(500).json({ error: 'Failed to fetch proposal' });
    }
  }

  async getProposalsByDao(req: Request, res: Response) {
    try {
      const { daoId } = req.params;
      const { limit = '20' } = req.query;
      
      if (!daoId) {
        return res.status(400).json({ error: 'DAO ID is required' });
      }

      const proposals = await governanceService.getProposalsByDao(daoId, parseInt(limit as string));
      res.json(proposals);
    } catch (error) {
      console.error('Error fetching DAO proposals:', error);
      res.status(500).json({ error: 'Failed to fetch DAO proposals' });
    }
  }

  async getAllActiveProposals(req: Request, res: Response) {
    try {
      const { limit = '20' } = req.query;
      
      const proposals = await governanceService.getAllActiveProposals(parseInt(limit as string));
      res.json(proposals);
    } catch (error) {
      console.error('Error fetching active proposals:', error);
      res.status(500).json({ error: 'Failed to fetch active proposals' });
    }
  }

  async createProposal(req: Request, res: Response) {
    try {
      const { title, description, daoId, proposerId, votingDuration, category, executionDelay, requiredMajority } = req.body;
      
      if (!title || !description || !proposerId) {
        return res.status(400).json({ error: 'Title, description, and proposer ID are required' });
      }

      const proposal = await governanceService.createProposal({
        title,
        description,
        daoId,
        proposerId,
        votingDuration,
        category,
        executionDelay,
        requiredMajority
      });

      res.status(201).json(proposal);
    } catch (error) {
      console.error('Error creating proposal:', error);
      res.status(500).json({ error: 'Failed to create proposal' });
    }
  }

  async voteOnProposal(req: Request, res: Response) {
    try {
      const { proposalId } = req.params;
      const { userId, vote, votingPower } = req.body;
      
      if (!proposalId || !userId || !vote) {
        return res.status(400).json({ error: 'Proposal ID, user ID, and vote are required' });
      }

      if (!['yes', 'no', 'abstain'].includes(vote)) {
        return res.status(400).json({ error: 'Vote must be yes, no, or abstain' });
      }

      const success = await governanceService.voteOnProposal({
        proposalId,
        userId,
        vote,
        votingPower
      });

      if (success) {
        res.json({ success: true, message: 'Vote recorded successfully' });
      } else {
        res.status(400).json({ error: 'Failed to record vote' });
      }
    } catch (error) {
      console.error('Error voting on proposal:', error);
      res.status(500).json({ error: 'Failed to record vote' });
    }
  }

  async searchProposals(req: Request, res: Response) {
    try {
      const { query, limit = '20' } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const proposals = await governanceService.searchProposals(query as string, parseInt(limit as string));
      res.json(proposals);
    } catch (error) {
      console.error('Error searching proposals:', error);
      res.status(500).json({ error: 'Failed to search proposals' });
    }
  }

  async getProposalsBySpace(req: Request, res: Response) {
    try {
      const { spaceId } = req.params;
      const { limit = '20' } = req.query;
      
      if (!spaceId) {
        return res.status(400).json({ error: 'Space ID is required' });
      }

      const proposals = await governanceService.getProposalsBySpace(spaceId, parseInt(limit as string));
      res.json(proposals);
    } catch (error) {
      console.error('Error fetching space proposals:', error);
      res.status(500).json({ error: 'Failed to fetch space proposals' });
    }
  }

  async getDAOTreasuryData(req: Request, res: Response) {
    try {
      const { daoId } = req.params;
      
      if (!daoId) {
        return res.status(400).json({ error: 'DAO ID is required' });
      }

      const treasuryData = await governanceService.getDAOTreasuryData(daoId);
      res.json(treasuryData);
    } catch (error) {
      console.error('Error fetching treasury data:', error);
      res.status(500).json({ error: 'Failed to fetch treasury data' });
    }
  }

  async getVotingPower(req: Request, res: Response) {
    try {
      const { userId, daoId } = req.params;
      
      if (!userId || !daoId) {
        return res.status(400).json({ error: 'User ID and DAO ID are required' });
      }

      const votingPower = await governanceService.getVotingPower(userId, daoId);
      res.json(votingPower);
    } catch (error) {
      console.error('Error fetching voting power:', error);
      res.status(500).json({ error: 'Failed to fetch voting power' });
    }
  }

  async delegateVotingPower(req: Request, res: Response) {
    try {
      const { delegatorId, delegateId, daoId, votingPower } = req.body;
      
      if (!delegatorId || !delegateId || !daoId || votingPower === undefined) {
        return res.status(400).json({ error: 'Delegator ID, delegate ID, DAO ID, and voting power are required' });
      }

      const success = await governanceService.delegateVotingPower(delegatorId, delegateId, daoId, votingPower);
      
      if (success) {
        res.json({ success: true, message: 'Voting power delegated successfully' });
      } else {
        res.status(400).json({ error: 'Failed to delegate voting power' });
      }
    } catch (error) {
      console.error('Error delegating voting power:', error);
      res.status(500).json({ error: 'Failed to delegate voting power' });
    }
  }

  async revokeDelegation(req: Request, res: Response) {
    try {
      const { delegatorId, delegateId, daoId } = req.body;
      
      if (!delegatorId || !delegateId || !daoId) {
        return res.status(400).json({ error: 'Delegator ID, delegate ID, and DAO ID are required' });
      }

      const success = await governanceService.revokeDelegation(delegatorId, delegateId, daoId);
      
      if (success) {
        res.json({ success: true, message: 'Delegation revoked successfully' });
      } else {
        res.status(400).json({ error: 'Failed to revoke delegation' });
      }
    } catch (error) {
      console.error('Error revoking delegation:', error);
      res.status(500).json({ error: 'Failed to revoke delegation' });
    }
  }

  async getUserVotingHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { daoId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const history = await governanceService.getUserVotingHistory(userId, daoId as string);
      res.json(history);
    } catch (error) {
      console.error('Error fetching voting history:', error);
      res.status(500).json({ error: 'Failed to fetch voting history' });
    }
  }
}

export const governanceController = new GovernanceController();
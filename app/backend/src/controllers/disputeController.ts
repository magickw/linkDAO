import { Request, Response } from 'express';
import { DisputeService, CreateDisputeRequest, SubmitEvidenceRequest, CommunityVote, ArbitratorDecision } from '../services/disputeService';

export class DisputeController {
  private disputeService: DisputeService;

  constructor() {
    this.disputeService = new DisputeService();
  }

  /**
   * Create a new dispute
   */
  createDispute = async (req: Request, res: Response): Promise<void> => {
    try {
      const { escrowId, reason, disputeType, evidence } = req.body;
      const reporterId = req.user?.userId || req.user?.walletAddress; // Assuming user is attached to request

      if (!reporterId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!escrowId || !reason || !disputeType) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const request: CreateDisputeRequest = {
        escrowId: parseInt(escrowId),
        reporterId,
        reason,
        disputeType,
        evidence
      };

      const disputeId = await this.disputeService.createDispute(request);

      res.status(201).json({
        success: true,
        data: { disputeId },
        message: 'Dispute created successfully'
      });
    } catch (error: any) {
      console.error('Error creating dispute:', error);
      res.status(500).json({
        error: 'Failed to create dispute',
        details: error.message
      });
    }
  };

  /**
   * Submit evidence for a dispute
   */
  submitEvidence = async (req: Request, res: Response): Promise<void> => {
    try {
      const { disputeId } = req.params;
      const { evidenceType, ipfsHash, description } = req.body;
      const submitterId = req.user?.userId || req.user?.walletAddress;

      if (!submitterId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!evidenceType || !ipfsHash || !description) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const request: SubmitEvidenceRequest = {
        disputeId: parseInt(disputeId),
        submitterId,
        evidenceType,
        ipfsHash,
        description
      };

      await this.disputeService.submitEvidence(request);

      res.json({
        success: true,
        message: 'Evidence submitted successfully'
      });
    } catch (error: any) {
      console.error('Error submitting evidence:', error);
      res.status(500).json({
        error: 'Failed to submit evidence',
        details: error.message
      });
    }
  };

  /**
   * Proceed dispute to arbitration phase
   */
  proceedToArbitration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { disputeId } = req.params;

      await this.disputeService.proceedToArbitration(parseInt(disputeId));

      res.json({
        success: true,
        message: 'Dispute proceeded to arbitration'
      });
    } catch (error: any) {
      console.error('Error proceeding to arbitration:', error);
      res.status(500).json({
        error: 'Failed to proceed to arbitration',
        details: error.message
      });
    }
  };

  /**
   * Cast community vote on dispute
   */
  castCommunityVote = async (req: Request, res: Response): Promise<void> => {
    try {
      const { disputeId } = req.params;
      const { verdict, votingPower, reasoning } = req.body;
      const voterId = req.user?.userId || req.user?.walletAddress;

      if (!voterId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!verdict || !votingPower) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const vote: CommunityVote = {
        disputeId: parseInt(disputeId),
        voterId,
        verdict,
        votingPower: parseInt(votingPower),
        reasoning
      };

      await this.disputeService.castCommunityVote(vote);

      res.json({
        success: true,
        message: 'Vote cast successfully'
      });
    } catch (error: any) {
      console.error('Error casting vote:', error);
      res.status(500).json({
        error: 'Failed to cast vote',
        details: error.message
      });
    }
  };

  /**
   * Resolve dispute as arbitrator
   */
  resolveAsArbitrator = async (req: Request, res: Response): Promise<void> => {
    try {
      const { disputeId } = req.params;
      const { verdict, refundAmount, reasoning } = req.body;
      const arbitratorId = req.user?.userId || req.user?.walletAddress;

      if (!arbitratorId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!verdict || !reasoning) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const decision: ArbitratorDecision = {
        disputeId: parseInt(disputeId),
        arbitratorId,
        verdict,
        refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
        reasoning
      };

      await this.disputeService.resolveAsArbitrator(decision);

      res.json({
        success: true,
        message: 'Dispute resolved successfully'
      });
    } catch (error: any) {
      console.error('Error resolving dispute:', error);
      res.status(500).json({
        error: 'Failed to resolve dispute',
        details: error.message
      });
    }
  };

  /**
   * Get dispute details
   */
  getDisputeDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { disputeId } = req.params;

      const dispute = await this.disputeService.getDisputeDetails(parseInt(disputeId));

      res.json({
        success: true,
        data: dispute
      });
    } catch (error: any) {
      console.error('Error getting dispute details:', error);
      res.status(500).json({
        error: 'Failed to get dispute details',
        details: error.message
      });
    }
  };

  /**
   * Get dispute analytics
   */
  getDisputeAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const analytics = await this.disputeService.getDisputeAnalytics();

      res.json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      console.error('Error getting dispute analytics:', error);
      res.status(500).json({
        error: 'Failed to get dispute analytics',
        details: error.message
      });
    }
  };

  /**
   * Get user's dispute history
   */
  getUserDisputeHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.walletAddress;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const disputes = await this.disputeService.getUserDisputeHistory(userId);

      res.json({
        success: true,
        data: disputes
      });
    } catch (error: any) {
      console.error('Error getting user dispute history:', error);
      res.status(500).json({
        error: 'Failed to get dispute history',
        details: error.message
      });
    }
  };

  /**
   * Get disputes for arbitration (for arbitrators)
   */
  getDisputesForArbitration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, limit = 10, offset = 0 } = req.query;

      // This would be implemented to get disputes available for arbitration
      // For now, return empty array
      res.json({
        success: true,
        data: {
          disputes: [],
          total: 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error: any) {
      console.error('Error getting disputes for arbitration:', error);
      res.status(500).json({
        error: 'Failed to get disputes for arbitration',
        details: error.message
      });
    }
  };

  /**
   * Apply to become an arbitrator
   */
  applyForArbitrator = async (req: Request, res: Response): Promise<void> => {
    try {
      const { qualifications, experience } = req.body;
      const applicantId = req.user?.userId || req.user?.walletAddress;

      if (!applicantId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!qualifications) {
        res.status(400).json({ error: 'Qualifications are required' });
        return;
      }

      // This would be implemented to handle arbitrator applications
      // For now, just return success
      res.json({
        success: true,
        message: 'Arbitrator application submitted successfully'
      });
    } catch (error: any) {
      console.error('Error applying for arbitrator:', error);
      res.status(500).json({
        error: 'Failed to submit arbitrator application',
        details: error.message
      });
    }
  };

  /**
   * Get arbitrator dashboard data
   */
  getArbitratorDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const arbitratorId = req.user?.userId || req.user?.walletAddress;

      if (!arbitratorId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // This would return arbitrator-specific dashboard data
      res.json({
        success: true,
        data: {
          assignedDisputes: [],
          completedCases: 0,
          successRate: 0,
          averageResolutionTime: 0,
          reputation: 0
        }
      });
    } catch (error: any) {
      console.error('Error getting arbitrator dashboard:', error);
      res.status(500).json({
        error: 'Failed to get arbitrator dashboard',
        details: error.message
      });
    }
  };
}
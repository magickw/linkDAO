/**
 * Dispute Resolution API Controller
 * Handles dispute creation, evidence submission, community voting, and DAO escalation
 */

import { Request, Response } from 'express';
import { DisputeService, CreateDisputeRequest, SubmitEvidenceRequest, CommunityVote } from '../services/disputeService';

export class DisputeController {
  private disputeService: DisputeService;

  constructor() {
    this.disputeService = new DisputeService();
  }

  /**
   * GET /api/marketplace/disputes/community
   * Get all active disputes for community voting
   */
  async getCommunityDisputes(req: Request, res: Response): Promise<void> {
    try {
      const { status = 'community_voting', limit = 20, offset = 0 } = req.query;
      
      // Mock implementation - in real app, would filter by status and pagination
      const disputes = await this.disputeService.getUserDisputeHistory('community');
      
      res.status(200).json({
        success: true,
        disputes: disputes.slice(Number(offset), Number(offset) + Number(limit)),
        total: disputes.length,
        pagination: {
          offset: Number(offset),
          limit: Number(limit),
          hasMore: disputes.length > Number(offset) + Number(limit)
        }
      });
    } catch (error) {
      console.error('Error getting community disputes:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/marketplace/disputes/:id
   * Get specific dispute details
   */
  async getDisputeById(req: Request, res: Response): Promise<void> {
    try {
      const disputeId = parseInt(req.params.id);
      
      if (isNaN(disputeId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid dispute ID'
        });
        return;
      }

      const dispute = await this.disputeService.getDisputeDetails(disputeId);
      
      res.status(200).json({
        success: true,
        dispute
      });
    } catch (error) {
      console.error('Error getting dispute:', error);
      
      if (error instanceof Error && error.message === 'Dispute not found') {
        res.status(404).json({
          success: false,
          error: 'Dispute not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * GET /api/marketplace/orders/:orderId/disputes
   * Get disputes for a specific order
   */
  async getOrderDisputes(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      
      // Mock implementation - would query disputes by order/escrow ID
      const disputes = [];
      
      res.status(200).json({
        success: true,
        disputes,
        orderId
      });
    } catch (error) {
      console.error('Error getting order disputes:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/marketplace/disputes
   * Create a new dispute
   */
  async createDispute(req: Request, res: Response): Promise<void> {
    try {
      const { escrowId, reason, disputeType, evidence, reporterId } = req.body;

      // Validation
      if (!escrowId || !reason || !disputeType || !reporterId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: escrowId, reason, disputeType, reporterId'
        });
        return;
      }

      const createRequest: CreateDisputeRequest = {
        escrowId: parseInt(escrowId),
        reporterId,
        reason,
        disputeType,
        evidence
      };

      const disputeId = await this.disputeService.createDispute(createRequest);
      
      res.status(201).json({
        success: true,
        disputeId,
        message: 'Dispute created successfully'
      });
    } catch (error) {
      console.error('Error creating dispute:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Escrow not found')) {
          res.status(404).json({
            success: false,
            error: 'Escrow not found'
          });
        } else if (error.message.includes('Dispute already exists')) {
          res.status(409).json({
            success: false,
            error: 'Dispute already exists for this escrow'
          });
        } else {
          res.status(400).json({
            success: false,
            error: error.message
          });
        }
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * POST /api/marketplace/disputes/:id/evidence
   * Submit evidence for a dispute
   */
  async submitEvidence(req: Request, res: Response): Promise<void> {
    try {
      const disputeId = parseInt(req.params.id);
      const { submitterId, evidenceType, ipfsHash, description } = req.body;

      if (isNaN(disputeId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid dispute ID'
        });
        return;
      }

      // Validation
      if (!submitterId || !evidenceType || !description) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: submitterId, evidenceType, description'
        });
        return;
      }

      const evidenceRequest: SubmitEvidenceRequest = {
        disputeId,
        submitterId,
        evidenceType,
        ipfsHash: ipfsHash || '',
        description
      };

      await this.disputeService.submitEvidence(evidenceRequest);
      
      res.status(200).json({
        success: true,
        message: 'Evidence submitted successfully'
      });
    } catch (error) {
      console.error('Error submitting evidence:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Dispute not found')) {
          res.status(404).json({
            success: false,
            error: 'Dispute not found'
          });
        } else if (error.message.includes('not in evidence submission phase')) {
          res.status(400).json({
            success: false,
            error: 'Dispute is not in evidence submission phase'
          });
        } else if (error.message.includes('deadline has passed')) {
          res.status(400).json({
            success: false,
            error: 'Evidence submission deadline has passed'
          });
        } else {
          res.status(400).json({
            success: false,
            error: error.message
          });
        }
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * POST /api/marketplace/disputes/:id/vote
   * Cast a community vote on a dispute
   */
  async castVote(req: Request, res: Response): Promise<void> {
    try {
      const disputeId = parseInt(req.params.id);
      const { voterId, verdict, votingPower, reasoning } = req.body;

      if (isNaN(disputeId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid dispute ID'
        });
        return;
      }

      // Validation
      if (!voterId || !verdict) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: voterId, verdict'
        });
        return;
      }

      const validVerdicts = ['favor_buyer', 'favor_seller', 'partial_refund', 'no_fault'];
      if (!validVerdicts.includes(verdict)) {
        res.status(400).json({
          success: false,
          error: 'Invalid verdict. Must be one of: ' + validVerdicts.join(', ')
        });
        return;
      }

      const vote: CommunityVote = {
        disputeId,
        voterId,
        verdict,
        votingPower: votingPower || 100, // Default voting power
        reasoning
      };

      await this.disputeService.castCommunityVote(vote);
      
      res.status(200).json({
        success: true,
        message: 'Vote cast successfully'
      });
    } catch (error) {
      console.error('Error casting vote:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Dispute not found')) {
          res.status(404).json({
            success: false,
            error: 'Dispute not found'
          });
        } else if (error.message.includes('not in community voting phase')) {
          res.status(400).json({
            success: false,
            error: 'Dispute is not in community voting phase'
          });
        } else if (error.message.includes('already voted')) {
          res.status(409).json({
            success: false,
            error: 'User has already voted on this dispute'
          });
        } else if (error.message.includes('Insufficient reputation')) {
          res.status(403).json({
            success: false,
            error: 'Insufficient reputation to vote'
          });
        } else {
          res.status(400).json({
            success: false,
            error: error.message
          });
        }
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * POST /api/marketplace/disputes/:id/arbitrate
   * Resolve dispute as arbitrator
   */
  async arbitrateDispute(req: Request, res: Response): Promise<void> {
    try {
      const disputeId = parseInt(req.params.id);
      const { arbitratorId, verdict, refundAmount, reasoning } = req.body;

      if (isNaN(disputeId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid dispute ID'
        });
        return;
      }

      // Validation
      if (!arbitratorId || !verdict || !reasoning) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: arbitratorId, verdict, reasoning'
        });
        return;
      }

      await this.disputeService.resolveAsArbitrator({
        disputeId,
        arbitratorId,
        verdict,
        refundAmount,
        reasoning
      });
      
      res.status(200).json({
        success: true,
        message: 'Dispute resolved successfully'
      });
    } catch (error) {
      console.error('Error arbitrating dispute:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Dispute not found')) {
          res.status(404).json({
            success: false,
            error: 'Dispute not found'
          });
        } else if (error.message.includes('not in arbitration phase')) {
          res.status(400).json({
            success: false,
            error: 'Dispute is not in arbitration phase'
          });
        } else if (error.message.includes('Insufficient reputation')) {
          res.status(403).json({
            success: false,
            error: 'Insufficient reputation to arbitrate'
          });
        } else {
          res.status(400).json({
            success: false,
            error: error.message
          });
        }
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * GET /api/marketplace/disputes/analytics
   * Get dispute analytics and statistics
   */
  async getDisputeAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.disputeService.getDisputeAnalytics();
      
      res.status(200).json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error('Error getting dispute analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/marketplace/disputes/user/:userId
   * Get user's dispute history
   */
  async getUserDisputes(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;
      
      const disputes = await this.disputeService.getUserDisputeHistory(userId);
      
      res.status(200).json({
        success: true,
        disputes: disputes.slice(Number(offset), Number(offset) + Number(limit)),
        total: disputes.length,
        pagination: {
          offset: Number(offset),
          limit: Number(limit),
          hasMore: disputes.length > Number(offset) + Number(limit)
        }
      });
    } catch (error) {
      console.error('Error getting user disputes:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
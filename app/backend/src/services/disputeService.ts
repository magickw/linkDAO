import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { disputes, escrows, users, orders } from '../db/schema';
import { NotificationService } from './notificationService';
import { reputationService } from './reputationService';

export interface CreateDisputeRequest {
  escrowId: number;
  reporterId: string;
  reason: string;
  disputeType: DisputeType;
  evidence?: string;
}

export interface SubmitEvidenceRequest {
  disputeId: number;
  submitterId: string;
  evidenceType: string;
  ipfsHash: string;
  description: string;
}

export interface CommunityVote {
  disputeId: number;
  voterId: string;
  verdict: VerdictType;
  votingPower: number;
  reasoning?: string;
}

export interface ArbitratorDecision {
  disputeId: number;
  arbitratorId: string;
  verdict: VerdictType;
  refundAmount?: number;
  reasoning: string;
}

export enum DisputeType {
  PRODUCT_NOT_RECEIVED = 'product_not_received',
  PRODUCT_NOT_AS_DESCRIBED = 'product_not_as_described',
  DAMAGED_PRODUCT = 'damaged_product',
  UNAUTHORIZED_TRANSACTION = 'unauthorized_transaction',
  SELLER_MISCONDUCT = 'seller_misconduct',
  BUYER_MISCONDUCT = 'buyer_misconduct',
  OTHER = 'other'
}

export enum DisputeStatus {
  CREATED = 'created',
  EVIDENCE_SUBMISSION = 'evidence_submission',
  ARBITRATION_PENDING = 'arbitration_pending',
  COMMUNITY_VOTING = 'community_voting',
  DAO_ESCALATION = 'dao_escalation',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled'
}

export enum VerdictType {
  FAVOR_BUYER = 'favor_buyer',
  FAVOR_SELLER = 'favor_seller',
  PARTIAL_REFUND = 'partial_refund',
  NO_FAULT = 'no_fault'
}

export enum ResolutionMethod {
  AUTOMATED = 'automated',
  COMMUNITY_ARBITRATOR = 'community_arbitrator',
  DAO_GOVERNANCE = 'dao_governance'
}

export interface DisputeEvidence {
  id: number;
  disputeId: number;
  submitterId: string;
  evidenceType: string;
  ipfsHash: string;
  description: string;
  timestamp: Date;
  verified: boolean;
}

export interface DisputeAnalytics {
  totalDisputes: number;
  resolvedDisputes: number;
  averageResolutionTime: number;
  disputesByType: Record<DisputeType, number>;
  verdictsByType: Record<VerdictType, number>;
  successRateByArbitrator: Record<string, number>;
}

export class DisputeService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Create a new dispute
   */
  async createDispute(request: CreateDisputeRequest): Promise<number> {
    try {
      // Validate escrow exists and is in valid state for dispute
      const escrow = await db.select().from(escrows).where(eq(escrows.id, request.escrowId)).limit(1);
      
      if (escrow.length === 0) {
        throw new Error('Escrow not found');
      }

      if (escrow[0].disputeOpened) {
        throw new Error('Dispute already exists for this escrow');
      }

      // Determine respondent (if reporter is buyer, respondent is seller and vice versa)
      const respondentId = request.reporterId === escrow[0].buyerId ? 
        escrow[0].sellerId : escrow[0].buyerId;

      // Create dispute record
      const [dispute] = await db.insert(disputes).values({
        escrowId: request.escrowId,
        reporterId: request.reporterId,
        reason: request.reason,
        status: 'evidence_submission',
        evidence: JSON.stringify({
          disputeType: request.disputeType,
          initialEvidence: request.evidence || '',
          evidenceItems: []
        })
      }).returning();

      // Update escrow to mark dispute as opened
      await db.update(escrows)
        .set({ disputeOpened: true })
        .where(eq(escrows.id, request.escrowId));

      // Send notifications to involved parties
      await this.notificationService.sendOrderNotification(
        respondentId!,
        'dispute_created',
        request.escrowId.toString(),
        { disputeId: dispute.id, escrowId: request.escrowId }
      );

      // Log dispute creation for analytics
      await this.logDisputeEvent(dispute.id, 'dispute_created', request.reporterId);

      return dispute.id;
    } catch (error) {
      console.error('Error creating dispute:', error);
      throw error;
    }
  }

  /**
   * Submit evidence for a dispute
   */
  async submitEvidence(request: SubmitEvidenceRequest): Promise<void> {
    try {
      // Validate dispute exists and is in evidence submission phase
      const [dispute] = await db.select().from(disputes)
        .where(eq(disputes.id, request.disputeId))
        .limit(1);

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      if (dispute.status !== DisputeStatus.EVIDENCE_SUBMISSION) {
        throw new Error('Dispute is not in evidence submission phase');
      }

      // Check if evidence submission deadline has passed (3 days from creation)
      const createdAt = new Date(dispute.createdAt!);
      const deadline = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      if (new Date() > deadline) {
        throw new Error('Evidence submission deadline has passed');
      }

      // Store evidence (in a real implementation, this would be a separate table)
      const currentEvidence = dispute.evidence ? JSON.parse(dispute.evidence) : [];
      const newEvidence: DisputeEvidence = {
        id: currentEvidence.length + 1,
        disputeId: request.disputeId,
        submitterId: request.submitterId,
        evidenceType: request.evidenceType,
        ipfsHash: request.ipfsHash,
        description: request.description,
        timestamp: new Date(),
        verified: false
      };

      currentEvidence.push(newEvidence);

      await db.update(disputes)
        .set({ evidence: JSON.stringify(currentEvidence) })
        .where(eq(disputes.id, request.disputeId));

      // Log evidence submission
      await this.logDisputeEvent(request.disputeId, 'evidence_submitted', request.submitterId);

      // Notify other party about evidence submission
      const escrow = await this.getDisputeEscrow(request.disputeId);
      const otherParty = request.submitterId === escrow.buyerId ? escrow.sellerId : escrow.buyerId;
      
      await this.notificationService.sendOrderNotification(
        otherParty!,
        'evidence_submitted',
        escrow.id.toString(),
        { disputeId: request.disputeId }
      );

    } catch (error) {
      console.error('Error submitting evidence:', error);
      throw error;
    }
  }

  /**
   * Proceed to arbitration phase
   */
  async proceedToArbitration(disputeId: number): Promise<void> {
    try {
      const [dispute] = await db.select().from(disputes)
        .where(eq(disputes.id, disputeId))
        .limit(1);

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      if (dispute.status !== DisputeStatus.EVIDENCE_SUBMISSION) {
        throw new Error('Dispute is not in evidence submission phase');
      }

      // Check if evidence submission period has ended
      const createdAt = new Date(dispute.createdAt!);
      const deadline = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      if (new Date() <= deadline) {
        throw new Error('Evidence submission period has not ended');
      }

      // Determine resolution method based on escrow value and complexity
      const resolutionMethod = await this.determineResolutionMethod(disputeId);

      if (resolutionMethod === ResolutionMethod.AUTOMATED) {
        await this.resolveAutomatically(disputeId);
      } else if (resolutionMethod === ResolutionMethod.COMMUNITY_ARBITRATOR) {
        await this.assignArbitrator(disputeId);
      } else {
        await this.escalateToDAO(disputeId);
      }

    } catch (error) {
      console.error('Error proceeding to arbitration:', error);
      throw error;
    }
  }

  /**
   * Cast community vote on dispute
   */
  async castCommunityVote(vote: CommunityVote): Promise<void> {
    try {
      const [dispute] = await db.select().from(disputes)
        .where(eq(disputes.id, vote.disputeId))
        .limit(1);

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      if (dispute.status !== DisputeStatus.COMMUNITY_VOTING) {
        throw new Error('Dispute is not in community voting phase');
      }

      // Check if user has already voted
      const existingVotes = dispute.resolution ? JSON.parse(dispute.resolution) : { votes: [] };
      const hasVoted = existingVotes.votes.some((v: any) => v.voterId === vote.voterId);
      
      if (hasVoted) {
        throw new Error('User has already voted on this dispute');
      }

      // Validate voting power (based on reputation)
      // For now, assume minimum reputation of 100 - would integrate with actual reputation system
      const voterReputation = 150; // Mock reputation score
      if (voterReputation < 100) {
        throw new Error('Insufficient reputation to vote');
      }

      // Add vote
      existingVotes.votes.push({
        voterId: vote.voterId,
        verdict: vote.verdict,
        votingPower: vote.votingPower,
        reasoning: vote.reasoning,
        timestamp: new Date().toISOString()
      });

      await db.update(disputes)
        .set({ resolution: JSON.stringify(existingVotes) })
        .where(eq(disputes.id, vote.disputeId));

      // Check if voting threshold is met
      await this.checkVotingCompletion(vote.disputeId);

      // Log vote
      await this.logDisputeEvent(vote.disputeId, 'community_vote_cast', vote.voterId);

    } catch (error) {
      console.error('Error casting community vote:', error);
      throw error;
    }
  }

  /**
   * Resolve dispute as arbitrator
   */
  async resolveAsArbitrator(decision: ArbitratorDecision): Promise<void> {
    try {
      const [dispute] = await db.select().from(disputes)
        .where(eq(disputes.id, decision.disputeId))
        .limit(1);

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      if (dispute.status !== DisputeStatus.ARBITRATION_PENDING) {
        throw new Error('Dispute is not in arbitration phase');
      }

      // Validate arbitrator authority (in a real system, check if assigned)
      // For now, assume any user with high reputation can arbitrate
      const arbitratorReputation = 600; // Mock reputation score
      if (arbitratorReputation < 500) {
        throw new Error('Insufficient reputation to arbitrate');
      }

      await this.resolveDispute(
        decision.disputeId,
        decision.verdict,
        decision.refundAmount || 0,
        decision.arbitratorId,
        decision.reasoning
      );

    } catch (error) {
      console.error('Error resolving dispute as arbitrator:', error);
      throw error;
    }
  }

  /**
   * Get dispute details with evidence and votes
   */
  async getDisputeDetails(disputeId: number): Promise<any> {
    try {
      const [dispute] = await db.select().from(disputes)
        .where(eq(disputes.id, disputeId))
        .limit(1);

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      // Get escrow details
      const escrow = await this.getDisputeEscrow(disputeId);

      // Parse evidence and votes
      const evidence = dispute.evidence ? JSON.parse(dispute.evidence) : [];
      const resolution = dispute.resolution ? JSON.parse(dispute.resolution) : { votes: [] };

      return {
        ...dispute,
        escrow,
        evidence,
        votes: resolution.votes || []
      };

    } catch (error) {
      console.error('Error getting dispute details:', error);
      throw error;
    }
  }

  /**
   * Get dispute analytics
   */
  async getDisputeAnalytics(): Promise<DisputeAnalytics> {
    try {
      // Get total disputes
      const totalDisputes = await db.select({ count: sql<number>`count(*)` })
        .from(disputes);

      // Get resolved disputes
      const resolvedDisputes = await db.select({ count: sql<number>`count(*)` })
        .from(disputes)
        .where(eq(disputes.status, DisputeStatus.RESOLVED));

      // Calculate average resolution time
      const resolutionTimes = await db.select({
        createdAt: disputes.createdAt,
        resolvedAt: disputes.resolvedAt
      })
      .from(disputes)
      .where(eq(disputes.status, DisputeStatus.RESOLVED));

      let averageResolutionTime = 0;
      if (resolutionTimes.length > 0) {
        const totalTime = resolutionTimes.reduce((sum: number, dispute: any) => {
          if (dispute.createdAt && dispute.resolvedAt) {
            const created = new Date(dispute.createdAt).getTime();
            const resolved = new Date(dispute.resolvedAt).getTime();
            return sum + (resolved - created);
          }
          return sum;
        }, 0);
        averageResolutionTime = totalTime / resolutionTimes.length;
      }

      // Get disputes by type (simplified - would need proper aggregation)
      const disputesByType: Record<DisputeType, number> = {
        [DisputeType.PRODUCT_NOT_RECEIVED]: 0,
        [DisputeType.PRODUCT_NOT_AS_DESCRIBED]: 0,
        [DisputeType.DAMAGED_PRODUCT]: 0,
        [DisputeType.UNAUTHORIZED_TRANSACTION]: 0,
        [DisputeType.SELLER_MISCONDUCT]: 0,
        [DisputeType.BUYER_MISCONDUCT]: 0,
        [DisputeType.OTHER]: 0
      };

      // Get verdicts by type (simplified)
      const verdictsByType: Record<VerdictType, number> = {
        [VerdictType.FAVOR_BUYER]: 0,
        [VerdictType.FAVOR_SELLER]: 0,
        [VerdictType.PARTIAL_REFUND]: 0,
        [VerdictType.NO_FAULT]: 0
      };

      return {
        totalDisputes: totalDisputes[0].count,
        resolvedDisputes: resolvedDisputes[0].count,
        averageResolutionTime: Math.round(averageResolutionTime / (1000 * 60 * 60)), // Convert to hours
        disputesByType,
        verdictsByType,
        successRateByArbitrator: {}
      };

    } catch (error) {
      console.error('Error getting dispute analytics:', error);
      throw error;
    }
  }

  /**
   * Get user's dispute history
   */
  async getUserDisputeHistory(userId: string): Promise<any[]> {
    try {
      const userDisputes = await db.select()
        .from(disputes)
        .where(eq(disputes.reporterId, userId))
        .orderBy(desc(disputes.createdAt));

      return userDisputes;
    } catch (error) {
      console.error('Error getting user dispute history:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getDisputeEscrow(disputeId: number): Promise<any> {
    const [dispute] = await db.select().from(disputes)
      .where(eq(disputes.id, disputeId))
      .limit(1);

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    const [escrow] = await db.select().from(escrows)
      .where(eq(escrows.id, dispute.escrowId!))
      .limit(1);

    return escrow;
  }

  private async determineResolutionMethod(disputeId: number): Promise<ResolutionMethod> {
    // Logic to determine resolution method based on:
    // - Escrow value
    // - Parties' reputation
    // - Dispute type
    // - Evidence complexity
    
    const escrow = await this.getDisputeEscrow(disputeId);
    const escrowValue = parseFloat(escrow.amount);

    // High-value disputes go to DAO
    if (escrowValue > 1000) {
      return ResolutionMethod.DAO_GOVERNANCE;
    }

    // Medium-value disputes use community arbitrators
    if (escrowValue > 100) {
      return ResolutionMethod.COMMUNITY_ARBITRATOR;
    }

    // Low-value disputes can be automated
    return ResolutionMethod.AUTOMATED;
  }

  private async assignArbitrator(disputeId: number): Promise<void> {
    // In a real implementation, this would:
    // 1. Get list of available arbitrators
    // 2. Select based on expertise, availability, reputation
    // 3. Assign and notify

    await db.update(disputes)
      .set({ status: DisputeStatus.ARBITRATION_PENDING })
      .where(eq(disputes.id, disputeId));

    await this.logDisputeEvent(disputeId, 'arbitrator_assigned', 'system');
  }

  private async escalateToDAO(disputeId: number): Promise<void> {
    await db.update(disputes)
      .set({ status: DisputeStatus.DAO_ESCALATION })
      .where(eq(disputes.id, disputeId));

    await this.logDisputeEvent(disputeId, 'escalated_to_dao', 'system');
  }

  private async resolveAutomatically(disputeId: number): Promise<void> {
    // Automated resolution logic based on:
    // - Evidence patterns
    // - Historical similar cases
    // - Reputation scores
    
    // For now, default to no fault
    await this.resolveDispute(disputeId, VerdictType.NO_FAULT, 0, 'system', 'Automated resolution');
  }

  private async checkVotingCompletion(disputeId: number): Promise<void> {
    const [dispute] = await db.select().from(disputes)
      .where(eq(disputes.id, disputeId))
      .limit(1);

    if (!dispute || !dispute.resolution) return;

    const resolution = JSON.parse(dispute.resolution);
    const votes = resolution.votes || [];

    // Check if minimum votes reached (5 votes)
    if (votes.length >= 5) {
      await this.tallyVotes(disputeId, votes);
    }
  }

  private async tallyVotes(disputeId: number, votes: any[]): Promise<void> {
    const verdictCounts: Record<VerdictType, number> = {
      [VerdictType.FAVOR_BUYER]: 0,
      [VerdictType.FAVOR_SELLER]: 0,
      [VerdictType.PARTIAL_REFUND]: 0,
      [VerdictType.NO_FAULT]: 0
    };

    const verdictPowers: Record<VerdictType, number> = {
      [VerdictType.FAVOR_BUYER]: 0,
      [VerdictType.FAVOR_SELLER]: 0,
      [VerdictType.PARTIAL_REFUND]: 0,
      [VerdictType.NO_FAULT]: 0
    };

    // Tally votes by voting power
    votes.forEach((vote: any) => {
      verdictCounts[vote.verdict as VerdictType]++;
      verdictPowers[vote.verdict as VerdictType] += vote.votingPower;
    });

    // Find verdict with highest voting power
    let winningVerdict = VerdictType.NO_FAULT;
    let maxPower = 0;

    Object.entries(verdictPowers).forEach(([verdict, power]) => {
      if (power > maxPower) {
        maxPower = power;
        winningVerdict = verdict as VerdictType;
      }
    });

    await this.resolveDispute(disputeId, winningVerdict, 0, 'community', 'Community voting decision');
  }

  private async resolveDispute(
    disputeId: number,
    verdict: VerdictType,
    refundAmount: number,
    resolverId: string,
    reasoning: string
  ): Promise<void> {
    await db.update(disputes)
      .set({
        status: 'resolved',
        resolution: JSON.stringify({
          verdict,
          refundAmount,
          resolverId,
          reasoning,
          resolvedAt: new Date().toISOString()
        })
      })
      .where(eq(disputes.id, disputeId));

    // Update reputation based on verdict
    await this.updateReputationFromVerdict(disputeId, verdict);

    // Send notifications to parties
    const escrow = await this.getDisputeEscrow(disputeId);
    
    await this.notificationService.sendOrderNotification(
      escrow.buyerId!,
      'dispute_resolved',
      escrow.id.toString(),
      { disputeId, verdict, refundAmount }
    );

    await this.notificationService.sendOrderNotification(
      escrow.sellerId!,
      'dispute_resolved',
      escrow.id.toString(),
      { disputeId, verdict, refundAmount }
    );

    await this.logDisputeEvent(disputeId, 'dispute_resolved', resolverId);
  }

  private async updateReputationFromVerdict(disputeId: number, verdict: VerdictType): Promise<void> {
    const escrow = await this.getDisputeEscrow(disputeId);
    
    // Update reputation based on verdict (simplified for now)
    switch (verdict) {
      case VerdictType.FAVOR_BUYER:
        // In a real implementation, would update seller reputation negatively
        console.log(`Updating seller ${escrow.sellerId} reputation negatively for losing dispute`);
        break;
      case VerdictType.FAVOR_SELLER:
        // In a real implementation, would update buyer reputation negatively
        console.log(`Updating buyer ${escrow.buyerId} reputation negatively for losing dispute`);
        break;
      case VerdictType.PARTIAL_REFUND:
        // In a real implementation, would update both parties slightly negatively
        console.log(`Updating both parties reputation slightly negatively for partial dispute`);
        break;
      case VerdictType.NO_FAULT:
        // No reputation change
        break;
    }
  }

  private async logDisputeEvent(disputeId: number, eventType: string, userId: string): Promise<void> {
    // Log dispute events for analytics and audit trail
    console.log(`Dispute ${disputeId}: ${eventType} by ${userId} at ${new Date().toISOString()}`);
  }
}

export const disputeService = new DisputeService();

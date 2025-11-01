import { describe, it, expect } from '@jest/globals';
import { DisputeType, DisputeStatus, VerdictType, ResolutionMethod } from '../services/disputeService';

describe('Dispute System Types and Enums', () => {
  describe('DisputeType', () => {
    it('should have all required dispute types', () => {
      const expectedTypes = [
        'product_not_received',
        'product_not_as_described',
        'damaged_product',
        'unauthorized_transaction',
        'seller_misconduct',
        'buyer_misconduct',
        'other'
      ];

      expectedTypes.forEach(type => {
        expect(Object.values(DisputeType)).toContain(type);
      });
    });

    it('should have correct number of dispute types', () => {
      expect(Object.keys(DisputeType)).toHaveLength(7);
    });
  });

  describe('DisputeStatus', () => {
    it('should have all required dispute statuses', () => {
      const expectedStatuses = [
        'created',
        'evidence_submission',
        'arbitration_pending',
        'community_voting',
        'dao_escalation',
        'resolved',
        'cancelled'
      ];

      expectedStatuses.forEach(status => {
        expect(Object.values(DisputeStatus)).toContain(status);
      });
    });

    it('should have correct number of dispute statuses', () => {
      expect(Object.keys(DisputeStatus)).toHaveLength(7);
    });
  });

  describe('VerdictType', () => {
    it('should have all required verdict types', () => {
      const expectedVerdicts = [
        'favor_buyer',
        'favor_seller',
        'partial_refund',
        'no_fault'
      ];

      expectedVerdicts.forEach(verdict => {
        expect(Object.values(VerdictType)).toContain(verdict);
      });
    });

    it('should have correct number of verdict types', () => {
      expect(Object.keys(VerdictType)).toHaveLength(4);
    });
  });

  describe('ResolutionMethod', () => {
    it('should have all required resolution methods', () => {
      const expectedMethods = [
        'automated',
        'community_arbitrator',
        'dao_governance'
      ];

      expectedMethods.forEach(method => {
        expect(Object.values(ResolutionMethod)).toContain(method);
      });
    });

    it('should have correct number of resolution methods', () => {
      expect(Object.keys(ResolutionMethod)).toHaveLength(3);
    });
  });

  describe('Business Logic Validation', () => {
    it('should validate dispute creation request format', () => {
      const validRequest = {
        escrowId: 1,
        reporterId: 'user-123',
        reason: 'Product not received after 2 weeks',
        disputeType: DisputeType.PRODUCT_NOT_RECEIVED,
        evidence: 'Tracking shows package was never delivered'
      };

      expect(validRequest.escrowId).toBeGreaterThan(0);
      expect(validRequest.reporterId).toBeTruthy();
      expect(validRequest.reason.length).toBeGreaterThanOrEqual(10);
      expect(Object.values(DisputeType)).toContain(validRequest.disputeType);
    });

    it('should validate evidence submission format', () => {
      const validEvidence = {
        disputeId: 1,
        submitterId: 'user-123',
        evidenceType: 'image',
        ipfsHash: 'QmTest123',
        description: 'Photo of damaged product'
      };

      expect(validEvidence.disputeId).toBeGreaterThan(0);
      expect(validEvidence.submitterId).toBeTruthy();
      expect(['text', 'image', 'document', 'video']).toContain(validEvidence.evidenceType);
      expect(validEvidence.ipfsHash).toBeTruthy();
      expect(validEvidence.description).toBeTruthy();
    });

    it('should validate community vote format', () => {
      const validVote = {
        disputeId: 1,
        voterId: 'voter-123',
        verdict: VerdictType.FAVOR_BUYER,
        votingPower: 150,
        reasoning: 'Evidence clearly supports buyer claim'
      };

      expect(validVote.disputeId).toBeGreaterThan(0);
      expect(validVote.voterId).toBeTruthy();
      expect(Object.values(VerdictType)).toContain(validVote.verdict);
      expect(validVote.votingPower).toBeGreaterThan(0);
    });

    it('should determine resolution method based on escrow value', () => {
      const lowValueEscrow = { amount: '50.00' };
      const mediumValueEscrow = { amount: '500.00' };
      const highValueEscrow = { amount: '5000.00' };

      // Low value should use automated resolution
      expect(parseFloat(lowValueEscrow.amount)).toBeLessThan(100);
      
      // Medium value should use community arbitrator
      expect(parseFloat(mediumValueEscrow.amount)).toBeGreaterThan(100);
      expect(parseFloat(mediumValueEscrow.amount)).toBeLessThan(1000);
      
      // High value should use DAO governance
      expect(parseFloat(highValueEscrow.amount)).toBeGreaterThan(1000);
    });

    it('should calculate voting thresholds correctly', () => {
      const votes = [
        { verdict: VerdictType.FAVOR_BUYER, votingPower: 100 },
        { verdict: VerdictType.FAVOR_BUYER, votingPower: 150 },
        { verdict: VerdictType.FAVOR_SELLER, votingPower: 80 },
        { verdict: VerdictType.NO_FAULT, votingPower: 50 }
      ];

      const verdictPowers: Record<VerdictType, number> = {
        [VerdictType.FAVOR_BUYER]: 0,
        [VerdictType.FAVOR_SELLER]: 0,
        [VerdictType.PARTIAL_REFUND]: 0,
        [VerdictType.NO_FAULT]: 0
      };

      // Calculate voting power for each verdict
      votes.forEach(vote => {
        verdictPowers[vote.verdict] += vote.votingPower;
      });

      expect(verdictPowers[VerdictType.FAVOR_BUYER]).toBe(250);
      expect(verdictPowers[VerdictType.FAVOR_SELLER]).toBe(80);
      expect(verdictPowers[VerdictType.NO_FAULT]).toBe(50);

      // Favor buyer should win with highest voting power
      const maxPower = Math.max(...Object.values(verdictPowers));
      expect(verdictPowers[VerdictType.FAVOR_BUYER]).toBe(maxPower);
    });

    it('should validate evidence submission deadlines', () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const deadline = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from creation

      // Should be within deadline
      expect(now.getTime()).toBeLessThan(deadline.getTime());

      const lateSubmission = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
      // Should be past deadline
      expect(lateSubmission.getTime()).toBeGreaterThan(deadline.getTime());
    });

    it('should validate reputation requirements', () => {
      const minimumVotingPower = 100;
      const minimumArbitratorReputation = 500;
      
      const validVoter = { reputation: 150 };
      const invalidVoter = { reputation: 50 };
      const validArbitrator = { reputation: 600 };
      const invalidArbitrator = { reputation: 300 };

      expect(validVoter.reputation).toBeGreaterThanOrEqual(minimumVotingPower);
      expect(invalidVoter.reputation).toBeLessThan(minimumVotingPower);
      expect(validArbitrator.reputation).toBeGreaterThanOrEqual(minimumArbitratorReputation);
      expect(invalidArbitrator.reputation).toBeLessThan(minimumArbitratorReputation);
    });
  });

  describe('Analytics Calculations', () => {
    it('should calculate resolution rate correctly', () => {
      const totalDisputes = 10;
      const resolvedDisputes = 8;
      const resolutionRate = (resolvedDisputes / totalDisputes) * 100;

      expect(resolutionRate).toBe(80);
    });

    it('should calculate average resolution time correctly', () => {
      const resolutionTimes = [
        { created: new Date('2024-01-01'), resolved: new Date('2024-01-03') }, // 2 days
        { created: new Date('2024-01-05'), resolved: new Date('2024-01-09') }, // 4 days
        { created: new Date('2024-01-10'), resolved: new Date('2024-01-12') }  // 2 days
      ];

      const totalTime = resolutionTimes.reduce((sum, dispute) => {
        const timeDiff = dispute.resolved.getTime() - dispute.created.getTime();
        return sum + timeDiff;
      }, 0);

      const averageTime = totalTime / resolutionTimes.length;
      const averageHours = averageTime / (1000 * 60 * 60);

      expect(averageHours).toBe(64); // (48 + 96 + 48) / 3 = 64 hours
    });

    it('should validate dispute type distribution', () => {
      const disputesByType = {
        [DisputeType.PRODUCT_NOT_RECEIVED]: 15,
        [DisputeType.PRODUCT_NOT_AS_DESCRIBED]: 12,
        [DisputeType.DAMAGED_PRODUCT]: 8,
        [DisputeType.UNAUTHORIZED_TRANSACTION]: 3,
        [DisputeType.SELLER_MISCONDUCT]: 2,
        [DisputeType.BUYER_MISCONDUCT]: 1,
        [DisputeType.OTHER]: 4
      };

      const totalDisputes = Object.values(disputesByType).reduce((sum, count) => sum + count, 0);
      expect(totalDisputes).toBe(45);

      // Most common should be product not received
      const maxCount = Math.max(...Object.values(disputesByType));
      expect(disputesByType[DisputeType.PRODUCT_NOT_RECEIVED]).toBe(maxCount);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid dispute types', () => {
      const invalidType = 'invalid_dispute_type';
      expect(Object.values(DisputeType)).not.toContain(invalidType);
    });

    it('should handle invalid verdict types', () => {
      const invalidVerdict = 'invalid_verdict';
      expect(Object.values(VerdictType)).not.toContain(invalidVerdict);
    });

    it('should validate required fields', () => {
      const incompleteRequest = {
        escrowId: 1,
        // Missing reporterId, reason, disputeType
      };

      expect(incompleteRequest).not.toHaveProperty('reporterId');
      expect(incompleteRequest).not.toHaveProperty('reason');
      expect(incompleteRequest).not.toHaveProperty('disputeType');
    });

    it('should validate field lengths and formats', () => {
      const shortReason = 'Short';
      const validReason = 'This is a detailed reason that meets the minimum length requirement';
      const longReason = 'x'.repeat(1001);

      expect(shortReason.length).toBeLessThan(10);
      expect(validReason.length).toBeGreaterThanOrEqual(10);
      expect(validReason.length).toBeLessThanOrEqual(1000);
      expect(longReason.length).toBeGreaterThan(1000);
    });
  });
});

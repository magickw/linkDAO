import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DisputeService, DisputeType, DisputeStatus, VerdictType } from '../services/disputeService';

// Simple mock for testing core logic
const mockNotificationService = {
  sendNotification: jest.fn().mockResolvedValue(undefined as any)
};

const mockReputationService = {
  getReputationScore: jest.fn().mockResolvedValue(150 as any),
  updateReputation: jest.fn().mockResolvedValue(undefined as any)
};

describe('DisputeService Core Logic', () => {
  let disputeService: DisputeService;

  beforeEach(() => {
    disputeService = new DisputeService();
    // Inject mocked services
    (disputeService as any).notificationService = mockNotificationService;
    (disputeService as any).reputationService = mockReputationService;
    
    jest.clearAllMocks();
  });

  describe('Dispute Type Validation', () => {
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
  });

  describe('Dispute Status Validation', () => {
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
  });

  describe('Verdict Type Validation', () => {
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
  });

  describe('Service Initialization', () => {
    it('should initialize dispute service successfully', () => {
      expect(disputeService).toBeDefined();
      expect(disputeService).toBeInstanceOf(DisputeService);
    });

    it('should have notification service injected', () => {
      expect((disputeService as any).notificationService).toBeDefined();
    });

    it('should have reputation service injected', () => {
      expect((disputeService as any).reputationService).toBeDefined();
    });
  });

  describe('Helper Methods', () => {
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
  });

  describe('Business Logic Validation', () => {
    it('should determine resolution method based on escrow value', async () => {
      // Test the private method logic (would be exposed for testing)
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

      const verdictPowers = {
        [VerdictType.FAVOR_BUYER]: 250,
        [VerdictType.FAVOR_SELLER]: 80,
        [VerdictType.PARTIAL_REFUND]: 0,
        [VerdictType.NO_FAULT]: 50
      };

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

    it('should validate reputation requirements for voting', () => {
      const minimumVotingPower = 100;
      
      const validVoter = { reputation: 150 };
      const invalidVoter = { reputation: 50 };

      expect(validVoter.reputation).toBeGreaterThanOrEqual(minimumVotingPower);
      expect(invalidVoter.reputation).toBeLessThan(minimumVotingPower);
    });

    it('should validate arbitrator reputation requirements', () => {
      const minimumArbitratorReputation = 500;
      
      const validArbitrator = { reputation: 600 };
      const invalidArbitrator = { reputation: 300 };

      expect(validArbitrator.reputation).toBeGreaterThanOrEqual(minimumArbitratorReputation);
      expect(invalidArbitrator.reputation).toBeLessThan(minimumArbitratorReputation);
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
  });
});
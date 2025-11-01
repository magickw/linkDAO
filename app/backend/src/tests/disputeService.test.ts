import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DisputeService, CreateDisputeRequest, DisputeType, DisputeStatus, VerdictType } from '../services/disputeService';

// Mock the database connection
jest.mock('../db/connection', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('../services/notificationService');
jest.mock('../services/reputationService');

const { db } = require('../db/connection');

const mockDb = db as jest.Mocked<typeof db>;

describe('DisputeService', () => {
  let disputeService: DisputeService;
  let mockEscrow: any;
  let mockUser: any;

  beforeEach(() => {
    disputeService = new DisputeService();
    
    mockEscrow = {
      id: 1,
      buyerId: 'buyer-123',
      sellerId: 'seller-456',
      amount: '100.00',
      disputeOpened: false
    };

    mockUser = {
      id: 'user-123',
      walletAddress: '0x123...',
      handle: 'testuser'
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createDispute', () => {
    it('should create a dispute successfully', async () => {
      const request: CreateDisputeRequest = {
        escrowId: 1,
        reporterId: 'buyer-123',
        reason: 'Product not received after 2 weeks',
        disputeType: DisputeType.PRODUCT_NOT_RECEIVED,
        evidence: 'Tracking shows package was never delivered'
      };

      // Mock database responses
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockEscrow])
          })
        })
      } as any);

      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 1, ...request }])
        })
      } as any);

      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      } as any);

      const disputeId = await disputeService.createDispute(request);

      expect(disputeId).toBe(1);
      expect(mockDb.insert).toHaveBeenCalledWith(disputes);
      expect(mockDb.update).toHaveBeenCalledWith(escrows);
    });

    it('should throw error if escrow not found', async () => {
      const request: CreateDisputeRequest = {
        escrowId: 999,
        reporterId: 'buyer-123',
        reason: 'Product not received',
        disputeType: DisputeType.PRODUCT_NOT_RECEIVED
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      await expect(disputeService.createDispute(request)).rejects.toThrow('Escrow not found');
    });

    it('should throw error if dispute already exists', async () => {
      const request: CreateDisputeRequest = {
        escrowId: 1,
        reporterId: 'buyer-123',
        reason: 'Product not received',
        disputeType: DisputeType.PRODUCT_NOT_RECEIVED
      };

      const escrowWithDispute = { ...mockEscrow, disputeOpened: true };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([escrowWithDispute])
          })
        })
      });

      await expect(disputeService.createDispute(request)).rejects.toThrow('Dispute already exists for this escrow');
    });
  });

  describe('submitEvidence', () => {
    it('should submit evidence successfully', async () => {
      const mockDispute = {
        id: 1,
        escrowId: 1,
        status: DisputeStatus.EVIDENCE_SUBMISSION,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        evidence: JSON.stringify([])
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      // Mock getDisputeEscrow
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockEscrow])
          })
        })
      });

      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });

      const evidenceRequest = {
        disputeId: 1,
        submitterId: 'buyer-123',
        evidenceType: 'image',
        ipfsHash: 'QmTest123',
        description: 'Photo of damaged product'
      };

      await disputeService.submitEvidence(evidenceRequest);

      expect(mockDb.update).toHaveBeenCalledWith(disputes);
    });

    it('should throw error if dispute not in evidence submission phase', async () => {
      const mockDispute = {
        id: 1,
        status: DisputeStatus.RESOLVED,
        createdAt: new Date().toISOString(),
        evidence: JSON.stringify([])
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      const evidenceRequest = {
        disputeId: 1,
        submitterId: 'buyer-123',
        evidenceType: 'text',
        ipfsHash: 'QmTest123',
        description: 'Additional information'
      };

      await expect(disputeService.submitEvidence(evidenceRequest)).rejects.toThrow('Dispute is not in evidence submission phase');
    });

    it('should throw error if evidence submission deadline passed', async () => {
      const mockDispute = {
        id: 1,
        status: DisputeStatus.EVIDENCE_SUBMISSION,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
        evidence: JSON.stringify([])
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      const evidenceRequest = {
        disputeId: 1,
        submitterId: 'buyer-123',
        evidenceType: 'text',
        ipfsHash: 'QmTest123',
        description: 'Late evidence'
      };

      await expect(disputeService.submitEvidence(evidenceRequest)).rejects.toThrow('Evidence submission deadline has passed');
    });
  });

  describe('castCommunityVote', () => {
    it('should cast vote successfully', async () => {
      const mockDispute = {
        id: 1,
        status: DisputeStatus.COMMUNITY_VOTING,
        resolution: JSON.stringify({ votes: [] })
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });

      // Mock reputation service
      const mockReputationService = {
        getReputationScore: jest.fn().mockResolvedValue(150)
      };
      (disputeService as any).reputationService = mockReputationService;

      const vote = {
        disputeId: 1,
        voterId: 'voter-123',
        verdict: VerdictType.FAVOR_BUYER,
        votingPower: 150,
        reasoning: 'Evidence clearly shows buyer is right'
      };

      await disputeService.castCommunityVote(vote);

      expect(mockDb.update).toHaveBeenCalledWith(disputes);
      expect(mockReputationService.getReputationScore).toHaveBeenCalledWith('voter-123');
    });

    it('should throw error if user already voted', async () => {
      const existingVote = {
        voterId: 'voter-123',
        verdict: VerdictType.FAVOR_SELLER,
        votingPower: 100,
        timestamp: new Date().toISOString()
      };

      const mockDispute = {
        id: 1,
        status: DisputeStatus.COMMUNITY_VOTING,
        resolution: JSON.stringify({ votes: [existingVote] })
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      const vote = {
        disputeId: 1,
        voterId: 'voter-123',
        verdict: VerdictType.FAVOR_BUYER,
        votingPower: 150
      };

      await expect(disputeService.castCommunityVote(vote)).rejects.toThrow('User has already voted on this dispute');
    });

    it('should throw error if insufficient reputation', async () => {
      const mockDispute = {
        id: 1,
        status: DisputeStatus.COMMUNITY_VOTING,
        resolution: JSON.stringify({ votes: [] })
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      // Mock low reputation
      const mockReputationService = {
        getReputationScore: jest.fn().mockResolvedValue(50)
      };
      (disputeService as any).reputationService = mockReputationService;

      const vote = {
        disputeId: 1,
        voterId: 'voter-123',
        verdict: VerdictType.FAVOR_BUYER,
        votingPower: 50
      };

      await expect(disputeService.castCommunityVote(vote)).rejects.toThrow('Insufficient reputation to vote');
    });
  });

  describe('resolveAsArbitrator', () => {
    it('should resolve dispute successfully', async () => {
      const mockDispute = {
        id: 1,
        status: DisputeStatus.ARBITRATION_PENDING
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      // Mock high reputation for arbitrator
      const mockReputationService = {
        getReputationScore: jest.fn().mockResolvedValue(600),
        updateReputation: jest.fn().mockResolvedValue(undefined)
      };
      (disputeService as any).reputationService = mockReputationService;

      // Mock getDisputeEscrow and other database calls
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockEscrow])
          })
        })
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });

      const decision = {
        disputeId: 1,
        arbitratorId: 'arbitrator-123',
        verdict: VerdictType.FAVOR_BUYER,
        refundAmount: 100,
        reasoning: 'Evidence clearly supports buyer claim'
      };

      await disputeService.resolveAsArbitrator(decision);

      expect(mockReputationService.getReputationScore).toHaveBeenCalledWith('arbitrator-123');
    });

    it('should throw error if arbitrator has insufficient reputation', async () => {
      const mockDispute = {
        id: 1,
        status: DisputeStatus.ARBITRATION_PENDING
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      // Mock low reputation
      const mockReputationService = {
        getReputationScore: jest.fn().mockResolvedValue(300)
      };
      (disputeService as any).reputationService = mockReputationService;

      const decision = {
        disputeId: 1,
        arbitratorId: 'arbitrator-123',
        verdict: VerdictType.FAVOR_BUYER,
        reasoning: 'Decision reasoning'
      };

      await expect(disputeService.resolveAsArbitrator(decision)).rejects.toThrow('Insufficient reputation to arbitrate');
    });
  });

  describe('getDisputeAnalytics', () => {
    it('should return dispute analytics', async () => {
      // Mock database queries for analytics
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue([{ count: 10 }])
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue([{ count: 8 }])
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue([
            {
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              resolvedAt: new Date().toISOString()
            }
          ])
        })
      });

      const analytics = await disputeService.getDisputeAnalytics();

      expect(analytics).toHaveProperty('totalDisputes');
      expect(analytics).toHaveProperty('resolvedDisputes');
      expect(analytics).toHaveProperty('averageResolutionTime');
      expect(analytics).toHaveProperty('disputesByType');
      expect(analytics).toHaveProperty('verdictsByType');
    });
  });

  describe('getUserDisputeHistory', () => {
    it('should return user dispute history', async () => {
      const mockDisputes = [
        {
          id: 1,
          reporterId: 'user-123',
          reason: 'Product not received',
          status: DisputeStatus.RESOLVED,
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          reporterId: 'user-123',
          reason: 'Product damaged',
          status: DisputeStatus.EVIDENCE_SUBMISSION,
          createdAt: new Date().toISOString()
        }
      ];

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockDisputes)
          })
        })
      });

      const history = await disputeService.getUserDisputeHistory('user-123');

      expect(history).toHaveLength(2);
      expect(history[0]).toHaveProperty('id', 1);
      expect(history[1]).toHaveProperty('id', 2);
    });
  });

  describe('proceedToArbitration', () => {
    it('should proceed to arbitration for community arbitrator method', async () => {
      const mockDispute = {
        id: 1,
        status: DisputeStatus.EVIDENCE_SUBMISSION,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() // 4 days ago
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      // Mock getDisputeEscrow
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockEscrow])
          })
        })
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });

      await disputeService.proceedToArbitration(1);

      expect(mockDb.update).toHaveBeenCalledWith(disputes);
    });

    it('should throw error if evidence submission period not ended', async () => {
      const mockDispute = {
        id: 1,
        status: DisputeStatus.EVIDENCE_SUBMISSION,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockDispute])
          })
        })
      });

      await expect(disputeService.proceedToArbitration(1)).rejects.toThrow('Evidence submission period has not ended');
    });
  });
});

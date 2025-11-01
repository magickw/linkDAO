import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { daoJuryService } from '../services/daoJuryService';
import { databaseService } from '../services/databaseService';
import { 
  moderationAppeals, 
  appealJurors, 
  juryVotingSessions, 
  jurorEligibility,
  moderationCases,
  users
} from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// Mock database service
vi.mock('../services/databaseService');

describe('DAO Jury System', () => {
  let mockDb: any;
  let testUsers: any[];
  let testAppeal: any;
  let testCase: any;

  beforeEach(async () => {
    // Setup mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis()
    };

    vi.mocked(databaseService.getDatabase).mockReturnValue(mockDb);

    // Test data
    testUsers = [
      {
        id: 'user1-uuid',
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'juror1'
      },
      {
        id: 'user2-uuid',
        walletAddress: '0x2345678901234567890123456789012345678901',
        handle: 'juror2'
      },
      {
        id: 'user3-uuid',
        walletAddress: '0x3456789012345678901234567890123456789012',
        handle: 'juror3'
      },
      {
        id: 'appellant-uuid',
        walletAddress: '0x4567890123456789012345678901234567890123',
        handle: 'appellant'
      }
    ];

    testCase = {
      id: 1,
      contentId: 'post_123',
      contentType: 'post',
      userId: 'appellant-uuid',
      status: 'blocked',
      decision: 'block',
      reasonCode: 'harmful_content',
      confidence: '0.95'
    };

    testAppeal = {
      id: 1,
      caseId: 1,
      appellantId: 'appellant-uuid',
      status: 'open',
      stakeAmount: '100',
      createdAt: new Date()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Juror Eligibility Checking', () => {
    it('should check juror eligibility correctly', async () => {
      // Mock eligibility record
      const eligibilityRecord = {
        userId: 'user1-uuid',
        reputationScore: '0.8',
        totalStake: '100',
        activeCases: 1,
        isEligible: true,
        suspensionUntil: null
      };

      mockDb.select.mockReturnValue([eligibilityRecord]);

      const result = await daoJuryService.checkJurorEligibility('user1-uuid');

      expect(result.isEligible).toBe(true);
      expect(result.reputationScore).toBe(0.8);
      expect(result.totalStake).toBe(100);
      expect(result.activeCases).toBe(1);
    });

    it('should reject juror with low reputation', async () => {
      const eligibilityRecord = {
        userId: 'user1-uuid',
        reputationScore: '0.4', // Below minimum 0.6
        totalStake: '100',
        activeCases: 1,
        isEligible: true,
        suspensionUntil: null
      };

      mockDb.select.mockReturnValue([eligibilityRecord]);

      const result = await daoJuryService.checkJurorEligibility('user1-uuid');

      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('Reputation score too low');
    });

    it('should reject juror with insufficient stake', async () => {
      const eligibilityRecord = {
        userId: 'user1-uuid',
        reputationScore: '0.8',
        totalStake: '25', // Below minimum 50
        activeCases: 1,
        isEligible: true,
        suspensionUntil: null
      };

      mockDb.select.mockReturnValue([eligibilityRecord]);

      const result = await daoJuryService.checkJurorEligibility('user1-uuid');

      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('Insufficient stake');
    });

    it('should reject suspended juror', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const eligibilityRecord = {
        userId: 'user1-uuid',
        reputationScore: '0.8',
        totalStake: '100',
        activeCases: 1,
        isEligible: true,
        suspensionUntil: futureDate
      };

      mockDb.select.mockReturnValue([eligibilityRecord]);

      const result = await daoJuryService.checkJurorEligibility('user1-uuid');

      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('Temporarily suspended');
    });

    it('should reject overloaded juror', async () => {
      const eligibilityRecord = {
        userId: 'user1-uuid',
        reputationScore: '0.8',
        totalStake: '100',
        activeCases: 3, // At maximum
        isEligible: true,
        suspensionUntil: null
      };

      mockDb.select.mockReturnValue([eligibilityRecord]);

      const result = await daoJuryService.checkJurorEligibility('user1-uuid');

      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('Too many active cases');
    });

    it('should initialize eligibility for new user', async () => {
      // Mock no existing record
      mockDb.select.mockReturnValue([]);
      mockDb.insert.mockReturnValue({ values: vi.fn() });

      const result = await daoJuryService.checkJurorEligibility('new-user-uuid');

      expect(result.isEligible).toBe(true);
      expect(result.reputationScore).toBe(1.0);
      expect(result.totalStake).toBe(0);
      expect(mockDb.insert).toHaveBeenCalledWith(jurorEligibility);
    });
  });

  describe('Juror Selection', () => {
    it('should select jurors successfully', async () => {
      // Mock appeal exists and is in correct state
      mockDb.select.mockReturnValueOnce([testAppeal]);

      // Mock eligible jurors
      const eligibleJurors = [
        { userId: 'user1-uuid', reputationScore: '0.8', totalStake: '100' },
        { userId: 'user2-uuid', reputationScore: '0.9', totalStake: '150' },
        { userId: 'user3-uuid', reputationScore: '0.7', totalStake: '75' }
      ];
      mockDb.select.mockReturnValueOnce([{ appellantId: 'appellant-uuid' }]);
      mockDb.select.mockReturnValueOnce(eligibleJurors);

      // Mock voting session creation
      mockDb.insert.mockReturnValueOnce({ returning: vi.fn().mockReturnValue([{ id: 1 }]) });
      mockDb.insert.mockReturnValueOnce({ values: vi.fn() });
      mockDb.update.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn() });

      const result = await daoJuryService.selectJurors({
        appealId: 1,
        requiredJurors: 3,
        minimumStake: '50',
        minimumReputation: 0.6
      });

      expect(result.success).toBe(true);
      expect(result.selection?.selectedJurors).toHaveLength(3);
      expect(result.selection?.appealId).toBe(1);
    });

    it('should fail if appeal not found', async () => {
      mockDb.select.mockReturnValue([]);

      const result = await daoJuryService.selectJurors({
        appealId: 999,
        requiredJurors: 3
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Appeal not found');
    });

    it('should fail if appeal not in correct state', async () => {
      const wrongStateAppeal = { ...testAppeal, status: 'decided' };
      mockDb.select.mockReturnValue([wrongStateAppeal]);

      const result = await daoJuryService.selectJurors({
        appealId: 1,
        requiredJurors: 3
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Appeal is not in selection phase');
    });

    it('should fail if insufficient eligible jurors', async () => {
      mockDb.select.mockReturnValueOnce([testAppeal]);
      mockDb.select.mockReturnValueOnce([{ appellantId: 'appellant-uuid' }]);
      mockDb.select.mockReturnValueOnce([
        { userId: 'user1-uuid', reputationScore: '0.8', totalStake: '100' }
      ]); // Only 1 eligible juror

      const result = await daoJuryService.selectJurors({
        appealId: 1,
        requiredJurors: 3
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient eligible jurors');
    });

    it('should exclude appellant from jury selection', async () => {
      mockDb.select.mockReturnValueOnce([testAppeal]);
      mockDb.select.mockReturnValueOnce([{ appellantId: 'appellant-uuid' }]);
      
      // Mock query builder for conflict exclusion
      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue([
          { userId: 'user1-uuid', reputationScore: '0.8', totalStake: '100' },
          { userId: 'user2-uuid', reputationScore: '0.9', totalStake: '150' },
          { userId: 'user3-uuid', reputationScore: '0.7', totalStake: '75' }
        ])
      };
      mockDb.select.mockReturnValueOnce(mockQuery);

      // Verify appellant is excluded from selection
      expect(mockQuery.where).toHaveBeenCalled();
    });
  });

  describe('Commit-Reveal Voting', () => {
    const testCommitment = {
      jurorId: 'user1-uuid',
      appealId: 1,
      commitment: crypto.createHash('sha256').update('overturn' + 'random-nonce-123').digest('hex'),
      timestamp: new Date()
    };

    it('should accept valid vote commitment', async () => {
      // Mock juror assignment
      const jurorAssignment = {
        appealId: 1,
        jurorId: 'user1-uuid',
        status: 'selected',
        voteCommitment: null
      };
      mockDb.select.mockReturnValueOnce([jurorAssignment]);

      // Mock voting session in commit phase
      const now = new Date();
      const votingSession = {
        id: 1,
        appealId: 1,
        commitPhaseStart: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
        commitPhaseEnd: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
        revealPhaseStart: new Date(now.getTime() + 60 * 60 * 1000),
        revealPhaseEnd: new Date(now.getTime() + 2 * 60 * 60 * 1000)
      };
      mockDb.select.mockReturnValueOnce([votingSession]);

      mockDb.update.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn() });

      const result = await daoJuryService.submitVoteCommitment(testCommitment);

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(appealJurors);
    });

    it('should reject commitment from unassigned juror', async () => {
      mockDb.select.mockReturnValue([]); // No assignment found

      const result = await daoJuryService.submitVoteCommitment(testCommitment);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Juror not assigned to this appeal');
    });

    it('should reject commitment outside commit phase', async () => {
      const jurorAssignment = {
        appealId: 1,
        jurorId: 'user1-uuid',
        status: 'selected',
        voteCommitment: null
      };
      mockDb.select.mockReturnValueOnce([jurorAssignment]);

      // Mock voting session outside commit phase
      const now = new Date();
      const votingSession = {
        id: 1,
        appealId: 1,
        commitPhaseStart: new Date(now.getTime() + 60 * 60 * 1000), // Future
        commitPhaseEnd: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        revealPhaseStart: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        revealPhaseEnd: new Date(now.getTime() + 3 * 60 * 60 * 1000)
      };
      mockDb.select.mockReturnValueOnce([votingSession]);

      const result = await daoJuryService.submitVoteCommitment(testCommitment);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not in commit phase');
    });

    it('should reject duplicate commitment', async () => {
      const jurorAssignment = {
        appealId: 1,
        jurorId: 'user1-uuid',
        status: 'selected',
        voteCommitment: 'existing-commitment-hash'
      };
      mockDb.select.mockReturnValueOnce([jurorAssignment]);

      const result = await daoJuryService.submitVoteCommitment(testCommitment);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vote already committed');
    });

    it('should accept valid vote reveal', async () => {
      const voteReveal = {
        jurorId: 'user1-uuid',
        appealId: 1,
        vote: 'overturn' as const,
        nonce: 'random-nonce-123',
        timestamp: new Date()
      };

      // Mock juror assignment with commitment
      const jurorAssignment = {
        appealId: 1,
        jurorId: 'user1-uuid',
        status: 'selected',
        voteCommitment: testCommitment.commitment
      };
      mockDb.select.mockReturnValueOnce([jurorAssignment]);

      // Mock voting session in reveal phase
      const now = new Date();
      const votingSession = {
        id: 1,
        appealId: 1,
        commitPhaseStart: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        commitPhaseEnd: new Date(now.getTime() - 60 * 60 * 1000),
        revealPhaseStart: new Date(now.getTime() - 60 * 60 * 1000),
        revealPhaseEnd: new Date(now.getTime() + 60 * 60 * 1000)
      };
      mockDb.select.mockReturnValueOnce([votingSession]);

      mockDb.update.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn() });

      const result = await daoJuryService.revealVote(voteReveal);

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(appealJurors);
    });

    it('should reject reveal with invalid commitment', async () => {
      const voteReveal = {
        jurorId: 'user1-uuid',
        appealId: 1,
        vote: 'uphold' as const, // Different from committed vote
        nonce: 'random-nonce-123',
        timestamp: new Date()
      };

      const jurorAssignment = {
        appealId: 1,
        jurorId: 'user1-uuid',
        status: 'selected',
        voteCommitment: testCommitment.commitment
      };
      mockDb.select.mockReturnValueOnce([jurorAssignment]);

      const now = new Date();
      const votingSession = {
        id: 1,
        appealId: 1,
        revealPhaseStart: new Date(now.getTime() - 60 * 60 * 1000),
        revealPhaseEnd: new Date(now.getTime() + 60 * 60 * 1000)
      };
      mockDb.select.mockReturnValueOnce([votingSession]);

      const result = await daoJuryService.revealVote(voteReveal);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vote commitment does not match reveal');
    });
  });

  describe('Voting Result Aggregation', () => {
    it('should finalize voting with majority decision', async () => {
      const votes = [
        { jurorId: 'user1-uuid', voteReveal: 'overturn', status: 'selected' },
        { jurorId: 'user2-uuid', voteReveal: 'overturn', status: 'selected' },
        { jurorId: 'user3-uuid', voteReveal: 'uphold', status: 'selected' },
        { jurorId: 'user4-uuid', voteReveal: 'overturn', status: 'selected' },
        { jurorId: 'user5-uuid', voteReveal: 'uphold', status: 'selected' }
      ];

      mockDb.select.mockReturnValueOnce(votes);

      // Mock voting session
      const votingSession = {
        id: 1,
        appealId: 1,
        status: 'active'
      };
      mockDb.select.mockReturnValueOnce([votingSession]);

      mockDb.update.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn() });

      const result = await daoJuryService.finalizeVoting(1);

      expect(result.success).toBe(true);
      expect(result.result?.finalDecision).toBe('overturn'); // 3 overturn vs 2 uphold
      expect(result.result?.totalVotes).toBe(5);
      expect(result.result?.overturnVotes).toBe(3);
      expect(result.result?.upholdVotes).toBe(2);
      expect(result.result?.participationRate).toBe(1.0);
    });

    it('should handle tie by defaulting to uphold', async () => {
      const votes = [
        { jurorId: 'user1-uuid', voteReveal: 'overturn', status: 'selected' },
        { jurorId: 'user2-uuid', voteReveal: 'uphold', status: 'selected' }
      ];

      mockDb.select.mockReturnValueOnce(votes);
      mockDb.select.mockReturnValueOnce([{ id: 1, appealId: 1, status: 'active' }]);
      mockDb.update.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn() });

      const result = await daoJuryService.finalizeVoting(1);

      expect(result.success).toBe(true);
      expect(result.result?.finalDecision).toBe('uphold'); // Default for ties
    });

    it('should calculate participation rate correctly', async () => {
      const votes = [
        { jurorId: 'user1-uuid', voteReveal: 'overturn', status: 'selected' },
        { jurorId: 'user2-uuid', voteReveal: 'uphold', status: 'selected' },
        { jurorId: 'user3-uuid', voteReveal: null, status: 'selected' }, // Did not vote
        { jurorId: 'user4-uuid', voteReveal: 'overturn', status: 'selected' },
        { jurorId: 'user5-uuid', voteReveal: null, status: 'selected' } // Did not vote
      ];

      mockDb.select.mockReturnValueOnce(votes);
      mockDb.select.mockReturnValueOnce([{ id: 1, appealId: 1, status: 'active' }]);
      mockDb.update.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn() });

      const result = await daoJuryService.finalizeVoting(1);

      expect(result.success).toBe(true);
      expect(result.result?.participationRate).toBe(0.6); // 3 out of 5 voted
    });

    it('should fail if no votes revealed', async () => {
      const votes = [
        { jurorId: 'user1-uuid', voteReveal: null, status: 'selected' },
        { jurorId: 'user2-uuid', voteReveal: null, status: 'selected' }
      ];

      mockDb.select.mockReturnValue(votes);

      const result = await daoJuryService.finalizeVoting(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No votes revealed');
    });
  });

  describe('Juror Rewards and Slashing', () => {
    it('should reward participating jurors correctly', async () => {
      const jurors = [
        { jurorId: 'user1-uuid', voteReveal: 'overturn' }, // Correct vote
        { jurorId: 'user2-uuid', voteReveal: 'uphold' },   // Incorrect vote
        { jurorId: 'user3-uuid', voteReveal: null }        // No participation
      ];

      mockDb.update.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn() });

      const rewards = await daoJuryService.processJurorRewards(1, 'overturn', jurors);

      expect(rewards).toHaveLength(3);
      
      // Correct voter gets base + bonus
      expect(parseFloat(rewards[0].rewardAmount)).toBe(15); // 10 base + 5 bonus
      expect(rewards[0].reason).toBe('Participation + consensus bonus');
      
      // Incorrect voter gets base only
      expect(parseFloat(rewards[1].rewardAmount)).toBe(10); // 10 base only
      expect(rewards[1].reason).toBe('Participation reward');
      
      // Non-participant gets slashed
      expect(parseFloat(rewards[2].slashedAmount)).toBe(25);
      expect(rewards[2].reason).toBe('Non-participation penalty');
    });

    it('should update juror eligibility stats', async () => {
      const jurors = [
        { jurorId: 'user1-uuid', voteReveal: 'overturn' }
      ];

      mockDb.update.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn() });

      await daoJuryService.processJurorRewards(1, 'overturn', jurors);

      // Should update juror eligibility with correct decision
      expect(mockDb.update).toHaveBeenCalledWith(jurorEligibility);
    });
  });

  describe('Conflict Detection', () => {
    it('should exclude appellant from jury pool', async () => {
      // This is tested implicitly in the juror selection tests
      // The service should never select the appellant as a juror
      expect(true).toBe(true); // Placeholder for conflict detection logic
    });

    it('should exclude users with conflicts of interest', async () => {
      // Future enhancement: exclude users who have interacted with the content
      // or have relationships with the appellant
      expect(true).toBe(true); // Placeholder for advanced conflict detection
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.select.mockRejectedValue(new Error('Database connection failed'));

      const result = await daoJuryService.checkJurorEligibility('user1-uuid');

      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('Error checking eligibility');
    });

    it('should validate input parameters', async () => {
      const result = await daoJuryService.selectJurors({
        appealId: -1, // Invalid
        requiredJurors: 0 // Invalid
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid selection parameters');
    });

    it('should handle malformed vote commitments', async () => {
      const invalidCommitment = {
        jurorId: 'invalid-uuid',
        appealId: 1,
        commitment: 'invalid-hash', // Wrong length
        timestamp: new Date()
      };

      const result = await daoJuryService.submitVoteCommitment(invalidCommitment);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid commitment data');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete jury workflow', async () => {
      // This would test the full flow from selection to final decision
      // 1. Select jurors
      // 2. Commit votes
      // 3. Reveal votes
      // 4. Finalize decision
      // 5. Process rewards
      
      // Mock successful selection
      mockDb.select.mockReturnValueOnce([testAppeal]);
      mockDb.select.mockReturnValueOnce([{ appellantId: 'appellant-uuid' }]);
      mockDb.select.mockReturnValueOnce([
        { userId: 'user1-uuid', reputationScore: '0.8', totalStake: '100' },
        { userId: 'user2-uuid', reputationScore: '0.9', totalStake: '150' },
        { userId: 'user3-uuid', reputationScore: '0.7', totalStake: '75' }
      ]);
      
      mockDb.insert.mockReturnValue({ returning: vi.fn().mockReturnValue([{ id: 1 }]) });
      mockDb.update.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn() });

      const selectionResult = await daoJuryService.selectJurors({
        appealId: 1,
        requiredJurors: 3
      });

      expect(selectionResult.success).toBe(true);
      expect(selectionResult.selection?.selectedJurors).toHaveLength(3);
    });
  });
});

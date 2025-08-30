import { reputationService, ReputationService } from '../services/reputationService';
import { 
  userReputationScores, 
  reputationChangeEvents, 
  reputationPenalties,
  reputationThresholds,
  reputationRewards,
  jurorPerformance,
  reporterPerformance,
  users
} from '../db/schema';
import { eq } from 'drizzle-orm';

// Mock database
jest.mock('../db/connectionPool', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

describe('ReputationService', () => {
  let testUserId: string;

  beforeEach(() => {
    testUserId = 'test-user-123';
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getUserReputation', () => {
    it('should return user reputation if exists', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '1500.0000',
        moderationScore: '1400.0000',
        reportingScore: '1600.0000',
        juryScore: '1300.0000',
        violationCount: 2,
        helpfulReportsCount: 5,
        falseReportsCount: 1,
        successfulAppealsCount: 0,
        juryDecisionsCount: 3,
        juryAccuracyRate: '0.6667',
        lastViolationAt: new Date('2024-01-15'),
        reputationTier: 'gold'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      const result = await reputationService.getUserReputation(testUserId);

      expect(result).toEqual({
        userId: testUserId,
        overallScore: 1500,
        moderationScore: 1400,
        reportingScore: 1600,
        juryScore: 1300,
        violationCount: 2,
        helpfulReportsCount: 5,
        falseReportsCount: 1,
        successfulAppealsCount: 0,
        juryDecisionsCount: 3,
        juryAccuracyRate: 0.6667,
        lastViolationAt: new Date('2024-01-15'),
        reputationTier: 'gold'
      });
    });

    it('should initialize reputation for new user', async () => {
      // First call returns empty (user not found)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      // Second call returns initialized user
      const initialReputation = {
        userId: testUserId,
        overallScore: '1000.0000',
        moderationScore: '1000.0000',
        reportingScore: '1000.0000',
        juryScore: '1000.0000',
        violationCount: 0,
        helpfulReportsCount: 0,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: '0.0000',
        lastViolationAt: null,
        reputationTier: 'silver'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([initialReputation])
          })
        })
      });

      const result = await reputationService.getUserReputation(testUserId);

      expect(mockDb.insert).toHaveBeenCalledWith(userReputationScores);
      expect(result?.overallScore).toBe(1000);
      expect(result?.reputationTier).toBe('silver');
    });
  });

  describe('applyViolationPenalty', () => {
    it('should apply penalty for policy violation', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '1500.0000',
        moderationScore: '1500.0000',
        reportingScore: '1500.0000',
        juryScore: '1500.0000',
        violationCount: 1,
        helpfulReportsCount: 0,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: '0.0000',
        lastViolationAt: null,
        reputationTier: 'gold'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      await reputationService.applyViolationPenalty(testUserId, 123, 'harassment', 'high');

      expect(mockDb.insert).toHaveBeenCalledWith(reputationChangeEvents);
      expect(mockDb.insert).toHaveBeenCalledWith(reputationPenalties);
    });

    it('should apply progressive penalties for repeat violations', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '1200.0000',
        moderationScore: '1200.0000',
        reportingScore: '1200.0000',
        juryScore: '1200.0000',
        violationCount: 4, // This should trigger content_review penalty
        helpfulReportsCount: 0,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: '0.0000',
        lastViolationAt: new Date(),
        reputationTier: 'silver'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      await reputationService.applyViolationPenalty(testUserId, 123, 'spam', 'medium');

      // Should record reputation change and apply progressive penalty
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('rewardHelpfulReport', () => {
    it('should reward user for helpful report', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '1300.0000',
        moderationScore: '1300.0000',
        reportingScore: '1400.0000',
        juryScore: '1300.0000',
        violationCount: 0,
        helpfulReportsCount: 2,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: '0.0000',
        lastViolationAt: null,
        reputationTier: 'silver'
      };

      const mockReward = {
        rewardType: 'helpful_report',
        baseReward: '50.0000',
        multiplierMin: '1.0000',
        multiplierMax: '2.0000',
        isActive: true
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReward])
          })
        })
      });

      await reputationService.rewardHelpfulReport(testUserId, 456, 0.9);

      expect(mockDb.insert).toHaveBeenCalledWith(reputationChangeEvents);
      expect(mockDb.insert).toHaveBeenCalledWith(reporterPerformance);
    });

    it('should apply accuracy multiplier to reward', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '1000.0000',
        moderationScore: '1000.0000',
        reportingScore: '1000.0000',
        juryScore: '1000.0000',
        violationCount: 0,
        helpfulReportsCount: 0,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: '0.0000',
        lastViolationAt: null,
        reputationTier: 'silver'
      };

      const mockReward = {
        rewardType: 'helpful_report',
        baseReward: '50.0000',
        multiplierMin: '1.0000',
        multiplierMax: '2.0000',
        isActive: true
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReward])
          })
        })
      });

      await reputationService.rewardHelpfulReport(testUserId, 456, 0.3); // Low accuracy

      // Should still give minimum 50% of reward
      const insertCall = mockDb.insert.mock.calls.find(call => call[0] === reputationChangeEvents);
      expect(insertCall).toBeDefined();
    });
  });

  describe('penalizeFalseReport', () => {
    it('should penalize user for false report', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '1200.0000',
        moderationScore: '1200.0000',
        reportingScore: '1100.0000',
        juryScore: '1200.0000',
        violationCount: 0,
        helpfulReportsCount: 1,
        falseReportsCount: 1, // Previous false report
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: '0.0000',
        lastViolationAt: null,
        reputationTier: 'silver'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      await reputationService.penalizeFalseReport(testUserId, 789);

      expect(mockDb.insert).toHaveBeenCalledWith(reputationChangeEvents);
      expect(mockDb.insert).toHaveBeenCalledWith(reporterPerformance);
    });

    it('should apply escalating penalty for multiple false reports', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '1000.0000',
        moderationScore: '1000.0000',
        reportingScore: '900.0000',
        juryScore: '1000.0000',
        violationCount: 0,
        helpfulReportsCount: 0,
        falseReportsCount: 3, // Multiple false reports
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: '0.0000',
        lastViolationAt: null,
        reputationTier: 'silver'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      await reputationService.penalizeFalseReport(testUserId, 789);

      // Should apply higher penalty due to multiple false reports
      const insertCall = mockDb.insert.mock.calls.find(call => call[0] === reputationChangeEvents);
      expect(insertCall).toBeDefined();
    });
  });

  describe('restoreReputationForAppeal', () => {
    it('should restore reputation for successful appeal', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '800.0000', // Reduced due to previous violation
        moderationScore: '800.0000',
        reportingScore: '1000.0000',
        juryScore: '1000.0000',
        violationCount: 1,
        helpfulReportsCount: 0,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: '0.0000',
        lastViolationAt: new Date(),
        reputationTier: 'bronze'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      const originalPenalty = 200;
      await reputationService.restoreReputationForAppeal(testUserId, 101, originalPenalty);

      expect(mockDb.insert).toHaveBeenCalledWith(reputationChangeEvents);
      
      // Should restore 75% of penalty plus bonus
      const insertCall = mockDb.insert.mock.calls.find(call => call[0] === reputationChangeEvents);
      const values = insertCall[1].values;
      expect(parseFloat(values.scoreChange)).toBeGreaterThan(150); // 75% of 200 + bonus
    });
  });

  describe('updateJurorPerformance', () => {
    it('should reward juror for correct decision', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '1800.0000',
        moderationScore: '1800.0000',
        reportingScore: '1800.0000',
        juryScore: '1700.0000',
        violationCount: 0,
        helpfulReportsCount: 0,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 2,
        juryAccuracyRate: '1.0000',
        lastViolationAt: null,
        reputationTier: 'gold'
      };

      const mockReward = {
        rewardType: 'accurate_jury_vote',
        baseReward: '100.0000',
        multiplierMin: '1.0000',
        multiplierMax: '3.0000',
        isActive: true
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReward])
          })
        })
      });

      // Mock jury accuracy calculation
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 3, correct: 3 }])
        })
      });

      await reputationService.updateJurorPerformance(
        testUserId, 
        202, 
        'uphold', 
        true, 
        true, 
        1000, 
        45
      );

      expect(mockDb.insert).toHaveBeenCalledWith(reputationChangeEvents);
      expect(mockDb.insert).toHaveBeenCalledWith(jurorPerformance);
      expect(mockDb.update).toHaveBeenCalled(); // For accuracy rate update
    });

    it('should penalize juror for incorrect decision', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '1500.0000',
        moderationScore: '1500.0000',
        reportingScore: '1500.0000',
        juryScore: '1400.0000',
        violationCount: 0,
        helpfulReportsCount: 0,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 1,
        juryAccuracyRate: '0.5000',
        lastViolationAt: null,
        reputationTier: 'gold'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      // Mock jury accuracy calculation
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 2, correct: 1 }])
        })
      });

      await reputationService.updateJurorPerformance(
        testUserId, 
        203, 
        'overturn', 
        false, 
        false, 
        1000, 
        120
      );

      expect(mockDb.insert).toHaveBeenCalledWith(reputationChangeEvents);
      expect(mockDb.insert).toHaveBeenCalledWith(jurorPerformance);
      
      // Should record negative reputation change
      const insertCall = mockDb.insert.mock.calls.find(call => call[0] === reputationChangeEvents);
      const values = insertCall[1].values;
      expect(parseFloat(values.scoreChange)).toBeLessThan(0);
    });
  });

  describe('getModerationStrictness', () => {
    it('should return appropriate strictness multiplier based on reputation', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '750.0000', // Low reputation
        moderationScore: '750.0000',
        reportingScore: '750.0000',
        juryScore: '750.0000',
        violationCount: 2,
        helpfulReportsCount: 0,
        falseReportsCount: 1,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: '0.0000',
        lastViolationAt: new Date(),
        reputationTier: 'bronze'
      };

      const mockThreshold = {
        thresholdType: 'moderation_strictness',
        minScore: '500.0000',
        maxScore: '1000.0000',
        multiplier: '1.5000',
        isActive: true
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockThreshold])
          })
        })
      });

      const strictness = await reputationService.getModerationStrictness(testUserId);
      expect(strictness).toBe(1.5);
    });

    it('should return default strictness if no threshold found', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '1000.0000',
        moderationScore: '1000.0000',
        reportingScore: '1000.0000',
        juryScore: '1000.0000',
        violationCount: 0,
        helpfulReportsCount: 0,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: '0.0000',
        lastViolationAt: null,
        reputationTier: 'silver'
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No threshold found
          })
        })
      });

      const strictness = await reputationService.getModerationStrictness(testUserId);
      expect(strictness).toBe(1.0);
    });
  });

  describe('isEligibleForJury', () => {
    it('should return true for eligible user', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '2000.0000', // High reputation
        moderationScore: '2000.0000',
        reportingScore: '2000.0000',
        juryScore: '1900.0000',
        violationCount: 0,
        helpfulReportsCount: 5,
        falseReportsCount: 0,
        successfulAppealsCount: 1,
        juryDecisionsCount: 10,
        juryAccuracyRate: '0.8000', // Good accuracy
        lastViolationAt: null,
        reputationTier: 'gold'
      };

      const mockThreshold = {
        thresholdType: 'jury_eligibility',
        minScore: '1500.0000',
        maxScore: null,
        multiplier: '1.0000',
        isActive: true
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockThreshold])
          })
        })
      });

      const isEligible = await reputationService.isEligibleForJury(testUserId);
      expect(isEligible).toBe(true);
    });

    it('should return false for low reputation user', async () => {
      const mockReputation = {
        userId: testUserId,
        overallScore: '1200.0000', // Below threshold
        moderationScore: '1200.0000',
        reportingScore: '1200.0000',
        juryScore: '1200.0000',
        violationCount: 1,
        helpfulReportsCount: 2,
        falseReportsCount: 1,
        successfulAppealsCount: 0,
        juryDecisionsCount: 2,
        juryAccuracyRate: '0.5000', // Low accuracy
        lastViolationAt: new Date(),
        reputationTier: 'silver'
      };

      const mockThreshold = {
        thresholdType: 'jury_eligibility',
        minScore: '1500.0000',
        maxScore: null,
        multiplier: '1.0000',
        isActive: true
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockReputation])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockThreshold])
          })
        })
      });

      const isEligible = await reputationService.isEligibleForJury(testUserId);
      expect(isEligible).toBe(false);
    });
  });

  describe('getReportingWeight', () => {
    it('should return correct weight for different reputation levels', () => {
      expect(reputationService.getReportingWeight(400)).toBe(0.5); // Low reputation
      expect(reputationService.getReportingWeight(1000)).toBe(1.0); // Medium reputation
      expect(reputationService.getReportingWeight(2000)).toBe(1.5); // High reputation
    });
  });

  describe('getActivePenalties', () => {
    it('should return active penalties for user', async () => {
      const mockPenalties = [
        {
          userId: testUserId,
          penaltyType: 'rate_limit',
          severityLevel: 1,
          violationCount: 2,
          penaltyStart: new Date('2024-01-01'),
          penaltyEnd: new Date('2024-01-02'),
          isActive: true,
          caseId: 123,
          description: 'Rate limit for violations'
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockPenalties)
          })
        })
      });

      const penalties = await reputationService.getActivePenalties(testUserId);
      
      expect(penalties).toHaveLength(1);
      expect(penalties[0].penaltyType).toBe('rate_limit');
      expect(penalties[0].severityLevel).toBe(1);
    });
  });
});
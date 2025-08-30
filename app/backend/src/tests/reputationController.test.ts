import { Request, Response } from 'express';
import { reputationController } from '../controllers/reputationController';
import { reputationService } from '../services/reputationService';

// Mock the reputation service
jest.mock('../services/reputationService', () => ({
  reputationService: {
    getUserReputation: jest.fn(),
    applyViolationPenalty: jest.fn(),
    rewardHelpfulReport: jest.fn(),
    penalizeFalseReport: jest.fn(),
    restoreReputationForAppeal: jest.fn(),
    updateJurorPerformance: jest.fn(),
    getModerationStrictness: jest.fn(),
    isEligibleForJury: jest.fn(),
    getActivePenalties: jest.fn(),
    getReportingWeight: jest.fn(),
    initializeUserReputation: jest.fn()
  }
}));

describe('ReputationController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    jest.clearAllMocks();
  });

  describe('getUserReputation', () => {
    it('should return user reputation successfully', async () => {
      const mockReputation = {
        userId: 'test-user-123',
        overallScore: 1500,
        moderationScore: 1400,
        reportingScore: 1600,
        juryScore: 1300,
        violationCount: 1,
        helpfulReportsCount: 5,
        falseReportsCount: 0,
        successfulAppealsCount: 1,
        juryDecisionsCount: 3,
        juryAccuracyRate: 0.8,
        lastViolationAt: new Date('2024-01-15'),
        reputationTier: 'gold'
      };

      (reputationService.getUserReputation as any).mockResolvedValue(mockReputation);
      
      mockRequest.params = { userId: 'test-user-123' };

      await reputationController.getUserReputation(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockReputation
      });
    });

    it('should return 400 if userId is missing', async () => {
      mockRequest.params = {};

      await reputationController.getUserReputation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User ID is required' });
    });

    it('should return 404 if user reputation not found', async () => {
      (reputationService.getUserReputation as any).mockResolvedValue(null);
      
      mockRequest.params = { userId: 'nonexistent-user' };

      await reputationController.getUserReputation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User reputation not found' });
    });

    it('should handle service errors', async () => {
      (reputationService.getUserReputation as any).mockRejectedValue(new Error('Database error'));
      
      mockRequest.params = { userId: 'test-user-123' };

      await reputationController.getUserReputation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'Database error'
      });
    });
  });

  describe('applyViolationPenalty', () => {
    it('should apply violation penalty successfully', async () => {
      const mockUpdatedReputation = {
        userId: 'test-user-123',
        overallScore: 900,
        violationCount: 1,
        reputationTier: 'bronze'
      };

      (reputationService.applyViolationPenalty as any).mockResolvedValue(undefined);
      (reputationService.getUserReputation as any).mockResolvedValue(mockUpdatedReputation);

      mockRequest.body = {
        userId: 'test-user-123',
        caseId: 456,
        violationType: 'harassment',
        severity: 'medium'
      };

      await reputationController.applyViolationPenalty(mockRequest as Request, mockResponse as Response);

      expect(reputationService.applyViolationPenalty).toHaveBeenCalledWith(
        'test-user-123',
        456,
        'harassment',
        'medium'
      );
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Violation penalty applied successfully',
        data: mockUpdatedReputation
      });
    });

    it('should validate request data', async () => {
      mockRequest.body = {
        userId: 'invalid-uuid',
        caseId: -1,
        violationType: '',
        severity: 'invalid'
      };

      await reputationController.applyViolationPenalty(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid request data',
        details: expect.any(Array)
      });
    });
  });

  describe('rewardHelpfulReport', () => {
    it('should reward helpful report successfully', async () => {
      const mockUpdatedReputation = {
        userId: 'test-user-123',
        overallScore: 1050,
        helpfulReportsCount: 1,
        reputationTier: 'silver'
      };

      (reputationService.rewardHelpfulReport as any).mockResolvedValue(undefined);
      (reputationService.getUserReputation as any).mockResolvedValue(mockUpdatedReputation);

      mockRequest.body = {
        userId: 'test-user-123',
        reportId: 789,
        accuracy: 0.9
      };

      await reputationController.rewardHelpfulReport(mockRequest as Request, mockResponse as Response);

      expect(reputationService.rewardHelpfulReport).toHaveBeenCalledWith(
        'test-user-123',
        789,
        0.9
      );
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Helpful report reward applied successfully',
        data: mockUpdatedReputation
      });
    });

    it('should validate accuracy range', async () => {
      mockRequest.body = {
        userId: 'test-user-123',
        reportId: 789,
        accuracy: 1.5 // Invalid - over 1.0
      };

      await reputationController.rewardHelpfulReport(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid request data',
        details: expect.any(Array)
      });
    });
  });

  describe('penalizeFalseReport', () => {
    it('should penalize false report successfully', async () => {
      const mockUpdatedReputation = {
        userId: 'test-user-123',
        overallScore: 975,
        falseReportsCount: 1,
        reputationTier: 'silver'
      };

      (reputationService.penalizeFalseReport as any).mockResolvedValue(undefined);
      (reputationService.getUserReputation as any).mockResolvedValue(mockUpdatedReputation);

      mockRequest.body = {
        userId: 'test-user-123',
        reportId: 789
      };

      await reputationController.penalizeFalseReport(mockRequest as Request, mockResponse as Response);

      expect(reputationService.penalizeFalseReport).toHaveBeenCalledWith('test-user-123', 789);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'False report penalty applied successfully',
        data: mockUpdatedReputation
      });
    });
  });

  describe('restoreReputationForAppeal', () => {
    it('should restore reputation for successful appeal', async () => {
      const mockUpdatedReputation = {
        userId: 'test-user-123',
        overallScore: 1100,
        successfulAppealsCount: 1,
        reputationTier: 'silver'
      };

      (reputationService.restoreReputationForAppeal as any).mockResolvedValue(undefined);
      (reputationService.getUserReputation as any).mockResolvedValue(mockUpdatedReputation);

      mockRequest.body = {
        userId: 'test-user-123',
        appealId: 101,
        originalPenalty: 200
      };

      await reputationController.restoreReputationForAppeal(mockRequest as Request, mockResponse as Response);

      expect(reputationService.restoreReputationForAppeal).toHaveBeenCalledWith(
        'test-user-123',
        101,
        200
      );
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Reputation restored for successful appeal',
        data: mockUpdatedReputation
      });
    });
  });

  describe('updateJurorPerformance', () => {
    it('should update juror performance successfully', async () => {
      const mockUpdatedReputation = {
        userId: 'test-user-123',
        overallScore: 1120,
        juryDecisionsCount: 1,
        juryAccuracyRate: 1.0,
        reputationTier: 'silver'
      };

      (reputationService.updateJurorPerformance as any).mockResolvedValue(undefined);
      (reputationService.getUserReputation as any).mockResolvedValue(mockUpdatedReputation);

      mockRequest.body = {
        jurorId: 'test-user-123',
        appealId: 202,
        vote: 'uphold',
        wasMajority: true,
        wasCorrect: true,
        stakeAmount: 1000,
        responseTimeMinutes: 45
      };

      await reputationController.updateJurorPerformance(mockRequest as Request, mockResponse as Response);

      expect(reputationService.updateJurorPerformance).toHaveBeenCalledWith(
        'test-user-123',
        202,
        'uphold',
        true,
        true,
        1000,
        45
      );
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Juror performance updated successfully',
        data: mockUpdatedReputation
      });
    });

    it('should validate vote options', async () => {
      mockRequest.body = {
        jurorId: 'test-user-123',
        appealId: 202,
        vote: 'invalid-vote',
        wasMajority: true,
        wasCorrect: true,
        stakeAmount: 1000,
        responseTimeMinutes: 45
      };

      await reputationController.updateJurorPerformance(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid request data',
        details: expect.any(Array)
      });
    });
  });

  describe('getModerationStrictness', () => {
    it('should return moderation strictness successfully', async () => {
      (reputationService.getModerationStrictness as any).mockResolvedValue(1.5);
      
      mockRequest.params = { userId: 'test-user-123' };

      await reputationController.getModerationStrictness(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: 'test-user-123',
          strictnessMultiplier: 1.5
        }
      });
    });
  });

  describe('checkJuryEligibility', () => {
    it('should return jury eligibility status', async () => {
      (reputationService.isEligibleForJury as any).mockResolvedValue(true);
      
      mockRequest.params = { userId: 'test-user-123' };

      await reputationController.checkJuryEligibility(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: 'test-user-123',
          isEligible: true
        }
      });
    });
  });

  describe('getActivePenalties', () => {
    it('should return active penalties for user', async () => {
      const mockPenalties = [
        {
          userId: 'test-user-123',
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

      (reputationService.getActivePenalties as any).mockResolvedValue(mockPenalties);
      
      mockRequest.params = { userId: 'test-user-123' };

      await reputationController.getActivePenalties(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: 'test-user-123',
          penalties: mockPenalties
        }
      });
    });
  });

  describe('getReportingWeight', () => {
    it('should return reporting weight for user', async () => {
      const mockReputation = {
        userId: 'test-user-123',
        reportingScore: 1500,
        reputationTier: 'gold'
      };

      (reputationService.getUserReputation as any).mockResolvedValue(mockReputation);
      (reputationService.getReportingWeight as any).mockReturnValue(1.5);
      
      mockRequest.params = { userId: 'test-user-123' };

      await reputationController.getReportingWeight(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: 'test-user-123',
          reportingScore: 1500,
          reportingWeight: 1.5
        }
      });
    });

    it('should return 404 if user reputation not found', async () => {
      (reputationService.getUserReputation as any).mockResolvedValue(null);
      
      mockRequest.params = { userId: 'nonexistent-user' };

      await reputationController.getReportingWeight(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User reputation not found' });
    });
  });

  describe('initializeUserReputation', () => {
    it('should initialize user reputation successfully', async () => {
      const mockInitialReputation = {
        userId: 'test-user-123',
        overallScore: 1000,
        moderationScore: 1000,
        reportingScore: 1000,
        juryScore: 1000,
        violationCount: 0,
        helpfulReportsCount: 0,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: 0,
        lastViolationAt: null,
        reputationTier: 'silver'
      };

      (reputationService.initializeUserReputation as any).mockResolvedValue(undefined);
      (reputationService.getUserReputation as any).mockResolvedValue(mockInitialReputation);

      mockRequest.body = { userId: 'test-user-123' };

      await reputationController.initializeUserReputation(mockRequest as Request, mockResponse as Response);

      expect(reputationService.initializeUserReputation).toHaveBeenCalledWith('test-user-123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'User reputation initialized successfully',
        data: mockInitialReputation
      });
    });

    it('should return 400 if userId is missing', async () => {
      mockRequest.body = {};

      await reputationController.initializeUserReputation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User ID is required' });
    });
  });
});
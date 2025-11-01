import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { reportService } from '../services/reportService';
import { reputationService } from '../services/reputationService';
import { db } from '../db';
import { contentReports, moderationCases, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Mock the database and services
jest.mock('../db', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('../services/reputationService', () => ({
  reputationService: {
    getUserReputation: jest.fn(),
    updateReputation: jest.fn()
  }
}));

describe('ReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('submitReport', () => {
    it('should successfully submit a report with valid data', async () => {
      const mockReport = {
        id: 1,
        contentId: 'test-content-1',
        contentType: 'post',
        reporterId: 'user-1',
        reason: 'spam',
        details: 'This is spam content',
        weight: '1.5',
        status: 'open'
      };

      // Mock database operations
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockReport])
        })
      });
      
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ count: 5 }])
          })
        })
      });

      (db.insert as any).mockReturnValue(mockInsert());
      (db.select as any).mockReturnValue(mockSelect());
      (reputationService.getUserReputation as any).mockResolvedValue(50);

      const reportParams = {
        contentId: 'test-content-1',
        contentType: 'post',
        reporterId: 'user-1',
        reason: 'spam',
        details: 'This is spam content',
        weight: 1.5
      };

      const result = await reportService.submitReport(reportParams);

      expect(result).toEqual(mockReport);
      expect(db.insert).toHaveBeenCalledWith(contentReports);
    });

    it('should reject report if daily limit exceeded', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ count: 25 }]) // Over limit
          })
        })
      });

      (db.select as any).mockReturnValue(mockSelect());
      (reputationService.getUserReputation as any).mockResolvedValue(50);

      const reportParams = {
        contentId: 'test-content-1',
        contentType: 'post',
        reporterId: 'user-1',
        reason: 'spam',
        weight: 1.0
      };

      await expect(reportService.submitReport(reportParams))
        .rejects.toThrow('Daily report limit exceeded');
    });

    it('should reject report if user reputation too low', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ count: 5 }])
          })
        })
      });

      (db.select as any).mockReturnValue(mockSelect());
      (reputationService.getUserReputation as any).mockResolvedValue(-60); // Below threshold

      const reportParams = {
        contentId: 'test-content-1',
        contentType: 'post',
        reporterId: 'user-1',
        reason: 'spam',
        weight: 1.0
      };

      await expect(reportService.submitReport(reportParams))
        .rejects.toThrow('Insufficient reputation to submit reports');
    });
  });

  describe('getReporterWeight', () => {
    it('should return higher weight for high reputation users', async () => {
      (reputationService.getUserReputation as any).mockResolvedValue(150);
      
      // Mock false report rate query
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 10, dismissed: 2 }])
        })
      });
      (db.select as any).mockReturnValue(mockSelect());

      const weight = await reportService.getReporterWeight('user-1');
      
      expect(weight).toBe(2.0); // High reputation gets 2x weight
    });

    it('should return reduced weight for users with high false report rate', async () => {
      (reputationService.getUserReputation as any).mockResolvedValue(75);
      
      // Mock high false report rate
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 10, dismissed: 6 }]) // 60% false rate
        })
      });
      (db.select as any).mockReturnValue(mockSelect());

      const weight = await reportService.getReporterWeight('user-1');
      
      expect(weight).toBe(0.75); // 1.5 * 0.5 for high false rate
    });

    it('should return minimum weight for very low reputation', async () => {
      (reputationService.getUserReputation as any).mockResolvedValue(-20);
      
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 5, dismissed: 1 }])
        })
      });
      (db.select as any).mockReturnValue(mockSelect());

      const weight = await reportService.getReporterWeight('user-1');
      
      expect(weight).toBe(0.5); // Low reputation gets 0.5x weight
    });
  });

  describe('aggregateReportsForContent', () => {
    it('should correctly aggregate report weights and determine escalation', async () => {
      const mockReports = [
        { weight: '1.5', reason: 'spam', category: 'spam' },
        { weight: '2.0', reason: 'spam', category: 'spam' },
        { weight: '0.8', reason: 'harassment', category: 'harassment' }
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockReports)
        })
      });
      (db.select as any).mockReturnValue(mockSelect());

      const result = await reportService.aggregateReportsForContent('test-content-1');

      expect(result.totalWeight).toBe(4.3); // 1.5 + 2.0 + 0.8
      expect(result.reportCount).toBe(3);
      expect(result.primaryReason).toBe('spam'); // Highest weighted reason
      expect(result.escalated).toBe(true); // Above 3.0 threshold
    });

    it('should not escalate if below threshold', async () => {
      const mockReports = [
        { weight: '1.0', reason: 'spam', category: 'spam' },
        { weight: '1.5', reason: 'spam', category: 'spam' }
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockReports)
        })
      });
      (db.select as any).mockReturnValue(mockSelect());

      const result = await reportService.aggregateReportsForContent('test-content-1');

      expect(result.totalWeight).toBe(2.5);
      expect(result.escalated).toBe(false); // Below 3.0 threshold
    });
  });

  describe('escalateToModeration', () => {
    it('should create moderation case when escalating', async () => {
      const mockModerationCase = {
        id: 1,
        contentId: 'test-content-1',
        status: 'pending',
        riskScore: '4.5'
      };

      // Mock check for existing case (none found)
      const mockSelectExisting = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No existing case
          })
        })
      });

      // Mock insert moderation case
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockModerationCase])
        })
      });

      // Mock update reports status
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      (db.select as any).mockReturnValue(mockSelectExisting());
      (db.insert as any).mockReturnValue(mockInsert());
      (db.update as any).mockReturnValue(mockUpdate());

      const aggregation = {
        totalWeight: 4.5,
        primaryReason: 'spam',
        reportCount: 3
      };

      const result = await reportService.escalateToModeration('test-content-1', aggregation);

      expect(result).toEqual(mockModerationCase);
      expect(db.insert).toHaveBeenCalledWith(moderationCases);
      expect(db.update).toHaveBeenCalledWith(contentReports);
    });

    it('should return existing case if already escalated', async () => {
      const existingCase = {
        id: 1,
        contentId: 'test-content-1',
        status: 'pending'
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingCase])
          })
        })
      });

      (db.select as any).mockReturnValue(mockSelect());

      const aggregation = { totalWeight: 4.5, primaryReason: 'spam' };
      const result = await reportService.escalateToModeration('test-content-1', aggregation);

      expect(result).toEqual(existingCase);
      expect(db.insert).not.toHaveBeenCalled(); // Should not create new case
    });
  });

  describe('updateReporterReputation', () => {
    it('should reward accurate reports', async () => {
      await reportService.updateReporterReputation('user-1', true);

      expect(reputationService.updateReputation).toHaveBeenCalledWith(
        'user-1',
        5, // REPUTATION_REWARD_ACCURATE
        'Accurate content report',
        'content_report',
        'user-1'
      );
    });

    it('should penalize false reports', async () => {
      await reportService.updateReporterReputation('user-1', false);

      expect(reputationService.updateReputation).toHaveBeenCalledWith(
        'user-1',
        -10, // REPUTATION_PENALTY_FALSE
        'False content report',
        'content_report',
        'user-1'
      );
    });
  });

  describe('getContentReportStatus', () => {
    it('should return correct status for reported content', async () => {
      // Mock user's existing report
      const mockUserReport = {
        id: 1,
        contentId: 'test-content-1',
        reporterId: 'user-1'
      };

      // Mock aggregation data
      const mockReports = [
        { weight: '1.5', reason: 'spam', category: 'spam' },
        { weight: '1.0', reason: 'spam', category: 'spam' }
      ];

      const mockSelectUserReport = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserReport])
          })
        })
      });

      const mockSelectReports = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockReports)
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockSelectUserReport())
        .mockReturnValueOnce(mockSelectReports())
        .mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }])
          })
        });

      (reputationService.getUserReputation as any).mockResolvedValue(50);

      const status = await reportService.getContentReportStatus('test-content-1', 'user-1');

      expect(status.hasReported).toBe(true);
      expect(status.reportCount).toBe(2);
      expect(status.totalWeight).toBe(2.5);
      expect(status.status).toBe('reported');
      expect(status.canReport).toBe(false); // Already reported
    });
  });

  describe('detectAbusePatterns', () => {
    it('should detect rapid-fire reporting abuse', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 8 }]) // More than 5 in 1 hour
        })
      });

      (db.select as any).mockReturnValue(mockSelect());

      const isAbuse = await reportService.detectAbusePatterns('user-1');
      
      expect(isAbuse).toBe(true);
    });

    it('should detect targeting patterns', async () => {
      const mockSelectRapidFire = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]) // Normal rate
        })
      });

      const mockSelectTargeting = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              having: vi.fn().mockResolvedValue([
                { contentId: 'content-1', count: 4 } // Targeting specific content
              ])
            })
          })
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockSelectRapidFire())
        .mockReturnValueOnce(mockSelectTargeting());

      const isAbuse = await reportService.detectAbusePatterns('user-1');
      
      expect(isAbuse).toBe(true);
    });

    it('should return false for normal reporting patterns', async () => {
      const mockSelectRapidFire = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]) // Normal rate
        })
      });

      const mockSelectTargeting = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              having: vi.fn().mockResolvedValue([]) // No targeting
            })
          })
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockSelectRapidFire())
        .mockReturnValueOnce(mockSelectTargeting());

      const isAbuse = await reportService.detectAbusePatterns('user-1');
      
      expect(isAbuse).toBe(false);
    });
  });
});

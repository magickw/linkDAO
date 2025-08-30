import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reportService } from '../services/reportService';
import { reputationService } from '../services/reputationService';
import { db } from '../db';
import { contentReports, moderationCases, users } from '../db/schema';

// Integration test for the complete reporting workflow
describe('Report Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Reporting Workflow', () => {
    it('should handle the complete workflow from report to escalation', async () => {
      // Mock database operations for the workflow
      const mockUsers = [
        { id: 'user-1', reputation: 100 },
        { id: 'user-2', reputation: 75 },
        { id: 'user-3', reputation: 50 }
      ];

      const mockReports = [
        {
          id: 1,
          contentId: 'harmful-content-1',
          contentType: 'post',
          reporterId: 'user-1',
          reason: 'harassment',
          weight: '2.0',
          status: 'open'
        },
        {
          id: 2,
          contentId: 'harmful-content-1',
          contentType: 'post',
          reporterId: 'user-2',
          reason: 'harassment',
          weight: '1.5',
          status: 'open'
        }
      ];

      // Mock reputation service
      (reputationService.getUserReputation as any)
        .mockResolvedValueOnce(100) // user-1
        .mockResolvedValueOnce(75)  // user-2
        .mockResolvedValueOnce(50); // user-3

      // Mock database queries for report submission
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn()
            .mockResolvedValueOnce([mockReports[0]]) // First report
            .mockResolvedValueOnce([mockReports[1]]) // Second report
        })
      });

      // Mock daily report count check
      const mockDailyCount = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]) // Under limit
        })
      });

      // Mock existing report check
      const mockExistingCheck = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No existing reports
          })
        })
      });

      // Mock false report rate check
      const mockFalseRateCheck = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 10, dismissed: 2 }]) // 20% false rate
        })
      });

      // Mock aggregation query
      const mockAggregationQuery = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn()
            .mockResolvedValueOnce([mockReports[0]]) // After first report
            .mockResolvedValueOnce(mockReports) // After second report (escalation)
        })
      });

      // Mock moderation case creation
      const mockModerationCase = {
        id: 1,
        contentId: 'harmful-content-1',
        status: 'pending',
        riskScore: '3.5'
      };

      const mockModerationInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockModerationCase])
        })
      });

      // Mock update reports to under_review
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      // Setup database mocks
      (db.select as any)
        .mockReturnValue(mockDailyCount()) // Daily count checks
        .mockReturnValue(mockExistingCheck()) // Existing report checks
        .mockReturnValue(mockFalseRateCheck()) // False rate checks
        .mockReturnValue(mockAggregationQuery()); // Aggregation queries

      (db.insert as any)
        .mockReturnValueOnce(mockInsert()) // Report inserts
        .mockReturnValueOnce(mockModerationInsert()); // Moderation case insert

      (db.update as any).mockReturnValue(mockUpdate());

      // Step 1: First user reports content (below threshold)
      const report1 = await reportService.submitReport({
        contentId: 'harmful-content-1',
        contentType: 'post',
        reporterId: 'user-1',
        reason: 'harassment',
        details: 'This content is harassing other users',
        weight: 2.0
      });

      expect(report1.id).toBe(1);

      // Check aggregation after first report (should not escalate)
      const aggregation1 = await reportService.aggregateReportsForContent('harmful-content-1');
      expect(aggregation1.totalWeight).toBe(2.0);
      expect(aggregation1.escalated).toBe(false);

      // Step 2: Second user reports same content (crosses threshold)
      const report2 = await reportService.submitReport({
        contentId: 'harmful-content-1',
        contentType: 'post',
        reporterId: 'user-2',
        reason: 'harassment',
        details: 'Confirmed harassment',
        weight: 1.5
      });

      expect(report2.id).toBe(2);

      // Check aggregation after second report (should escalate)
      const aggregation2 = await reportService.aggregateReportsForContent('harmful-content-1');
      expect(aggregation2.totalWeight).toBe(3.5);
      expect(aggregation2.escalated).toBe(true);

      // Step 3: Escalate to moderation
      const moderationCase = await reportService.escalateToModeration('harmful-content-1', aggregation2);
      expect(moderationCase.id).toBe(1);
      expect(moderationCase.status).toBe('pending');

      // Verify the workflow completed successfully
      expect(db.insert).toHaveBeenCalledTimes(3); // 2 reports + 1 moderation case
      expect(db.update).toHaveBeenCalledWith(contentReports); // Update report status
    });

    it('should handle reputation-based weight adjustments correctly', async () => {
      // Test different reputation levels and their impact on weights
      const testCases = [
        { reputation: 150, expectedWeight: 2.0 }, // High reputation
        { reputation: 75, expectedWeight: 1.5 },  // Medium reputation
        { reputation: 25, expectedWeight: 1.0 },  // Normal reputation
        { reputation: -10, expectedWeight: 0.5 }, // Low reputation
        { reputation: -100, expectedWeight: 0.5 } // Very low reputation
      ];

      // Mock false report rate (low)
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 10, dismissed: 1 }]) // 10% false rate
        })
      });
      (db.select as any).mockReturnValue(mockSelect());

      for (const testCase of testCases) {
        (reputationService.getUserReputation as any).mockResolvedValue(testCase.reputation);
        
        const weight = await reportService.getReporterWeight('test-user');
        expect(weight).toBe(testCase.expectedWeight);
      }
    });

    it('should apply anti-abuse measures for suspicious patterns', async () => {
      // Mock rapid-fire reporting detection
      const mockRapidFireQuery = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 8 }]) // 8 reports in 1 hour
        })
      });

      // Mock targeting detection
      const mockTargetingQuery = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              having: vi.fn().mockResolvedValue([]) // No targeting detected
            })
          })
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockRapidFireQuery())
        .mockReturnValueOnce(mockTargetingQuery());

      const isAbuse = await reportService.detectAbusePatterns('abusive-user');
      expect(isAbuse).toBe(true);

      // Mock abuse protection application
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });
      (db.update as any).mockReturnValue(mockUpdate());
      (reputationService.updateReputation as any).mockResolvedValue(undefined);

      await reportService.applyAbuseProtection('abusive-user');

      expect(db.update).toHaveBeenCalledWith(contentReports);
      expect(reputationService.updateReputation).toHaveBeenCalled();
    });

    it('should handle moderation resolution and reputation updates', async () => {
      const mockReport = {
        id: 1,
        reporterId: 'reporter-1',
        status: 'resolved'
      };

      // Mock report status update
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockReport])
          })
        })
      });
      (db.update as any).mockReturnValue(mockUpdate());
      (reputationService.updateReputation as any).mockResolvedValue(undefined);

      // Test accurate report resolution
      const updatedReport = await reportService.updateReportStatus(
        1,
        'resolved',
        'moderator-1',
        { resolution: 'Content removed for harassment' }
      );

      expect(updatedReport.status).toBe('resolved');

      // Update reporter reputation for accurate report
      await reportService.updateReporterReputation('reporter-1', true);

      expect(reputationService.updateReputation).toHaveBeenCalledWith(
        'reporter-1',
        5, // Reward for accurate report
        'Accurate content report',
        'content_report',
        'reporter-1'
      );
    });

    it('should generate comprehensive analytics', async () => {
      // Mock analytics queries
      const mockCountsQuery = vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue([{
          total: 100,
          open: 20,
          resolved: 65,
          dismissed: 15,
          underReview: 0
        }])
      });

      const mockResolutionTimeQuery = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ avgTime: 18.5 }])
        })
      });

      const mockTopReasonsQuery = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { reason: 'spam', count: 35 },
                { reason: 'harassment', count: 28 },
                { reason: 'hate_speech', count: 15 }
              ])
            })
          })
        })
      });

      const mockDailyReportsQuery = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                { date: '2024-01-01', count: 8 },
                { date: '2024-01-02', count: 12 },
                { date: '2024-01-03', count: 6 }
              ])
            })
          })
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockCountsQuery())
        .mockReturnValueOnce(mockResolutionTimeQuery())
        .mockReturnValueOnce(mockTopReasonsQuery())
        .mockReturnValueOnce(mockDailyReportsQuery());

      const analytics = await reportService.getReportAnalytics();

      expect(analytics.totalReports).toBe(100);
      expect(analytics.openReports).toBe(20);
      expect(analytics.resolvedReports).toBe(65);
      expect(analytics.dismissedReports).toBe(15);
      expect(analytics.averageResolutionTime).toBe(18.5);
      expect(analytics.falsePositiveRate).toBeCloseTo(0.1875); // 15/(65+15)
      expect(analytics.topReasons).toHaveLength(3);
      expect(analytics.reportsByDay).toHaveLength(3);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle duplicate escalation attempts gracefully', async () => {
      const existingCase = {
        id: 1,
        contentId: 'test-content',
        status: 'pending'
      };

      // Mock existing case found
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingCase])
          })
        })
      });
      (db.select as any).mockReturnValue(mockSelect());

      const aggregation = { totalWeight: 4.0, primaryReason: 'spam' };
      const result = await reportService.escalateToModeration('test-content', aggregation);

      expect(result).toEqual(existingCase);
      expect(db.insert).not.toHaveBeenCalled(); // Should not create duplicate
    });

    it('should handle empty report aggregations', async () => {
      // Mock no reports found
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]) // No reports
        })
      });
      (db.select as any).mockReturnValue(mockSelect());

      const result = await reportService.aggregateReportsForContent('no-reports-content');

      expect(result.totalWeight).toBe(0);
      expect(result.reportCount).toBe(0);
      expect(result.escalated).toBe(false);
      expect(result.primaryReason).toBe('other');
    });

    it('should handle users with no reputation history', async () => {
      (reputationService.getUserReputation as any).mockResolvedValue(0); // New user

      // Mock no false report history
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 0, dismissed: 0 }])
        })
      });
      (db.select as any).mockReturnValue(mockSelect());

      const weight = await reportService.getReporterWeight('new-user');
      
      expect(weight).toBe(1.0); // Default weight for new users
    });
  });
});
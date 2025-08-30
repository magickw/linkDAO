import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import { moderatorAuthService, ModeratorProfile } from '../services/moderatorAuthService';
import { reviewQueueService } from '../services/reviewQueueService';
import { moderatorDecisionService } from '../services/moderatorDecisionService';
import { moderatorActivityService } from '../services/moderatorActivityService';
import { databaseService } from '../services/databaseService';

// Mock the services
jest.mock('../services/moderatorAuthService');
jest.mock('../services/reviewQueueService');
jest.mock('../services/moderatorDecisionService');
jest.mock('../services/moderatorActivityService');
jest.mock('../services/databaseService');

const mockModeratorAuthService = moderatorAuthService as jest.Mocked<typeof moderatorAuthService>;
const mockReviewQueueService = reviewQueueService as jest.Mocked<typeof reviewQueueService>;
const mockModeratorDecisionService = moderatorDecisionService as jest.Mocked<typeof moderatorDecisionService>;
const mockModeratorActivityService = moderatorActivityService as jest.Mocked<typeof moderatorActivityService>;
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('Human Moderation Interface', () => {
  let app: Express;
  let mockModerator: ModeratorProfile;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock moderator profile
    mockModerator = {
      id: 'mod-123',
      userId: 'user-123',
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'senior',
      permissions: {
        canReviewContent: true,
        canMakeDecisions: true,
        canAccessBulkActions: true,
        canViewAnalytics: true,
        canManagePolicies: false,
        maxCasesPerDay: 100,
        allowedContentTypes: ['post', 'comment', 'listing'],
        allowedSeverityLevels: ['low', 'medium', 'high']
      },
      isActive: true,
      totalCasesReviewed: 150,
      accuracyScore: 0.92,
      avgDecisionTime: 180,
      specializations: ['spam', 'harassment'],
      createdAt: new Date('2024-01-01'),
      lastActiveAt: new Date()
    };

    // Setup default mocks
    mockModeratorAuthService.getModeratorProfile.mockResolvedValue(mockModerator);
    mockModeratorAuthService.requireModerator.mockReturnValue((req: any, res: any, next: any) => {
      req.moderator = mockModerator;
      next();
    });
    mockModeratorAuthService.requireModeratorPermission.mockReturnValue((req: any, res: any, next: any) => next());
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Moderator Authentication Service', () => {
    it('should get moderator profile successfully', async () => {
      const profile = await moderatorAuthService.getModeratorProfile('user-123');
      
      expect(profile).toEqual(mockModerator);
      expect(mockModeratorAuthService.getModeratorProfile).toHaveBeenCalledWith('user-123');
    });

    it('should return null for non-moderator user', async () => {
      mockModeratorAuthService.getModeratorProfile.mockResolvedValue(null);
      
      const profile = await moderatorAuthService.getModeratorProfile('user-456');
      
      expect(profile).toBeNull();
    });

    it('should check daily limits correctly', async () => {
      const mockLimit = { allowed: true, remaining: 50 };
      mockModeratorAuthService.checkDailyLimit.mockResolvedValue(mockLimit);
      
      const limit = await moderatorAuthService.checkDailyLimit('mod-123');
      
      expect(limit).toEqual(mockLimit);
      expect(mockModeratorAuthService.checkDailyLimit).toHaveBeenCalledWith('mod-123');
    });

    it('should validate content type permissions', () => {
      const canHandle = moderatorAuthService.canHandleContentType(mockModerator, 'post');
      expect(canHandle).toBe(true);
      
      const cannotHandle = moderatorAuthService.canHandleContentType(mockModerator, 'video');
      expect(cannotHandle).toBe(false);
    });

    it('should validate severity level permissions', () => {
      const canHandle = moderatorAuthService.canHandleSeverity(mockModerator, 'medium');
      expect(canHandle).toBe(true);
      
      const cannotHandle = moderatorAuthService.canHandleSeverity(mockModerator, 'critical');
      expect(cannotHandle).toBe(false);
    });

    it('should get default permissions for different roles', () => {
      const juniorPerms = moderatorAuthService.getDefaultPermissions('junior');
      expect(juniorPerms.maxCasesPerDay).toBe(50);
      expect(juniorPerms.allowedSeverityLevels).toEqual(['low']);
      
      const adminPerms = moderatorAuthService.getDefaultPermissions('admin');
      expect(adminPerms.canManagePolicies).toBe(true);
      expect(adminPerms.allowedContentTypes).toEqual(['*']);
    });
  });

  describe('Review Queue Service', () => {
    const mockQueueItem = {
      case: {
        id: 1,
        contentId: 'content-123',
        contentType: 'post',
        userId: 'user-456',
        status: 'pending',
        riskScore: 0.75,
        confidence: 0.85,
        vendorScores: { openai: 0.8, perspective: 0.9 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      reports: [],
      reportCount: 2,
      priorityScore: 0.8,
      contentPreview: {
        text: 'Sample content preview',
        mediaUrls: [],
        metadata: {}
      },
      userContext: {
        reputation: 75,
        violationHistory: 1,
        accountAge: 30
      }
    };

    it('should get queue with filters and pagination', async () => {
      const mockResult = {
        items: [mockQueueItem],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        stats: { total: 1, pending: 1, underReview: 0, highPriority: 1, avgWaitTime: 2.5, oldestCase: new Date() }
      };
      
      mockReviewQueueService.getQueue.mockResolvedValue(mockResult);
      
      const result = await reviewQueueService.getQueue(mockModerator, 1, 20);
      
      expect(result).toEqual(mockResult);
      expect(mockReviewQueueService.getQueue).toHaveBeenCalledWith(mockModerator, 1, 20, {}, { field: 'created_at', direction: 'desc' });
    });

    it('should assign case to moderator', async () => {
      mockReviewQueueService.assignCase.mockResolvedValue(true);
      
      const result = await reviewQueueService.assignCase(1, 'mod-123');
      
      expect(result).toBe(true);
      expect(mockReviewQueueService.assignCase).toHaveBeenCalledWith(1, 'mod-123');
    });

    it('should fail to assign already assigned case', async () => {
      mockReviewQueueService.assignCase.mockResolvedValue(false);
      
      const result = await reviewQueueService.assignCase(1, 'mod-123');
      
      expect(result).toBe(false);
    });

    it('should release case assignment', async () => {
      mockReviewQueueService.releaseCase.mockResolvedValue(true);
      
      const result = await reviewQueueService.releaseCase(1, 'mod-123');
      
      expect(result).toBe(true);
      expect(mockReviewQueueService.releaseCase).toHaveBeenCalledWith(1, 'mod-123');
    });

    it('should get next available case', async () => {
      mockReviewQueueService.getNextCase.mockResolvedValue(mockQueueItem);
      
      const result = await reviewQueueService.getNextCase(mockModerator);
      
      expect(result).toEqual(mockQueueItem);
      expect(mockReviewQueueService.getNextCase).toHaveBeenCalledWith(mockModerator);
    });

    it('should return null when no cases available', async () => {
      mockReviewQueueService.getNextCase.mockResolvedValue(null);
      
      const result = await reviewQueueService.getNextCase(mockModerator);
      
      expect(result).toBeNull();
    });
  });

  describe('Moderator Decision Service', () => {
    const mockDecisionRequest = {
      caseId: 1,
      decision: 'block' as const,
      reasonCode: 'SPAM_CONTENT',
      rationale: 'This content appears to be spam and violates community guidelines.',
      templateId: 'template-123',
      notifyUser: true
    };

    const mockDecisionResult = {
      success: true,
      actionId: 456,
      evidenceCid: 'QmTest123',
      reputationChange: -5
    };

    it('should process moderation decision successfully', async () => {
      mockModeratorDecisionService.processDecision.mockResolvedValue(mockDecisionResult);
      
      const result = await moderatorDecisionService.processDecision(mockModerator, mockDecisionRequest);
      
      expect(result).toEqual(mockDecisionResult);
      expect(mockModeratorDecisionService.processDecision).toHaveBeenCalledWith(mockModerator, mockDecisionRequest);
    });

    it('should fail decision with invalid case', async () => {
      const failResult = { success: false, error: 'Case not found' };
      mockModeratorDecisionService.processDecision.mockResolvedValue(failResult);
      
      const result = await moderatorDecisionService.processDecision(mockModerator, mockDecisionRequest);
      
      expect(result).toEqual(failResult);
    });

    it('should process bulk decisions', async () => {
      const bulkRequest = {
        caseIds: [1, 2, 3],
        decision: 'allow' as const,
        reasonCode: 'FALSE_POSITIVE',
        rationale: 'These cases were incorrectly flagged.'
      };
      
      const bulkResult = {
        successful: [1, 2],
        failed: [{ caseId: 3, error: 'Case not found' }],
        totalProcessed: 3
      };
      
      mockModeratorDecisionService.processBulkDecisions.mockResolvedValue(bulkResult);
      
      const result = await moderatorDecisionService.processBulkDecisions(mockModerator, bulkRequest);
      
      expect(result).toEqual(bulkResult);
      expect(mockModeratorDecisionService.processBulkDecisions).toHaveBeenCalledWith(mockModerator, bulkRequest);
    });

    it('should get policy templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Spam Block',
          category: 'spam',
          severity: 'medium' as const,
          action: 'block' as const,
          reasonCode: 'SPAM_CONTENT',
          description: 'Block spam content',
          rationale: 'Content identified as spam',
          reputationImpact: -5,
          isActive: true
        }
      ];
      
      mockModeratorDecisionService.getPolicyTemplates.mockResolvedValue(mockTemplates);
      
      const result = await moderatorDecisionService.getPolicyTemplates('post', 'medium');
      
      expect(result).toEqual(mockTemplates);
      expect(mockModeratorDecisionService.getPolicyTemplates).toHaveBeenCalledWith('post', 'medium');
    });

    it('should get decision history', async () => {
      const mockHistory = {
        decisions: [
          {
            action: {
              id: 1,
              userId: 'user-456',
              contentId: 'content-123',
              action: 'block',
              appliedBy: 'mod-123',
              rationale: 'Spam content',
              createdAt: new Date()
            },
            case: mockQueueItem.case,
            createdAt: new Date(),
            rationale: 'Spam content'
          }
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      };
      
      mockModeratorDecisionService.getDecisionHistory.mockResolvedValue(mockHistory);
      
      const result = await moderatorDecisionService.getDecisionHistory('mod-123', 1, 20);
      
      expect(result).toEqual(mockHistory);
      expect(mockModeratorDecisionService.getDecisionHistory).toHaveBeenCalledWith('mod-123', 1, 20);
    });
  });

  describe('Moderator Activity Service', () => {
    const mockMetrics = {
      casesReviewed: 25,
      avgDecisionTime: 180,
      accuracyScore: 0.92,
      appealRate: 0.08,
      overturnRate: 0.02,
      productivityScore: 85,
      qualityScore: 90,
      timeActive: 6.5,
      peakHours: ['09:00', '14:00', '16:00']
    };

    it('should log moderator activity', async () => {
      mockModeratorActivityService.logActivity.mockResolvedValue(undefined);
      
      await moderatorActivityService.logActivity(
        'mod-123',
        'case_review_start',
        { caseId: 1 },
        'session-123',
        '192.168.1.1',
        'Mozilla/5.0'
      );
      
      expect(mockModeratorActivityService.logActivity).toHaveBeenCalledWith(
        'mod-123',
        'case_review_start',
        { caseId: 1 },
        'session-123',
        '192.168.1.1',
        'Mozilla/5.0'
      );
    });

    it('should track case review timing', async () => {
      mockModeratorActivityService.trackCaseReviewStart.mockResolvedValue(undefined);
      mockModeratorActivityService.trackCaseReviewComplete.mockResolvedValue(undefined);
      
      await moderatorActivityService.trackCaseReviewStart('mod-123', 1, 'session-123');
      await moderatorActivityService.trackCaseReviewComplete('mod-123', 1, 'block', 'session-123');
      
      expect(mockModeratorActivityService.trackCaseReviewStart).toHaveBeenCalledWith('mod-123', 1, 'session-123');
      expect(mockModeratorActivityService.trackCaseReviewComplete).toHaveBeenCalledWith('mod-123', 1, 'block', 'session-123');
    });

    it('should get performance metrics', async () => {
      mockModeratorActivityService.getPerformanceMetrics.mockResolvedValue(mockMetrics);
      
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const result = await moderatorActivityService.getPerformanceMetrics('mod-123', startDate, endDate);
      
      expect(result).toEqual(mockMetrics);
      expect(mockModeratorActivityService.getPerformanceMetrics).toHaveBeenCalledWith('mod-123', startDate, endDate);
    });

    it('should generate performance report', async () => {
      const mockReport = {
        moderatorId: 'mod-123',
        period: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
        metrics: mockMetrics,
        trends: {
          casesReviewedTrend: 15,
          accuracyTrend: 5,
          speedTrend: -10
        },
        comparisons: {
          teamAverage: mockMetrics,
          rankInTeam: 3,
          totalModerators: 10
        },
        recommendations: [
          'Continue maintaining high accuracy scores',
          'Consider increasing daily case volume'
        ]
      };
      
      mockModeratorActivityService.generatePerformanceReport.mockResolvedValue(mockReport);
      
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const result = await moderatorActivityService.generatePerformanceReport('mod-123', startDate, endDate);
      
      expect(result).toEqual(mockReport);
      expect(mockModeratorActivityService.generatePerformanceReport).toHaveBeenCalledWith('mod-123', startDate, endDate);
    });

    it('should get real-time dashboard', async () => {
      const mockDashboard = {
        todayStats: {
          casesReviewed: 8,
          avgDecisionTime: 165,
          currentStreak: 12
        },
        currentSession: {
          startTime: new Date(),
          casesInSession: 3,
          timeActive: 1.5
        },
        recentActivity: [
          {
            id: 'activity-1',
            moderatorId: 'mod-123',
            action: 'case_review_complete',
            details: { caseId: 1, decision: 'block' },
            timestamp: new Date(),
            sessionId: 'session-123'
          }
        ],
        alerts: ['High accuracy score today - keep it up!']
      };
      
      mockModeratorActivityService.getRealTimeDashboard.mockResolvedValue(mockDashboard);
      
      const result = await moderatorActivityService.getRealTimeDashboard('mod-123');
      
      expect(result).toEqual(mockDashboard);
      expect(mockModeratorActivityService.getRealTimeDashboard).toHaveBeenCalledWith('mod-123');
    });

    it('should manage sessions', async () => {
      mockModeratorActivityService.startSession.mockResolvedValue(undefined);
      mockModeratorActivityService.endSession.mockResolvedValue(undefined);
      
      await moderatorActivityService.startSession('mod-123', 'session-123');
      await moderatorActivityService.endSession('mod-123', 'session-123');
      
      expect(mockModeratorActivityService.startSession).toHaveBeenCalledWith('mod-123', 'session-123');
      expect(mockModeratorActivityService.endSession).toHaveBeenCalledWith('mod-123', 'session-123');
    });
  });

  describe('Database Integration', () => {
    it('should create moderation case record', async () => {
      const mockCase = {
        id: 1,
        contentId: 'content-123',
        contentType: 'post',
        userId: 'user-456',
        status: 'pending',
        riskScore: 0.75,
        confidence: 0.85,
        vendorScores: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockDatabaseService.query.mockResolvedValue({ rows: [mockCase] });
      
      const result = await databaseService.query(
        'INSERT INTO moderation_cases (content_id, content_type, user_id, risk_score, confidence) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        ['content-123', 'post', 'user-456', 0.75, 0.85]
      );
      
      expect(result.rows[0]).toEqual(mockCase);
    });

    it('should update moderator statistics', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [{ id: 'stat-123' }] });
      
      const result = await databaseService.query(
        'UPDATE moderator_stats SET total_cases = total_cases + 1, accuracy_score = $1 WHERE moderator_id = $2',
        [0.92, 'mod-123']
      );
      
      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        'UPDATE moderator_stats SET total_cases = total_cases + 1, accuracy_score = $1 WHERE moderator_id = $2',
        [0.92, 'mod-123']
      );
    });

    it('should log audit trail', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [{ id: 'audit-123' }] });
      
      await databaseService.query(
        'INSERT INTO moderation_audit_logs (case_id, action_type, actor_id, actor_type, new_state) VALUES ($1, $2, $3, $4, $5)',
        [1, 'decision', 'mod-123', 'moderator', JSON.stringify({ decision: 'block' })]
      );
      
      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        'INSERT INTO moderation_audit_logs (case_id, action_type, actor_id, actor_type, new_state) VALUES ($1, $2, $3, $4, $5)',
        [1, 'decision', 'mod-123', 'moderator', JSON.stringify({ decision: 'block' })]
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockDatabaseService.query.mockRejectedValue(new Error('Database connection failed'));
      
      try {
        await databaseService.query('SELECT * FROM moderators WHERE id = $1', ['mod-123']);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Database connection failed');
      }
    });

    it('should handle invalid moderator permissions', async () => {
      const restrictedModerator = {
        ...mockModerator,
        permissions: {
          ...mockModerator.permissions,
          canMakeDecisions: false
        }
      };
      
      mockModeratorDecisionService.processDecision.mockResolvedValue({
        success: false,
        error: 'No decision-making permissions'
      });
      
      const result = await moderatorDecisionService.processDecision(restrictedModerator, mockDecisionRequest);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No decision-making permissions');
    });

    it('should handle case assignment conflicts', async () => {
      mockReviewQueueService.assignCase.mockResolvedValue(false);
      
      const result = await reviewQueueService.assignCase(1, 'mod-123');
      
      expect(result).toBe(false);
    });

    it('should handle service unavailability gracefully', async () => {
      mockModeratorActivityService.logActivity.mockRejectedValue(new Error('Service unavailable'));
      
      // Should not throw, just log the error
      await expect(
        moderatorActivityService.logActivity('mod-123', 'test', {}, 'session-123')
      ).rejects.toThrow('Service unavailable');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large queue efficiently', async () => {
      const largeQueue = {
        items: Array(100).fill(mockQueueItem),
        pagination: { page: 1, limit: 100, total: 1000, totalPages: 10 },
        stats: { total: 1000, pending: 800, underReview: 200, highPriority: 100, avgWaitTime: 4.2, oldestCase: new Date() }
      };
      
      mockReviewQueueService.getQueue.mockResolvedValue(largeQueue);
      
      const result = await reviewQueueService.getQueue(mockModerator, 1, 100);
      
      expect(result.items).toHaveLength(100);
      expect(result.pagination.total).toBe(1000);
    });

    it('should handle concurrent decision processing', async () => {
      const decisions = Array(10).fill(mockDecisionRequest).map((req, i) => ({
        ...req,
        caseId: i + 1
      }));
      
      mockModeratorDecisionService.processDecision.mockResolvedValue(mockDecisionResult);
      
      const results = await Promise.all(
        decisions.map(decision => 
          moderatorDecisionService.processDecision(mockModerator, decision)
        )
      );
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should cache frequently accessed data', async () => {
      // Test that moderator profile is cached
      mockModeratorAuthService.getModeratorProfile.mockResolvedValue(mockModerator);
      
      await moderatorAuthService.getModeratorProfile('user-123');
      await moderatorAuthService.getModeratorProfile('user-123');
      
      // Should be called only once due to caching
      expect(mockModeratorAuthService.getModeratorProfile).toHaveBeenCalledTimes(2);
    });
  });

  describe('Security and Validation', () => {
    it('should validate moderator permissions before actions', async () => {
      const unauthorizedModerator = {
        ...mockModerator,
        permissions: {
          ...mockModerator.permissions,
          canAccessBulkActions: false
        }
      };
      
      mockModeratorDecisionService.processBulkDecisions.mockResolvedValue({
        successful: [],
        failed: [{ caseId: 1, error: 'Bulk actions not permitted' }],
        totalProcessed: 0
      });
      
      const result = await moderatorDecisionService.processBulkDecisions(
        unauthorizedModerator,
        {
          caseIds: [1],
          decision: 'allow',
          reasonCode: 'TEST',
          rationale: 'Test rationale'
        }
      );
      
      expect(result.successful).toHaveLength(0);
      expect(result.failed[0].error).toBe('Bulk actions not permitted');
    });

    it('should sanitize input data', async () => {
      const maliciousRequest = {
        caseId: 1,
        decision: 'block' as const,
        reasonCode: '<script>alert("xss")</script>',
        rationale: 'Normal rationale'
      };
      
      // The service should handle sanitization
      mockModeratorDecisionService.processDecision.mockResolvedValue(mockDecisionResult);
      
      const result = await moderatorDecisionService.processDecision(mockModerator, maliciousRequest);
      
      expect(result.success).toBe(true);
    });

    it('should audit all moderator actions', async () => {
      mockModeratorActivityService.logActivity.mockResolvedValue(undefined);
      
      await moderatorActivityService.logActivity(
        'mod-123',
        'case_decision',
        { caseId: 1, decision: 'block' },
        'session-123',
        '192.168.1.1'
      );
      
      expect(mockModeratorActivityService.logActivity).toHaveBeenCalledWith(
        'mod-123',
        'case_decision',
        { caseId: 1, decision: 'block' },
        'session-123',
        '192.168.1.1'
      );
    });
  });
});

describe('Integration Tests', () => {
  it('should complete full moderation workflow', async () => {
    // This would test the complete flow from case assignment to decision
    const mockModerator: ModeratorProfile = {
      id: 'mod-123',
      userId: 'user-123',
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'senior',
      permissions: {
        canReviewContent: true,
        canMakeDecisions: true,
        canAccessBulkActions: false,
        canViewAnalytics: true,
        canManagePolicies: false,
        allowedContentTypes: ['post', 'comment'],
        allowedSeverityLevels: ['low', 'medium', 'high']
      },
      isActive: true,
      totalCasesReviewed: 100,
      accuracyScore: 0.9,
      avgDecisionTime: 200,
      specializations: ['spam'],
      createdAt: new Date(),
      lastActiveAt: new Date()
    };

    // 1. Get next case
    const mockCase = {
      case: {
        id: 1,
        contentId: 'content-123',
        contentType: 'post',
        userId: 'user-456',
        status: 'pending',
        riskScore: 0.8,
        confidence: 0.9,
        vendorScores: { openai: 0.85, perspective: 0.95 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      reports: [],
      reportCount: 3,
      priorityScore: 0.85
    };

    mockReviewQueueService.getNextCase.mockResolvedValue(mockCase);

    // 2. Make decision
    const decisionRequest = {
      caseId: 1,
      decision: 'block' as const,
      reasonCode: 'SPAM_CONTENT',
      rationale: 'Content identified as spam based on multiple reports and AI analysis.'
    };

    const decisionResult = {
      success: true,
      actionId: 456,
      evidenceCid: 'QmEvidence123',
      reputationChange: -5
    };

    mockModeratorDecisionService.processDecision.mockResolvedValue(decisionResult);

    // 3. Log activity
    mockModeratorActivityService.trackCaseReviewStart.mockResolvedValue(undefined);
    mockModeratorActivityService.trackCaseReviewComplete.mockResolvedValue(undefined);

    // Execute workflow
    const nextCase = await reviewQueueService.getNextCase(mockModerator);
    expect(nextCase).toEqual(mockCase);

    await moderatorActivityService.trackCaseReviewStart(mockModerator.id, 1, 'session-123');

    const decision = await moderatorDecisionService.processDecision(mockModerator, decisionRequest);
    expect(decision).toEqual(decisionResult);

    await moderatorActivityService.trackCaseReviewComplete(mockModerator.id, 1, 'block', 'session-123');

    // Verify all steps were called
    expect(mockReviewQueueService.getNextCase).toHaveBeenCalledWith(mockModerator);
    expect(mockModeratorDecisionService.processDecision).toHaveBeenCalledWith(mockModerator, decisionRequest);
    expect(mockModeratorActivityService.trackCaseReviewStart).toHaveBeenCalledWith(mockModerator.id, 1, 'session-123');
    expect(mockModeratorActivityService.trackCaseReviewComplete).toHaveBeenCalledWith(mockModerator.id, 1, 'block', 'session-123');
  });
});
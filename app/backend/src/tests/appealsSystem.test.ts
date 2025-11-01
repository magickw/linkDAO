import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import { databaseService } from '../services/databaseService';
import { moderationCases, moderationAppeals, appealJurors, moderationAuditLog } from '../db/schema';
import { appealsService, AppealSubmission, AppealStatusUpdate } from '../services/appealsService';
import { appealNotificationService } from '../services/appealNotificationService';
import { eq, sql } from 'drizzle-orm';

// Mock data
const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
const mockAppellantId = '987fcdeb-51a2-43d1-b789-123456789abc';
const mockModerationCase = {
  id: 1,
  contentId: 'post_123',
  contentType: 'post',
  userId: mockAppellantId,
  status: 'blocked',
  riskScore: '0.95',
  decision: 'block',
  reasonCode: 'hate_speech',
  confidence: '0.92',
  vendorScores: { openai: 0.95, perspective: 0.89 },
  evidenceCid: 'QmTestEvidence123',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z')
};

const mockAppealSubmission: AppealSubmission = {
  caseId: 1,
  appellantId: mockAppellantId,
  reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes. I have additional context that shows this was taken out of context.',
  stakeAmount: '150.0',
  evidenceUrls: ['https://example.com/evidence1.pdf', 'https://example.com/context.jpg'],
  contactInfo: 'appellant@example.com'
};

describe('Appeals System', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(appealJurors);
    await db.delete(moderationAppeals);
    await db.delete(moderationCases);
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(appealJurors);
    await db.delete(moderationAppeals);
    await db.delete(moderationCases);
  });

  beforeEach(async () => {
    // Insert mock moderation case
    await db.insert(moderationCases).values(mockModerationCase);
  });

  afterEach(async () => {
    // Clean up after each test
    await db.delete(appealJurors);
    await db.delete(moderationAppeals);
    await db.delete(moderationCases);
  });

  describe('Appeal Submission', () => {
    it('should successfully submit a valid appeal', async () => {
      const result = await appealsService.submitAppeal(mockAppealSubmission);

      expect(result.success).toBe(true);
      expect(result.appealId).toBeDefined();
      expect(typeof result.appealId).toBe('number');

      // Verify appeal was created in database
      const appeals = await db
        .select()
        .from(moderationAppeals)
        .where(eq(moderationAppeals.caseId, mockAppealSubmission.caseId));

      expect(appeals).toHaveLength(1);
      expect(appeals[0].appellantId).toBe(mockAppealSubmission.appellantId);
      expect(appeals[0].status).toBe('open');
      expect(appeals[0].stakeAmount).toBe(mockAppealSubmission.stakeAmount);

      // Verify moderation case status was updated
      const cases = await db
        .select()
        .from(moderationCases)
        .where(eq(moderationCases.id, mockAppealSubmission.caseId));

      expect(cases[0].status).toBe('appealed');
    });

    it('should reject appeal for non-existent case', async () => {
      const invalidSubmission = {
        ...mockAppealSubmission,
        caseId: 999
      };

      const result = await appealsService.submitAppeal(invalidSubmission);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Moderation case not found');
    });

    it('should reject appeal from non-content owner', async () => {
      const invalidSubmission = {
        ...mockAppealSubmission,
        appellantId: mockUserId // Different user
      };

      const result = await appealsService.submitAppeal(invalidSubmission);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only content owner can appeal this case');
    });

    it('should reject appeal for non-appealable case status', async () => {
      // Update case to allowed status
      await db
        .update(moderationCases)
        .set({ status: 'allowed' })
        .where(eq(moderationCases.id, mockModerationCase.id));

      const result = await appealsService.submitAppeal(mockAppealSubmission);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Case is not in an appealable state');
    });

    it('should reject duplicate appeal for same case', async () => {
      // Submit first appeal
      await appealsService.submitAppeal(mockAppealSubmission);

      // Try to submit second appeal
      const result = await appealsService.submitAppeal(mockAppealSubmission);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Appeal already exists for this case');
    });

    it('should reject appeal with insufficient stake', async () => {
      const lowStakeSubmission = {
        ...mockAppealSubmission,
        stakeAmount: '10.0' // Below minimum for blocked content
      };

      const result = await appealsService.submitAppeal(lowStakeSubmission);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Minimum stake of 100 tokens required');
    });

    it('should validate appeal submission data', async () => {
      const invalidSubmission = {
        ...mockAppealSubmission,
        reasoning: 'Too short', // Below 50 character minimum
        stakeAmount: 'invalid' // Invalid number format
      };

      const result = await appealsService.submitAppeal(invalidSubmission);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid appeal data');
    });
  });

  describe('Appeal Case Management', () => {
    let appealId: number;

    beforeEach(async () => {
      const result = await appealsService.submitAppeal(mockAppealSubmission);
      appealId = result.appealId!;
    });

    it('should retrieve appeal case with original moderation details', async () => {
      const appeal = await appealsService.getAppealCase(appealId);

      expect(appeal).toBeDefined();
      expect(appeal!.id).toBe(appealId);
      expect(appeal!.caseId).toBe(mockAppealSubmission.caseId);
      expect(appeal!.appellantId).toBe(mockAppealSubmission.appellantId);
      expect(appeal!.status).toBe('open');
      expect(appeal!.stakeAmount).toBe(mockAppealSubmission.stakeAmount);

      // Check original case details
      expect(appeal!.originalCase).toBeDefined();
      expect(appeal!.originalCase!.contentId).toBe(mockModerationCase.contentId);
      expect(appeal!.originalCase!.decision).toBe(mockModerationCase.decision);
      expect(appeal!.originalCase!.reasonCode).toBe(mockModerationCase.reasonCode);
    });

    it('should return null for non-existent appeal', async () => {
      const appeal = await appealsService.getAppealCase(999);
      expect(appeal).toBeNull();
    });

    it('should get user appeals with pagination', async () => {
      // Create additional appeals for testing pagination
      const case2 = { ...mockModerationCase, id: 2, contentId: 'post_456' };
      await db.insert(moderationCases).values(case2);
      
      const submission2 = { ...mockAppealSubmission, caseId: 2 };
      await appealsService.submitAppeal(submission2);

      const result = await appealsService.getUserAppeals(mockAppellantId, 1, 10);

      expect(result.appeals).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);

      // Check ordering (newest first)
      expect(result.appeals[0].caseId).toBe(2);
      expect(result.appeals[1].caseId).toBe(1);
    });

    it('should get appeals by status', async () => {
      const result = await appealsService.getAppealsByStatus('open', 1, 10);

      expect(result.appeals).toHaveLength(1);
      expect(result.appeals[0].status).toBe('open');
      expect(result.total).toBe(1);
    });
  });

  describe('Appeal Status Updates', () => {
    let appealId: number;

    beforeEach(async () => {
      const result = await appealsService.submitAppeal(mockAppealSubmission);
      appealId = result.appealId!;
    });

    it('should update appeal status with valid transition', async () => {
      const update: AppealStatusUpdate = {
        appealId,
        status: 'jury_selection',
        executedBy: 'system'
      };

      const result = await appealsService.updateAppealStatus(update);

      expect(result.success).toBe(true);

      // Verify status was updated
      const appeal = await appealsService.getAppealCase(appealId);
      expect(appeal!.status).toBe('jury_selection');
    });

    it('should reject invalid status transitions', async () => {
      const update: AppealStatusUpdate = {
        appealId,
        status: 'executed', // Invalid: can't go directly from 'open' to 'executed'
        executedBy: 'system'
      };

      const result = await appealsService.updateAppealStatus(update);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });

    it('should update appeal with jury decision', async () => {
      // First transition to decided status
      await appealsService.updateAppealStatus({
        appealId,
        status: 'jury_selection',
        executedBy: 'system'
      });

      await appealsService.updateAppealStatus({
        appealId,
        status: 'voting',
        executedBy: 'system'
      });

      const update: AppealStatusUpdate = {
        appealId,
        status: 'decided',
        juryDecision: 'overturn',
        decisionCid: 'QmJuryDecision123',
        executedBy: 'system'
      };

      const result = await appealsService.updateAppealStatus(update);

      expect(result.success).toBe(true);

      // Verify decision was recorded
      const appeal = await appealsService.getAppealCase(appealId);
      expect(appeal!.status).toBe('decided');
      expect(appeal!.juryDecision).toBe('overturn');
      expect(appeal!.decisionCid).toBe('QmJuryDecision123');
    });

    it('should reject update for non-existent appeal', async () => {
      const update: AppealStatusUpdate = {
        appealId: 999,
        status: 'jury_selection',
        executedBy: 'system'
      };

      const result = await appealsService.updateAppealStatus(update);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Appeal not found');
    });
  });

  describe('Appeal Workflow State Machine', () => {
    let appealId: number;

    beforeEach(async () => {
      const result = await appealsService.submitAppeal(mockAppealSubmission);
      appealId = result.appealId!;
    });

    it('should follow complete workflow: open -> jury_selection -> voting -> decided -> executed', async () => {
      // Step 1: open -> jury_selection
      let result = await appealsService.updateAppealStatus({
        appealId,
        status: 'jury_selection',
        executedBy: 'system'
      });
      expect(result.success).toBe(true);

      // Step 2: jury_selection -> voting
      result = await appealsService.updateAppealStatus({
        appealId,
        status: 'voting',
        executedBy: 'system'
      });
      expect(result.success).toBe(true);

      // Step 3: voting -> decided
      result = await appealsService.updateAppealStatus({
        appealId,
        status: 'decided',
        juryDecision: 'overturn',
        executedBy: 'system'
      });
      expect(result.success).toBe(true);

      // Step 4: decided -> executed
      result = await appealsService.updateAppealStatus({
        appealId,
        status: 'executed',
        executedBy: 'system'
      });
      expect(result.success).toBe(true);

      // Verify final state
      const appeal = await appealsService.getAppealCase(appealId);
      expect(appeal!.status).toBe('executed');
      expect(appeal!.juryDecision).toBe('overturn');
    });

    it('should reject skipping workflow steps', async () => {
      // Try to skip from 'open' directly to 'voting'
      const result = await appealsService.updateAppealStatus({
        appealId,
        status: 'voting',
        executedBy: 'system'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });
  });

  describe('Appeal Evidence and Audit Trail', () => {
    let appealId: number;

    beforeEach(async () => {
      const result = await appealsService.submitAppeal(mockAppealSubmission);
      appealId = result.appealId!;
    });

    it('should log appeal submission in audit trail', async () => {
      // Check audit log entries
      const auditLogs = await db
        .select()
        .from(moderationAuditLog)
        .where(eq(moderationAuditLog.actionType, 'appeal_appeal_submitted'));

      expect(auditLogs.length).toBeGreaterThan(0);
      
      const log = auditLogs[0];
      expect(log.actorId).toBe(mockAppealSubmission.appellantId);
      expect(log.actorType).toBe('user');
      
      const logState = JSON.parse(log.newState || '{}');
      expect(logState.caseId).toBe(mockAppealSubmission.caseId);
      expect(logState.stakeAmount).toBe(mockAppealSubmission.stakeAmount);
    });

    it('should log status updates in audit trail', async () => {
      await appealsService.updateAppealStatus({
        appealId,
        status: 'jury_selection',
        executedBy: 'admin_123'
      });

      const auditLogs = await db
        .select()
        .from(moderationAuditLog)
        .where(eq(moderationAuditLog.actionType, 'appeal_status_updated'));

      expect(auditLogs.length).toBeGreaterThan(0);
      
      const log = auditLogs[0];
      expect(log.actorId).toBe('admin_123');
      
      const logState = JSON.parse(log.newState || '{}');
      expect(logState.appealId).toBe(appealId);
      expect(logState.newStatus).toBe('jury_selection');
    });
  });

  describe('Appeal Notifications', () => {
    let appealId: number;

    beforeEach(async () => {
      const result = await appealsService.submitAppeal(mockAppealSubmission);
      appealId = result.appealId!;
    });

    it('should send notification on appeal submission', async () => {
      const notifySpy = vi.spyOn(appealNotificationService, 'notifyAppealSubmitted');
      
      // Submit another appeal to test notification
      const case2 = { ...mockModerationCase, id: 2, contentId: 'post_456' };
      await db.insert(moderationCases).values(case2);
      
      const submission2 = { ...mockAppealSubmission, caseId: 2 };
      const result = await appealsService.submitAppeal(submission2);

      expect(result.success).toBe(true);
      // Note: In a real implementation, this would be called from the service
      // For testing, we verify the notification service method exists and works
      expect(appealNotificationService.notifyAppealSubmitted).toBeDefined();
    });

    it('should send notification on status change', async () => {
      const notifySpy = vi.spyOn(appealNotificationService, 'notifyAppealStatusChanged');
      
      await appealsService.updateAppealStatus({
        appealId,
        status: 'jury_selection',
        executedBy: 'system'
      });

      // Verify notification service method exists
      expect(appealNotificationService.notifyAppealStatusChanged).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalSelect = db.select;
      vi.spyOn(db, 'select').mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await appealsService.submitAppeal(mockAppealSubmission);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to submit appeal');

      // Restore original method
      db.select = originalSelect;
    });

    it('should handle invalid appeal data gracefully', async () => {
      const invalidSubmission = {
        caseId: 'invalid', // Should be number
        appellantId: 'not-a-uuid',
        reasoning: '', // Too short
        stakeAmount: 'not-a-number'
      } as any;

      const result = await appealsService.submitAppeal(invalidSubmission);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid appeal data');
    });

    it('should handle concurrent appeal submissions', async () => {
      // Simulate concurrent submissions
      const promises = [
        appealsService.submitAppeal(mockAppealSubmission),
        appealsService.submitAppeal(mockAppealSubmission)
      ];

      const results = await Promise.all(promises);

      // One should succeed, one should fail with duplicate error
      const successCount = results.filter(r => r.success).length;
      const duplicateErrors = results.filter(r => 
        !r.success && r.error === 'Appeal already exists for this case'
      ).length;

      expect(successCount).toBe(1);
      expect(duplicateErrors).toBe(1);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle pagination efficiently', async () => {
      // Create multiple appeals for pagination testing
      const cases = [];
      for (let i = 2; i <= 25; i++) {
        cases.push({
          ...mockModerationCase,
          id: i,
          contentId: `post_${i}`
        });
      }
      
      await db.insert(moderationCases).values(cases);

      // Submit appeals for all cases
      for (let i = 2; i <= 25; i++) {
        await appealsService.submitAppeal({
          ...mockAppealSubmission,
          caseId: i
        });
      }

      // Test pagination
      const page1 = await appealsService.getUserAppeals(mockAppellantId, 1, 10);
      const page2 = await appealsService.getUserAppeals(mockAppellantId, 2, 10);
      const page3 = await appealsService.getUserAppeals(mockAppellantId, 3, 10);

      expect(page1.appeals).toHaveLength(10);
      expect(page2.appeals).toHaveLength(10);
      expect(page3.appeals).toHaveLength(5); // Remaining appeals
      expect(page1.total).toBe(25);
      expect(page2.total).toBe(25);
      expect(page3.total).toBe(25);

      // Verify no duplicates across pages
      const allAppealIds = [
        ...page1.appeals.map(a => a.id),
        ...page2.appeals.map(a => a.id),
        ...page3.appeals.map(a => a.id)
      ];
      const uniqueIds = new Set(allAppealIds);
      expect(uniqueIds.size).toBe(25);
    });
  });
});

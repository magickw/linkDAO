import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '../db/connection';
import {
  moderationCases,
  moderationActions,
  contentReports,
  moderationAppeals,
  appealJurors,
  moderationPolicies,
  moderationVendors,
  moderationAuditLog,
  moderationMetrics,
  contentHashes,
  reputationImpacts,
  users
} from '../db/schema';
  validateModerationCase,
  validateModerationAction,
  validateContentReport,
  validateModerationAppeal,
  validateAppealJuror,
  validateModerationPolicy,
  validateModerationVendor,
  validateModerationAuditLog,
  validateModerationMetrics,
  validateContentHash,
  validateReputationImpact,
  ContentType,
  ModerationStatus,
  ModerationDecision,
  ModerationAction,
  ReportReason,
  ReportStatus,
  AppealStatus,
  JuryDecision,
  PolicySeverity,
  VendorType,
  ActorType,
  HashType,
  ReputationImpactType
} from '../models/ModerationModels';
import { eq } from 'drizzle-orm';

describe('Moderation Models and Database Operations', () => {
  let testUserId: string;
  let testCaseId: number;
  let testAppealId: number;

  beforeEach(async () => {
    // Create a test user with unique wallet address
    const uniqueWallet = `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`;
    const uniqueHandle = `testuser_mod_${Math.random().toString(36).substring(7)}`;
    
    const [testUser] = await db.insert(users).values({
      walletAddress: uniqueWallet,
      handle: uniqueHandle,
    }).returning();
    testUserId = testUser.id;
  });

  afterEach(async () => {
    // Clean up test data in reverse dependency order
    if (testUserId) {
      await db.delete(reputationImpacts).where(eq(reputationImpacts.userId, testUserId));
      await db.delete(contentReports).where(eq(contentReports.reporterId, testUserId));
      await db.delete(moderationActions).where(eq(moderationActions.userId, testUserId));
      await db.delete(moderationCases).where(eq(moderationCases.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    
    // Clean up other test data
    await db.delete(contentHashes);
    await db.delete(moderationMetrics);
    await db.delete(moderationAuditLog);
    await db.delete(appealJurors);
    await db.delete(moderationAppeals);
    
    // Clean up policy and vendor test data
    await db.delete(moderationPolicies).where(eq(moderationPolicies.category, 'test_category'));
    await db.delete(moderationVendors).where(eq(moderationVendors.vendorName, 'test_vendor'));
  });

  describe('Schema Validation', () => {
    it('should validate moderation case data correctly', () => {
      const validCase = {
        contentId: 'post_123',
        contentType: 'post' as const,
        userId: testUserId,
        status: 'pending' as const,
        riskScore: 0.75,
        confidence: 0.85,
        vendorScores: { openai: 0.9, perspective: 0.8 }
      };

      expect(() => validateModerationCase(validCase)).not.toThrow();

      // Test invalid data
      expect(() => validateModerationCase({
        ...validCase,
        riskScore: 1.5 // Invalid: > 1
      })).toThrow();

      expect(() => validateModerationCase({
        ...validCase,
        contentType: 'invalid_type'
      })).toThrow();
    });

    it('should validate moderation action data correctly', () => {
      const validAction = {
        userId: testUserId,
        contentId: 'post_123',
        action: 'warn' as const,
        durationSec: 3600,
        appliedBy: 'moderator_1',
        rationale: 'Violation of community guidelines'
      };

      expect(() => validateModerationAction(validAction)).not.toThrow();

      // Test invalid data
      expect(() => validateModerationAction({
        ...validAction,
        durationSec: -1 // Invalid: negative duration
      })).toThrow();
    });

    it('should validate content report data correctly', () => {
      const validReport = {
        contentId: 'post_123',
        reporterId: testUserId,
        reason: 'spam' as const,
        details: 'This post contains spam content',
        weight: 1.5
      };

      expect(() => validateContentReport(validReport)).not.toThrow();

      // Test invalid data
      expect(() => validateContentReport({
        ...validReport,
        weight: 15 // Invalid: > 10
      })).toThrow();
    });

    it('should validate moderation appeal data correctly', () => {
      const validAppeal = {
        caseId: 1,
        appellantId: testUserId,
        status: 'open' as const,
        stakeAmount: '100.0'
      };

      expect(() => validateModerationAppeal(validAppeal)).not.toThrow();
    });

    it('should validate appeal juror data correctly', () => {
      const validJuror = {
        appealId: 1,
        jurorId: testUserId,
        selectionWeight: 1.5,
        voteReveal: 'uphold' as const,
        rewardAmount: '50.0'
      };

      expect(() => validateAppealJuror(validJuror)).not.toThrow();

      // Test invalid data
      expect(() => validateAppealJuror({
        ...validJuror,
        selectionWeight: -1 // Invalid: negative weight
      })).toThrow();
    });

    it('should validate moderation policy data correctly', () => {
      const validPolicy = {
        category: 'test_category',
        severity: 'high' as const,
        confidenceThreshold: 0.85,
        action: 'block' as const,
        reputationModifier: -0.1,
        description: 'Test policy for validation'
      };

      expect(() => validateModerationPolicy(validPolicy)).not.toThrow();

      // Test invalid data
      expect(() => validateModerationPolicy({
        ...validPolicy,
        confidenceThreshold: 1.5 // Invalid: > 1
      })).toThrow();
    });

    it('should validate moderation vendor data correctly', () => {
      const validVendor = {
        vendorName: 'test_vendor',
        vendorType: 'text' as const,
        apiEndpoint: 'https://api.example.com',
        weight: 0.5,
        costPerRequest: 0.001,
        avgLatencyMs: 250,
        successRate: 0.99
      };

      expect(() => validateModerationVendor(validVendor)).not.toThrow();

      // Test invalid data
      expect(() => validateModerationVendor({
        ...validVendor,
        weight: 1.5 // Invalid: > 1
      })).toThrow();
    });
  });

  describe('Database Operations', () => {
    it('should create and retrieve moderation cases', async () => {
      const caseData = {
        contentId: 'post_123',
        contentType: 'post',
        userId: testUserId,
        status: 'pending',
        riskScore: '0.75',
        confidence: '0.85',
        vendorScores: JSON.stringify({ openai: 0.9, perspective: 0.8 })
      };

      const [insertedCase] = await db.insert(moderationCases)
        .values(caseData)
        .returning();

      expect(insertedCase).toBeDefined();
      expect(insertedCase.contentId).toBe('post_123');
      expect(insertedCase.userId).toBe(testUserId);
      expect(insertedCase.status).toBe('pending');

      testCaseId = insertedCase.id;

      // Retrieve the case
      const [retrievedCase] = await db.select()
        .from(moderationCases)
        .where(eq(moderationCases.id, insertedCase.id));

      expect(retrievedCase).toBeDefined();
      expect(retrievedCase.contentId).toBe('post_123');
    });

    it('should create and retrieve moderation actions', async () => {
      // First create a moderation case
      const [testCase] = await db.insert(moderationCases)
        .values({
          contentId: 'post_456',
          contentType: 'post',
          userId: testUserId,
          status: 'blocked'
        })
        .returning();

      const actionData = {
        userId: testUserId,
        contentId: 'post_456',
        action: 'warn',
        durationSec: 3600,
        appliedBy: 'moderator_1',
        rationale: 'First warning for policy violation'
      };

      const [insertedAction] = await db.insert(moderationActions)
        .values(actionData)
        .returning();

      expect(insertedAction).toBeDefined();
      expect(insertedAction.action).toBe('warn');
      expect(insertedAction.durationSec).toBe(3600);
    });

    it('should create and retrieve content reports', async () => {
      const reportData = {
        contentId: 'post_789',
        reporterId: testUserId,
        reason: 'spam',
        details: 'This content appears to be spam',
        weight: '1.5',
        status: 'open'
      };

      const [insertedReport] = await db.insert(contentReports)
        .values(reportData)
        .returning();

      expect(insertedReport).toBeDefined();
      expect(insertedReport.reason).toBe('spam');
      expect(insertedReport.reporterId).toBe(testUserId);
    });

    it('should create and retrieve moderation appeals', async () => {
      // First create a moderation case
      const [testCase] = await db.insert(moderationCases)
        .values({
          contentId: 'post_appeal',
          contentType: 'post',
          userId: testUserId,
          status: 'blocked',
          decision: 'block'
        })
        .returning();

      const appealData = {
        caseId: testCase.id,
        appellantId: testUserId,
        status: 'open',
        stakeAmount: '100.0'
      };

      const [insertedAppeal] = await db.insert(moderationAppeals)
        .values(appealData)
        .returning();

      expect(insertedAppeal).toBeDefined();
      expect(insertedAppeal.caseId).toBe(testCase.id);
      expect(insertedAppeal.appellantId).toBe(testUserId);

      testAppealId = insertedAppeal.id;
    });

    it('should create and retrieve appeal jurors', async () => {
      // First create necessary dependencies
      const [testCase] = await db.insert(moderationCases)
        .values({
          contentId: 'post_jury',
          contentType: 'post',
          userId: testUserId,
          status: 'appealed'
        })
        .returning();

      const [testAppeal] = await db.insert(moderationAppeals)
        .values({
          caseId: testCase.id,
          appellantId: testUserId,
          status: 'jury_selection'
        })
        .returning();

      const jurorData = {
        appealId: testAppeal.id,
        jurorId: testUserId,
        selectionWeight: '1.5',
        voteReveal: 'uphold',
        rewardAmount: '25.0'
      };

      const [insertedJuror] = await db.insert(appealJurors)
        .values(jurorData)
        .returning();

      expect(insertedJuror).toBeDefined();
      expect(insertedJuror.appealId).toBe(testAppeal.id);
      expect(insertedJuror.voteReveal).toBe('uphold');
    });

    it('should create and retrieve moderation policies', async () => {
      const policyData = {
        category: 'test_category',
        severity: 'high',
        confidenceThreshold: '0.85',
        action: 'block',
        reputationModifier: '-0.1',
        description: 'Test policy for database operations',
        isActive: true
      };

      const [insertedPolicy] = await db.insert(moderationPolicies)
        .values(policyData)
        .returning();

      expect(insertedPolicy).toBeDefined();
      expect(insertedPolicy.category).toBe('test_category');
      expect(insertedPolicy.severity).toBe('high');
      expect(insertedPolicy.isActive).toBe(true);
    });

    it('should create and retrieve moderation vendors', async () => {
      const vendorData = {
        vendorName: 'test_vendor',
        vendorType: 'text',
        apiEndpoint: 'https://api.test-vendor.com',
        isEnabled: true,
        weight: '0.5',
        costPerRequest: '0.001',
        avgLatencyMs: 250,
        successRate: '0.99',
        configuration: JSON.stringify({ apiKey: 'test_key' })
      };

      const [insertedVendor] = await db.insert(moderationVendors)
        .values(vendorData)
        .returning();

      expect(insertedVendor).toBeDefined();
      expect(insertedVendor.vendorName).toBe('test_vendor');
      expect(insertedVendor.vendorType).toBe('text');
      expect(insertedVendor.isEnabled).toBe(true);
    });

    it('should create and retrieve audit log entries', async () => {
      const auditData = {
        actionType: 'case_created',
        actorId: testUserId,
        actorType: 'user',
        newState: JSON.stringify({ status: 'pending' }),
        reasoning: 'New moderation case created',
        ipAddress: '192.168.1.1',
        userAgent: 'Test User Agent'
      };

      const [insertedAudit] = await db.insert(moderationAuditLog)
        .values(auditData)
        .returning();

      expect(insertedAudit).toBeDefined();
      expect(insertedAudit.actionType).toBe('case_created');
      expect(insertedAudit.actorId).toBe(testUserId);
    });

    it('should create and retrieve metrics', async () => {
      const metricsData = {
        metricType: 'performance',
        metricName: 'avg_processing_time',
        metricValue: '250.5',
        dimensions: JSON.stringify({ vendor: 'openai', content_type: 'text' })
      };

      const [insertedMetric] = await db.insert(moderationMetrics)
        .values(metricsData)
        .returning();

      expect(insertedMetric).toBeDefined();
      expect(insertedMetric.metricType).toBe('performance');
      expect(insertedMetric.metricName).toBe('avg_processing_time');
    });

    it('should create and retrieve content hashes', async () => {
      const hashData = {
        contentId: 'post_hash_test',
        contentType: 'post',
        hashType: 'sha256',
        hashValue: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
      };

      const [insertedHash] = await db.insert(contentHashes)
        .values(hashData)
        .returning();

      expect(insertedHash).toBeDefined();
      expect(insertedHash.contentId).toBe('post_hash_test');
      expect(insertedHash.hashType).toBe('sha256');
    });

    it('should create and retrieve reputation impacts', async () => {
      // First create a moderation case
      const [testCase] = await db.insert(moderationCases)
        .values({
          contentId: 'post_reputation',
          contentType: 'post',
          userId: testUserId,
          status: 'blocked'
        })
        .returning();

      const impactData = {
        userId: testUserId,
        caseId: testCase.id,
        impactType: 'violation',
        impactValue: '-10.0',
        previousReputation: '100.0',
        newReputation: '90.0',
        description: 'Reputation penalty for policy violation'
      };

      const [insertedImpact] = await db.insert(reputationImpacts)
        .values(impactData)
        .returning();

      expect(insertedImpact).toBeDefined();
      expect(insertedImpact.userId).toBe(testUserId);
      expect(insertedImpact.impactType).toBe('violation');
    });
  });

  describe('Database Constraints and Indices', () => {
    it('should enforce foreign key constraints', async () => {
      // Try to create a moderation case with non-existent user
      await expect(
        db.insert(moderationCases).values({
          contentId: 'post_invalid',
          contentType: 'post',
          userId: '00000000-0000-0000-0000-000000000000', // Non-existent user
          status: 'pending'
        })
      ).rejects.toThrow();
    });

    it('should enforce check constraints', async () => {
      // Try to create a case with invalid risk score
      await expect(
        db.insert(moderationCases).values({
          contentId: 'post_invalid_risk',
          contentType: 'post',
          userId: testUserId,
          status: 'pending',
          riskScore: '1.5' // Invalid: > 1
        })
      ).rejects.toThrow();
    });

    it('should enforce unique constraints', async () => {
      // Create a vendor
      await db.insert(moderationVendors).values({
        vendorName: 'unique_test_vendor',
        vendorType: 'text'
      });

      // Try to create another vendor with the same name
      await expect(
        db.insert(moderationVendors).values({
          vendorName: 'unique_test_vendor',
          vendorType: 'image'
        })
      ).rejects.toThrow();
    });

    it('should use indices for efficient queries', async () => {
      // Create multiple cases for the same user
      const cases = [];
      for (let i = 0; i < 5; i++) {
        cases.push({
          contentId: `post_index_test_${i}`,
          contentType: 'post',
          userId: testUserId,
          status: i % 2 === 0 ? 'pending' : 'blocked'
        });
      }

      await db.insert(moderationCases).values(cases);

      // Query by user_id (should use index)
      const userCases = await db.select()
        .from(moderationCases)
        .where(eq(moderationCases.userId, testUserId));

      expect(userCases.length).toBeGreaterThanOrEqual(5);

      // Query by status (should use index)
      const pendingCases = await db.select()
        .from(moderationCases)
        .where(eq(moderationCases.status, 'pending'));

      expect(pendingCases.length).toBeGreaterThan(0);
    });
  });

  describe('Enum Validations', () => {
    it('should validate content types', () => {
      const validTypes = ['post', 'comment', 'listing', 'dm', 'username', 'image', 'video'];
      validTypes.forEach(type => {
        expect(() => ContentType.parse(type)).not.toThrow();
      });

      expect(() => ContentType.parse('invalid_type')).toThrow();
    });

    it('should validate moderation statuses', () => {
      const validStatuses = ['pending', 'quarantined', 'blocked', 'allowed', 'appealed', 'under_review'];
      validStatuses.forEach(status => {
        expect(() => ModerationStatus.parse(status)).not.toThrow();
      });

      expect(() => ModerationStatus.parse('invalid_status')).toThrow();
    });

    it('should validate moderation decisions', () => {
      const validDecisions = ['allow', 'limit', 'block', 'review'];
      validDecisions.forEach(decision => {
        expect(() => ModerationDecision.parse(decision)).not.toThrow();
      });

      expect(() => ModerationDecision.parse('invalid_decision')).toThrow();
    });

    it('should validate moderation actions', () => {
      const validActions = ['warn', 'limit', 'suspend', 'ban', 'delete_content', 'quarantine'];
      validActions.forEach(action => {
        expect(() => ModerationAction.parse(action)).not.toThrow();
      });

      expect(() => ModerationAction.parse('invalid_action')).toThrow();
    });

    it('should validate report reasons', () => {
      const validReasons = ['spam', 'harassment', 'hate_speech', 'violence', 'nsfw', 'scam', 'fake_content', 'copyright', 'other'];
      validReasons.forEach(reason => {
        expect(() => ReportReason.parse(reason)).not.toThrow();
      });

      expect(() => ReportReason.parse('invalid_reason')).toThrow();
    });
  });
});

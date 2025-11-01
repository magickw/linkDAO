import { describe, it, expect } from '@jest/globals';
import {
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
  ReputationImpactType,
  AIModelResult,
  EnsembleDecision,
  ContentInput,
  PolicyRule,
  EvidenceBundle,
  ModerationError
} from '../models/ModerationModels';

describe('Moderation Schema Validation Edge Cases', () => {
  const validUserId = '123e4567-e89b-12d3-a456-426614174000';

  describe('ModerationCase Validation', () => {
    const baseModerationCase = {
      contentId: 'post_123',
      contentType: 'post' as const,
      userId: validUserId,
    };

    it('should accept valid moderation case with minimal fields', () => {
      expect(() => validateModerationCase(baseModerationCase)).not.toThrow();
    });

    it('should accept valid moderation case with all fields', () => {
      const fullCase = {
        ...baseModerationCase,
        status: 'quarantined' as const,
        riskScore: 0.85,
        decision: 'block' as const,
        reasonCode: 'HATE_SPEECH_DETECTED',
        confidence: 0.92,
        vendorScores: { openai: 0.95, perspective: 0.89 },
        evidenceCid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      };

      expect(() => validateModerationCase(fullCase)).not.toThrow();
    });

    it('should reject invalid content types', () => {
      expect(() => validateModerationCase({
        ...baseModerationCase,
        contentType: 'invalid_type'
      })).toThrow();
    });

    it('should reject invalid risk scores', () => {
      expect(() => validateModerationCase({
        ...baseModerationCase,
        riskScore: -0.1
      })).toThrow();

      expect(() => validateModerationCase({
        ...baseModerationCase,
        riskScore: 1.1
      })).toThrow();
    });

    it('should reject invalid confidence scores', () => {
      expect(() => validateModerationCase({
        ...baseModerationCase,
        confidence: -0.1
      })).toThrow();

      expect(() => validateModerationCase({
        ...baseModerationCase,
        confidence: 1.1
      })).toThrow();
    });

    it('should reject invalid UUID format', () => {
      expect(() => validateModerationCase({
        ...baseModerationCase,
        userId: 'invalid-uuid'
      })).toThrow();
    });

    it('should reject contentId that is too long', () => {
      expect(() => validateModerationCase({
        ...baseModerationCase,
        contentId: 'a'.repeat(65) // 65 characters, max is 64
      })).toThrow();
    });
  });

  describe('ModerationAction Validation', () => {
    const baseModerationAction = {
      userId: validUserId,
      contentId: 'post_123',
      action: 'warn' as const,
    };

    it('should accept valid moderation action with minimal fields', () => {
      expect(() => validateModerationAction(baseModerationAction)).not.toThrow();
    });

    it('should accept valid moderation action with all fields', () => {
      const fullAction = {
        ...baseModerationAction,
        durationSec: 86400, // 24 hours
        appliedBy: 'moderator_alice',
        rationale: 'First warning for community guidelines violation',
      };

      expect(() => validateModerationAction(fullAction)).not.toThrow();
    });

    it('should reject negative duration', () => {
      expect(() => validateModerationAction({
        ...baseModerationAction,
        durationSec: -1
      })).toThrow();
    });

    it('should accept zero duration for permanent actions', () => {
      expect(() => validateModerationAction({
        ...baseModerationAction,
        action: 'ban' as const,
        durationSec: 0
      })).not.toThrow();
    });

    it('should reject invalid action types', () => {
      expect(() => validateModerationAction({
        ...baseModerationAction,
        action: 'invalid_action'
      })).toThrow();
    });
  });

  describe('ContentReport Validation', () => {
    const baseContentReport = {
      contentId: 'post_123',
      reporterId: validUserId,
      reason: 'spam' as const,
    };

    it('should accept valid content report with minimal fields', () => {
      expect(() => validateContentReport(baseContentReport)).not.toThrow();
    });

    it('should accept valid content report with all fields', () => {
      const fullReport = {
        ...baseContentReport,
        details: 'This post contains repetitive promotional content',
        weight: 2.5,
        status: 'under_review' as const,
      };

      expect(() => validateContentReport(fullReport)).not.toThrow();
    });

    it('should reject weight outside valid range', () => {
      expect(() => validateContentReport({
        ...baseContentReport,
        weight: -1
      })).toThrow();

      expect(() => validateContentReport({
        ...baseContentReport,
        weight: 11
      })).toThrow();
    });

    it('should accept weight at boundaries', () => {
      expect(() => validateContentReport({
        ...baseContentReport,
        weight: 0
      })).not.toThrow();

      expect(() => validateContentReport({
        ...baseContentReport,
        weight: 10
      })).not.toThrow();
    });

    it('should reject invalid report reasons', () => {
      expect(() => validateContentReport({
        ...baseContentReport,
        reason: 'invalid_reason'
      })).toThrow();
    });
  });

  describe('ModerationAppeal Validation', () => {
    const baseModerationAppeal = {
      caseId: 1,
      appellantId: validUserId,
    };

    it('should accept valid moderation appeal with minimal fields', () => {
      expect(() => validateModerationAppeal(baseModerationAppeal)).not.toThrow();
    });

    it('should accept valid moderation appeal with all fields', () => {
      const fullAppeal = {
        ...baseModerationAppeal,
        status: 'voting' as const,
        stakeAmount: '100.5',
        juryDecision: 'overturn' as const,
        decisionCid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      };

      expect(() => validateModerationAppeal(fullAppeal)).not.toThrow();
    });

    it('should reject invalid appeal status', () => {
      expect(() => validateModerationAppeal({
        ...baseModerationAppeal,
        status: 'invalid_status'
      })).toThrow();
    });

    it('should reject invalid jury decision', () => {
      expect(() => validateModerationAppeal({
        ...baseModerationAppeal,
        juryDecision: 'invalid_decision'
      })).toThrow();
    });
  });

  describe('AppealJuror Validation', () => {
    const baseAppealJuror = {
      appealId: 1,
      jurorId: validUserId,
      selectionWeight: 1.5,
    };

    it('should accept valid appeal juror with minimal fields', () => {
      expect(() => validateAppealJuror(baseAppealJuror)).not.toThrow();
    });

    it('should accept valid appeal juror with all fields', () => {
      const fullJuror = {
        ...baseAppealJuror,
        voteCommitment: 'abc123def456',
        voteReveal: 'uphold' as const,
        voteReasoning: 'The original decision was correct based on the evidence',
        rewardAmount: '25.0',
        slashedAmount: '0.0',
      };

      expect(() => validateAppealJuror(fullJuror)).not.toThrow();
    });

    it('should reject negative selection weight', () => {
      expect(() => validateAppealJuror({
        ...baseAppealJuror,
        selectionWeight: -1
      })).toThrow();
    });

    it('should reject invalid vote reveal', () => {
      expect(() => validateAppealJuror({
        ...baseAppealJuror,
        voteReveal: 'invalid_vote'
      })).toThrow();
    });
  });

  describe('ModerationPolicy Validation', () => {
    const baseModerationPolicy = {
      category: 'hate_speech',
      severity: 'critical' as const,
      confidenceThreshold: 0.95,
      action: 'block' as const,
      description: 'Policy for hate speech detection',
    };

    it('should accept valid moderation policy with minimal fields', () => {
      expect(() => validateModerationPolicy(baseModerationPolicy)).not.toThrow();
    });

    it('should accept valid moderation policy with all fields', () => {
      const fullPolicy = {
        ...baseModerationPolicy,
        reputationModifier: -0.2,
        isActive: true,
      };

      expect(() => validateModerationPolicy(fullPolicy)).not.toThrow();
    });

    it('should reject invalid confidence threshold', () => {
      expect(() => validateModerationPolicy({
        ...baseModerationPolicy,
        confidenceThreshold: -0.1
      })).toThrow();

      expect(() => validateModerationPolicy({
        ...baseModerationPolicy,
        confidenceThreshold: 1.1
      })).toThrow();
    });

    it('should reject invalid severity', () => {
      expect(() => validateModerationPolicy({
        ...baseModerationPolicy,
        severity: 'invalid_severity'
      })).toThrow();
    });

    it('should reject invalid action', () => {
      expect(() => validateModerationPolicy({
        ...baseModerationPolicy,
        action: 'invalid_action'
      })).toThrow();
    });
  });

  describe('ModerationVendor Validation', () => {
    const baseModerationVendor = {
      vendorName: 'openai_moderation',
      vendorType: 'text' as const,
    };

    it('should accept valid moderation vendor with minimal fields', () => {
      expect(() => validateModerationVendor(baseModerationVendor)).not.toThrow();
    });

    it('should accept valid moderation vendor with all fields', () => {
      const fullVendor = {
        ...baseModerationVendor,
        apiEndpoint: 'https://api.openai.com/v1/moderations',
        isEnabled: true,
        weight: 0.4,
        costPerRequest: 0.0002,
        avgLatencyMs: 150,
        successRate: 0.999,
        configuration: { apiKey: 'sk-...', model: 'text-moderation-latest' },
      };

      expect(() => validateModerationVendor(fullVendor)).not.toThrow();
    });

    it('should reject invalid weight', () => {
      expect(() => validateModerationVendor({
        ...baseModerationVendor,
        weight: -0.1
      })).toThrow();

      expect(() => validateModerationVendor({
        ...baseModerationVendor,
        weight: 1.1
      })).toThrow();
    });

    it('should reject negative cost per request', () => {
      expect(() => validateModerationVendor({
        ...baseModerationVendor,
        costPerRequest: -0.001
      })).toThrow();
    });

    it('should reject negative latency', () => {
      expect(() => validateModerationVendor({
        ...baseModerationVendor,
        avgLatencyMs: -1
      })).toThrow();
    });

    it('should reject invalid success rate', () => {
      expect(() => validateModerationVendor({
        ...baseModerationVendor,
        successRate: -0.1
      })).toThrow();

      expect(() => validateModerationVendor({
        ...baseModerationVendor,
        successRate: 1.1
      })).toThrow();
    });

    it('should reject invalid vendor type', () => {
      expect(() => validateModerationVendor({
        ...baseModerationVendor,
        vendorType: 'invalid_type'
      })).toThrow();
    });
  });

  describe('Complex Type Interfaces', () => {
    it('should validate AIModelResult interface structure', () => {
      const validResult: AIModelResult = {
        vendor: 'openai',
        confidence: 0.95,
        categories: ['hate_speech', 'harassment'],
        reasoning: 'Content contains discriminatory language',
        cost: 0.0002,
        latency: 150,
        rawResponse: { flagged: true, categories: { hate: true } }
      };

      expect(validResult.vendor).toBe('openai');
      expect(validResult.confidence).toBe(0.95);
      expect(validResult.categories).toContain('hate_speech');
    });

    it('should validate EnsembleDecision interface structure', () => {
      const validDecision: EnsembleDecision = {
        overallConfidence: 0.92,
        primaryCategory: 'hate_speech',
        action: 'block',
        vendorResults: [
          {
            vendor: 'openai',
            confidence: 0.95,
            categories: ['hate_speech'],
            cost: 0.0002,
            latency: 150
          },
          {
            vendor: 'perspective',
            confidence: 0.89,
            categories: ['toxicity'],
            cost: 0.0001,
            latency: 200
          }
        ],
        evidenceHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
        reasoning: 'Multiple vendors detected hate speech with high confidence'
      };

      expect(validDecision.overallConfidence).toBe(0.92);
      expect(validDecision.action).toBe('block');
      expect(validDecision.vendorResults).toHaveLength(2);
    });

    it('should validate ContentInput interface structure', () => {
      const validInput: ContentInput = {
        id: 'post_123',
        type: 'post',
        text: 'This is a test post content',
        media: [
          {
            url: 'https://example.com/image.jpg',
            type: 'image',
            hash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'
          }
        ],
        links: ['https://example.com'],
        userId: validUserId,
        userReputation: 85.5,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'web_app'
        }
      };

      expect(validInput.id).toBe('post_123');
      expect(validInput.type).toBe('post');
      expect(validInput.media).toHaveLength(1);
      expect(validInput.links).toContain('https://example.com');
    });

    it('should validate PolicyRule interface structure', () => {
      const validRule: PolicyRule = {
        category: 'hate_speech',
        severity: 'critical',
        confidenceThreshold: 0.95,
        action: 'block',
        reputationModifier: -0.2,
        description: 'Automatic blocking for hate speech content'
      };

      expect(validRule.category).toBe('hate_speech');
      expect(validRule.severity).toBe('critical');
      expect(validRule.confidenceThreshold).toBe(0.95);
    });

    it('should validate EvidenceBundle interface structure', () => {
      const validBundle: EvidenceBundle = {
        caseId: 123,
        contentHash: 'sha256:abc123def456',
        screenshots: ['QmScreenshot1', 'QmScreenshot2'],
        modelOutputs: {
          openai: { flagged: true, categories: { hate: true } },
          perspective: { summaryScore: { value: 0.95 } }
        },
        decisionRationale: 'Content violates hate speech policy',
        policyVersion: 'v2.1.0',
        timestamp: new Date(),
        moderatorId: 'mod_alice'
      };

      expect(validBundle.caseId).toBe(123);
      expect(validBundle.screenshots).toHaveLength(2);
      expect(validBundle.modelOutputs).toHaveProperty('openai');
    });

    it('should validate ModerationError interface structure', () => {
      const validError: ModerationError = {
        code: 'VENDOR_TIMEOUT',
        message: 'OpenAI API request timed out',
        retryable: true,
        fallbackAction: 'queue',
        vendor: 'openai'
      };

      expect(validError.code).toBe('VENDOR_TIMEOUT');
      expect(validError.retryable).toBe(true);
      expect(validError.fallbackAction).toBe('queue');
    });
  });

  describe('Enum Edge Cases', () => {
    it('should handle all content types', () => {
      const allTypes = ['post', 'comment', 'listing', 'dm', 'username', 'image', 'video'];
      allTypes.forEach(type => {
        expect(() => ContentType.parse(type)).not.toThrow();
      });
    });

    it('should handle all moderation statuses', () => {
      const allStatuses = ['pending', 'quarantined', 'blocked', 'allowed', 'appealed', 'under_review'];
      allStatuses.forEach(status => {
        expect(() => ModerationStatus.parse(status)).not.toThrow();
      });
    });

    it('should handle all hash types', () => {
      const allHashTypes = ['md5', 'sha256', 'perceptual', 'text_similarity'];
      allHashTypes.forEach(hashType => {
        expect(() => HashType.parse(hashType)).not.toThrow();
      });
    });

    it('should handle all reputation impact types', () => {
      const allImpactTypes = ['violation', 'helpful_report', 'false_report', 'successful_appeal', 'jury_accuracy'];
      allImpactTypes.forEach(impactType => {
        expect(() => ReputationImpactType.parse(impactType)).not.toThrow();
      });
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle boundary values for numeric fields', () => {
      // Test risk score boundaries
      expect(() => validateModerationCase({
        contentId: 'test',
        contentType: 'post' as const,
        userId: validUserId,
        riskScore: 0
      })).not.toThrow();

      expect(() => validateModerationCase({
        contentId: 'test',
        contentType: 'post' as const,
        userId: validUserId,
        riskScore: 1
      })).not.toThrow();

      // Test confidence boundaries
      expect(() => validateModerationCase({
        contentId: 'test',
        contentType: 'post' as const,
        userId: validUserId,
        confidence: 0
      })).not.toThrow();

      expect(() => validateModerationCase({
        contentId: 'test',
        contentType: 'post' as const,
        userId: validUserId,
        confidence: 1
      })).not.toThrow();
    });

    it('should handle maximum string lengths', () => {
      // Test contentId max length (64 chars)
      expect(() => validateModerationCase({
        contentId: 'a'.repeat(64),
        contentType: 'post' as const,
        userId: validUserId,
      })).not.toThrow();

      // Test reasonCode max length (48 chars)
      expect(() => validateModerationCase({
        contentId: 'test',
        contentType: 'post' as const,
        userId: validUserId,
        reasonCode: 'a'.repeat(48)
      })).not.toThrow();
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  PIIDetectionService, 
  piiDetectionService 
} from '../services/piiDetectionService';
import { 
  GeofencingComplianceService,
  geofencingComplianceService,
  ComplianceContext 
} from '../services/geofencingComplianceService';
import { 
  DataRetentionService,
  dataRetentionService 
} from '../services/dataRetentionService';
import { 
  UserConsentService,
  userConsentService,
  ConsentType,
  ConsentStatus 
} from '../services/userConsentService';
import { 
  PrivacyEvidenceStorageService,
  privacyEvidenceStorageService 
} from '../services/privacyEvidenceStorageService';

describe('Privacy and Compliance Features', () => {
  
  describe('PII Detection Service', () => {
    let service: PIIDetectionService;

    beforeEach(() => {
      service = new PIIDetectionService();
    });

    it('should detect phone numbers in various formats', async () => {
      const testContent = 'Call me at (555) 123-4567 or 555.123.4567 or +1-555-123-4567';
      
      const result = await service.detectAndRedact(testContent, {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'medium'
      });

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('PHONE');
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.redactedContent).toContain('[PHONE_REDACTED]');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect email addresses', async () => {
      const testContent = 'Contact us at support@example.com or admin@test.org';
      
      const result = await service.detectAndRedact(testContent, {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'medium'
      });

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('EMAIL');
      expect(result.redactedContent).toContain('[EMAIL_REDACTED]');
    });

    it('should detect crypto seed phrases', async () => {
      const testContent = 'My seed phrase is abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      
      const result = await service.detectAndRedact(testContent, {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'high'
      });

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('SEED_PHRASE');
      expect(result.redactedContent).toContain('[SEED_PHRASE_REDACTED]');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect wallet addresses', async () => {
      const testContent = 'Send tokens to 0x742d35Cc6634C0532925a3b8D4C2C4e4C4C4C4C4';
      
      const result = await service.detectAndRedact(testContent, {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'medium'
      });

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('WALLET_ADDRESS');
      expect(result.redactedContent).toContain('[WALLET_REDACTED]');
    });

    it('should preserve partial content when requested', async () => {
      const testContent = 'Call me at (555) 123-4567';
      
      const result = await service.detectAndRedact(testContent, {
        enableRedaction: true,
        preservePartial: true,
        sensitivityLevel: 'medium'
      });

      expect(result.hasPII).toBe(true);
      expect(result.redactedContent).toMatch(/Call me at \(\d{2}\*+\d{2}\)/);
    });

    it('should validate content safety', async () => {
      const unsafeContent = 'My SSN is 123-45-6789 and credit card is 4111-1111-1111-1111';
      
      const validation = await service.validateContentSafety(unsafeContent);

      expect(validation.isSafe).toBe(false);
      expect(validation.violations).toContain('SSN');
      expect(validation.violations).toContain('CREDIT_CARD');
      expect(validation.riskScore).toBeGreaterThan(0.7);
    });

    it('should create safe evidence with PII mapping', async () => {
      const content = 'User email: test@example.com, phone: (555) 123-4567';
      
      const evidence = await service.createSafeEvidence(content);

      expect(evidence.safeContent).not.toContain('test@example.com');
      expect(evidence.safeContent).not.toContain('(555) 123-4567');
      expect(Object.keys(evidence.piiMap).length).toBeGreaterThan(0);
      expect(evidence.hash).toBeDefined();
    });

    it('should handle custom patterns', async () => {
      const content = 'My custom ID is ABC123XYZ';
      const customPatterns = {
        CUSTOM_ID: /[A-Z]{3}\d{3}[A-Z]{3}/g
      };
      
      const result = await service.detectAndRedact(content, {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'medium',
        customPatterns
      });

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('CUSTOM_CUSTOM_ID');
      expect(result.redactedContent).toContain('[CUSTOM_ID_REDACTED]');
    });
  });

  describe('Geofencing Compliance Service', () => {
    let service: GeofencingComplianceService;

    beforeEach(() => {
      service = new GeofencingComplianceService();
    });

    it('should apply GDPR rules for EU users', async () => {
      const context: ComplianceContext = {
        userRegion: 'EU',
        userCountry: 'DE',
        contentType: 'dm',
        hasConsent: false,
        isHighRisk: false
      };

      const decision = await service.evaluateCompliance(context);

      expect(decision.action).toBe('require_consent');
      expect(decision.requirements).toContain('explicit_consent_dm_scanning');
      expect(decision.userRights).toContain('right_to_erasure');
      expect(decision.userRights).toContain('data_portability');
      expect(decision.dataHandling.encryptionRequired).toBe(true);
    });

    it('should block crypto content in China', async () => {
      const context: ComplianceContext = {
        userRegion: 'APAC',
        userCountry: 'CN',
        contentType: 'marketplace_listing',
        hasConsent: true,
        isHighRisk: false
      };

      const decision = await service.evaluateCompliance(context);

      expect(decision.allowed).toBe(false);
      expect(decision.action).toBe('block');
      expect(decision.reason).toContain('Crypto trading content blocked in China');
    });

    it('should apply CCPA rules for California users', async () => {
      const context: ComplianceContext = {
        userRegion: 'US',
        userCountry: 'US',
        contentType: 'post',
        hasConsent: true,
        isHighRisk: false
      };

      // Simulate California user
      const decision = await service.evaluateCompliance({
        ...context,
        userRegion: 'US_CA'
      });

      expect(decision.allowed).toBe(true);
      expect(decision.userRights).toContain('opt_out_sale');
      expect(decision.userRights).toContain('non_discrimination');
    });

    it('should protect minors from adult content', async () => {
      const context: ComplianceContext = {
        userRegion: 'US',
        userCountry: 'US',
        contentType: 'adult_content',
        hasConsent: true,
        userAge: 16,
        isHighRisk: false
      };

      const decision = await service.evaluateCompliance(context);

      expect(decision.allowed).toBe(false);
      expect(decision.action).toBe('block');
      expect(decision.reason).toContain('Content blocked for minors');
    });

    it('should determine correct data retention periods', () => {
      expect(service.getDataRetentionPeriod('EU', 'DE')).toBe(365);
      expect(service.getDataRetentionPeriod('US', 'US')).toBe(2555);
      expect(service.getDataRetentionPeriod('CN', 'CN')).toBe(180);
    });

    it('should check data localization requirements', () => {
      expect(service.requiresDataLocalization('EU', 'DE')).toBe(true);
      expect(service.requiresDataLocalization('CN', 'CN')).toBe(true);
      expect(service.requiresDataLocalization('US', 'US')).toBe(false);
    });

    it('should manage geofencing rules', () => {
      const newRule = {
        id: 'test_rule',
        name: 'Test Rule',
        regions: ['TEST'],
        action: 'block' as const,
        contentTypes: ['test_content'],
        reason: 'Test blocking',
        priority: 50,
        active: true
      };

      service.updateGeofencingRule(newRule);
      
      // Rule should be added and sorted by priority
      const rules = (service as any).geofencingRules;
      expect(rules.some((r: any) => r.id === 'test_rule')).toBe(true);
    });
  });

  describe('Data Retention Service', () => {
    let service: DataRetentionService;

    beforeEach(() => {
      service = new DataRetentionService();
    });

    it('should execute retention cleanup in dry run mode', async () => {
      const result = await service.executeRetentionCleanup(undefined, true);

      expect(result.recordsProcessed).toBeGreaterThanOrEqual(0);
      expect(result.recordsDeleted).toBe(0); // Dry run should not delete
      expect(result.executionTimeMs).toBeGreaterThan(0);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should get applicable retention policy', () => {
      const euPolicy = service.getApplicablePolicy('moderation_cases', 'EU');
      const usPolicy = service.getApplicablePolicy('moderation_cases', 'US');

      expect(euPolicy?.retentionPeriodDays).toBe(365);
      expect(usPolicy?.retentionPeriodDays).toBe(1095);
    });

    it('should manage retention policies', () => {
      const newPolicy = {
        id: 'test_policy',
        name: 'Test Policy',
        dataType: 'test_data',
        retentionPeriodDays: 90,
        autoDelete: true,
        archiveBeforeDelete: false,
        encryptArchive: false,
        notifyBeforeDelete: false,
        notificationDays: 0,
        active: true
      };

      service.updateRetentionPolicy(newPolicy);
      
      const policies = service.getAllPolicies();
      expect(policies.some(p => p.id === 'test_policy')).toBe(true);
    });

    it('should get audit logs', () => {
      const logs = service.getAuditLogs(10);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeLessThanOrEqual(10);
    });
  });

  describe('User Consent Service', () => {
    let service: UserConsentService;

    beforeEach(() => {
      service = new UserConsentService();
    });

    it('should grant consent successfully', async () => {
      const consentRequest = {
        userId: 'user123',
        consentType: ConsentType.DM_SCANNING,
        purpose: 'Direct message safety scanning',
        legalBasis: 'consent'
      };

      const consent = await service.grantConsent(
        consentRequest,
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(consent.userId).toBe('user123');
      expect(consent.consentType).toBe(ConsentType.DM_SCANNING);
      expect(consent.status).toBe(ConsentStatus.GRANTED);
      expect(consent.grantedAt).toBeDefined();
      expect(consent.expiresAt).toBeDefined();
    });

    it('should validate consent correctly', async () => {
      // First grant consent
      await service.grantConsent({
        userId: 'user123',
        consentType: ConsentType.DM_SCANNING,
        purpose: 'DM scanning',
        legalBasis: 'consent'
      }, '192.168.1.1', 'Mozilla/5.0');

      // Then validate
      const validation = await service.hasValidConsent('user123', ConsentType.DM_SCANNING);

      expect(validation.isValid).toBe(true);
      expect(validation.status).toBe(ConsentStatus.GRANTED);
    });

    it('should withdraw consent', async () => {
      // Grant consent first
      await service.grantConsent({
        userId: 'user123',
        consentType: ConsentType.MARKETING,
        purpose: 'Marketing communications',
        legalBasis: 'consent'
      }, '192.168.1.1', 'Mozilla/5.0');

      // Withdraw consent
      const withdrawn = await service.withdrawConsent(
        'user123',
        ConsentType.MARKETING,
        'User requested withdrawal'
      );

      expect(withdrawn).toBe(true);

      // Validate withdrawal
      const validation = await service.hasValidConsent('user123', ConsentType.MARKETING);
      expect(validation.isValid).toBe(false);
      expect(validation.status).toBe(ConsentStatus.WITHDRAWN);
    });

    it('should handle consent expiration', async () => {
      // Grant consent with short expiration
      await service.grantConsent({
        userId: 'user123',
        consentType: ConsentType.ANALYTICS,
        purpose: 'Analytics',
        legalBasis: 'consent',
        expirationDays: -1 // Already expired
      }, '192.168.1.1', 'Mozilla/5.0');

      const validation = await service.hasValidConsent('user123', ConsentType.ANALYTICS);
      expect(validation.isValid).toBe(false);
      expect(validation.status).toBe(ConsentStatus.EXPIRED);
    });

    it('should renew consent', async () => {
      // Grant consent
      await service.grantConsent({
        userId: 'user123',
        consentType: ConsentType.DATA_PROCESSING,
        purpose: 'Data processing',
        legalBasis: 'consent'
      }, '192.168.1.1', 'Mozilla/5.0');

      // Renew consent
      const renewed = await service.renewConsent('user123', ConsentType.DATA_PROCESSING, 730);

      expect(renewed).toBeDefined();
      expect(renewed?.status).toBe(ConsentStatus.GRANTED);
      expect(renewed?.metadata.renewed).toBe(true);
    });

    it('should get consent summary', async () => {
      // Grant multiple consents
      await service.grantConsent({
        userId: 'user123',
        consentType: ConsentType.DM_SCANNING,
        purpose: 'DM scanning',
        legalBasis: 'consent'
      }, '192.168.1.1', 'Mozilla/5.0');

      await service.grantConsent({
        userId: 'user123',
        consentType: ConsentType.ANALYTICS,
        purpose: 'Analytics',
        legalBasis: 'legitimate_interest'
      }, '192.168.1.1', 'Mozilla/5.0');

      const summary = await service.getConsentSummary('user123');

      expect(summary.userId).toBe('user123');
      expect(summary.consents.length).toBe(2);
      expect(summary.consents.some(c => c.type === ConsentType.DM_SCANNING)).toBe(true);
      expect(summary.consents.some(c => c.type === ConsentType.ANALYTICS)).toBe(true);
    });

    it('should bulk update consents', async () => {
      // Grant consents for multiple users
      const userIds = ['user1', 'user2', 'user3'];
      
      for (const userId of userIds) {
        await service.grantConsent({
          userId,
          consentType: ConsentType.MARKETING,
          purpose: 'Marketing',
          legalBasis: 'consent'
        }, '192.168.1.1', 'Mozilla/5.0');
      }

      // Bulk withdraw
      const updatedCount = await service.bulkUpdateConsents(
        userIds,
        ConsentType.MARKETING,
        ConsentStatus.WITHDRAWN,
        'Policy change'
      );

      expect(updatedCount).toBe(3);
    });

    it('should get consent configuration', () => {
      const config = service.getConsentConfig(ConsentType.DM_SCANNING);
      
      expect(config.required).toBe(true);
      expect(config.defaultExpirationDays).toBe(365);
      expect(config.renewalRequired).toBe(true);
    });
  });

  describe('Privacy Evidence Storage Service', () => {
    let service: PrivacyEvidenceStorageService;

    beforeEach(() => {
      service = new PrivacyEvidenceStorageService();
    });

    it('should store evidence with encryption', async () => {
      const content = 'User violated policy by posting harmful content';
      const modelOutputs = { toxicity: 0.95, confidence: 0.9 };
      const rationale = 'High toxicity score detected';

      const result = await service.storeEvidence(
        123,
        content,
        modelOutputs,
        rationale,
        {
          encryptSensitive: true,
          redactPII: true,
          region: 'EU',
          dataClassification: 'confidential',
          legalBasis: 'legitimate_interest',
          processingPurpose: 'content_moderation'
        }
      );

      expect(result.evidenceId).toBeDefined();
      expect(result.encryptionApplied).toBe(true);
      expect(result.ipfsCid).toBeDefined();
      expect(result.retentionExpiresAt).toBeDefined();
      expect(result.accessKey).toBeDefined();
    });

    it('should store evidence with PII redaction', async () => {
      const content = 'User email test@example.com posted harmful content';
      const modelOutputs = { toxicity: 0.8 };
      const rationale = 'Policy violation detected';

      const result = await service.storeEvidence(
        124,
        content,
        modelOutputs,
        rationale,
        {
          encryptSensitive: false,
          redactPII: true,
          region: 'US',
          dataClassification: 'internal',
          legalBasis: 'legitimate_interest',
          processingPurpose: 'content_moderation'
        }
      );

      expect(result.piiRedacted).toBe(true);
      expect(result.evidenceId).toBeDefined();
    });

    it('should retrieve evidence with access logging', async () => {
      // Store evidence first
      const storeResult = await service.storeEvidence(
        125,
        'Test content',
        { score: 0.5 },
        'Test rationale',
        {
          encryptSensitive: false,
          redactPII: false,
          region: 'US',
          dataClassification: 'internal',
          legalBasis: 'legitimate_interest',
          processingPurpose: 'content_moderation'
        }
      );

      // Retrieve evidence
      const retrievalResult = await service.retrieveEvidence(
        storeResult.evidenceId,
        {
          includeRedactedContent: false,
          purpose: 'audit_review',
          requestedBy: 'moderator123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      );

      expect(retrievalResult).toBeDefined();
      expect(retrievalResult!.accessGranted).toBe(true);
      expect(retrievalResult!.accessLogged).toBe(true);
      expect(retrievalResult!.evidence.accessLog.length).toBe(1);
    });

    it('should update evidence', async () => {
      // Store evidence first
      const storeResult = await service.storeEvidence(
        126,
        'Original content',
        { score: 0.5 },
        'Original rationale',
        {
          encryptSensitive: false,
          redactPII: false,
          region: 'US',
          dataClassification: 'internal',
          legalBasis: 'legitimate_interest',
          processingPurpose: 'content_moderation'
        }
      );

      // Update evidence
      const updated = await service.updateEvidence(
        storeResult.evidenceId,
        {
          decisionRationale: 'Updated rationale after appeal',
          evidenceType: 'appeal_evidence'
        },
        'moderator456'
      );

      expect(updated).toBe(true);
    });

    it('should delete evidence', async () => {
      // Store evidence first
      const storeResult = await service.storeEvidence(
        127,
        'Content to be deleted',
        { score: 0.3 },
        'Test deletion',
        {
          encryptSensitive: false,
          redactPII: false,
          region: 'EU',
          dataClassification: 'internal',
          legalBasis: 'consent',
          processingPurpose: 'content_moderation'
        }
      );

      // Delete evidence
      const deleted = await service.deleteEvidence(
        storeResult.evidenceId,
        'right_to_erasure'
      );

      expect(deleted).toBe(true);

      // Try to retrieve deleted evidence
      const retrievalResult = await service.retrieveEvidence(
        storeResult.evidenceId,
        {
          includeRedactedContent: false,
          purpose: 'test',
          requestedBy: 'test',
          ipAddress: '127.0.0.1',
          userAgent: 'test'
        }
      );

      expect(retrievalResult).toBeNull();
    });

    it('should get storage statistics', async () => {
      // Store some evidence
      await service.storeEvidence(128, 'Test 1', {}, 'Rationale 1', {
        encryptSensitive: true,
        redactPII: false,
        region: 'EU',
        dataClassification: 'confidential',
        legalBasis: 'consent',
        processingPurpose: 'moderation'
      });

      await service.storeEvidence(129, 'Test 2', {}, 'Rationale 2', {
        encryptSensitive: false,
        redactPII: true,
        region: 'US',
        dataClassification: 'internal',
        legalBasis: 'legitimate_interest',
        processingPurpose: 'moderation'
      });

      const stats = await service.getStorageStatistics();

      expect(stats.totalEvidence).toBeGreaterThanOrEqual(2);
      expect(stats.encryptedEvidence).toBeGreaterThanOrEqual(1);
      expect(stats.storageByClassification.confidential).toBeGreaterThanOrEqual(1);
      expect(stats.storageByClassification.internal).toBeGreaterThanOrEqual(1);
    });

    it('should cleanup expired evidence', async () => {
      // This test would require manipulating dates or waiting
      // For now, just test that the method exists and returns a number
      const cleanedCount = await service.cleanupExpiredEvidence();
      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete privacy workflow', async () => {
      const userId = 'integration_user_123';
      const content = 'User email test@example.com violated policy';
      
      // 1. Check consent
      await userConsentService.grantConsent({
        userId,
        consentType: ConsentType.DM_SCANNING,
        purpose: 'Content moderation',
        legalBasis: 'consent'
      }, '192.168.1.1', 'Mozilla/5.0');

      const hasConsent = await userConsentService.hasValidConsent(userId, ConsentType.DM_SCANNING);
      expect(hasConsent.isValid).toBe(true);

      // 2. Check compliance
      const complianceDecision = await geofencingComplianceService.evaluateCompliance({
        userRegion: 'EU',
        userCountry: 'DE',
        contentType: 'post',
        hasConsent: true,
        isHighRisk: false
      });

      expect(complianceDecision.allowed).toBe(true);

      // 3. Detect and redact PII
      const piiResult = await piiDetectionService.detectAndRedact(content, {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'high'
      });

      expect(piiResult.hasPII).toBe(true);
      expect(piiResult.redactedContent).not.toContain('test@example.com');

      // 4. Store evidence with privacy compliance
      const evidenceResult = await privacyEvidenceStorageService.storeEvidence(
        999,
        content,
        { toxicity: 0.8 },
        'Policy violation detected',
        {
          encryptSensitive: true,
          redactPII: true,
          region: 'EU',
          retentionDays: complianceDecision.dataHandling.retentionDays,
          dataClassification: 'confidential',
          legalBasis: 'legitimate_interest',
          processingPurpose: 'content_moderation'
        }
      );

      expect(evidenceResult.evidenceId).toBeDefined();
      expect(evidenceResult.encryptionApplied).toBe(true);
      expect(evidenceResult.piiRedacted).toBe(true);

      // 5. Verify data retention policy
      const retentionPolicy = dataRetentionService.getApplicablePolicy('moderation_cases', 'EU');
      expect(retentionPolicy?.retentionPeriodDays).toBe(365);
    });

    it('should handle right to erasure request', async () => {
      const userId = 'erasure_user_123';
      
      // Grant consent
      await userConsentService.grantConsent({
        userId,
        consentType: ConsentType.DATA_PROCESSING,
        purpose: 'Data processing',
        legalBasis: 'consent'
      }, '192.168.1.1', 'Mozilla/5.0');

      // Store evidence
      const evidenceResult = await privacyEvidenceStorageService.storeEvidence(
        888,
        'User data to be erased',
        { score: 0.5 },
        'Test erasure',
        {
          encryptSensitive: false,
          redactPII: false,
          region: 'EU',
          dataClassification: 'internal',
          legalBasis: 'consent',
          processingPurpose: 'data_processing'
        }
      );

      // Withdraw consent
      const withdrawn = await userConsentService.withdrawConsent(
        userId,
        ConsentType.DATA_PROCESSING,
        'Right to erasure request'
      );
      expect(withdrawn).toBe(true);

      // Delete evidence
      const deleted = await privacyEvidenceStorageService.deleteEvidence(
        evidenceResult.evidenceId,
        'right_to_erasure'
      );
      expect(deleted).toBe(true);

      // Verify deletion
      const retrievalResult = await privacyEvidenceStorageService.retrieveEvidence(
        evidenceResult.evidenceId,
        {
          includeRedactedContent: false,
          purpose: 'verification',
          requestedBy: 'system',
          ipAddress: '127.0.0.1',
          userAgent: 'system'
        }
      );

      expect(retrievalResult).toBeNull();
    });
  });
});
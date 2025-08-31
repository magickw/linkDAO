/**
 * Simple Privacy Compliance Tests
 * Task 14: Privacy and Compliance Features
 */

import { 
  PIIDetectionService 
} from '../services/piiDetectionService';
import { 
  GeofencingComplianceService,
  ComplianceContext 
} from '../services/geofencingComplianceService';
import { 
  DataRetentionService 
} from '../services/dataRetentionService';
import { 
  UserConsentService,
  ConsentType,
  ConsentStatus 
} from '../services/userConsentService';
import { 
  PrivacyEvidenceStorageService 
} from '../services/privacyEvidenceStorageService';

describe('Privacy and Compliance Features - Simple Tests', () => {
  
  describe('PII Detection Service', () => {
    let service: PIIDetectionService;

    beforeEach(() => {
      service = new PIIDetectionService();
    });

    it('should detect phone numbers', async () => {
      const testContent = 'Call me at (555) 123-4567';
      
      const result = await service.detectAndRedact(testContent, {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'medium'
      });

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('PHONE');
      expect(result.redactedContent).toContain('[PHONE_REDACTED]');
    });

    it('should detect email addresses', async () => {
      const testContent = 'Contact us at support@example.com';
      
      const result = await service.detectAndRedact(testContent, {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'medium'
      });

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('EMAIL');
      expect(result.redactedContent).toContain('[EMAIL_REDACTED]');
    });

    it('should validate content safety', async () => {
      const unsafeContent = 'My SSN is 123-45-6789';
      
      const validation = await service.validateContentSafety(unsafeContent);

      expect(validation.isSafe).toBe(false);
      expect(validation.violations).toContain('SSN');
      expect(validation.riskScore).toBeGreaterThan(0.7);
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
      expect(decision.dataHandling.encryptionRequired).toBe(true);
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
  });

  describe('Integration Test', () => {
    it('should handle complete privacy workflow', async () => {
      const userId = 'integration_user_123';
      const content = 'User email test@example.com violated policy';
      
      // Services
      const userConsentService = new UserConsentService();
      const geofencingService = new GeofencingComplianceService();
      const piiService = new PIIDetectionService();
      const evidenceService = new PrivacyEvidenceStorageService();

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
      const complianceDecision = await geofencingService.evaluateCompliance({
        userRegion: 'EU',
        userCountry: 'DE',
        contentType: 'post',
        hasConsent: true,
        isHighRisk: false
      });

      expect(complianceDecision.allowed).toBe(true);

      // 3. Detect and redact PII
      const piiResult = await piiService.detectAndRedact(content, {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'high'
      });

      expect(piiResult.hasPII).toBe(true);
      expect(piiResult.redactedContent).not.toContain('test@example.com');

      // 4. Store evidence with privacy compliance
      const evidenceResult = await evidenceService.storeEvidence(
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
    });
  });
});
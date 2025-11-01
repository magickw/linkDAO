import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  piiDetectionService,
  geofencingComplianceService,
  dataRetentionService,
  userConsentService,
  privacyEvidenceStorageService
} from '../services';
import { ConsentType, ConsentStatus } from '../services/userConsentService';

describe('Data Protection Integration Tests', () => {
  
  describe('GDPR Compliance Scenarios', () => {
    it('should handle GDPR data subject rights workflow', async () => {
      const userId = 'gdpr_user_001';
      const userRegion = 'EU';
      const userCountry = 'DE';

      // 1. User grants consent for DM scanning
      const consent = await userConsentService.grantConsent({
        userId,
        consentType: ConsentType.DM_SCANNING,
        purpose: 'Direct message safety scanning for GDPR compliance',
        legalBasis: 'consent'
      }, '192.168.1.100', 'Mozilla/5.0 (GDPR Test)');

      expect(consent.status).toBe(ConsentStatus.GRANTED);
      expect(consent.legalBasis).toBe('consent');

      // 2. Check compliance for DM processing
      const complianceCheck = await geofencingComplianceService.evaluateCompliance({
        userRegion,
        userCountry,
        contentType: 'dm',
        hasConsent: true,
        isHighRisk: false
      });

      expect(complianceCheck.allowed).toBe(true);
      expect(complianceCheck.userRights).toContain('right_to_erasure');
      expect(complianceCheck.userRights).toContain('data_portability');
      expect(complianceCheck.dataHandling.encryptionRequired).toBe(true);
      expect(complianceCheck.dataHandling.retentionDays).toBe(365);

      // 3. Process content with PII detection
      const dmContent = 'Hi, my email is john.doe@example.com and phone is +49-123-456-7890';
      const piiResult = await piiDetectionService.detectAndRedact(dmContent, {
        enableRedaction: true,
        preservePartial: true,
        sensitivityLevel: 'high'
      });

      expect(piiResult.hasPII).toBe(true);
      expect(piiResult.detectedTypes).toContain('EMAIL');
      expect(piiResult.detectedTypes).toContain('PHONE');

      // 4. Store evidence with GDPR compliance
      const evidenceResult = await privacyEvidenceStorageService.storeEvidence(
        1001,
        dmContent,
        { 
          toxicity: 0.1, 
          pii_detected: true,
          gdpr_compliant: true 
        },
        'DM processed under GDPR consent',
        {
          encryptSensitive: true,
          redactPII: true,
          region: userRegion,
          retentionDays: complianceCheck.dataHandling.retentionDays,
          dataClassification: 'confidential',
          legalBasis: 'consent',
          processingPurpose: 'dm_safety_scanning'
        }
      );

      expect(evidenceResult.encryptionApplied).toBe(true);
      expect(evidenceResult.piiRedacted).toBe(true);

      // 5. User exercises right to access (Article 15)
      const consentSummary = await userConsentService.getConsentSummary(userId);
      expect(consentSummary.consents.length).toBeGreaterThan(0);
      expect(consentSummary.consents[0].type).toBe(ConsentType.DM_SCANNING);

      const accessLog = await privacyEvidenceStorageService.getAccessLog(evidenceResult.evidenceId);
      expect(Array.isArray(accessLog)).toBe(true);

      // 6. User exercises right to rectification (Article 16)
      const updated = await privacyEvidenceStorageService.updateEvidence(
        evidenceResult.evidenceId,
        {
          decisionRationale: 'Updated per user rectification request under GDPR Article 16'
        },
        'gdpr_officer'
      );
      expect(updated).toBe(true);

      // 7. User withdraws consent (Article 7)
      const withdrawn = await userConsentService.withdrawConsent(
        userId,
        ConsentType.DM_SCANNING,
        'User withdrew consent under GDPR Article 7'
      );
      expect(withdrawn).toBe(true);

      // 8. User exercises right to erasure (Article 17)
      const deleted = await privacyEvidenceStorageService.deleteEvidence(
        evidenceResult.evidenceId,
        'GDPR Article 17 - Right to Erasure'
      );
      expect(deleted).toBe(true);

      // 9. Verify erasure
      const retrievalAfterDeletion = await privacyEvidenceStorageService.retrieveEvidence(
        evidenceResult.evidenceId,
        {
          includeRedactedContent: false,
          purpose: 'gdpr_verification',
          requestedBy: 'gdpr_officer',
          ipAddress: '192.168.1.100',
          userAgent: 'GDPR Verification'
        }
      );

      expect(retrievalAfterDeletion).toBeNull();
    });

    it('should handle GDPR data portability request', async () => {
      const userId = 'gdpr_portability_user';
      
      // Grant multiple consents
      await userConsentService.grantConsent({
        userId,
        consentType: ConsentType.DATA_PROCESSING,
        purpose: 'Core platform functionality',
        legalBasis: 'consent'
      }, '192.168.1.101', 'Mozilla/5.0');

      await userConsentService.grantConsent({
        userId,
        consentType: ConsentType.ANALYTICS,
        purpose: 'Platform improvement analytics',
        legalBasis: 'consent'
      }, '192.168.1.101', 'Mozilla/5.0');

      // Get portable data summary
      const consentSummary = await userConsentService.getConsentSummary(userId);
      
      expect(consentSummary.consents.length).toBe(2);
      expect(consentSummary.consents.some(c => c.type === ConsentType.DATA_PROCESSING)).toBe(true);
      expect(consentSummary.consents.some(c => c.type === ConsentType.ANALYTICS)).toBe(true);

      // Verify data is in machine-readable format (JSON)
      const portableData = JSON.stringify(consentSummary);
      expect(() => JSON.parse(portableData)).not.toThrow();
    });
  });

  describe('CCPA Compliance Scenarios', () => {
    it('should handle CCPA consumer rights workflow', async () => {
      const userId = 'ccpa_user_001';
      const userRegion = 'US_CA';
      const userCountry = 'US';

      // 1. Check CCPA compliance
      const complianceCheck = await geofencingComplianceService.evaluateCompliance({
        userRegion,
        userCountry,
        contentType: 'post',
        hasConsent: false, // CCPA doesn't require consent for processing
        isHighRisk: false
      });

      expect(complianceCheck.allowed).toBe(true);
      expect(complianceCheck.userRights).toContain('opt_out_sale');
      expect(complianceCheck.userRights).toContain('non_discrimination');

      // 2. User opts out of data sale
      const optOutConsent = await userConsentService.grantConsent({
        userId,
        consentType: ConsentType.THIRD_PARTY_SHARING,
        purpose: 'CCPA opt-out of data sale',
        legalBasis: 'opt_out'
      }, '192.168.1.200', 'Mozilla/5.0 (CCPA Test)');

      // Immediately withdraw to simulate opt-out
      const optedOut = await userConsentService.withdrawConsent(
        userId,
        ConsentType.THIRD_PARTY_SHARING,
        'CCPA opt-out of sale'
      );

      expect(optedOut).toBe(true);

      // 3. Verify opt-out status
      const validation = await userConsentService.hasValidConsent(
        userId,
        ConsentType.THIRD_PARTY_SHARING
      );

      expect(validation.isValid).toBe(false);
      expect(validation.status).toBe(ConsentStatus.WITHDRAWN);
    });
  });

  describe('Cross-Border Data Transfer Scenarios', () => {
    it('should handle EU to US data transfer restrictions', async () => {
      const euUserId = 'eu_user_transfer';
      const usUserId = 'us_user_transfer';

      // EU user - requires data localization
      const euCompliance = await geofencingComplianceService.evaluateCompliance({
        userRegion: 'EU',
        userCountry: 'FR',
        contentType: 'post',
        hasConsent: true,
        isHighRisk: false
      });

      expect(euCompliance.dataHandling.canTransfer).toBe(false); // Data localization required

      // US user - allows data transfer
      const usCompliance = await geofencingComplianceService.evaluateCompliance({
        userRegion: 'US',
        userCountry: 'US',
        contentType: 'post',
        hasConsent: true,
        isHighRisk: false
      });

      expect(usCompliance.dataHandling.canTransfer).toBe(true);
    });

    it('should handle China data localization requirements', async () => {
      const chinaCompliance = await geofencingComplianceService.evaluateCompliance({
        userRegion: 'APAC',
        userCountry: 'CN',
        contentType: 'post',
        hasConsent: true,
        isHighRisk: false
      });

      expect(chinaCompliance.dataHandling.canTransfer).toBe(false);
      expect(chinaCompliance.dataHandling.retentionDays).toBe(180);
    });
  });

  describe('Data Retention and Cleanup Scenarios', () => {
    it('should execute region-specific data retention', async () => {
      // Test EU retention (365 days)
      const euPolicy = dataRetentionService.getApplicablePolicy('moderation_cases', 'EU');
      expect(euPolicy?.retentionPeriodDays).toBe(365);

      // Test US retention (1095 days)
      const usPolicy = dataRetentionService.getApplicablePolicy('moderation_cases', 'US');
      expect(usPolicy?.retentionPeriodDays).toBe(1095);

      // Test China retention (180 days)
      const cnPolicy = dataRetentionService.getApplicablePolicy('moderation_cases', 'CN');
      expect(cnPolicy).toBeNull(); // Should fall back to default

      const defaultPolicy = dataRetentionService.getApplicablePolicy('moderation_cases');
      expect(defaultPolicy?.retentionPeriodDays).toBeGreaterThan(0);
    });

    it('should handle automated data cleanup', async () => {
      // Execute dry run cleanup
      const dryRunResult = await dataRetentionService.executeRetentionCleanup(undefined, true);
      
      expect(dryRunResult.recordsProcessed).toBeGreaterThanOrEqual(0);
      expect(dryRunResult.recordsDeleted).toBe(0); // Dry run
      expect(dryRunResult.executionTimeMs).toBeGreaterThan(0);
      expect(Array.isArray(dryRunResult.errors)).toBe(true);
    });
  });

  describe('Consent Management Scenarios', () => {
    it('should handle consent renewal workflow', async () => {
      const userId = 'consent_renewal_user';

      // Grant initial consent
      const initialConsent = await userConsentService.grantConsent({
        userId,
        consentType: ConsentType.DM_SCANNING,
        purpose: 'DM scanning',
        legalBasis: 'consent',
        expirationDays: 30 // Short expiration for testing
      }, '192.168.1.300', 'Mozilla/5.0');

      expect(initialConsent.expiresAt).toBeDefined();

      // Check consent is valid
      let validation = await userConsentService.hasValidConsent(userId, ConsentType.DM_SCANNING);
      expect(validation.isValid).toBe(true);

      // Renew consent
      const renewed = await userConsentService.renewConsent(userId, ConsentType.DM_SCANNING, 365);
      expect(renewed).toBeDefined();
      expect(renewed?.metadata.renewed).toBe(true);

      // Verify renewal
      validation = await userConsentService.hasValidConsent(userId, ConsentType.DM_SCANNING);
      expect(validation.isValid).toBe(true);
    });

    it('should handle bulk consent updates for policy changes', async () => {
      const userIds = ['bulk_user_1', 'bulk_user_2', 'bulk_user_3'];

      // Grant consents for all users
      for (const userId of userIds) {
        await userConsentService.grantConsent({
          userId,
          consentType: ConsentType.MARKETING,
          purpose: 'Marketing communications',
          legalBasis: 'consent'
        }, '192.168.1.400', 'Mozilla/5.0');
      }

      // Bulk withdraw due to policy change
      const updatedCount = await userConsentService.bulkUpdateConsents(
        userIds,
        ConsentType.MARKETING,
        ConsentStatus.WITHDRAWN,
        'Policy update requires re-consent'
      );

      expect(updatedCount).toBe(3);

      // Verify all consents are withdrawn
      for (const userId of userIds) {
        const validation = await userConsentService.hasValidConsent(userId, ConsentType.MARKETING);
        expect(validation.isValid).toBe(false);
        expect(validation.status).toBe(ConsentStatus.WITHDRAWN);
      }
    });
  });

  describe('Privacy by Design Scenarios', () => {
    it('should implement data minimization principles', async () => {
      const content = 'User posted: My email is sensitive@example.com and my SSN is 123-45-6789';
      
      // Detect PII
      const piiResult = await piiDetectionService.detectAndRedact(content, {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'high'
      });

      expect(piiResult.hasPII).toBe(true);
      expect(piiResult.redactedContent).not.toContain('sensitive@example.com');
      expect(piiResult.redactedContent).not.toContain('123-45-6789');

      // Store only necessary data
      const evidenceResult = await privacyEvidenceStorageService.storeEvidence(
        2001,
        piiResult.redactedContent, // Store redacted version
        { 
          pii_detected: true,
          pii_types: piiResult.detectedTypes,
          confidence: piiResult.confidence
        },
        'Content processed with data minimization',
        {
          encryptSensitive: true,
          redactPII: true,
          region: 'EU',
          dataClassification: 'confidential',
          legalBasis: 'legitimate_interest',
          processingPurpose: 'content_moderation'
        }
      );

      expect(evidenceResult.piiRedacted).toBe(true);
      expect(evidenceResult.encryptionApplied).toBe(true);
    });

    it('should implement purpose limitation', async () => {
      const userId = 'purpose_limitation_user';

      // Grant consent for specific purpose
      await userConsentService.grantConsent({
        userId,
        consentType: ConsentType.ANALYTICS,
        purpose: 'Platform improvement analytics only',
        legalBasis: 'consent'
      }, '192.168.1.500', 'Mozilla/5.0');

      // Verify consent is purpose-specific
      const consentSummary = await userConsentService.getConsentSummary(userId);
      const analyticsConsent = consentSummary.consents.find(c => c.type === ConsentType.ANALYTICS);
      
      expect(analyticsConsent).toBeDefined();

      // Should not have consent for marketing (different purpose)
      const marketingValidation = await userConsentService.hasValidConsent(userId, ConsentType.MARKETING);
      expect(marketingValidation.isValid).toBe(false);
    });
  });

  describe('Audit and Compliance Reporting', () => {
    it('should maintain comprehensive audit trails', async () => {
      const userId = 'audit_trail_user';
      
      // Create evidence with audit trail
      const evidenceResult = await privacyEvidenceStorageService.storeEvidence(
        3001,
        'Audit trail test content',
        { audit_test: true },
        'Testing audit trail functionality',
        {
          encryptSensitive: false,
          redactPII: false,
          region: 'EU',
          dataClassification: 'internal',
          legalBasis: 'legitimate_interest',
          processingPurpose: 'audit_testing'
        }
      );

      // Access evidence multiple times
      const accessors = ['auditor_1', 'auditor_2', 'compliance_officer'];
      
      for (const accessor of accessors) {
        await privacyEvidenceStorageService.retrieveEvidence(
          evidenceResult.evidenceId,
          {
            includeRedactedContent: false,
            purpose: 'compliance_audit',
            requestedBy: accessor,
            ipAddress: '192.168.1.600',
            userAgent: 'Audit Tool'
          }
        );
      }

      // Verify audit trail
      const accessLog = await privacyEvidenceStorageService.getAccessLog(evidenceResult.evidenceId);
      expect(accessLog.length).toBe(3);
      expect(accessLog.every(entry => entry.purpose === 'compliance_audit')).toBe(true);
    });

    it('should generate compliance statistics', async () => {
      // Store various types of evidence
      const evidenceTypes = [
        { classification: 'public', encrypt: false },
        { classification: 'internal', encrypt: false },
        { classification: 'confidential', encrypt: true },
        { classification: 'restricted', encrypt: true }
      ];

      for (let i = 0; i < evidenceTypes.length; i++) {
        const type = evidenceTypes[i];
        await privacyEvidenceStorageService.storeEvidence(
          4000 + i,
          `Test content ${i}`,
          { test: true },
          `Test rationale ${i}`,
          {
            encryptSensitive: type.encrypt,
            redactPII: false,
            region: 'EU',
            dataClassification: type.classification as any,
            legalBasis: 'legitimate_interest',
            processingPurpose: 'compliance_testing'
          }
        );
      }

      // Get statistics
      const stats = await privacyEvidenceStorageService.getStorageStatistics();
      
      expect(stats.totalEvidence).toBeGreaterThanOrEqual(4);
      expect(stats.encryptedEvidence).toBeGreaterThanOrEqual(2);
      expect(stats.storageByClassification.public).toBeGreaterThanOrEqual(1);
      expect(stats.storageByClassification.confidential).toBeGreaterThanOrEqual(1);
    });
  });
});

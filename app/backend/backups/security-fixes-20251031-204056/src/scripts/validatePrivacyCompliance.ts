#!/usr/bin/env node

/**
 * Privacy Compliance Validation Script
 * Task 14: Privacy and Compliance Features
 * 
 * This script validates the implementation of privacy and compliance features
 * without requiring a full test environment setup.
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

interface ValidationResult {
  feature: string;
  passed: boolean;
  details: string;
  error?: string;
}

class PrivacyComplianceValidator {
  private results: ValidationResult[] = [];

  async validateAll(): Promise<void> {
    safeLogger.info('🔒 Privacy and Compliance Validation');
    safeLogger.info('====================================\n');

    await this.validatePIIDetection();
    await this.validateGeofencingCompliance();
    await this.validateDataRetention();
    await this.validateUserConsent();
    await this.validatePrivacyEvidenceStorage();
    await this.validateIntegration();

    this.printResults();
  }

  private async validatePIIDetection(): Promise<void> {
    safeLogger.info('Testing PII Detection Service...');
    
    try {
      const service = new PIIDetectionService();
      
      // Test phone number detection
      const phoneTest = await service.detectAndRedact('Call me at (555) 123-4567', {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'medium'
      });

      if (phoneTest.hasPII && phoneTest.detectedTypes.includes('PHONE')) {
        this.addResult('PII Detection - Phone Numbers', true, 'Successfully detected and redacted phone numbers');
      } else {
        this.addResult('PII Detection - Phone Numbers', false, 'Failed to detect phone numbers');
      }

      // Test email detection
      const emailTest = await service.detectAndRedact('Contact support@example.com', {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'medium'
      });

      if (emailTest.hasPII && emailTest.detectedTypes.includes('EMAIL')) {
        this.addResult('PII Detection - Email Addresses', true, 'Successfully detected and redacted email addresses');
      } else {
        this.addResult('PII Detection - Email Addresses', false, 'Failed to detect email addresses');
      }

      // Test content safety validation
      const safetyTest = await service.validateContentSafety('My SSN is 123-45-6789');
      
      if (!safetyTest.isSafe && safetyTest.violations.includes('SSN')) {
        this.addResult('PII Detection - Content Safety', true, 'Successfully identified unsafe content with SSN');
      } else {
        this.addResult('PII Detection - Content Safety', false, 'Failed to identify unsafe content');
      }

    } catch (error) {
      this.addResult('PII Detection Service', false, 'Service initialization failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async validateGeofencingCompliance(): Promise<void> {
    safeLogger.info('Testing Geofencing Compliance Service...');
    
    try {
      const service = new GeofencingComplianceService();
      
      // Test GDPR compliance for EU users
      const euContext: ComplianceContext = {
        userRegion: 'EU',
        userCountry: 'DE',
        contentType: 'dm',
        hasConsent: false,
        isHighRisk: false
      };

      const euDecision = await service.evaluateCompliance(euContext);
      
      if (euDecision.action === 'require_consent' && euDecision.userRights.includes('right_to_erasure')) {
        this.addResult('Geofencing - GDPR Compliance', true, 'Successfully applied GDPR rules for EU users');
      } else {
        this.addResult('Geofencing - GDPR Compliance', false, 'Failed to apply GDPR rules correctly');
      }

      // Test data retention periods
      const euRetention = service.getDataRetentionPeriod('EU', 'DE');
      const usRetention = service.getDataRetentionPeriod('US', 'US');
      
      if (euRetention === 365 && usRetention === 2555) {
        this.addResult('Geofencing - Data Retention', true, 'Correct retention periods for different regions');
      } else {
        this.addResult('Geofencing - Data Retention', false, `Incorrect retention periods: EU=${euRetention}, US=${usRetention}`);
      }

      // Test data localization requirements
      const euLocalization = service.requiresDataLocalization('EU', 'DE');
      const usLocalization = service.requiresDataLocalization('US', 'US');
      
      if (euLocalization === true && usLocalization === false) {
        this.addResult('Geofencing - Data Localization', true, 'Correct data localization requirements');
      } else {
        this.addResult('Geofencing - Data Localization', false, 'Incorrect data localization requirements');
      }

    } catch (error) {
      this.addResult('Geofencing Compliance Service', false, 'Service validation failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async validateDataRetention(): Promise<void> {
    safeLogger.info('Testing Data Retention Service...');
    
    try {
      const service = new DataRetentionService();
      
      // Test dry run cleanup
      const cleanupResult = await service.executeRetentionCleanup(undefined, true);
      
      if (cleanupResult.recordsDeleted === 0 && cleanupResult.executionTimeMs > 0) {
        this.addResult('Data Retention - Dry Run', true, 'Dry run executed successfully without deleting records');
      } else {
        this.addResult('Data Retention - Dry Run', false, 'Dry run failed or deleted records unexpectedly');
      }

      // Test policy retrieval
      const euPolicy = service.getApplicablePolicy('moderation_cases', 'EU');
      const usPolicy = service.getApplicablePolicy('moderation_cases', 'US');
      
      if (euPolicy?.retentionPeriodDays === 365 && usPolicy?.retentionPeriodDays === 1095) {
        this.addResult('Data Retention - Policy Retrieval', true, 'Successfully retrieved region-specific policies');
      } else {
        this.addResult('Data Retention - Policy Retrieval', false, 'Failed to retrieve correct policies');
      }

      // Test policy management
      const allPolicies = service.getAllPolicies();
      
      if (allPolicies.length > 0) {
        this.addResult('Data Retention - Policy Management', true, `Successfully loaded ${allPolicies.length} retention policies`);
      } else {
        this.addResult('Data Retention - Policy Management', false, 'No retention policies found');
      }

    } catch (error) {
      this.addResult('Data Retention Service', false, 'Service validation failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async validateUserConsent(): Promise<void> {
    safeLogger.info('Testing User Consent Service...');
    
    try {
      const service = new UserConsentService();
      
      // Test consent granting
      const consent = await service.grantConsent({
        userId: 'test_user_123',
        consentType: ConsentType.DM_SCANNING,
        purpose: 'Direct message safety scanning',
        legalBasis: 'consent'
      }, '192.168.1.1', 'Mozilla/5.0');

      if (consent.status === ConsentStatus.GRANTED && consent.userId === 'test_user_123') {
        this.addResult('User Consent - Grant Consent', true, 'Successfully granted user consent');
      } else {
        this.addResult('User Consent - Grant Consent', false, 'Failed to grant consent correctly');
      }

      // Test consent validation
      const validation = await service.hasValidConsent('test_user_123', ConsentType.DM_SCANNING);
      
      if (validation.isValid && validation.status === ConsentStatus.GRANTED) {
        this.addResult('User Consent - Validate Consent', true, 'Successfully validated granted consent');
      } else {
        this.addResult('User Consent - Validate Consent', false, 'Failed to validate consent');
      }

      // Test consent withdrawal
      const withdrawn = await service.withdrawConsent('test_user_123', ConsentType.DM_SCANNING, 'Test withdrawal');
      
      if (withdrawn) {
        const postWithdrawalValidation = await service.hasValidConsent('test_user_123', ConsentType.DM_SCANNING);
        if (!postWithdrawalValidation.isValid && postWithdrawalValidation.status === ConsentStatus.WITHDRAWN) {
          this.addResult('User Consent - Withdraw Consent', true, 'Successfully withdrew consent');
        } else {
          this.addResult('User Consent - Withdraw Consent', false, 'Consent withdrawal not properly reflected');
        }
      } else {
        this.addResult('User Consent - Withdraw Consent', false, 'Failed to withdraw consent');
      }

      // Test consent configuration
      const config = service.getConsentConfig(ConsentType.DM_SCANNING);
      
      if (config.required === true && config.defaultExpirationDays === 365) {
        this.addResult('User Consent - Configuration', true, 'Consent configuration loaded correctly');
      } else {
        this.addResult('User Consent - Configuration', false, 'Incorrect consent configuration');
      }

    } catch (error) {
      this.addResult('User Consent Service', false, 'Service validation failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async validatePrivacyEvidenceStorage(): Promise<void> {
    safeLogger.info('Testing Privacy Evidence Storage Service...');
    
    try {
      const service = new PrivacyEvidenceStorageService();
      
      // Test evidence storage with encryption
      const storeResult = await service.storeEvidence(
        12345,
        'Test content for evidence storage',
        { toxicity: 0.8, confidence: 0.9 },
        'Test evidence storage functionality',
        {
          encryptSensitive: true,
          redactPII: true,
          region: 'EU',
          dataClassification: 'confidential',
          legalBasis: 'legitimate_interest',
          processingPurpose: 'content_moderation'
        }
      );

      if (storeResult.evidenceId && storeResult.encryptionApplied && storeResult.ipfsCid) {
        this.addResult('Privacy Evidence - Store Evidence', true, 'Successfully stored encrypted evidence');
      } else {
        this.addResult('Privacy Evidence - Store Evidence', false, 'Failed to store evidence with encryption');
      }

      // Test evidence retrieval
      const retrievalResult = await service.retrieveEvidence(
        storeResult.evidenceId,
        {
          includeRedactedContent: false,
          purpose: 'validation_test',
          requestedBy: 'validator',
          ipAddress: '127.0.0.1',
          userAgent: 'Validation Script'
        }
      );

      if (retrievalResult && retrievalResult.accessGranted && retrievalResult.accessLogged) {
        this.addResult('Privacy Evidence - Retrieve Evidence', true, 'Successfully retrieved evidence with access logging');
      } else {
        this.addResult('Privacy Evidence - Retrieve Evidence', false, 'Failed to retrieve evidence or log access');
      }

      // Test storage statistics
      const stats = await service.getStorageStatistics();
      
      if (stats.totalEvidence > 0 && stats.encryptedEvidence > 0) {
        this.addResult('Privacy Evidence - Statistics', true, `Storage statistics: ${stats.totalEvidence} total, ${stats.encryptedEvidence} encrypted`);
      } else {
        this.addResult('Privacy Evidence - Statistics', false, 'Failed to generate storage statistics');
      }

    } catch (error) {
      this.addResult('Privacy Evidence Storage Service', false, 'Service validation failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async validateIntegration(): Promise<void> {
    safeLogger.info('Testing Integration Workflow...');
    
    try {
      // Test complete privacy workflow
      const userId = 'integration_test_user';
      const content = 'User email test@example.com posted harmful content';
      
      const userConsentService = new UserConsentService();
      const geofencingService = new GeofencingComplianceService();
      const piiService = new PIIDetectionService();
      const evidenceService = new PrivacyEvidenceStorageService();

      // 1. Grant consent
      await userConsentService.grantConsent({
        userId,
        consentType: ConsentType.CONTENT_ANALYSIS,
        purpose: 'Content moderation',
        legalBasis: 'consent'
      }, '192.168.1.1', 'Mozilla/5.0');

      // 2. Check compliance
      const complianceDecision = await geofencingService.evaluateCompliance({
        userRegion: 'EU',
        userCountry: 'DE',
        contentType: 'post',
        hasConsent: true,
        isHighRisk: false
      });

      // 3. Detect PII
      const piiResult = await piiService.detectAndRedact(content, {
        enableRedaction: true,
        preservePartial: false,
        sensitivityLevel: 'high'
      });

      // 4. Store evidence
      const evidenceResult = await evidenceService.storeEvidence(
        99999,
        content,
        { toxicity: 0.8, pii_detected: piiResult.hasPII },
        'Integration test evidence',
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

      if (
        complianceDecision.allowed &&
        piiResult.hasPII &&
        !piiResult.redactedContent.includes('test@example.com') &&
        evidenceResult.evidenceId &&
        evidenceResult.encryptionApplied &&
        evidenceResult.piiRedacted
      ) {
        this.addResult('Integration - Complete Workflow', true, 'Successfully executed complete privacy compliance workflow');
      } else {
        this.addResult('Integration - Complete Workflow', false, 'Integration workflow failed at one or more steps');
      }

    } catch (error) {
      this.addResult('Integration Workflow', false, 'Integration test failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private addResult(feature: string, passed: boolean, details: string, error?: string): void {
    this.results.push({ feature, passed, details, error });
    
    const status = passed ? '✅' : '❌';
    safeLogger.info(`${status} ${feature}: ${details}`);
    if (error) {
      safeLogger.info(`   Error: ${error}`);
    }
  }

  private printResults(): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    safeLogger.info('\n📊 Validation Summary');
    safeLogger.info('====================');
    safeLogger.info(`Total Features: ${this.results.length}`);
    safeLogger.info(`Passed: ${passed}`);
    safeLogger.info(`Failed: ${failed}`);

    if (failed > 0) {
      safeLogger.info('\n❌ Failed Features:');
      this.results.filter(r => !r.passed).forEach(result => {
        safeLogger.info(`  - ${result.feature}: ${result.details}`);
        if (result.error) {
          safeLogger.info(`    Error: ${result.error}`);
        }
      });
    }

    safeLogger.info('\n🔒 Privacy Compliance Features Validated:');
    safeLogger.info('  • PII Detection and Redaction System');
    safeLogger.info('  • Geofencing and Regional Compliance Rules');
    safeLogger.info('  • Data Retention Policies and Cleanup');
    safeLogger.info('  • User Consent Management System');
    safeLogger.info('  • Privacy-Compliant Evidence Storage');
    safeLogger.info('  • End-to-End Integration Workflow');

    if (passed === this.results.length) {
      safeLogger.info('\n🎉 All privacy compliance features validated successfully!');
      safeLogger.info('Task 14 implementation is complete and ready for production.');
    } else {
      safeLogger.info('\n⚠️  Some features failed validation. Please review and fix issues.');
      process.exit(1);
    }
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const validator = new PrivacyComplianceValidator();
  validator.validateAll().catch(error => {
    safeLogger.error('Validation failed:', error);
    process.exit(1);
  });
}

export { PrivacyComplianceValidator };
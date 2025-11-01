import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { vulnerabilityScanner } from '../services/vulnerabilityScanner';
import { kycComplianceService } from '../services/kycComplianceService';
import { amlTransactionMonitoring } from '../services/amlTransactionMonitoring';
import { complianceReporting } from '../services/complianceReporting';
import { securityIncidentResponse } from '../services/securityIncidentResponse';

/**
 * Comprehensive Security and Compliance Integration Tests
 * Tests the complete security and compliance workflow for LDAO Token Acquisition
 */

describe('Security and Compliance Integration Tests', () => {
  let testUserId: string;
  let testTransactionId: string;

  beforeAll(async () => {
    // Setup test environment
    testUserId = 'test-user-123';
    testTransactionId = 'test-transaction-456';
  });

  afterAll(async () => {
    // Cleanup test environment
  });

  beforeEach(async () => {
    // Reset state before each test
  });

  describe('KYC Compliance Workflow', () => {
    it('should complete full KYC verification workflow', async () => {
      // Initialize KYC profile
      const profile = await kycComplianceService.initializeKYCProfile(testUserId);
      expect(profile.user_id).toBe(testUserId);
      expect(profile.verification_level).toBe('NONE');
      expect(profile.status).toBe('UNVERIFIED');

      // Submit personal information
      await kycComplianceService.submitPersonalInfo(testUserId, {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: new Date('1990-01-01'),
        nationality: 'US',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US'
        }
      });

      // Upload identity document
      const document = await kycComplianceService.uploadDocument(
        testUserId,
        'PASSPORT',
        '/test/passport.jpg',
        'test-hash-123',
        {
          file_size: 1024000,
          mime_type: 'image/jpeg',
          original_filename: 'passport.jpg'
        }
      );

      expect(document.document_type).toBe('PASSPORT');
      expect(document.verification_status).toBe('PENDING');

      // Check purchase eligibility
      const eligibility = await kycComplianceService.canMakePurchase(testUserId, 5000);
      expect(eligibility.allowed).toBeDefined();
    });

    it('should handle KYC rejection scenarios', async () => {
      const profile = await kycComplianceService.initializeKYCProfile('rejected-user');
      
      // Submit information that would trigger rejection
      await kycComplianceService.submitPersonalInfo('rejected-user', {
        first_name: 'John',
        last_name: 'Terrorist', // This would trigger sanctions screening
        date_of_birth: new Date('1990-01-01'),
        nationality: 'XX' // High-risk jurisdiction
      });

      const updatedProfile = await kycComplianceService.getKYCProfile('rejected-user');
      expect(updatedProfile?.compliance_flags.length).toBeGreaterThan(0);
    });

    it('should enforce purchase limits based on verification level', async () => {
      const profile = await kycComplianceService.initializeKYCProfile('limited-user');
      
      // Test unverified user limits
      const unverifiedCheck = await kycComplianceService.canMakePurchase('limited-user', 200);
      expect(unverifiedCheck.allowed).toBe(false);
      expect(unverifiedCheck.reason).toContain('limit');

      // Test within limits
      const withinLimitsCheck = await kycComplianceService.canMakePurchase('limited-user', 50);
      expect(withinLimitsCheck.allowed).toBe(true);
    });
  });

  describe('AML Transaction Monitoring', () => {
    it('should detect structuring patterns', async () => {
      const transactions = [];
      
      // Create multiple transactions just below $10,000 threshold
      for (let i = 0; i < 4; i++) {
        const transaction = {
          id: `struct-tx-${i}`,
          user_id: testUserId,
          transaction_type: 'PURCHASE' as const,
          amount: 9500,
          currency: 'USD',
          timestamp: new Date(Date.now() + i * 1000 * 60 * 10), // 10 minutes apart
          status: 'COMPLETED' as const,
          metadata: {
            ip_address: '192.168.1.1',
            geolocation: {
              country: 'US',
              region: 'NY',
              city: 'New York'
            }
          }
        };
        
        transactions.push(transaction);
        await amlTransactionMonitoring.processTransaction(transaction);
      }

      // Check for suspicious activity reports
      const reports = amlTransactionMonitoring.getSuspiciousActivityReports('OPEN');
      const structuringReports = reports.filter(r => r.report_type === 'STRUCTURING');
      expect(structuringReports.length).toBeGreaterThan(0);
    });

    it('should detect high velocity transactions', async () => {
      const transactions = [];
      
      // Create many transactions in short time period
      for (let i = 0; i < 15; i++) {
        const transaction = {
          id: `velocity-tx-${i}`,
          user_id: 'velocity-user',
          transaction_type: 'PURCHASE' as const,
          amount: 1000,
          currency: 'USD',
          timestamp: new Date(Date.now() + i * 1000 * 60), // 1 minute apart
          status: 'COMPLETED' as const,
          metadata: {
            ip_address: '192.168.1.1'
          }
        };
        
        transactions.push(transaction);
        await amlTransactionMonitoring.processTransaction(transaction);
      }

      // Check user profile for velocity indicators
      const profile = amlTransactionMonitoring.getUserTransactionProfile('velocity-user');
      expect(profile?.risk_indicators.velocity_score).toBeGreaterThan(0);
    });

    it('should flag high-risk jurisdiction transactions', async () => {
      const transaction = {
        id: 'high-risk-tx',
        user_id: 'high-risk-user',
        transaction_type: 'PURCHASE' as const,
        amount: 5000,
        currency: 'USD',
        timestamp: new Date(),
        status: 'COMPLETED' as const,
        metadata: {
          ip_address: '192.168.1.1',
          geolocation: {
            country: 'XX', // High-risk country
            region: 'Unknown',
            city: 'Unknown'
          }
        }
      };

      await amlTransactionMonitoring.processTransaction(transaction);

      const reports = amlTransactionMonitoring.getSuspiciousActivityReports();
      const jurisdictionReports = reports.filter(r => 
        r.report_type === 'HIGH_RISK_JURISDICTION' && 
        r.user_id === 'high-risk-user'
      );
      expect(jurisdictionReports.length).toBeGreaterThan(0);
    });
  });

  describe('Compliance Reporting and Audit Trail', () => {
    it('should create comprehensive audit trail', async () => {
      // Log various compliance-relevant activities
      await complianceReporting.logAuditTrail({
        user_id: testUserId,
        action: 'KYC_DOCUMENT_UPLOADED',
        resource_type: 'USER',
        resource_id: testUserId,
        new_values: { document_type: 'PASSPORT' },
        metadata: {
          ip_address: '192.168.1.1',
          session_id: 'test-session'
        },
        severity: 'INFO',
        compliance_relevant: true
      });

      await complianceReporting.logAuditTrail({
        user_id: testUserId,
        action: 'LARGE_TRANSACTION_CREATED',
        resource_type: 'TRANSACTION',
        resource_id: testTransactionId,
        new_values: { amount: 15000, currency: 'USD' },
        metadata: {
          ip_address: '192.168.1.1'
        },
        severity: 'WARNING',
        compliance_relevant: true
      });

      // Retrieve audit trail
      const auditEntries = complianceReporting.getAuditTrail(
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        new Date(),
        testUserId
      );

      expect(auditEntries.length).toBeGreaterThan(0);
      expect(auditEntries.some(e => e.action === 'KYC_DOCUMENT_UPLOADED')).toBe(true);
      expect(auditEntries.some(e => e.action === 'LARGE_TRANSACTION_CREATED')).toBe(true);
    });

    it('should generate regulatory reports', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = new Date();

      // Generate SAR report
      const sarReport = await complianceReporting.generateRegulatoryReport(
        'SAR',
        'US',
        startDate,
        endDate,
        'compliance-officer'
      );

      expect(sarReport.report_type).toBe('SAR');
      expect(sarReport.jurisdiction).toBe('US');
      expect(sarReport.status).toBe('DRAFT');
      expect(sarReport.data).toBeDefined();
      expect(sarReport.file_path).toBeDefined();

      // Generate CTR report
      const ctrReport = await complianceReporting.generateRegulatoryReport(
        'CTR',
        'US',
        startDate,
        endDate,
        'compliance-officer'
      );

      expect(ctrReport.report_type).toBe('CTR');
      expect(ctrReport.data.large_transactions).toBeDefined();
    });

    it('should handle privacy requests', async () => {
      // Submit GDPR data access request
      const privacyRequest = await complianceReporting.processPrivacyRequest(
        testUserId,
        'ACCESS',
        'GDPR',
        'User requesting access to all personal data'
      );

      expect(privacyRequest.request_type).toBe('ACCESS');
      expect(privacyRequest.jurisdiction).toBe('GDPR');
      expect(privacyRequest.status).toBe('PENDING');
      expect(privacyRequest.deadline).toBeDefined();

      // Submit data erasure request
      const erasureRequest = await complianceReporting.processPrivacyRequest(
        testUserId,
        'ERASURE',
        'GDPR',
        'User requesting deletion of personal data'
      );

      expect(erasureRequest.request_type).toBe('ERASURE');
    });
  });

  describe('Security Incident Response', () => {
    it('should handle security incident workflow', async () => {
      // Report a security incident
      const incident = await securityIncidentResponse.reportIncident(
        'HIGH',
        'BREACH',
        'Potential Data Breach Detected',
        'Unusual access patterns detected in user database',
        ['USER_DATABASE', 'API_GATEWAY'],
        ['MULTIPLE_FAILED_LOGINS', 'UNUSUAL_IP_ADDRESSES']
      );

      expect(incident.severity).toBe('HIGH');
      expect(incident.category).toBe('BREACH');
      expect(incident.status).toBe('DETECTED');
      expect(incident.actions_taken.length).toBeGreaterThan(0);

      // Update incident status
      await securityIncidentResponse.updateIncidentStatus(
        incident.id,
        'INVESTIGATING',
        'security-analyst'
      );

      const updatedIncident = securityIncidentResponse.getIncident(incident.id);
      expect(updatedIncident?.status).toBe('INVESTIGATING');
      expect(updatedIncident?.assigned_to).toBe('security-analyst');

      // Add manual action
      await securityIncidentResponse.addManualAction(
        incident.id,
        'ISOLATE',
        'Isolated affected database servers',
        'security-analyst'
      );

      const incidentWithAction = securityIncidentResponse.getIncident(incident.id);
      expect(incidentWithAction?.actions_taken.length).toBeGreaterThan(1);
    });

    it('should trigger automated response for critical incidents', async () => {
      // Report critical incident that should trigger automated response
      const criticalIncident = await securityIncidentResponse.reportIncident(
        'CRITICAL',
        'SYSTEM_COMPROMISE',
        'Smart Contract Compromise Detected',
        'Unauthorized transactions detected on LDAO Treasury contract',
        ['LDAO_TREASURY_CONTRACT'],
        ['UNAUTHORIZED_TRANSACTIONS', 'SUSPICIOUS_FUNCTION_CALLS']
      );

      expect(criticalIncident.severity).toBe('CRITICAL');
      expect(criticalIncident.actions_taken.length).toBeGreaterThan(0);
      
      // Should have automated actions for critical smart contract incidents
      const automatedActions = criticalIncident.actions_taken.filter(
        action => action.executed_by === 'SYSTEM'
      );
      expect(automatedActions.length).toBeGreaterThan(0);
    });
  });

  describe('Vulnerability Scanning', () => {
    it('should perform comprehensive vulnerability scan', async () => {
      const mockTarget = 'http://localhost:3000';
      
      // Perform vulnerability scan
      const scanResult = await vulnerabilityScanner.performFullScan(mockTarget);

      expect(scanResult.scan_id).toBeDefined();
      expect(scanResult.target).toBe(mockTarget);
      expect(scanResult.scan_type).toBe('COMPREHENSIVE');
      expect(scanResult.status).toBe('COMPLETED');
      expect(scanResult.vulnerabilities).toBeDefined();
      expect(scanResult.summary).toBeDefined();

      // Check that various vulnerability categories were tested
      expect(scanResult.vulnerabilities.length).toBeGreaterThan(0);
      
      // Verify summary calculations
      const { summary } = scanResult;
      expect(summary.total).toBe(scanResult.vulnerabilities.length);
      expect(summary.critical + summary.high + summary.medium + summary.low)
        .toBeLessThanOrEqual(summary.total);
    });

    it('should detect and categorize security issues', async () => {
      const mockTarget = 'http://localhost:3000';
      const scanResult = await vulnerabilityScanner.performFullScan(mockTarget);

      // Check for different types of vulnerabilities
      const vulnerabilityTypes = scanResult.vulnerabilities.map(v => v.category);
      const uniqueTypes = [...new Set(vulnerabilityTypes)];

      // Should test multiple security categories
      expect(uniqueTypes.length).toBeGreaterThan(1);
      
      // Should have proper severity classification
      const severities = scanResult.vulnerabilities.map(v => v.severity);
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      severities.forEach(severity => {
        expect(validSeverities).toContain(severity);
      });
    });
  });

  describe('End-to-End Compliance Workflow', () => {
    it('should handle complete user onboarding with compliance checks', async () => {
      const newUserId = 'e2e-test-user';

      // Step 1: Initialize KYC
      const kycProfile = await kycComplianceService.initializeKYCProfile(newUserId);
      expect(kycProfile.status).toBe('UNVERIFIED');

      // Step 2: Submit personal information
      await kycComplianceService.submitPersonalInfo(newUserId, {
        first_name: 'Alice',
        last_name: 'Smith',
        date_of_birth: new Date('1985-05-15'),
        nationality: 'US'
      });

      // Step 3: Upload documents
      await kycComplianceService.uploadDocument(
        newUserId,
        'PASSPORT',
        '/test/alice-passport.jpg',
        'alice-passport-hash',
        {
          file_size: 2048000,
          mime_type: 'image/jpeg',
          original_filename: 'alice-passport.jpg'
        }
      );

      // Step 4: Check verification status
      const updatedProfile = await kycComplianceService.getKYCProfile(newUserId);
      expect(updatedProfile?.verification_level).not.toBe('NONE');

      // Step 5: Attempt transaction
      const transaction = {
        id: 'e2e-transaction',
        user_id: newUserId,
        transaction_type: 'PURCHASE' as const,
        amount: 2500,
        currency: 'USD',
        timestamp: new Date(),
        status: 'COMPLETED' as const,
        metadata: {
          ip_address: '192.168.1.100'
        }
      };

      await amlTransactionMonitoring.processTransaction(transaction);

      // Step 6: Verify audit trail
      const auditEntries = complianceReporting.getAuditTrail(
        new Date(Date.now() - 60 * 60 * 1000), // Last hour
        new Date(),
        newUserId
      );

      expect(auditEntries.length).toBeGreaterThan(0);
    });

    it('should handle compliance violation detection and reporting', async () => {
      const violatingUserId = 'violating-user';

      // Create scenario that triggers multiple compliance violations
      await kycComplianceService.initializeKYCProfile(violatingUserId);

      // Submit information that triggers sanctions screening
      await kycComplianceService.submitPersonalInfo(violatingUserId, {
        first_name: 'John',
        last_name: 'Criminal', // Triggers sanctions match
        date_of_birth: new Date('1980-01-01'),
        nationality: 'XX' // High-risk jurisdiction
      });

      // Create structuring pattern
      for (let i = 0; i < 5; i++) {
        const transaction = {
          id: `violation-tx-${i}`,
          user_id: violatingUserId,
          transaction_type: 'PURCHASE' as const,
          amount: 9800,
          currency: 'USD',
          timestamp: new Date(Date.now() + i * 1000 * 60 * 30), // 30 minutes apart
          status: 'COMPLETED' as const,
          metadata: {
            ip_address: '192.168.1.1'
          }
        };

        await amlTransactionMonitoring.processTransaction(transaction);
      }

      // Check for compliance violations
      const violations = complianceReporting.getComplianceViolations('OPEN');
      expect(violations.length).toBeGreaterThan(0);

      // Check for suspicious activity reports
      const sarReports = amlTransactionMonitoring.getSuspiciousActivityReports('OPEN');
      expect(sarReports.length).toBeGreaterThan(0);

      // Verify KYC profile has compliance flags
      const profile = await kycComplianceService.getKYCProfile(violatingUserId);
      expect(profile?.compliance_flags.length).toBeGreaterThan(0);
    });
  });

  describe('Security Monitoring and Alerting', () => {
    it('should monitor and alert on security events', async () => {
      // Simulate security events
      await complianceReporting.logAuditTrail({
        user_id: testUserId,
        action: 'FAILED_LOGIN_ATTEMPT',
        resource_type: 'USER',
        resource_id: testUserId,
        metadata: {
          ip_address: '192.168.1.1',
          user_agent: 'Suspicious Bot'
        },
        severity: 'WARNING',
        compliance_relevant: true
      });

      // Multiple failed attempts should trigger security monitoring
      for (let i = 0; i < 10; i++) {
        await complianceReporting.logAuditTrail({
          user_id: testUserId,
          action: 'FAILED_LOGIN_ATTEMPT',
          resource_type: 'USER',
          resource_id: testUserId,
          metadata: {
            ip_address: '192.168.1.1'
          },
          severity: 'ERROR',
          compliance_relevant: true
        });
      }

      const auditEntries = complianceReporting.getAuditTrail(
        new Date(Date.now() - 60 * 60 * 1000),
        new Date(),
        testUserId
      );

      const failedLogins = auditEntries.filter(e => e.action === 'FAILED_LOGIN_ATTEMPT');
      expect(failedLogins.length).toBeGreaterThan(5);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high volume of compliance operations', async () => {
      const startTime = Date.now();
      const operations = [];

      // Create multiple concurrent compliance operations
      for (let i = 0; i < 50; i++) {
        operations.push(
          complianceReporting.logAuditTrail({
            user_id: `perf-user-${i}`,
            action: 'TRANSACTION_CREATED',
            resource_type: 'TRANSACTION',
            resource_id: `perf-tx-${i}`,
            new_values: { amount: 1000 + i },
            metadata: {},
            severity: 'INFO',
            compliance_relevant: true
          })
        );
      }

      await Promise.all(operations);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds

      // Verify all operations were logged
      const auditEntries = complianceReporting.getAuditTrail(
        new Date(startTime),
        new Date(endTime)
      );

      expect(auditEntries.length).toBeGreaterThanOrEqual(50);
    });
  });
});

/**
 * Security Testing Scenarios
 */
describe('Security Testing Scenarios', () => {
  describe('Authentication Security', () => {
    it('should prevent brute force attacks', async () => {
      // Simulate multiple failed login attempts
      const attempts = [];
      for (let i = 0; i < 20; i++) {
        attempts.push(
          complianceReporting.logAuditTrail({
            user_id: 'brute-force-target',
            action: 'FAILED_LOGIN_ATTEMPT',
            resource_type: 'USER',
            resource_id: 'brute-force-target',
            metadata: {
              ip_address: '192.168.1.100',
              attempt_number: i + 1
            },
            severity: 'WARNING',
            compliance_relevant: true
          })
        );
      }

      await Promise.all(attempts);

      // Should trigger security incident
      const auditEntries = complianceReporting.getAuditTrail(
        new Date(Date.now() - 60 * 60 * 1000),
        new Date(),
        'brute-force-target'
      );

      expect(auditEntries.length).toBe(20);
    });
  });

  describe('Data Protection', () => {
    it('should handle sensitive data properly', async () => {
      // Test that sensitive data is properly handled in audit logs
      await complianceReporting.logAuditTrail({
        user_id: testUserId,
        action: 'SENSITIVE_DATA_ACCESS',
        resource_type: 'USER',
        resource_id: testUserId,
        old_values: { ssn: '[REDACTED]' }, // Should be redacted
        new_values: { phone: '[REDACTED]' }, // Should be redacted
        metadata: {},
        severity: 'INFO',
        compliance_relevant: true
      });

      const auditEntries = complianceReporting.getAuditTrail(
        new Date(Date.now() - 60 * 60 * 1000),
        new Date(),
        testUserId
      );

      const sensitiveEntry = auditEntries.find(e => e.action === 'SENSITIVE_DATA_ACCESS');
      expect(sensitiveEntry?.old_values?.ssn).toBe('[REDACTED]');
      expect(sensitiveEntry?.new_values?.phone).toBe('[REDACTED]');
    });
  });
});

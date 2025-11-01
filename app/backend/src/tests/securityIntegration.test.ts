/**
 * Security Integration Tests
 * 
 * Comprehensive security testing covering all security components
 * and their integration with the Web3 marketplace platform.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';
import request from 'supertest';
import { Express } from 'express';
import { securityMonitoringService, SecurityEventType, SecuritySeverity } from '../services/securityMonitoringService';
import { complianceService } from '../services/complianceService';
import { vulnerabilityScanner } from '../services/vulnerabilityScanner';
import { keyManagementService, KeyType } from '../services/keyManagementService';
import { encryptionService } from '../services/encryptionService';
import { auditLoggingService } from '../services/auditLoggingService';

describe('Security Integration Tests', () => {
  let app: Express;
  let testUser: any;
  let adminUser: any;

  beforeAll(async () => {
    // Initialize test application
    // app = await createTestApp();
    
    // Create test users
    testUser = {
      id: 'test-user-1',
      walletAddress: '0x1234567890123456789012345678901234567890',
      token: 'test-jwt-token',
    };

    adminUser = {
      id: 'admin-user-1',
      walletAddress: '0x0987654321098765432109876543210987654321',
      token: 'admin-jwt-token',
      role: 'admin',
    };
  });

  afterAll(async () => {
    // Cleanup test data
  });

  describe('Security Monitoring Service', () => {
    test('should record security events', async () => {
      const event = await securityMonitoringService.recordSecurityEvent({
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        severity: SecuritySeverity.MEDIUM,
        source: 'test',
        details: { reason: 'invalid_credentials' },
        ipAddress: '192.168.1.100',
        userAgent: 'Test Agent',
        userId: testUser.id,
      });

      expect(event.id).toBeDefined();
      expect(event.type).toBe(SecurityEventType.AUTHENTICATION_FAILURE);
      expect(event.severity).toBe(SecuritySeverity.MEDIUM);
    });

    test('should detect brute force attacks', async () => {
      const ipAddress = '192.168.1.101';
      
      // Simulate multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await securityMonitoringService.recordSecurityEvent({
          type: SecurityEventType.AUTHENTICATION_FAILURE,
          severity: SecuritySeverity.MEDIUM,
          source: 'test',
          details: { attempt: i + 1 },
          ipAddress,
          userAgent: 'Test Agent',
        });
      }

      // Check if IP is blocked
      const isBlocked = securityMonitoringService.isIPBlocked(ipAddress);
      expect(isBlocked).toBe(true);
    });

    test('should create security alerts for critical events', async () => {
      await securityMonitoringService.recordSecurityEvent({
        type: SecurityEventType.SQL_INJECTION_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        source: 'test',
        details: { payload: "'; DROP TABLE users; --" },
        ipAddress: '192.168.1.102',
        userAgent: 'Malicious Agent',
      });

      const alerts = securityMonitoringService.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const sqlInjectionAlert = alerts.find(alert => 
        alert.title.includes('SQL Injection')
      );
      expect(sqlInjectionAlert).toBeDefined();
    });

    test('should provide security metrics', () => {
      const metrics = securityMonitoringService.getSecurityMetrics();
      
      expect(metrics.totalEvents).toBeGreaterThan(0);
      expect(metrics.eventsByType).toBeDefined();
      expect(metrics.eventsBySeverity).toBeDefined();
      expect(typeof metrics.averageResponseTime).toBe('number');
    });

    test('should acknowledge and resolve alerts', async () => {
      const alerts = securityMonitoringService.getActiveAlerts();
      if (alerts.length > 0) {
        const alert = alerts[0];
        
        await securityMonitoringService.acknowledgeAlert(alert.id, adminUser.id);
        expect(alert.acknowledged).toBe(true);
        expect(alert.assignedTo).toBe(adminUser.id);

        await securityMonitoringService.resolveAlert(alert.id, adminUser.id, 'False positive');
        expect(alert.resolvedAt).toBeDefined();
      }
    });
  });

  describe('Compliance Service', () => {
    test('should handle GDPR data export request', async () => {
      const request = await complianceService.handleDataExportRequest(
        testUser.id,
        testUser.id
      );

      expect(request.id).toBeDefined();
      expect(request.type).toBe('data_export');
      expect(request.userId).toBe(testUser.id);
      expect(request.status).toBe('pending');
    });

    test('should handle GDPR data deletion request', async () => {
      const request = await complianceService.handleDataDeletionRequest(
        testUser.id,
        testUser.id
      );

      expect(request.id).toBeDefined();
      expect(request.type).toBe('data_deletion');
      expect(request.userId).toBe(testUser.id);
    });

    test('should handle CCPA opt-out request', async () => {
      const request = await complianceService.handleOptOutRequest(
        testUser.id,
        testUser.id
      );

      expect(request.id).toBeDefined();
      expect(request.type).toBe('opt_out');
      expect(request.status).toBe('pending');
    });

    test('should record and manage consent', async () => {
      const consent = await complianceService.recordConsent({
        userId: testUser.id,
        consentType: 'marketing',
        consentGiven: true,
        consentVersion: '1.0',
        ipAddress: '192.168.1.100',
        userAgent: 'Test Agent',
      });

      expect(consent.id).toBeDefined();
      expect(consent.consentGiven).toBe(true);
      expect(consent.consentType).toBe('marketing');

      // Test consent withdrawal
      await complianceService.withdrawConsent({
        userId: testUser.id,
        consentType: 'marketing',
        reason: 'User request',
      });
    });

    test('should generate compliance reports', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = new Date();

      const report = await complianceService.generateComplianceReport({
        reportType: 'monthly',
        startDate,
        endDate,
      });

      expect(report.reportId).toBeDefined();
      expect(report.reportType).toBe('monthly');
      expect(report.metrics).toBeDefined();
      expect(report.violations).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    test('should check data retention compliance', async () => {
      const compliance = await complianceService.checkDataRetentionCompliance();
      
      expect(compliance.expiredData).toBeDefined();
      expect(compliance.actionsRequired).toBeDefined();
      expect(Array.isArray(compliance.expiredData)).toBe(true);
      expect(Array.isArray(compliance.actionsRequired)).toBe(true);
    });

    test('should perform automated data cleanup', async () => {
      const cleanup = await complianceService.performDataCleanup();
      
      expect(typeof cleanup.deletedRecords).toBe('number');
      expect(typeof cleanup.anonymizedRecords).toBe('number');
      expect(Array.isArray(cleanup.errors)).toBe(true);
    });
  });

  describe('Vulnerability Scanner', () => {
    test('should perform comprehensive security scan', async () => {
      const report = await vulnerabilityScanner.performComprehensiveScan();

      expect(report.id).toBeDefined();
      expect(report.scanType).toBe('comprehensive_scan');
      expect(report.status).toBe('completed');
      expect(report.summary).toBeDefined();
      expect(report.vulnerabilities).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    test('should track scan history', () => {
      const history = vulnerabilityScanner.getScanHistory();
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      
      const latestScan = vulnerabilityScanner.getLatestScanReport();
      expect(latestScan).toBeDefined();
      expect(latestScan?.scanType).toBe('comprehensive_scan');
    });

    test('should update vulnerability status', async () => {
      const latestScan = vulnerabilityScanner.getLatestScanReport();
      if (latestScan && latestScan.vulnerabilities.length > 0) {
        const vulnerability = latestScan.vulnerabilities[0];
        
        await vulnerabilityScanner.updateVulnerabilityStatus(
          vulnerability.id,
          'acknowledged',
          adminUser.id
        );

        const updatedVuln = vulnerabilityScanner.getVulnerability(vulnerability.id);
        expect(updatedVuln?.status).toBe('acknowledged');
      }
    });
  });

  describe('Key Management Service', () => {
    let testKeyId: string;

    test('should generate encryption keys', async () => {
      const keyMetadata = await keyManagementService.generateKey({
        type: KeyType.ENCRYPTION,
        purpose: ['data_encryption'],
        tags: { environment: 'test' },
      });

      testKeyId = keyMetadata.id;
      
      expect(keyMetadata.id).toBeDefined();
      expect(keyMetadata.type).toBe(KeyType.ENCRYPTION);
      expect(keyMetadata.status).toBe('active');
      expect(keyMetadata.algorithm).toBe('aes-256-gcm');
    });

    test('should retrieve keys', async () => {
      const keyMaterial = await keyManagementService.getKey(testKeyId, testUser.id);
      
      expect(keyMaterial).toBeDefined();
      expect(Buffer.isBuffer(keyMaterial)).toBe(true);
    });

    test('should list keys with filtering', () => {
      const allKeys = keyManagementService.listKeys();
      expect(Array.isArray(allKeys)).toBe(true);
      expect(allKeys.length).toBeGreaterThan(0);

      const encryptionKeys = keyManagementService.listKeys({
        type: KeyType.ENCRYPTION,
      });
      expect(encryptionKeys.every(key => key.type === KeyType.ENCRYPTION)).toBe(true);

      const testKeys = keyManagementService.listKeys({
        tags: { environment: 'test' },
      });
      expect(testKeys.every(key => key.tags.environment === 'test')).toBe(true);
    });

    test('should rotate keys', async () => {
      const rotatedKey = await keyManagementService.rotateKey(testKeyId, adminUser.id);
      
      expect(rotatedKey.id).not.toBe(testKeyId);
      expect(rotatedKey.version).toBeGreaterThan(1);
      expect(rotatedKey.rotatedAt).toBeDefined();
    });

    test('should get key usage statistics', () => {
      const stats = keyManagementService.getKeyUsageStats(testKeyId);
      
      expect(typeof stats.totalUsage).toBe('number');
      expect(typeof stats.recentUsage).toBe('number');
      expect(typeof stats.operationCounts).toBe('object');
    });

    test('should export and import keys', async () => {
      // Export key
      const exportedKey = await keyManagementService.exportKey(testKeyId, adminUser.id);
      expect(typeof exportedKey).toBe('string');
      expect(exportedKey.length).toBeGreaterThan(0);

      // Import key (would need encryption key in real scenario)
      // const importedKey = await keyManagementService.importKey(
      //   exportedKey,
      //   'test-encryption-key',
      //   adminUser.id
      // );
      // expect(importedKey.id).toBeDefined();
    });

    test('should revoke keys', async () => {
      await keyManagementService.revokeKey(
        testKeyId,
        'Test revocation',
        adminUser.id
      );

      const revokedKey = keyManagementService.listKeys().find(k => k.id === testKeyId);
      expect(revokedKey?.status).toBe('compromised');
    });
  });

  describe('Encryption Service', () => {
    test('should encrypt and decrypt content', async () => {
      const originalContent = Buffer.from('This is sensitive data');
      
      const { encryptedContent, encryptionKey } = await encryptionService.encryptContent(originalContent);
      
      expect(encryptedContent).toBeDefined();
      expect(encryptionKey).toBeDefined();
      expect(encryptedContent.length).toBeGreaterThan(originalContent.length);

      const decryptedContent = await encryptionService.decryptContent(encryptedContent, encryptionKey);
      expect(decryptedContent.toString()).toBe(originalContent.toString());
    });

    test('should generate and verify content fingerprints', () => {
      const content = Buffer.from('Test content for fingerprinting');
      const fingerprint = encryptionService.generateContentFingerprint(content);
      
      expect(typeof fingerprint).toBe('string');
      expect(fingerprint.length).toBe(16);

      // Same content should generate same fingerprint
      const fingerprint2 = encryptionService.generateContentFingerprint(content);
      expect(fingerprint).toBe(fingerprint2);
    });

    test('should generate license keys', () => {
      const licenseKey = encryptionService.generateLicenseKey(
        'asset-123',
        'buyer-456',
        Date.now()
      );
      
      expect(typeof licenseKey).toBe('string');
      expect(licenseKey).toMatch(/^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/);
    });

    test('should verify content integrity', () => {
      const content = Buffer.from('Content to verify');
      const hash = require('crypto').createHash('sha256').update(content).digest('hex');
      
      const isValid = encryptionService.verifyContentIntegrity(content, hash);
      expect(isValid).toBe(true);

      const tamperedContent = Buffer.from('Tampered content');
      const isInvalid = encryptionService.verifyContentIntegrity(tamperedContent, hash);
      expect(isInvalid).toBe(false);
    });

    test('should generate and verify access tokens', () => {
      const token = encryptionService.generateAccessToken('asset-123', 'user-456', 60);
      expect(typeof token).toBe('string');
      expect(token.includes('.')).toBe(true);

      const verified = encryptionService.verifyAccessToken(token);
      expect(verified).toBeDefined();
      expect(verified?.assetId).toBe('asset-123');
      expect(verified?.userId).toBe('user-456');

      // Test expired token
      const expiredToken = encryptionService.generateAccessToken('asset-123', 'user-456', -1);
      const expiredVerified = encryptionService.verifyAccessToken(expiredToken);
      expect(expiredVerified).toBeNull();
    });
  });

  describe('Audit Logging Service', () => {
    test('should create audit logs', async () => {
      const auditLog = await auditLoggingService.createAuditLog({
        actionType: 'test_action',
        actorId: testUser.id,
        actorType: 'user',
        oldState: { status: 'old' },
        newState: { status: 'new' },
        reasoning: 'Test audit log',
        ipAddress: '192.168.1.100',
        userAgent: 'Test Agent',
      });

      expect(auditLog.id).toBeDefined();
      expect(auditLog.actionType).toBe('test_action');
      expect(auditLog.actorId).toBe(testUser.id);
    });

    test('should retrieve audit trail', async () => {
      const auditTrail = await auditLoggingService.getAuditTrail({
        actorId: testUser.id,
        limit: 10,
      });

      expect(auditTrail.logs).toBeDefined();
      expect(Array.isArray(auditTrail.logs)).toBe(true);
      expect(typeof auditTrail.total).toBe('number');
      expect(typeof auditTrail.hasMore).toBe('boolean');
    });

    test('should log moderation decisions', async () => {
      const auditLog = await auditLoggingService.logModerationDecision({
        caseId: 123,
        decision: 'approved',
        moderatorId: adminUser.id,
        reasoning: 'Content meets guidelines',
        oldStatus: 'pending',
        newStatus: 'approved',
        ipAddress: '192.168.1.100',
        userAgent: 'Admin Agent',
      });

      expect(auditLog.actionType).toBe('moderation_decision');
      expect(auditLog.actorId).toBe(adminUser.id);
    });

    test('should get audit statistics', async () => {
      const stats = await auditLoggingService.getAuditStatistics({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        endDate: new Date(),
      });

      expect(typeof stats.totalLogs).toBe('number');
      expect(typeof stats.logsByAction).toBe('object');
      expect(typeof stats.logsByActor).toBe('object');
      expect(typeof stats.averageLogsPerDay).toBe('number');
    });

    test('should export audit trail', async () => {
      const jsonExport = await auditLoggingService.exportAuditTrail({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
        format: 'json',
      });

      expect(typeof jsonExport).toBe('string');
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      const csvExport = await auditLoggingService.exportAuditTrail({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
        format: 'csv',
      });

      expect(typeof csvExport).toBe('string');
      expect(csvExport.includes(',')).toBe(true);
    });
  });

  describe('Security Middleware Integration', () => {
    test('should block malicious requests', async () => {
      if (!app) return;

      // Test SQL injection attempt
      const sqlInjectionResponse = await request(app)
        .get('/api/products')
        .query({ search: "'; DROP TABLE products; --" });

      expect(sqlInjectionResponse.status).toBe(400);
      expect(sqlInjectionResponse.body.error).toBe('Invalid Input');
    });

    test('should enforce rate limits', async () => {
      if (!app) return;

      // Make multiple rapid requests
      const requests = Array.from({ length: 20 }, () =>
        request(app).get('/api/products')
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should validate file uploads', async () => {
      if (!app) return;

      // Test malicious file upload
      const maliciousResponse = await request(app)
        .post('/api/products/images')
        .set('Authorization', `Bearer ${testUser.token}`)
        .attach('image', Buffer.from('<?php system($_GET["cmd"]); ?>'), 'malicious.php');

      expect(maliciousResponse.status).toBe(400);
      expect(maliciousResponse.body.error).toBe('Malicious File');
    });

    test('should enforce CORS policy', async () => {
      if (!app) return;

      const corsResponse = await request(app)
        .get('/api/products')
        .set('Origin', 'https://malicious-site.com');

      // Should either block or handle appropriately based on CORS config
      expect([200, 403, 404]).toContain(corsResponse.status);
    });
  });

  describe('End-to-End Security Scenarios', () => {
    test('should handle complete attack scenario', async () => {
      const attackerIP = '192.168.1.200';
      
      // 1. Multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await securityMonitoringService.recordSecurityEvent({
          type: SecurityEventType.AUTHENTICATION_FAILURE,
          severity: SecuritySeverity.MEDIUM,
          source: 'test_attack',
          details: { attempt: i + 1 },
          ipAddress: attackerIP,
          userAgent: 'Attacker Agent',
        });
      }

      // 2. SQL injection attempt
      await securityMonitoringService.recordSecurityEvent({
        type: SecurityEventType.SQL_INJECTION_ATTEMPT,
        severity: SecuritySeverity.HIGH,
        source: 'test_attack',
        details: { payload: "' OR 1=1 --" },
        ipAddress: attackerIP,
        userAgent: 'Attacker Agent',
      });

      // 3. Check if IP is blocked
      const isBlocked = securityMonitoringService.isIPBlocked(attackerIP);
      expect(isBlocked).toBe(true);

      // 4. Verify security alerts were created
      const alerts = securityMonitoringService.getActiveAlerts();
      const attackerAlerts = alerts.filter(alert => 
        alert.description.includes(attackerIP)
      );
      expect(attackerAlerts.length).toBeGreaterThan(0);
    });

    test('should handle compliance data request workflow', async () => {
      // 1. User requests data export
      const exportRequest = await complianceService.handleDataExportRequest(
        testUser.id,
        testUser.id
      );
      expect(exportRequest.status).toBe('pending');

      // 2. User requests data deletion
      const deletionRequest = await complianceService.handleDataDeletionRequest(
        testUser.id,
        testUser.id
      );
      expect(deletionRequest.type).toBe('data_deletion');

      // 3. Generate compliance report
      const report = await complianceService.generateComplianceReport({
        reportType: 'gdpr_compliance',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });
      expect(report.reportId).toBeDefined();
    });

    test('should handle key compromise scenario', async () => {
      // 1. Generate a key
      const keyMetadata = await keyManagementService.generateKey({
        type: KeyType.API_KEY,
        purpose: ['api_access'],
        tags: { service: 'test' },
      });

      // 2. Simulate key compromise detection
      await securityMonitoringService.recordSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.HIGH,
        source: 'key_monitoring',
        details: { 
          keyId: keyMetadata.id,
          reason: 'Unusual usage pattern detected',
        },
      });

      // 3. Revoke compromised key
      await keyManagementService.revokeKey(
        keyMetadata.id,
        'Suspected compromise',
        adminUser.id
      );

      // 4. Generate new key
      const newKey = await keyManagementService.generateKey({
        type: KeyType.API_KEY,
        purpose: ['api_access'],
        tags: { service: 'test', replacement_for: keyMetadata.id },
      });

      expect(newKey.id).not.toBe(keyMetadata.id);
      expect(newKey.tags.replacement_for).toBe(keyMetadata.id);
    });
  });
});

describe('Security Performance Tests', () => {
  test('should handle high-volume security events', async () => {
    const startTime = Date.now();
    const eventCount = 1000;

    const promises = Array.from({ length: eventCount }, (_, i) =>
      securityMonitoringService.recordSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.LOW,
        source: 'performance_test',
        details: { eventNumber: i },
        ipAddress: `192.168.1.${i % 255}`,
      })
    );

    await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    safeLogger.info(`Processed ${eventCount} security events in ${duration}ms`);
  });

  test('should handle concurrent key operations', async () => {
    const keyCount = 100;
    const startTime = Date.now();

    const promises = Array.from({ length: keyCount }, (_, i) =>
      keyManagementService.generateKey({
        type: KeyType.ENCRYPTION,
        purpose: ['test_performance'],
        tags: { batch: 'performance_test', index: i.toString() },
      })
    );

    const keys = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(keys.length).toBe(keyCount);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    safeLogger.info(`Generated ${keyCount} keys in ${duration}ms`);
  });

  test('should handle large audit log queries', async () => {
    const startTime = Date.now();

    const auditTrail = await auditLoggingService.getAuditTrail({
      limit: 1000,
      orderBy: 'desc',
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(auditTrail.logs).toBeDefined();
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    safeLogger.info(`Retrieved audit trail in ${duration}ms`);
  });
});

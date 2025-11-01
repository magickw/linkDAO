/**
 * Security Tests for PII Handling and Data Protection
 * Tests system security measures for sensitive data
 */

import request from 'supertest';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import { Express } from 'express';
import { createTestApp } from '../../utils/testApp';
import { TestDatabase } from '../../utils/testDatabase';
import { MockAIServices } from '../../utils/mockAIServices';
import { PIITestGenerator } from '../../utils/piiTestGenerator';
import { SecurityTestUtils } from '../../utils/securityTestUtils';

describe('Security Testing - PII Handling and Data Protection', () => {
  let app: Express;
  let testDb: TestDatabase;
  let mockAI: MockAIServices;
  let piiGenerator: PIITestGenerator;
  let securityUtils: SecurityTestUtils;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
    
    mockAI = new MockAIServices();
    await mockAI.setup();
    
    app = createTestApp({
      database: testDb.getConnection(),
      aiServices: mockAI.getServices(),
      enableSecurityMode: true
    });
    
    piiGenerator = new PIITestGenerator();
    securityUtils = new SecurityTestUtils();
  });

  afterAll(async () => {
    await mockAI.cleanup();
    await testDb.cleanup();
  });

  beforeEach(async () => {
    await testDb.reset();
    mockAI.reset();
  });

  describe('PII Detection and Redaction', () => {
    it('should detect and redact phone numbers', async () => {
      const phoneNumbers = [
        '+1-555-123-4567',
        '(555) 123-4567',
        '555.123.4567',
        '5551234567',
        '+44 20 7946 0958',
        '+33 1 42 86 83 26'
      ];

      for (const phone of phoneNumbers) {
        const content = piiGenerator.generateContentWithPhone(phone);
        
        mockAI.setPIIDetectionResponse({
          detected: true,
          types: ['phone_number'],
          confidence: 0.95,
          redactedContent: content.replace(phone, '[PHONE_REDACTED]')
        });

        const response = await request(app)
          .post('/api/content')
          .send({
            type: 'post',
            content: content,
            userId: 'test-user-1'
          })
          .expect(200);

        // Verify PII was detected
        const moderationCase = await testDb.getModerationCase(response.body.contentId);
        expect(moderationCase.vendorScores).toHaveProperty('pii_detection');
        
        // Verify content was redacted in storage
        const storedContent = await testDb.getStoredContent(response.body.contentId);
        expect(storedContent.content).not.toContain(phone);
        expect(storedContent.content).toContain('[PHONE_REDACTED]');
      }
    });

    it('should detect and redact email addresses', async () => {
      const emails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@subdomain.example.org',
        'firstname.lastname@company-name.com'
      ];

      for (const email of emails) {
        const content = piiGenerator.generateContentWithEmail(email);
        
        mockAI.setPIIDetectionResponse({
          detected: true,
          types: ['email'],
          confidence: 0.93,
          redactedContent: content.replace(email, '[EMAIL_REDACTED]')
        });

        const response = await request(app)
          .post('/api/content')
          .send({
            type: 'post',
            content: content,
            userId: 'test-user-1'
          })
          .expect(200);

        const storedContent = await testDb.getStoredContent(response.body.contentId);
        expect(storedContent.content).not.toContain(email);
        expect(storedContent.content).toContain('[EMAIL_REDACTED]');
      }
    });

    it('should detect and redact physical addresses', async () => {
      const addresses = [
        '123 Main Street, Anytown, CA 90210',
        '456 Oak Avenue, Suite 789, New York, NY 10001',
        '789 Pine Road, Apartment 4B, Miami, FL 33101',
        '321 Elm Drive, Unit 567, Austin, TX 78701'
      ];

      for (const address of addresses) {
        const content = piiGenerator.generateContentWithAddress(address);
        
        mockAI.setPIIDetectionResponse({
          detected: true,
          types: ['address'],
          confidence: 0.89,
          redactedContent: content.replace(address, '[ADDRESS_REDACTED]')
        });

        const response = await request(app)
          .post('/api/content')
          .send({
            type: 'post',
            content: content,
            userId: 'test-user-1'
          })
          .expect(200);

        const storedContent = await testDb.getStoredContent(response.body.contentId);
        expect(storedContent.content).not.toContain(address);
        expect(storedContent.content).toContain('[ADDRESS_REDACTED]');
      }
    });

    it('should detect and redact seed phrases', async () => {
      const seedPhrases = [
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        'legal winner thank year wave sausage worth useful legal winner thank yellow',
        'letter advice cage absurd amount doctor acoustic avoid letter advice cage above'
      ];

      for (const seedPhrase of seedPhrases) {
        const content = piiGenerator.generateContentWithSeedPhrase(seedPhrase);
        
        mockAI.setPIIDetectionResponse({
          detected: true,
          types: ['seed_phrase'],
          confidence: 0.98,
          redactedContent: content.replace(seedPhrase, '[SEED_PHRASE_REDACTED]')
        });

        const response = await request(app)
          .post('/api/content')
          .send({
            type: 'post',
            content: content,
            userId: 'test-user-1'
          })
          .expect(200);

        // Seed phrases should trigger immediate blocking
        expect(response.body.status).toBe('rejected');
        
        const storedContent = await testDb.getStoredContent(response.body.contentId);
        expect(storedContent.content).not.toContain(seedPhrase);
        expect(storedContent.content).toContain('[SEED_PHRASE_REDACTED]');
      }
    });

    it('should detect and redact social security numbers', async () => {
      const ssns = [
        '123-45-6789',
        '987654321',
        '555 44 3333'
      ];

      for (const ssn of ssns) {
        const content = piiGenerator.generateContentWithSSN(ssn);
        
        mockAI.setPIIDetectionResponse({
          detected: true,
          types: ['ssn'],
          confidence: 0.96,
          redactedContent: content.replace(ssn, '[SSN_REDACTED]')
        });

        const response = await request(app)
          .post('/api/content')
          .send({
            type: 'post',
            content: content,
            userId: 'test-user-1'
          })
          .expect(200);

        const storedContent = await testDb.getStoredContent(response.body.contentId);
        expect(storedContent.content).not.toContain(ssn);
        expect(storedContent.content).toContain('[SSN_REDACTED]');
      }
    });
  });

  describe('Biometric Data Protection', () => {
    it('should use perceptual hashes instead of storing raw biometric data', async () => {
      const biometricImage = piiGenerator.generateBiometricImage();
      
      mockAI.setImageModerationResponse({
        confidence: 0.91,
        categories: ['biometric_data'],
        action: 'allow',
        perceptualHash: 'abc123def456'
      });

      const response = await request(app)
        .post('/api/content')
        .field('type', 'post')
        .field('userId', 'test-user-1')
        .attach('media', biometricImage, 'biometric.jpg')
        .expect(200);

      // Verify raw image is not stored
      const storedMedia = await testDb.getStoredMedia(response.body.contentId);
      expect(storedMedia.rawData).toBeNull();
      expect(storedMedia.perceptualHash).toBe('abc123def456');
    });

    it('should detect faces in images and apply appropriate protection', async () => {
      const faceImage = piiGenerator.generateImageWithFaces();
      
      mockAI.setImageModerationResponse({
        confidence: 0.94,
        categories: ['faces_detected'],
        action: 'review',
        faceCount: 2,
        faceBoxes: [
          { x: 100, y: 100, width: 50, height: 50 },
          { x: 200, y: 150, width: 45, height: 45 }
        ]
      });

      const response = await request(app)
        .post('/api/content')
        .field('type', 'post')
        .field('userId', 'test-user-1')
        .attach('media', faceImage, 'faces.jpg')
        .expect(200);

      // Should be queued for review due to face detection
      expect(response.body.status).toBe('pending');
      
      const moderationCase = await testDb.getModerationCase(response.body.contentId);
      expect(moderationCase.vendorScores.google_vision.faceCount).toBe(2);
    });
  });

  describe('Data Encryption and Storage Security', () => {
    it('should encrypt sensitive data at rest', async () => {
      const sensitiveContent = piiGenerator.generateSensitiveContent();
      
      mockAI.setPIIDetectionResponse({
        detected: true,
        types: ['multiple_pii'],
        confidence: 0.92,
        redactedContent: '[SENSITIVE_CONTENT_REDACTED]'
      });

      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: sensitiveContent,
          userId: 'test-user-1'
        })
        .expect(200);

      // Verify data is encrypted in database
      const rawDbRecord = await testDb.getRawModerationCase(response.body.contentId);
      expect(rawDbRecord.encrypted_content).toBeDefined();
      expect(rawDbRecord.encrypted_content).not.toContain(sensitiveContent);
      
      // Verify encryption key is not stored with data
      expect(rawDbRecord.encryption_key).toBeUndefined();
    });

    it('should use secure key management for encryption', async () => {
      const content = piiGenerator.generateContentWithPII();
      
      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: content,
          userId: 'test-user-1'
        })
        .expect(200);

      // Verify key rotation capabilities
      const keyInfo = await securityUtils.getEncryptionKeyInfo(response.body.contentId);
      expect(keyInfo.keyVersion).toBeDefined();
      expect(keyInfo.algorithm).toBe('AES-256-GCM');
      expect(keyInfo.keyId).toBeDefined();
    });
  });

  describe('Access Control and Authorization', () => {
    it('should restrict access to PII data based on roles', async () => {
      const piiContent = piiGenerator.generateContentWithPII();
      
      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: piiContent,
          userId: 'test-user-1'
        })
        .expect(200);

      // Regular user should not see raw PII
      const userResponse = await request(app)
        .get(`/api/content/${response.body.contentId}`)
        .set('Authorization', 'Bearer user-token')
        .expect(200);

      expect(userResponse.body.content).toContain('[REDACTED]');

      // Moderator should see redacted version
      const moderatorResponse = await request(app)
        .get(`/api/content/${response.body.contentId}`)
        .set('Authorization', 'Bearer moderator-token')
        .expect(200);

      expect(moderatorResponse.body.content).toContain('[REDACTED]');

      // Admin should have access to audit logs but not raw PII
      const adminResponse = await request(app)
        .get(`/api/_internal/moderation/audit/${response.body.contentId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(adminResponse.body.auditLog).toBeDefined();
      expect(adminResponse.body.rawContent).toBeUndefined();
    });

    it('should log all access to sensitive data', async () => {
      const sensitiveContent = piiGenerator.generateSensitiveContent();
      
      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: sensitiveContent,
          userId: 'test-user-1'
        })
        .expect(200);

      // Access the content
      await request(app)
        .get(`/api/content/${response.body.contentId}`)
        .set('Authorization', 'Bearer moderator-token')
        .expect(200);

      // Verify access was logged
      const accessLogs = await testDb.getAccessLogs(response.body.contentId);
      expect(accessLogs.length).toBeGreaterThan(0);
      expect(accessLogs[0].accessType).toBe('content_view');
      expect(accessLogs[0].userId).toBe('moderator-user-id');
      expect(accessLogs[0].timestamp).toBeDefined();
    });
  });

  describe('Data Retention and Deletion', () => {
    it('should automatically delete PII after retention period', async () => {
      const piiContent = piiGenerator.generateContentWithPII();
      
      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: piiContent,
          userId: 'test-user-1'
        })
        .expect(200);

      // Simulate passage of retention period
      await testDb.simulateTimePassage(response.body.contentId, 90); // 90 days

      // Trigger retention cleanup
      await request(app)
        .post('/api/_internal/maintenance/cleanup-expired')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      // Verify PII was deleted
      const moderationCase = await testDb.getModerationCase(response.body.contentId);
      expect(moderationCase.piiData).toBeNull();
      expect(moderationCase.retentionStatus).toBe('pii_deleted');
    });

    it('should handle user data deletion requests (GDPR)', async () => {
      const userContent = piiGenerator.generateUserContent('gdpr-test-user');
      
      // Create multiple pieces of content for user
      const contentIds = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/content')
          .send({
            type: 'post',
            content: userContent[i],
            userId: 'gdpr-test-user'
          })
          .expect(200);
        contentIds.push(response.body.contentId);
      }

      // Submit GDPR deletion request
      await request(app)
        .post('/api/_internal/gdpr/delete-user-data')
        .send({
          userId: 'gdpr-test-user',
          requestType: 'full_deletion'
        })
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      // Verify all user data was deleted
      for (const contentId of contentIds) {
        const moderationCase = await testDb.getModerationCase(contentId);
        expect(moderationCase.userData).toBeNull();
        expect(moderationCase.gdprStatus).toBe('deleted');
      }
    });
  });

  describe('Privacy Compliance Testing', () => {
    it('should handle opt-in consent for DM scanning', async () => {
      const dmContent = piiGenerator.generateDMContent();
      
      // User has not opted in to DM scanning
      const response1 = await request(app)
        .post('/api/content')
        .send({
          type: 'dm',
          content: dmContent,
          userId: 'privacy-user-1',
          recipientId: 'privacy-user-2'
        })
        .expect(200);

      // Should only scan metadata, not content
      const case1 = await testDb.getModerationCase(response1.body.contentId);
      expect(case1.scanLevel).toBe('metadata_only');

      // User opts in to DM scanning
      await request(app)
        .post('/api/user/privacy-settings')
        .send({
          userId: 'privacy-user-1',
          dmScanningConsent: true
        })
        .set('Authorization', 'Bearer user-token')
        .expect(200);

      // Now DM should be fully scanned
      const response2 = await request(app)
        .post('/api/content')
        .send({
          type: 'dm',
          content: dmContent,
          userId: 'privacy-user-1',
          recipientId: 'privacy-user-2'
        })
        .expect(200);

      const case2 = await testDb.getModerationCase(response2.body.contentId);
      expect(case2.scanLevel).toBe('full_content');
    });

    it('should apply geofencing rules for regional compliance', async () => {
      const content = piiGenerator.generateContentWithPII();
      
      // EU user - should apply GDPR rules
      const euResponse = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: content,
          userId: 'eu-user-1'
        })
        .set('X-User-Region', 'EU')
        .expect(200);

      const euCase = await testDb.getModerationCase(euResponse.body.contentId);
      expect(euCase.complianceRules).toContain('GDPR');
      expect(euCase.dataRetentionDays).toBe(30); // Shorter retention for EU

      // US user - should apply different rules
      const usResponse = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: content,
          userId: 'us-user-1'
        })
        .set('X-User-Region', 'US')
        .expect(200);

      const usCase = await testDb.getModerationCase(usResponse.body.contentId);
      expect(usCase.complianceRules).toContain('CCPA');
      expect(usCase.dataRetentionDays).toBe(90); // Longer retention for US
    });
  });

  describe('Security Vulnerability Testing', () => {
    it('should prevent SQL injection in PII queries', async () => {
      const maliciousInput = "'; DROP TABLE moderation_cases; --";
      
      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: `My phone number is ${maliciousInput}`,
          userId: 'test-user-1'
        })
        .expect(200);

      // Verify database is intact
      const moderationCases = await testDb.getModerationCases();
      expect(moderationCases.length).toBeGreaterThan(0);
      
      // Verify malicious input was treated as content
      const storedContent = await testDb.getStoredContent(response.body.contentId);
      expect(storedContent.content).toContain('[REDACTED]');
    });

    it('should prevent XSS in PII redaction', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      const content = `Contact me at ${xssPayload}@example.com`;
      
      mockAI.setPIIDetectionResponse({
        detected: true,
        types: ['email'],
        confidence: 0.95,
        redactedContent: content.replace(`${xssPayload}@example.com`, '[EMAIL_REDACTED]')
      });

      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: content,
          userId: 'test-user-1'
        })
        .expect(200);

      const storedContent = await testDb.getStoredContent(response.body.contentId);
      expect(storedContent.content).not.toContain('<script>');
      expect(storedContent.content).toContain('[EMAIL_REDACTED]');
    });
  });
});

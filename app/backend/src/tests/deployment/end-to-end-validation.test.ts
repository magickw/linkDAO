import request from 'supertest';
import { app } from '../../index';
import { testDatabase } from '../utils/testDatabase';
import { testApp } from '../utils/testApp';
import { mockAIServices } from '../utils/mockAIServices';
import { testContentGenerator } from '../utils/testContentGenerator';

describe('End-to-End System Validation', () => {
  let testAppInstance: any;
  let authToken: string;
  let moderatorToken: string;

  beforeAll(async () => {
    // Initialize test environment
    testAppInstance = await testApp.initialize();
    await testDatabase.setup();
    await mockAIServices.initialize();

    // Create test users and get auth tokens
    const userResponse = await request(testAppInstance)
      .post('/api/auth/register')
      .send({
        email: 'testuser@example.com',
        password: 'testpassword123',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

    authToken = userResponse.body.token;

    const moderatorResponse = await request(testAppInstance)
      .post('/api/auth/register')
      .send({
        email: 'moderator@example.com',
        password: 'moderatorpass123',
        walletAddress: '0x0987654321098765432109876543210987654321',
        role: 'moderator'
      });

    moderatorToken = moderatorResponse.body.token;
  });

  afterAll(async () => {
    await testDatabase.cleanup();
    await mockAIServices.cleanup();
    await testApp.cleanup();
  });

  describe('Complete Moderation Pipeline', () => {
    test('should process text content through full pipeline', async () => {
      // 1. Submit content for moderation
      const contentSubmission = await request(testAppInstance)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'post',
          content: 'This is a test post with some content to moderate',
          metadata: { source: 'web' }
        });

      expect(contentSubmission.status).toBe(200);
      expect(contentSubmission.body.submissionId).toBeDefined();
      const submissionId = contentSubmission.body.submissionId;

      // 2. Wait for AI processing (with timeout)
      let moderationResult;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (attempts < maxAttempts) {
        const statusCheck = await request(testAppInstance)
          .get(`/api/moderation/${submissionId}`)
          .set('Authorization', `Bearer ${authToken}`);

        if (statusCheck.body.status !== 'pending') {
          moderationResult = statusCheck.body;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      expect(moderationResult).toBeDefined();
      expect(['allowed', 'quarantined', 'blocked']).toContain(moderationResult.status);

      // 3. Verify evidence storage
      if (moderationResult.status !== 'allowed') {
        const evidenceCheck = await request(testAppInstance)
          .get(`/api/moderation/${submissionId}/evidence`)
          .set('Authorization', `Bearer ${moderatorToken}`);

        expect(evidenceCheck.status).toBe(200);
        expect(evidenceCheck.body.evidenceCid).toBeDefined();
      }

      // 4. Test appeal process if content was blocked
      if (moderationResult.status === 'blocked') {
        const appealSubmission = await request(testAppInstance)
          .post('/api/appeals')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            caseId: moderationResult.caseId,
            stakeAmount: '100',
            reasoning: 'This content was incorrectly flagged'
          });

        expect(appealSubmission.status).toBe(200);
        expect(appealSubmission.body.appealId).toBeDefined();
      }
    });

    test('should process image content through full pipeline', async () => {
      // Generate test image content
      const imageBuffer = testContentGenerator.generateTestImage();

      const contentSubmission = await request(testAppInstance)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('media', imageBuffer, 'test-image.jpg')
        .field('type', 'post')
        .field('content', 'Check out this image!');

      expect(contentSubmission.status).toBe(200);
      const submissionId = contentSubmission.body.submissionId;

      // Wait for processing (images take longer)
      let moderationResult;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds for image processing

      while (attempts < maxAttempts) {
        const statusCheck = await request(testAppInstance)
          .get(`/api/moderation/${submissionId}`)
          .set('Authorization', `Bearer ${authToken}`);

        if (statusCheck.body.status !== 'pending') {
          moderationResult = statusCheck.body;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      expect(moderationResult).toBeDefined();
      expect(['allowed', 'quarantined', 'blocked']).toContain(moderationResult.status);
    });

    test('should handle marketplace listing moderation', async () => {
      const listingSubmission = await request(testAppInstance)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'listing',
          content: 'Rare NFT for sale - authentic Bored Ape',
          metadata: {
            price: '10 ETH',
            category: 'nft',
            contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D'
          }
        });

      expect(listingSubmission.status).toBe(200);
      const submissionId = listingSubmission.body.submissionId;

      // Marketplace content should trigger enhanced verification
      const statusCheck = await request(testAppInstance)
        .get(`/api/moderation/${submissionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should either be processed or require additional verification
      expect(['allowed', 'quarantined', 'blocked', 'verification_required']).toContain(
        statusCheck.body.status
      );
    });
  });

  describe('Human Moderation Workflow', () => {
    test('should handle human review queue workflow', async () => {
      // 1. Submit content that requires human review
      const contentSubmission = await request(testAppInstance)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'post',
          content: testContentGenerator.generateAmbiguousContent()
        });

      const submissionId = contentSubmission.body.submissionId;

      // 2. Wait for AI processing to route to human review
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 3. Check moderator queue
      const queueCheck = await request(testAppInstance)
        .get('/api/moderation/queue')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(queueCheck.status).toBe(200);
      expect(queueCheck.body.cases).toBeDefined();

      // 4. Find our case in the queue
      const ourCase = queueCheck.body.cases.find((c: any) => 
        c.contentId === submissionId
      );

      if (ourCase) {
        // 5. Make moderator decision
        const moderatorDecision = await request(testAppInstance)
          .post(`/api/moderation/decision`)
          .set('Authorization', `Bearer ${moderatorToken}`)
          .send({
            caseId: ourCase.id,
            decision: 'allow',
            reasoning: 'Content is acceptable after human review'
          });

        expect(moderatorDecision.status).toBe(200);

        // 6. Verify decision was applied
        const finalStatus = await request(testAppInstance)
          .get(`/api/moderation/${submissionId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(finalStatus.body.status).toBe('allowed');
      }
    });
  });

  describe('Community Reporting System', () => {
    test('should handle community report workflow', async () => {
      // 1. Submit and approve content
      const contentSubmission = await request(testAppInstance)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'post',
          content: 'This content will be reported by community'
        });

      const submissionId = contentSubmission.body.submissionId;
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 2. Create another user to report the content
      const reporterResponse = await request(testAppInstance)
        .post('/api/auth/register')
        .send({
          email: 'reporter@example.com',
          password: 'reporterpass123',
          walletAddress: '0x1111111111111111111111111111111111111111'
        });

      const reporterToken = reporterResponse.body.token;

      // 3. Submit community report
      const reportSubmission = await request(testAppInstance)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          contentId: submissionId,
          reason: 'spam',
          details: 'This content appears to be spam'
        });

      expect(reportSubmission.status).toBe(200);
      expect(reportSubmission.body.reportId).toBeDefined();

      // 4. Check if content was escalated for review
      const escalationCheck = await request(testAppInstance)
        .get(`/api/moderation/${submissionId}`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      // Content might be escalated to review based on report
      expect(['allowed', 'quarantined', 'under_review']).toContain(
        escalationCheck.body.status
      );
    });
  });

  describe('Feature Flag Integration', () => {
    test('should respect feature flag settings', async () => {
      // 1. Disable AI moderation via feature flag
      await request(testAppInstance)
        .put('/api/admin/flags/ai_moderation_enabled')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          enabled: false,
          rolloutPercentage: 0
        });

      // 2. Submit content
      const contentSubmission = await request(testAppInstance)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'post',
          content: 'This should bypass AI moderation'
        });

      expect(contentSubmission.status).toBe(200);
      const submissionId = contentSubmission.body.submissionId;

      // 3. Check that content was processed without AI
      const statusCheck = await request(testAppInstance)
        .get(`/api/moderation/${submissionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should be allowed immediately or routed to human review
      expect(['allowed', 'quarantined']).toContain(statusCheck.body.status);

      // 4. Re-enable AI moderation
      await request(testAppInstance)
        .put('/api/admin/flags/ai_moderation_enabled')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          enabled: true,
          rolloutPercentage: 100
        });
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent content submissions', async () => {
      const concurrentRequests = 10;
      const submissions = [];

      // Submit multiple pieces of content concurrently
      for (let i = 0; i < concurrentRequests; i++) {
        const submission = request(testAppInstance)
          .post('/api/content')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'post',
            content: `Concurrent test content ${i}`
          });
        
        submissions.push(submission);
      }

      const results = await Promise.all(submissions);

      // All submissions should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.submissionId).toBeDefined();
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check that all content was processed
      for (const result of results) {
        const statusCheck = await request(testAppInstance)
          .get(`/api/moderation/${result.body.submissionId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(['allowed', 'quarantined', 'blocked']).toContain(
          statusCheck.body.status
        );
      }
    });

    test('should handle vendor API failures gracefully', async () => {
      // 1. Simulate vendor API failure
      mockAIServices.simulateFailure('openai', true);

      // 2. Submit content
      const contentSubmission = await request(testAppInstance)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'post',
          content: 'This should be processed despite vendor failure'
        });

      expect(contentSubmission.status).toBe(200);
      const submissionId = contentSubmission.body.submissionId;

      // 3. Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 4. Check that content was still processed (fallback mode)
      const statusCheck = await request(testAppInstance)
        .get(`/api/moderation/${submissionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(['allowed', 'quarantined', 'blocked']).toContain(
        statusCheck.body.status
      );

      // 5. Restore vendor API
      mockAIServices.simulateFailure('openai', false);
    });
  });

  describe('Data Integrity and Audit', () => {
    test('should maintain audit trail for all decisions', async () => {
      // 1. Submit content
      const contentSubmission = await request(testAppInstance)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'post',
          content: 'Content for audit trail test'
        });

      const submissionId = contentSubmission.body.submissionId;
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 2. Check audit trail
      const auditTrail = await request(testAppInstance)
        .get(`/api/moderation/${submissionId}/audit`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(auditTrail.status).toBe(200);
      expect(auditTrail.body.events).toBeDefined();
      expect(auditTrail.body.events.length).toBeGreaterThan(0);

      // Verify audit events have required fields
      auditTrail.body.events.forEach((event: any) => {
        expect(event.timestamp).toBeDefined();
        expect(event.action).toBeDefined();
        expect(event.actor).toBeDefined();
      });
    });

    test('should store evidence immutably', async () => {
      // 1. Submit content that will be blocked
      const contentSubmission = await request(testAppInstance)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'post',
          content: testContentGenerator.generateViolatingContent()
        });

      const submissionId = contentSubmission.body.submissionId;
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 2. Get moderation result
      const moderationResult = await request(testAppInstance)
        .get(`/api/moderation/${submissionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (moderationResult.body.status === 'blocked') {
        // 3. Verify evidence is stored
        const evidenceCheck = await request(testAppInstance)
          .get(`/api/moderation/${submissionId}/evidence`)
          .set('Authorization', `Bearer ${moderatorToken}`);

        expect(evidenceCheck.status).toBe(200);
        expect(evidenceCheck.body.evidenceCid).toBeDefined();
        expect(evidenceCheck.body.evidenceCid).toMatch(/^Qm[a-zA-Z0-9]{44}$/); // IPFS CID format

        // 4. Verify evidence is immutable (same CID on repeated requests)
        const evidenceCheck2 = await request(testAppInstance)
          .get(`/api/moderation/${submissionId}/evidence`)
          .set('Authorization', `Bearer ${moderatorToken}`);

        expect(evidenceCheck2.body.evidenceCid).toBe(evidenceCheck.body.evidenceCid);
      }
    });
  });

  describe('System Health and Monitoring', () => {
    test('should provide comprehensive health status', async () => {
      const healthCheck = await request(testAppInstance)
        .get('/health');

      expect(healthCheck.status).toBe(200);
      expect(healthCheck.body.status).toBe('healthy');
      expect(healthCheck.body.checks).toBeDefined();

      // Verify all critical components are checked
      const checkNames = healthCheck.body.checks.map((c: any) => c.name);
      expect(checkNames).toContain('database');
      expect(checkNames).toContain('redis');
      expect(checkNames).toContain('openai');
      expect(checkNames).toContain('google_vision');
    });

    test('should expose metrics for monitoring', async () => {
      const metricsCheck = await request(testAppInstance)
        .get('/metrics');

      expect(metricsCheck.status).toBe(200);
      expect(metricsCheck.text).toContain('moderation_requests_total');
      expect(metricsCheck.text).toContain('moderation_request_duration_seconds');
      expect(metricsCheck.text).toContain('moderation_queue_size');
    });
  });

  describe('Security and Privacy', () => {
    test('should protect PII in content', async () => {
      // 1. Submit content with PII
      const contentWithPII = await request(testAppInstance)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'post',
          content: 'My phone number is 555-123-4567 and email is user@example.com'
        });

      const submissionId = contentWithPII.body.submissionId;
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 2. Check that PII was detected and handled
      const piiCheck = await request(testAppInstance)
        .get(`/api/moderation/${submissionId}/pii`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(piiCheck.status).toBe(200);
      if (piiCheck.body.piiDetected) {
        expect(piiCheck.body.redactedContent).toBeDefined();
        expect(piiCheck.body.redactedContent).not.toContain('555-123-4567');
        expect(piiCheck.body.redactedContent).not.toContain('user@example.com');
      }
    });

    test('should enforce rate limiting', async () => {
      const requests = [];
      const rateLimitTest = 20; // Exceed rate limit

      // Submit many requests quickly
      for (let i = 0; i < rateLimitTest; i++) {
        const request_promise = request(testAppInstance)
          .post('/api/content')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'post',
            content: `Rate limit test ${i}`
          });
        
        requests.push(request_promise);
      }

      const results = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimitedRequests = results.filter(
        result => result.status === 'fulfilled' && 
        (result.value as any).status === 429
      );

      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });
  });
});

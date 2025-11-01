/**
 * End-to-End Moderation Pipeline Integration Tests
 * Tests the complete flow from content submission to final decision
 */

import request from 'supertest';
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { Express } from 'express';
import { createTestApp } from '../../utils/testApp';
import { TestDatabase } from '../../utils/testDatabase';
import { MockAIServices } from '../../utils/mockAIServices';
import { TestContentGenerator } from '../../utils/testContentGenerator';

describe('End-to-End Moderation Pipeline', () => {
  let app: Express;
  let testDb: TestDatabase;
  let mockAI: MockAIServices;
  let contentGenerator: TestContentGenerator;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
    
    mockAI = new MockAIServices();
    await mockAI.setup();
    
    app = createTestApp({
      database: testDb.getConnection(),
      aiServices: mockAI.getServices()
    });
    
    contentGenerator = new TestContentGenerator();
  });

  afterAll(async () => {
    await mockAI.cleanup();
    await testDb.cleanup();
  });

  beforeEach(async () => {
    await testDb.reset();
    mockAI.reset();
  });

  describe('Text Content Moderation Flow', () => {
    it('should auto-approve safe content with high confidence', async () => {
      const safeContent = contentGenerator.generateSafeText();
      mockAI.setTextModerationResponse({
        confidence: 0.98,
        categories: ['safe'],
        action: 'allow'
      });

      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: safeContent,
          userId: 'test-user-1'
        })
        .expect(200);

      expect(response.body.status).toBe('approved');
      
      // Verify moderation case was created
      const moderationCase = await testDb.getModerationCase(response.body.contentId);
      expect(moderationCase.status).toBe('allowed');
      expect(moderationCase.confidence).toBeGreaterThan(0.95);
    });

    it('should auto-block harmful content with high confidence', async () => {
      const harmfulContent = contentGenerator.generateHarmfulText();
      mockAI.setTextModerationResponse({
        confidence: 0.97,
        categories: ['harassment', 'hate'],
        action: 'block'
      });

      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: harmfulContent,
          userId: 'test-user-1'
        })
        .expect(200);

      expect(response.body.status).toBe('rejected');
      
      const moderationCase = await testDb.getModerationCase(response.body.contentId);
      expect(moderationCase.status).toBe('blocked');
      expect(moderationCase.reasonCode).toContain('harassment');
    });

    it('should queue uncertain content for human review', async () => {
      const uncertainContent = contentGenerator.generateUncertainText();
      mockAI.setTextModerationResponse({
        confidence: 0.75,
        categories: ['potentially_harmful'],
        action: 'review'
      });

      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: uncertainContent,
          userId: 'test-user-1'
        })
        .expect(200);

      expect(response.body.status).toBe('pending');
      
      const moderationCase = await testDb.getModerationCase(response.body.contentId);
      expect(moderationCase.status).toBe('quarantined');
      
      // Verify it's in the review queue
      const queueItem = await testDb.getReviewQueueItem(response.body.contentId);
      expect(queueItem).toBeDefined();
    });
  });

  describe('Image Content Moderation Flow', () => {
    it('should process image content through vision APIs', async () => {
      const imageBuffer = contentGenerator.generateTestImage();
      mockAI.setImageModerationResponse({
        confidence: 0.92,
        categories: ['safe'],
        action: 'allow'
      });

      const response = await request(app)
        .post('/api/content')
        .field('type', 'post')
        .field('userId', 'test-user-1')
        .attach('media', imageBuffer, 'test.jpg')
        .expect(200);

      expect(response.body.status).toBe('approved');
      
      const moderationCase = await testDb.getModerationCase(response.body.contentId);
      expect(moderationCase.vendorScores).toHaveProperty('google_vision');
    });

    it('should detect NSFW content in images', async () => {
      const nsfwImage = contentGenerator.generateNSFWImage();
      mockAI.setImageModerationResponse({
        confidence: 0.94,
        categories: ['adult', 'explicit'],
        action: 'block'
      });

      const response = await request(app)
        .post('/api/content')
        .field('type', 'post')
        .field('userId', 'test-user-1')
        .attach('media', nsfwImage, 'nsfw.jpg')
        .expect(200);

      expect(response.body.status).toBe('rejected');
    });
  });

  describe('Link Safety Integration', () => {
    it('should detect malicious URLs', async () => {
      const maliciousContent = contentGenerator.generateContentWithMaliciousLink();
      mockAI.setLinkSafetyResponse({
        confidence: 0.96,
        categories: ['malware', 'phishing'],
        action: 'block'
      });

      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: maliciousContent,
          userId: 'test-user-1'
        })
        .expect(200);

      expect(response.body.status).toBe('rejected');
    });
  });

  describe('Reputation-Based Thresholds', () => {
    it('should apply stricter thresholds for low-reputation users', async () => {
      const borderlineContent = contentGenerator.generateBorderlineText();
      mockAI.setTextModerationResponse({
        confidence: 0.72,
        categories: ['potentially_harmful'],
        action: 'review'
      });

      // Low reputation user
      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: borderlineContent,
          userId: 'low-rep-user'
        })
        .expect(200);

      expect(response.body.status).toBe('pending');
    });

    it('should apply lenient thresholds for high-reputation users', async () => {
      const borderlineContent = contentGenerator.generateBorderlineText();
      mockAI.setTextModerationResponse({
        confidence: 0.72,
        categories: ['potentially_harmful'],
        action: 'allow'
      });

      // High reputation user
      const response = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: borderlineContent,
          userId: 'high-rep-user'
        })
        .expect(200);

      expect(response.body.status).toBe('approved');
    });
  });

  describe('Appeals Process Integration', () => {
    it('should handle complete appeal workflow', async () => {
      // First, create blocked content
      const content = contentGenerator.generateControversialText();
      mockAI.setTextModerationResponse({
        confidence: 0.89,
        categories: ['harassment'],
        action: 'block'
      });

      const contentResponse = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: content,
          userId: 'test-user-1'
        })
        .expect(200);

      expect(contentResponse.body.status).toBe('rejected');

      // Submit appeal
      const appealResponse = await request(app)
        .post('/api/appeals')
        .send({
          contentId: contentResponse.body.contentId,
          stakeAmount: '100',
          reasoning: 'This content was misclassified'
        })
        .expect(200);

      expect(appealResponse.body.appealId).toBeDefined();

      // Verify appeal was created
      const appeal = await testDb.getAppeal(appealResponse.body.appealId);
      expect(appeal.status).toBe('open');
    });
  });

  describe('Community Reporting Integration', () => {
    it('should escalate content based on weighted reports', async () => {
      // Create approved content
      const content = contentGenerator.generateSafeText();
      mockAI.setTextModerationResponse({
        confidence: 0.85,
        categories: ['safe'],
        action: 'allow'
      });

      const contentResponse = await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: content,
          userId: 'test-user-1'
        })
        .expect(200);

      // Submit multiple weighted reports
      await request(app)
        .post('/api/reports')
        .send({
          contentId: contentResponse.body.contentId,
          reason: 'harassment',
          reporterId: 'high-rep-reporter'
        })
        .expect(200);

      await request(app)
        .post('/api/reports')
        .send({
          contentId: contentResponse.body.contentId,
          reason: 'harassment',
          reporterId: 'medium-rep-reporter'
        })
        .expect(200);

      // Check if content was escalated to review
      const moderationCase = await testDb.getModerationCase(contentResponse.body.contentId);
      expect(moderationCase.status).toBe('quarantined');
    });
  });

  describe('Performance Requirements', () => {
    it('should process text content within 3 seconds', async () => {
      const content = contentGenerator.generateSafeText();
      mockAI.setTextModerationResponse({
        confidence: 0.95,
        categories: ['safe'],
        action: 'allow'
      });

      const startTime = Date.now();
      
      await request(app)
        .post('/api/content')
        .send({
          type: 'post',
          content: content,
          userId: 'test-user-1'
        })
        .expect(200);

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(3000);
    });

    it('should process image content within 30 seconds', async () => {
      const imageBuffer = contentGenerator.generateTestImage();
      mockAI.setImageModerationResponse({
        confidence: 0.92,
        categories: ['safe'],
        action: 'allow'
      });

      const startTime = Date.now();
      
      await request(app)
        .post('/api/content')
        .field('type', 'post')
        .field('userId', 'test-user-1')
        .attach('media', imageBuffer, 'test.jpg')
        .expect(200);

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(30000);
    });
  });
});

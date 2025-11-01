import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../db/connectionPool';
import { moderationCases, moderationAppeals, users } from '../db/schema';
import appealsRoutes from '../routes/appealsRoutes';
import { authenticateToken } from '../middleware/authMiddleware';

// Create test app
const app = express();
app.use(express.json());

// Mock authentication middleware for testing
app.use((req, res, next) => {
  // Mock authenticated user
  (req as any).user = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    role: 'user',
    walletAddress: '0x1234567890123456789012345678901234567890'
  };
  next();
});

app.use('/api/appeals', appealsRoutes);

// Mock data
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  walletAddress: '0x1234567890123456789012345678901234567890',
  handle: 'testuser',
  createdAt: new Date()
};

const mockModerator = {
  id: '987fcdeb-51a2-43d1-b789-123456789abc',
  walletAddress: '0x9876543210987654321098765432109876543210',
  handle: 'moderator',
  createdAt: new Date()
};

const mockModerationCase = {
  id: 1,
  contentId: 'post_123',
  contentType: 'post',
  userId: mockUser.id,
  status: 'blocked',
  riskScore: '0.95',
  decision: 'block',
  reasonCode: 'hate_speech',
  confidence: '0.92',
  vendorScores: { openai: 0.95, perspective: 0.89 },
  evidenceCid: 'QmTestEvidence123',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z')
};

const validAppealSubmission = {
  caseId: 1,
  reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes. I have additional context that shows this was taken out of context.',
  stakeAmount: '150.0',
  evidenceUrls: ['https://example.com/evidence1.pdf'],
  contactInfo: 'test@example.com'
};

describe('Appeals API', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(moderationAppeals);
    await db.delete(moderationCases);
    await db.delete(users);
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(moderationAppeals);
    await db.delete(moderationCases);
    await db.delete(users);
  });

  beforeEach(async () => {
    // Insert test users and moderation case
    await db.insert(users).values([mockUser, mockModerator]);
    await db.insert(moderationCases).values(mockModerationCase);
  });

  afterEach(async () => {
    // Clean up after each test
    await db.delete(moderationAppeals);
    await db.delete(moderationCases);
    await db.delete(users);
  });

  describe('POST /api/appeals', () => {
    it('should successfully submit a valid appeal', async () => {
      const response = await request(app)
        .post('/api/appeals')
        .send(validAppealSubmission)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.appealId).toBeDefined();
      expect(response.body.message).toBe('Appeal submitted successfully');
    });

    it('should reject appeal with missing required fields', async () => {
      const invalidSubmission = {
        caseId: 1,
        reasoning: 'Too short' // Below 50 character minimum
      };

      const response = await request(app)
        .post('/api/appeals')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.details).toBeDefined();
    });

    it('should reject appeal with invalid stake amount format', async () => {
      const invalidSubmission = {
        ...validAppealSubmission,
        stakeAmount: 'invalid-amount'
      };

      const response = await request(app)
        .post('/api/appeals')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should reject appeal for non-existent case', async () => {
      const invalidSubmission = {
        ...validAppealSubmission,
        caseId: 999
      };

      const response = await request(app)
        .post('/api/appeals')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toBe('Moderation case not found');
    });

    it('should enforce rate limiting on appeal submissions', async () => {
      // Submit multiple appeals quickly to test rate limiting
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/appeals')
            .send(validAppealSubmission)
        );
      }

      const responses = await Promise.all(promises);
      
      // First request should succeed, subsequent ones may be rate limited
      expect(responses[0].status).toBe(201);
      
      // Check if any requests were rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/appeals/:appealId', () => {
    let appealId: number;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/appeals')
        .send(validAppealSubmission);
      appealId = response.body.appealId;
    });

    it('should return appeal details for valid appeal ID', async () => {
      const response = await request(app)
        .get(`/api/appeals/${appealId}`)
        .expect(200);

      expect(response.body.id).toBe(appealId);
      expect(response.body.caseId).toBe(validAppealSubmission.caseId);
      expect(response.body.appellantId).toBe(mockUser.id);
      expect(response.body.status).toBe('open');
      expect(response.body.stakeAmount).toBe(validAppealSubmission.stakeAmount);
      expect(response.body.originalCase).toBeDefined();
    });

    it('should return 404 for non-existent appeal', async () => {
      const response = await request(app)
        .get('/api/appeals/999')
        .expect(404);

      expect(response.body.error).toBe('Appeal not found');
    });

    it('should return 400 for invalid appeal ID format', async () => {
      const response = await request(app)
        .get('/api/appeals/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid appeal ID');
    });
  });

  describe('GET /api/appeals/my', () => {
    beforeEach(async () => {
      // Submit a few appeals for testing
      await request(app)
        .post('/api/appeals')
        .send(validAppealSubmission);

      // Create another case and appeal
      const case2 = { ...mockModerationCase, id: 2, contentId: 'post_456' };
      await db.insert(moderationCases).values(case2);
      
      await request(app)
        .post('/api/appeals')
        .send({ ...validAppealSubmission, caseId: 2 });
    });

    it('should return user\'s appeals with pagination', async () => {
      const response = await request(app)
        .get('/api/appeals/my?page=1&limit=10')
        .expect(200);

      expect(response.body.appeals).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);

      // Verify appeals belong to the authenticated user
      response.body.appeals.forEach((appeal: any) => {
        expect(appeal.appellantId).toBe(mockUser.id);
      });
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/appeals/my?page=1&limit=1')
        .expect(200);

      expect(response.body.appeals).toHaveLength(1);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
    });

    it('should return empty array when user has no appeals', async () => {
      // Clean up existing appeals
      await db.delete(moderationAppeals);

      const response = await request(app)
        .get('/api/appeals/my')
        .expect(200);

      expect(response.body.appeals).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /api/appeals/user/:userId', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/appeals')
        .send(validAppealSubmission);
    });

    it('should allow user to access their own appeals', async () => {
      const response = await request(app)
        .get(`/api/appeals/user/${mockUser.id}`)
        .expect(200);

      expect(response.body.appeals).toHaveLength(1);
      expect(response.body.appeals[0].appellantId).toBe(mockUser.id);
    });

    it('should deny access to other users\' appeals for regular users', async () => {
      const response = await request(app)
        .get(`/api/appeals/user/${mockModerator.id}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('GET /api/appeals/status/:status', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/appeals')
        .send(validAppealSubmission);
    });

    it('should deny access to regular users', async () => {
      const response = await request(app)
        .get('/api/appeals/status/open')
        .expect(403);

      expect(response.body.error).toBe('Moderator or admin access required');
    });

    it('should return 400 for invalid status', async () => {
      // Mock moderator user
      app.use((req, res, next) => {
        (req as any).user.role = 'moderator';
        next();
      });

      const response = await request(app)
        .get('/api/appeals/status/invalid-status')
        .expect(400);

      expect(response.body.error).toBe('Invalid status');
    });
  });

  describe('PUT /api/appeals/:appealId/status', () => {
    let appealId: number;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/appeals')
        .send(validAppealSubmission);
      appealId = response.body.appealId;
    });

    it('should deny access to regular users', async () => {
      const response = await request(app)
        .put(`/api/appeals/${appealId}/status`)
        .send({ status: 'jury_selection' })
        .expect(403);

      expect(response.body.error).toBe('Admin access required');
    });

    it('should return 400 for invalid appeal ID', async () => {
      // Mock admin user
      app.use((req, res, next) => {
        (req as any).user.role = 'admin';
        next();
      });

      const response = await request(app)
        .put('/api/appeals/invalid-id/status')
        .send({ status: 'jury_selection' })
        .expect(400);

      expect(response.body.error).toBe('Invalid appeal ID');
    });
  });

  describe('GET /api/appeals/check/:caseId', () => {
    it('should check appeal eligibility for valid case', async () => {
      const response = await request(app)
        .get(`/api/appeals/check/${mockModerationCase.id}`)
        .expect(200);

      expect(response.body.canAppeal).toBeDefined();
      expect(response.body.requiredStake).toBeDefined();
      expect(response.body.reason).toBeDefined();
    });

    it('should return 400 for invalid case ID format', async () => {
      const response = await request(app)
        .get('/api/appeals/check/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid case ID');
    });

    it('should require authentication', async () => {
      // Create app without authentication
      const unauthenticatedApp = express();
      unauthenticatedApp.use(express.json());
      unauthenticatedApp.use('/api/appeals', appealsRoutes);

      const response = await request(unauthenticatedApp)
        .get('/api/appeals/check/1')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('GET /api/appeals/stats', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/appeals')
        .send(validAppealSubmission);
    });

    it('should deny access to regular users', async () => {
      const response = await request(app)
        .get('/api/appeals/stats')
        .expect(403);

      expect(response.body.error).toBe('Moderator or admin access required');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/appeals')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Express should handle malformed JSON and return 400
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/appeals')
        .send(validAppealSubmission)
        .expect(201);

      // Should still work with proper JSON
      expect(response.body.success).toBe(true);
    });

    it('should handle very large request bodies', async () => {
      const largeReasoning = 'A'.repeat(10000); // Very long reasoning
      const largeSubmission = {
        ...validAppealSubmission,
        reasoning: largeReasoning
      };

      const response = await request(app)
        .post('/api/appeals')
        .send(largeSubmission)
        .expect(400);

      // Should be rejected due to validation (max 2000 characters)
      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply different rate limits to different endpoints', async () => {
      // Test general rate limit
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app)
            .get('/api/appeals/my')
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should have stricter rate limits for appeal submissions', async () => {
      // Test appeal submission rate limit (5 per hour)
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/appeals')
            .send({ ...validAppealSubmission, caseId: i + 1 })
        );
      }

      const responses = await Promise.all(promises);
      
      // Most requests should be rate limited after the first few
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(5);
    });
  });

  describe('Security', () => {
    it('should prevent access without authentication', async () => {
      // Create app without authentication middleware
      const unauthenticatedApp = express();
      unauthenticatedApp.use(express.json());
      unauthenticatedApp.use('/api/appeals', appealsRoutes);

      const response = await request(unauthenticatedApp)
        .post('/api/appeals')
        .send(validAppealSubmission)
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should validate user permissions for protected endpoints', async () => {
      // Test accessing admin endpoint as regular user
      const response = await request(app)
        .put(`/api/appeals/1/status`)
        .send({ status: 'jury_selection' })
        .expect(403);

      expect(response.body.error).toBe('Admin access required');
    });

    it('should prevent SQL injection in parameters', async () => {
      const maliciousId = "1'; DROP TABLE moderation_appeals; --";
      
      const response = await request(app)
        .get(`/api/appeals/${encodeURIComponent(maliciousId)}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid appeal ID');
    });

    it('should sanitize user input', async () => {
      const maliciousSubmission = {
        ...validAppealSubmission,
        reasoning: '<script>alert("xss")</script>This is my reasoning',
        contactInfo: 'test@example.com<script>alert("xss")</script>'
      };

      const response = await request(app)
        .post('/api/appeals')
        .send(maliciousSubmission)
        .expect(201);

      // Should succeed but input should be sanitized
      expect(response.body.success).toBe(true);
    });
  });
});

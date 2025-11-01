import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import appealsRoutes from '../routes/appealsRoutes';
import { appealsService } from '../services/appealsService';

// Mock the appeals service
jest.mock('../services/appealsService');
const mockAppealsService = appealsService as jest.Mocked<typeof appealsService>;

// Create test app
const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  (req as any).user = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    role: 'user',
    walletAddress: '0x1234567890123456789012345678901234567890'
  };
  next();
});

app.use('/api/appeals', appealsRoutes);

describe('Appeals API - Basic Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/appeals', () => {
    it('should accept valid appeal submission', async () => {
      const validSubmission = {
        caseId: 1,
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: '150.0',
        evidenceUrls: ['https://example.com/evidence1.pdf'],
        contactInfo: 'test@example.com'
      };

      mockAppealsService.submitAppeal.mockResolvedValue({
        success: true,
        appealId: 1
      });

      const response = await request(app)
        .post('/api/appeals')
        .send(validSubmission)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.appealId).toBe(1);
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

    it('should handle service errors gracefully', async () => {
      const validSubmission = {
        caseId: 1,
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: '150.0'
      };

      mockAppealsService.submitAppeal.mockResolvedValue({
        success: false,
        error: 'Moderation case not found'
      });

      const response = await request(app)
        .post('/api/appeals')
        .send(validSubmission)
        .expect(400);

      expect(response.body.error).toBe('Moderation case not found');
    });
  });

  describe('GET /api/appeals/:appealId', () => {
    it('should return appeal details for valid ID', async () => {
      const mockAppeal = {
        id: 1,
        caseId: 1,
        appellantId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'open',
        stakeAmount: '150.0',
        createdAt: new Date(),
        originalCase: {
          id: 1,
          contentId: 'post_123',
          contentType: 'post',
          decision: 'block',
          reasonCode: 'hate_speech',
          confidence: 0.92
        }
      };

      mockAppealsService.getAppealCase.mockResolvedValue(mockAppeal);

      const response = await request(app)
        .get('/api/appeals/1')
        .expect(200);

      expect(response.body.id).toBe(1);
      expect(response.body.status).toBe('open');
      expect(response.body.originalCase).toBeDefined();
    });

    it('should return 404 for non-existent appeal', async () => {
      mockAppealsService.getAppealCase.mockResolvedValue(null);

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
    it('should return user\'s appeals with pagination', async () => {
      const mockAppeals = {
        appeals: [
          {
            id: 1,
            caseId: 1,
            appellantId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'open',
            stakeAmount: '150.0',
            createdAt: new Date()
          }
        ],
        total: 1,
        page: 1,
        limit: 20
      };

      mockAppealsService.getUserAppeals.mockResolvedValue(mockAppeals);

      const response = await request(app)
        .get('/api/appeals/my?page=1&limit=20')
        .expect(200);

      expect(response.body.appeals).toHaveLength(1);
      expect(response.body.total).toBe(1);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
    });

    it('should handle pagination parameters correctly', async () => {
      const mockAppeals = {
        appeals: [],
        total: 0,
        page: 2,
        limit: 10
      };

      mockAppealsService.getUserAppeals.mockResolvedValue(mockAppeals);

      const response = await request(app)
        .get('/api/appeals/my?page=2&limit=10')
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(10);
    });
  });

  describe('GET /api/appeals/check/:caseId', () => {
    it('should check appeal eligibility for valid case', async () => {
      const response = await request(app)
        .get('/api/appeals/check/1')
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
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Create app without authentication middleware
      const unauthenticatedApp = express();
      unauthenticatedApp.use(express.json());
      unauthenticatedApp.use('/api/appeals', appealsRoutes);

      const response = await request(unauthenticatedApp)
        .post('/api/appeals')
        .send({
          caseId: 1,
          reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
          stakeAmount: '150.0'
        })
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should deny access to admin endpoints for regular users', async () => {
      const response = await request(app)
        .put('/api/appeals/1/status')
        .send({ status: 'jury_selection' })
        .expect(403);

      expect(response.body.error).toBe('Admin access required');
    });

    it('should deny access to moderator endpoints for regular users', async () => {
      const response = await request(app)
        .get('/api/appeals/status/open')
        .expect(403);

      expect(response.body.error).toBe('Moderator or admin access required');
    });
  });

  describe('Input Validation', () => {
    it('should validate stake amount format', async () => {
      const invalidSubmission = {
        caseId: 1,
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: 'invalid-amount'
      };

      const response = await request(app)
        .post('/api/appeals')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should validate reasoning length', async () => {
      const invalidSubmission = {
        caseId: 1,
        reasoning: 'Too short',
        stakeAmount: '150.0'
      };

      const response = await request(app)
        .post('/api/appeals')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
    });

    it('should validate evidence URLs format', async () => {
      const invalidSubmission = {
        caseId: 1,
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: '150.0',
        evidenceUrls: ['not-a-valid-url']
      };

      const response = await request(app)
        .post('/api/appeals')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toBe('Invalid request data');
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

    it('should handle service errors gracefully', async () => {
      mockAppealsService.submitAppeal.mockRejectedValue(new Error('Database error'));

      const validSubmission = {
        caseId: 1,
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: '150.0'
      };

      const response = await request(app)
        .post('/api/appeals')
        .send(validSubmission)
        .expect(500);

      expect(response.body.error).toBe('Failed to submit appeal');
    });
  });
});

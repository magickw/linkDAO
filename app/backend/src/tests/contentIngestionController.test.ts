import request from 'supertest';
import express from 'express';
import { contentIngestionController } from '../controllers/contentIngestionController';
import { handleFileUploads, validateContent } from '../middleware/contentValidation';

// Mock dependencies
jest.mock('../services/contentModerationQueue', () => ({
  contentModerationQueue: {
    addToQueue: jest.fn().mockResolvedValue('job-123'),
    getQueueStats: jest.fn().mockResolvedValue({
      fastQueue: { waiting: 5, active: 2, completed: 100, failed: 3 },
      slowQueue: { waiting: 2, active: 1, completed: 50, failed: 1 }
    }),
    getJobStatus: jest.fn().mockResolvedValue({
      status: 'completed',
      progress: 100,
      result: {
        contentId: 'test-content-123',
        decision: 'allow',
        confidence: 0.1,
        categories: [],
        reasoning: 'No violations detected',
        vendorResults: [],
        processedAt: new Date()
      }
    })
  }
}));

jest.mock('../services/contentStagingService', () => ({
  contentStagingService: {
    validateContent: jest.fn().mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
      contentType: 'text',
      size: 100,
      hash: 'test-hash'
    }),
    stageContent: jest.fn().mockResolvedValue({
      id: 'staged-123',
      hash: 'test-hash',
      size: 100
    }),
    getStagingStats: jest.fn().mockResolvedValue({
      totalFiles: 10,
      totalSize: 1024000,
      oldestFile: new Date('2023-01-01'),
      newestFile: new Date()
    }),
    cleanupExpiredContent: jest.fn().mockResolvedValue(5)
  }
}));

jest.mock('../services/databaseService', () => ({
  databaseService: {
    createModerationCase: jest.fn().mockResolvedValue({
      id: 1,
      contentId: 'test-content-123',
      contentType: 'post',
      userId: 'user-123',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }),
    getModerationCaseByContentId: jest.fn().mockResolvedValue({
      id: 1,
      contentId: 'test-content-123',
      contentType: 'post',
      userId: 'user-123',
      status: 'allowed',
      decision: 'allow',
      confidence: 0.1,
      riskScore: 0.1,
      reasonCode: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }),
    updateModerationCase: jest.fn().mockResolvedValue({
      id: 1,
      status: 'pending'
    }),
    getUserModerationCases: jest.fn().mockResolvedValue([
      {
        contentId: 'test-content-123',
        contentType: 'post',
        status: 'allowed',
        decision: 'allow',
        confidence: 0.1,
        riskScore: 0.1,
        reasonCode: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])
  }
}));

describe('ContentIngestionController', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = {
        walletAddress: '0x123...',
        userId: 'user-123',
        permissions: []
      };
      (req.user as any).id = 'user-123';
      (req.user as any).reputation = 75;
      next();
    });

    // Mock validated content middleware
    app.use((req, res, next) => {
      if (req.method === 'POST' && req.path === '/submit') {
        req.validatedContent = {
          text: req.body.text,
          contentType: req.body.contentType,
          priority: 'fast',
          links: req.body.links || []
        };
      }
      next();
    });

    jest.clearAllMocks();
  });

  describe('POST /submit', () => {
    beforeEach(() => {
      app.post('/submit', contentIngestionController.submitContent);
    });

    it('should submit content for moderation successfully', async () => {
      const response = await request(app)
        .post('/submit')
        .send({
          text: 'This is a test post',
          contentType: 'post'
        });

      expect(response.status).toBe(202);
      expect(response.body.message).toBe('Content submitted for moderation');
      expect(response.body.data.contentId).toBeDefined();
      expect(response.body.data.jobId).toBe('job-123');
      expect(response.body.data.priority).toBe('fast');
      expect(response.body.data.status).toBe('pending');
    });

    it('should reject request without validated content', async () => {
      // Remove validated content middleware for this test
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, res, next) => {
        req.user = {
          walletAddress: '0x123...',
          userId: 'user-123',
          permissions: []
        };
        (req.user as any).id = 'user-123';
        (req.user as any).reputation = 75;
        next();
      });
      testApp.post('/submit', contentIngestionController.submitContent);

      const response = await request(testApp)
        .post('/submit')
        .send({
          text: 'This is a test post',
          contentType: 'post'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.code).toBe('INVALID_REQUEST');
    });

    it('should reject request without authentication', async () => {
      // Remove auth middleware for this test
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, res, next) => {
        req.validatedContent = {
          text: 'test',
          contentType: 'post',
          priority: 'fast'
        };
        next();
      });
      testApp.post('/submit', contentIngestionController.submitContent);

      const response = await request(testApp)
        .post('/submit')
        .send({
          text: 'This is a test post',
          contentType: 'post'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('GET /status/:contentId', () => {
    beforeEach(() => {
      app.get('/status/:contentId', contentIngestionController.getModerationStatus);
    });

    it('should return moderation status for valid content', async () => {
      const response = await request(app)
        .get('/status/test-content-123');

      expect(response.status).toBe(200);
      expect(response.body.data.contentId).toBe('test-content-123');
      expect(response.body.data.status).toBe('allowed');
      expect(response.body.data.decision).toBe('allow');
      expect(response.body.data.canAppeal).toBe(false);
    });

    it('should return 404 for non-existent content', async () => {
      const { databaseService } = require('../services/databaseService');
      databaseService.getModerationCaseByContentId.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/status/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Moderation case not found');
      expect(response.body.code).toBe('CASE_NOT_FOUND');
    });

    it('should deny access to other users content', async () => {
      const { databaseService } = require('../services/databaseService');
      databaseService.getModerationCaseByContentId.mockResolvedValueOnce({
        id: 1,
        contentId: 'other-content-123',
        userId: 'other-user-456', // Different user
        status: 'allowed'
      });

      const response = await request(app)
        .get('/status/other-content-123');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
      expect(response.body.code).toBe('ACCESS_DENIED');
    });

    it('should require authentication', async () => {
      // Remove auth middleware
      const testApp = express();
      testApp.use(express.json());
      testApp.get('/status/:contentId', contentIngestionController.getModerationStatus);

      const response = await request(testApp)
        .get('/status/test-content-123');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('GET /admin/stats', () => {
    beforeEach(() => {
      app.get('/admin/stats', contentIngestionController.getQueueStats);
    });

    it('should return queue stats for admin user', async () => {
      // Set admin permissions
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, res, next) => {
        req.user = {
          walletAddress: '0x123...',
          userId: 'admin-123',
          permissions: ['admin']
        };
        (req.user as any).id = 'admin-123';
        (req.user as any).reputation = 100;
        next();
      });
      testApp.get('/admin/stats', contentIngestionController.getQueueStats);

      const response = await request(testApp)
        .get('/admin/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.queues).toBeDefined();
      expect(response.body.data.staging).toBeDefined();
      expect(response.body.data.queues.fastQueue.waiting).toBe(5);
      expect(response.body.data.staging.totalFiles).toBe(10);
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/admin/stats');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
      expect(response.body.code).toBe('ADMIN_REQUIRED');
    });
  });

  describe('POST /retry/:contentId', () => {
    beforeEach(() => {
      app.post('/retry/:contentId', contentIngestionController.retryModeration);
    });

    it('should retry failed moderation', async () => {
      const { databaseService } = require('../services/databaseService');
      databaseService.getModerationCaseByContentId.mockResolvedValueOnce({
        id: 1,
        contentId: 'failed-content-123',
        contentType: 'post',
        userId: 'user-123',
        status: 'failed'
      });

      const response = await request(app)
        .post('/retry/failed-content-123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Moderation retry initiated');
      expect(response.body.data.contentId).toBe('failed-content-123');
      expect(response.body.data.jobId).toBe('job-123');
    });

    it('should reject retry for non-failed cases', async () => {
      const { databaseService } = require('../services/databaseService');
      databaseService.getModerationCaseByContentId.mockResolvedValueOnce({
        id: 1,
        contentId: 'success-content-123',
        contentType: 'post',
        userId: 'user-123',
        status: 'allowed'
      });

      const response = await request(app)
        .post('/retry/success-content-123');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Can only retry failed moderation cases');
      expect(response.body.code).toBe('INVALID_STATUS');
    });
  });

  describe('GET /history', () => {
    beforeEach(() => {
      app.get('/history', contentIngestionController.getModerationHistory);
    });

    it('should return user moderation history', async () => {
      const response = await request(app)
        .get('/history');

      expect(response.status).toBe(200);
      expect(response.body.data.cases).toHaveLength(1);
      expect(response.body.data.cases[0].contentId).toBe('test-content-123');
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/history?page=2&limit=10&status=allowed');

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should limit maximum page size', async () => {
      const response = await request(app)
        .get('/history?limit=200'); // Exceeds max of 100

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.limit).toBe(100);
    });
  });

  describe('POST /admin/cleanup', () => {
    beforeEach(() => {
      app.post('/admin/cleanup', contentIngestionController.cleanupStagedContent);
    });

    it('should cleanup staged content for admin', async () => {
      // Set admin permissions
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, res, next) => {
        req.user = {
          walletAddress: '0x123...',
          userId: 'admin-123',
          permissions: ['admin']
        };
        (req.user as any).id = 'admin-123';
        (req.user as any).reputation = 100;
        next();
      });
      testApp.post('/admin/cleanup', contentIngestionController.cleanupStagedContent);

      const response = await request(testApp)
        .post('/admin/cleanup');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Staged content cleanup completed');
      expect(response.body.data.cleanedFiles).toBe(5);
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .post('/admin/cleanup');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      app.post('/submit', contentIngestionController.submitContent);
    });

    it('should handle database errors gracefully', async () => {
      const { databaseService } = require('../services/databaseService');
      databaseService.createModerationCase.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/submit')
        .send({
          text: 'This is a test post',
          contentType: 'post'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to submit content for moderation');
      expect(response.body.code).toBe('SUBMISSION_FAILED');
    });

    it('should handle queue errors gracefully', async () => {
      const { contentModerationQueue } = require('../services/contentModerationQueue');
      contentModerationQueue.addToQueue.mockRejectedValueOnce(new Error('Queue error'));

      const response = await request(app)
        .post('/submit')
        .send({
          text: 'This is a test post',
          contentType: 'post'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to submit content for moderation');
    });
  });
});
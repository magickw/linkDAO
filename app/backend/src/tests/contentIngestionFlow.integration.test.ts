import request from 'supertest';
import express from 'express';
import { contentIngestionController } from '../controllers/contentIngestionController';
import { handleFileUploads, validateContent } from '../middleware/contentValidation';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
// Import after mocks
let contentStagingService: any;
let contentModerationQueue: any;
let databaseService: any;

// Mock external dependencies
jest.mock('bullmq');
jest.mock('ioredis');
jest.mock('fs/promises');

// Mock services
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
    })
  }
}));

jest.mock('../services/contentModerationQueue', () => ({
  contentModerationQueue: {
    addToQueue: jest.fn().mockResolvedValue('job-123'),
    getQueueStats: jest.fn().mockResolvedValue({
      fastQueue: { waiting: 0, active: 0, completed: 1, failed: 0 },
      slowQueue: { waiting: 0, active: 0, completed: 0, failed: 0 }
    })
  }
}));

jest.mock('../services/databaseService', () => ({
  databaseService: {
    createModerationCase: jest.fn().mockResolvedValue({
      id: 1,
      contentId: expect.any(String),
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
      riskScore: 0.05,
      reasonCode: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }
}));

describe('Content Ingestion Flow Integration', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Import services after mocks are set up
    const stagingModule = await import('../services/contentStagingService');
    const queueModule = await import('../services/contentModerationQueue');
    const dbModule = await import('../services/databaseService');
    
    contentStagingService = stagingModule.contentStagingService;
    contentModerationQueue = queueModule.contentModerationQueue;
    databaseService = dbModule.databaseService;
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        userId: 'user-123',
        permissions: []
      };
      (req.user as any).id = 'user-123';
      (req.user as any).reputation = 75;
      next();
    });

    // Setup routes
    app.post('/api/content/submit', 
      handleFileUploads, 
      validateContent, 
      contentIngestionController.submitContent
    );
    
    app.get('/api/content/status/:contentId', 
      contentIngestionController.getModerationStatus
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete content submission flow', () => {
    it('should handle text content submission end-to-end', async () => {
      // Mock database operations
      const mockModerationCase = {
        id: 1,
        contentId: expect.any(String),
        contentType: 'post',
        userId: 'user-123',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(databaseService, 'createModerationCase')
        .mockResolvedValue(mockModerationCase);
      
      jest.spyOn(contentModerationQueue, 'addToQueue')
        .mockResolvedValue('job-123');

      // Submit content
      const submitResponse = await request(app)
        .post('/api/content/submit')
        .send({
          text: 'This is a test post about blockchain technology',
          contentType: 'post'
        });

      expect(submitResponse.status).toBe(202);
      expect(submitResponse.body.data.contentId).toBeDefined();
      expect(submitResponse.body.data.jobId).toBe('job-123');
      expect(submitResponse.body.data.priority).toBe('fast');

      // Verify database was called
      expect(databaseService.createModerationCase).toHaveBeenCalledWith({
        contentId: expect.any(String),
        contentType: 'post',
        userId: 'user-123',
        status: 'pending',
        riskScore: 0,
        confidence: 0,
        vendorScores: {},
        evidenceCid: null
      });

      // Verify queue was called
      expect(contentModerationQueue.addToQueue).toHaveBeenCalledWith({
        contentId: expect.any(String),
        contentType: 'post',
        userId: 'user-123',
        priority: 'fast',
        content: {
          text: 'This is a test post about blockchain technology',
          mediaUrls: [],
          links: [],
          metadata: {
            stagedContent: undefined,
            fileCount: 0,
            textLength: 49,
            linkCount: 0
          }
        },
        userReputation: 75,
        walletAddress: '0x1234567890123456789012345678901234567890',
        submittedAt: expect.any(Date)
      });
    });

    it('should handle content with links', async () => {
      jest.spyOn(databaseService, 'createModerationCase')
        .mockResolvedValue({ id: 1 } as any);
      
      jest.spyOn(contentModerationQueue, 'addToQueue')
        .mockResolvedValue('job-124');

      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: 'Check out this amazing DeFi protocol',
          contentType: 'post',
          links: ['https://example-defi.com', 'https://docs.example.com']
        });

      expect(response.status).toBe(202);
      expect(response.body.data.priority).toBe('fast'); // Still fast for 2 links

      const queueCall = (contentModerationQueue.addToQueue as jest.Mock).mock.calls[0][0];
      expect(queueCall.content.links).toHaveLength(2);
      expect(queueCall.content.metadata.linkCount).toBe(2);
    });

    it('should use slow lane for long content', async () => {
      jest.spyOn(databaseService, 'createModerationCase')
        .mockResolvedValue({ id: 1 } as any);
      
      jest.spyOn(contentModerationQueue, 'addToQueue')
        .mockResolvedValue('job-125');

      const longText = 'This is a very long post about blockchain technology. '.repeat(30); // ~1500 chars

      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: longText,
          contentType: 'post'
        });

      expect(response.status).toBe(202);
      expect(response.body.data.priority).toBe('slow');

      const queueCall = (contentModerationQueue.addToQueue as jest.Mock).mock.calls[0][0];
      expect(queueCall.priority).toBe('slow');
    });

    it('should handle marketplace listing with enhanced validation', async () => {
      jest.spyOn(databaseService, 'createModerationCase')
        .mockResolvedValue({ id: 1 } as any);
      
      jest.spyOn(contentModerationQueue, 'addToQueue')
        .mockResolvedValue('job-126');

      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: 'Selling rare NFT collection - authentic Bored Ape',
          contentType: 'listing',
          links: ['https://opensea.io/collection/boredapeyachtclub']
        });

      expect(response.status).toBe(202);
      
      const queueCall = (contentModerationQueue.addToQueue as jest.Mock).mock.calls[0][0];
      expect(queueCall.contentType).toBe('listing');
    });
  });

  describe('Status checking flow', () => {
    it('should return status for existing content', async () => {
      const mockCase = {
        id: 1,
        contentId: 'test-content-123',
        contentType: 'post',
        userId: 'user-123',
        status: 'allowed',
        decision: 'allow',
        confidence: 0.1,
        riskScore: 0.05,
        reasonCode: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(databaseService, 'getModerationCaseByContentId')
        .mockResolvedValue(mockCase);

      jest.spyOn(contentModerationQueue, 'getQueueStats')
        .mockResolvedValue({
          fastQueue: { waiting: 0, active: 0, completed: 1, failed: 0 },
          slowQueue: { waiting: 0, active: 0, completed: 0, failed: 0 }
        });

      const response = await request(app)
        .get('/api/content/status/test-content-123');

      expect(response.status).toBe(200);
      expect(response.body.data.contentId).toBe('test-content-123');
      expect(response.body.data.status).toBe('allowed');
      expect(response.body.data.decision).toBe('allow');
      expect(response.body.data.canAppeal).toBe(false);
    });

    it('should show appeal option for blocked content', async () => {
      const mockCase = {
        id: 1,
        contentId: 'blocked-content-123',
        contentType: 'post',
        userId: 'user-123',
        status: 'blocked',
        decision: 'block',
        confidence: 0.95,
        riskScore: 0.9,
        reasonCode: 'SPAM_DETECTED',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(databaseService, 'getModerationCaseByContentId')
        .mockResolvedValue(mockCase);

      const response = await request(app)
        .get('/api/content/status/blocked-content-123');

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('blocked');
      expect(response.body.data.canAppeal).toBe(true);
      expect(response.body.data.reasonCode).toBe('SPAM_DETECTED');
    });
  });

  describe('Error scenarios', () => {
    it('should handle validation errors gracefully', async () => {
      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: '', // Empty text
          contentType: 'post'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Content cannot be empty');
      expect(response.body.code).toBe('EMPTY_CONTENT');
    });

    it('should handle invalid content types', async () => {
      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: 'Valid text',
          contentType: 'invalid-type'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid content type');
      expect(response.body.code).toBe('INVALID_CONTENT_TYPE');
    });

    it('should handle text that is too long', async () => {
      const tooLongText = 'x'.repeat(10001); // Exceeds post limit

      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: tooLongText,
          contentType: 'post'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('exceeds maximum length');
      expect(response.body.code).toBe('TEXT_TOO_LONG');
    });

    it('should handle invalid URLs', async () => {
      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: 'Check this out',
          contentType: 'post',
          links: ['not-a-valid-url']
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid URL format');
      expect(response.body.code).toBe('INVALID_URL_FORMAT');
    });

    it('should handle database errors during submission', async () => {
      jest.spyOn(databaseService, 'createModerationCase')
        .mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: 'This should fail',
          contentType: 'post'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to submit content for moderation');
      expect(response.body.code).toBe('SUBMISSION_FAILED');
    });

    it('should handle queue errors during submission', async () => {
      jest.spyOn(databaseService, 'createModerationCase')
        .mockResolvedValue({ id: 1 } as any);
      
      jest.spyOn(contentModerationQueue, 'addToQueue')
        .mockRejectedValue(new Error('Queue is full'));

      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: 'This should fail at queue',
          contentType: 'post'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to submit content for moderation');
    });
  });

  describe('Content type specific behavior', () => {
    beforeEach(() => {
      jest.spyOn(databaseService, 'createModerationCase')
        .mockResolvedValue({ id: 1 } as any);
      
      jest.spyOn(contentModerationQueue, 'addToQueue')
        .mockResolvedValue('job-test');
    });

    it('should handle username validation', async () => {
      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: 'validusername',
          contentType: 'username'
        });

      expect(response.status).toBe(202);
      
      const queueCall = (contentModerationQueue.addToQueue as jest.Mock).mock.calls[0][0];
      expect(queueCall.contentType).toBe('username');
    });

    it('should reject username that is too long', async () => {
      const longUsername = 'x'.repeat(51); // Exceeds 50 char limit

      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: longUsername,
          contentType: 'username'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('TEXT_TOO_LONG');
    });

    it('should handle DM content', async () => {
      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: 'Private message content',
          contentType: 'dm'
        });

      expect(response.status).toBe(202);
      
      const queueCall = (contentModerationQueue.addToQueue as jest.Mock).mock.calls[0][0];
      expect(queueCall.contentType).toBe('dm');
      expect(queueCall.priority).toBe('fast'); // DMs are fast lane
    });

    it('should handle comment content', async () => {
      const response = await request(app)
        .post('/api/content/submit')
        .send({
          text: 'This is a comment on the post',
          contentType: 'comment'
        });

      expect(response.status).toBe(202);
      
      const queueCall = (contentModerationQueue.addToQueue as jest.Mock).mock.calls[0][0];
      expect(queueCall.contentType).toBe('comment');
    });
  });

  describe('Performance and scalability', () => {
    it('should handle multiple concurrent submissions', async () => {
      jest.spyOn(databaseService, 'createModerationCase')
        .mockResolvedValue({ id: 1 } as any);
      
      jest.spyOn(contentModerationQueue, 'addToQueue')
        .mockResolvedValue('job-concurrent');

      const submissions = Array(10).fill(null).map((_, i) => 
        request(app)
          .post('/api/content/submit')
          .send({
            text: `Concurrent post ${i}`,
            contentType: 'post'
          })
      );

      const responses = await Promise.all(submissions);

      responses.forEach(response => {
        expect(response.status).toBe(202);
        expect(response.body.data.contentId).toBeDefined();
      });

      expect(databaseService.createModerationCase).toHaveBeenCalledTimes(10);
      expect(contentModerationQueue.addToQueue).toHaveBeenCalledTimes(10);
    });

    it('should generate unique content IDs for concurrent submissions', async () => {
      jest.spyOn(databaseService, 'createModerationCase')
        .mockResolvedValue({ id: 1 } as any);
      
      jest.spyOn(contentModerationQueue, 'addToQueue')
        .mockResolvedValue('job-unique');

      const submissions = Array(5).fill(null).map(() => 
        request(app)
          .post('/api/content/submit')
          .send({
            text: 'Same text content',
            contentType: 'post'
          })
      );

      const responses = await Promise.all(submissions);
      const contentIds = responses.map(r => r.body.data.contentId);

      // All content IDs should be unique
      const uniqueIds = new Set(contentIds);
      expect(uniqueIds.size).toBe(contentIds.length);
    });
  });
});
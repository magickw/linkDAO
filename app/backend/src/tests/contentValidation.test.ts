import request from 'supertest';
import express from 'express';
import { 
  handleFileUploads, 
  validateContent, 
  contentRateLimit,
  validateContentType,
  validateUserReputation 
} from '../middleware/contentValidation';

// Mock the content staging service
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

describe('Content Validation Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock user middleware
    app.use((req, res, next) => {
      req.user = {
        walletAddress: '0x123...',
        userId: 'user-123',
        permissions: []
      };
      // Add custom properties for testing
      (req.user as any).id = 'user-123';
      (req.user as any).reputation = 75;
      next();
    });
  });

  describe('validateContent middleware', () => {
    beforeEach(() => {
      app.post('/test', handleFileUploads, validateContent, (req, res) => {
        res.json({ success: true, validatedContent: req.validatedContent });
      });
    });

    it('should validate text content successfully', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          text: 'This is a test post',
          contentType: 'post'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.validatedContent.text).toBe('This is a test post');
      expect(response.body.validatedContent.contentType).toBe('post');
      expect(response.body.validatedContent.priority).toBe('fast');
    });

    it('should reject missing content type', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          text: 'This is a test post'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Content type is required');
      expect(response.body.code).toBe('MISSING_CONTENT_TYPE');
    });

    it('should reject invalid content type', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          text: 'This is a test post',
          contentType: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid content type');
      expect(response.body.code).toBe('INVALID_CONTENT_TYPE');
    });

    it('should reject empty content', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          contentType: 'post'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Content cannot be empty');
      expect(response.body.code).toBe('EMPTY_CONTENT');
    });

    it('should reject text that is too long', async () => {
      const longText = 'x'.repeat(10001); // Exceeds post limit of 10000
      
      const response = await request(app)
        .post('/test')
        .send({
          text: longText,
          contentType: 'post'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('exceeds maximum length');
      expect(response.body.code).toBe('TEXT_TOO_LONG');
    });

    it('should validate links array', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          text: 'Check out these links',
          contentType: 'post',
          links: ['https://example.com', 'https://test.com']
        });

      expect(response.status).toBe(200);
      expect(response.body.validatedContent.links).toHaveLength(2);
    });

    it('should reject invalid URLs', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          text: 'Check out this link',
          contentType: 'post',
          links: ['not-a-valid-url']
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid URL format');
      expect(response.body.code).toBe('INVALID_URL_FORMAT');
    });

    it('should reject too many links', async () => {
      const manyLinks = Array(11).fill('https://example.com');
      
      const response = await request(app)
        .post('/test')
        .send({
          text: 'Many links',
          contentType: 'post',
          links: manyLinks
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Maximum 10 links allowed per content');
      expect(response.body.code).toBe('TOO_MANY_LINKS');
    });

    it('should set slow priority for long text', async () => {
      const longText = 'x'.repeat(1500); // Over 1000 chars
      
      const response = await request(app)
        .post('/test')
        .send({
          text: longText,
          contentType: 'post'
        });

      expect(response.status).toBe(200);
      expect(response.body.validatedContent.priority).toBe('slow');
    });

    it('should set slow priority for many links', async () => {
      const manyLinks = ['https://example.com', 'https://test.com', 'https://demo.com', 'https://sample.com'];
      
      const response = await request(app)
        .post('/test')
        .send({
          text: 'Many links',
          contentType: 'post',
          links: manyLinks
        });

      expect(response.status).toBe(200);
      expect(response.body.validatedContent.priority).toBe('slow');
    });
  });

  describe('validateContentType middleware', () => {
    beforeEach(() => {
      app.post('/test-posts', 
        validateContentType(['post']), 
        (req, res) => res.json({ success: true })
      );
    });

    it('should allow valid content type', async () => {
      const response = await request(app)
        .post('/test-posts')
        .send({
          contentType: 'post',
          text: 'Test post'
        });

      expect(response.status).toBe(200);
    });

    it('should reject invalid content type', async () => {
      const response = await request(app)
        .post('/test-posts')
        .send({
          contentType: 'comment',
          text: 'Test comment'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not allowed for this endpoint');
      expect(response.body.code).toBe('CONTENT_TYPE_NOT_ALLOWED');
    });
  });

  describe('validateUserReputation middleware', () => {
    beforeEach(() => {
      app.post('/test-high-rep', 
        validateUserReputation(80), 
        (req, res) => res.json({ success: true })
      );
    });

    it('should allow user with sufficient reputation', async () => {
      // User has reputation 75, but we'll test with a user that has 85
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, res, next) => {
        req.user = {
          walletAddress: '0x123...',
          userId: 'user-123',
          permissions: []
        };
        (req.user as any).reputation = 85;
        next();
      });
      testApp.post('/test-high-rep', 
        validateUserReputation(80), 
        (req, res) => res.json({ success: true })
      );

      const response = await request(testApp)
        .post('/test-high-rep')
        .send({
          contentType: 'post',
          text: 'Test post'
        });

      expect(response.status).toBe(200);
    });

    it('should reject user with insufficient reputation', async () => {
      // Default user has reputation 75, requirement is 80
      const response = await request(app)
        .post('/test-high-rep')
        .send({
          contentType: 'post',
          text: 'Test post'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Minimum reputation');
      expect(response.body.code).toBe('INSUFFICIENT_REPUTATION');
    });
  });

  describe('contentRateLimit middleware', () => {
    beforeEach(() => {
      app.post('/test-rate-limit', 
        contentRateLimit, 
        (req, res) => res.json({ success: true })
      );
    });

    it('should allow authenticated user', async () => {
      const response = await request(app)
        .post('/test-rate-limit')
        .send({
          contentType: 'post',
          text: 'Test post'
        });

      expect(response.status).toBe(200);
    });

    it('should reject unauthenticated user', async () => {
      // Remove user from request
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, res, next) => {
        req.user = undefined;
        next();
      });
      testApp.post('/test-rate-limit', 
        contentRateLimit, 
        (req, res) => res.json({ success: true })
      );

      const response = await request(testApp)
        .post('/test-rate-limit')
        .send({
          contentType: 'post',
          text: 'Test post'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('content type specific limits', () => {
    beforeEach(() => {
      app.post('/test-limits', handleFileUploads, validateContent, (req, res) => {
        res.json({ success: true, validatedContent: req.validatedContent });
      });
    });

    it('should enforce username length limit', async () => {
      const longUsername = 'x'.repeat(51); // Exceeds 50 char limit
      
      const response = await request(app)
        .post('/test-limits')
        .send({
          text: longUsername,
          contentType: 'username'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('TEXT_TOO_LONG');
    });

    it('should enforce comment length limit', async () => {
      const longComment = 'x'.repeat(2001); // Exceeds 2000 char limit
      
      const response = await request(app)
        .post('/test-limits')
        .send({
          text: longComment,
          contentType: 'comment'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('TEXT_TOO_LONG');
    });

    it('should enforce DM length limit', async () => {
      const longDM = 'x'.repeat(1001); // Exceeds 1000 char limit
      
      const response = await request(app)
        .post('/test-limits')
        .send({
          text: longDM,
          contentType: 'dm'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('TEXT_TOO_LONG');
    });
  });
});
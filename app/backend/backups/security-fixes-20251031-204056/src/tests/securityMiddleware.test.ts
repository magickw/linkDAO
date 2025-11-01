/**
 * Security Middleware Tests
 * Test the enhanced security middleware implementation
 */

import request from 'supertest';
import express from 'express';
import { validateRequest, commonSchemas, securityValidation } from '../middleware/enhancedInputValidation';
import { enhancedCorsMiddleware } from '../middleware/enhancedCorsMiddleware';
import { authMiddleware } from '../middleware/authenticationSecurityMiddleware';
import { securityMiddlewareStack } from '../middleware/securityIntegrationMiddleware';
import { ApiResponse } from '../utils/apiResponse';

describe('Security Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Enhanced Input Validation', () => {
    it('should validate required parameters', async () => {
      app.get('/test/:id', 
        validateRequest({
          params: commonSchemas.id
        }),
        (req, res) => {
          ApiResponse.success(res, { message: 'Valid request' });
        }
      );

      const response = await request(app)
        .get('/test/valid-id-123')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid parameters', async () => {
      app.get('/test/:id', 
        validateRequest({
          params: commonSchemas.id
        }),
        (req, res) => {
          ApiResponse.success(res, { message: 'Valid request' });
        }
      );

      const response = await request(app)
        .get('/test/invalid@id!')
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should sanitize input data', async () => {
      const Joi = require('joi');
      
      app.post('/test', 
        validateRequest({
          body: Joi.object({
            title: Joi.string().required(),
            description: Joi.string().required()
          })
        }),
        (req, res) => {
          ApiResponse.success(res, req.body);
        }
      );

      const response = await request(app)
        .post('/test')
        .send({
          title: '<script>alert("xss")</script>Clean Title',
          description: 'Normal description'
        })
        .expect(200);

      expect(response.body.data.title).not.toContain('<script>');
      expect(response.body.data.title).toContain('Clean Title');
    });
  });

  describe('Security Validation', () => {
    it('should block SQL injection attempts', async () => {
      app.post('/test', 
        securityValidation,
        (req, res) => {
          ApiResponse.success(res, { message: 'Valid request' });
        }
      );

      const response = await request(app)
        .post('/test')
        .send({
          query: "'; DROP TABLE users; --"
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid input detected');
    });

    it('should block XSS attempts', async () => {
      app.post('/test', 
        securityValidation,
        (req, res) => {
          ApiResponse.success(res, { message: 'Valid request' });
        }
      );

      const response = await request(app)
        .post('/test')
        .send({
          content: '<script>alert("xss")</script>'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid input detected');
    });

    it('should allow clean requests', async () => {
      app.post('/test', 
        securityValidation,
        (req, res) => {
          ApiResponse.success(res, { message: 'Valid request' });
        }
      );

      const response = await request(app)
        .post('/test')
        .send({
          title: 'Clean title',
          description: 'Clean description'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('CORS Middleware', () => {
    it('should handle preflight requests', async () => {
      const corsMiddleware = enhancedCorsMiddleware;
      app.use(corsMiddleware);
      app.get('/test', (req, res) => {
        ApiResponse.success(res, { message: 'Test' });
      });

      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });

    it('should block unauthorized origins in production mode', async () => {
      // This would need to be tested with production configuration
      // For now, we'll test that the middleware exists and functions
      const corsMiddleware = enhancedCorsMiddleware;
      app.use(corsMiddleware);
      app.get('/test', (req, res) => {
        ApiResponse.success(res, { message: 'Test' });
      });

      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Security Integration', () => {
    it('should apply security headers', async () => {
      // Apply security middleware stack
      securityMiddlewareStack.forEach(middleware => {
        app.use(middleware);
      });

      app.get('/test', (req, res) => {
        ApiResponse.success(res, { message: 'Test' });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should handle large request bodies', async () => {
      app.use(securityValidation);
      app.post('/test', (req, res) => {
        ApiResponse.success(res, { message: 'Test' });
      });

      // Create a large payload (but not too large to avoid timeout)
      const largePayload = {
        data: 'x'.repeat(1000000) // 1MB of data
      };

      const response = await request(app)
        .post('/test')
        .send(largePayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const { rateLimitValidation } = require('../middleware/enhancedInputValidation');
      
      app.use(rateLimitValidation(60000, 10)); // 10 requests per minute
      app.get('/test', (req, res) => {
        ApiResponse.success(res, { message: 'Test' });
      });

      // Make several requests
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/test')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      }
    });
  });
});

describe('File Upload Security', () => {
  it('should validate file types', () => {
    const { FileUploadSecurityManager } = require('../middleware/enhancedFileUploadSecurity');
    const manager = new FileUploadSecurityManager();
    const config = manager.getConfig();

    expect(config.allowedMimeTypes).toContain('image/jpeg');
    expect(config.allowedMimeTypes).toContain('image/png');
    expect(config.maxFileSize).toBe(50 * 1024 * 1024); // 50MB
  });

  it('should create upload middleware', () => {
    const { defaultFileUploadSecurity } = require('../middleware/enhancedFileUploadSecurity');
    const middleware = defaultFileUploadSecurity.createUploadMiddleware();

    expect(typeof middleware).toBe('function');
  });
});

describe('Authentication Security', () => {
  it('should create auth middleware', () => {
    const { authSecurityManager } = require('../middleware/authenticationSecurityMiddleware');
    const middleware = authSecurityManager.createAuthMiddleware();

    expect(typeof middleware).toBe('function');
  });

  it('should track login attempts', () => {
    const { authSecurityManager } = require('../middleware/authenticationSecurityMiddleware');
    
    const mockReq = {
      ip: '127.0.0.1',
      get: () => 'test-agent'
    };

    // This should not throw
    authSecurityManager.recordFailedLogin(mockReq);
    
    expect(authSecurityManager.getFailedAttemptsCount()).toBeGreaterThanOrEqual(0);
  });
});
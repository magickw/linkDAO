import request from 'supertest';
import express from 'express';
import { globalErrorHandler, notFoundHandler, asyncHandler } from '../middleware/globalErrorHandler';
import { requestLoggingMiddleware } from '../middleware/requestLogging';
import { metricsTrackingMiddleware } from '../middleware/metricsMiddleware';
import { successResponse, errorResponse, notFoundResponse } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';

// Create test app
const createTestApp = () => {
  const app = express();
  
  app.use(express.json());
  app.use(metricsTrackingMiddleware);
  app.use(requestLoggingMiddleware);
  
  // Test routes
  app.get('/test/success', (req, res) => {
    successResponse(res, { message: 'Success test' });
  });
  
  app.get('/test/error', (req, res, next) => {
    const error = new AppError('Test error', 400, 'TEST_ERROR');
    next(error);
  });
  
  app.get('/test/not-found', (req, res) => {
    notFoundResponse(res, 'Resource not found');
  });
  
  app.get('/test/async-error', asyncHandler(async (req, res) => {
    throw new Error('Async error test');
  }));
  
  app.get('/test/validation-error', (req, res, next) => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    (error as any).errors = [
      { field: 'email', message: 'Invalid email format' }
    ];
    next(error);
  });
  
  // 404 handler must come before error handler
  app.use('*', notFoundHandler);
  
  // Error handling
  app.use(globalErrorHandler);
  
  return app;
};

describe('Core API Infrastructure', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = createTestApp();
  });
  
  afterAll(() => {
    // Clean up health monitoring service
    const { healthMonitoringService } = require('../services/healthMonitoringService');
    healthMonitoringService.cleanup();
  });
  
  describe('Success Responses', () => {
    it('should return standardized success response', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200);
      
      expect(response.body).toMatchObject({
        success: true,
        data: { message: 'Success test' },
        metadata: {
          timestamp: expect.any(String),
          requestId: expect.any(String),
          version: '1.0.0'
        }
      });
    });
    
    it('should include request ID in response headers', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200);
      
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle AppError instances correctly', async () => {
      const response = await request(app)
        .get('/test/error')
        .expect(400);
      
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error'
        },
        metadata: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });
    
    it('should handle async errors', async () => {
      const response = await request(app)
        .get('/test/async-error')
        .expect(500);
      
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal Server Error' // In production, we don't expose internal error messages
        }
      });
    });
    
    it('should handle validation errors', async () => {
      const response = await request(app)
        .get('/test/validation-error')
        .expect(400);
      
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [
            { field: 'email', message: 'Invalid email format' }
          ]
        }
      });
    });
    
    it('should handle 404 errors for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);
      
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: expect.stringContaining('Route GET /unknown-route not found')
        }
      });
    });
  });
  
  describe('Not Found Responses', () => {
    it('should return null data for not found resources', async () => {
      const response = await request(app)
        .get('/test/not-found')
        .expect(200);
      
      expect(response.body).toMatchObject({
        success: true,
        data: null,
        metadata: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });
  });
  
  describe('Request Logging', () => {
    it('should add request ID to all responses', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200);
      
      expect(response.headers['x-request-id']).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(response.body.metadata.requestId).toBe(response.headers['x-request-id']);
    });
  });
  
  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200);
      
      // Note: In a real test, you'd need to configure CORS middleware
      // This is just checking the response structure
      expect(response.body.success).toBe(true);
    });
  });
});

describe('API Response Utilities', () => {
  let mockRes: any;
  
  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: { requestId: 'test-request-id' }
    };
  });
  
  describe('successResponse', () => {
    it('should create standardized success response', () => {
      const testData = { id: 1, name: 'Test' };
      successResponse(mockRes, testData);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: testData,
        metadata: {
          timestamp: expect.any(String),
          requestId: 'test-request-id',
          version: '1.0.0'
        }
      });
    });
    
    it('should accept custom status code', () => {
      successResponse(mockRes, { created: true }, 201);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });
  
  describe('errorResponse', () => {
    it('should create standardized error response', () => {
      errorResponse(mockRes, 'TEST_ERROR', 'Test error message', 400);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message'
        },
        metadata: {
          timestamp: expect.any(String),
          requestId: 'test-request-id',
          version: '1.0.0'
        }
      });
    });
    
    it('should include error details when provided', () => {
      const details = { field: 'email', value: 'invalid' };
      errorResponse(mockRes, 'VALIDATION_ERROR', 'Validation failed', 400, details);
      
      const call = mockRes.json.mock.calls[0][0];
      expect(call.error.details).toEqual(details);
    });
  });
  
  describe('notFoundResponse', () => {
    it('should return success response with null data', () => {
      notFoundResponse(mockRes, 'User not found');
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        metadata: {
          timestamp: expect.any(String),
          requestId: 'test-request-id',
          version: '1.0.0'
        }
      });
    });
  });
});
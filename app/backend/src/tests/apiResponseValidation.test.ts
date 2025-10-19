import { Request, Response } from 'express';
import { ApiResponse, HTTP_STATUS } from '../utils/apiResponse';
import { validateRequest, marketplaceSchemas, authSchemas } from '../middleware/joiValidation';
import { paginationUtils } from '../utils/pagination';
import { InputSanitizer, SANITIZATION_CONFIGS } from '../utils/sanitizer';

// Mock Express Response
const createMockResponse = (): Partial<Response> => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    locals: { requestId: 'test-request-id' }
  };
  return res;
};

// Mock Express Request
const createMockRequest = (data: any = {}): Partial<Request> => {
  return {
    body: data.body || {},
    query: data.query || {},
    params: data.params || {},
    ...data
  };
};

describe('API Response Standardization and Validation', () => {
  describe('ApiResponse Utility', () => {
    let mockRes: Partial<Response>;

    beforeEach(() => {
      mockRes = createMockResponse();
    });

    test('should create successful response with data', () => {
      const testData = { id: '123', name: 'Test Product' };
      
      ApiResponse.success(mockRes as Response, testData);
      
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: testData,
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: 'test-request-id',
          version: '1.0.0'
        })
      });
    });

    test('should create error response with proper format', () => {
      ApiResponse.badRequest(mockRes as Response, 'Invalid input', { field: 'email' });
      
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid input',
          details: { field: 'email' }
        },
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: 'test-request-id',
          version: '1.0.0'
        })
      });
    });

    test('should create paginated response', () => {
      const testData = [{ id: '1' }, { id: '2' }];
      const pagination = {
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNext: true,
        hasPrev: false
      };
      
      ApiResponse.success(mockRes as Response, testData, HTTP_STATUS.OK, pagination);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: testData,
        metadata: expect.objectContaining({
          pagination,
          timestamp: expect.any(String),
          requestId: 'test-request-id',
          version: '1.0.0'
        })
      });
    });
  });

  describe('Joi Validation Middleware', () => {
    test('should validate marketplace listing creation', async () => {
      const mockReq = createMockRequest({
        body: {
          title: 'Test Product',
          description: 'A test product description',
          category: 'electronics',
          price: {
            amount: 100.50,
            currency: 'ETH'
          },
          images: ['https://example.com/image1.jpg'],
          isDigital: false,
          inventory: 10
        }
      });
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      const middleware = validateRequest(marketplaceSchemas.createListing);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject invalid marketplace listing', async () => {
      const mockReq = createMockRequest({
        body: {
          title: '', // Invalid: empty title
          description: 'A test product description',
          category: 'invalid-category', // Invalid category
          price: {
            amount: -10, // Invalid: negative price
            currency: 'INVALID'
          },
          images: [], // Invalid: no images
          isDigital: false,
          inventory: 0 // Invalid: zero inventory for physical item
        }
      });
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      const middleware = validateRequest(marketplaceSchemas.createListing);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: expect.objectContaining({
              errors: expect.arrayContaining([
                expect.objectContaining({
                  field: expect.stringContaining('title'),
                  message: expect.any(String)
                })
              ])
            })
          })
        })
      );
    });

    test('should validate wallet authentication', async () => {
      const mockReq = createMockRequest({
        body: {
          walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b5',
          signature: '0x1234567890abcdef',
          message: 'Sign this message to authenticate',
          chainId: 1
        }
      });
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      const middleware = validateRequest(authSchemas.walletConnect);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Pagination Utilities', () => {
    test('should extract pagination parameters from request', () => {
      const mockReq = createMockRequest({
        query: {
          page: '2',
          limit: '50',
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      });

      const result = paginationUtils.extractPaginationFromRequest(mockReq as Request);

      expect(result).toEqual({
        page: 2,
        limit: 50,
        offset: 50
      });
    });

    test('should create pagination info', () => {
      const result = paginationUtils.createPaginationInfo(2, 20, 100);

      expect(result).toEqual({
        page: 2,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNext: true,
        hasPrev: true
      });
    });

    test('should handle edge cases in pagination', () => {
      // Test first page
      const firstPage = paginationUtils.createPaginationInfo(1, 20, 100);
      expect(firstPage.hasPrev).toBe(false);
      expect(firstPage.hasNext).toBe(true);

      // Test last page
      const lastPage = paginationUtils.createPaginationInfo(5, 20, 100);
      expect(lastPage.hasPrev).toBe(true);
      expect(lastPage.hasNext).toBe(false);

      // Test single page
      const singlePage = paginationUtils.createPaginationInfo(1, 20, 10);
      expect(singlePage.hasPrev).toBe(false);
      expect(singlePage.hasNext).toBe(false);
      expect(singlePage.totalPages).toBe(1);
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize basic text input', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const result = InputSanitizer.sanitizeString(maliciousInput, SANITIZATION_CONFIGS.TEXT);

      expect(result.sanitized).toBe('Hello World');
      expect(result.blocked).toContain('Script tags: <script');
      expect(result.modified).toBe(true);
    });

    test('should sanitize rich text content', () => {
      const richTextInput = '<p>Hello <strong>World</strong></p><script>alert("xss")</script>';
      const result = InputSanitizer.sanitizeString(richTextInput, SANITIZATION_CONFIGS.RICH_TEXT);

      expect(result.sanitized).toContain('<p>Hello <strong>World</strong></p>');
      expect(result.sanitized).not.toContain('<script>');
      expect(result.blocked).toContain('Script tags: <script');
    });

    test('should validate wallet addresses', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b5';
      const result = InputSanitizer.sanitizeWalletAddress(validAddress);
      expect(result).toBe(validAddress.toLowerCase());

      expect(() => {
        InputSanitizer.sanitizeWalletAddress('invalid-address');
      }).toThrow('Invalid wallet address format');
    });

    test('should sanitize URLs', () => {
      const validUrl = 'https://example.com/path?param=value';
      const result = InputSanitizer.sanitizeURL(validUrl);
      expect(result).toBe(validUrl);

      expect(() => {
        InputSanitizer.sanitizeURL('javascript:alert("xss")');
      }).toThrow('Protocol javascript not allowed');
    });

    test('should sanitize objects recursively', () => {
      const maliciousObject = {
        title: '<script>alert("xss")</script>Clean Title',
        description: 'Normal description',
        nested: {
          field: '<img src="x" onerror="alert(1)">',
          array: ['<script>evil</script>', 'clean text']
        }
      };

      const result = InputSanitizer.sanitizeObject(maliciousObject, SANITIZATION_CONFIGS.TEXT);

      expect(result.title).toBe('Clean Title');
      expect(result.description).toBe('Normal description');
      expect(result.nested.field).toBe('');
      expect(result.nested.array[0]).toBe('');
      expect(result.nested.array[1]).toBe('clean text');
    });
  });

  describe('HTTP Status Codes', () => {
    test('should use correct HTTP status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422);
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
    });
  });

  describe('Error Message Formatting', () => {
    test('should format validation errors consistently', async () => {
      const mockReq = createMockRequest({
        body: {
          title: '', // Invalid
          price: { amount: 'invalid', currency: 'INVALID' } // Invalid
        }
      });
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      const middleware = validateRequest(marketplaceSchemas.createListing);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: expect.objectContaining({
              errors: expect.arrayContaining([
                expect.objectContaining({
                  field: expect.any(String),
                  message: expect.any(String),
                  type: expect.any(String)
                })
              ])
            })
          }),
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: expect.any(String),
            version: '1.0.0'
          })
        })
      );
    });
  });
});
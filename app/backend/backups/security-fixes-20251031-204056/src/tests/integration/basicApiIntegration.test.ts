import request from 'supertest';

// Simple test without importing the full app to avoid circular dependencies
describe('Basic API Integration', () => {
  let app: any;

  beforeAll(async () => {
    // Mock the performance optimizer to avoid circular dependency
    jest.mock('../../routes/performanceRoutes', () => ({
      default: jest.fn(),
      setPerformanceOptimizer: jest.fn()
    }));

    // Import app after mocking
    const appModule = await import('../../index');
    app = appModule.default;
  });

  describe('Health Checks', () => {
    it('should return main API info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('LinkDAO Marketplace API');
      expect(response.body.data.version).toBe('1.0.0');
      expect(response.body.data.endpoints).toBeDefined();
    });

    it('should return marketplace API health status', async () => {
      const response = await request(app)
        .get('/api/marketplace/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('Marketplace API');
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.endpoints).toBeDefined();
    });
  });

  describe('Route Registration', () => {
    it('should have marketplace routes registered at /api/marketplace', async () => {
      const response = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should have versioned marketplace routes registered at /api/v1/marketplace', async () => {
      const response = await request(app)
        .get('/api/v1/marketplace/listings')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should handle authentication routes', async () => {
      const response = await request(app)
        .post('/api/auth/wallet-connect')
        .send({
          walletAddress: '0x1234567890123456789012345678901234567890',
          signature: '0x' + 'a'.repeat(130),
          message: 'test message'
        })
        .expect(400); // Should fail validation but route should exist

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
    });

    it('should handle cart routes with authentication requirement', async () => {
      const response = await request(app)
        .get('/api/cart')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle seller routes with authentication requirement', async () => {
      const response = await request(app)
        .get('/api/sellers/dashboard')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('API Response Format', () => {
    it('should return standardized response format', async () => {
      const response = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
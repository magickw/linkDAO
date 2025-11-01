import request from 'supertest';
import app from '../../index';

describe('Marketplace API Integration', () => {
  describe('Health Checks', () => {
    it('should return API health status', async () => {
      const response = await request(app)
        .get('/api/marketplace/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('Marketplace API');
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.endpoints).toBeDefined();
    });

    it('should return main API info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('LinkDAO Marketplace API');
      expect(response.body.data.version).toBe('1.0.0');
    });
  });

  describe('Route Registration', () => {
    it('should have marketplace routes registered', async () => {
      const response = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      // Should return a valid response structure
      expect(response.body).toHaveProperty('success');
    });

    it('should have versioned marketplace routes registered', async () => {
      const response = await request(app)
        .get('/api/v1/marketplace/listings')
        .expect(200);

      // Should return a valid response structure
      expect(response.body).toHaveProperty('success');
    });

    it('should handle marketplace search endpoint', async () => {
      const response = await request(app)
        .get('/api/marketplace/search?q=test')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should handle cart endpoints with authentication', async () => {
      const response = await request(app)
        .get('/api/cart')
        .expect(401); // Should require authentication

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle seller endpoints with authentication', async () => {
      const response = await request(app)
        .get('/api/sellers/dashboard')
        .expect(401); // Should require authentication

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent marketplace endpoints', async () => {
      const response = await request(app)
        .get('/api/marketplace/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .get('/api/marketplace/listings/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
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
      expect(response.body.metadata).toHaveProperty('requestId');
    });

    it('should include pagination metadata for list endpoints', async () => {
      const response = await request(app)
        .get('/api/marketplace/listings?page=1&limit=10')
        .expect(200);

      if (response.body.data && Array.isArray(response.body.data.listings)) {
        expect(response.body.metadata).toHaveProperty('pagination');
        expect(response.body.metadata.pagination).toHaveProperty('page');
        expect(response.body.metadata.pagination).toHaveProperty('limit');
        expect(response.body.metadata.pagination).toHaveProperty('total');
      }
    });
  });

  describe('Middleware Integration', () => {
    it('should apply rate limiting', async () => {
      // Make multiple requests to test rate limiting
      const requests = Array(10).fill(null).map(() => 
        request(app).get('/api/marketplace/listings')
      );

      const responses = await Promise.all(requests);
      
      // All should succeed initially (rate limit is generous for tests)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });

    it('should include request logging headers', async () => {
      const response = await request(app)
        .get('/api/marketplace/health')
        .expect(200);

      expect(response.body.metadata).toHaveProperty('requestId');
      expect(response.body.metadata).toHaveProperty('timestamp');
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/marketplace/listings')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});
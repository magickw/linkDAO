import request from 'supertest';
import express from 'express';
import sellerRoutes from '../routes/sellerRoutes';

describe('Seller Routes Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/sellers', sellerRoutes);
  });

  describe('Route Registration', () => {
    it('should have POST /listings route', async () => {
      const response = await request(app)
        .post('/api/sellers/listings')
        .send({});
      
      // Should get 401 (auth required) not 404 (route not found)
      expect(response.status).toBe(401);
    });

    it('should have PUT /listings/:id route', async () => {
      const response = await request(app)
        .put('/api/sellers/listings/test-id')
        .send({});
      
      // Should get 401 (auth required) not 404 (route not found)
      expect(response.status).toBe(401);
    });

    it('should have DELETE /listings/:id route', async () => {
      const response = await request(app)
        .delete('/api/sellers/listings/test-id');
      
      // Should get 401 (auth required) not 404 (route not found)
      expect(response.status).toBe(401);
    });

    it('should have GET /dashboard route', async () => {
      const response = await request(app)
        .get('/api/sellers/dashboard');
      
      // Should get 401 (auth required) not 404 (route not found)
      expect(response.status).toBe(401);
    });

    it('should have PUT /profile route', async () => {
      const response = await request(app)
        .put('/api/sellers/profile')
        .send({});
      
      // Should get 401 (auth required) not 404 (route not found)
      expect(response.status).toBe(401);
    });

    it('should have GET /listings route', async () => {
      const response = await request(app)
        .get('/api/sellers/listings');
      
      // Should get 401 (auth required) not 404 (route not found)
      expect(response.status).toBe(401);
    });

    it('should have GET /orders route', async () => {
      const response = await request(app)
        .get('/api/sellers/orders');
      
      // Should get 401 (auth required) not 404 (route not found)
      expect(response.status).toBe(401);
    });

    it('should have GET /analytics route', async () => {
      const response = await request(app)
        .get('/api/sellers/analytics');
      
      // Should get 401 (auth required) not 404 (route not found)
      expect(response.status).toBe(401);
    });

    it('should have GET /profile route', async () => {
      const response = await request(app)
        .get('/api/sellers/profile');
      
      // Should get 401 (auth required) not 404 (route not found)
      expect(response.status).toBe(401);
    });

    it('should have GET /stats route', async () => {
      const response = await request(app)
        .get('/api/sellers/stats');
      
      // Should get 401 (auth required) not 404 (route not found)
      expect(response.status).toBe(401);
    });

    it('should have POST /verify route', async () => {
      const response = await request(app)
        .post('/api/sellers/verify')
        .send({});
      
      // Should get 401 (auth required) not 404 (route not found)
      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should validate POST /listings request body', async () => {
      // Mock auth middleware for this test
      app.use((req: any, res, next) => {
        req.user = { walletAddress: '0x123', id: 'test' };
        next();
      });
      
      const response = await request(app)
        .post('/api/sellers/listings')
        .send({ title: 'ab' }); // Too short title
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate POST /verify request body', async () => {
      // Mock auth middleware for this test
      app.use((req: any, res, next) => {
        req.user = { walletAddress: '0x123', id: 'test' };
        next();
      });
      
      const response = await request(app)
        .post('/api/sellers/verify')
        .send({ verificationType: 'invalid' }); // Invalid verification type
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});
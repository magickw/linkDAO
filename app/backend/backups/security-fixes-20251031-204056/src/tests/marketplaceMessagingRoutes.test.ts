import request from 'supertest';
import { app } from '../index';

describe('Marketplace Messaging Routes', () => {
  describe('POST /api/marketplace/messaging/conversations/order/:orderId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/marketplace/messaging/conversations/order/123')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/marketplace/messaging/conversations/:id/order-timeline', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/marketplace/messaging/conversations/123/order-timeline')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/marketplace/messaging/templates', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/marketplace/messaging/templates')
        .send({
          name: 'Test Template',
          content: 'This is a test template'
        })
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/marketplace/messaging/quick-replies/suggest', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/marketplace/messaging/quick-replies/suggest')
        .query({ message: 'test' })
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
  });
});
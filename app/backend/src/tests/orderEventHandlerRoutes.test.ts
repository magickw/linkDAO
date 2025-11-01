import request from 'supertest';
import { app } from '../index';

describe('Order Event Handler Routes', () => {
  describe('POST /api/order-events/handle', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/order-events/handle')
        .send({
          orderId: 123,
          eventType: 'ORDER_CREATED'
        })
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/order-events/handle')
        .set('Authorization', 'Bearer fake-token')
        .send({
          // Missing required fields
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should accept valid requests', async () => {
      const response = await request(app)
        .post('/api/order-events/handle')
        .set('Authorization', 'Bearer fake-token')
        .send({
          orderId: 123,
          eventType: 'ORDER_CREATED'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/order-events/process-pending', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/order-events/process-pending')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should process pending events', async () => {
      const response = await request(app)
        .post('/api/order-events/process-pending')
        .set('Authorization', 'Bearer fake-token')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });
  });
});

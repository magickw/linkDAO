import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import express from 'express';
import authRoutes from '../routes/authRoutes';

describe('Authentication Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
  });

  describe('POST /auth/wallet-connect', () => {
    it('should return validation error for missing fields', async () => {
      const response = await request(app)
        .post('/auth/wallet-connect')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid wallet address', async () => {
      const response = await request(app)
        .post('/auth/wallet-connect')
        .send({
          walletAddress: 'invalid-address',
          signature: '0x' + 'a'.repeat(130),
          message: 'test message'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /auth/profile', () => {
    it('should return unauthorized error without token', async () => {
      const response = await request(app)
        .get('/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('PUT /auth/profile', () => {
    it('should return unauthorized error without token', async () => {
      const response = await request(app)
        .put('/auth/profile')
        .send({
          displayName: 'Test User'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('POST /auth/logout', () => {
    it('should return unauthorized error without token', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });
});

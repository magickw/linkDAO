import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../index';

describe('Authentication Routes', () => {
  describe('POST /api/auth/wallet-connect', () => {
    it('should return validation error for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/wallet-connect')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/wallet-connect')
        .send({
          walletAddress: 'invalid-address',
          signature: '0x' + 'a'.repeat(130),
          message: 'test message'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return signature error for invalid signature', async () => {
      const response = await request(app)
        .post('/api/auth/wallet-connect')
        .send({
          walletAddress: '0x' + '1'.repeat(40),
          signature: '0x' + 'a'.repeat(130),
          message: 'test message'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SIGNATURE_ERROR');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return unauthorized error without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should return invalid token error with bad token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should return unauthorized error without token', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({
          displayName: 'Test User'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return unauthorized error without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });
});
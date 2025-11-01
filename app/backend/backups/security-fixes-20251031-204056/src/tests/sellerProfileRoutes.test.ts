import request from 'supertest';
import app from '../index';

describe('Seller Profile API Routes', () => {
  describe('GET /api/marketplace/seller/:walletAddress', () => {
    it('should return validation error for invalid wallet address', async () => {
      const response = await request(app)
        .get('/api/marketplace/seller/invalid-address')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Validation failed');
    });

    it('should return null data for non-existent seller profile', async () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';
      const response = await request(app)
        .get(`/api/marketplace/seller/${validWalletAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(null);
    });
  });

  describe('POST /api/marketplace/seller/profile', () => {
    it('should return validation error for missing wallet address', async () => {
      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          displayName: 'Test Seller'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid wallet address format', async () => {
      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: 'invalid-address',
          displayName: 'Test Seller'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid ENS handle', async () => {
      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: '0x1234567890123456789012345678901234567890',
          displayName: 'Test Seller',
          ensHandle: 'invalid-ens'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/marketplace/seller/onboarding/:walletAddress', () => {
    it('should return validation error for invalid wallet address', async () => {
      const response = await request(app)
        .get('/api/marketplace/seller/onboarding/invalid-address')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return default onboarding status for non-existent seller', async () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';
      const response = await request(app)
        .get(`/api/marketplace/seller/onboarding/${validWalletAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        walletAddress: validWalletAddress,
        completed: false,
        steps: {
          profile_setup: false,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        completionPercentage: 0,
        nextStep: 'profile_setup'
      });
    });
  });

  describe('PUT /api/marketplace/seller/onboarding/:walletAddress/:step', () => {
    it('should return validation error for invalid wallet address', async () => {
      const response = await request(app)
        .put('/api/marketplace/seller/onboarding/invalid-address/profile_setup')
        .send({ completed: true })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid step', async () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';
      const response = await request(app)
        .put(`/api/marketplace/seller/onboarding/${validWalletAddress}/invalid_step`)
        .send({ completed: true })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid completed value', async () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';
      const response = await request(app)
        .put(`/api/marketplace/seller/onboarding/${validWalletAddress}/profile_setup`)
        .send({ completed: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
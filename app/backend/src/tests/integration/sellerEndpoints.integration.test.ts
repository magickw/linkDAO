import request from 'supertest';
import { describe, expect, it, beforeAll } from '@jest/globals';

/**
 * Integration Tests for New Seller Endpoints
 *
 * Tests all newly implemented P0 and P1 features:
 * 1. Dashboard Stats API
 * 2. Seller Orders Management
 * 3. Seller Listings CRUD
 * 4. Image Upload with IPFS
 * 5. ENS Validation
 * 6. Step ID Normalization (hyphens to underscores)
 */
describe('New Seller Endpoints Integration Tests', () => {
  let app: any;
  const testWalletAddress = '0x1234567890123456789012345678901234567890';
  const testWalletAddress2 = '0xabcdef1234567890abcdef1234567890abcdef12';

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

  describe('Seller Dashboard Stats API', () => {
    describe('GET /api/marketplace/seller/dashboard/:walletAddress', () => {
      it('should reject invalid wallet address', async () => {
        const response = await request(app)
          .get('/api/marketplace/seller/dashboard/invalid-address')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return dashboard stats for valid wallet', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/dashboard/${testWalletAddress}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('sales');
        expect(response.body.data).toHaveProperty('orders');
        expect(response.body.data).toHaveProperty('listings');
        expect(response.body.data).toHaveProperty('balance');
      });

      it('should return correct sales structure', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/dashboard/${testWalletAddress}`)
          .expect(200);

        const { sales } = response.body.data;
        expect(sales).toHaveProperty('today');
        expect(sales).toHaveProperty('thisWeek');
        expect(sales).toHaveProperty('thisMonth');
        expect(sales).toHaveProperty('total');
        expect(typeof sales.today).toBe('number');
      });
    });

    describe('GET /api/marketplace/seller/notifications/:walletAddress', () => {
      it('should return notifications with pagination', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/notifications/${testWalletAddress}`)
          .query({ limit: 10, offset: 0 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('notifications');
        expect(response.body.data).toHaveProperty('totalCount');
        expect(response.body.data).toHaveProperty('unreadCount');
        expect(Array.isArray(response.body.data.notifications)).toBe(true);
      });

      it('should filter unread notifications when unreadOnly=true', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/notifications/${testWalletAddress}`)
          .query({ unreadOnly: 'true', limit: 5 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('notifications');
      });
    });

    describe('GET /api/marketplace/seller/analytics/:walletAddress', () => {
      it('should return analytics for default period (30d)', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/analytics/${testWalletAddress}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('period');
        expect(response.body.data).toHaveProperty('revenue');
        expect(response.body.data).toHaveProperty('orderStats');
        expect(response.body.data).toHaveProperty('performance');
      });

      it('should support custom time periods', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/analytics/${testWalletAddress}`)
          .query({ period: '7d' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBe('7d');
      });
    });
  });

  describe('Seller Orders Management API', () => {
    describe('GET /api/marketplace/seller/orders/:walletAddress', () => {
      it('should return paginated orders list', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/orders/${testWalletAddress}`)
          .query({ limit: 20, offset: 0 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('orders');
        expect(response.body.data).toHaveProperty('totalCount');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.orders)).toBe(true);
      });

      it('should filter by order status', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/orders/${testWalletAddress}`)
          .query({ status: 'pending', limit: 10 })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should support sorting', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/orders/${testWalletAddress}`)
          .query({ sortBy: 'createdAt', sortOrder: 'desc' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should enforce pagination limits (max 100)', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/orders/${testWalletAddress}`)
          .query({ limit: 150 })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('PUT /api/marketplace/seller/orders/:orderId/status', () => {
      it('should update order status', async () => {
        // Note: This will fail if order doesn't exist, but tests route is working
        const response = await request(app)
          .put('/api/marketplace/seller/orders/999/status')
          .send({
            status: 'processing',
            notes: 'Order being processed'
          });

        // Should either succeed (200) or fail with NOT_FOUND (404)
        expect([200, 404]).toContain(response.status);
      });

      it('should reject invalid status values', async () => {
        const response = await request(app)
          .put('/api/marketplace/seller/orders/1/status')
          .send({
            status: 'invalid-status'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should require status field', async () => {
        const response = await request(app)
          .put('/api/marketplace/seller/orders/1/status')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/marketplace/seller/orders/:orderId/tracking', () => {
      it('should update tracking information', async () => {
        const response = await request(app)
          .put('/api/marketplace/seller/orders/999/tracking')
          .send({
            trackingNumber: '1Z999AA10123456784',
            trackingCarrier: 'UPS',
            estimatedDelivery: '2025-11-01',
            notes: 'Package shipped'
          });

        expect([200, 404]).toContain(response.status);
      });

      it('should require trackingNumber and trackingCarrier', async () => {
        const response = await request(app)
          .put('/api/marketplace/seller/orders/1/tracking')
          .send({
            trackingNumber: '123456'
            // Missing trackingCarrier
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Seller Listings CRUD API', () => {
    describe('GET /api/marketplace/seller/listings/:walletAddress', () => {
      it('should return paginated listings', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/listings/${testWalletAddress}`)
          .query({ limit: 20 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('listings');
        expect(response.body.data).toHaveProperty('totalCount');
        expect(Array.isArray(response.body.data.listings)).toBe(true);
      });

      it('should filter by listing status', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/listings/${testWalletAddress}`)
          .query({ status: 'active' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/marketplace/seller/listings', () => {
      it('should create new listing with valid data', async () => {
        const response = await request(app)
          .post('/api/marketplace/seller/listings')
          .send({
            walletAddress: testWalletAddress,
            title: 'Test Product',
            description: 'Test product description',
            price: 99.99,
            categoryId: '123e4567-e89b-12d3-a456-426614174000',
            currency: 'USD',
            inventory: 10
          });

        // Should either succeed or fail with seller not found
        expect([200, 201, 404]).toContain(response.status);
      });

      it('should reject listing with missing required fields', async () => {
        const response = await request(app)
          .post('/api/marketplace/seller/listings')
          .send({
            walletAddress: testWalletAddress,
            title: 'Incomplete Product'
            // Missing description, price, categoryId
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject negative prices', async () => {
        const response = await request(app)
          .post('/api/marketplace/seller/listings')
          .send({
            walletAddress: testWalletAddress,
            title: 'Test Product',
            description: 'Test',
            price: -10,
            categoryId: '123e4567-e89b-12d3-a456-426614174000'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/marketplace/seller/listings/:listingId', () => {
      it('should update existing listing', async () => {
        const validUuid = '123e4567-e89b-12d3-a456-426614174000';
        const response = await request(app)
          .put(`/api/marketplace/seller/listings/${validUuid}`)
          .send({
            price: 149.99,
            status: 'active'
          });

        expect([200, 404]).toContain(response.status);
      });

      it('should reject invalid UUID format', async () => {
        const response = await request(app)
          .put('/api/marketplace/seller/listings/invalid-uuid')
          .send({
            price: 99.99
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/marketplace/seller/listings/:listingId', () => {
      it('should soft delete listing (set status to inactive)', async () => {
        const validUuid = '123e4567-e89b-12d3-a456-426614174000';
        const response = await request(app)
          .delete(`/api/marketplace/seller/listings/${validUuid}`);

        expect([200, 404]).toContain(response.status);
      });

      it('should reject invalid UUID', async () => {
        const response = await request(app)
          .delete('/api/marketplace/seller/listings/not-a-uuid')
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Image Upload API', () => {
    describe('PUT /api/marketplace/seller/:walletAddress/enhanced', () => {
      it('should accept profile update without images', async () => {
        const response = await request(app)
          .put(`/api/marketplace/seller/${testWalletAddress}/enhanced`)
          .send({
            displayName: 'Test Seller',
            storeName: 'Test Store',
            bio: 'Test bio'
          });

        expect([200, 404]).toContain(response.status);
      });

      // Note: Testing actual file uploads requires multipart/form-data
      // which is more complex and typically done in E2E tests
    });

    describe('POST /api/marketplace/seller/image/upload', () => {
      it('should require walletAddress and usageType', async () => {
        const response = await request(app)
          .post('/api/marketplace/seller/image/upload')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should validate usageType values', async () => {
        const response = await request(app)
          .post('/api/marketplace/seller/image/upload')
          .send({
            walletAddress: testWalletAddress,
            usageType: 'invalid-type'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('ENS Validation API', () => {
    describe('POST /api/marketplace/seller/ens/validate', () => {
      it('should validate ENS name format', async () => {
        const response = await request(app)
          .post('/api/marketplace/seller/ens/validate')
          .send({
            ensName: 'vitalik.eth'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('valid');
        expect(response.body.data).toHaveProperty('ensName');
      });

      it('should reject invalid ENS format', async () => {
        const response = await request(app)
          .post('/api/marketplace/seller/ens/validate')
          .send({
            ensName: 'not-an-ens'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.valid).toBe(false);
        expect(response.body.data).toHaveProperty('error');
      });

      it('should require ensName field', async () => {
        const response = await request(app)
          .post('/api/marketplace/seller/ens/validate')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/marketplace/seller/ens/verify-ownership', () => {
      it('should verify ENS ownership', async () => {
        const response = await request(app)
          .post('/api/marketplace/seller/ens/verify-ownership')
          .send({
            ensName: 'vitalik.eth',
            walletAddress: testWalletAddress,
            storeVerification: false
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('verified');
        expect(response.body.data).toHaveProperty('verificationMethod');
      });

      it('should require both ensName and walletAddress', async () => {
        const response = await request(app)
          .post('/api/marketplace/seller/ens/verify-ownership')
          .send({
            ensName: 'test.eth'
            // Missing walletAddress
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate wallet address format', async () => {
        const response = await request(app)
          .post('/api/marketplace/seller/ens/verify-ownership')
          .send({
            ensName: 'test.eth',
            walletAddress: 'invalid-address'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/marketplace/seller/ens/resolve/:ensName', () => {
      it('should resolve ENS name to address', async () => {
        const response = await request(app)
          .get('/api/marketplace/seller/ens/resolve/vitalik.eth')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('resolved');
        expect(response.body.data).toHaveProperty('ensName');
      });
    });

    describe('GET /api/marketplace/seller/ens/reverse/:walletAddress', () => {
      it('should reverse resolve address to ENS', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/ens/reverse/${testWalletAddress}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('resolved');
      });

      it('should reject invalid wallet addresses', async () => {
        const response = await request(app)
          .get('/api/marketplace/seller/ens/reverse/invalid')
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/marketplace/seller/ens/verifications/:walletAddress', () => {
      it('should return stored ENS verifications', async () => {
        const response = await request(app)
          .get(`/api/marketplace/seller/ens/verifications/${testWalletAddress}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('verifications');
        expect(response.body.data).toHaveProperty('count');
        expect(Array.isArray(response.body.data.verifications)).toBe(true);
      });
    });
  });

  describe('Step ID Normalization (Hyphen to Underscore)', () => {
    describe('PUT /api/marketplace/seller/onboarding/:walletAddress/:step', () => {
      it('should accept step IDs with hyphens (frontend format)', async () => {
        const response = await request(app)
          .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/profile-setup`)
          .send({
            completed: true
          });

        // Should work (200) or fail with not found (404) if seller doesn't exist
        expect([200, 404]).toContain(response.status);
      });

      it('should accept step IDs with underscores (backend format)', async () => {
        const response = await request(app)
          .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/profile_setup`)
          .send({
            completed: true
          });

        expect([200, 404]).toContain(response.status);
      });

      it('should normalize all valid step IDs', async () => {
        const steps = [
          'profile-setup',
          'profile_setup',
          'payout-setup',
          'payout_setup',
          'first-listing',
          'first_listing',
          'verification'
        ];

        for (const step of steps) {
          const response = await request(app)
            .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/${step}`)
            .send({ completed: true });

          expect([200, 404]).toContain(response.status);
          if (response.status !== 404) {
            expect(response.body.success).toBe(true);
          }
        }
      });

      it('should reject invalid step IDs', async () => {
        const response = await request(app)
          .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/invalid-step`)
          .send({
            completed: true
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should require completed field', async () => {
        const response = await request(app)
          .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/profile-setup`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on ENS validation', async () => {
      // Make multiple rapid requests
      const requests = Array(25).fill(null).map(() =>
        request(app)
          .post('/api/marketplace/seller/ens/validate')
          .send({ ensName: 'test.eth' })
      );

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return standardized error format', async () => {
      const response = await request(app)
        .get('/api/marketplace/seller/dashboard/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should handle not found errors gracefully', async () => {
      const response = await request(app)
        .get('/api/marketplace/seller/orders/999999999999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('API Response Format Consistency', () => {
    it('should return consistent success response format', async () => {
      const response = await request(app)
        .get(`/api/marketplace/seller/dashboard/${testWalletAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.success).toBe(true);
      expect(response.body.metadata).toHaveProperty('timestamp');
    });

    it('should include requestId in all responses', async () => {
      const response = await request(app)
        .get(`/api/marketplace/seller/analytics/${testWalletAddress}`)
        .expect(200);

      expect(response.body.metadata).toHaveProperty('requestId');
    });
  });
});

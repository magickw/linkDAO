import request from 'supertest';
import express from 'express';
import sellerRoutes from '../routes/sellerRoutes';
import { authMiddleware } from '../middleware/authMiddleware';

// Mock the auth middleware for testing
jest.mock('../middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      id: 'test-user-id'
    };
    next();
  }
}));

// Mock the database service
jest.mock('../services/databaseService', () => ({
  databaseService: {
    getDatabase: () => ({
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue([{
                marketplace_users: { userId: 'test-user-id' },
                users: { id: 'test-user-id', walletAddress: '0x1234567890123456789012345678901234567890' }
              }]),
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockReturnValue([{
                    id: 'test-listing-id',
                    title: 'Test Product',
                    priceCrypto: '100.00',
                    currency: 'USDC',
                    createdAt: new Date()
                  }])
                })
              })
            })
          })
        })
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'test-listing-id',
            title: 'Test Product',
            description: 'Test Description',
            category: 'Electronics',
            priceCrypto: '100.00',
            currency: 'USDC',
            isPhysical: false,
            stock: 1,
            status: 'active',
            createdAt: new Date()
          }]),
          onConflictDoNothing: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 'test-user-id',
              walletAddress: '0x1234567890123456789012345678901234567890'
            }])
          })
        })
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 'test-listing-id',
              title: 'Updated Product',
              updatedAt: new Date()
            }])
          })
        })
      })
    })
  }
}));

// Mock the seller service
jest.mock('../services/sellerService', () => ({
  sellerService: {
    getSellerProfile: jest.fn().mockResolvedValue({
      walletAddress: '0x1234567890123456789012345678901234567890',
      displayName: 'Test Seller',
      storeName: 'Test Store'
    }),
    updateSellerProfile: jest.fn().mockResolvedValue({
      walletAddress: '0x1234567890123456789012345678901234567890',
      displayName: 'Updated Seller',
      storeName: 'Updated Store'
    }),
    getSellerStats: jest.fn().mockResolvedValue({
      totalListings: 5,
      activeListings: 3,
      totalSales: 10,
      totalRevenue: '1000.00'
    }),
    verifySellerProfile: jest.fn().mockResolvedValue({
      success: true,
      message: 'Verification completed'
    })
  }
}));

describe('Seller Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/sellers', sellerRoutes);
  });

  describe('POST /api/sellers/listings', () => {
    it('should create a new listing', async () => {
      const listingData = {
        title: 'Test Product',
        description: 'Test Description',
        category: 'Electronics',
        priceCrypto: 100,
        currency: 'USDC'
      };

      const response = await request(app)
        .post('/api/sellers/listings')
        .send(listingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Product');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/sellers/listings')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/sellers/dashboard', () => {
    it('should return dashboard data', async () => {
      const response = await request(app)
        .get('/api/sellers/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data).toHaveProperty('recentListings');
    });
  });

  describe('GET /api/sellers/profile', () => {
    it('should return seller profile', async () => {
      const response = await request(app)
        .get('/api/sellers/profile')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.walletAddress).toBe('0x1234567890123456789012345678901234567890');
    });
  });

  describe('PUT /api/sellers/profile', () => {
    it('should update seller profile', async () => {
      const updateData = {
        displayName: 'Updated Seller',
        storeName: 'Updated Store'
      };

      const response = await request(app)
        .put('/api/sellers/profile')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.displayName).toBe('Updated Seller');
    });
  });

  describe('GET /api/sellers/stats', () => {
    it('should return seller statistics', async () => {
      const response = await request(app)
        .get('/api/sellers/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalListings');
      expect(response.body.data).toHaveProperty('totalSales');
    });
  });

  describe('POST /api/sellers/verify', () => {
    it('should request seller verification', async () => {
      const verificationData = {
        verificationType: 'email'
      };

      const response = await request(app)
        .post('/api/sellers/verify')
        .send(verificationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
    });

    it('should validate verification type', async () => {
      const response = await request(app)
        .post('/api/sellers/verify')
        .send({ verificationType: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
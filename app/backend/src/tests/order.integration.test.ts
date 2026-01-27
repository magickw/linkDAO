import request from 'supertest';
import express from 'express';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import orderRoutes from '../routes/orderRoutes';
import { databaseService } from '../services/databaseService';
import { userProfileService } from '../services/userProfileService';
import { orderService } from '../services/marketplace/orderService';
import { safeLogger } from '../utils/safeLogger';

// Mock databaseService and userProfileService
jest.mock('../services/databaseService');
jest.mock('../services/userProfileService');
jest.mock('../services/marketplace/orderService');

const app = express();
app.use(express.json());
app.use('/api/orders', orderRoutes);

// Mock auth middleware to attach a user to the request
app.use((req: any, res: any, next: any) => {
  req.user = { id: 'testUserId', walletAddress: '0xTestWalletAddress' };
  next();
});

describe('Order Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = { id: 'testUserId', walletAddress: '0xTestWalletAddress', displayName: 'Test User' };
  const mockOrders = [
    {
      order: { id: 'order1', buyerId: 'testUserId', sellerId: 'seller1', status: 'completed', createdAt: new Date('2023-01-01T10:00:00Z').toISOString() },
      buyer: { id: 'testUserId', walletAddress: '0xTestWalletAddress', displayName: 'Test User' },
      seller: { id: 'seller1', walletAddress: '0xSeller1', displayName: 'Seller One' },
      product: { id: 'prod1', title: 'Product 1' }
    },
    {
      order: { id: 'order2', buyerId: 'testUserId', sellerId: 'seller2', status: 'pending', createdAt: new Date('2023-01-02T10:00:00Z').toISOString() },
      buyer: { id: 'testUserId', walletAddress: '0xTestWalletAddress', displayName: 'Test User' },
      seller: { id: 'seller2', walletAddress: '0xSeller2', displayName: 'Seller Two' },
      product: { id: 'prod2', title: 'Product 2' }
    },
    {
      order: { id: 'order3', buyerId: 'otherUser', sellerId: 'testUserId', status: 'completed', createdAt: new Date('2023-01-03T10:00:00Z').toISOString() },
      buyer: { id: 'otherUser', walletAddress: '0xOtherUser', displayName: 'Other User' },
      seller: { id: 'testUserId', walletAddress: '0xTestWalletAddress', displayName: 'Test User' },
      product: { id: 'prod3', title: 'Product 3' }
    }
  ];

  describe('GET /api/orders/mine', () => {
    it('should return paginated and sorted orders for the authenticated user', async () => {
      (userProfileService.getProfileByAddress as jest.Mock).mockResolvedValue(mockUser);
      (orderService.getOrdersByUserId as jest.Mock).mockResolvedValue(mockOrders);

      const response = await request(app)
        .get('/api/orders/mine?limit=2&offset=0&sortBy=createdAt&sortOrder=desc')
        .expect(200);

      expect(response.body).toHaveLength(mockOrders.length);
      expect(orderService.getOrdersByUserId).toHaveBeenCalledWith(
        'testUserId',
        undefined, // role
        { status: undefined }, // filters
        'createdAt', // sortBy
        'desc', // sortOrder
        2, // limit
        0 // offset
      );
      // Further assertions can be made on the actual data returned, its pagination, and sorting
    });

    it('should filter orders by status', async () => {
        (userProfileService.getProfileByAddress as jest.Mock).mockResolvedValue(mockUser);
        (orderService.getOrdersByUserId as jest.Mock).mockResolvedValue(
            mockOrders.filter(o => o.order.status === 'completed')
        );

        const response = await request(app)
          .get('/api/orders/mine?status=completed')
          .expect(200);
  
        expect(response.body).toHaveLength(2); // order1 and order3
        expect(orderService.getOrdersByUserId).toHaveBeenCalledWith(
          'testUserId',
          undefined,
          { status: 'completed' },
          'createdAt',
          'desc',
          50,
          0
        );
      });

    it('should handle no orders found', async () => {
      (userProfileService.getProfileByAddress as jest.Mock).mockResolvedValue(mockUser);
      (orderService.getOrdersByUserId as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/orders/mine')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/orders/user/:userAddress', () => {
    it('should return paginated and sorted orders for a specific user', async () => {
      (userProfileService.getProfileByAddress as jest.Mock).mockResolvedValue(mockUser);
      (orderService.getOrdersByUser as jest.Mock).mockResolvedValue(mockOrders);

      const response = await request(app)
        .get('/api/orders/user/0xTestWalletAddress?limit=1&offset=0&sortBy=id&sortOrder=asc&role=buyer')
        .expect(200);

      expect(response.body).toHaveLength(mockOrders.length);
      expect(orderService.getOrdersByUser).toHaveBeenCalledWith(
        '0xTestWalletAddress',
        'buyer', // role
        { status: undefined }, // filters
        'id', // sortBy
        'asc', // sortOrder
        1, // limit
        0 // offset
      );
    });

    it('should handle user not found', async () => {
      (userProfileService.getProfileByAddress as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/orders/user/0xNonExistentWalletAddress')
        .expect(404);

      expect(response.body.message).toContain('User not found');
    });

    it('should filter orders by status and role', async () => {
        (userProfileService.getProfileByAddress as jest.Mock).mockResolvedValue(mockUser);
        (orderService.getOrdersByUser as jest.Mock).mockResolvedValue(
            mockOrders.filter(o => o.order.status === 'completed' && o.order.buyerId === 'testUserId')
        );
  
        const response = await request(app)
          .get('/api/orders/user/0xTestWalletAddress?status=completed&role=buyer')
          .expect(200);
  
        expect(response.body).toHaveLength(1); // order1
        expect(orderService.getOrdersByUser).toHaveBeenCalledWith(
          '0xTestWalletAddress',
          'buyer',
          { status: 'completed' },
          'createdAt',
          'desc',
          50,
          0
        );
      });
  });
});

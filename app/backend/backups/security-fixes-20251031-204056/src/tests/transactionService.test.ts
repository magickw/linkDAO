import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { transactionService } from '../services/transactionService';

// Mock the database connection
jest.mock('../db/connection', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }
}));

// Mock the database schema
jest.mock('../db/schema', () => ({
  sellerTransactions: {
    id: 'id',
    sellerWalletAddress: 'sellerWalletAddress',
    transactionType: 'transactionType',
    amount: 'amount',
    currency: 'currency',
    counterpartyAddress: 'counterpartyAddress',
    transactionHash: 'transactionHash',
    createdAt: 'createdAt',
  },
  paymentTransactions: {},
  orders: {},
  marketplaceListings: {},
  users: {},
  sellers: {},
}));

describe('TransactionService', () => {
  const mockWalletAddress = '0x1234567890123456789012345678901234567890';
  const mockTransactionData = {
    type: 'sale' as const,
    amount: '100.50',
    currency: 'USDC',
    counterpartyAddress: '0x0987654321098765432109876543210987654321',
    orderId: '123',
    transactionHash: '0xabcdef1234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('recordTransaction', () => {
    it('should record a new transaction successfully', async () => {
      // Mock database insert
      const mockDb = require('../db/connection').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 1,
            sellerWalletAddress: mockWalletAddress,
            transactionType: mockTransactionData.type,
            amount: mockTransactionData.amount,
            currency: mockTransactionData.currency,
            counterpartyAddress: mockTransactionData.counterpartyAddress,
            transactionHash: mockTransactionData.transactionHash,
            createdAt: new Date(),
          }])
        })
      });

      // Mock seller name lookup
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              displayName: 'Test Seller'
            }])
          })
        })
      });

      const result = await transactionService.recordTransaction(
        mockWalletAddress,
        mockTransactionData.type,
        mockTransactionData.amount,
        mockTransactionData.currency,
        mockTransactionData.counterpartyAddress,
        mockTransactionData.orderId,
        mockTransactionData.transactionHash
      );

      expect(result).toMatchObject({
        type: mockTransactionData.type,
        amount: mockTransactionData.amount,
        currency: mockTransactionData.currency,
        counterpartyAddress: mockTransactionData.counterpartyAddress,
        orderId: mockTransactionData.orderId,
        transactionHash: mockTransactionData.transactionHash,
        paymentMethod: 'crypto',
        status: 'completed',
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle transaction recording errors', async () => {
      const mockDb = require('../db/connection').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      await expect(
        transactionService.recordTransaction(
          mockWalletAddress,
          mockTransactionData.type,
          mockTransactionData.amount,
          mockTransactionData.currency
        )
      ).rejects.toThrow('Database error');
    });
  });

  describe('getTransactionHistory', () => {
    it('should retrieve transaction history successfully', async () => {
      const mockTransactions = [
        {
          id: 1,
          type: 'sale',
          amount: '100.50',
          currency: 'USDC',
          counterpartyAddress: '0x0987654321098765432109876543210987654321',
          transactionHash: '0xabcdef1234567890',
          createdAt: new Date(),
        }
      ];

      const mockDb = require('../db/connection').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockTransactions)
              })
            })
          })
        })
      });

      const result = await transactionService.getTransactionHistory(mockWalletAddress, 10);

      expect(Array.isArray(result)).toBe(true);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should handle empty transaction history', async () => {
      const mockDb = require('../db/connection').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([])
              })
            })
          })
        })
      });

      const result = await transactionService.getTransactionHistory(mockWalletAddress);

      expect(result).toEqual([]);
    });
  });

  describe('getTransactionSummary', () => {
    it('should calculate transaction summary correctly', async () => {
      const mockStats = {
        totalTransactions: 10,
        totalVolume: '1000.00',
        totalSales: '800.00',
        totalPurchases: '200.00',
        totalFees: '50.00',
        averageTransactionValue: '100.00',
        pendingTransactions: 2,
      };

      const mockDb = require('../db/connection').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockStats])
        })
      });

      // Mock getTransactionHistory for recent transactions
      jest.spyOn(transactionService, 'getTransactionHistory').mockResolvedValue([]);

      const result = await transactionService.getTransactionSummary(mockWalletAddress, 30);

      expect(result).toMatchObject({
        totalTransactions: mockStats.totalTransactions,
        totalVolume: mockStats.totalVolume,
        totalSales: mockStats.totalSales,
        totalPurchases: mockStats.totalPurchases,
        totalFees: mockStats.totalFees,
        averageTransactionValue: mockStats.averageTransactionValue,
        successRate: 100, // All recorded transactions are successful
        pendingTransactions: mockStats.pendingTransactions,
        recentTransactions: [],
      });
    });
  });

  describe('getTransactionAnalytics', () => {
    it('should provide comprehensive transaction analytics', async () => {
      const mockDb = require('../db/connection').db;
      
      // Mock multiple database queries for analytics
      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              groupBy: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue([
                  { date: '2024-01-01', volume: '100.00', count: 5 }
                ])
              })
            })
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              groupBy: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue([
                  { month: '2024-01', volume: '500.00', count: 25 }
                ])
              })
            })
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              groupBy: jest.fn().mockResolvedValue([
                { type: 'sale', count: 8, volume: '400.00' }
              ])
            })
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              groupBy: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue([
                    { address: '0x123', volume: '200.00', count: 3 }
                  ])
                })
              })
            })
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              groupBy: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue([
                  { hour: 14, count: 5 }
                ])
              })
            })
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              { averageTransactionSize: '100.00' }
            ])
          })
        });

      const result = await transactionService.getTransactionAnalytics(mockWalletAddress, 90);

      expect(result).toHaveProperty('dailyVolume');
      expect(result).toHaveProperty('monthlyVolume');
      expect(result).toHaveProperty('transactionsByType');
      expect(result).toHaveProperty('topCounterparties');
      expect(result).toHaveProperty('peakTransactionHours');
      expect(result).toHaveProperty('averageTransactionSize');
    });
  });

  describe('recordOrderTransaction', () => {
    it('should record order-related transactions for both parties', async () => {
      const mockOrderData = {
        buyerId: 'buyer-uuid',
        sellerId: 'seller-uuid',
        buyerAddress: '0x1111111111111111111111111111111111111111',
        sellerAddress: '0x2222222222222222222222222222222222222222',
        listingTitle: 'Test Product',
        enhancedData: { title: 'Enhanced Test Product' },
      };

      const mockDb = require('../db/connection').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([mockOrderData])
              })
            })
          })
        })
      });

      // Mock recordTransaction calls
      const recordTransactionSpy = jest.spyOn(transactionService, 'recordTransaction')
        .mockResolvedValue({
          id: '1',
          type: 'sale',
          amount: '100.00',
          currency: 'USDC',
          status: 'completed',
          paymentMethod: 'crypto',
          description: 'Test transaction',
          createdAt: new Date().toISOString(),
        });

      await transactionService.recordOrderTransaction(
        '123',
        'payment_received',
        '100.00',
        'USDC',
        '0xabcdef'
      );

      expect(recordTransactionSpy).toHaveBeenCalledTimes(2); // Once for seller, once for buyer
    });

    it('should handle invalid order ID', async () => {
      const mockDb = require('../db/connection').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([])
              })
            })
          })
        })
      });

      await expect(
        transactionService.recordOrderTransaction(
          '999',
          'payment_received',
          '100.00',
          'USDC'
        )
      ).rejects.toThrow('Order not found');
    });
  });
});
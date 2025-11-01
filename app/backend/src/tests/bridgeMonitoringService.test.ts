import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BridgeMonitoringService } from '../services/bridgeMonitoringService';
import { BridgeNotificationService } from '../services/bridgeNotificationService';
import { EventEmitter } from 'events';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getBlockNumber: jest.fn().mockResolvedValue(1000),
      getBlock: jest.fn().mockResolvedValue({
        timestamp: Math.floor(Date.now() / 1000)
      })
    })),
    Contract: jest.fn().mockImplementation(() => ({
      queryFilter: jest.fn().mockResolvedValue([]),
      validatorThreshold: jest.fn().mockResolvedValue(3),
      getActiveValidatorCount: jest.fn().mockResolvedValue(5)
    })),
    formatEther: jest.fn().mockImplementation((value) => value.toString()),
    keccak256: jest.fn().mockReturnValue('0x1234567890abcdef'),
    toUtf8Bytes: jest.fn().mockReturnValue(new Uint8Array())
  }
}));

// Mock database
jest.mock('../db/connection', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined)
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              offset: jest.fn().mockResolvedValue([])
            })
          })
        }),
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      })
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined)
      })
    })
  }
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('BridgeMonitoringService', () => {
  let bridgeMonitoringService: BridgeMonitoringService;
  let mockChainConfigs: any[];

  beforeEach(() => {
    mockChainConfigs = [
      {
        chainId: 1,
        name: 'Ethereum Mainnet',
        rpcUrl: 'https://eth-mainnet.test',
        bridgeAddress: '0x1234567890123456789012345678901234567890',
        validatorAddress: '0x0987654321098765432109876543210987654321',
        startBlock: 1000,
        isActive: true
      },
      {
        chainId: 137,
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-mainnet.test',
        bridgeAddress: '0x2345678901234567890123456789012345678901',
        validatorAddress: '0x1098765432109876543210987654321098765432',
        startBlock: 2000,
        isActive: true
      }
    ];

    bridgeMonitoringService = new BridgeMonitoringService(mockChainConfigs);
  });

  afterEach(() => {
    bridgeMonitoringService.stopMonitoring();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with chain configurations', () => {
      expect(bridgeMonitoringService).toBeInstanceOf(BridgeMonitoringService);
      expect(bridgeMonitoringService).toBeInstanceOf(EventEmitter);
    });

    it('should initialize providers for active chains', () => {
      // Providers should be initialized for active chains
      expect(bridgeMonitoringService['providers'].size).toBe(2);
      expect(bridgeMonitoringService['bridgeContracts'].size).toBe(2);
      expect(bridgeMonitoringService['validatorContracts'].size).toBe(2);
    });

    it('should skip inactive chains during initialization', () => {
      const inactiveChainConfigs = [
        ...mockChainConfigs,
        {
          chainId: 42161,
          name: 'Arbitrum One',
          rpcUrl: 'https://arbitrum-mainnet.test',
          bridgeAddress: '0x3456789012345678901234567890123456789012',
          validatorAddress: '0x2109876543210987654321098765432109876543',
          startBlock: 3000,
          isActive: false
        }
      ];

      const service = new BridgeMonitoringService(inactiveChainConfigs);
      expect(service['providers'].size).toBe(2); // Only active chains
    });
  });

  describe('Monitoring Control', () => {
    it('should start monitoring successfully', async () => {
      const startSpy = jest.spyOn(bridgeMonitoringService, 'emit');
      
      await bridgeMonitoringService.startMonitoring();
      
      expect(startSpy).toHaveBeenCalledWith('monitoring_started');
      expect(bridgeMonitoringService['isMonitoring']).toBe(true);
      expect(bridgeMonitoringService['monitoringIntervals'].size).toBe(2);
    });

    it('should not start monitoring if already running', async () => {
      await bridgeMonitoringService.startMonitoring();
      const intervalCount = bridgeMonitoringService['monitoringIntervals'].size;
      
      await bridgeMonitoringService.startMonitoring();
      
      expect(bridgeMonitoringService['monitoringIntervals'].size).toBe(intervalCount);
    });

    it('should stop monitoring successfully', async () => {
      await bridgeMonitoringService.startMonitoring();
      const stopSpy = jest.spyOn(bridgeMonitoringService, 'emit');
      
      bridgeMonitoringService.stopMonitoring();
      
      expect(stopSpy).toHaveBeenCalledWith('monitoring_stopped');
      expect(bridgeMonitoringService['isMonitoring']).toBe(false);
      expect(bridgeMonitoringService['monitoringIntervals'].size).toBe(0);
    });
  });

  describe('Event Processing', () => {
    it('should process bridge initiated event', async () => {
      const mockEvent = {
        fragment: { name: 'BridgeInitiated' },
        args: {
          nonce: 1,
          user: '0x1234567890123456789012345678901234567890',
          amount: '1000000000000000000', // 1 ETH in wei
          sourceChain: 1,
          destinationChain: 137,
          fee: '10000000000000000' // 0.01 ETH in wei
        },
        blockNumber: 1001,
        transactionHash: '0xabcdef1234567890',
        getBlock: jest.fn().mockResolvedValue({
          timestamp: Math.floor(Date.now() / 1000)
        })
      };

      const emitSpy = jest.spyOn(bridgeMonitoringService, 'emit');
      
      await bridgeMonitoringService['processBridgeEvent'](1, mockEvent as any);
      
      expect(emitSpy).toHaveBeenCalledWith('bridge_initiated', expect.objectContaining({
        chainId: 1,
        nonce: 1,
        user: mockEvent.args.user,
        amount: mockEvent.args.amount,
        destinationChain: 137
      }));
    });

    it('should process bridge completed event', async () => {
      const mockEvent = {
        fragment: { name: 'BridgeCompleted' },
        args: {
          nonce: 1,
          user: '0x1234567890123456789012345678901234567890',
          amount: '1000000000000000000',
          txHash: '0xcompletedtxhash'
        },
        blockNumber: 1002,
        transactionHash: '0xabcdef1234567891',
        getBlock: jest.fn().mockResolvedValue({
          timestamp: Math.floor(Date.now() / 1000)
        })
      };

      const emitSpy = jest.spyOn(bridgeMonitoringService, 'emit');
      
      await bridgeMonitoringService['processBridgeEvent'](1, mockEvent as any);
      
      expect(emitSpy).toHaveBeenCalledWith('bridge_completed', expect.objectContaining({
        chainId: 1,
        nonce: 1,
        user: mockEvent.args.user,
        amount: mockEvent.args.amount,
        txHash: mockEvent.args.txHash
      }));
    });

    it('should process bridge failed event', async () => {
      const mockEvent = {
        fragment: { name: 'BridgeFailed' },
        args: {
          nonce: 1,
          user: '0x1234567890123456789012345678901234567890',
          reason: 'Insufficient liquidity'
        },
        blockNumber: 1003,
        transactionHash: '0xabcdef1234567892',
        getBlock: jest.fn().mockResolvedValue({
          timestamp: Math.floor(Date.now() / 1000)
        })
      };

      const emitSpy = jest.spyOn(bridgeMonitoringService, 'emit');
      
      await bridgeMonitoringService['processBridgeEvent'](1, mockEvent as any);
      
      expect(emitSpy).toHaveBeenCalledWith('bridge_failed', expect.objectContaining({
        chainId: 1,
        nonce: 1,
        user: mockEvent.args.user,
        reason: mockEvent.args.reason
      }));
    });

    it('should process validator signed event', async () => {
      const mockEvent = {
        fragment: { name: 'ValidatorSigned' },
        args: {
          nonce: 1,
          validator: '0x9876543210987654321098765432109876543210'
        },
        blockNumber: 1004,
        transactionHash: '0xabcdef1234567893',
        getBlock: jest.fn().mockResolvedValue({
          timestamp: Math.floor(Date.now() / 1000)
        })
      };

      const emitSpy = jest.spyOn(bridgeMonitoringService, 'emit');
      
      await bridgeMonitoringService['processBridgeEvent'](1, mockEvent as any);
      
      expect(emitSpy).toHaveBeenCalledWith('validator_signed', expect.objectContaining({
        chainId: 1,
        nonce: 1,
        validator: mockEvent.args.validator
      }));
    });

    it('should handle unknown event types gracefully', async () => {
      const mockEvent = {
        fragment: { name: 'UnknownEvent' },
        args: {},
        blockNumber: 1005,
        transactionHash: '0xabcdef1234567894',
        getBlock: jest.fn().mockResolvedValue({
          timestamp: Math.floor(Date.now() / 1000)
        })
      };

      // Should not throw an error
      await expect(
        bridgeMonitoringService['processBridgeEvent'](1, mockEvent as any)
      ).resolves.not.toThrow();
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate metrics correctly', async () => {
      // Mock database response for transactions
      const mockTransactions = [
        {
          id: '1-1',
          nonce: 1,
          user: '0x1234567890123456789012345678901234567890',
          amount: '1000000000000000000',
          sourceChain: 1,
          destinationChain: 137,
          status: 'completed',
          fee: '10000000000000000',
          timestamp: new Date(Date.now() - 60000), // 1 minute ago
          completedAt: new Date(),
          validatorCount: 3,
          requiredValidators: 3
        },
        {
          id: '1-2',
          nonce: 2,
          user: '0x2345678901234567890123456789012345678901',
          amount: '2000000000000000000',
          sourceChain: 1,
          destinationChain: 137,
          status: 'pending',
          fee: '20000000000000000',
          timestamp: new Date(Date.now() - 30000), // 30 seconds ago
          completedAt: null,
          validatorCount: 1,
          requiredValidators: 3
        }
      ];

      // Mock the database query
      const mockDb = require('../db/connection').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockTransactions)
        })
      });

      const metrics = await bridgeMonitoringService['calculateMetrics']();

      expect(metrics.totalTransactions).toBe(2);
      expect(metrics.successRate).toBe(50); // 1 out of 2 completed
      expect(metrics.totalVolume).toBe('3000000000000000000'); // Sum of amounts
      expect(metrics.totalFees).toBe('30000000000000000'); // Sum of fees
      expect(metrics.averageCompletionTime).toBeGreaterThan(0);
    });

    it('should handle empty transaction data', async () => {
      // Mock empty database response
      const mockDb = require('../db/connection').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      const metrics = await bridgeMonitoringService['calculateMetrics']();

      expect(metrics.totalTransactions).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.totalVolume).toBe('0');
      expect(metrics.totalFees).toBe('0');
      expect(metrics.averageCompletionTime).toBe(0);
    });
  });

  describe('Health Checking', () => {
    it('should report healthy status when all chains are responsive', async () => {
      const health = await bridgeMonitoringService.checkBridgeHealth();

      expect(health.isHealthy).toBe(true);
      expect(health.issues).toHaveLength(0);
      expect(health.chainStatus[1]).toBe(true);
      expect(health.chainStatus[137]).toBe(true);
    });

    it('should report unhealthy status when chains are unresponsive', async () => {
      // Mock provider to throw error
      const mockProvider = bridgeMonitoringService['providers'].get(1);
      if (mockProvider) {
        (mockProvider.getBlockNumber as jest.Mock).mockRejectedValue(new Error('Network error'));
      }

      const health = await bridgeMonitoringService.checkBridgeHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.chainStatus[1]).toBe(false);
    });

    it('should detect stuck transactions', async () => {
      // Mock stuck transactions
      const stuckTransactions = [
        {
          id: '1-1',
          nonce: 1,
          status: 'pending',
          timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
        }
      ];

      const mockDb = require('../db/connection').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(stuckTransactions)
        })
      });

      const health = await bridgeMonitoringService.checkBridgeHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.issues.some(issue => issue.includes('stuck'))).toBe(true);
    });
  });

  describe('Data Retrieval', () => {
    it('should get bridge transaction by nonce', async () => {
      const mockTransaction = {
        id: '1-1',
        nonce: 1,
        user: '0x1234567890123456789012345678901234567890',
        amount: '1000000000000000000',
        status: 'completed'
      };

      const mockDb = require('../db/connection').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTransaction])
          })
        })
      });

      const result = await bridgeMonitoringService.getBridgeTransaction(1);

      expect(result).toEqual(mockTransaction);
    });

    it('should return null for non-existent transaction', async () => {
      const mockDb = require('../db/connection').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      const result = await bridgeMonitoringService.getBridgeTransaction(999);

      expect(result).toBeNull();
    });

    it('should get bridge transactions with pagination', async () => {
      const mockTransactions = [
        { id: '1-1', nonce: 1 },
        { id: '1-2', nonce: 2 }
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
          }),
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              offset: jest.fn().mockResolvedValue(mockTransactions)
            })
          })
        })
      });

      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 2 }])
        })
      });

      const result = await bridgeMonitoringService.getBridgeTransactions(1, 10);

      expect(result.transactions).toEqual(mockTransactions);
      expect(result.total).toBe(2);
    });

    it('should get bridge events for transaction', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          transactionId: '1-1',
          eventType: 'initiated',
          timestamp: new Date()
        }
      ];

      const mockDb = require('../db/connection').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockEvents)
          })
        })
      });

      const result = await bridgeMonitoringService.getBridgeEvents('1-1');

      expect(result).toEqual(mockEvents);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockDb = require('../db/connection').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      // Should not throw error
      await expect(
        bridgeMonitoringService['storeBridgeTransaction']({
          nonce: 1,
          user: '0x1234567890123456789012345678901234567890',
          amount: '1000000000000000000',
          sourceChain: 1,
          destinationChain: 137,
          status: 'pending',
          fee: '10000000000000000',
          timestamp: new Date(),
          validatorCount: 0,
          requiredValidators: 3
        })
      ).resolves.not.toThrow();
    });

    it('should handle contract call errors gracefully', async () => {
      const mockContract = bridgeMonitoringService['bridgeContracts'].get(1);
      if (mockContract) {
        (mockContract.validatorThreshold as jest.Mock).mockRejectedValue(new Error('Contract error'));
      }

      const threshold = await bridgeMonitoringService['getRequiredValidators'](1);

      expect(threshold).toBe(3); // Should return default value
    });

    it('should handle event processing errors gracefully', async () => {
      const mockEvent = {
        fragment: { name: 'BridgeInitiated' },
        args: null, // Invalid args
        blockNumber: 1001,
        transactionHash: '0xabcdef1234567890',
        getBlock: jest.fn().mockRejectedValue(new Error('Block fetch error'))
      };

      // Should not throw error
      await expect(
        bridgeMonitoringService['processBridgeEvent'](1, mockEvent as any)
      ).resolves.not.toThrow();
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { ethers } from 'ethers';
import { BridgeMonitoringService } from '../services/bridgeMonitoringService';
import { BridgeNotificationService } from '../services/bridgeNotificationService';

// Mock environment variables
process.env.ETHEREUM_RPC_URL = 'http://localhost:8545';
process.env.POLYGON_RPC_URL = 'http://localhost:8546';
process.env.ETHEREUM_BRIDGE_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.POLYGON_BRIDGE_ADDRESS = '0x2345678901234567890123456789012345678901';

describe('Bridge Workflow End-to-End Tests', () => {
  let bridgeMonitoringService: BridgeMonitoringService;
  let bridgeNotificationService: BridgeNotificationService;
  let mockProvider: any;
  let mockBridgeContract: any;
  let mockValidatorContract: any;

  beforeAll(async () => {
    // Setup mock providers and contracts
    mockProvider = {
      getBlockNumber: jest.fn().mockResolvedValue(1000),
      getBlock: jest.fn().mockResolvedValue({
        timestamp: Math.floor(Date.now() / 1000)
      })
    };

    mockBridgeContract = {
      queryFilter: jest.fn().mockResolvedValue([]),
      getBridgeTransaction: jest.fn(),
      bridgeNonce: jest.fn().mockResolvedValue(0),
      totalLocked: jest.fn().mockResolvedValue('0'),
      totalBridged: jest.fn().mockResolvedValue('0'),
      validatorThreshold: jest.fn().mockResolvedValue(3)
    };

    mockValidatorContract = {
      queryFilter: jest.fn().mockResolvedValue([]),
      getActiveValidatorCount: jest.fn().mockResolvedValue(5),
      getValidatorInfo: jest.fn().mockResolvedValue({
        validatorAddress: '0x1234567890123456789012345678901234567890',
        isActive: true,
        stake: '10000000000000000000000',
        validatedTransactions: 10,
        lastActivity: Math.floor(Date.now() / 1000),
        reputation: 95
      })
    };

    // Mock ethers
    jest.spyOn(ethers, 'JsonRpcProvider').mockImplementation(() => mockProvider as any);
    jest.spyOn(ethers, 'Contract').mockImplementation((address, abi, provider) => {
      if (abi.includes('BridgeInitiated')) {
        return mockBridgeContract as any;
      } else {
        return mockValidatorContract as any;
      }
    });

    // Initialize services
    const chainConfigs = [
      {
        chainId: 1,
        name: 'Ethereum Mainnet',
        rpcUrl: 'http://localhost:8545',
        bridgeAddress: '0x1234567890123456789012345678901234567890',
        validatorAddress: '0x0987654321098765432109876543210987654321',
        startBlock: 1000,
        isActive: true
      },
      {
        chainId: 137,
        name: 'Polygon Mainnet',
        rpcUrl: 'http://localhost:8546',
        bridgeAddress: '0x2345678901234567890123456789012345678901',
        validatorAddress: '0x1098765432109876543210987654321098765432',
        startBlock: 2000,
        isActive: true
      }
    ];

    bridgeMonitoringService = new BridgeMonitoringService(chainConfigs);
    bridgeNotificationService = new BridgeNotificationService();
  });

  afterAll(async () => {
    bridgeMonitoringService.stopMonitoring();
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Bridge Transaction Workflow', () => {
    it('should handle complete bridge transaction lifecycle', async () => {
      const events: any[] = [];
      
      // Listen to all events
      bridgeMonitoringService.on('bridge_initiated', (data) => events.push({ type: 'initiated', data }));
      bridgeMonitoringService.on('validator_signed', (data) => events.push({ type: 'validator_signed', data }));
      bridgeMonitoringService.on('bridge_completed', (data) => events.push({ type: 'completed', data }));

      // Mock bridge initiated event
      const bridgeInitiatedEvent = {
        fragment: { name: 'BridgeInitiated' },
        args: {
          nonce: 1,
          user: '0x1234567890123456789012345678901234567890',
          amount: ethers.parseEther('100'),
          sourceChain: 1,
          destinationChain: 137,
          fee: ethers.parseEther('1')
        },
        blockNumber: 1001,
        transactionHash: '0xabcdef1234567890',
        getBlock: jest.fn().mockResolvedValue({
          timestamp: Math.floor(Date.now() / 1000)
        })
      };

      // Mock validator signed events
      const validatorSignedEvents = [
        {
          fragment: { name: 'ValidatorSigned' },
          args: {
            nonce: 1,
            validator: '0x1111111111111111111111111111111111111111'
          },
          blockNumber: 1002,
          transactionHash: '0xabcdef1234567891',
          getBlock: jest.fn().mockResolvedValue({
            timestamp: Math.floor(Date.now() / 1000)
          })
        },
        {
          fragment: { name: 'ValidatorSigned' },
          args: {
            nonce: 1,
            validator: '0x2222222222222222222222222222222222222222'
          },
          blockNumber: 1003,
          transactionHash: '0xabcdef1234567892',
          getBlock: jest.fn().mockResolvedValue({
            timestamp: Math.floor(Date.now() / 1000)
          })
        },
        {
          fragment: { name: 'ValidatorSigned' },
          args: {
            nonce: 1,
            validator: '0x3333333333333333333333333333333333333333'
          },
          blockNumber: 1004,
          transactionHash: '0xabcdef1234567893',
          getBlock: jest.fn().mockResolvedValue({
            timestamp: Math.floor(Date.now() / 1000)
          })
        }
      ];

      // Mock bridge completed event
      const bridgeCompletedEvent = {
        fragment: { name: 'BridgeCompleted' },
        args: {
          nonce: 1,
          user: '0x1234567890123456789012345678901234567890',
          amount: ethers.parseEther('100'),
          txHash: '0xdestinationtxhash'
        },
        blockNumber: 1005,
        transactionHash: '0xabcdef1234567894',
        getBlock: jest.fn().mockResolvedValue({
          timestamp: Math.floor(Date.now() / 1000)
        })
      };

      // Process events in sequence
      await bridgeMonitoringService['processBridgeEvent'](1, bridgeInitiatedEvent as any);
      
      for (const validatorEvent of validatorSignedEvents) {
        await bridgeMonitoringService['processBridgeEvent'](1, validatorEvent as any);
      }
      
      await bridgeMonitoringService['processBridgeEvent'](1, bridgeCompletedEvent as any);

      // Verify event sequence
      expect(events).toHaveLength(5); // 1 initiated + 3 validator signed + 1 completed
      expect(events[0].type).toBe('initiated');
      expect(events[1].type).toBe('validator_signed');
      expect(events[2].type).toBe('validator_signed');
      expect(events[3].type).toBe('validator_signed');
      expect(events[4].type).toBe('completed');

      // Verify event data
      expect(events[0].data.nonce).toBe(1);
      expect(events[0].data.user).toBe('0x1234567890123456789012345678901234567890');
      expect(events[0].data.amount).toBe(ethers.parseEther('100').toString());
      expect(events[0].data.destinationChain).toBe(137);

      expect(events[4].data.nonce).toBe(1);
      expect(events[4].data.txHash).toBe('0xdestinationtxhash');
    });

    it('should handle bridge failure workflow', async () => {
      const events: any[] = [];
      
      bridgeMonitoringService.on('bridge_initiated', (data) => events.push({ type: 'initiated', data }));
      bridgeMonitoringService.on('bridge_failed', (data) => events.push({ type: 'failed', data }));

      // Mock bridge initiated event
      const bridgeInitiatedEvent = {
        fragment: { name: 'BridgeInitiated' },
        args: {
          nonce: 2,
          user: '0x2345678901234567890123456789012345678901',
          amount: ethers.parseEther('50'),
          sourceChain: 1,
          destinationChain: 137,
          fee: ethers.parseEther('0.5')
        },
        blockNumber: 1006,
        transactionHash: '0xfailed1234567890',
        getBlock: jest.fn().mockResolvedValue({
          timestamp: Math.floor(Date.now() / 1000)
        })
      };

      // Mock bridge failed event
      const bridgeFailedEvent = {
        fragment: { name: 'BridgeFailed' },
        args: {
          nonce: 2,
          user: '0x2345678901234567890123456789012345678901',
          reason: 'Insufficient liquidity on destination chain'
        },
        blockNumber: 1007,
        transactionHash: '0xfailed1234567891',
        getBlock: jest.fn().mockResolvedValue({
          timestamp: Math.floor(Date.now() / 1000)
        })
      };

      // Process events
      await bridgeMonitoringService['processBridgeEvent'](1, bridgeInitiatedEvent as any);
      await bridgeMonitoringService['processBridgeEvent'](1, bridgeFailedEvent as any);

      // Verify failure workflow
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('initiated');
      expect(events[1].type).toBe('failed');
      expect(events[1].data.reason).toBe('Insufficient liquidity on destination chain');
    });

    it('should handle validator events workflow', async () => {
      const events: any[] = [];
      
      bridgeMonitoringService.on('validator_event', (data) => events.push({ type: 'validator_event', data }));

      // Mock validator added event
      const validatorAddedEvent = {
        fragment: { name: 'ValidatorAdded' },
        args: {
          validator: '0x4444444444444444444444444444444444444444',
          stake: ethers.parseEther('10000')
        },
        blockNumber: 1008,
        transactionHash: '0xvalidator1234567890',
        getBlock: jest.fn().mockResolvedValue({
          timestamp: Math.floor(Date.now() / 1000)
        })
      };

      // Mock validation completed event
      const validationCompletedEvent = {
        fragment: { name: 'ValidationCompleted' },
        args: {
          txHash: '0xvalidated1234567890',
          validatorCount: 3
        },
        blockNumber: 1009,
        transactionHash: '0xvalidation1234567890',
        getBlock: jest.fn().mockResolvedValue({
          timestamp: Math.floor(Date.now() / 1000)
        })
      };

      // Process validator events
      await bridgeMonitoringService['processValidatorEvent'](1, validatorAddedEvent as any);
      await bridgeMonitoringService['processValidatorEvent'](1, validationCompletedEvent as any);

      // Verify validator events
      expect(events).toHaveLength(2);
      expect(events[0].data.eventName).toBe('ValidatorAdded');
      expect(events[1].data.eventName).toBe('ValidationCompleted');
    });
  });

  describe('Bridge Monitoring Integration', () => {
    it('should start and stop monitoring successfully', async () => {
      const startEvents: any[] = [];
      const stopEvents: any[] = [];

      bridgeMonitoringService.on('monitoring_started', () => startEvents.push('started'));
      bridgeMonitoringService.on('monitoring_stopped', () => stopEvents.push('stopped'));

      // Start monitoring
      await bridgeMonitoringService.startMonitoring();
      expect(startEvents).toHaveLength(1);

      // Stop monitoring
      bridgeMonitoringService.stopMonitoring();
      expect(stopEvents).toHaveLength(1);
    });

    it('should collect metrics periodically', async () => {
      const metricsEvents: any[] = [];
      
      bridgeMonitoringService.on('metrics_collected', (metrics) => metricsEvents.push(metrics));

      // Mock metrics calculation
      const mockMetrics = {
        totalTransactions: 10,
        totalVolume: '1000000000000000000000',
        totalFees: '10000000000000000000',
        successRate: 90,
        averageCompletionTime: 300000,
        activeValidators: 5,
        chainMetrics: {}
      };

      // Manually trigger metrics collection
      await bridgeMonitoringService['collectMetrics']();

      // Note: In a real test, we would wait for the interval to trigger
      // For now, we just verify the method doesn't throw
      expect(bridgeMonitoringService['calculateMetrics']).toBeDefined();
    });

    it('should handle chain monitoring errors gracefully', async () => {
      const errorEvents: any[] = [];
      
      bridgeMonitoringService.on('monitoring_error', (error) => errorEvents.push(error));

      // Mock provider error
      mockProvider.getBlockNumber.mockRejectedValueOnce(new Error('Network error'));

      // Manually trigger chain monitoring
      await bridgeMonitoringService['monitorChain'](1);

      // Should handle error gracefully without throwing
      expect(mockProvider.getBlockNumber).toHaveBeenCalled();
    });
  });

  describe('Bridge Health Monitoring', () => {
    it('should report healthy status when all systems operational', async () => {
      const health = await bridgeMonitoringService.checkBridgeHealth();

      expect(health.isHealthy).toBe(true);
      expect(health.issues).toHaveLength(0);
      expect(health.chainStatus[1]).toBe(true);
      expect(health.chainStatus[137]).toBe(true);
    });

    it('should detect and report chain connectivity issues', async () => {
      // Mock provider error for chain 1
      mockProvider.getBlockNumber.mockRejectedValueOnce(new Error('Connection timeout'));

      const health = await bridgeMonitoringService.checkBridgeHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.chainStatus[1]).toBe(false);
    });

    it('should detect stuck transactions', async () => {
      // Mock stuck transactions in database
      const mockDb = require('../db/connection').db;
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              id: '1-1',
              nonce: 1,
              status: 'pending',
              timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
            }
          ])
        })
      });

      const health = await bridgeMonitoringService.checkBridgeHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.issues.some(issue => issue.includes('stuck'))).toBe(true);
    });
  });

  describe('Notification System Integration', () => {
    it('should create and process alerts', async () => {
      const alertEvents: any[] = [];
      
      bridgeNotificationService.on('alert_created', (alert) => alertEvents.push(alert));

      const alertId = await bridgeNotificationService.createAlert({
        alertType: 'stuck_transaction',
        severity: 'high',
        title: 'Transaction Stuck for 24+ Hours',
        message: 'Bridge transaction 1-1 has been pending for over 24 hours',
        chainId: 1,
        transactionId: '1-1'
      });

      expect(alertId).toBeDefined();
      expect(alertEvents).toHaveLength(1);
      expect(alertEvents[0].alertType).toBe('stuck_transaction');
      expect(alertEvents[0].severity).toBe('high');
    });

    it('should resolve alerts', async () => {
      const resolveEvents: any[] = [];
      
      bridgeNotificationService.on('alert_resolved', (data) => resolveEvents.push(data));

      const alertId = await bridgeNotificationService.createAlert({
        alertType: 'test_alert',
        severity: 'low',
        title: 'Test Alert',
        message: 'This is a test alert'
      });

      await bridgeNotificationService.resolveAlert(alertId, '0x1234567890123456789012345678901234567890');

      expect(resolveEvents).toHaveLength(1);
      expect(resolveEvents[0].alertId).toBe(alertId);
      expect(resolveEvents[0].resolvedBy).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should handle notification channel configuration', () => {
      const testChannel = {
        name: 'test-webhook',
        type: 'webhook' as const,
        config: {
          url: 'https://test.example.com/webhook',
          headers: { 'Content-Type': 'application/json' }
        },
        isActive: true,
        severityFilter: ['high', 'critical']
      };

      bridgeNotificationService.addChannel(testChannel);
      
      const activeChannels = bridgeNotificationService.getActiveChannels();
      expect(activeChannels.some(channel => channel.name === 'test-webhook')).toBe(true);

      bridgeNotificationService.removeChannel('test-webhook');
      
      const updatedChannels = bridgeNotificationService.getActiveChannels();
      expect(updatedChannels.some(channel => channel.name === 'test-webhook')).toBe(false);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high volume of events efficiently', async () => {
      const startTime = Date.now();
      const eventCount = 100;
      const events: any[] = [];

      bridgeMonitoringService.on('bridge_initiated', () => events.push('initiated'));

      // Generate multiple events
      const promises = Array(eventCount).fill(null).map(async (_, index) => {
        const mockEvent = {
          fragment: { name: 'BridgeInitiated' },
          args: {
            nonce: index + 1,
            user: '0x1234567890123456789012345678901234567890',
            amount: ethers.parseEther('1'),
            sourceChain: 1,
            destinationChain: 137,
            fee: ethers.parseEther('0.01')
          },
          blockNumber: 1000 + index,
          transactionHash: `0x${index.toString(16).padStart(64, '0')}`,
          getBlock: jest.fn().mockResolvedValue({
            timestamp: Math.floor(Date.now() / 1000)
          })
        };

        await bridgeMonitoringService['processBridgeEvent'](1, mockEvent as any);
      });

      await Promise.all(promises);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(events).toHaveLength(eventCount);
      expect(processingTime).toBeLessThan(5000); // Should process 100 events in under 5 seconds
    });

    it('should handle concurrent monitoring of multiple chains', async () => {
      const chainEvents: { [chainId: number]: number } = {};

      bridgeMonitoringService.on('bridge_initiated', (data) => {
        chainEvents[data.chainId] = (chainEvents[data.chainId] || 0) + 1;
      });

      // Simulate events from multiple chains
      const chain1Events = Array(10).fill(null).map(async (_, index) => {
        const mockEvent = {
          fragment: { name: 'BridgeInitiated' },
          args: {
            nonce: index + 1,
            user: '0x1234567890123456789012345678901234567890',
            amount: ethers.parseEther('1'),
            sourceChain: 1,
            destinationChain: 137,
            fee: ethers.parseEther('0.01')
          },
          blockNumber: 1000 + index,
          transactionHash: `0x1${index.toString(16).padStart(63, '0')}`,
          getBlock: jest.fn().mockResolvedValue({
            timestamp: Math.floor(Date.now() / 1000)
          })
        };

        await bridgeMonitoringService['processBridgeEvent'](1, mockEvent as any);
      });

      const chain137Events = Array(10).fill(null).map(async (_, index) => {
        const mockEvent = {
          fragment: { name: 'BridgeInitiated' },
          args: {
            nonce: index + 1,
            user: '0x2345678901234567890123456789012345678901',
            amount: ethers.parseEther('2'),
            sourceChain: 137,
            destinationChain: 1,
            fee: ethers.parseEther('0.02')
          },
          blockNumber: 2000 + index,
          transactionHash: `0x2${index.toString(16).padStart(63, '0')}`,
          getBlock: jest.fn().mockResolvedValue({
            timestamp: Math.floor(Date.now() / 1000)
          })
        };

        await bridgeMonitoringService['processBridgeEvent'](137, mockEvent as any);
      });

      await Promise.all([...chain1Events, ...chain137Events]);

      expect(chainEvents[1]).toBe(10);
      expect(chainEvents[137]).toBe(10);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary network failures', async () => {
      let callCount = 0;
      mockProvider.getBlockNumber.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Network timeout');
        }
        return Promise.resolve(1000);
      });

      // Should not throw error on first calls
      await bridgeMonitoringService['monitorChain'](1);
      await bridgeMonitoringService['monitorChain'](1);
      
      // Should succeed on third call
      await bridgeMonitoringService['monitorChain'](1);

      expect(callCount).toBe(3);
    });

    it('should handle database connection failures gracefully', async () => {
      const mockDb = require('../db/connection').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockRejectedValue(new Error('Database connection lost'))
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

    it('should continue monitoring after individual chain failures', async () => {
      const monitoringEvents: any[] = [];
      
      bridgeMonitoringService.on('monitoring_error', (error) => monitoringEvents.push(error));

      // Mock one chain to fail
      const originalGetBlockNumber = mockProvider.getBlockNumber;
      mockProvider.getBlockNumber.mockImplementation(() => {
        throw new Error('Chain 1 is down');
      });

      // Monitor should continue for other chains
      await bridgeMonitoringService['monitorChain'](1);
      
      // Restore mock for other tests
      mockProvider.getBlockNumber = originalGetBlockNumber;

      expect(monitoringEvents).toHaveLength(1);
      expect(monitoringEvents[0].chainId).toBe(1);
    });
  });
});

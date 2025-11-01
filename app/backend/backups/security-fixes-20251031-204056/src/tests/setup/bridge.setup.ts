import { jest } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';

// Global test setup for bridge tests
beforeAll(async () => {
  // Setup test database connection
  // This would typically initialize a test database
  safeLogger.info('Setting up bridge test environment...');
});

afterAll(async () => {
  // Cleanup test database
  safeLogger.info('Cleaning up bridge test environment...');
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Reset any test state
  jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  createMockBridgeTransaction: (overrides = {}) => ({
    id: '1-1',
    nonce: 1,
    user: '0x1234567890123456789012345678901234567890',
    amount: '1000000000000000000',
    sourceChain: 1,
    destinationChain: 137,
    status: 'pending',
    fee: '10000000000000000',
    timestamp: new Date(),
    validatorCount: 0,
    requiredValidators: 3,
    ...overrides
  }),

  createMockBridgeEvent: (overrides = {}) => ({
    id: 'event-1',
    transactionId: '1-1',
    eventType: 'initiated',
    blockNumber: 1001,
    txHash: '0xabcdef1234567890',
    timestamp: new Date(),
    data: {},
    ...overrides
  }),

  createMockChainConfig: (overrides = {}) => ({
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'http://localhost:8545',
    bridgeAddress: '0x1234567890123456789012345678901234567890',
    validatorAddress: '0x0987654321098765432109876543210987654321',
    startBlock: 1000,
    isActive: true,
    ...overrides
  }),

  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  waitForEvent: (emitter: any, eventName: string, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event ${eventName} not emitted within ${timeout}ms`));
      }, timeout);

      emitter.once(eventName, (data: any) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }
};

// Extend Jest matchers for bridge-specific assertions
expect.extend({
  toBeBridgeTransaction(received: any) {
    const requiredFields = ['id', 'nonce', 'user', 'amount', 'sourceChain', 'destinationChain', 'status'];
    const missingFields = requiredFields.filter(field => !(field in received));
    
    if (missingFields.length > 0) {
      return {
        message: () => `Expected object to be a bridge transaction, but missing fields: ${missingFields.join(', ')}`,
        pass: false
      };
    }

    return {
      message: () => 'Expected object not to be a bridge transaction',
      pass: true
    };
  },

  toBeBridgeEvent(received: any) {
    const requiredFields = ['id', 'transactionId', 'eventType', 'blockNumber', 'txHash', 'timestamp'];
    const missingFields = requiredFields.filter(field => !(field in received));
    
    if (missingFields.length > 0) {
      return {
        message: () => `Expected object to be a bridge event, but missing fields: ${missingFields.join(', ')}`,
        pass: false
      };
    }

    return {
      message: () => 'Expected object not to be a bridge event',
      pass: true
    };
  },

  toBeValidEthereumAddress(received: string) {
    const isValid = typeof received === 'string' && 
                   received.length === 42 && 
                   received.startsWith('0x') &&
                   /^0x[a-fA-F0-9]{40}$/.test(received);

    if (!isValid) {
      return {
        message: () => `Expected ${received} to be a valid Ethereum address`,
        pass: false
      };
    }

    return {
      message: () => `Expected ${received} not to be a valid Ethereum address`,
      pass: true
    };
  }
});

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeBridgeTransaction(): R;
      toBeBridgeEvent(): R;
      toBeValidEthereumAddress(): R;
    }
  }

  var testUtils: {
    createMockBridgeTransaction: (overrides?: any) => any;
    createMockBridgeEvent: (overrides?: any) => any;
    createMockChainConfig: (overrides?: any) => any;
    sleep: (ms: number) => Promise<void>;
    waitForEvent: (emitter: any, eventName: string, timeout?: number) => Promise<any>;
  };
}
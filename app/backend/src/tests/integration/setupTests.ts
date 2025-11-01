/**
 * Setup Tests for Integration Tests
 * 
 * Configures the test environment for each test file.
 * This runs before each test file and sets up common utilities and matchers.
 */

import { testDataFactory } from '../fixtures/testDataFactory';

// Extend Jest matchers
expect.extend({
  toBeValidApiResponse(received: any) {
    const pass = received &&
      typeof received === 'object' &&
      typeof received.success === 'boolean' &&
      received.metadata &&
      typeof received.metadata.timestamp === 'string' &&
      typeof received.metadata.requestId === 'string';

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid API response with success, metadata.timestamp, and metadata.requestId`,
        pass: false,
      };
    }
  },

  toBeValidPaginationResponse(received: any) {
    const pass = received &&
      received.metadata &&
      received.metadata.pagination &&
      typeof received.metadata.pagination.page === 'number' &&
      typeof received.metadata.pagination.limit === 'number' &&
      typeof received.metadata.pagination.total === 'number' &&
      typeof received.metadata.pagination.totalPages === 'number' &&
      typeof received.metadata.pagination.hasNext === 'boolean' &&
      typeof received.metadata.pagination.hasPrev === 'boolean';

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to have valid pagination`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to have valid pagination metadata`,
        pass: false,
      };
    }
  },

  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = typeof received === 'string' && jwtRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT token`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT token`,
        pass: false,
      };
    }
  },

  toBeValidEthereumAddress(received: string) {
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    const pass = typeof received === 'string' && ethAddressRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Ethereum address`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Ethereum address`,
        pass: false,
      };
    }
  },

  toHaveValidTimestamp(received: any, field: string = 'timestamp') {
    const timestamp = field.split('.').reduce((obj, key) => obj?.[key], received);
    const pass = timestamp && !isNaN(Date.parse(timestamp));

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to have valid timestamp at ${field}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to have valid timestamp at ${field}`,
        pass: false,
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  // Create test data
  createTestUser: () => testDataFactory.createUser(),
  createTestSeller: () => testDataFactory.createSeller(),
  createTestProduct: () => testDataFactory.createProduct(),
  createValidSignature: () => testDataFactory.createValidSignature(),

  // Wait utility
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Random data generators
  randomString: (length: number = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  randomEmail: () => {
    return `test-${global.testUtils.randomString(8)}@example.com`;
  },

  randomEthAddress: () => {
    return '0x' + global.testUtils.randomString(40).toLowerCase();
  },

  // Validation utilities
  isValidApiResponse: (response: any) => {
    return response &&
      typeof response === 'object' &&
      typeof response.success === 'boolean' &&
      response.metadata &&
      typeof response.metadata.timestamp === 'string' &&
      typeof response.metadata.requestId === 'string';
  },

  isValidJWT: (token: string) => {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    return typeof token === 'string' && jwtRegex.test(token);
  },

  // HTTP status code helpers
  isSuccessStatus: (status: number) => status >= 200 && status < 300,
  isClientErrorStatus: (status: number) => status >= 400 && status < 500,
  isServerErrorStatus: (status: number) => status >= 500 && status < 600,

  // Test data cleanup
  cleanupTestData: () => {
    // Clear any test data that might persist between tests
    if (global.__TEST_CACHE__) {
      global.__TEST_CACHE__.clear();
    }
  }
};

// Setup test environment for each test file
beforeAll(async () => {
  // Initialize test-specific data
  global.__TEST_CACHE__ = new Map();
  global.__TEST_TIMERS__ = [];
  global.__TEST_INTERVALS__ = [];
  global.__TEST_HANDLES__ = [];
});

// Cleanup after each test file
afterAll(async () => {
  // Clean up test data
  global.testUtils.cleanupTestData();
  
  // Clear timers and intervals
  if (global.__TEST_TIMERS__) {
    global.__TEST_TIMERS__.forEach(timer => clearTimeout(timer));
    global.__TEST_TIMERS__ = [];
  }
  
  if (global.__TEST_INTERVALS__) {
    global.__TEST_INTERVALS__.forEach(interval => clearInterval(interval));
    global.__TEST_INTERVALS__ = [];
  }
  
  // Close handles
  if (global.__TEST_HANDLES__) {
    global.__TEST_HANDLES__.forEach(handle => {
      if (handle && typeof handle.close === 'function') {
        handle.close();
      }
    });
    global.__TEST_HANDLES__ = [];
  }
});

// Setup for each individual test
beforeEach(() => {
  // Reset any per-test state
  jest.clearAllMocks();
});

// Cleanup after each individual test
afterEach(() => {
  // Clean up any test-specific resources
  global.testUtils.cleanupTestData();
});

// Console override for cleaner test output
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: process.env.TEST_VERBOSE === 'true' ? originalConsole.log : () => {},
  info: process.env.TEST_VERBOSE === 'true' ? originalConsole.info : () => {},
  warn: originalConsole.warn,
  error: originalConsole.error,
  debug: process.env.TEST_VERBOSE === 'true' ? originalConsole.debug : () => {}
};

// Extend global types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidApiResponse(): R;
      toBeValidPaginationResponse(): R;
      toBeValidJWT(): R;
      toBeValidEthereumAddress(): R;
      toHaveValidTimestamp(field?: string): R;
    }
  }

  var testUtils: {
    createTestUser: () => any;
    createTestSeller: () => any;
    createTestProduct: () => any;
    createValidSignature: () => string;
    wait: (ms: number) => Promise<void>;
    randomString: (length?: number) => string;
    randomEmail: () => string;
    randomEthAddress: () => string;
    isValidApiResponse: (response: any) => boolean;
    isValidJWT: (token: string) => boolean;
    isSuccessStatus: (status: number) => boolean;
    isClientErrorStatus: (status: number) => boolean;
    isServerErrorStatus: (status: number) => boolean;
    cleanupTestData: () => void;
  };

  var __TEST_CACHE__: Map<string, any>;
  var __TEST_TIMERS__: NodeJS.Timeout[];
  var __TEST_INTERVALS__: NodeJS.Timeout[];
  var __TEST_HANDLES__: any[];
}

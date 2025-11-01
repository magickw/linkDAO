/**
 * Jest Setup for Comprehensive Tests
 * 
 * Custom matchers and utilities for comprehensive testing
 */

import { expect } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveValidEthereumAddress(received: string) {
    const pass = /^0x[a-fA-F0-9]{40}$/.test(received);
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

  toHaveValidTransactionHash(received: string) {
    const pass = /^0x[a-fA-F0-9]{64}$/.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid transaction hash`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid transaction hash`,
        pass: false,
      };
    }
  },

  toHaveValidIPFSHash(received: string) {
    const pass = /^Qm[a-zA-Z0-9]{44}$/.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid IPFS hash`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid IPFS hash`,
        pass: false,
      };
    }
  },

  toHaveValidUUID(received: string) {
    const pass = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toHaveValidEmail(received: string) {
    const pass = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toHaveResponseTimeBelow(received: number, threshold: number) {
    const pass = received < threshold;
    if (pass) {
      return {
        message: () => `expected response time ${received}ms not to be below ${threshold}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response time ${received}ms to be below ${threshold}ms`,
        pass: false,
      };
    }
  },

  toHaveCoverageAbove(received: number, threshold: number) {
    const pass = received > threshold;
    if (pass) {
      return {
        message: () => `expected coverage ${received}% not to be above ${threshold}%`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected coverage ${received}% to be above ${threshold}%`,
        pass: false,
      };
    }
  }
});

// Extend Jest matchers type definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toHaveValidEthereumAddress(): R;
      toHaveValidTransactionHash(): R;
      toHaveValidIPFSHash(): R;
      toHaveValidUUID(): R;
      toHaveValidEmail(): R;
      toHaveResponseTimeBelow(threshold: number): R;
      toHaveCoverageAbove(threshold: number): R;
    }
  }
}

// Global test utilities
global.testUtils = {
  generateRandomAddress: (): string => {
    return '0x' + Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  },

  generateRandomHash: (): string => {
    return '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  },

  generateRandomUUID: (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  sleep: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  retry: async <T>(
    fn: () => Promise<T>, 
    maxAttempts: number = 3, 
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxAttempts) {
          await global.testUtils.sleep(delay);
        }
      }
    }
    
    throw lastError!;
  },

  measureExecutionTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  }
};

// Declare global test utilities type
declare global {
  var testUtils: {
    generateRandomAddress(): string;
    generateRandomHash(): string;
    generateRandomUUID(): string;
    sleep(ms: number): Promise<void>;
    retry<T>(fn: () => Promise<T>, maxAttempts?: number, delay?: number): Promise<T>;
    measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }>;
  };
}

// Console override for test output control
const originalConsole = { ...console };

if (process.env.LOG_LEVEL === 'error') {
  safeLogger.info = () => {};
  safeLogger.info = () => {};
  safeLogger.warn = () => {};
  console.debug = () => {};
}

// Restore console for teardown
global.restoreConsole = () => {
  Object.assign(console, originalConsole);
};

export {};
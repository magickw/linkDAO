/**
 * Infrastructure Tests Setup
 * Global setup for infrastructure testing environment
 */

import { config } from 'dotenv';
import { safeLogger } from '../../utils/safeLogger';
import path from 'path';

// Load test environment variables
config({ path: path.join(__dirname, '../../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';

// Mock console methods to reduce noise in tests
const originalConsoleLog = safeLogger.info;
const originalConsoleWarn = safeLogger.warn;
const originalConsoleError = safeLogger.error;

// Only show errors and important logs during tests
safeLogger.info = (...args: any[]) => {
  if (process.env.VERBOSE_TESTS === 'true') {
    originalConsoleLog(...args);
  }
};

safeLogger.warn = (...args: any[]) => {
  if (process.env.VERBOSE_TESTS === 'true') {
    originalConsoleWarn(...args);
  }
};

safeLogger.error = (...args: any[]) => {
  // Always show errors
  originalConsoleError(...args);
};

// Global test timeout
jest.setTimeout(30000);

// Mock fetch for tests that don't need real HTTP requests
global.fetch = jest.fn();

// Mock WebSocket for tests
global.WebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock sessionStorage
Object.defineProperty(global, 'sessionStorage', {
  value: localStorageMock,
  writable: true
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: {
      register: jest.fn(),
      getRegistration: jest.fn(),
      ready: Promise.resolve({
        active: {
          postMessage: jest.fn()
        }
      })
    },
    storage: {
      estimate: jest.fn().mockResolvedValue({
        usage: 1000,
        quota: 10000
      })
    },
    userAgent: 'test-agent'
  },
  writable: true
});

// Mock caches API
const mockCache = {
  match: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn().mockResolvedValue([])
};

Object.defineProperty(global, 'caches', {
  value: {
    open: jest.fn().mockResolvedValue(mockCache),
    delete: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
    match: jest.fn()
  },
  writable: true
});

// Mock crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockImplementation((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      generateKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      exportKey: jest.fn(),
      importKey: jest.fn()
    }
  },
  writable: true
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  safeLogger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Cleanup function for after each test
afterEach(() => {
  jest.clearAllMocks();
  
  // Clear localStorage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Clear fetch mock
  if (global.fetch && typeof global.fetch === 'function') {
    (global.fetch as jest.Mock).mockClear();
  }
});

// Global teardown
afterAll(() => {
  // Restore console methods
  safeLogger.info = originalConsoleLog;
  safeLogger.warn = originalConsoleWarn;
  safeLogger.error = originalConsoleError;
});

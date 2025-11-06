/**
 * Test setup for connectivity tests
 * Provides common utilities and setup for testing connectivity features
 */

import { expect } from '@jest/globals';
import { beforeEach } from '@jest/globals';
import { afterEach } from '@jest/globals';
import { beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeEach(() => {
  // Mock console methods but allow them to be overridden in individual tests
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Mock window.addEventListener and removeEventListener
const mockEventListeners: { [key: string]: EventListener[] } = {};

Object.defineProperty(window, 'addEventListener', {
  value: jest.fn((event: string, callback: EventListener) => {
    if (!mockEventListeners[event]) {
      mockEventListeners[event] = [];
    }
    mockEventListeners[event].push(callback);
  }),
});

Object.defineProperty(window, 'removeEventListener', {
  value: jest.fn((event: string, callback: EventListener) => {
    if (mockEventListeners[event]) {
      const index = mockEventListeners[event].indexOf(callback);
      if (index > -1) {
        mockEventListeners[event].splice(index, 1);
      }
    }
  }),
});

Object.defineProperty(window, 'dispatchEvent', {
  value: jest.fn((event: Event) => {
    const listeners = mockEventListeners[event.type] || [];
    listeners.forEach(listener => listener(event));
    return true;
  }),
});

// Utility functions for tests
export const createMockResponse = (data: any, options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
} = {}) => {
  const {
    ok = true,
    status = ok ? 200 : 500,
    statusText = ok ? 'OK' : 'Internal Server Error',
    headers = { 'content-type': 'application/json' },
  } = options;

  return {
    ok,
    status,
    statusText,
    headers: new Headers(headers),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  };
};

export const createMockError = (message: string, options: {
  status?: number;
  code?: string;
  isServiceUnavailable?: boolean;
} = {}) => {
  const error = new Error(message);
  Object.assign(error, options);
  return error;
};

export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const advanceTimersByTime = (ms: number) => {
  jest.advanceTimersByTime(ms);
  return waitForNextTick();
};

// Reset mocks between tests
beforeEach(() => {
  // Clear all mock event listeners
  Object.keys(mockEventListeners).forEach(key => {
    mockEventListeners[key] = [];
  });
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Custom Jest matchers
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
});
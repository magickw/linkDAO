/**
 * User Acceptance Test Setup
 * Comprehensive setup for user acceptance testing environment
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';

// Configure testing library for user acceptance tests
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 15000, // Extended timeout for user acceptance tests
  computedStyleSupportsPseudoElements: true,
});

// Global polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock ResizeObserver for components that use it
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for lazy loading and virtual scrolling
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock requestIdleCallback for performance optimizations
global.requestIdleCallback = jest.fn((callback) => {
  const start = Date.now();
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    });
  }, 1);
});

global.cancelIdleCallback = jest.fn((id) => {
  clearTimeout(id);
});

// Mock requestAnimationFrame for animations
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16); // 60fps
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock performance API for user acceptance tests
Object.defineProperty(window, 'performance', {
  value: {
    ...window.performance,
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    memory: {
      usedJSHeapSize: 15000000,
      totalJSHeapSize: 30000000,
      jsHeapSizeLimit: 60000000,
    },
    timing: {
      navigationStart: Date.now() - 1000,
      loadEventEnd: Date.now(),
    },
  },
  writable: true,
});

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createStorageMock(),
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: createStorageMock(),
  writable: true,
});

// Mock IndexedDB for offline storage
const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
  readyState: 'done',
};

const mockIDBDatabase = {
  close: jest.fn(),
  createObjectStore: jest.fn(),
  deleteObjectStore: jest.fn(),
  transaction: jest.fn(() => ({
    objectStore: jest.fn(() => ({
      add: jest.fn(() => mockIDBRequest),
      put: jest.fn(() => mockIDBRequest),
      get: jest.fn(() => mockIDBRequest),
      delete: jest.fn(() => mockIDBRequest),
      clear: jest.fn(() => mockIDBRequest),
      getAll: jest.fn(() => mockIDBRequest),
    })),
    oncomplete: null,
    onerror: null,
    onabort: null,
  })),
};

global.indexedDB = {
  open: jest.fn(() => ({
    ...mockIDBRequest,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: mockIDBDatabase,
  })),
  deleteDatabase: jest.fn(() => mockIDBRequest),
  databases: jest.fn(() => Promise.resolve([])),
} as any;

// Mock Notification API
global.Notification = jest.fn().mockImplementation((title, options) => ({
  title,
  ...options,
  close: jest.fn(),
  onclick: null,
  onclose: null,
  onerror: null,
  onshow: null,
})) as any;

Object.defineProperty(Notification, 'permission', {
  value: 'granted',
  writable: true,
});

Object.defineProperty(Notification, 'requestPermission', {
  value: jest.fn(() => Promise.resolve('granted')),
  writable: true,
});

// Mock Service Worker API
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn(() => Promise.resolve({
      installing: null,
      waiting: null,
      active: {
        scriptURL: '/sw.js',
        state: 'activated',
      },
      scope: '/',
      update: jest.fn(),
      unregister: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
    ready: Promise.resolve({
      installing: null,
      waiting: null,
      active: {
        scriptURL: '/sw.js',
        state: 'activated',
      },
      scope: '/',
      update: jest.fn(),
      unregister: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
    controller: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
});

// Mock Push API
Object.defineProperty(window, 'PushManager', {
  value: {
    supportedContentEncodings: ['aes128gcm'],
  },
  writable: true,
});

// Mock Geolocation API
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 100,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
  writable: true,
});

// Mock Network Information API
Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
});

// Mock Battery API
Object.defineProperty(navigator, 'getBattery', {
  value: jest.fn(() => Promise.resolve({
    charging: true,
    chargingTime: 0,
    dischargingTime: Infinity,
    level: 1,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
  writable: true,
});

// Mock Vibration API
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(() => true),
  writable: true,
});

// Mock Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('test-clipboard-content')),
    write: jest.fn(() => Promise.resolve()),
    read: jest.fn(() => Promise.resolve([])),
  },
  writable: true,
});

// Mock Share API
Object.defineProperty(navigator, 'share', {
  value: jest.fn(() => Promise.resolve()),
  writable: true,
});

// Mock MediaDevices API
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => Promise.resolve({
      getTracks: () => [],
      getVideoTracks: () => [],
      getAudioTracks: () => [],
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
      clone: jest.fn(),
    })),
    enumerateDevices: jest.fn(() => Promise.resolve([])),
    getSupportedConstraints: jest.fn(() => ({})),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
});

// Mock URL API
global.URL = {
  ...global.URL,
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn(),
};

// Mock File and FileReader APIs
global.File = jest.fn().mockImplementation((bits, name, options) => ({
  name,
  size: bits.reduce((acc: number, bit: any) => acc + bit.length, 0),
  type: options?.type || '',
  lastModified: Date.now(),
  slice: jest.fn(),
  stream: jest.fn(),
  text: jest.fn(() => Promise.resolve(bits.join(''))),
  arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
})) as any;

global.FileReader = jest.fn().mockImplementation(() => ({
  readAsText: jest.fn(),
  readAsDataURL: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  readAsBinaryString: jest.fn(),
  abort: jest.fn(),
  result: null,
  error: null,
  onload: null,
  onerror: null,
  onabort: null,
  onloadstart: null,
  onloadend: null,
  onprogress: null,
  readyState: 0,
  EMPTY: 0,
  LOADING: 1,
  DONE: 2,
})) as any;

// Mock Crypto API for Web3 operations
Object.defineProperty(global, 'crypto', {
  value: {
    ...global.crypto,
    getRandomValues: jest.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: jest.fn(() => '12345678-1234-1234-1234-123456789abc'),
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      decrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      sign: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      verify: jest.fn(() => Promise.resolve(true)),
      generateKey: jest.fn(() => Promise.resolve({})),
      importKey: jest.fn(() => Promise.resolve({})),
      exportKey: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      deriveBits: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      deriveKey: jest.fn(() => Promise.resolve({})),
    },
  },
  writable: true,
});

// Mock console methods for cleaner test output
const originalConsole = { ...console };
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.log,
  info: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.info,
  debug: jest.fn(),
};

// Global test utilities
global.userAcceptanceTestUtils = {
  // Wait for async operations
  waitForAsync: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock user interactions
  mockUserInteraction: (element: Element, interaction: string) => {
    const event = new Event(interaction, { bubbles: true });
    element.dispatchEvent(event);
  },
  
  // Performance measurement helpers
  measurePerformance: (name: string, fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    return end - start;
  },
  
  // Memory usage helpers
  getMemoryUsage: () => {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return {
      usedJSHeapSize: 15000000,
      totalJSHeapSize: 30000000,
      jsHeapSizeLimit: 60000000,
    };
  },
  
  // Network condition simulation
  simulateNetworkCondition: (condition: 'fast' | 'slow' | 'offline') => {
    const conditions = {
      fast: { effectiveType: '4g', downlink: 10, rtt: 100 },
      slow: { effectiveType: '2g', downlink: 0.5, rtt: 2000 },
      offline: { effectiveType: 'none', downlink: 0, rtt: 0 },
    };
    
    Object.assign(navigator.connection, conditions[condition]);
  },
  
  // Device simulation
  simulateDevice: (device: 'desktop' | 'tablet' | 'mobile') => {
    const devices = {
      desktop: { width: 1920, height: 1080, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      tablet: { width: 768, height: 1024, userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' },
      mobile: { width: 375, height: 812, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' },
    };
    
    const config = devices[device];
    Object.defineProperty(window, 'innerWidth', { value: config.width, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: config.height, writable: true });
    Object.defineProperty(navigator, 'userAgent', { value: config.userAgent, writable: true });
  },
};

// Custom matchers for user acceptance testing
expect.extend({
  toBeAccessible(received: Element) {
    const hasAriaLabel = received.hasAttribute('aria-label') || received.hasAttribute('aria-labelledby');
    const hasRole = received.hasAttribute('role');
    const isFocusable = received.hasAttribute('tabindex') || ['button', 'input', 'select', 'textarea', 'a'].includes(received.tagName.toLowerCase());
    
    const pass = hasAriaLabel || hasRole || isFocusable;
    
    return {
      message: () => `expected element to be accessible (have aria-label, role, or be focusable)`,
      pass,
    };
  },
  
  toHavePerformantRender(received: number, threshold: number = 100) {
    const pass = received < threshold;
    
    return {
      message: () => `expected render time ${received}ms to be less than ${threshold}ms`,
      pass,
    };
  },
  
  toBeResponsive(received: Element) {
    const computedStyle = window.getComputedStyle(received);
    const hasFlexbox = computedStyle.display === 'flex' || computedStyle.display === 'grid';
    const hasResponsiveUnits = computedStyle.width.includes('%') || computedStyle.width.includes('vw');
    
    const pass = hasFlexbox || hasResponsiveUnits;
    
    return {
      message: () => `expected element to be responsive (use flexbox, grid, or responsive units)`,
      pass,
    };
  },
});

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHavePerformantRender(threshold?: number): R;
      toBeResponsive(): R;
    }
  }
  
  var userAcceptanceTestUtils: {
    waitForAsync: (ms?: number) => Promise<void>;
    mockUserInteraction: (element: Element, interaction: string) => void;
    measurePerformance: (name: string, fn: () => void) => number;
    getMemoryUsage: () => any;
    simulateNetworkCondition: (condition: 'fast' | 'slow' | 'offline') => void;
    simulateDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
  };
}

// Setup and teardown hooks
beforeAll(() => {
  console.log('🧪 Setting up user acceptance test environment...');
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Reset DOM
  document.body.innerHTML = '';
  
  // Reset performance measurements
  performance.clearMarks();
  performance.clearMeasures();
  
  // Reset network conditions
  global.userAcceptanceTestUtils.simulateNetworkCondition('fast');
  
  // Reset device simulation
  global.userAcceptanceTestUtils.simulateDevice('desktop');
});

afterEach(() => {
  // Clean up any pending timers
  jest.clearAllTimers();
  
  // Clean up DOM
  document.body.innerHTML = '';
  
  // Reset localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
});

afterAll(() => {
  console.log('✅ User acceptance test environment cleaned up');
});
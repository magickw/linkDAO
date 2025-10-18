/**
 * User Acceptance Test Setup
 * Configures the testing environment for comprehensive user acceptance testing
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 10000,
  computedStyleSupportsPseudoElements: true,
});

// Global test environment setup
beforeAll(() => {
  // Mock global objects that might not be available in test environment
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder as any;
  
  // Mock Web3 globals
  Object.defineProperty(window, 'ethereum', {
    writable: true,
    value: {
      request: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
      isMetaMask: true,
      selectedAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
      chainId: '0x1',
      networkVersion: '1',
    },
  });

  // Mock performance API
  Object.defineProperty(window, 'performance', {
    writable: true,
    value: {
      ...performance,
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByName: jest.fn().mockReturnValue([{ duration: 45 }]),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      memory: {
        usedJSHeapSize: 15000000,
        totalJSHeapSize: 30000000,
        jsHeapSizeLimit: 60000000,
      },
    },
  });

  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock requestAnimationFrame
  global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
  global.cancelAnimationFrame = jest.fn();

  // Mock requestIdleCallback
  global.requestIdleCallback = jest.fn((cb) => {
    return setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1);
  });
  global.cancelIdleCallback = jest.fn();

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock navigator properties
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: 'Mozilla/5.0 (compatible; UserAcceptanceTests/1.0)',
  });

  Object.defineProperty(navigator, 'serviceWorker', {
    writable: true,
    value: {
      register: jest.fn().mockResolvedValue({}),
      ready: Promise.resolve({}),
    },
  });

  // Mock touch events support
  Object.defineProperty(window, 'ontouchstart', {
    writable: true,
    value: () => {},
  });

  // Mock WebGL context
  HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation((contextType) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return {
        canvas: {},
        drawingBufferWidth: 300,
        drawingBufferHeight: 150,
      };
    }
    return null;
  });

  // Mock crypto API for Web3 testing
  Object.defineProperty(window, 'crypto', {
    writable: true,
    value: {
      getRandomValues: jest.fn().mockImplementation((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      }),
      subtle: {
        digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      },
    },
  });

  // Mock localStorage and sessionStorage
  const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  };

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: mockStorage,
  });

  Object.defineProperty(window, 'sessionStorage', {
    writable: true,
    value: mockStorage,
  });

  // Mock URL and URLSearchParams
  global.URL = URL;
  global.URLSearchParams = URLSearchParams;

  // Mock fetch for API calls
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(''),
  });

  // Mock WebSocket
  global.WebSocket = jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 1, // OPEN
  }));

  // Mock console methods to reduce noise in tests
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Suppress known React warnings in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: validateDOMNesting'))
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
});

// Setup before each test
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset DOM
  document.body.innerHTML = '';
  
  // Reset viewport to default
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  });

  // Reset Web3 provider state
  if (window.ethereum) {
    window.ethereum.selectedAddress = '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87';
    window.ethereum.chainId = '0x1';
    window.ethereum.networkVersion = '1';
  }

  // Reset performance measurements
  if (window.performance) {
    window.performance.clearMarks?.();
    window.performance.clearMeasures?.();
  }

  // Reset local storage
  localStorage.clear();
  sessionStorage.clear();
});

// Cleanup after each test
afterEach(() => {
  // Clean up any timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  
  // Clean up any event listeners
  document.removeEventListener = jest.fn();
  window.removeEventListener = jest.fn();
});

// Global cleanup
afterAll(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Custom matchers for user acceptance testing
expect.extend({
  toBeAccessible(received) {
    const pass = received && received.getAttribute && (
      received.getAttribute('aria-label') ||
      received.getAttribute('aria-labelledby') ||
      received.getAttribute('aria-describedby') ||
      received.textContent
    );
    
    return {
      message: () => `expected element to be accessible with proper ARIA labels or text content`,
      pass,
    };
  },
  
  toHavePerformantRenderTime(received, threshold = 100) {
    const pass = received < threshold;
    
    return {
      message: () => `expected render time ${received}ms to be less than ${threshold}ms`,
      pass,
    };
  },
  
  toSupportTouchInteraction(received) {
    const pass = received && (
      received.ontouchstart !== undefined ||
      received.addEventListener
    );
    
    return {
      message: () => `expected element to support touch interactions`,
      pass,
    };
  },
  
  toBeWeb3Compatible(received) {
    const pass = received && (
      received.ethereum ||
      received.web3 ||
      (received.request && typeof received.request === 'function')
    );
    
    return {
      message: () => `expected object to be Web3 compatible`,
      pass,
    };
  },
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHavePerformantRenderTime(threshold?: number): R;
      toSupportTouchInteraction(): R;
      toBeWeb3Compatible(): R;
    }
  }
}

export {};
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock WebSocket globally for integration tests
global.WebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN
}));

// Mock IndexedDB for offline functionality tests
const mockIndexedDB = {
  open: jest.fn().mockResolvedValue({
    transaction: jest.fn().mockReturnValue({
      objectStore: jest.fn().mockReturnValue({
        add: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(undefined),
        put: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        getAll: jest.fn().mockResolvedValue([])
      })
    })
  })
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

// Mock crypto for encryption tests
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      generateKey: jest.fn().mockResolvedValue({}),
      encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
      decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
      exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      importKey: jest.fn().mockResolvedValue({})
    },
    getRandomValues: jest.fn().mockImplementation((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    })
  },
  writable: true
});

// Mock localStorage for caching tests
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

// Mock IntersectionObserver for virtual scrolling tests
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}));

// Mock ResizeObserver for responsive tests
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

// Mock navigator.onLine for offline tests
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock performance API for performance tests
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => [])
  },
  writable: true
});

// Mock requestAnimationFrame for animation tests
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Mock URL.createObjectURL for file upload tests
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock File and FileReader for media upload tests
global.File = jest.fn().mockImplementation((chunks, filename, options) => ({
  name: filename,
  size: chunks.reduce((acc, chunk) => acc + chunk.length, 0),
  type: options?.type || 'text/plain',
  lastModified: Date.now(),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  text: jest.fn().mockResolvedValue('mock file content'),
  stream: jest.fn()
}));

global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(),
  readAsText: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  onload: null,
  onerror: null,
  result: null
}));

// Mock Notification API for push notifications
global.Notification = jest.fn().mockImplementation((title, options) => ({
  title,
  body: options?.body,
  icon: options?.icon,
  close: jest.fn(),
  onclick: null,
  onclose: null,
  onerror: null,
  onshow: null
}));

Object.defineProperty(Notification, 'permission', {
  value: 'granted',
  writable: true
});

Notification.requestPermission = jest.fn().mockResolvedValue('granted');

// Mock geolocation for location-based features
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        }
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn()
  },
  writable: true
});

// Mock clipboard API for copy/paste functionality
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue('mock clipboard text')
  },
  writable: true
});

// Mock service worker for caching tests
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn().mockResolvedValue({
      installing: null,
      waiting: null,
      active: {
        postMessage: jest.fn()
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }),
    ready: Promise.resolve({
      active: {
        postMessage: jest.fn()
      }
    }),
    controller: {
      postMessage: jest.fn()
    }
  },
  writable: true
});

// Setup console methods for test debugging
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress specific React warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is deprecated') ||
     args[0].includes('Warning: componentWillReceiveProps has been renamed'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Global test utilities
global.testUtils = {
  // Utility to wait for async operations
  waitForAsync: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Utility to trigger custom events
  triggerCustomEvent: (element, eventType, detail) => {
    const event = new CustomEvent(eventType, { detail });
    element.dispatchEvent(event);
  },
  
  // Utility to mock WebSocket messages
  mockWebSocketMessage: (data) => {
    const event = new MessageEvent('message', { data: JSON.stringify(data) });
    return event;
  },
  
  // Utility to simulate network conditions
  simulateNetworkCondition: (condition) => {
    switch (condition) {
      case 'offline':
        Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
        window.dispatchEvent(new Event('offline'));
        break;
      case 'online':
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
        window.dispatchEvent(new Event('online'));
        break;
      case 'slow':
        // Mock slow network by adding delays to fetch
        global.fetch = jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({})
          }), 2000))
        );
        break;
    }
  }
};

// Cleanup after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset localStorage
  localStorageMock.clear();
  
  // Reset network condition
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  
  // Clear any pending timers
  jest.clearAllTimers();
  
  // Reset console
  console.error = originalConsoleError;
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};
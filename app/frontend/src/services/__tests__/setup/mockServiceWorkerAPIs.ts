/**
 * Mock Service Worker APIs for Testing
 * Provides comprehensive mocks for service worker functionality
 */

// Mock ServiceWorkerRegistration
const mockServiceWorkerRegistration = {
  installing: null,
  waiting: null,
  active: {
    postMessage: jest.fn(),
    state: 'activated'
  },
  scope: 'http://localhost:3000/',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  
  // Navigation Preload API
  navigationPreload: {
    enable: jest.fn(() => Promise.resolve()),
    disable: jest.fn(() => Promise.resolve()),
    setHeaderValue: jest.fn(() => Promise.resolve()),
    getState: jest.fn(() => Promise.resolve({ enabled: true, headerValue: 'enhanced-cache' }))
  },
  
  // Background Sync API
  sync: {
    register: jest.fn((tag: string) => Promise.resolve()),
    getTags: jest.fn(() => Promise.resolve(['enhanced-cache-sync']))
  },
  
  // Push Manager (for completeness)
  pushManager: {
    subscribe: jest.fn(),
    getSubscription: jest.fn(() => Promise.resolve(null))
  },
  
  // Update methods
  update: jest.fn(() => Promise.resolve()),
  unregister: jest.fn(() => Promise.resolve(true))
};

// Mock ServiceWorker
const mockServiceWorker = {
  postMessage: jest.fn(),
  state: 'activated',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Mock ServiceWorkerContainer
const mockServiceWorkerContainer = {
  register: jest.fn((scriptURL: string, options?: RegistrationOptions) => {
    return Promise.resolve(mockServiceWorkerRegistration);
  }),
  
  getRegistration: jest.fn((scope?: string) => {
    return Promise.resolve(mockServiceWorkerRegistration);
  }),
  
  getRegistrations: jest.fn(() => {
    return Promise.resolve([mockServiceWorkerRegistration]);
  }),
  
  ready: Promise.resolve(mockServiceWorkerRegistration),
  
  controller: mockServiceWorker,
  
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  
  // Start messages
  startMessages: jest.fn()
};

// Mock Navigator with Service Worker support
Object.defineProperty(global, 'navigator', {
  value: {
    ...global.navigator,
    serviceWorker: mockServiceWorkerContainer,
    onLine: true,
    
    // Storage API
    storage: {
      estimate: jest.fn(() => Promise.resolve({
        usage: 1024 * 1024, // 1MB
        quota: 100 * 1024 * 1024, // 100MB
        usageDetails: {
          caches: 512 * 1024,
          indexedDB: 256 * 1024,
          serviceWorkerRegistrations: 1024
        }
      })),
      
      persist: jest.fn(() => Promise.resolve(true)),
      
      persisted: jest.fn(() => Promise.resolve(false))
    }
  },
  writable: true
});

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  
  constructor(name: string) {
    this.name = name;
  }
  
  postMessage(message: any) {
    // Simulate message delivery to other instances
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data: message }));
      }
    }, 0);
  }
  
  close() {
    // Clean up
  }
  
  addEventListener(type: string, listener: EventListener) {
    if (type === 'message') {
      this.onmessage = listener as (event: MessageEvent) => void;
    }
  }
  
  removeEventListener(type: string, listener: EventListener) {
    if (type === 'message') {
      this.onmessage = null;
    }
  }
}

Object.defineProperty(global, 'BroadcastChannel', {
  value: MockBroadcastChannel,
  writable: true
});

// Mock MessageChannel
class MockMessageChannel {
  port1: MessagePort;
  port2: MessagePort;
  
  constructor() {
    this.port1 = new MockMessagePort();
    this.port2 = new MockMessagePort();
    
    // Connect ports
    (this.port1 as any).otherPort = this.port2;
    (this.port2 as any).otherPort = this.port1;
  }
}

class MockMessagePort {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  
  postMessage(message: any) {
    const otherPort = (this as any).otherPort;
    if (otherPort && otherPort.onmessage) {
      setTimeout(() => {
        otherPort.onmessage(new MessageEvent('message', { data: message }));
      }, 0);
    }
  }
  
  start() {
    // Start the port
  }
  
  close() {
    // Close the port
  }
  
  addEventListener(type: string, listener: EventListener) {
    if (type === 'message') {
      this.onmessage = listener as (event: MessageEvent) => void;
    }
  }
  
  removeEventListener(type: string, listener: EventListener) {
    if (type === 'message') {
      this.onmessage = null;
    }
  }
}

Object.defineProperty(global, 'MessageChannel', {
  value: MockMessageChannel,
  writable: true
});

// Mock Performance API enhancements
Object.defineProperty(global, 'performance', {
  value: {
    ...global.performance,
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByType: jest.fn((type: string) => {
      if (type === 'resource') {
        return [
          {
            name: 'http://localhost:3000/api/feed',
            entryType: 'resource',
            startTime: 100,
            duration: 200,
            transferSize: 1024,
            decodedBodySize: 2048
          }
        ];
      }
      return [];
    }),
    getEntriesByName: jest.fn(() => []),
    now: jest.fn(() => Date.now())
  },
  writable: true
});

// Mock Workbox runtime (if needed)
(global as any).workbox = {
  core: {
    setCacheNameDetails: jest.fn(),
    clientsClaim: jest.fn(),
    skipWaiting: jest.fn()
  },
  precaching: {
    precacheAndRoute: jest.fn(),
    cleanupOutdatedCaches: jest.fn()
  },
  routing: {
    registerRoute: jest.fn(),
    NavigationRoute: jest.fn(),
    Route: jest.fn()
  },
  strategies: {
    NetworkFirst: jest.fn(),
    CacheFirst: jest.fn(),
    StaleWhileRevalidate: jest.fn(),
    NetworkOnly: jest.fn(),
    CacheOnly: jest.fn()
  },
  expiration: {
    ExpirationPlugin: jest.fn()
  },
  backgroundSync: {
    BackgroundSyncPlugin: jest.fn(),
    Queue: jest.fn()
  }
};

// Export mocks for direct access in tests
export {
  mockServiceWorkerRegistration,
  mockServiceWorker,
  mockServiceWorkerContainer,
  MockBroadcastChannel,
  MockMessageChannel,
  MockMessagePort
};
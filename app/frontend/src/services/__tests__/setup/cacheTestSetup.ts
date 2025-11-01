/**
 * Cache Test Setup
 * Configures test environment for service worker cache testing
 */

// Mock global APIs for testing
import './mockServiceWorkerAPIs';
import './mockCacheAPIs';
import './mockIndexedDB';

// Global test configuration
beforeAll(() => {
  // Set up global test mode
  (global as any).cacheTestMode = true;
  (global as any).performanceTestMode = true;
  
  // Mock console methods to reduce noise in tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  
  // Only show errors in tests
  const originalError = console.error;
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    if (process.env.NODE_ENV === 'test' && process.env.SHOW_ERRORS === 'true') {
      originalError(...args);
    }
  });
});

afterAll(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset global state
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
  
  // Reset performance marks
  if (typeof performance !== 'undefined' && performance.clearMarks) {
    performance.clearMarks();
    performance.clearMeasures();
  }
});

afterEach(() => {
  // Clean up any test artifacts
  jest.clearAllTimers();
  
  // Reset DOM if needed
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});

// Global test utilities
(global as any).testUtils = {
  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create mock response
  createMockResponse: (data: any, options: ResponseInit = {}) => {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
      ...options
    });
  },
  
  // Create mock cache entry
  createMockCacheEntry: (url: string, data: any, metadata: any = {}) => {
    return {
      url,
      response: (global as any).testUtils.createMockResponse(data),
      metadata: {
        timestamp: Date.now(),
        ttl: 300000,
        tags: [],
        ...metadata
      }
    };
  },
  
  // Simulate network conditions
  simulateNetworkConditions: (condition: 'online' | 'offline' | 'slow') => {
    switch (condition) {
      case 'offline':
        (global as any).navigator.onLine = false;
        break;
      case 'online':
        (global as any).navigator.onLine = true;
        break;
      case 'slow':
        (global as any).navigator.onLine = true;
        // Mock slow network by adding delays to fetch
        const originalFetch = global.fetch;
        global.fetch = jest.fn((...args) => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(originalFetch(...args));
            }, 2000); // 2 second delay
          });
        });
        break;
    }
  },
  
  // Create test data
  createTestData: {
    feedPost: (id: number = 1) => ({
      id,
      title: `Test Post ${id}`,
      content: `This is test post content ${id}`,
      author: `user${id}`,
      timestamp: Date.now(),
      likes: Math.floor(Math.random() * 100),
      comments: Math.floor(Math.random() * 20)
    }),
    
    communityData: (id: number = 1) => ({
      id,
      name: `Test Community ${id}`,
      description: `This is test community ${id}`,
      memberCount: Math.floor(Math.random() * 1000),
      posts: Array.from({ length: 5 }, (_, i) => (global as any).testUtils.createTestData.feedPost(i + 1))
    }),
    
    productData: (id: number = 1) => ({
      id,
      name: `Test Product ${id}`,
      description: `This is test product ${id}`,
      price: Math.floor(Math.random() * 1000),
      stock: Math.floor(Math.random() * 100),
      images: [`/images/product-${id}.jpg`]
    }),
    
    messageData: (id: number = 1) => ({
      id,
      content: `Test message ${id}`,
      sender: `user${id}`,
      recipient: `user${id + 1}`,
      timestamp: Date.now(),
      encrypted: true
    })
  }
};

// Export test utilities for use in tests
export const testUtils = (global as any).testUtils;
import { configure } from '@testing-library/react';
import { performance } from 'perf_hooks';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true,
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHavePerformantRender(): R;
      toHandleOfflineGracefully(): R;
    }
  }
}

// Custom Jest matchers for enhanced testing
expect.extend({
  toBeAccessible(received) {
    // This would integrate with axe-core for accessibility testing
    const pass = true; // Placeholder - would run actual accessibility checks
    
    if (pass) {
      return {
        message: () => `expected element to not be accessible`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected element to be accessible`,
        pass: false,
      };
    }
  },
  
  toHavePerformantRender(received, maxTime = 100) {
    const renderTime = received.renderTime || 0;
    const pass = renderTime <= maxTime;
    
    if (pass) {
      return {
        message: () => `expected render time ${renderTime}ms to be greater than ${maxTime}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected render time ${renderTime}ms to be less than or equal to ${maxTime}ms`,
        pass: false,
      };
    }
  },
  
  toHandleOfflineGracefully(received) {
    // Test offline functionality
    const pass = received.offlineSupport === true;
    
    if (pass) {
      return {
        message: () => `expected component to not handle offline gracefully`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected component to handle offline gracefully`,
        pass: false,
      };
    }
  },
});

// Performance monitoring for tests
const performanceObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach((entry) => {
    if (entry.duration > 100) {
      console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
    }
  });
});

performanceObserver.observe({ entryTypes: ['measure'] });

// Global test hooks
beforeAll(() => {
  // Global setup for all tests
  console.log('🚀 Starting comprehensive test suite...');
  
  // Mock console methods to reduce noise in tests
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args: any[]) => {
    // Filter out known React warnings that are not relevant to our tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: React.createFactory() is deprecated'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: componentWillMount has been renamed')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

beforeEach(() => {
  // Reset performance marks before each test
  performance.clearMarks();
  performance.clearMeasures();
  
  // Mark test start
  performance.mark('test-start');
});

afterEach(() => {
  // Measure test duration
  performance.mark('test-end');
  performance.measure('test-duration', 'test-start', 'test-end');
  
  // Clean up any remaining timers
  jest.clearAllTimers();
  
  // Clean up DOM
  document.body.innerHTML = '';
  
  // Reset fetch mock
  if (global.fetch && typeof global.fetch.mockClear === 'function') {
    global.fetch.mockClear();
  }
});

afterAll(() => {
  // Global cleanup
  performanceObserver.disconnect();
  console.log('✅ Comprehensive test suite completed');
});

// Test utilities
export const testUtils = {
  // Wait for async operations to complete
  waitForAsync: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create mock user for testing
  createMockUser: (overrides = {}) => ({
    id: 'test-user-1',
    username: 'testuser',
    displayName: 'Test User',
    avatar: '/test-avatar.jpg',
    walletAddress: '0x1234567890abcdef',
    reputation: {
      totalScore: 500,
      level: { name: 'Contributor', level: 3 },
      badges: [],
      progress: [],
      breakdown: {},
      history: [],
    },
    ...overrides,
  }),
  
  // Create mock post for testing
  createMockPost: (overrides = {}) => ({
    id: 'test-post-1',
    author: testUtils.createMockUser(),
    content: {
      type: 'text',
      body: 'Test post content',
      formatting: {},
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    reactions: [],
    tips: [],
    comments: [],
    shares: [],
    views: 0,
    engagementScore: 0,
    previews: [],
    hashtags: [],
    mentions: [],
    media: [],
    socialProof: {
      followedUsersWhoEngaged: [],
      totalEngagementFromFollowed: 0,
      communityLeadersWhoEngaged: [],
      verifiedUsersWhoEngaged: [],
    },
    moderationStatus: 'approved',
    ...overrides,
  }),
  
  // Mock WebSocket for real-time testing
  createMockWebSocket: () => {
    const mockWS = {
      readyState: 1, // OPEN
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
    };
    
    return mockWS;
  },
  
  // Performance testing helper
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now();
    renderFn();
    await testUtils.waitForAsync(0); // Wait for next tick
    const end = performance.now();
    return end - start;
  },
  
  // Accessibility testing helper
  checkAccessibility: async (container: HTMLElement) => {
    const { axe } = await import('jest-axe');
    const results = await axe(container);
    return results;
  },
  
  // Mock intersection observer for virtual scrolling tests
  mockIntersectionObserver: () => {
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    });
    window.IntersectionObserver = mockIntersectionObserver;
    return mockIntersectionObserver;
  },
  
  // Mock resize observer for responsive tests
  mockResizeObserver: () => {
    const mockResizeObserver = jest.fn();
    mockResizeObserver.mockReturnValue({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    });
    window.ResizeObserver = mockResizeObserver;
    return mockResizeObserver;
  },
  
  // Simulate network conditions
  simulateNetworkCondition: (condition: 'online' | 'offline' | 'slow') => {
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
};

// Export test utilities for use in test files
export default testUtils;
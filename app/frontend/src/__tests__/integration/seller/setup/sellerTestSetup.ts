import '@testing-library/jest-dom';
import { QueryClient } from '@tanstack/react-query';
import { jest } from '@jest/globals';

// Mock Web3 libraries before other imports
jest.mock('wagmi');
jest.mock('@wagmi/core');
jest.mock('viem');

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/marketplace/seller',
    query: {},
    asPath: '/marketplace/seller',
    route: '/marketplace/seller',
    isReady: true,
    isFallback: false,
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  })),
  withRouter: (Component: any) => Component,
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock clipboard API if it doesn't exist
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: jest.fn(),
      readText: jest.fn(),
    },
    writable: true,
    configurable: true,
  });
}

// Mock window.matchMedia
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

// Mock seller-specific services
jest.mock('../../../../services/unifiedSellerAPIClient', () => ({
  unifiedSellerAPIClient: {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    createProfile: jest.fn(),
    getOnboardingSteps: jest.fn(),
    getDashboardStats: jest.fn(),
    getListings: jest.fn(),
    createListing: jest.fn(),
    updateListing: jest.fn(),
    deleteListing: jest.fn(),
    getStore: jest.fn(),
    getNotifications: jest.fn(),
    markNotificationRead: jest.fn(),
    uploadImage: jest.fn(),
    updateProfileEnhanced: jest.fn(),
  },
}));

jest.mock('../../../../services/sellerCacheManager', () => ({
  sellerCacheManager: {
    invalidateSellerCache: jest.fn(),
    invalidateProfileCache: jest.fn(),
    invalidateListingsCache: jest.fn(),
    invalidateDashboardCache: jest.fn(),
    invalidateStoreCache: jest.fn(),
    invalidateWithDependencies: jest.fn(),
    invalidateRelatedCaches: jest.fn(),
    warmCache: jest.fn(),
    clearAll: jest.fn(),
    getCacheSize: jest.fn().mockReturnValue(10),
    getCacheDependencies: jest.fn().mockReturnValue({
      profile: ['dashboard', 'store'],
      listings: ['dashboard', 'store'],
      dashboard: [],
      store: [],
    }),
    getPendingInvalidations: jest.fn().mockReturnValue([]),
    getActiveSubscriptions: jest.fn().mockReturnValue(0),
  },
}));

jest.mock('../../../../services/sellerService', () => ({
  sellerService: {
    getSellerProfile: jest.fn(),
    updateSellerProfile: jest.fn(),
    createSellerProfile: jest.fn(),
    getOnboardingSteps: jest.fn(),
    getDashboardStats: jest.fn(),
    getListings: jest.fn(),
    getNotifications: jest.fn(),
    clearProfileCache: jest.fn(),
  },
}));

// Mock WebSocket for real-time tests
const mockWebSocket = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket);

// Mock ResizeObserver for responsive tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock performance API
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn().mockReturnValue([]),
    getEntriesByName: jest.fn().mockReturnValue([]),
  },
});

// Mock navigator for mobile tests
if (!global.navigator.vibrate) {
  Object.defineProperty(global.navigator, 'vibrate', {
    writable: true,
    value: jest.fn(),
  });
}

if (!global.navigator.userAgent) {
  Object.defineProperty(global.navigator, 'userAgent', {
    writable: true,
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  });
}

// Mock matchMedia for responsive design tests
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

// Mock localStorage for cache persistence tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock URL constructor for image handling tests
global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn(),
} as any;

// Mock File and FileReader for image upload tests
global.File = class MockFile {
  constructor(
    public chunks: any[],
    public name: string,
    public options: any = {}
  ) {}
  
  get size() { return 1024; }
  get type() { return this.options.type || 'image/jpeg'; }
} as any;

global.FileReader = class MockFileReader {
  result: string | ArrayBuffer | null = null;
  error: any = null;
  readyState: number = 0;
  
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onloadend: ((event: any) => void) | null = null;
  
  readAsDataURL(file: File) {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,mock-base64-data';
      this.readyState = 2;
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }
  
  readAsArrayBuffer(file: File) {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      this.readyState = 2;
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }
  
  abort() {
    this.readyState = 2;
  }
} as any;

// Mock touch events for mobile interaction tests
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: touches.map(touch => ({
      ...touch,
      identifier: 0,
      target: document.body,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1,
    })),
  });
  return event;
};

// Add touch event helpers to global
(global as any).createTouchEvent = createTouchEvent;

// Mock crypto for secure operations
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: jest.fn(() => 'mock-uuid-1234-5678-9012'),
  },
});

// Setup test data factories
export const createMockSellerProfile = (overrides: any = {}) => ({
  walletAddress: '0x1234567890123456789012345678901234567890',
  displayName: 'Test Seller',
  storeName: 'Test Store',
  bio: 'Test bio',
  profileImageUrl: 'https://example.com/profile.jpg',
  coverImageUrl: 'https://example.com/cover.jpg',
  tier: {
    id: 'bronze',
    name: 'Bronze',
    level: 1,
  },
  stats: {
    totalSales: 100,
    totalListings: 5,
    rating: 4.5,
  },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockSellerListing = (overrides: any = {}) => ({
  id: 'listing-1',
  sellerId: '0x1234567890123456789012345678901234567890',
  title: 'Test Product',
  description: 'Test product description',
  price: 100,
  currency: 'USD',
  images: ['https://example.com/product.jpg'],
  category: 'Electronics',
  status: 'active',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockDashboardData = (overrides: any = {}) => ({
  profile: createMockSellerProfile(),
  listings: [createMockSellerListing()],
  stats: {
    totalSales: 100,
    totalRevenue: 10000,
    pendingOrders: 5,
    completedOrders: 95,
    averageRating: 4.5,
    totalViews: 1000,
  },
  notifications: [
    {
      id: 'notification-1',
      type: 'new_order',
      title: 'New Order Received',
      message: 'You have a new order for Test Product',
      read: false,
      createdAt: '2023-01-01T00:00:00Z',
    },
  ],
  ...overrides,
});

// Setup query client for tests
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// Memory usage testing utilities
export const getMemoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage();
  }
  return {
    rss: 0,
    heapTotal: 0,
    heapUsed: 0,
    external: 0,
    arrayBuffers: 0,
  };
};

// Cache testing utilities
export const waitForCacheInvalidation = (timeout = 1000) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

// Mobile testing utilities
export const setMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667,
  });
  
  // Update matchMedia mock for mobile
  (window.matchMedia as jest.Mock).mockImplementation(query => ({
    matches: query.includes('max-width: 768px'),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
};

export const setDesktopViewport = () => {
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
  
  // Update matchMedia mock for desktop
  (window.matchMedia as jest.Mock).mockImplementation(query => ({
    matches: query.includes('min-width: 769px'),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
};

// Error simulation utilities
export const simulateNetworkError = () => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(
    new TypeError('Network request failed')
  );
};

export const simulateAPIError = (status: number, message: string) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    statusText: message,
    text: async () => message,
    json: async () => ({ success: false, message }),
  });
};

// Cleanup utilities
export const cleanupSellerTests = () => {
  jest.clearAllMocks();
  localStorageMock.clear();
  
  // Reset viewport
  setDesktopViewport();
  
  // Clear any pending timers
  jest.clearAllTimers();
  
  // Reset performance mocks
  (performance.now as jest.Mock).mockClear();
};

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Setup default fetch mock responses
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    // Mock different API endpoints
    if (url.includes('/api/marketplace/seller/') && !url.includes('/onboarding') && !url.includes('/dashboard') && !url.includes('/listings')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: createMockSellerProfile(),
        }),
      });
    }
    
    if (url.includes('/onboarding')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            steps: [
              { id: 'wallet', completed: true },
              { id: 'profile', completed: false },
              { id: 'verification', completed: false },
            ],
          },
        }),
      });
    }
    
    if (url.includes('/dashboard')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: createMockDashboardData(),
        }),
      });
    }
    
    if (url.includes('/listings')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [createMockSellerListing()],
        }),
      });
    }
    
    // Default response
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
    });
  });
  
  // Reset localStorage
  localStorageMock.clear();
  
  // Reset WebSocket mock
  mockWebSocket.addEventListener.mockClear();
  mockWebSocket.removeEventListener.mockClear();
  mockWebSocket.send.mockClear();
  mockWebSocket.close.mockClear();
});

afterEach(() => {
  cleanupSellerTests();
});
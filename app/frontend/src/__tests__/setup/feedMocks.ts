/**
 * Feed-specific mocks and test utilities
 */

// Mock react-window for virtualization testing
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemData, itemCount, itemSize }: any) => {
    // Render a subset of items for testing
    const itemsToRender = Math.min(itemCount, 10);
    
    return (
      <div data-testid="virtualized-list" style={{ height: itemsToRender * itemSize }}>
        {Array.from({ length: itemsToRender }, (_, index) =>
          children({ 
            index, 
            style: { 
              position: 'absolute',
              top: index * itemSize,
              left: 0,
              right: 0,
              height: itemSize
            }, 
            data: itemData 
          })
        )}
      </div>
    );
  },
  areEqual: () => false,
}));

// Mock IntersectionObserver for infinite scroll testing
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn((element) => {
    // Simulate intersection for testing
    setTimeout(() => {
      callback([{
        target: element,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: {
          top: 0,
          left: 0,
          bottom: 100,
          right: 100,
          width: 100,
          height: 100,
        },
        intersectionRect: {
          top: 0,
          left: 0,
          bottom: 100,
          right: 100,
          width: 100,
          height: 100,
        },
        rootBounds: {
          top: 0,
          left: 0,
          bottom: 1000,
          right: 1000,
          width: 1000,
          height: 1000,
        },
        time: Date.now(),
      }]);
    }, 0);
  }),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver for responsive testing
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn((element) => {
    // Simulate resize for testing
    setTimeout(() => {
      callback([{
        target: element,
        contentRect: {
          top: 0,
          left: 0,
          bottom: 500,
          right: 800,
          width: 800,
          height: 500,
        },
        borderBoxSize: [{
          blockSize: 500,
          inlineSize: 800,
        }],
        contentBoxSize: [{
          blockSize: 500,
          inlineSize: 800,
        }],
        devicePixelContentBoxSize: [{
          blockSize: 1000,
          inlineSize: 1600,
        }],
      }]);
    }, 0);
  }),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Web APIs for feed functionality
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock clipboard API for sharing functionality
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock performance API for performance testing
Object.defineProperty(window, 'performance', {
  value: {
    ...window.performance,
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByType: jest.fn().mockReturnValue([]),
    getEntriesByName: jest.fn().mockReturnValue([]),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    },
  },
  writable: true,
});

// Mock URL.createObjectURL for media upload testing
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock FileReader for file upload testing
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(),
  readAsText: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  result: 'data:image/jpeg;base64,mock-data',
  error: null,
  onload: null,
  onerror: null,
  onabort: null,
  onloadstart: null,
  onloadend: null,
  onprogress: null,
  readyState: 2, // DONE
  EMPTY: 0,
  LOADING: 1,
  DONE: 2,
}));

// Mock fetch for API testing
global.fetch = jest.fn().mockImplementation((url: string, options?: RequestInit) => {
  // Default mock response
  const mockResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(''),
    blob: jest.fn().mockResolvedValue(new Blob()),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    clone: jest.fn(),
  };

  return Promise.resolve(mockResponse);
});

// Mock localStorage for draft functionality
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
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock IndexedDB for caching tests
const indexedDBMock = {
  open: jest.fn().mockResolvedValue({
    transaction: jest.fn().mockReturnValue({
      objectStore: jest.fn().mockReturnValue({
        add: jest.fn().mockResolvedValue(undefined),
        put: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn().mockResolvedValue(undefined),
        getAll: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        createIndex: jest.fn(),
        index: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(undefined),
          getAll: jest.fn().mockResolvedValue([]),
        }),
      }),
      oncomplete: null,
      onerror: null,
      onabort: null,
    }),
    createObjectStore: jest.fn(),
    deleteObjectStore: jest.fn(),
    close: jest.fn(),
    version: 1,
    name: 'test-db',
    objectStoreNames: [],
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    onblocked: null,
    onversionchange: null,
  }),
  deleteDatabase: jest.fn().mockResolvedValue(undefined),
  databases: jest.fn().mockResolvedValue([]),
};

Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock,
  writable: true,
});

// Mock WebSocket for real-time testing
global.WebSocket = jest.fn().mockImplementation((url: string) => ({
  url,
  readyState: 1, // OPEN
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Mock console methods to reduce test noise
const originalConsole = { ...console };

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

// Export mock utilities for use in tests
export const mockUtils = {
  // Reset all mocks
  resetAllMocks: () => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  },
  
  // Mock network conditions
  mockNetworkCondition: (condition: 'online' | 'offline' | 'slow') => {
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
        (global.fetch as jest.Mock).mockImplementation(() =>
          new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
          }), 2000))
        );
        break;
    }
  },
  
  // Mock viewport size
  mockViewportSize: (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
    window.dispatchEvent(new Event('resize'));
  },
  
  // Mock touch events
  mockTouchSupport: (supported: boolean = true) => {
    Object.defineProperty(window, 'ontouchstart', {
      value: supported ? {} : undefined,
      writable: true,
    });
  },
  
  // Mock performance memory
  mockMemoryUsage: (used: number, total: number, limit: number) => {
    if (window.performance.memory) {
      window.performance.memory.usedJSHeapSize = used;
      window.performance.memory.totalJSHeapSize = total;
      window.performance.memory.jsHeapSizeLimit = limit;
    }
  },
};

export default mockUtils;
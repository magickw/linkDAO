import { jest } from '@jest/globals';

// Mock fetch globally for seller tests
global.fetch = jest.fn();

// Mock WebSocket for real-time seller features
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

// Mock Image constructor for image upload tests
global.Image = class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = '';
  
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
} as any;

// Mock canvas for image processing tests
const mockCanvas = {
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    })),
    putImageData: jest.fn(),
    canvas: {
      toDataURL: jest.fn(() => 'data:image/jpeg;base64,mock-data'),
      toBlob: jest.fn((callback) => {
        callback(new Blob(['mock'], { type: 'image/jpeg' }));
      }),
    },
  })),
  width: 100,
  height: 100,
  toDataURL: jest.fn(() => 'data:image/jpeg;base64,mock-data'),
  toBlob: jest.fn((callback) => {
    callback(new Blob(['mock'], { type: 'image/jpeg' }));
  }),
};

global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
global.HTMLCanvasElement.prototype.toDataURL = mockCanvas.toDataURL;
global.HTMLCanvasElement.prototype.toBlob = mockCanvas.toBlob;

// Mock createObjectURL for file handling
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Blob constructor
global.Blob = class MockBlob {
  constructor(public parts: any[], public options: any = {}) {}
  
  get size() { return 1024; }
  get type() { return this.options.type || 'application/octet-stream'; }
  
  slice() { return new MockBlob(this.parts, this.options); }
  stream() { return new ReadableStream(); }
  text() { return Promise.resolve('mock text'); }
  arrayBuffer() { return Promise.resolve(new ArrayBuffer(8)); }
} as any;

// Mock FormData for file uploads
global.FormData = class MockFormData {
  private data = new Map<string, any>();
  
  append(key: string, value: any) {
    this.data.set(key, value);
  }
  
  get(key: string) {
    return this.data.get(key);
  }
  
  has(key: string) {
    return this.data.has(key);
  }
  
  delete(key: string) {
    this.data.delete(key);
  }
  
  entries() {
    return this.data.entries();
  }
  
  keys() {
    return this.data.keys();
  }
  
  values() {
    return this.data.values();
  }
  
  forEach(callback: (value: any, key: string) => void) {
    this.data.forEach(callback);
  }
} as any;

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
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(16))),
      decrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(16))),
    },
  },
});

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    timing: {
      navigationStart: Date.now() - 1000,
      loadEventEnd: Date.now(),
    },
  },
});

// Mock requestAnimationFrame for animations
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16); // ~60fps
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Mock requestIdleCallback for performance optimizations
global.requestIdleCallback = jest.fn((callback) => {
  setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 0);
  return 1;
});

global.cancelIdleCallback = jest.fn();

// Mock IntersectionObserver for lazy loading
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn((element) => {
    // Simulate element being in viewport
    setTimeout(() => {
      callback([{
        target: element,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: { top: 0, left: 0, right: 100, bottom: 100 },
        rootBounds: { top: 0, left: 0, right: 1000, bottom: 1000 },
        intersectionRect: { top: 0, left: 0, right: 100, bottom: 100 },
        time: Date.now(),
      }]);
    }, 0);
  }),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver for responsive design
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn((element) => {
    // Simulate resize event
    setTimeout(() => {
      callback([{
        target: element,
        contentRect: { width: 375, height: 667, top: 0, left: 0 },
        borderBoxSize: [{ inlineSize: 375, blockSize: 667 }],
        contentBoxSize: [{ inlineSize: 375, blockSize: 667 }],
        devicePixelContentBoxSize: [{ inlineSize: 750, blockSize: 1334 }],
      }]);
    }, 0);
  }),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock MutationObserver for DOM changes
global.MutationObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => []),
}));

// Mock geolocation for location-based features (only if not already defined)
if (!global.navigator.geolocation) {
  Object.defineProperty(global.navigator, 'geolocation', {
    value: {
      getCurrentPosition: jest.fn((success) => {
        success({
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
      }),
      watchPosition: jest.fn(() => 1),
      clearWatch: jest.fn(),
    },
  });
}

// Mock clipboard API (only if not already defined)
if (!global.navigator.clipboard) {
  Object.defineProperty(global.navigator, 'clipboard', {
    value: {
      writeText: jest.fn(() => Promise.resolve()),
      readText: jest.fn(() => Promise.resolve('mock clipboard text')),
      write: jest.fn(() => Promise.resolve()),
      read: jest.fn(() => Promise.resolve([])),
    },
  });
}

// Mock share API (only if not already defined)
if (!global.navigator.share) {
  Object.defineProperty(global.navigator, 'share', {
    value: jest.fn(() => Promise.resolve()),
  });
}

// Mock vibration API (only if not already defined)
if (!global.navigator.vibrate) {
  Object.defineProperty(global.navigator, 'vibrate', {
    value: jest.fn(() => true),
  });
}

// Mock battery API (only if not already defined)
if (!global.navigator.getBattery) {
  Object.defineProperty(global.navigator, 'getBattery', {
    value: jest.fn(() => Promise.resolve({
      charging: true,
      chargingTime: Infinity,
      dischargingTime: Infinity,
      level: 1,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

// Mock connection API (only if not already defined)
if (!global.navigator.connection) {
  Object.defineProperty(global.navigator, 'connection', {
    value: {
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
      saveData: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  });
}

// Mock service worker (only if not already defined)
if (!global.navigator.serviceWorker) {
  Object.defineProperty(global.navigator, 'serviceWorker', {
    value: {
      register: jest.fn(() => Promise.resolve({
        installing: null,
        waiting: null,
        active: {
          scriptURL: '/sw.js',
          state: 'activated',
        },
        scope: '/',
        update: jest.fn(() => Promise.resolve()),
        unregister: jest.fn(() => Promise.resolve(true)),
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
        update: jest.fn(() => Promise.resolve()),
        unregister: jest.fn(() => Promise.resolve(true)),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
      controller: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  });
}

// Export mock utilities for tests to use
export {
  mockWebSocket,
  mockCanvas,
};
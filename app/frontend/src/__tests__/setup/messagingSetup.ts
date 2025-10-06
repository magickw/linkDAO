import '@testing-library/jest-dom';

// Mock Web Crypto API for all messaging tests
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    deriveKey: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
  },
  getRandomValues: jest.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock IndexedDB for all messaging tests
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
  databases: jest.fn(),
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Mock IDBKeyRange
Object.defineProperty(global, 'IDBKeyRange', {
  value: {
    bound: jest.fn(),
    only: jest.fn(),
    lowerBound: jest.fn(),
    upperBound: jest.fn(),
  },
  writable: true,
});

// Mock WebSocket for real-time messaging tests
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  protocol: string;
  
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocol = Array.isArray(protocols) ? protocols[0] : protocols || '';
    
    // Simulate connection opening
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send = jest.fn();
  close = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();
}

Object.defineProperty(global, 'WebSocket', {
  value: MockWebSocket,
  writable: true,
});

// Mock TextEncoder/TextDecoder for encryption tests
global.TextEncoder = jest.fn().mockImplementation(() => ({
  encode: jest.fn((text: string) => new Uint8Array(Buffer.from(text, 'utf8'))),
}));

global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn((buffer: ArrayBuffer | Uint8Array) => {
    const uint8Array = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    return Buffer.from(uint8Array).toString('utf8');
  }),
}));

// Mock btoa/atob for base64 operations
global.btoa = jest.fn((str: string) => Buffer.from(str, 'binary').toString('base64'));
global.atob = jest.fn((str: string) => Buffer.from(str, 'base64').toString('binary'));

// Mock navigator.onLine for offline tests
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock localStorage for key storage tests
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(global, 'sessionStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock Notification API for messaging notifications
class MockNotification {
  static permission: NotificationPermission = 'granted';
  static requestPermission = jest.fn().mockResolvedValue('granted');
  
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  
  onclick: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onshow: ((event: Event) => void) | null = null;

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.body = options?.body;
    this.icon = options?.icon;
    this.tag = options?.tag;
  }

  close = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();
}

Object.defineProperty(global, 'Notification', {
  value: MockNotification,
  writable: true,
});

// Mock URL.createObjectURL for file handling
Object.defineProperty(global.URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:mock-url'),
  writable: true,
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
});

// Mock FileReader for file operations
class MockFileReader {
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  readyState: number = 0;
  
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onprogress: ((event: ProgressEvent<FileReader>) => void) | null = null;

  readAsText = jest.fn((file: Blob) => {
    this.result = 'mock file content';
    if (this.onload) {
      this.onload({ target: this } as ProgressEvent<FileReader>);
    }
  });

  readAsArrayBuffer = jest.fn((file: Blob) => {
    this.result = new ArrayBuffer(8);
    if (this.onload) {
      this.onload({ target: this } as ProgressEvent<FileReader>);
    }
  });

  readAsDataURL = jest.fn((file: Blob) => {
    this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=';
    if (this.onload) {
      this.onload({ target: this } as ProgressEvent<FileReader>);
    }
  });

  abort = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();
}

Object.defineProperty(global, 'FileReader', {
  value: MockFileReader,
  writable: true,
});

// Mock Blob constructor
Object.defineProperty(global, 'Blob', {
  value: class MockBlob {
    size: number;
    type: string;
    
    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      this.size = parts ? parts.reduce((size, part) => size + (typeof part === 'string' ? part.length : part.byteLength || 0), 0) : 0;
      this.type = options?.type || '';
    }
    
    slice = jest.fn();
    stream = jest.fn();
    text = jest.fn().mockResolvedValue('mock text');
    arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
  },
  writable: true,
});

// Mock File constructor
Object.defineProperty(global, 'File', {
  value: class MockFile extends global.Blob {
    name: string;
    lastModified: number;
    
    constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
      super(parts, options);
      this.name = name;
      this.lastModified = options?.lastModified || Date.now();
    }
  },
  writable: true,
});

// Mock ResizeObserver for responsive components
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(global, 'ResizeObserver', {
  value: MockResizeObserver,
  writable: true,
});

// Mock IntersectionObserver for virtual scrolling
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    // Mock implementation
  }
}

Object.defineProperty(global, 'IntersectionObserver', {
  value: MockIntersectionObserver,
  writable: true,
});

// Mock performance API for timing tests
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  },
  writable: true,
});

// Mock console methods to reduce test noise
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Restore console for specific tests that need it
(global as any).restoreConsole = () => {
  global.console = originalConsole;
};

// Mock window.matchMedia for responsive tests
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

// Mock window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: jest.fn(() => ({
    getPropertyValue: jest.fn(() => ''),
  })),
});

// Mock requestAnimationFrame and cancelAnimationFrame
Object.defineProperty(global, 'requestAnimationFrame', {
  value: jest.fn(cb => setTimeout(cb, 16)),
  writable: true,
});

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: jest.fn(id => clearTimeout(id)),
  writable: true,
});

// Mock requestIdleCallback
Object.defineProperty(global, 'requestIdleCallback', {
  value: jest.fn(cb => setTimeout(cb, 0)),
  writable: true,
});

Object.defineProperty(global, 'cancelIdleCallback', {
  value: jest.fn(id => clearTimeout(id)),
  writable: true,
});

// Setup default mock implementations for common crypto operations
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Setup default crypto mock implementations
  mockCrypto.subtle.generateKey.mockResolvedValue({
    publicKey: { type: 'public', algorithm: { name: 'RSA-OAEP' } } as CryptoKey,
    privateKey: { type: 'private', algorithm: { name: 'RSA-OAEP' } } as CryptoKey,
  });
  
  mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(256));
  mockCrypto.subtle.importKey.mockResolvedValue({ type: 'public' } as CryptoKey);
  mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(64));
  mockCrypto.subtle.decrypt.mockResolvedValue(new ArrayBuffer(64));
  
  // Setup default IndexedDB mock implementations
  const mockDB = {
    transaction: jest.fn(() => ({
      objectStore: jest.fn(() => ({
        put: jest.fn(() => ({ onsuccess: null, onerror: null })),
        get: jest.fn(() => ({ onsuccess: null, onerror: null, result: null })),
        getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
        delete: jest.fn(() => ({ onsuccess: null, onerror: null })),
        clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
        count: jest.fn(() => ({ onsuccess: null, onerror: null, result: 0 })),
        openCursor: jest.fn(() => ({ onsuccess: null, onerror: null })),
        index: jest.fn(() => ({
          getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
          count: jest.fn(() => ({ onsuccess: null, onerror: null, result: 0 })),
        })),
        createIndex: jest.fn(),
      })),
      complete: Promise.resolve(),
    })),
    objectStoreNames: { contains: jest.fn(() => false) },
    createObjectStore: jest.fn(() => ({ createIndex: jest.fn() })),
  };

  mockIndexedDB.open.mockImplementation(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: mockDB,
  }));
  
  // Reset navigator.onLine
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  });
  
  // Reset localStorage
  mockLocalStorage.getItem.mockReturnValue(null);
  mockLocalStorage.setItem.mockImplementation(() => {});
  mockLocalStorage.removeItem.mockImplementation(() => {});
  mockLocalStorage.clear.mockImplementation(() => {});
});

// Global test utilities
(global as any).createMockEncryptedMessage = () => ({
  encryptedContent: [1, 2, 3, 4],
  encryptedKey: [5, 6, 7, 8],
  iv: [9, 10, 11, 12],
});

(global as any).createMockConversation = (overrides = {}) => ({
  id: 'conv-1',
  participants: ['0x1111', '0x2222'],
  lastActivity: new Date(),
  unreadCounts: {},
  isEncrypted: true,
  metadata: { type: 'direct' },
  ...overrides,
});

(global as any).createMockMessage = (overrides = {}) => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  fromAddress: '0x1111',
  content: 'Test message',
  contentType: 'text',
  timestamp: new Date(),
  deliveryStatus: 'sent',
  ...overrides,
});

// Export mock utilities for use in tests
export {
  mockCrypto,
  mockIndexedDB,
  mockLocalStorage,
  MockWebSocket,
  MockNotification,
  MockFileReader,
  MockResizeObserver,
  MockIntersectionObserver,
};
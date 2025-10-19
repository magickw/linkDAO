import '@testing-library/jest-dom';

// Polyfills for viem and other crypto libraries
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    // Mock implementation
  }

  disconnect(): void {}
  observe(target: Element): void {}
  unobserve(target: Element): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => {},
});

// Mock localStorage
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock crypto for Web3 applications
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: () => new Uint8Array(32),
    randomUUID: () => '12345678-1234-1234-1234-123456789abc',
    subtle: {
      digest: () => Promise.resolve(new ArrayBuffer(32)),
      encrypt: () => Promise.resolve(new ArrayBuffer(32)),
      decrypt: () => Promise.resolve(new ArrayBuffer(32)),
      sign: () => Promise.resolve(new ArrayBuffer(32)),
      verify: () => Promise.resolve(true),
      generateKey: () => Promise.resolve({} as CryptoKey),
      importKey: () => Promise.resolve({} as CryptoKey),
      exportKey: () => Promise.resolve(new ArrayBuffer(32)),
      deriveKey: () => Promise.resolve({} as CryptoKey),
    },
  },
});

// Mock fetch for API calls
global.fetch = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  } as Response);

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: () => 'mocked-url',
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: () => {},
});

// Suppress console errors in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: React.createFactory() is deprecated') ||
       args[0].includes('Warning: componentWillMount has been renamed'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: React.createFactory() is deprecated') ||
       args[0].includes('Warning: componentWillMount has been renamed'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock Web3 wallet connections for testing
Object.defineProperty(window, 'ethereum', {
  writable: true,
  value: {
    request: () => Promise.resolve(['0x1234567890abcdef']),
    on: () => {},
    removeListener: () => {},
    isMetaMask: true,
    selectedAddress: '0x1234567890abcdef',
    chainId: '0x1',
  },
});

// Mock canvas for chart libraries
HTMLCanvasElement.prototype.getContext = () => ({
  fillRect: () => {},
  clearRect: () => {},
  getImageData: () => ({ data: new Array(4) }),
  putImageData: () => {},
  createImageData: () => [],
  setTransform: () => {},
  drawImage: () => {},
  save: () => {},
  fillText: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  translate: () => {},
  scale: () => {},
  rotate: () => {},
  arc: () => {},
  fill: () => {},
  measureText: () => ({ width: 0 }),
  transform: () => {},
  rect: () => {},
  clip: () => {},
}) as any;

// Mock HTMLElement methods
HTMLElement.prototype.scrollIntoView = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};
HTMLElement.prototype.hasPointerCapture = () => false;

// Mock Web APIs for file handling
Object.defineProperty(window, 'FileReader', {
  writable: true,
  value: function() {
    return {
      readAsText: () => {},
      readAsDataURL: () => {},
      readAsArrayBuffer: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      result: null,
      error: null,
      readyState: 0,
    };
  },
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => [],
  },
});

// Environment-specific setup
if (process.env.NODE_ENV === 'test') {
  // Additional test environment setup
  process.env.REACT_APP_API_URL = 'http://localhost:3001/api';
  process.env.REACT_APP_ENVIRONMENT = 'test';
}
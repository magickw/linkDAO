/**
 * Global mocks for connectivity tests
 * This file is loaded before Jest globals are available
 */

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock Headers constructor
global.Headers = class Headers {
  private headers: { [key: string]: string } = {};

  constructor(init?: HeadersInit) {
    if (init) {
      if (init instanceof Headers) {
        this.headers = { ...init.headers };
      } else if (Array.isArray(init)) {
        init.forEach(([name, value]) => {
          this.headers[name.toLowerCase()] = value;
        });
      } else {
        Object.entries(init).forEach(([name, value]) => {
          this.headers[name.toLowerCase()] = value;
        });
      }
    }
  }

  get(name: string): string | null {
    return this.headers[name.toLowerCase()] || null;
  }

  set(name: string, value: string): void {
    this.headers[name.toLowerCase()] = value;
  }

  has(name: string): boolean {
    return name.toLowerCase() in this.headers;
  }

  delete(name: string): void {
    delete this.headers[name.toLowerCase()];
  }

  append(name: string, value: string): void {
    const existing = this.get(name);
    if (existing) {
      this.set(name, `${existing}, ${value}`);
    } else {
      this.set(name, value);
    }
  }

  *[Symbol.iterator](): Iterator<[string, string]> {
    for (const [name, value] of Object.entries(this.headers)) {
      yield [name, value];
    }
  }

  forEach(callback: (value: string, name: string, parent: Headers) => void): void {
    for (const [name, value] of Object.entries(this.headers)) {
      callback(value, name, this);
    }
  }

  keys(): Iterator<string> {
    return Object.keys(this.headers)[Symbol.iterator]();
  }

  values(): Iterator<string> {
    return Object.values(this.headers)[Symbol.iterator]();
  }

  entries(): Iterator<[string, string]> {
    return this[Symbol.iterator]();
  }
};

// Mock AbortController
global.AbortController = class AbortController {
  signal: AbortSignal;

  constructor() {
    this.signal = {
      aborted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      onabort: null,
      reason: undefined,
      throwIfAborted: jest.fn(),
    } as any;
  }

  abort(reason?: any): void {
    (this.signal as any).aborted = true;
    (this.signal as any).reason = reason;
    if (this.signal.onabort) {
      this.signal.onabort(new Event('abort'));
    }
  }
};

// Mock FormData
global.FormData = class FormData {
  private data: Map<string, any> = new Map();

  append(name: string, value: any): void {
    this.data.set(name, value);
  }

  get(name: string): any {
    return this.data.get(name);
  }

  has(name: string): boolean {
    return this.data.has(name);
  }

  delete(name: string): void {
    this.data.delete(name);
  }

  set(name: string, value: any): void {
    this.data.set(name, value);
  }

  *[Symbol.iterator](): Iterator<[string, any]> {
    for (const [name, value] of this.data) {
      yield [name, value];
    }
  }
};
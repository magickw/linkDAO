/**
 * Mock Cache APIs for Testing
 * Provides comprehensive mocks for Cache Storage API
 */

// Mock Cache interface
class MockCache {
  private storage = new Map<string, Response>();
  public name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  async match(request: RequestInfo | URL, options?: CacheQueryOptions): Promise<Response | undefined> {
    const key = typeof request === 'string' ? request : request.toString();
    const response = this.storage.get(key);
    
    if (response) {
      // Clone response to simulate real Cache API behavior
      return response.clone();
    }
    
    return undefined;
  }
  
  async matchAll(request?: RequestInfo | URL, options?: CacheQueryOptions): Promise<Response[]> {
    if (!request) {
      return Array.from(this.storage.values()).map(response => response.clone());
    }
    
    const key = typeof request === 'string' ? request : request.toString();
    const response = this.storage.get(key);
    
    return response ? [response.clone()] : [];
  }
  
  async add(request: RequestInfo | URL): Promise<void> {
    const response = await fetch(request);
    await this.put(request, response);
  }
  
  async addAll(requests: RequestInfo[]): Promise<void> {
    await Promise.all(requests.map(request => this.add(request)));
  }
  
  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    const key = typeof request === 'string' ? request : request.toString();
    
    // Validate response
    if (!response.ok && response.status !== 0) {
      throw new TypeError('Response is not ok');
    }
    
    // Clone response to simulate real Cache API behavior
    this.storage.set(key, response.clone());
  }
  
  async delete(request: RequestInfo | URL, options?: CacheQueryOptions): Promise<boolean> {
    const key = typeof request === 'string' ? request : request.toString();
    return this.storage.delete(key);
  }
  
  async keys(request?: RequestInfo | URL, options?: CacheQueryOptions): Promise<Request[]> {
    const keys = Array.from(this.storage.keys());
    
    if (request) {
      const requestKey = typeof request === 'string' ? request : request.toString();
      return keys.includes(requestKey) ? [new Request(requestKey)] : [];
    }
    
    return keys.map(key => new Request(key));
  }
  
  // Helper methods for testing
  clear(): void {
    this.storage.clear();
  }
  
  size(): number {
    return this.storage.size;
  }
  
  has(request: RequestInfo | URL): boolean {
    const key = typeof request === 'string' ? request : request.toString();
    return this.storage.has(key);
  }
}

// Mock CacheStorage interface
class MockCacheStorage {
  private caches = new Map<string, MockCache>();
  
  async open(cacheName: string): Promise<Cache> {
    if (!this.caches.has(cacheName)) {
      this.caches.set(cacheName, new MockCache(cacheName));
    }
    
    return this.caches.get(cacheName)! as any;
  }
  
  async has(cacheName: string): Promise<boolean> {
    return this.caches.has(cacheName);
  }
  
  async delete(cacheName: string): Promise<boolean> {
    return this.caches.delete(cacheName);
  }
  
  async keys(): Promise<string[]> {
    return Array.from(this.caches.keys());
  }
  
  async match(request: RequestInfo | URL, options?: MultiCacheQueryOptions): Promise<Response | undefined> {
    // Search through all caches
    for (const cache of this.caches.values()) {
      const response = await cache.match(request, options);
      if (response) {
        return response;
      }
    }
    
    return undefined;
  }
  
  // Helper methods for testing
  clear(): void {
    this.caches.clear();
  }
  
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }
  
  getCache(name: string): MockCache | undefined {
    return this.caches.get(name);
  }
  
  getAllCaches(): MockCache[] {
    return Array.from(this.caches.values());
  }
}

// Create global mock instance
const mockCacheStorage = new MockCacheStorage();

// Mock global caches
Object.defineProperty(global, 'caches', {
  value: mockCacheStorage,
  writable: true
});

// Mock Request constructor if not available
if (typeof global.Request === 'undefined') {
  global.Request = class MockRequest {
    url: string;
    method: string;
    headers: Headers;
    body: ReadableStream | null;
    
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      this.url = typeof input === 'string' ? input : input.toString();
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this.body = init?.body as ReadableStream || null;
    }
    
    clone(): Request {
      return new (global.Request as any)(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body
      });
    }
    
    toString(): string {
      return this.url;
    }
  } as any;
}

// Mock Response constructor if not available
if (typeof global.Response === 'undefined') {
  global.Response = class MockResponse {
    ok: boolean;
    status: number;
    statusText: string;
    headers: Headers;
    body: ReadableStream | null;
    url: string;
    type: ResponseType;
    redirected: boolean;
    private _body: string;
    
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this._body = typeof body === 'string' ? body : JSON.stringify(body) || '';
      this.ok = (init?.status || 200) >= 200 && (init?.status || 200) < 300;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      this.headers = new Headers(init?.headers);
      this.body = null;
      this.url = '';
      this.type = 'basic';
      this.redirected = false;
    }
    
    clone(): Response {
      return new (global.Response as any)(this._body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers
      });
    }
    
    async text(): Promise<string> {
      return this._body;
    }
    
    async json(): Promise<any> {
      return JSON.parse(this._body);
    }
    
    async blob(): Promise<Blob> {
      return new Blob([this._body]);
    }
    
    async arrayBuffer(): Promise<ArrayBuffer> {
      return new TextEncoder().encode(this._body).buffer;
    }
    
    async formData(): Promise<FormData> {
      const formData = new FormData();
      // Simple implementation for testing
      return formData;
    }
  } as any;
}

// Mock Headers constructor if not available
if (typeof global.Headers === 'undefined') {
  global.Headers = class MockHeaders {
    private headers = new Map<string, string>();
    
    constructor(init?: HeadersInit) {
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value));
        } else {
          Object.entries(init).forEach(([key, value]) => this.set(key, value));
        }
      }
    }
    
    append(name: string, value: string): void {
      const existing = this.headers.get(name.toLowerCase());
      this.headers.set(name.toLowerCase(), existing ? `${existing}, ${value}` : value);
    }
    
    delete(name: string): void {
      this.headers.delete(name.toLowerCase());
    }
    
    get(name: string): string | null {
      return this.headers.get(name.toLowerCase()) || null;
    }
    
    has(name: string): boolean {
      return this.headers.has(name.toLowerCase());
    }
    
    set(name: string, value: string): void {
      this.headers.set(name.toLowerCase(), value);
    }
    
    forEach(callback: (value: string, key: string, parent: Headers) => void): void {
      this.headers.forEach((value, key) => callback(value, key, this as any));
    }
    
    entries(): IterableIterator<[string, string]> {
      return this.headers.entries();
    }
    
    keys(): IterableIterator<string> {
      return this.headers.keys();
    }
    
    values(): IterableIterator<string> {
      return this.headers.values();
    }
    
    [Symbol.iterator](): IterableIterator<[string, string]> {
      return this.headers.entries();
    }
  } as any;
}

// Mock fetch if not available
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    
    // Default mock response
    const mockData = { message: 'Mock response', url };
    
    return Promise.resolve(new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }));
  }) as any;
}

// Export mocks for direct access in tests
export {
  MockCache,
  MockCacheStorage,
  mockCacheStorage
};
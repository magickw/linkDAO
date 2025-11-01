/**
 * Security Validation Tests for Cache System
 * Tests user session-based cache isolation, automatic cleanup, PII detection, and security compliance
 */

import { cacheAccessControl } from '../cacheAccessControl';
import { cacheDataProtection } from '../cacheDataProtection';
import { serviceWorkerCacheService } from '../serviceWorkerCacheService';

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

// Mock caches API
const mockCaches = {
  open: jest.fn(),
  keys: jest.fn(),
  delete: jest.fn(),
};

// Mock cache instance
const mockCache = {
  match: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
};

// Setup mocks
beforeAll(() => {
  global.indexedDB = mockIndexedDB as any;
  global.caches = mockCaches as any;
  
  // Mock Response constructor
  global.Response = class MockResponse {
    public body: any;
    public headers: Map<string, string>;
    public ok: boolean;
    public status: number;
    public statusText: string;

    constructor(body?: any, init?: ResponseInit) {
      this.body = body;
      this.headers = new Map();
      this.ok = (init?.status || 200) >= 200 && (init?.status || 200) < 300;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      
      if (init?.headers) {
        Object.entries(init.headers).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value as string);
        });
      }
    }

    clone() {
      return new MockResponse(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: Object.fromEntries(this.headers.entries())
      });
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }

    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }

    get(name: string) {
      return this.headers.get(name.toLowerCase()) || null;
    }
  };

  // Add headers property to Response prototype
  Object.defineProperty(global.Response.prototype, 'headers', {
    get() {
      return {
        get: (name: string) => this.headers.get(name.toLowerCase()) || null,
        has: (name: string) => this.headers.has(name.toLowerCase()),
        entries: () => this.headers.entries(),
        keys: () => this.headers.keys(),
        values: () => this.headers.values()
      };
    }
  });
  } as any;

  // Mock service worker support
  Object.defineProperty(global.navigator, 'serviceWorker', {
    value: {
      register: jest.fn(),
      ready: Promise.resolve({
        navigationPreload: {
          enable: jest.fn(),
          disable: jest.fn(),
          setHeaderValue: jest.fn(),
        },
      }),
      controller: {
        postMessage: jest.fn(),
      },
    },
    writable: true,
  });

  // Mock storage API
  Object.defineProperty(global.navigator, 'storage', {
    value: {
      estimate: jest.fn().mockResolvedValue({
        usage: 1000000,
        quota: 10000000,
      }),
    },
    writable: true,
  });

  // Mock window.caches
  Object.defineProperty(global.window, 'caches', {
    value: mockCaches,
    writable: true,
  });

  // Mock ServiceWorkerRegistration
  global.ServiceWorkerRegistration = class MockServiceWorkerRegistration {
    static prototype = {
      navigationPreload: true,
      sync: true
    };
  } as any;
});

beforeEach(() => {
  jest.clearAllMocks();
  
  // Setup default mock implementations
  mockIndexedDB.open.mockImplementation(() => {
    const mockStore = {
      put: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
      get: jest.fn().mockReturnValue({ onsuccess: null, onerror: null, result: null }),
      delete: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
      getAll: jest.fn().mockReturnValue({ onsuccess: null, onerror: null, result: [] }),
      clear: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
      createIndex: jest.fn(),
    };

    const request = {
      result: {
        transaction: jest.fn().mockReturnValue({
          objectStore: jest.fn().mockReturnValue(mockStore),
        }),
        objectStoreNames: {
          contains: jest.fn().mockReturnValue(false),
        },
        createObjectStore: jest.fn().mockReturnValue({
          createIndex: jest.fn(),
        }),
      },
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };
    
    setTimeout(() => {
      if (request.onsuccess) request.onsuccess({ target: request });
    }, 0);
    
    return request;
  });

  mockCaches.open.mockResolvedValue(mockCache);
  mockCaches.keys.mockResolvedValue(['cache-v1', 'sensitive-cache-v1']);
  mockCache.keys.mockResolvedValue([]);
  mockCache.match.mockResolvedValue(null);
});

describe('Cache Access Control', () => {
  describe('User Session Management', () => {
    test('should create user session with proper isolation', async () => {
      await cacheAccessControl.initialize();
      
      const userId = 'user123';
      const walletAddress = '0x1234567890abcdef';
      
      await cacheAccessControl.setUserSession(userId, walletAddress);
      
      const session = cacheAccessControl.getCurrentSession();
      expect(session).toBeTruthy();
      expect(session?.userId).toBe(userId);
      expect(session?.walletAddress).toBe(walletAddress);
      expect(session?.sessionId).toBeTruthy();
      expect(session?.expiresAt).toBeGreaterThan(Date.now());
    });

    test('should generate user-scoped cache keys', async () => {
      await cacheAccessControl.initialize();
      await cacheAccessControl.setUserSession('user123');
      
      const url = '/api/feed';
      const cacheKey = cacheAccessControl.generateSecureCacheKey(url);
      
      expect(cacheKey).toContain('user123');
      expect(cacheKey).toContain('/api/feed');
    });

    test('should validate cache access permissions', async () => {
      await cacheAccessControl.initialize();
      await cacheAccessControl.setUserSession('user123');
      
      const validation = await cacheAccessControl.validateCacheAccess('/api/feed', 'read');
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.userScope).toBe('user123');
    });

    test('should deny access without active session', async () => {
      await cacheAccessControl.initialize();
      
      const validation = await cacheAccessControl.validateCacheAccess('/api/feed', 'read');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('No active user session');
    });

    test('should bind sensitive URLs to session', async () => {
      await cacheAccessControl.initialize();
      await cacheAccessControl.setUserSession('user123');
      
      const sensitiveUrl = '/api/user/private';
      const cacheKey = cacheAccessControl.generateSecureCacheKey(sensitiveUrl);
      
      expect(cacheKey).toContain('session_');
    });
  });

  describe('Session Cleanup', () => {
    test('should clear user-scoped caches on logout', async () => {
      await cacheAccessControl.initialize();
      await cacheAccessControl.setUserSession('user123');
      
      // Mock cache with user-scoped entries
      const userCacheKey = 'user123:/api/feed';
      mockCache.keys.mockResolvedValue([
        { url: userCacheKey },
        { url: 'other-user:/api/feed' },
        { url: '/api/public' },
      ]);
      
      await cacheAccessControl.clearSession();
      
      expect(mockCache.delete).toHaveBeenCalledWith({ url: userCacheKey });
      expect(mockCache.delete).not.toHaveBeenCalledWith({ url: 'other-user:/api/feed' });
    });

    test('should switch user accounts properly', async () => {
      await cacheAccessControl.initialize();
      await cacheAccessControl.setUserSession('user123');
      
      const oldSession = cacheAccessControl.getCurrentSession();
      expect(oldSession?.userId).toBe('user123');
      
      await cacheAccessControl.switchUserAccount('user456');
      
      const newSession = cacheAccessControl.getCurrentSession();
      expect(newSession?.userId).toBe('user456');
      expect(newSession?.sessionId).not.toBe(oldSession?.sessionId);
    });

    test('should handle expired sessions', async () => {
      await cacheAccessControl.initialize();
      
      // Create session with immediate expiration
      const userId = 'user123';
      await cacheAccessControl.setUserSession(userId);
      
      // Manually expire the session
      const session = cacheAccessControl.getCurrentSession();
      if (session) {
        session.expiresAt = Date.now() - 1000; // Expired 1 second ago
      }
      
      const validation = await cacheAccessControl.validateCacheAccess('/api/feed', 'read');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Session expired');
    });
  });
});

describe('Data Protection and Privacy Controls', () => {
  describe('PII Detection', () => {
    test('should detect email addresses', async () => {
      await cacheDataProtection.initialize();
      
      const content = 'Contact us at support@example.com for help';
      const result = await cacheDataProtection.filterContent(content);
      
      expect(result.hasPrivacyIssues).toBe(true);
      expect(result.detectedPII).toHaveLength(1);
      expect(result.detectedPII[0].type).toBe('email');
      expect(result.detectedPII[0].severity).toBe('high');
    });

    test('should detect phone numbers', async () => {
      await cacheDataProtection.initialize();
      
      const content = 'Call us at (555) 123-4567';
      const result = await cacheDataProtection.filterContent(content);
      
      expect(result.hasPrivacyIssues).toBe(true);
      expect(result.detectedPII).toHaveLength(1);
      expect(result.detectedPII[0].type).toBe('phone');
    });

    test('should detect wallet addresses', async () => {
      await cacheDataProtection.initialize();
      
      const content = 'Send to 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const result = await cacheDataProtection.filterContent(content);
      
      expect(result.hasPrivacyIssues).toBe(true);
      expect(result.detectedPII.some(pii => pii.type === 'wallet_address')).toBe(true);
    });

    test('should block critical PII from caching', async () => {
      await cacheDataProtection.initialize();
      
      const content = 'SSN: 123-45-6789';
      const result = await cacheDataProtection.filterContent(content);
      
      expect(result.isAllowed).toBe(false);
      expect(result.hasPrivacyIssues).toBe(true);
      expect(result.detectedPII[0].severity).toBe('critical');
    });

    test('should redact PII when auto-redaction is enabled', async () => {
      await cacheDataProtection.initialize();
      
      const content = 'Email me at john.doe@example.com';
      const result = await cacheDataProtection.filterContent(content);
      
      expect(result.redactedContent).toBeTruthy();
      expect(result.redactedContent).not.toContain('john.doe@example.com');
      expect(result.redactedContent).toMatch(/jo\*+om/);
    });
  });

  describe('Privacy Headers Compliance', () => {
    test('should respect no-store directive', async () => {
      await cacheDataProtection.initialize();
      
      const response = new Response('test', {
        headers: { 'cache-control': 'no-store' }
      });
      
      const validation = cacheDataProtection.validateCacheHeaders(response);
      
      expect(validation.shouldCache).toBe(false);
      expect(validation.reasons).toContain('Response contains no-store or no-cache directive');
    });

    test('should respect private directive', async () => {
      await cacheDataProtection.initialize();
      
      const response = new Response('test', {
        headers: { 'cache-control': 'private' }
      });
      
      const validation = cacheDataProtection.validateCacheHeaders(response);
      
      expect(validation.shouldCache).toBe(false);
      expect(validation.reasons).toContain('Response marked as private');
    });

    test('should respect no-cache directive', async () => {
      await cacheDataProtection.initialize();
      
      const response = new Response('test', {
        headers: { 'cache-control': 'no-cache' }
      });
      
      const validation = cacheDataProtection.validateCacheHeaders(response);
      
      expect(validation.shouldCache).toBe(false);
      expect(validation.reasons).toContain('Response contains no-cache directive');
    });

    test('should check expires header', async () => {
      await cacheDataProtection.initialize();
      
      const pastDate = new Date(Date.now() - 1000).toUTCString();
      const response = new Response('test', {
        headers: { 'expires': pastDate }
      });
      
      const validation = cacheDataProtection.validateCacheHeaders(response);
      
      expect(validation.shouldCache).toBe(false);
      expect(validation.reasons).toContain('Response already expired');
    });
  });

  describe('Sensitive Data Handling', () => {
    test('should identify sensitive URLs', async () => {
      await cacheDataProtection.initialize();
      
      const sensitiveUrls = [
        '/api/user/private',
        '/api/wallet/private',
        '/api/messages/private',
        '/api/admin/sensitive'
      ];
      
      sensitiveUrls.forEach(url => {
        expect(cacheDataProtection.isSensitiveUrl(url)).toBe(true);
      });
    });

    test('should generate privacy-compliant cache keys', async () => {
      await cacheDataProtection.initialize();
      
      const sensitiveUrl = '/api/user/private';
      const cacheKey = cacheDataProtection.generatePrivacyCacheKey(sensitiveUrl, 'user123');
      
      expect(cacheKey).toContain('sensitive-');
      expect(cacheKey).toContain('user123');
    });

    test('should cleanup sensitive caches', async () => {
      await cacheDataProtection.initialize();
      
      // Mock sensitive cache entries
      const sensitiveResponse = new Response('sensitive data', {
        headers: { 'x-cache-time': (Date.now() - 10 * 60 * 1000).toString() } // 10 minutes old
      });
      
      mockCache.keys.mockResolvedValue([
        { url: 'sensitive-/api/user/private' },
        { url: '/api/public' }
      ]);
      
      mockCache.match.mockImplementation((request) => {
        if (request.url.includes('sensitive-')) {
          return Promise.resolve(sensitiveResponse);
        }
        return Promise.resolve(null);
      });
      
      await cacheDataProtection.cleanupSensitiveCaches();
      
      expect(mockCache.delete).toHaveBeenCalledWith({ url: 'sensitive-/api/user/private' });
    });
  });

  describe('Content Validation', () => {
    test('should validate response content before caching', async () => {
      await cacheDataProtection.initialize();
      
      const response = new Response(JSON.stringify({ message: 'Hello World' }), {
        headers: { 'content-type': 'application/json' }
      });
      
      const validation = await cacheDataProtection.validateResponseContent(response);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    test('should filter response with PII', async () => {
      await cacheDataProtection.initialize();
      
      const responseData = JSON.stringify({ 
        message: 'Contact support@example.com',
        user: 'john.doe@example.com'
      });
      
      const response = new Response(responseData, {
        headers: { 'content-type': 'application/json' }
      });
      
      const validation = await cacheDataProtection.validateResponseContent(response);
      
      expect(validation.isValid).toBe(true);
      expect(validation.filteredResponse).toBeTruthy();
      
      const filteredText = await validation.filteredResponse!.text();
      expect(filteredText).not.toContain('support@example.com');
      expect(filteredText).not.toContain('john.doe@example.com');
    });

    test('should reject non-cacheable content types', async () => {
      await cacheDataProtection.initialize();
      
      const response = new Response('binary data', {
        headers: { 'content-type': 'application/octet-stream' }
      });
      
      const validation = await cacheDataProtection.validateResponseContent(response);
      
      expect(validation.isValid).toBe(false);
      expect(validation.warnings).toContain('Content type not cacheable');
    });
  });
});

describe('Service Worker Cache Service Integration', () => {
  describe('Security Integration', () => {
    test('should integrate access control with fetch strategy', async () => {
      await serviceWorkerCacheService.initialize();
      await serviceWorkerCacheService.setUserSession('user123');
      
      // Mock successful access validation
      jest.spyOn(cacheAccessControl, 'validateCacheAccess').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        userScope: 'user123'
      });
      
      // Mock network response
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );
      
      const response = await serviceWorkerCacheService.fetchWithStrategy('/api/feed');
      
      expect(response).toBeTruthy();
      expect(cacheAccessControl.validateCacheAccess).toHaveBeenCalledWith('/api/feed', 'read');
    });

    test('should deny fetch when access control fails', async () => {
      await serviceWorkerCacheService.initialize();
      
      // Mock failed access validation
      jest.spyOn(cacheAccessControl, 'validateCacheAccess').mockResolvedValue({
        isValid: false,
        errors: ['No active user session'],
        warnings: []
      });
      
      await expect(
        serviceWorkerCacheService.fetchWithStrategy('/api/feed')
      ).rejects.toThrow('Cache access denied: No active user session');
    });

    test('should integrate data protection with put operations', async () => {
      await serviceWorkerCacheService.initialize();
      await serviceWorkerCacheService.setUserSession('user123');
      
      // Mock successful validations
      jest.spyOn(cacheAccessControl, 'validateCacheAccess').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        userScope: 'user123'
      });
      
      jest.spyOn(cacheDataProtection, 'validateResponseContent').mockResolvedValue({
        isValid: true,
        warnings: []
      });
      
      const response = new Response(JSON.stringify({ data: 'test' }), {
        headers: { 'content-type': 'application/json' }
      });
      
      await serviceWorkerCacheService.putWithMetadata('/api/test', response);
      
      expect(cacheAccessControl.validateCacheAccess).toHaveBeenCalledWith('/api/test', 'write');
      expect(cacheDataProtection.validateResponseContent).toHaveBeenCalledWith(response);
    });

    test('should handle session management operations', async () => {
      await serviceWorkerCacheService.initialize();
      
      // Test setting session
      await serviceWorkerCacheService.setUserSession('user123', '0xwallet');
      let session = serviceWorkerCacheService.getCurrentUserSession();
      expect(session?.userId).toBe('user123');
      expect(session?.walletAddress).toBe('0xwallet');
      
      // Test switching accounts
      await serviceWorkerCacheService.switchUserAccount('user456');
      session = serviceWorkerCacheService.getCurrentUserSession();
      expect(session?.userId).toBe('user456');
      
      // Test clearing session
      await serviceWorkerCacheService.clearUserSession();
      session = serviceWorkerCacheService.getCurrentUserSession();
      expect(session).toBeNull();
    });
  });

  describe('CORS and Security Header Validation', () => {
    test('should validate origin for cache operations', async () => {
      await cacheAccessControl.initialize();
      await cacheAccessControl.setUserSession('user123');
      
      // Mock different origin
      const originalOrigin = window.location.origin;
      Object.defineProperty(window.location, 'origin', {
        value: 'https://malicious-site.com',
        writable: true
      });
      
      const validation = await cacheAccessControl.validateCacheAccess('/api/feed', 'read');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid origin for cache access');
      
      // Restore original origin
      Object.defineProperty(window.location, 'origin', {
        value: originalOrigin,
        writable: true
      });
    });

    test('should handle CORS preflight responses', async () => {
      await cacheDataProtection.initialize();
      
      const corsResponse = new Response('', {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST',
          'access-control-allow-headers': 'Content-Type'
        }
      });
      
      const validation = cacheDataProtection.validateCacheHeaders(corsResponse);
      
      expect(validation.shouldCache).toBe(true);
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  test('should handle IndexedDB initialization failure', async () => {
    mockIndexedDB.open.mockImplementation(() => {
      const request = {
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
      };
      
      setTimeout(() => {
        if (request.onerror) request.onerror(new Error('IndexedDB failed'));
      }, 0);
      
      return request;
    });
    
    // Should not throw, but log error
    await expect(cacheAccessControl.initialize()).resolves.not.toThrow();
  });

  test('should handle cache API unavailability', async () => {
    const originalCaches = global.caches;
    delete (global as any).caches;
    
    await cacheDataProtection.initialize();
    
    // Should handle gracefully
    await expect(cacheDataProtection.cleanupSensitiveCaches()).resolves.not.toThrow();
    
    global.caches = originalCaches;
  });

  test('should handle malformed response content', async () => {
    await cacheDataProtection.initialize();
    
    const malformedResponse = new Response('invalid json {', {
      headers: { 'content-type': 'application/json' }
    });
    
    const validation = await cacheDataProtection.validateResponseContent(malformedResponse);
    
    expect(validation.isValid).toBe(true); // Should still be valid for caching
  });

  test('should handle network errors during validation', async () => {
    await cacheAccessControl.initialize();
    
    // Mock network error
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const validation = await cacheAccessControl.validateCacheAccess('/api/feed', 'read');
    
    // Should handle gracefully without throwing
    expect(validation).toBeTruthy();
  });
});
# Service Worker Cache Enhancement - Developer Guide

## Getting Started

This guide helps developers integrate and use the enhanced service worker cache system in their applications.

## Installation and Setup

### Prerequisites

- Node.js 18+
- Modern browser with service worker support
- HTTPS environment (required for service workers)

### Installation

```bash
# Install dependencies
npm install workbox-webpack-plugin workbox-window workbox-strategies

# Install development dependencies
npm install --save-dev @types/serviceworker
```

### Basic Configuration

#### 1. Workbox Configuration

Create `workbox-config.js` in your project root:

```javascript
module.exports = {
  globDirectory: 'public/',
  globPatterns: [
    '**/*.{js,css,html,png,jpg,jpeg,svg,woff,woff2}'
  ],
  swDest: 'public/sw-enhanced.js',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.yourapp\.com\/feed/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'feed-cache-v1',
        networkTimeoutSeconds: 3,
        plugins: [
          {
            cacheKeyWillBeUsed: async ({ request }) => {
              return `${request.url}?v=${Date.now()}`;
            }
          }
        ]
      }
    }
  ]
};
```

#### 2. Service Worker Registration

```typescript
// utils/serviceWorker.ts
import { Workbox } from 'workbox-window';

class ServiceWorkerManager {
  private wb: Workbox | null = null;
  private isRegistered = false;

  async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported');
      return;
    }

    this.wb = new Workbox('/sw-enhanced.js');

    // Listen for updates
    this.wb.addEventListener('waiting', (event) => {
      this.showUpdatePrompt();
    });

    // Register service worker
    await this.wb.register();
    this.isRegistered = true;
  }

  private showUpdatePrompt(): void {
    if (confirm('New version available. Update now?')) {
      this.wb?.messageSkipWaiting();
      window.location.reload();
    }
  }
}

export const swManager = new ServiceWorkerManager();
```

## Using the Enhanced Cache Service

### Basic Usage

```typescript
import { ServiceWorkerCacheService } from './services/serviceWorkerCacheService';

const cacheService = new ServiceWorkerCacheService();

// Fetch with caching strategy
const response = await cacheService.fetchWithStrategy(
  '/api/feed',
  'NetworkFirst',
  {
    networkTimeoutSeconds: 3,
    tags: ['feed', 'user-content']
  }
);

// Cache with metadata
await cacheService.putWithMetadata(
  '/api/user/profile',
  response,
  {
    timestamp: Date.now(),
    ttl: 300000, // 5 minutes
    tags: ['profile', 'user-data'],
    priority: 'high'
  }
);
```

### Feature-Specific Implementations

#### Feed Caching

```typescript
class FeedService {
  private cacheService = new ServiceWorkerCacheService();

  async getFeed(page = 1): Promise<FeedResponse> {
    const url = `/api/feed?page=${page}`;
    
    const response = await this.cacheService.fetchWithStrategy(
      url,
      'NetworkFirst',
      {
        networkTimeoutSeconds: 3,
        cacheName: 'feed-cache-v1',
        tags: ['feed', `page-${page}`],
        metadata: {
          priority: 'high',
          preloadNext: page < 5 // Preload next 5 pages
        }
      }
    );

    // Preload next page if needed
    if (response.ok && page < 5) {
      this.preloadNextPage(page + 1);
    }

    return response.json();
  }

  private async preloadNextPage(page: number): void {
    const nextUrl = `/api/feed?page=${page}`;
    
    // Preload in background
    setTimeout(() => {
      this.cacheService.fetchWithStrategy(
        nextUrl,
        'NetworkFirst',
        {
          tags: ['feed', `page-${page}`, 'preload']
        }
      );
    }, 1000);
  }

  async invalidateFeed(): Promise<void> {
    await this.cacheService.invalidateByTag('feed');
  }
}
```

#### Community Caching

```typescript
class CommunityService {
  private cacheService = new ServiceWorkerCacheService();

  async getCommunity(id: string): Promise<Community> {
    const response = await this.cacheService.fetchWithStrategy(
      `/api/communities/${id}`,
      'StaleWhileRevalidate',
      {
        cacheName: 'communities-cache-v1',
        tags: ['community', `community-${id}`],
        metadata: {
          bundlePreload: true // Enable bundled preloading
        }
      }
    );

    const community = await response.json();

    // Preload related resources
    if (community) {
      this.preloadCommunityAssets(community);
    }

    return community;
  }

  private async preloadCommunityAssets(community: Community): void {
    const preloadTasks = [
      // Preload community icon
      this.cacheService.fetchWithStrategy(
        community.iconUrl,
        'CacheFirst',
        { tags: ['community-assets', `community-${community.id}`] }
      ),
      
      // Preload top posts
      this.cacheService.fetchWithStrategy(
        `/api/communities/${community.id}/posts?limit=10`,
        'StaleWhileRevalidate',
        { tags: ['community-posts', `community-${community.id}`] }
      )
    ];

    await Promise.all(preloadTasks);
  }
}
```

#### Marketplace Caching

```typescript
class MarketplaceService {
  private cacheService = new ServiceWorkerCacheService();

  async getProducts(filters: ProductFilters): Promise<Product[]> {
    const url = `/api/products?${new URLSearchParams(filters)}`;
    
    const response = await this.cacheService.fetchWithStrategy(
      url,
      'NetworkFirst',
      {
        networkTimeoutSeconds: 2,
        cacheName: 'marketplace-listings-v1',
        tags: ['marketplace', 'products'],
        metadata: {
          etagValidation: true,
          priceValidation: true
        }
      }
    );

    return response.json();
  }

  async getProductImage(imageUrl: string): Promise<Response> {
    return this.cacheService.fetchWithStrategy(
      imageUrl,
      'CacheFirst',
      {
        cacheName: 'marketplace-images-v1',
        tags: ['marketplace', 'images'],
        metadata: {
          maxAgeSeconds: 86400, // 24 hours
          responsive: true
        }
      }
    );
  }

  async getPricing(productId: string): Promise<PricingInfo> {
    const response = await this.cacheService.fetchWithStrategy(
      `/api/products/${productId}/pricing`,
      'NetworkFirst',
      {
        networkTimeoutSeconds: 1,
        cacheName: 'marketplace-pricing-v1',
        tags: ['pricing', `product-${productId}`],
        metadata: {
          maxAgeSeconds: 300, // 5 minutes
          etagValidation: true
        }
      }
    );

    return response.json();
  }
}
```

### Offline Support

#### Background Sync Implementation

```typescript
class OfflineActionManager {
  private cacheService = new ServiceWorkerCacheService();

  async queueAction(action: OfflineAction): Promise<void> {
    // Store action in IndexedDB
    await this.storeOfflineAction(action);
    
    // Register background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('background-sync');
    } else {
      // Fallback: process when online
      this.processWhenOnline();
    }
  }

  private async storeOfflineAction(action: OfflineAction): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(['offline-actions'], 'readwrite');
    await tx.objectStore('offline-actions').add(action);
  }

  private processWhenOnline(): void {
    const handleOnline = async () => {
      await this.cacheService.flushOfflineQueue();
      window.removeEventListener('online', handleOnline);
    };

    if (navigator.onLine) {
      handleOnline();
    } else {
      window.addEventListener('online', handleOnline);
    }
  }
}
```

#### Encrypted Message Storage

```typescript
class SecureMessageStorage {
  private encryptionKey: CryptoKey | null = null;

  async storeMessage(message: Message): Promise<void> {
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(message))
    );

    const db = await this.openDB();
    const tx = db.transaction(['messages'], 'readwrite');
    await tx.objectStore('messages').add({
      id: message.id,
      encryptedData,
      iv,
      timestamp: Date.now()
    });
  }

  async getMessage(id: string): Promise<Message | null> {
    const db = await this.openDB();
    const tx = db.transaction(['messages'], 'readonly');
    const stored = await tx.objectStore('messages').get(id);

    if (!stored) return null;

    const key = await this.getEncryptionKey();
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: stored.iv },
      key,
      stored.encryptedData
    );

    return JSON.parse(new TextDecoder().decode(decryptedData));
  }

  private async getEncryptionKey(): Promise<CryptoKey> {
    if (!this.encryptionKey) {
      // Derive key from session data
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(sessionStorage.getItem('session-id') || ''),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('cache-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }

    return this.encryptionKey;
  }
}
```

## Performance Optimization

### Intelligent Preloading

```typescript
class IntelligentPreloader {
  private cacheService = new ServiceWorkerCacheService();
  private observer: IntersectionObserver;

  constructor() {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.preloadContent(entry.target);
          }
        });
      },
      { rootMargin: '200px' } // Preload 200px before visible
    );
  }

  observeElement(element: Element, preloadData: PreloadData): void {
    element.setAttribute('data-preload', JSON.stringify(preloadData));
    this.observer.observe(element);
  }

  private async preloadContent(element: Element): Promise<void> {
    const preloadData = JSON.parse(element.getAttribute('data-preload') || '{}');
    
    if (preloadData.urls) {
      const preloadPromises = preloadData.urls.map((url: string) =>
        this.cacheService.fetchWithStrategy(url, 'CacheFirst', {
          tags: ['preload']
        })
      );

      await Promise.all(preloadPromises);
    }
  }
}
```

### Cache Performance Monitoring

```typescript
class CachePerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();

  recordCacheHit(cacheName: string, responseTime: number): void {
    const metric = this.getOrCreateMetric(cacheName);
    metric.hits++;
    metric.totalResponseTime += responseTime;
    metric.averageResponseTime = metric.totalResponseTime / (metric.hits + metric.misses);
  }

  recordCacheMiss(cacheName: string, responseTime: number): void {
    const metric = this.getOrCreateMetric(cacheName);
    metric.misses++;
    metric.totalResponseTime += responseTime;
    metric.averageResponseTime = metric.totalResponseTime / (metric.hits + metric.misses);
  }

  getMetrics(): Record<string, PerformanceMetric> {
    const result: Record<string, PerformanceMetric> = {};
    
    this.metrics.forEach((metric, cacheName) => {
      result[cacheName] = {
        ...metric,
        hitRate: metric.hits / (metric.hits + metric.misses)
      };
    });

    return result;
  }

  private getOrCreateMetric(cacheName: string): PerformanceMetric {
    if (!this.metrics.has(cacheName)) {
      this.metrics.set(cacheName, {
        hits: 0,
        misses: 0,
        totalResponseTime: 0,
        averageResponseTime: 0
      });
    }
    return this.metrics.get(cacheName)!;
  }
}
```

## Testing

### Unit Testing Cache Service

```typescript
// __tests__/cacheService.test.ts
import { ServiceWorkerCacheService } from '../serviceWorkerCacheService';

describe('ServiceWorkerCacheService', () => {
  let cacheService: ServiceWorkerCacheService;
  let mockCaches: jest.Mocked<CacheStorage>;

  beforeEach(() => {
    mockCaches = {
      open: jest.fn(),
      match: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      keys: jest.fn()
    } as any;

    global.caches = mockCaches;
    cacheService = new ServiceWorkerCacheService();
  });

  it('should fetch with NetworkFirst strategy', async () => {
    const mockResponse = new Response('test data');
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const response = await cacheService.fetchWithStrategy(
      '/api/test',
      'NetworkFirst'
    );

    expect(fetch).toHaveBeenCalledWith('/api/test');
    expect(response).toBe(mockResponse);
  });

  it('should invalidate cache by tag', async () => {
    const mockCache = {
      keys: jest.fn().mockResolvedValue([
        new Request('/api/test1'),
        new Request('/api/test2')
      ]),
      delete: jest.fn().mockResolvedValue(true)
    };

    mockCaches.open.mockResolvedValue(mockCache as any);

    await cacheService.invalidateByTag('test-tag');

    expect(mockCache.delete).toHaveBeenCalledTimes(2);
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/cacheIntegration.test.ts
describe('Cache Integration', () => {
  it('should handle offline/online transitions', async () => {
    // Simulate offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const cacheService = new ServiceWorkerCacheService();
    
    // Should serve from cache when offline
    const offlineResponse = await cacheService.fetchWithStrategy(
      '/api/cached-data',
      'NetworkFirst'
    );

    expect(offlineResponse).toBeDefined();

    // Simulate going online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Should fetch fresh data when online
    const onlineResponse = await cacheService.fetchWithStrategy(
      '/api/cached-data',
      'NetworkFirst'
    );

    expect(onlineResponse).toBeDefined();
  });
});
```

## Best Practices

### 1. Cache Strategy Selection

- **NetworkFirst**: Use for frequently changing content (feeds, user data)
- **CacheFirst**: Use for static assets (images, fonts, CSS)
- **StaleWhileRevalidate**: Use for content that can be slightly stale (community pages)

### 2. Cache Naming

```typescript
const CACHE_NAMES = {
  FEED: 'feed-cache-v1',
  COMMUNITIES: 'communities-cache-v1',
  MARKETPLACE: 'marketplace-cache-v1',
  IMAGES: 'images-cache-v1',
  STATIC: 'static-cache-v1'
};
```

### 3. Error Handling

```typescript
class RobustCacheService extends ServiceWorkerCacheService {
  async fetchWithStrategy(url: string, strategy: string, options?: CacheOptions): Promise<Response> {
    try {
      return await super.fetchWithStrategy(url, strategy, options);
    } catch (error) {
      console.error('Cache operation failed:', error);
      
      // Fallback to network
      return fetch(url);
    }
  }
}
```

### 4. Memory Management

```typescript
// Implement cache size monitoring
const monitorCacheSize = async () => {
  const estimate = await navigator.storage.estimate();
  const usagePercentage = (estimate.usage! / estimate.quota!) * 100;
  
  if (usagePercentage > 80) {
    await cacheService.performCleanup();
  }
};

// Run every 5 minutes
setInterval(monitorCacheSize, 300000);
```

This developer guide provides comprehensive information for integrating and using the enhanced service worker cache system effectively.
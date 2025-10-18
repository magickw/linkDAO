interface CacheConfig {
  name: string;
  version: string;
  maxAge: number; // in milliseconds
  maxEntries: number;
}

interface CacheStrategy {
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';
  cacheName: string;
  maxAge?: number;
}

class MobileServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isOnline = navigator.onLine;
  private cacheConfigs: Record<string, CacheConfig> = {
    static: {
      name: 'admin-static-v1',
      version: '1.0.0',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxEntries: 100
    },
    api: {
      name: 'admin-api-v1',
      version: '1.0.0',
      maxAge: 5 * 60 * 1000, // 5 minutes
      maxEntries: 50
    },
    images: {
      name: 'admin-images-v1',
      version: '1.0.0',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxEntries: 200
    }
  };

  constructor() {
    this.initializeServiceWorker();
    this.setupNetworkListeners();
  }

  private async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw-admin-mobile.js', {
          scope: '/admin/'
        });

        console.log('Mobile admin service worker registered:', this.registration);

        // Handle service worker updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                this.notifyUpdate();
              }
            });
          }
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleNetworkChange(false);
    });
  }

  private handleNetworkChange(isOnline: boolean): void {
    console.log(`Network status changed: ${isOnline ? 'online' : 'offline'}`);
    
    // Notify components about network status change
    window.dispatchEvent(new CustomEvent('networkStatusChange', {
      detail: { isOnline }
    }));

    if (isOnline) {
      // Sync any pending data when back online
      this.syncPendingData();
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated:', data);
        break;
      case 'OFFLINE_FALLBACK':
        this.handleOfflineFallback(data);
        break;
      case 'SYNC_BACKGROUND':
        this.handleBackgroundSync(data);
        break;
    }
  }

  private notifyUpdate(): void {
    // Show update notification to user
    const event = new CustomEvent('serviceWorkerUpdate', {
      detail: {
        message: 'A new version is available. Refresh to update.',
        action: () => this.updateServiceWorker()
      }
    });
    window.dispatchEvent(event);
  }

  async updateServiceWorker(): Promise<void> {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  // Cache management methods
  async cacheAdminData(key: string, data: any, strategy: CacheStrategy): Promise<void> {
    if (!this.registration) return;

    try {
      const cache = await caches.open(strategy.cacheName);
      const response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${strategy.maxAge || 300}`,
          'X-Cached-At': new Date().toISOString()
        }
      });

      await cache.put(key, response);
    } catch (error) {
      console.error('Failed to cache admin data:', error);
    }
  }

  async getCachedAdminData(key: string): Promise<any | null> {
    try {
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const response = await cache.match(key);
        
        if (response) {
          const cachedAt = response.headers.get('X-Cached-At');
          const maxAge = this.getCacheMaxAge(cacheName);
          
          if (cachedAt && maxAge) {
            const age = Date.now() - new Date(cachedAt).getTime();
            if (age > maxAge) {
              // Cache expired, remove it
              await cache.delete(key);
              continue;
            }
          }
          
          return await response.json();
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cached admin data:', error);
      return null;
    }
  }

  private getCacheMaxAge(cacheName: string): number | null {
    for (const config of Object.values(this.cacheConfigs)) {
      if (cacheName.includes(config.name)) {
        return config.maxAge;
      }
    }
    return null;
  }

  // Offline functionality
  async enableOfflineMode(): Promise<void> {
    if (!this.registration) return;

    // Cache critical admin resources
    const criticalResources = [
      '/admin',
      '/admin/moderation',
      '/admin/analytics',
      '/api/admin/stats',
      '/api/admin/notifications'
    ];

    try {
      const cache = await caches.open(this.cacheConfigs.static.name);
      await cache.addAll(criticalResources);
      console.log('Offline mode enabled for admin');
    } catch (error) {
      console.error('Failed to enable offline mode:', error);
    }
  }

  private handleOfflineFallback(data: any): void {
    // Handle offline fallback scenarios
    console.log('Offline fallback triggered:', data);
    
    // Show offline notification
    window.dispatchEvent(new CustomEvent('offlineFallback', {
      detail: data
    }));
  }

  // Background sync
  private async syncPendingData(): Promise<void> {
    if (!this.registration || !this.isOnline) return;

    try {
      // Get pending data from IndexedDB or localStorage
      const pendingActions = this.getPendingActions();
      
      for (const action of pendingActions) {
        await this.syncAction(action);
      }
      
      // Clear pending actions after successful sync
      this.clearPendingActions();
    } catch (error) {
      console.error('Failed to sync pending data:', error);
    }
  }

  private getPendingActions(): any[] {
    try {
      const pending = localStorage.getItem('admin-pending-actions');
      return pending ? JSON.parse(pending) : [];
    } catch {
      return [];
    }
  }

  private async syncAction(action: any): Promise<void> {
    // Implement action syncing logic
    console.log('Syncing action:', action);
  }

  private clearPendingActions(): void {
    localStorage.removeItem('admin-pending-actions');
  }

  private handleBackgroundSync(data: any): void {
    console.log('Background sync triggered:', data);
  }

  // Performance monitoring
  measurePerformance(name: string, fn: () => Promise<any>): Promise<any> {
    const startTime = performance.now();
    
    return fn().finally(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
      
      // Send performance data to analytics
      this.trackPerformance(name, duration);
    });
  }

  private trackPerformance(name: string, duration: number): void {
    // Track performance metrics
    if ('sendBeacon' in navigator) {
      const data = JSON.stringify({
        metric: name,
        duration,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
      
      navigator.sendBeacon('/api/admin/performance', data);
    }
  }

  // Memory management
  async cleanupCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        const config = this.getCacheConfigByName(cacheName);
        if (config) {
          await this.cleanupCache(cacheName, config);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup caches:', error);
    }
  }

  private getCacheConfigByName(cacheName: string): CacheConfig | null {
    for (const config of Object.values(this.cacheConfigs)) {
      if (cacheName.includes(config.name)) {
        return config;
      }
    }
    return null;
  }

  private async cleanupCache(cacheName: string, config: CacheConfig): Promise<void> {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    // Remove expired entries
    const now = Date.now();
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const cachedAt = response.headers.get('X-Cached-At');
        if (cachedAt) {
          const age = now - new Date(cachedAt).getTime();
          if (age > config.maxAge) {
            await cache.delete(request);
          }
        }
      }
    }
    
    // Limit cache size
    const remainingRequests = await cache.keys();
    if (remainingRequests.length > config.maxEntries) {
      const excess = remainingRequests.slice(config.maxEntries);
      for (const request of excess) {
        await cache.delete(request);
      }
    }
  }

  // Network status
  getNetworkStatus(): { isOnline: boolean; effectiveType?: string; downlink?: number } {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      isOnline: this.isOnline,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink
    };
  }

  // Preload critical resources
  async preloadCriticalResources(): Promise<void> {
    const criticalUrls = [
      '/api/admin/stats',
      '/api/admin/notifications/count',
      '/admin/moderation/queue'
    ];

    try {
      const cache = await caches.open(this.cacheConfigs.api.name);
      
      for (const url of criticalUrls) {
        // Only preload if not already cached
        const cached = await cache.match(url);
        if (!cached) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response.clone());
            }
          } catch (error) {
            console.warn(`Failed to preload ${url}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to preload critical resources:', error);
    }
  }
}

export const mobileServiceWorkerManager = new MobileServiceWorkerManager();
export type { CacheConfig, CacheStrategy };
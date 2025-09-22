/**
 * Service Worker Cache Service
 * Enhanced service worker integration for offline functionality
 */

interface ServiceWorkerCacheConfig {
  cacheName: string;
  version: string;
  maxAge: number;
  maxEntries: number;
  networkTimeoutMs: number;
  strategies: {
    [key: string]: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate' | 'networkOnly' | 'cacheOnly';
  };
}

interface CacheEntry {
  url: string;
  response: Response;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface OfflineAction {
  id: string;
  type: 'post' | 'reaction' | 'comment' | 'vote';
  data: any;
  timestamp: number;
  retryCount: number;
}

/**
 * Service Worker Cache Manager
 */
export class ServiceWorkerCacheService {
  private config: ServiceWorkerCacheConfig;
  private registration: ServiceWorkerRegistration | null = null;
  private offlineActions: OfflineAction[] = [];
  private syncInProgress = false;

  constructor(config: Partial<ServiceWorkerCacheConfig> = {}) {
    this.config = {
      cacheName: 'community-enhancements-v1',
      version: '1.0.0',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxEntries: 1000,
      networkTimeoutMs: 5000,
      strategies: {
        '/api/communities': 'staleWhileRevalidate',
        '/api/posts': 'networkFirst',
        '/api/users': 'staleWhileRevalidate',
        '/static': 'cacheFirst',
        '/images': 'cacheFirst',
        '/icons': 'cacheFirst',
        ...config.strategies
      },
      ...config
    };

    this.initializeServiceWorker();
  }

  /**
   * Initialize service worker
   */
  private async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

        // Handle service worker updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                this.notifyServiceWorkerUpdate();
              }
            });
          }
        });

        // Send configuration to service worker
        await this.sendToServiceWorker({
          type: 'configure',
          config: this.config
        });

        console.log('Service Worker registered successfully');
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'cache_updated':
        this.handleCacheUpdate(data);
        break;
      case 'offline_action_queued':
        this.handleOfflineActionQueued(data);
        break;
      case 'sync_required':
        this.handleSyncRequired();
        break;
      case 'cache_stats':
        this.handleCacheStats(data);
        break;
    }
  }

  /**
   * Send message to service worker
   */
  private async sendToServiceWorker(message: any): Promise<void> {
    if (this.registration?.active) {
      this.registration.active.postMessage(message);
    }
  }

  /**
   * Preload critical resources
   */
  async preloadCriticalResources(resources: string[]): Promise<void> {
    await this.sendToServiceWorker({
      type: 'preload_resources',
      resources,
      strategy: 'cacheFirst'
    });
  }

  /**
   * Cache community data with intelligent strategy
   */
  async cacheCommunityData(communityId: string, data: any): Promise<void> {
    const resources = [
      `/api/communities/${communityId}`,
      `/api/communities/${communityId}/posts`,
      `/api/communities/${communityId}/icon`,
      `/api/communities/${communityId}/members`
    ];

    await this.sendToServiceWorker({
      type: 'cache_community_data',
      communityId,
      resources,
      data
    });
  }

  /**
   * Preload user profile data
   */
  async preloadUserProfile(userId: string): Promise<void> {
    const resources = [
      `/api/users/${userId}/profile`,
      `/api/users/${userId}/posts`,
      `/api/users/${userId}/avatar`
    ];

    await this.sendToServiceWorker({
      type: 'preload_user_data',
      userId,
      resources
    });
  }

  /**
   * Cache preview content
   */
  async cachePreviewContent(url: string, type: string, data: any): Promise<void> {
    await this.sendToServiceWorker({
      type: 'cache_preview',
      url,
      previewType: type,
      data
    });
  }

  /**
   * Queue offline action
   */
  async queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const offlineAction: OfflineAction = {
      ...action,
      id: this.generateActionId(),
      timestamp: Date.now(),
      retryCount: 0
    };

    this.offlineActions.push(offlineAction);

    // Store in IndexedDB for persistence
    await this.storeOfflineAction(offlineAction);

    // Notify service worker
    await this.sendToServiceWorker({
      type: 'queue_offline_action',
      action: offlineAction
    });
  }

  /**
   * Sync offline actions when back online
   */
  async syncOfflineActions(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;

    try {
      const actions = await this.getStoredOfflineActions();
      
      for (const action of actions) {
        try {
          await this.executeOfflineAction(action);
          await this.removeStoredOfflineAction(action.id);
          
          // Remove from memory
          const index = this.offlineActions.findIndex(a => a.id === action.id);
          if (index > -1) {
            this.offlineActions.splice(index, 1);
          }
        } catch (error) {
          console.warn('Failed to sync offline action:', error);
          
          // Increment retry count
          action.retryCount++;
          
          // Remove if too many retries
          if (action.retryCount >= 3) {
            await this.removeStoredOfflineAction(action.id);
          } else {
            await this.storeOfflineAction(action);
          }
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Execute offline action
   */
  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    const { type, data } = action;

    switch (type) {
      case 'post':
        await this.syncOfflinePost(data);
        break;
      case 'reaction':
        await this.syncOfflineReaction(data);
        break;
      case 'comment':
        await this.syncOfflineComment(data);
        break;
      case 'vote':
        await this.syncOfflineVote(data);
        break;
      default:
        throw new Error(`Unknown offline action type: ${type}`);
    }
  }

  /**
   * Sync offline post
   */
  private async syncOfflinePost(data: any): Promise<void> {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync post: ${response.statusText}`);
    }
  }

  /**
   * Sync offline reaction
   */
  private async syncOfflineReaction(data: any): Promise<void> {
    const response = await fetch(`/api/posts/${data.postId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync reaction: ${response.statusText}`);
    }
  }

  /**
   * Sync offline comment
   */
  private async syncOfflineComment(data: any): Promise<void> {
    const response = await fetch(`/api/posts/${data.postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync comment: ${response.statusText}`);
    }
  }

  /**
   * Sync offline vote
   */
  private async syncOfflineVote(data: any): Promise<void> {
    const response = await fetch(`/api/governance/${data.proposalId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync vote: ${response.statusText}`);
    }
  }

  /**
   * Store offline action in IndexedDB
   */
  private async storeOfflineAction(action: OfflineAction): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CommunityEnhancementsDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineActions'], 'readwrite');
        const store = transaction.objectStore('offlineActions');
        
        const putRequest = store.put(action);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('offlineActions')) {
          const store = db.createObjectStore('offlineActions', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('type', 'type');
        }
      };
    });
  }

  /**
   * Get stored offline actions
   */
  private async getStoredOfflineActions(): Promise<OfflineAction[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CommunityEnhancementsDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineActions'], 'readonly');
        const store = transaction.objectStore('offlineActions');
        
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
    });
  }

  /**
   * Remove stored offline action
   */
  private async removeStoredOfflineAction(actionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CommunityEnhancementsDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineActions'], 'readwrite');
        const store = transaction.objectStore('offlineActions');
        
        const deleteRequest = store.delete(actionId);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
    });
  }

  /**
   * Handle cache update from service worker
   */
  private handleCacheUpdate(data: any): void {
    // Notify components about cache updates
    window.dispatchEvent(new CustomEvent('cache-updated', { detail: data }));
  }

  /**
   * Handle offline action queued
   */
  private handleOfflineActionQueued(data: any): void {
    // Notify UI about queued action
    window.dispatchEvent(new CustomEvent('offline-action-queued', { detail: data }));
  }

  /**
   * Handle sync required
   */
  private handleSyncRequired(): void {
    // Trigger sync when back online
    if (navigator.onLine) {
      this.syncOfflineActions();
    }
  }

  /**
   * Handle cache statistics
   */
  private handleCacheStats(data: any): void {
    // Update cache statistics
    window.dispatchEvent(new CustomEvent('cache-stats-updated', { detail: data }));
  }

  /**
   * Notify about service worker update
   */
  private notifyServiceWorkerUpdate(): void {
    window.dispatchEvent(new CustomEvent('service-worker-updated'));
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    await this.sendToServiceWorker({
      type: 'clear_all_caches'
    });
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    return new Promise((resolve) => {
      const handleStats = (event: Event) => {
        const customEvent = event as CustomEvent;
        window.removeEventListener('cache-stats-updated', handleStats);
        resolve(customEvent.detail);
      };

      window.addEventListener('cache-stats-updated', handleStats);
      
      this.sendToServiceWorker({
        type: 'get_cache_stats'
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        window.removeEventListener('cache-stats-updated', handleStats);
        resolve(null);
      }, 5000);
    });
  }

  /**
   * Update cache strategy for specific patterns
   */
  async updateCacheStrategy(pattern: string, strategy: string): Promise<void> {
    this.config.strategies[pattern] = strategy as any;
    
    await this.sendToServiceWorker({
      type: 'update_cache_strategy',
      pattern,
      strategy
    });
  }

  /**
   * Prefetch resources based on user behavior
   */
  async prefetchResources(resources: Array<{ url: string; priority: 'high' | 'medium' | 'low' }>): Promise<void> {
    await this.sendToServiceWorker({
      type: 'prefetch_resources',
      resources
    });
  }

  /**
   * Check if resource is cached
   */
  async isResourceCached(url: string): Promise<boolean> {
    if ('caches' in window) {
      const cache = await caches.open(this.config.cacheName);
      const response = await cache.match(url);
      return !!response;
    }
    return false;
  }

  /**
   * Get offline actions count
   */
  getOfflineActionsCount(): number {
    return this.offlineActions.length;
  }

  /**
   * Check if currently syncing
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }

  /**
   * Force sync offline actions
   */
  async forceSyncOfflineActions(): Promise<void> {
    await this.syncOfflineActions();
  }

  /**
   * Listen for online/offline events
   */
  setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.syncOfflineActions();
      window.dispatchEvent(new CustomEvent('network-status-changed', { 
        detail: { online: true } 
      }));
    });

    window.addEventListener('offline', () => {
      window.dispatchEvent(new CustomEvent('network-status-changed', { 
        detail: { online: false } 
      }));
    });
  }

  /**
   * Destroy service and cleanup
   */
  destroy(): void {
    if (this.registration) {
      navigator.serviceWorker.removeEventListener('message', this.handleServiceWorkerMessage);
    }
  }
}

// Export singleton instance
export const serviceWorkerCacheService = new ServiceWorkerCacheService();
export default ServiceWorkerCacheService;
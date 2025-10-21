// Service Worker registration and management utilities

interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig;

  constructor(config: ServiceWorkerConfig = {}) {
    this.config = config;
  }

  // Register the service worker
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      this.registration = registration;

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content available
              this.config.onUpdate?.(registration);
            } else {
              // Content cached for first time
              this.config.onSuccess?.(registration);
            }
          }
        });
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      console.log('Service Worker registered successfully');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      // Type guard to ensure error is an Error instance
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.config.onError?.(errorObj);
      return null;
    }
  }

  // Unregister the service worker
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker unregistered');
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  // Update the service worker
  async update(): Promise<void> {
    if (!this.registration) {
      throw new Error('No service worker registered');
    }

    try {
      await this.registration.update();
      console.log('Service Worker update check completed');
    } catch (error) {
      console.error('Service Worker update failed:', error);
      throw error;
    }
  }

  // Skip waiting and activate new service worker
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      return;
    }

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // Check if service worker is supported
  static isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  // Get current registration
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }
}

// Offline storage manager
class OfflineStorageManager {
  private dbName = 'OfflineData';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (!('indexedDB' in window)) {
      throw new Error('IndexedDB not supported');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('posts')) {
          const postStore = db.createObjectStore('posts', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          postStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('reactions')) {
          const reactionStore = db.createObjectStore('reactions', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          reactionStore.createIndex('postId', 'postId');
        }

        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { 
            keyPath: 'key' 
          });
          cacheStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  // Store offline post
  async storeOfflinePost(postData: any): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['posts'], 'readwrite');
      const store = transaction.objectStore('posts');
      
      const request = store.add({
        data: postData,
        timestamp: Date.now(),
        synced: false
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as number);
    });
  }

  // Store offline reaction
  async storeOfflineReaction(postId: string, reactionData: any): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['reactions'], 'readwrite');
      const store = transaction.objectStore('reactions');
      
      const request = store.add({
        postId,
        data: reactionData,
        timestamp: Date.now(),
        synced: false
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as number);
    });
  }

  // Get offline posts
  async getOfflinePosts(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['posts'], 'readonly');
      const store = transaction.objectStore('posts');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Cache data
  async cacheData(key: string, data: any, ttl: number = 5 * 60 * 1000): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      const request = store.put({
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Get cached data
  async getCachedData(key: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        
        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        if (Date.now() > result.expiresAt) {
          // Delete expired data
          this.deleteCachedData(key);
          resolve(null);
          return;
        }

        resolve(result.data);
      };
    });
  }

  // Delete cached data
  async deleteCachedData(key: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Clean up expired cache entries
  async cleanupExpiredCache(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('timestamp');
      const request = index.openCursor();

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const record = cursor.value;
          
          if (Date.now() > record.expiresAt) {
            cursor.delete();
          }
          
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}

// Background sync manager
class BackgroundSyncManager {
  private registration: ServiceWorkerRegistration | null = null;

  constructor(registration: ServiceWorkerRegistration | null) {
    this.registration = registration;
  }

  // Register background sync
  async registerSync(tag: string): Promise<void> {
    if (!this.registration || !('serviceWorker' in navigator)) {
      console.log('Background Sync not supported');
      return;
    }

    try {
      // Check if sync is supported
      if ('sync' in this.registration) {
        await (this.registration as any).sync.register(tag);
        console.log(`Background sync registered: ${tag}`);
      } else {
        console.log('Background Sync not supported in this browser');
      }
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }

  // Register post sync
  async registerPostSync(): Promise<void> {
    await this.registerSync('post-sync');
  }

  // Register reaction sync
  async registerReactionSync(): Promise<void> {
    await this.registerSync('reaction-sync');
  }
}

// Network status manager
class NetworkStatusManager {
  private listeners: Array<(isOnline: boolean) => void> = [];
  private isOnline: boolean = navigator.onLine;

  constructor() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.notifyListeners(true);
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.notifyListeners(false);
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => listener(isOnline));
  }

  // Add network status listener
  addListener(listener: (isOnline: boolean) => void): void {
    this.listeners.push(listener);
  }

  // Remove network status listener
  removeListener(listener: (isOnline: boolean) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Get current network status
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  // Cleanup
  destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    this.listeners = [];
  }
}

// Main service worker utility
export class ServiceWorkerUtil {
  private swManager: ServiceWorkerManager;
  private offlineStorage: OfflineStorageManager;
  private backgroundSync: BackgroundSyncManager | null = null;
  private networkStatus: NetworkStatusManager;

  constructor(config: ServiceWorkerConfig = {}) {
    this.swManager = new ServiceWorkerManager(config);
    this.offlineStorage = new OfflineStorageManager();
    this.networkStatus = new NetworkStatusManager();
  }

  // Initialize all services
  async init(): Promise<void> {
    try {
      // Initialize offline storage
      await this.offlineStorage.init();

      // Register service worker
      const registration = await this.swManager.register();
      
      if (registration) {
        this.backgroundSync = new BackgroundSyncManager(registration);
      }

      // Setup network status monitoring
      this.networkStatus.addListener((isOnline) => {
        if (isOnline && this.backgroundSync) {
          // Trigger sync when back online
          this.backgroundSync.registerPostSync();
          this.backgroundSync.registerReactionSync();
        }
      });

      console.log('Service Worker utilities initialized');
    } catch (error) {
      console.error('Service Worker initialization failed:', error);
      throw error;
    }
  }

  // Get managers
  getServiceWorkerManager(): ServiceWorkerManager {
    return this.swManager;
  }

  getOfflineStorage(): OfflineStorageManager {
    return this.offlineStorage;
  }

  getBackgroundSync(): BackgroundSyncManager | null {
    return this.backgroundSync;
  }

  getNetworkStatus(): NetworkStatusManager {
    return this.networkStatus;
  }

  // Cleanup
  destroy(): void {
    this.networkStatus.destroy();
  }
}

export {
  ServiceWorkerManager,
  OfflineStorageManager,
  BackgroundSyncManager,
  NetworkStatusManager
};

export default ServiceWorkerUtil;
/**
 * Offline Support Service
 * Manages offline functionality and document synchronization
 */

export interface OfflineDocument {
  id: string;
  title: string;
  content: string;
  language: string;
  lastModified: string;
  cachedAt: string;
  size: number;
  critical: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingSync: number;
  syncInProgress: boolean;
  documentsAvailable: number;
  totalDocuments: number;
}

export interface OfflineCapabilities {
  serviceWorkerSupported: boolean;
  cacheAPISupported: boolean;
  backgroundSyncSupported: boolean;
  pushNotificationsSupported: boolean;
  estimatedStorage: number;
  usedStorage: number;
}

class OfflineSupportService {
  private serviceWorker: ServiceWorkerRegistration | null = null;
  private syncQueue: string[] = [];
  private isInitialized = false;
  private onlineStatusListeners: ((isOnline: boolean) => void)[] = [];
  private syncStatusListeners: ((status: SyncStatus) => void)[] = [];

  /**
   * Initialize offline support
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Register service worker
      if ('serviceWorker' in navigator) {
        this.serviceWorker = await navigator.serviceWorker.register('/sw-support-docs.js', {
          scope: '/support'
        });

        console.log('Offline Support: Service Worker registered');

        // Listen for service worker updates
        this.serviceWorker.addEventListener('updatefound', () => {
          console.log('Offline Support: Service Worker update found');
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);
      }

      // Set up online/offline listeners
      window.addEventListener('online', this.handleOnlineStatusChange);
      window.addEventListener('offline', this.handleOnlineStatusChange);

      // Set up background sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        this.setupBackgroundSync();
      }

      // Set up push notifications
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        this.setupPushNotifications();
      }

      this.isInitialized = true;
      console.log('Offline Support: Initialization complete');
    } catch (error) {
      console.error('Offline Support: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check offline capabilities
   */
  async getCapabilities(): Promise<OfflineCapabilities> {
    const capabilities: OfflineCapabilities = {
      serviceWorkerSupported: 'serviceWorker' in navigator,
      cacheAPISupported: 'caches' in window,
      backgroundSyncSupported: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      pushNotificationsSupported: 'serviceWorker' in navigator && 'PushManager' in window,
      estimatedStorage: 0,
      usedStorage: 0
    };

    // Get storage estimates
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        capabilities.estimatedStorage = estimate.quota || 0;
        capabilities.usedStorage = estimate.usage || 0;
      } catch (error) {
        console.warn('Failed to get storage estimate:', error);
      }
    }

    return capabilities;
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const isOnline = navigator.onLine;
    const lastSync = localStorage.getItem('offline-support-last-sync');
    const pendingSync = this.syncQueue.length;

    // Get document counts from service worker
    let documentsAvailable = 0;
    let totalDocuments = 0;

    if (this.serviceWorker) {
      try {
        const cacheStatus = await this.sendMessageToServiceWorker({
          type: 'GET_CACHE_STATUS'
        });
        
        documentsAvailable = Object.values(cacheStatus).reduce((sum: number, count: any) => sum + count, 0);
        totalDocuments = documentsAvailable; // In a real app, this would be fetched from API
      } catch (error) {
        console.warn('Failed to get cache status:', error);
      }
    }

    return {
      isOnline,
      lastSync,
      pendingSync,
      syncInProgress: false,
      documentsAvailable,
      totalDocuments
    };
  }

  /**
   * Cache a document for offline access
   */
  async cacheDocument(documentUrl: string): Promise<void> {
    if (!this.serviceWorker) {
      throw new Error('Service Worker not available');
    }

    try {
      await this.sendMessageToServiceWorker({
        type: 'CACHE_DOCUMENT',
        payload: { url: documentUrl }
      });

      console.log('Document cached for offline access:', documentUrl);
    } catch (error) {
      console.error('Failed to cache document:', error);
      throw error;
    }
  }

  /**
   * Get offline documents
   */
  async getOfflineDocuments(): Promise<OfflineDocument[]> {
    if (!('caches' in window)) {
      return [];
    }

    try {
      const cacheNames = await caches.keys();
      const documents: OfflineDocument[] = [];

      for (const cacheName of cacheNames) {
        if (cacheName.includes('support-docs')) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();

          for (const request of requests) {
            if (request.url.includes('.md') || request.url.includes('/docs/support/')) {
              const response = await cache.match(request);
              if (response) {
                const content = await response.text();
                const lastModified = response.headers.get('last-modified') || new Date().toISOString();
                
                documents.push({
                  id: this.getDocumentIdFromUrl(request.url),
                  title: this.getTitleFromUrl(request.url),
                  content,
                  language: 'en', // Default language
                  lastModified,
                  cachedAt: new Date().toISOString(),
                  size: content.length,
                  critical: this.isCriticalDocument(request.url)
                });
              }
            }
          }
        }
      }

      return documents;
    } catch (error) {
      console.error('Failed to get offline documents:', error);
      return [];
    }
  }

  /**
   * Sync documents when online
   */
  async syncDocuments(): Promise<void> {
    if (!navigator.onLine) {
      console.log('Cannot sync: offline');
      return;
    }

    if (!this.serviceWorker) {
      console.log('Cannot sync: Service Worker not available');
      return;
    }

    try {
      // Trigger background sync
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as any).sync.register('document-sync');
        console.log('Background sync registered');
      }

      // Update last sync time
      localStorage.setItem('offline-support-last-sync', new Date().toISOString());

      // Notify listeners
      this.notifySyncStatusListeners();
    } catch (error) {
      console.error('Failed to sync documents:', error);
      throw error;
    }
  }

  /**
   * Clear offline cache
   */
  async clearOfflineCache(): Promise<void> {
    if (!this.serviceWorker) {
      throw new Error('Service Worker not available');
    }

    try {
      await this.sendMessageToServiceWorker({
        type: 'CLEAR_CACHE'
      });

      console.log('Offline cache cleared');
    } catch (error) {
      console.error('Failed to clear offline cache:', error);
      throw error;
    }
  }

  /**
   * Check if document is available offline
   */
  async isDocumentAvailableOffline(documentUrl: string): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const response = await caches.match(documentUrl);
      return !!response;
    } catch (error) {
      console.error('Failed to check document availability:', error);
      return false;
    }
  }

  /**
   * Add online status listener
   */
  addOnlineStatusListener(listener: (isOnline: boolean) => void): void {
    this.onlineStatusListeners.push(listener);
  }

  /**
   * Remove online status listener
   */
  removeOnlineStatusListener(listener: (isOnline: boolean) => void): void {
    const index = this.onlineStatusListeners.indexOf(listener);
    if (index > -1) {
      this.onlineStatusListeners.splice(index, 1);
    }
  }

  /**
   * Add sync status listener
   */
  addSyncStatusListener(listener: (status: SyncStatus) => void): void {
    this.syncStatusListeners.push(listener);
  }

  /**
   * Remove sync status listener
   */
  removeSyncStatusListener(listener: (status: SyncStatus) => void): void {
    const index = this.syncStatusListeners.indexOf(listener);
    if (index > -1) {
      this.syncStatusListeners.splice(index, 1);
    }
  }

  /**
   * Handle online/offline status changes
   */
  private handleOnlineStatusChange = (): void => {
    const isOnline = navigator.onLine;
    console.log('Online status changed:', isOnline);

    // Notify listeners
    this.onlineStatusListeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error('Error in online status listener:', error);
      }
    });

    // Auto-sync when coming online
    if (isOnline && this.syncQueue.length > 0) {
      this.syncDocuments().catch(error => {
        console.error('Auto-sync failed:', error);
      });
    }

    this.notifySyncStatusListeners();
  };

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage = (event: MessageEvent): void => {
    const { type, payload } = event.data;

    switch (type) {
      case 'DOCUMENT_CACHED':
        console.log('Document cached:', payload.url);
        this.notifySyncStatusListeners();
        break;

      case 'SYNC_COMPLETE':
        console.log('Sync complete');
        this.syncQueue = [];
        this.notifySyncStatusListeners();
        break;

      case 'CACHE_ERROR':
        console.error('Cache error:', payload.error);
        break;

      default:
        console.log('Unknown service worker message:', type);
    }
  };

  /**
   * Set up background sync
   */
  private async setupBackgroundSync(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in registration) {
        console.log('Background sync supported');

        // Register for document sync
        await (registration as any).sync.register('document-sync');
      }
    } catch (error) {
      console.error('Failed to setup background sync:', error);
    }
  }

  /**
   * Set up push notifications
   */
  private async setupPushNotifications(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('pushManager' in registration) {
        console.log('Push notifications supported');
        
        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();
        
        if (!existingSubscription) {
          // Request permission for notifications
          const permission = await Notification.requestPermission();
          
          if (permission === 'granted') {
            console.log('Push notification permission granted');
          }
        }
      }
    } catch (error) {
      console.error('Failed to setup push notifications:', error);
    }
  }

  /**
   * Send message to service worker
   */
  private async sendMessageToServiceWorker(message: any): Promise<any> {
    if (!this.serviceWorker) {
      throw new Error('Service Worker not available');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      if (this.serviceWorker.active) {
        this.serviceWorker.active.postMessage(message, [messageChannel.port2]);
      } else {
        reject(new Error('Service Worker not active'));
      }
    });
  }

  /**
   * Notify sync status listeners
   */
  private async notifySyncStatusListeners(): Promise<void> {
    try {
      const status = await this.getSyncStatus();
      this.syncStatusListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          console.error('Error in sync status listener:', error);
        }
      });
    } catch (error) {
      console.error('Failed to notify sync status listeners:', error);
    }
  }

  /**
   * Helper methods
   */
  private getDocumentIdFromUrl(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace('.md', '');
  }

  private getTitleFromUrl(url: string): string {
    const id = this.getDocumentIdFromUrl(url);
    return id.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private isCriticalDocument(url: string): boolean {
    const criticalDocs = [
      'beginners-guide',
      'troubleshooting-guide',
      'security-guide',
      'quick-faq'
    ];
    
    return criticalDocs.some(doc => url.includes(doc));
  }
}

export const offlineSupportService = new OfflineSupportService();
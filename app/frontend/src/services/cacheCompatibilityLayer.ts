/**
 * Cache Backward Compatibility Layer
 * Maintains compatibility with existing cache service API calls
 * Implements graceful degradation when Workbox features are unavailable
 * Requirements: 10.5
 */

import { serviceWorkerCacheService } from './serviceWorkerCacheService';

interface LegacyCacheOptions {
  maxAge?: number;
  maxEntries?: number;
  strategy?: string;
  tags?: string[];
  userScope?: string;
}

interface FeatureDetection {
  serviceWorker: boolean;
  workbox: boolean;
  backgroundSync: boolean;
  navigationPreload: boolean;
  indexedDB: boolean;
  broadcastChannel: boolean;
  cacheAPI: boolean;
  webCrypto: boolean;
  networkInformation: boolean;
}

interface FallbackConfig {
  useMemoryCache: boolean;
  useLocalStorage: boolean;
  useSessionStorage: boolean;
  enableOfflineQueue: boolean;
  maxMemoryCacheSize: number;
  maxLocalStorageSize: number;
  enableProgressiveEnhancement: boolean;
  fallbackTimeout: number;
}

interface BrowserCapabilities {
  hasServiceWorker: boolean;
  hasWorkbox: boolean;
  hasIndexedDB: boolean;
  hasCacheAPI: boolean;
  hasBackgroundSync: boolean;
  hasNavigationPreload: boolean;
  hasBroadcastChannel: boolean;
  hasWebCrypto: boolean;
  hasNetworkInformation: boolean;
  supportLevel: 'full' | 'partial' | 'minimal' | 'none';
}

export class CacheCompatibilityLayer {
  private featureSupport: FeatureDetection;
  private browserCapabilities: BrowserCapabilities;
  private fallbackConfig: FallbackConfig;
  private memoryCache: Map<string, any> = new Map();
  private sessionCache: Map<string, any> = new Map();
  private isEnhancedMode = false;
  private initializationAttempted = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.featureSupport = this.detectFeatures();
    this.browserCapabilities = this.assessBrowserCapabilities();
    this.fallbackConfig = this.createFallbackConfig();
  }

  /**
   * Create fallback configuration based on browser capabilities
   */
  private createFallbackConfig(): FallbackConfig {
    return {
      useMemoryCache: !this.featureSupport.serviceWorker || !this.featureSupport.cacheAPI,
      useLocalStorage: !this.featureSupport.indexedDB && this.isStorageAvailable('localStorage'),
      useSessionStorage: this.isStorageAvailable('sessionStorage'),
      enableOfflineQueue: this.featureSupport.serviceWorker && this.featureSupport.backgroundSync,
      maxMemoryCacheSize: this.getOptimalMemoryCacheSize(),
      maxLocalStorageSize: this.getOptimalLocalStorageSize(),
      enableProgressiveEnhancement: true,
      fallbackTimeout: 5000 // 5 seconds
    };
  }

  /**
   * Assess browser capabilities and determine support level
   */
  private assessBrowserCapabilities(): BrowserCapabilities {
    const capabilities: BrowserCapabilities = {
      hasServiceWorker: this.featureSupport.serviceWorker,
      hasWorkbox: this.featureSupport.workbox,
      hasIndexedDB: this.featureSupport.indexedDB,
      hasCacheAPI: this.featureSupport.cacheAPI,
      hasBackgroundSync: this.featureSupport.backgroundSync,
      hasNavigationPreload: this.featureSupport.navigationPreload,
      hasBroadcastChannel: this.featureSupport.broadcastChannel,
      hasWebCrypto: this.featureSupport.webCrypto,
      hasNetworkInformation: this.featureSupport.networkInformation,
      supportLevel: 'none'
    };

    // Determine support level
    if (capabilities.hasServiceWorker && capabilities.hasCacheAPI && capabilities.hasIndexedDB) {
      if (capabilities.hasWorkbox && capabilities.hasBackgroundSync) {
        capabilities.supportLevel = 'full';
      } else {
        capabilities.supportLevel = 'partial';
      }
    } else if (capabilities.hasServiceWorker || capabilities.hasCacheAPI) {
      capabilities.supportLevel = 'minimal';
    }

    return capabilities;
  }

  /**
   * Check if storage type is available
   */
  private isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get optimal memory cache size based on device capabilities
   */
  private getOptimalMemoryCacheSize(): number {
    // Estimate based on available memory if possible
    if ('memory' in performance && (performance as any).memory) {
      const memInfo = (performance as any).memory;
      const availableMemory = memInfo.jsHeapSizeLimit || 0;
      // Use up to 5% of available memory for cache
      return Math.min(availableMemory * 0.05, 100 * 1024 * 1024); // Max 100MB
    }
    
    // Fallback based on user agent detection
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? 25 * 1024 * 1024 : 50 * 1024 * 1024; // 25MB mobile, 50MB desktop
  }

  /**
   * Get optimal localStorage size limit
   */
  private getOptimalLocalStorageSize(): number {
    // Most browsers have 5-10MB localStorage limit
    return 4 * 1024 * 1024; // 4MB to be safe
  }

  /**
   * Initialize compatibility layer with progressive enhancement
   */
  async initialize(): Promise<void> {
    if (this.initializationAttempted) {
      return this.initializationPromise || Promise.resolve();
    }

    this.initializationAttempted = true;
    this.initializationPromise = this.performInitialization();
    
    return this.initializationPromise;
  }

  /**
   * Perform the actual initialization with timeout and fallback
   */
  private async performInitialization(): Promise<void> {
    const initTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Initialization timeout')), this.fallbackConfig.fallbackTimeout);
    });

    try {
      // Try enhanced initialization with timeout
      if (this.browserCapabilities.supportLevel === 'full' || this.browserCapabilities.supportLevel === 'partial') {
        await Promise.race([
          this.initializeEnhancedMode(),
          initTimeout
        ]);
        this.isEnhancedMode = true;
        console.log(`Enhanced cache mode enabled (${this.browserCapabilities.supportLevel} support)`);
      } else {
        await this.initializeFallbackMode();
        console.log(`Fallback cache mode enabled (${this.browserCapabilities.supportLevel} support)`);
      }
    } catch (error) {
      console.warn('Enhanced cache initialization failed, using fallback:', error);
      await this.initializeFallbackMode();
      this.isEnhancedMode = false;
    }
  }

  /**
   * Initialize enhanced mode with service worker
   */
  private async initializeEnhancedMode(): Promise<void> {
    if (this.featureSupport.serviceWorker) {
      await serviceWorkerCacheService.initialize();
      
      // Set up feature-specific enhancements
      if (this.featureSupport.broadcastChannel) {
        this.setupBroadcastChannelListeners();
      }
      
      if (this.featureSupport.navigationPreload) {
        await this.enableNavigationPreloadIfSupported();
      }
    } else {
      throw new Error('Service Worker not supported');
    }
  }

  /**
   * Initialize fallback mode without service worker
   */
  private async initializeFallbackMode(): Promise<void> {
    // Initialize memory cache
    this.memoryCache.clear();
    this.sessionCache.clear();
    
    // Set up storage event listeners for cross-tab synchronization
    if (this.fallbackConfig.useLocalStorage) {
      this.setupStorageEventListeners();
    }
    
    // Set up periodic cleanup
    this.setupPeriodicCleanup();
    
    console.log('Fallback cache initialized with:', {
      memoryCache: true,
      localStorage: this.fallbackConfig.useLocalStorage,
      sessionStorage: this.fallbackConfig.useSessionStorage
    });
  }

  /**
   * Set up broadcast channel listeners for cache updates
   */
  private setupBroadcastChannelListeners(): void {
    if (!this.featureSupport.broadcastChannel) return;

    try {
      const channel = new BroadcastChannel('cache-updates');
      channel.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'CACHE_INVALIDATED':
            this.handleCacheInvalidationMessage(data);
            break;
          case 'CACHE_UPDATED':
            this.handleCacheUpdateMessage(data);
            break;
        }
      });
    } catch (error) {
      console.warn('Failed to set up broadcast channel:', error);
    }
  }

  /**
   * Enable navigation preload if supported
   */
  private async enableNavigationPreloadIfSupported(): Promise<void> {
    if (!this.featureSupport.navigationPreload) return;

    try {
      await serviceWorkerCacheService.enableNavigationPreload();
    } catch (error) {
      console.warn('Failed to enable navigation preload:', error);
    }
  }

  /**
   * Set up storage event listeners for cross-tab cache synchronization
   */
  private setupStorageEventListeners(): void {
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('cache:')) {
        // Handle cache updates from other tabs
        const cacheKey = event.key.replace('cache:', '');
        
        if (event.newValue === null) {
          // Cache entry was removed
          this.memoryCache.delete(cacheKey);
        } else {
          try {
            // Cache entry was updated
            const cacheEntry = JSON.parse(event.newValue);
            this.memoryCache.set(cacheKey, cacheEntry);
          } catch (error) {
            console.warn('Failed to parse cache entry from storage event:', error);
          }
        }
      }
    });
  }

  /**
   * Set up periodic cleanup for memory and storage caches
   */
  private setupPeriodicCleanup(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Handle cache invalidation messages from broadcast channel
   */
  private handleCacheInvalidationMessage(data: any): void {
    const { tag, keys } = data;
    
    if (keys && Array.isArray(keys)) {
      keys.forEach(key => this.memoryCache.delete(key));
    } else if (tag) {
      // Remove entries matching tag pattern
      for (const [key] of this.memoryCache) {
        if (key.includes(tag)) {
          this.memoryCache.delete(key);
        }
      }
    }
  }

  /**
   * Handle cache update messages from broadcast channel
   */
  private handleCacheUpdateMessage(data: any): void {
    const { key, value } = data;
    if (key && value) {
      this.memoryCache.set(key, value);
    }
  }

  /**
   * Legacy cache method - maintained for backward compatibility
   */
  async cache(url: string, data: any, options: LegacyCacheOptions = {}): Promise<void> {
    if (this.isEnhancedMode) {
      // Use enhanced caching with strategy mapping
      const strategy = this.mapLegacyStrategy(options.strategy);
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      
      await serviceWorkerCacheService.putWithMetadata(url, response, {
        ttl: options.maxAge || 300000,
        tags: ['legacy-api']
      });
    } else {
      // Fallback to memory cache or localStorage
      await this.fallbackCache(url, data, options);
    }
  }

  /**
   * Legacy get method - maintained for backward compatibility
   */
  async get(url: string): Promise<any | null> {
    if (this.isEnhancedMode) {
      try {
        const response = await serviceWorkerCacheService.fetchWithStrategy(url, 'CacheFirst');
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn('Enhanced cache get failed, trying fallback:', error);
      }
    }
    
    // Fallback to memory cache or localStorage
    return await this.fallbackGet(url);
  }

  /**
   * Legacy clear method - maintained for backward compatibility
   */
  async clear(): Promise<void> {
    if (this.isEnhancedMode) {
      await serviceWorkerCacheService.clearAllCaches();
    } else {
      this.memoryCache.clear();
      if (this.fallbackConfig.useLocalStorage) {
        this.clearLocalStorageCache();
      }
    }
  }

  /**
   * Legacy invalidate method - maintained for backward compatibility
   */
  async invalidate(pattern: string): Promise<void> {
    if (this.isEnhancedMode) {
      // Use tag-based invalidation for enhanced mode
      await serviceWorkerCacheService.invalidateByTag('legacy-api');
    } else {
      // Fallback invalidation
      await this.fallbackInvalidate(pattern);
    }
  }

  /**
   * Legacy stats method - maintained for backward compatibility
   */
  async getStats(): Promise<any> {
    if (this.isEnhancedMode) {
      const enhancedStats = await serviceWorkerCacheService.getCacheStats();
      
      // Map enhanced stats to legacy format
      return {
        totalSize: enhancedStats.storage?.used || 0,
        entryCount: Object.values(enhancedStats.hitRates).reduce((sum, cache) => 
          sum + cache.hits + cache.misses, 0),
        hitRate: this.calculateOverallHitRate(enhancedStats.hitRates),
        cacheNames: Object.keys(enhancedStats.hitRates),
        lastCleanup: Date.now()
      };
    } else {
      return {
        totalSize: this.getMemoryCacheSize(),
        entryCount: this.memoryCache.size,
        hitRate: 0,
        cacheNames: ['memory-cache'],
        lastCleanup: Date.now()
      };
    }
  }

  /**
   * Comprehensive feature detection for progressive enhancement
   */
  private detectFeatures(): FeatureDetection {
    const features: FeatureDetection = {
      serviceWorker: false,
      workbox: false,
      backgroundSync: false,
      navigationPreload: false,
      indexedDB: false,
      broadcastChannel: false,
      cacheAPI: false,
      webCrypto: false,
      networkInformation: false
    };

    try {
      // Service Worker detection
      features.serviceWorker = 'serviceWorker' in navigator;
      
      // Cache API detection
      features.cacheAPI = 'caches' in window;
      
      // Workbox detection (check for global workbox object or CDN)
      features.workbox = typeof window !== 'undefined' && (
        'workbox' in window || 
        this.checkWorkboxCDNAvailability()
      );
      
      // Background Sync detection
      features.backgroundSync = features.serviceWorker && 
        typeof ServiceWorkerRegistration !== 'undefined' &&
        'sync' in ServiceWorkerRegistration.prototype;
      
      // Navigation Preload detection
      features.navigationPreload = features.serviceWorker && 
        typeof ServiceWorkerRegistration !== 'undefined' &&
        'navigationPreload' in ServiceWorkerRegistration.prototype;
      
      // IndexedDB detection with availability check
      features.indexedDB = 'indexedDB' in window && this.checkIndexedDBAvailability();
      
      // BroadcastChannel detection
      features.broadcastChannel = 'BroadcastChannel' in window;
      
      // Web Crypto API detection
      features.webCrypto = 'crypto' in window && 'subtle' in window.crypto;
      
      // Network Information API detection
      features.networkInformation = 'connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator;
      
    } catch (error) {
      console.warn('Feature detection failed:', error);
    }

    return features;
  }

  /**
   * Check if Workbox CDN is available
   */
  private checkWorkboxCDNAvailability(): boolean {
    try {
      // Check if workbox script is already loaded
      const scripts = document.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.includes('workbox')) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check IndexedDB availability (some browsers have it but it's disabled)
   */
  private checkIndexedDBAvailability(): boolean {
    try {
      if (!('indexedDB' in window)) return false;
      
      // Try to open a test database
      const testDB = indexedDB.open('__test__', 1);
      testDB.onerror = () => false;
      testDB.onsuccess = () => {
        testDB.result.close();
        indexedDB.deleteDatabase('__test__');
      };
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Map legacy cache strategies to enhanced strategies
   */
  private mapLegacyStrategy(legacyStrategy?: string): 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate' {
    switch (legacyStrategy) {
      case 'cache-first':
        return 'CacheFirst';
      case 'network-first':
        return 'NetworkFirst';
      case 'stale-while-revalidate':
        return 'StaleWhileRevalidate';
      default:
        return 'NetworkFirst';
    }
  }

  /**
   * Enhanced fallback caching with multiple storage layers
   */
  private async fallbackCache(url: string, data: any, options: LegacyCacheOptions): Promise<void> {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      maxAge: options.maxAge || 300000,
      tags: options.tags || [],
      userScope: options.userScope || '',
      accessCount: 0,
      lastAccessed: Date.now()
    };

    const cacheKey = this.generateFallbackCacheKey(url, options);
    
    // Try storage layers in order of preference
    const storageSuccess = await this.tryStorageLayers(cacheKey, cacheEntry);
    
    if (!storageSuccess) {
      console.warn('All storage methods failed for:', url);
    }
  }

  /**
   * Try different storage layers in order of preference
   */
  private async tryStorageLayers(cacheKey: string, cacheEntry: any): Promise<boolean> {
    // 1. Try localStorage first (persistent across sessions)
    if (this.fallbackConfig.useLocalStorage) {
      try {
        const serialized = JSON.stringify(cacheEntry);
        
        // Check if we have space
        if (this.getLocalStorageUsage() + serialized.length < this.fallbackConfig.maxLocalStorageSize) {
          localStorage.setItem(`cache:${cacheKey}`, serialized);
          this.memoryCache.set(cacheKey, cacheEntry); // Also keep in memory for speed
          return true;
        } else {
          // Try to make space by removing old entries
          await this.cleanupLocalStorage();
          localStorage.setItem(`cache:${cacheKey}`, serialized);
          this.memoryCache.set(cacheKey, cacheEntry);
          return true;
        }
      } catch (error) {
        console.warn('localStorage cache failed:', error);
      }
    }

    // 2. Try sessionStorage (session-only persistence)
    if (this.fallbackConfig.useSessionStorage) {
      try {
        sessionStorage.setItem(`cache:${cacheKey}`, JSON.stringify(cacheEntry));
        this.sessionCache.set(cacheKey, cacheEntry);
        return true;
      } catch (error) {
        console.warn('sessionStorage cache failed:', error);
      }
    }

    // 3. Fallback to memory cache
    if (this.getMemoryCacheSize() > this.fallbackConfig.maxMemoryCacheSize) {
      this.evictOldestMemoryCacheEntries();
    }
    this.memoryCache.set(cacheKey, cacheEntry);
    return true;
  }

  /**
   * Generate fallback cache key with user scope
   */
  private generateFallbackCacheKey(url: string, options: LegacyCacheOptions): string {
    const baseKey = url;
    const userScope = options.userScope || '';
    return userScope ? `${userScope}:${baseKey}` : baseKey;
  }

  /**
   * Get current localStorage usage in bytes
   */
  private getLocalStorageUsage(): number {
    let usage = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache:')) {
          const value = localStorage.getItem(key);
          if (value) {
            usage += key.length + value.length;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to calculate localStorage usage:', error);
    }
    return usage * 2; // Approximate UTF-16 encoding
  }

  /**
   * Clean up old localStorage entries to make space
   */
  private async cleanupLocalStorage(): Promise<void> {
    try {
      const entries: Array<{ key: string; timestamp: number; size: number }> = [];
      
      // Collect cache entries with metadata
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache:')) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              entries.push({
                key,
                timestamp: parsed.timestamp || 0,
                size: key.length + value.length
              });
            } catch {
              // Invalid entry, mark for removal
              entries.push({ key, timestamp: 0, size: 0 });
            }
          }
        }
      }
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest 25% of entries
      const toRemove = Math.ceil(entries.length * 0.25);
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        localStorage.removeItem(entries[i].key);
        const cacheKey = entries[i].key.replace('cache:', '');
        this.memoryCache.delete(cacheKey);
      }
      
      console.log(`Cleaned up ${toRemove} localStorage cache entries`);
    } catch (error) {
      console.error('localStorage cleanup failed:', error);
    }
  }

  /**
   * Clean up expired entries from all storage layers
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    
    // Clean memory cache
    for (const [key, entry] of this.memoryCache) {
      if (now - entry.timestamp > entry.maxAge) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clean session cache
    for (const [key, entry] of this.sessionCache) {
      if (now - entry.timestamp > entry.maxAge) {
        this.sessionCache.delete(key);
      }
    }
    
    // Clean localStorage
    if (this.fallbackConfig.useLocalStorage) {
      this.cleanupExpiredLocalStorage();
    }
    
    // Clean sessionStorage
    if (this.fallbackConfig.useSessionStorage) {
      this.cleanupExpiredSessionStorage();
    }
  }

  /**
   * Clean up expired localStorage entries
   */
  private cleanupExpiredLocalStorage(): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache:')) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const entry = JSON.parse(value);
              if (now - entry.timestamp > entry.maxAge) {
                keysToRemove.push(key);
              }
            } catch {
              // Invalid entry, remove it
              keysToRemove.push(key);
            }
          }
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        const cacheKey = key.replace('cache:', '');
        this.memoryCache.delete(cacheKey);
      });
      
      if (keysToRemove.length > 0) {
        console.log(`Cleaned up ${keysToRemove.length} expired localStorage entries`);
      }
    } catch (error) {
      console.warn('localStorage cleanup failed:', error);
    }
  }

  /**
   * Clean up expired sessionStorage entries
   */
  private cleanupExpiredSessionStorage(): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('cache:')) {
          const value = sessionStorage.getItem(key);
          if (value) {
            try {
              const entry = JSON.parse(value);
              if (now - entry.timestamp > entry.maxAge) {
                keysToRemove.push(key);
              }
            } catch {
              keysToRemove.push(key);
            }
          }
        }
      }
      
      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        const cacheKey = key.replace('cache:', '');
        this.sessionCache.delete(cacheKey);
      });
      
      if (keysToRemove.length > 0) {
        console.log(`Cleaned up ${keysToRemove.length} expired sessionStorage entries`);
      }
    } catch (error) {
      console.warn('sessionStorage cleanup failed:', error);
    }
  }

  /**
   * Enhanced fallback get with multiple storage layer support
   */
  private async fallbackGet(url: string, options: LegacyCacheOptions = {}): Promise<any | null> {
    const cacheKey = this.generateFallbackCacheKey(url, options);
    let cacheEntry: any = null;

    // Try storage layers in order of speed
    cacheEntry = await this.tryGetFromStorageLayers(cacheKey);

    if (cacheEntry) {
      // Check if entry is still valid
      const age = Date.now() - cacheEntry.timestamp;
      if (age <= cacheEntry.maxAge) {
        // Update access statistics
        cacheEntry.accessCount = (cacheEntry.accessCount || 0) + 1;
        cacheEntry.lastAccessed = Date.now();
        
        // Update the entry in storage with new access stats
        this.updateCacheEntryStats(cacheKey, cacheEntry);
        
        return cacheEntry.data;
      } else {
        // Remove expired entry from all storage layers
        await this.removeFromAllStorageLayers(cacheKey);
      }
    }

    return null;
  }

  /**
   * Try to get cache entry from storage layers in order of speed
   */
  private async tryGetFromStorageLayers(cacheKey: string): Promise<any | null> {
    // 1. Try memory cache first (fastest)
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey);
    }

    // 2. Try session cache
    if (this.sessionCache.has(cacheKey)) {
      const entry = this.sessionCache.get(cacheKey);
      // Also put in memory cache for next time
      this.memoryCache.set(cacheKey, entry);
      return entry;
    }

    // 3. Try sessionStorage
    if (this.fallbackConfig.useSessionStorage) {
      try {
        const stored = sessionStorage.getItem(`cache:${cacheKey}`);
        if (stored) {
          const entry = JSON.parse(stored);
          // Cache in memory and session cache for speed
          this.memoryCache.set(cacheKey, entry);
          this.sessionCache.set(cacheKey, entry);
          return entry;
        }
      } catch (error) {
        console.warn('sessionStorage get failed:', error);
      }
    }

    // 4. Try localStorage (slowest but most persistent)
    if (this.fallbackConfig.useLocalStorage) {
      try {
        const stored = localStorage.getItem(`cache:${cacheKey}`);
        if (stored) {
          const entry = JSON.parse(stored);
          // Cache in faster layers for next time
          this.memoryCache.set(cacheKey, entry);
          if (this.fallbackConfig.useSessionStorage) {
            this.sessionCache.set(cacheKey, entry);
          }
          return entry;
        }
      } catch (error) {
        console.warn('localStorage get failed:', error);
      }
    }

    return null;
  }

  /**
   * Update cache entry access statistics
   */
  private updateCacheEntryStats(cacheKey: string, entry: any): void {
    try {
      // Update in memory cache
      this.memoryCache.set(cacheKey, entry);
      
      // Update in session cache if available
      if (this.sessionCache.has(cacheKey)) {
        this.sessionCache.set(cacheKey, entry);
      }
      
      // Update in persistent storage (async to avoid blocking)
      setTimeout(() => {
        if (this.fallbackConfig.useLocalStorage) {
          try {
            localStorage.setItem(`cache:${cacheKey}`, JSON.stringify(entry));
          } catch (error) {
            console.warn('Failed to update localStorage stats:', error);
          }
        }
        
        if (this.fallbackConfig.useSessionStorage) {
          try {
            sessionStorage.setItem(`cache:${cacheKey}`, JSON.stringify(entry));
          } catch (error) {
            console.warn('Failed to update sessionStorage stats:', error);
          }
        }
      }, 0);
    } catch (error) {
      console.warn('Failed to update cache entry stats:', error);
    }
  }

  /**
   * Remove cache entry from all storage layers
   */
  private async removeFromAllStorageLayers(cacheKey: string): Promise<void> {
    // Remove from memory caches
    this.memoryCache.delete(cacheKey);
    this.sessionCache.delete(cacheKey);
    
    // Remove from persistent storage
    if (this.fallbackConfig.useLocalStorage) {
      try {
        localStorage.removeItem(`cache:${cacheKey}`);
      } catch (error) {
        console.warn('Failed to remove from localStorage:', error);
      }
    }
    
    if (this.fallbackConfig.useSessionStorage) {
      try {
        sessionStorage.removeItem(`cache:${cacheKey}`);
      } catch (error) {
        console.warn('Failed to remove from sessionStorage:', error);
      }
    }
  }

  /**
   * Fallback invalidation for browsers without service worker support
   */
  private async fallbackInvalidate(pattern: string): Promise<void> {
    // Memory cache invalidation
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // localStorage invalidation
    if (this.fallbackConfig.useLocalStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache:') && key.includes(pattern)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }

  /**
   * Clear localStorage cache entries
   */
  private clearLocalStorageCache(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Calculate overall hit rate from enhanced stats
   */
  private calculateOverallHitRate(hitRates: Record<string, { hits: number; misses: number; ratio: number }>): number {
    let totalHits = 0;
    let totalRequests = 0;

    for (const cache of Object.values(hitRates)) {
      totalHits += cache.hits;
      totalRequests += cache.hits + cache.misses;
    }

    return totalRequests > 0 ? totalHits / totalRequests : 0;
  }

  /**
   * Get memory cache size in bytes (estimated)
   */
  private getMemoryCacheSize(): number {
    let size = 0;
    for (const [key, value] of this.memoryCache) {
      size += key.length * 2; // Approximate string size
      size += JSON.stringify(value).length * 2;
    }
    return size;
  }

  /**
   * Evict oldest entries from memory cache when size limit is reached
   */
  private evictOldestMemoryCacheEntries(): void {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  /**
   * Get comprehensive feature support information
   */
  getFeatureSupport(): FeatureDetection {
    return { ...this.featureSupport };
  }

  /**
   * Get browser capabilities assessment
   */
  getBrowserCapabilities(): BrowserCapabilities {
    return { ...this.browserCapabilities };
  }

  /**
   * Check if enhanced mode is available and active
   */
  isEnhancedModeAvailable(): boolean {
    return this.isEnhancedMode;
  }

  /**
   * Get current support level
   */
  getSupportLevel(): 'full' | 'partial' | 'minimal' | 'none' {
    return this.browserCapabilities.supportLevel;
  }

  /**
   * Get fallback configuration
   */
  getFallbackConfig(): FallbackConfig {
    return { ...this.fallbackConfig };
  }

  /**
   * Update fallback configuration
   */
  updateFallbackConfig(config: Partial<FallbackConfig>): void {
    this.fallbackConfig = { ...this.fallbackConfig, ...config };
    
    // Reinitialize if necessary
    if (config.enableProgressiveEnhancement !== undefined) {
      this.reinitializeIfNeeded();
    }
  }

  /**
   * Reinitialize compatibility layer if configuration changed significantly
   */
  private async reinitializeIfNeeded(): Promise<void> {
    if (this.fallbackConfig.enableProgressiveEnhancement && !this.isEnhancedMode) {
      // Try to upgrade to enhanced mode
      try {
        await this.initializeEnhancedMode();
        this.isEnhancedMode = true;
        console.log('Upgraded to enhanced cache mode');
      } catch (error) {
        console.warn('Failed to upgrade to enhanced mode:', error);
      }
    }
  }

  /**
   * Test cache functionality and return diagnostic information
   */
  async runDiagnostics(): Promise<{
    featureSupport: FeatureDetection;
    browserCapabilities: BrowserCapabilities;
    storageAvailability: {
      memory: boolean;
      localStorage: boolean;
      sessionStorage: boolean;
      indexedDB: boolean;
      cacheAPI: boolean;
    };
    performanceMetrics: {
      memoryUsage: number;
      localStorageUsage: number;
      cacheHitRate: number;
    };
    recommendations: string[];
  }> {
    const diagnostics = {
      featureSupport: this.getFeatureSupport(),
      browserCapabilities: this.getBrowserCapabilities(),
      storageAvailability: {
        memory: true, // Always available
        localStorage: this.isStorageAvailable('localStorage'),
        sessionStorage: this.isStorageAvailable('sessionStorage'),
        indexedDB: this.featureSupport.indexedDB,
        cacheAPI: this.featureSupport.cacheAPI
      },
      performanceMetrics: {
        memoryUsage: this.getMemoryCacheSize(),
        localStorageUsage: this.getLocalStorageUsage(),
        cacheHitRate: await this.calculateCacheHitRate()
      },
      recommendations: this.generateRecommendations()
    };

    return diagnostics;
  }

  /**
   * Calculate cache hit rate from usage statistics
   */
  private async calculateCacheHitRate(): Promise<number> {
    try {
      if (this.isEnhancedMode) {
        const stats = await serviceWorkerCacheService.getCacheStats();
        const hitRates = Object.values(stats.hitRates || {});
        if (hitRates.length > 0) {
          return hitRates.reduce((sum, rate) => sum + rate.ratio, 0) / hitRates.length;
        }
      }
      
      // Fallback calculation from memory cache access counts
      let totalAccess = 0;
      let totalHits = 0;
      
      for (const entry of this.memoryCache.values()) {
        if (entry.accessCount) {
          totalAccess += entry.accessCount;
          totalHits += entry.accessCount; // All memory cache access are hits
        }
      }
      
      return totalAccess > 0 ? totalHits / totalAccess : 0;
    } catch (error) {
      console.warn('Failed to calculate cache hit rate:', error);
      return 0;
    }
  }

  /**
   * Generate recommendations based on current configuration and capabilities
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!this.featureSupport.serviceWorker) {
      recommendations.push('Consider using a modern browser with Service Worker support for better offline capabilities');
    }
    
    if (!this.featureSupport.indexedDB) {
      recommendations.push('IndexedDB is not available - using less efficient storage fallbacks');
    }
    
    if (this.browserCapabilities.supportLevel === 'minimal') {
      recommendations.push('Limited caching capabilities detected - consider browser upgrade for better performance');
    }
    
    if (this.getMemoryCacheSize() > this.fallbackConfig.maxMemoryCacheSize * 0.8) {
      recommendations.push('Memory cache usage is high - consider clearing old entries or increasing limit');
    }
    
    if (!this.featureSupport.backgroundSync) {
      recommendations.push('Background sync not available - offline actions may not sync automatically');
    }
    
    if (!this.featureSupport.broadcastChannel) {
      recommendations.push('BroadcastChannel not available - cache updates may not sync across tabs');
    }
    
    return recommendations;
  }

  /**
   * Export cache data for debugging or migration
   */
  async exportCacheData(): Promise<{
    metadata: {
      timestamp: number;
      version: string;
      supportLevel: string;
      isEnhancedMode: boolean;
    };
    memoryCache: Array<{ key: string; data: any; metadata: any }>;
    storageStats: {
      memoryUsage: number;
      localStorageUsage: number;
      entryCount: number;
    };
  }> {
    const exportData = {
      metadata: {
        timestamp: Date.now(),
        version: '1.0.0',
        supportLevel: this.browserCapabilities.supportLevel,
        isEnhancedMode: this.isEnhancedMode
      },
      memoryCache: Array.from(this.memoryCache.entries()).map(([key, value]) => ({
        key,
        data: value.data,
        metadata: {
          timestamp: value.timestamp,
          maxAge: value.maxAge,
          accessCount: value.accessCount,
          lastAccessed: value.lastAccessed
        }
      })),
      storageStats: {
        memoryUsage: this.getMemoryCacheSize(),
        localStorageUsage: this.getLocalStorageUsage(),
        entryCount: this.memoryCache.size
      }
    };

    return exportData;
  }

  /**
   * Import cache data (for testing or migration)
   */
  async importCacheData(data: any): Promise<void> {
    try {
      if (data.memoryCache && Array.isArray(data.memoryCache)) {
        for (const entry of data.memoryCache) {
          const cacheEntry = {
            data: entry.data,
            timestamp: entry.metadata.timestamp,
            maxAge: entry.metadata.maxAge,
            accessCount: entry.metadata.accessCount || 0,
            lastAccessed: entry.metadata.lastAccessed || Date.now(),
            tags: [],
            userScope: ''
          };
          
          this.memoryCache.set(entry.key, cacheEntry);
        }
      }
      
      console.log(`Imported ${data.memoryCache?.length || 0} cache entries`);
    } catch (error) {
      console.error('Failed to import cache data:', error);
      throw error;
    }
  }
}

/**
 * Legacy API wrapper for backward compatibility
 * Maintains the same interface as the original cache service
 * Provides graceful degradation and progressive enhancement
 */
export class LegacyCacheService {
  private compatibilityLayer: CacheCompatibilityLayer;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.compatibilityLayer = new CacheCompatibilityLayer();
  }

  /**
   * Initialize with automatic retry and fallback
   */
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform initialization with retry logic
   */
  private async performInitialization(): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.compatibilityLayer.initialize();
        console.log(`Cache service initialized successfully (attempt ${attempt})`);
        return;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Cache initialization attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('Cache service initialization failed after all retries:', lastError);
    // Don't throw - allow service to work in degraded mode
  }

  // Enhanced legacy methods with error handling and fallbacks
  async cache(url: string, data: any, options?: LegacyCacheOptions): Promise<void> {
    try {
      await this.ensureInitialized();
      return await this.compatibilityLayer.cache(url, data, options);
    } catch (error) {
      console.warn('Cache operation failed:', error);
      // Graceful degradation - don't throw for cache failures
    }
  }

  async get(url: string, options?: LegacyCacheOptions): Promise<any | null> {
    try {
      await this.ensureInitialized();
      return await this.compatibilityLayer.get(url);
    } catch (error) {
      console.warn('Cache get operation failed:', error);
      return null; // Return null instead of throwing
    }
  }

  async clear(): Promise<void> {
    try {
      await this.ensureInitialized();
      return await this.compatibilityLayer.clear();
    } catch (error) {
      console.warn('Cache clear operation failed:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      await this.ensureInitialized();
      return await this.compatibilityLayer.invalidate(pattern);
    } catch (error) {
      console.warn('Cache invalidate operation failed:', error);
    }
  }

  async getStats(): Promise<any> {
    try {
      await this.ensureInitialized();
      return await this.compatibilityLayer.getStats();
    } catch (error) {
      console.warn('Cache stats operation failed:', error);
      return {
        totalSize: 0,
        entryCount: 0,
        hitRate: 0,
        cacheNames: [],
        lastCleanup: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Additional legacy methods with enhanced error handling
  async cacheWithTTL(url: string, data: any, ttl: number): Promise<void> {
    return this.cache(url, data, { maxAge: ttl });
  }

  async getCached(url: string): Promise<any | null> {
    return this.get(url);
  }

  async clearAll(): Promise<void> {
    return this.clear();
  }

  async invalidatePattern(pattern: string): Promise<void> {
    return this.invalidate(pattern);
  }

  async getCacheStats(): Promise<any> {
    return this.getStats();
  }

  // Enhanced feature detection methods
  isServiceWorkerSupported(): boolean {
    try {
      return this.compatibilityLayer.getFeatureSupport().serviceWorker;
    } catch {
      return false;
    }
  }

  isEnhancedCacheAvailable(): boolean {
    try {
      return this.compatibilityLayer.isEnhancedModeAvailable();
    } catch {
      return false;
    }
  }

  getFeatureSupport(): FeatureDetection {
    try {
      return this.compatibilityLayer.getFeatureSupport();
    } catch {
      return {
        serviceWorker: false,
        workbox: false,
        backgroundSync: false,
        navigationPreload: false,
        indexedDB: false,
        broadcastChannel: false,
        cacheAPI: false,
        webCrypto: false,
        networkInformation: false
      };
    }
  }

  getBrowserCapabilities(): BrowserCapabilities {
    try {
      return this.compatibilityLayer.getBrowserCapabilities();
    } catch {
      return {
        hasServiceWorker: false,
        hasWorkbox: false,
        hasIndexedDB: false,
        hasCacheAPI: false,
        hasBackgroundSync: false,
        hasNavigationPreload: false,
        hasBroadcastChannel: false,
        hasWebCrypto: false,
        hasNetworkInformation: false,
        supportLevel: 'none'
      };
    }
  }

  getSupportLevel(): 'full' | 'partial' | 'minimal' | 'none' {
    try {
      return this.compatibilityLayer.getSupportLevel();
    } catch {
      return 'none';
    }
  }

  // Diagnostic and maintenance methods
  async runDiagnostics(): Promise<any> {
    try {
      await this.ensureInitialized();
      return await this.compatibilityLayer.runDiagnostics();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        featureSupport: this.getFeatureSupport(),
        browserCapabilities: this.getBrowserCapabilities(),
        recommendations: ['Service initialization failed - check browser compatibility']
      };
    }
  }

  async exportCacheData(): Promise<any> {
    try {
      await this.ensureInitialized();
      return await this.compatibilityLayer.exportCacheData();
    } catch (error) {
      console.warn('Cache export failed:', error);
      return null;
    }
  }

  async importCacheData(data: any): Promise<void> {
    try {
      await this.ensureInitialized();
      return await this.compatibilityLayer.importCacheData(data);
    } catch (error) {
      console.warn('Cache import failed:', error);
    }
  }

  // Utility methods for backward compatibility
  async warmCache(urls: string[]): Promise<void> {
    for (const url of urls) {
      try {
        // Attempt to fetch and cache each URL
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          await this.cache(url, data);
        }
      } catch (error) {
        console.warn(`Failed to warm cache for ${url}:`, error);
      }
    }
  }

  async preloadCriticalResources(resources: Array<{ url: string; priority: 'high' | 'medium' | 'low' }>): Promise<void> {
    // Sort by priority
    const sortedResources = resources.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const resource of sortedResources) {
      try {
        const response = await fetch(resource.url);
        if (response.ok) {
          const data = await response.json();
          await this.cache(resource.url, data, { 
            maxAge: resource.priority === 'high' ? 600000 : 300000 // 10min for high, 5min for others
          });
        }
      } catch (error) {
        console.warn(`Failed to preload resource ${resource.url}:`, error);
      }
    }
  }

  // Private helper methods
  private async ensureInitialized(): Promise<void> {
    if (!this.initializationPromise) {
      await this.initialize();
    } else {
      await this.initializationPromise;
    }
  }

  // Legacy method aliases for maximum compatibility
  put = this.cache;
  retrieve = this.get;
  remove = this.invalidate;
  flush = this.clear;
  status = this.getStats;
}

// Export singleton instances for backward compatibility
export const cacheCompatibilityLayer = new CacheCompatibilityLayer();
export const legacyCacheService = new LegacyCacheService();

// Default export for existing imports
export default LegacyCacheService;
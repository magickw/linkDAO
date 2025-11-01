/**
 * Intelligent Preloading System
 * Implements scroll-based, hover-based predictive preloading with network awareness
 */

import { serviceWorkerCacheService } from './serviceWorkerCacheService';
import { storageQuotaManager } from './storageQuotaManager';

export interface NetworkCondition {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
  online: boolean;
}

export interface DeviceCapabilities {
  memory: number; // GB
  cores: number;
  isMobile: boolean;
  isLowEnd: boolean;
  supportsConcurrency: boolean;
}

export interface PreloadConfig {
  enabled: boolean;
  maxConcurrentRequests: number;
  batchSize: number;
  delayMs: number;
  respectSaveData: boolean;
  networkThresholds: {
    minEffectiveType: string;
    minDownlink: number; // Mbps
    maxRTT: number; // ms
  };
}

export interface UserBehaviorPattern {
  scrollSpeed: number; // pixels per second
  averageViewTime: number; // ms
  interactionFrequency: number; // interactions per minute
  preferredContentTypes: string[];
  timeOfDay: number; // 0-23
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export interface PreloadMetrics {
  totalPreloads: number;
  successfulPreloads: number;
  failedPreloads: number;
  bytesPreloaded: number;
  averagePreloadTime: number;
  cacheHitRate: number;
  bandwidthSaved: number;
}

export interface PreloadItem {
  url: string;
  priority: number;
  type: 'image' | 'data' | 'page' | 'media';
  estimatedSize: number;
  source: 'scroll' | 'hover' | 'behavior' | 'predictive';
  timestamp: number;
}

export class IntelligentPreloadingSystem {
  private readonly DEFAULT_CONFIG: PreloadConfig = {
    enabled: true,
    maxConcurrentRequests: 3,
    batchSize: 5,
    delayMs: 100,
    respectSaveData: true,
    networkThresholds: {
      minEffectiveType: '3g',
      minDownlink: 1.0,
      maxRTT: 1000
    }
  };

  private config: PreloadConfig;
  private metrics: PreloadMetrics;
  private userBehavior: Partial<UserBehaviorPattern>;
  private preloadQueue: PreloadItem[] = [];
  private activePreloads = new Set<string>();
  private preloadHistory = new Map<string, number>();
  
  private intersectionObserver: IntersectionObserver | null = null;
  private scrollObserver: (() => void) | null = null;
  private hoverObserver: ((event: Event) => void) | null = null;
  
  private networkCondition: NetworkCondition | null = null;
  private deviceCapabilities: DeviceCapabilities | null = null;
  
  private isInitialized = false;
  private behaviorAnalysisInterval: number | null = null;

  constructor(config: Partial<PreloadConfig> = {}) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.metrics = {
      totalPreloads: 0,
      successfulPreloads: 0,
      failedPreloads: 0,
      bytesPreloaded: 0,
      averagePreloadTime: 0,
      cacheHitRate: 0,
      bandwidthSaved: 0
    };
    this.userBehavior = {};
  }

  /**
   * Initialize the intelligent preloading system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Intelligent preloading system already initialized');
      return;
    }

    try {
      // Detect network conditions
      await this.detectNetworkConditions();
      
      // Detect device capabilities
      await this.detectDeviceCapabilities();
      
      // Initialize user behavior analysis
      this.initializeBehaviorAnalysis();
      
      // Set up preloading observers
      this.setupScrollBasedPreloading();
      this.setupHoverBasedPreloading();
      this.setupIntersectionObserver();
      
      // Start preload queue processing
      this.startPreloadQueueProcessing();
      
      this.isInitialized = true;
      console.log('Intelligent preloading system initialized', {
        config: this.config,
        networkCondition: this.networkCondition,
        deviceCapabilities: this.deviceCapabilities
      });
      
    } catch (error) {
      console.error('Failed to initialize intelligent preloading system:', error);
      throw error;
    }
  }

  /**
   * Shutdown the preloading system
   */
  shutdown(): void {
    if (!this.isInitialized) return;

    // Clean up observers
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    if (this.scrollObserver) {
      window.removeEventListener('scroll', this.scrollObserver);
      this.scrollObserver = null;
    }

    if (this.hoverObserver) {
      document.removeEventListener('mouseover', this.hoverObserver);
      this.hoverObserver = null;
    }

    if (this.behaviorAnalysisInterval) {
      clearInterval(this.behaviorAnalysisInterval);
      this.behaviorAnalysisInterval = null;
    }

    // Clear queues
    this.preloadQueue = [];
    this.activePreloads.clear();

    this.isInitialized = false;
    console.log('Intelligent preloading system shutdown');
  }

  /**
   * Add items to preload queue with intelligent prioritization
   */
  addToPreloadQueue(items: Omit<PreloadItem, 'timestamp'>[]): void {
    if (!this.isInitialized || !this.config.enabled) return;

    const networkSuitable = this.isNetworkSuitableForPreloading();
    if (!networkSuitable) {
      console.log('Network conditions not suitable for preloading');
      return;
    }

    const prioritizedItems = items
      .map(item => ({
        ...item,
        timestamp: Date.now(),
        priority: this.calculatePreloadPriority(item)
      }))
      .sort((a, b) => b.priority - a.priority);

    // Add to queue, respecting adaptive batch size
    const adaptiveBatchSize = this.getAdaptiveBatchSize();
    const availableSlots = adaptiveBatchSize - this.preloadQueue.length;
    const itemsToAdd = prioritizedItems.slice(0, Math.max(0, availableSlots));
    
    this.preloadQueue.push(...itemsToAdd);
    
    console.log(`Added ${itemsToAdd.length} items to preload queue (queue size: ${this.preloadQueue.length})`);
  }

  /**
   * Get current preloading metrics
   */
  getMetrics(): PreloadMetrics {
    return { ...this.metrics };
  }

  /**
   * Update preloading configuration
   */
  updateConfig(config: Partial<PreloadConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('Preloading configuration updated:', this.config);
  }

  /**
   * Get user behavior analysis
   */
  getUserBehaviorPattern(): UserBehaviorPattern | null {
    if (Object.keys(this.userBehavior).length === 0) return null;
    
    return {
      scrollSpeed: this.userBehavior.scrollSpeed || 0,
      averageViewTime: this.userBehavior.averageViewTime || 0,
      interactionFrequency: this.userBehavior.interactionFrequency || 0,
      preferredContentTypes: this.userBehavior.preferredContentTypes || [],
      timeOfDay: new Date().getHours(),
      deviceType: this.deviceCapabilities?.isMobile ? 'mobile' : 'desktop'
    };
  }

  // Private methods

  private async detectNetworkConditions(): Promise<void> {
    // Use Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      this.networkCondition = {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false,
        online: navigator.onLine
      };

      // Listen for network changes
      connection.addEventListener('change', () => {
        this.networkCondition = {
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false,
          online: navigator.onLine
        };
        console.log('Network conditions updated:', this.networkCondition);
      });
    } else {
      // Fallback network detection
      this.networkCondition = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: false,
        online: navigator.onLine
      };
    }

    // Listen for online/offline events
    window.addEventListener('online', () => {
      if (this.networkCondition) {
        this.networkCondition.online = true;
      }
    });

    window.addEventListener('offline', () => {
      if (this.networkCondition) {
        this.networkCondition.online = false;
      }
    });
  }

  private async detectDeviceCapabilities(): Promise<void> {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad|tablet/.test(userAgent);
    
    // Estimate device capabilities
    let memory = 4; // Default 4GB
    let cores = 4; // Default 4 cores

    // Use Device Memory API if available
    if ('deviceMemory' in navigator) {
      memory = (navigator as any).deviceMemory;
    }

    // Use Hardware Concurrency API if available
    if ('hardwareConcurrency' in navigator) {
      cores = navigator.hardwareConcurrency;
    }

    const isLowEnd = memory <= 2 || cores <= 2 || isMobile;

    this.deviceCapabilities = {
      memory,
      cores,
      isMobile,
      isLowEnd,
      supportsConcurrency: cores > 2
    };

    // Adjust config based on device capabilities
    if (isLowEnd) {
      this.config.maxConcurrentRequests = Math.min(this.config.maxConcurrentRequests, 2);
      this.config.batchSize = Math.min(this.config.batchSize, 3);
      this.config.delayMs = Math.max(this.config.delayMs, 200);
    }
  }

  private initializeBehaviorAnalysis(): void {
    let scrollStartTime = Date.now();
    let scrollDistance = 0;
    let lastScrollY = window.scrollY;
    let interactionCount = 0;
    let viewStartTime = Date.now();
    const contentTypeInteractions = new Map<string, number>();

    // Track scroll behavior
    const scrollHandler = () => {
      const currentScrollY = window.scrollY;
      const distance = Math.abs(currentScrollY - lastScrollY);
      scrollDistance += distance;
      lastScrollY = currentScrollY;
    };

    // Track interactions
    const interactionHandler = (event: Event) => {
      interactionCount++;
      
      // Track content type preferences
      const target = event.target as HTMLElement;
      const contentType = this.getContentTypeFromElement(target);
      if (contentType) {
        contentTypeInteractions.set(contentType, (contentTypeInteractions.get(contentType) || 0) + 1);
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
    document.addEventListener('click', interactionHandler);
    document.addEventListener('touchstart', interactionHandler);

    // Analyze behavior periodically
    this.behaviorAnalysisInterval = window.setInterval(() => {
      const now = Date.now();
      const timeElapsed = now - scrollStartTime;
      
      if (timeElapsed > 0) {
        this.userBehavior.scrollSpeed = (scrollDistance / timeElapsed) * 1000; // pixels per second
        this.userBehavior.interactionFrequency = (interactionCount / timeElapsed) * 60 * 1000; // per minute
        this.userBehavior.averageViewTime = now - viewStartTime;
        
        // Update preferred content types
        const sortedContentTypes = Array.from(contentTypeInteractions.entries())
          .sort(([,a], [,b]) => b - a)
          .map(([type]) => type);
        this.userBehavior.preferredContentTypes = sortedContentTypes.slice(0, 5);
      }

      // Reset counters
      scrollStartTime = now;
      scrollDistance = 0;
      interactionCount = 0;
      contentTypeInteractions.clear();
    }, 30000); // Analyze every 30 seconds
  }

  private setupScrollBasedPreloading(): void {
    let scrollTimeout: number | null = null;
    
    this.scrollObserver = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = window.setTimeout(() => {
        this.handleScrollBasedPreloading();
      }, this.config.delayMs);
    };

    window.addEventListener('scroll', this.scrollObserver, { passive: true });
  }

  private setupHoverBasedPreloading(): void {
    this.hoverObserver = (event: Event) => {
      const target = event.target as HTMLElement;
      this.handleHoverBasedPreloading(target);
    };

    document.addEventListener('mouseover', this.hoverObserver);
  }

  private setupIntersectionObserver(): void {
    if (!('IntersectionObserver' in window)) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.handleIntersectionBasedPreloading(entry.target as HTMLElement);
          }
        });
      },
      {
        rootMargin: '200px', // Start preloading 200px before element comes into view
        threshold: 0.1
      }
    );

    // Observe preloadable elements
    this.observePreloadableElements();
  }

  private observePreloadableElements(): void {
    if (!this.intersectionObserver) return;

    // Observe images, links, and other preloadable elements
    const preloadableSelectors = [
      'img[data-src]',
      'a[href]',
      '[data-preload]',
      '.product-card',
      '.post-card',
      '.community-card'
    ];

    preloadableSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        this.intersectionObserver!.observe(element);
      });
    });
  }

  private handleScrollBasedPreloading(): void {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Calculate scroll progress
    const scrollProgress = scrollY / (documentHeight - windowHeight);
    
    // Predict next content based on scroll behavior
    const preloadItems: Omit<PreloadItem, 'timestamp'>[] = [];
    
    // If user is scrolling down quickly, preload next page content
    if (this.userBehavior.scrollSpeed && this.userBehavior.scrollSpeed > 500) {
      const nextPageItems = this.predictNextPageContent();
      preloadItems.push(...nextPageItems);
    }
    
    // If near bottom, preload pagination
    if (scrollProgress > 0.8) {
      const paginationItems = this.predictPaginationContent();
      preloadItems.push(...paginationItems);
    }
    
    if (preloadItems.length > 0) {
      this.addToPreloadQueue(preloadItems);
    }
  }

  private handleHoverBasedPreloading(target: HTMLElement): void {
    const preloadItems: Omit<PreloadItem, 'timestamp'>[] = [];
    
    // Handle link hover
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href && this.isValidPreloadUrl(href)) {
        preloadItems.push({
          url: href,
          priority: 0.8,
          type: 'page',
          estimatedSize: 50000, // 50KB estimate
          source: 'hover'
        });
      }
    }
    
    // Handle image hover
    if (target.tagName === 'IMG' || target.closest('.image-container')) {
      const relatedImages = this.findRelatedImages(target);
      preloadItems.push(...relatedImages);
    }
    
    // Handle product/post card hover
    if (target.closest('.product-card, .post-card, .community-card')) {
      const cardItems = this.extractPreloadItemsFromCard(target);
      preloadItems.push(...cardItems);
    }
    
    if (preloadItems.length > 0) {
      this.addToPreloadQueue(preloadItems);
    }
  }

  private handleIntersectionBasedPreloading(target: HTMLElement): void {
    const preloadItems: Omit<PreloadItem, 'timestamp'>[] = [];
    
    // Handle lazy-loaded images
    if (target.tagName === 'IMG' && target.hasAttribute('data-src')) {
      const src = target.getAttribute('data-src');
      if (src) {
        preloadItems.push({
          url: src,
          priority: 0.9,
          type: 'image',
          estimatedSize: this.estimateImageSize(src),
          source: 'scroll'
        });
      }
    }
    
    // Handle cards coming into view
    if (target.matches('.product-card, .post-card, .community-card')) {
      const cardItems = this.extractPreloadItemsFromCard(target);
      preloadItems.push(...cardItems);
    }
    
    if (preloadItems.length > 0) {
      this.addToPreloadQueue(preloadItems);
    }
  }

  private startPreloadQueueProcessing(): void {
    const processQueue = async () => {
      const adaptiveMaxConcurrent = this.getAdaptiveConcurrentRequests();
      
      if (this.preloadQueue.length === 0 || this.activePreloads.size >= adaptiveMaxConcurrent) {
        return;
      }

      const item = this.preloadQueue.shift();
      if (!item) return;

      // Skip if already preloaded recently
      const lastPreload = this.preloadHistory.get(item.url);
      if (lastPreload && Date.now() - lastPreload < 60000) { // 1 minute cooldown
        return;
      }

      this.activePreloads.add(item.url);
      this.preloadHistory.set(item.url, Date.now());

      try {
        await this.preloadItem(item);
        this.metrics.successfulPreloads++;
      } catch (error) {
        console.warn(`Preload failed for ${item.url}:`, error);
        this.metrics.failedPreloads++;
      } finally {
        this.activePreloads.delete(item.url);
        this.metrics.totalPreloads++;
      }
    };

    // Process queue continuously with adaptive delay
    const processInterval = () => {
      const adaptiveDelay = this.getAdaptiveProcessingDelay();
      setTimeout(() => {
        processQueue().finally(() => processInterval());
      }, adaptiveDelay);
    };

    processInterval();
  }

  private getAdaptiveProcessingDelay(): number {
    let delay = this.config.delayMs;

    // Adjust based on device capabilities
    if (this.deviceCapabilities?.isLowEnd) {
      delay = Math.max(delay, 200);
    } else if (this.deviceCapabilities?.supportsConcurrency) {
      delay = Math.max(50, Math.floor(delay * 0.7));
    }

    // Adjust based on network conditions
    if (this.networkCondition) {
      const { effectiveType, saveData } = this.networkCondition;
      
      if (saveData) {
        delay = Math.max(delay, 500);
      } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
        delay = Math.max(delay, 300);
      } else if (effectiveType === '4g') {
        delay = Math.max(50, Math.floor(delay * 0.8));
      }
    }

    return delay;
  }



  private async preloadItem(item: PreloadItem): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check storage quota before preloading
      const quotaInfo = await storageQuotaManager.getStorageQuotaInfo();
      if (quotaInfo.isNearLimit) {
        console.log('Storage quota near limit, skipping preload');
        return;
      }

      // Use service worker cache service for unified caching
      const strategy = this.getPreloadStrategy(item);
      const response = await serviceWorkerCacheService.fetchWithStrategy(
        item.url, 
        strategy,
        {
          tags: [`preload-${item.source}`, `type-${item.type}`],
          maxAge: this.getMaxAgeForItemType(item.type),
          networkTimeoutSeconds: this.getNetworkTimeoutForPriority(item.priority)
        }
      );

      if (response.ok) {
        // Update metrics
        const responseSize = await this.estimateResponseSize(response);
        this.metrics.bytesPreloaded += responseSize;
        this.metrics.bandwidthSaved += responseSize;
        
        const preloadTime = Date.now() - startTime;
        this.metrics.averagePreloadTime = (this.metrics.averagePreloadTime * this.metrics.successfulPreloads + preloadTime) / (this.metrics.successfulPreloads + 1);
        
        console.log(`Preloaded ${item.url} (${this.formatBytes(responseSize)}, ${preloadTime}ms, strategy: ${strategy})`);
      }
    } catch (error) {
      throw error;
    }
  }

  private isNetworkSuitableForPreloading(): boolean {
    if (!this.networkCondition) return false;
    
    const { networkThresholds, respectSaveData } = this.config;
    const { effectiveType, downlink, rtt, saveData, online } = this.networkCondition;
    
    if (!online) return false;
    if (respectSaveData && saveData) return false;
    
    const effectiveTypeOrder = ['slow-2g', '2g', '3g', '4g'];
    const minTypeIndex = effectiveTypeOrder.indexOf(networkThresholds.minEffectiveType);
    const currentTypeIndex = effectiveTypeOrder.indexOf(effectiveType);
    
    return currentTypeIndex >= minTypeIndex &&
           downlink >= networkThresholds.minDownlink &&
           rtt <= networkThresholds.maxRTT;
  }

  private calculatePreloadPriority(item: Omit<PreloadItem, 'timestamp' | 'priority'>): number {
    let priority = 0.5; // Base priority
    
    // Adjust based on source
    switch (item.source) {
      case 'hover':
        priority += 0.3;
        break;
      case 'scroll':
        priority += 0.2;
        break;
      case 'behavior':
        priority += 0.4;
        break;
      case 'predictive':
        priority += 0.1;
        break;
    }
    
    // Adjust based on type
    switch (item.type) {
      case 'image':
        priority += 0.1;
        break;
      case 'data':
        priority += 0.3;
        break;
      case 'page':
        priority += 0.2;
        break;
      case 'media':
        priority += 0.1;
        break;
    }
    
    // Adjust based on user behavior
    if (this.userBehavior.preferredContentTypes?.includes(item.type)) {
      priority += 0.2;
    }
    
    // Adjust based on size (prefer smaller items)
    if (item.estimatedSize < 10000) { // < 10KB
      priority += 0.1;
    } else if (item.estimatedSize > 100000) { // > 100KB
      priority -= 0.1;
    }
    
    return Math.min(1, Math.max(0, priority));
  }

  // Helper methods for content prediction and extraction

  private predictNextPageContent(): Omit<PreloadItem, 'timestamp'>[] {
    // Implementation would analyze current page structure and predict next content
    // This is a simplified version
    return [];
  }

  private predictPaginationContent(): Omit<PreloadItem, 'timestamp'>[] {
    const items: Omit<PreloadItem, 'timestamp'>[] = [];
    
    // Look for pagination links
    const paginationLinks = document.querySelectorAll('.pagination a, [data-page]');
    paginationLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && this.isValidPreloadUrl(href)) {
        items.push({
          url: href,
          priority: 0.6,
          type: 'page',
          estimatedSize: 30000,
          source: 'predictive'
        });
      }
    });
    
    return items;
  }

  private findRelatedImages(target: HTMLElement): Omit<PreloadItem, 'timestamp'>[] {
    const items: Omit<PreloadItem, 'timestamp'>[] = [];
    
    // Find images in the same container
    const container = target.closest('.image-gallery, .product-images, .post-media');
    if (container) {
      const images = container.querySelectorAll('img[data-src], img[src]');
      images.forEach(img => {
        const src = img.getAttribute('data-src') || img.getAttribute('src');
        if (src && src !== target.getAttribute('src')) {
          items.push({
            url: src,
            priority: 0.7,
            type: 'image',
            estimatedSize: this.estimateImageSize(src),
            source: 'hover'
          });
        }
      });
    }
    
    return items;
  }

  private extractPreloadItemsFromCard(target: HTMLElement): Omit<PreloadItem, 'timestamp'>[] {
    const items: Omit<PreloadItem, 'timestamp'>[] = [];
    const card = target.closest('.product-card, .post-card, .community-card');
    
    if (!card) return items;
    
    // Extract images
    const images = card.querySelectorAll('img[data-src], img[src]');
    images.forEach(img => {
      const src = img.getAttribute('data-src') || img.getAttribute('src');
      if (src) {
        items.push({
          url: src,
          priority: 0.6,
          type: 'image',
          estimatedSize: this.estimateImageSize(src),
          source: 'hover'
        });
      }
    });
    
    // Extract links
    const links = card.querySelectorAll('a[href]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && this.isValidPreloadUrl(href)) {
        items.push({
          url: href,
          priority: 0.5,
          type: 'page',
          estimatedSize: 40000,
          source: 'hover'
        });
      }
    });
    
    return items;
  }

  private getContentTypeFromElement(element: HTMLElement): string | null {
    if (element.closest('.product-card')) return 'product';
    if (element.closest('.post-card')) return 'post';
    if (element.closest('.community-card')) return 'community';
    if (element.tagName === 'IMG') return 'image';
    if (element.tagName === 'VIDEO') return 'video';
    return null;
  }

  private isValidPreloadUrl(url: string): boolean {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.origin === window.location.origin && 
             !url.includes('#') && 
             !url.startsWith('javascript:') &&
             !url.startsWith('mailto:');
    } catch {
      return false;
    }
  }

  private estimateImageSize(src: string): number {
    // Estimate based on URL patterns or default sizes
    if (src.includes('thumbnail') || src.includes('thumb')) return 5000; // 5KB
    if (src.includes('medium') || src.includes('preview')) return 20000; // 20KB
    if (src.includes('large') || src.includes('full')) return 100000; // 100KB
    return 30000; // 30KB default
  }

  private async estimateResponseSize(response: Response): Promise<number> {
    try {
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
      
      const text = await response.clone().text();
      return new Blob([text]).size;
    } catch {
      return 0;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get appropriate cache strategy for preload item
   */
  private getPreloadStrategy(item: PreloadItem): 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate' {
    switch (item.type) {
      case 'image':
        return 'CacheFirst'; // Images can be cached aggressively
      case 'data':
        return 'NetworkFirst'; // Data needs to be fresh
      case 'page':
        return 'StaleWhileRevalidate'; // Pages benefit from stale-while-revalidate
      case 'media':
        return 'CacheFirst'; // Media can be cached aggressively
      default:
        return 'NetworkFirst';
    }
  }

  /**
   * Get max age for different item types
   */
  private getMaxAgeForItemType(type: string): number {
    const maxAges = {
      image: 24 * 60 * 60 * 1000, // 24 hours
      media: 24 * 60 * 60 * 1000, // 24 hours
      page: 10 * 60 * 1000, // 10 minutes
      data: 5 * 60 * 1000 // 5 minutes
    };
    return maxAges[type as keyof typeof maxAges] || 10 * 60 * 1000;
  }

  /**
   * Get network timeout based on priority
   */
  private getNetworkTimeoutForPriority(priority: number): number {
    if (priority > 0.8) return 2; // High priority: 2 seconds
    if (priority > 0.5) return 3; // Medium priority: 3 seconds
    return 5; // Low priority: 5 seconds
  }

  /**
   * Adapt batch size based on device capabilities and network conditions
   */
  private getAdaptiveBatchSize(): number {
    let batchSize = this.config.batchSize;

    // Adjust based on device capabilities
    if (this.deviceCapabilities?.isLowEnd) {
      batchSize = Math.max(1, Math.floor(batchSize * 0.5));
    } else if (this.deviceCapabilities?.supportsConcurrency) {
      batchSize = Math.min(10, Math.floor(batchSize * 1.5));
    }

    // Adjust based on network conditions
    if (this.networkCondition) {
      const { effectiveType, downlink, saveData } = this.networkCondition;
      
      if (saveData) {
        batchSize = Math.max(1, Math.floor(batchSize * 0.3));
      } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
        batchSize = Math.max(1, Math.floor(batchSize * 0.4));
      } else if (effectiveType === '3g') {
        batchSize = Math.max(1, Math.floor(batchSize * 0.7));
      } else if (effectiveType === '4g' && downlink > 5) {
        batchSize = Math.min(15, Math.floor(batchSize * 1.2));
      }
    }

    return Math.max(1, batchSize);
  }

  /**
   * Adapt concurrent requests based on device and network
   */
  private getAdaptiveConcurrentRequests(): number {
    let maxConcurrent = this.config.maxConcurrentRequests;

    // Adjust based on device capabilities
    if (this.deviceCapabilities?.isLowEnd) {
      maxConcurrent = Math.max(1, Math.floor(maxConcurrent * 0.5));
    } else if (this.deviceCapabilities?.cores > 4) {
      maxConcurrent = Math.min(6, Math.floor(maxConcurrent * 1.5));
    }

    // Adjust based on network conditions
    if (this.networkCondition) {
      const { effectiveType, downlink, saveData } = this.networkCondition;
      
      if (saveData) {
        maxConcurrent = 1;
      } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
        maxConcurrent = 1;
      } else if (effectiveType === '3g') {
        maxConcurrent = Math.max(1, Math.floor(maxConcurrent * 0.7));
      } else if (effectiveType === '4g' && downlink > 10) {
        maxConcurrent = Math.min(8, Math.floor(maxConcurrent * 1.3));
      }
    }

    return Math.max(1, maxConcurrent);
  }

  /**
   * Enhanced user behavior analysis with personalized preloading
   */
  private analyzeUserBehaviorForPreloading(): {
    preferredContentTypes: string[];
    scrollPattern: 'fast' | 'medium' | 'slow';
    interactionLevel: 'high' | 'medium' | 'low';
    timeOfDayPattern: 'morning' | 'afternoon' | 'evening' | 'night';
  } {
    const behavior = this.getUserBehaviorPattern();
    if (!behavior) {
      return {
        preferredContentTypes: [],
        scrollPattern: 'medium',
        interactionLevel: 'medium',
        timeOfDayPattern: 'afternoon'
      };
    }

    // Analyze scroll pattern
    let scrollPattern: 'fast' | 'medium' | 'slow' = 'medium';
    if (behavior.scrollSpeed > 1000) scrollPattern = 'fast';
    else if (behavior.scrollSpeed < 300) scrollPattern = 'slow';

    // Analyze interaction level
    let interactionLevel: 'high' | 'medium' | 'low' = 'medium';
    if (behavior.interactionFrequency > 10) interactionLevel = 'high';
    else if (behavior.interactionFrequency < 3) interactionLevel = 'low';

    // Analyze time of day pattern
    let timeOfDayPattern: 'morning' | 'afternoon' | 'evening' | 'night' = 'afternoon';
    const hour = behavior.timeOfDay;
    if (hour >= 6 && hour < 12) timeOfDayPattern = 'morning';
    else if (hour >= 12 && hour < 18) timeOfDayPattern = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDayPattern = 'evening';
    else timeOfDayPattern = 'night';

    return {
      preferredContentTypes: behavior.preferredContentTypes,
      scrollPattern,
      interactionLevel,
      timeOfDayPattern
    };
  }

  /**
   * Personalized preloading based on user behavior
   */
  private getPersonalizedPreloadItems(): Omit<PreloadItem, 'timestamp'>[] {
    const behaviorAnalysis = this.analyzeUserBehaviorForPreloading();
    const items: Omit<PreloadItem, 'timestamp'>[] = [];

    // Preload based on preferred content types
    for (const contentType of behaviorAnalysis.preferredContentTypes.slice(0, 3)) {
      const predictedItems = this.predictContentByType(contentType);
      items.push(...predictedItems);
    }

    // Adjust preloading based on scroll pattern
    if (behaviorAnalysis.scrollPattern === 'fast') {
      // Fast scrollers need more aggressive preloading
      const nextPageItems = this.predictNextPageContent();
      items.push(...nextPageItems);
    }

    // Adjust based on interaction level
    if (behaviorAnalysis.interactionLevel === 'high') {
      // High interaction users benefit from hover-based preloading
      const interactiveItems = this.predictInteractiveContent();
      items.push(...interactiveItems);
    }

    return items;
  }

  /**
   * Predict content based on content type preferences
   */
  private predictContentByType(contentType: string): Omit<PreloadItem, 'timestamp'>[] {
    const items: Omit<PreloadItem, 'timestamp'>[] = [];
    
    // This would be implemented based on the specific content type
    // For now, return empty array as placeholder
    return items;
  }

  /**
   * Predict interactive content for high-interaction users
   */
  private predictInteractiveContent(): Omit<PreloadItem, 'timestamp'>[] {
    const items: Omit<PreloadItem, 'timestamp'>[] = [];
    
    // Look for interactive elements that might be clicked
    const interactiveElements = document.querySelectorAll('button, a, .clickable, .interactive');
    
    interactiveElements.forEach(element => {
      const href = element.getAttribute('href');
      if (href && this.isValidPreloadUrl(href)) {
        items.push({
          url: href,
          priority: 0.6,
          type: 'page',
          estimatedSize: 30000,
          source: 'behavior'
        });
      }
    });

    return items.slice(0, 5); // Limit to 5 items
  }
}

// Export singleton instance
export const intelligentPreloadingSystem = new IntelligentPreloadingSystem();

export default IntelligentPreloadingSystem;
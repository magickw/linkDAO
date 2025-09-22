/**
 * Image Optimization and Lazy Loading Service
 * Handles intelligent image loading, optimization, and caching for community icons
 */

import { CacheConfig } from '../types/communityEnhancements';

interface ImageCacheEntry {
  originalUrl: string;
  optimizedUrl?: string;
  webpUrl?: string;
  avifUrl?: string;
  placeholder?: string;
  dimensions?: { width: number; height: number };
  size: number;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  lazy?: boolean;
  placeholder?: 'blur' | 'color' | 'skeleton';
  priority?: 'high' | 'medium' | 'low';
}

interface LazyLoadingConfig {
  rootMargin?: string;
  threshold?: number;
  enableIntersectionObserver?: boolean;
  preloadDistance?: number;
}

/**
 * Image Optimization Service
 */
export class ImageOptimizationService {
  private cache = new Map<string, ImageCacheEntry>();
  private intersectionObserver: IntersectionObserver | null = null;
  private lazyImages = new Set<HTMLImageElement>();
  private preloadQueue = new Set<string>();
  private optimizationWorker: Worker | null = null;

  constructor(
    private config: CacheConfig & LazyLoadingConfig = {
      maxSize: 500,
      ttl: 60 * 60 * 1000, // 1 hour
      strategy: 'lru',
      rootMargin: '50px',
      threshold: 0.1,
      enableIntersectionObserver: true,
      preloadDistance: 200
    }
  ) {
    this.initializeIntersectionObserver();
    this.initializeOptimizationWorker();
    this.startCacheCleanup();
  }

  /**
   * Initialize Intersection Observer for lazy loading
   */
  private initializeIntersectionObserver(): void {
    if (!this.config.enableIntersectionObserver || !('IntersectionObserver' in window)) {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.intersectionObserver?.unobserve(img);
            this.lazyImages.delete(img);
          }
        });
      },
      {
        rootMargin: this.config.rootMargin || '50px',
        threshold: this.config.threshold || 0.1
      }
    );
  }

  /**
   * Initialize optimization worker
   */
  private initializeOptimizationWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.optimizationWorker = new Worker('/workers/image-optimization-worker.js');
        this.optimizationWorker.onmessage = this.handleWorkerMessage.bind(this);
        this.optimizationWorker.onerror = (error) => {
          console.warn('Image optimization worker error:', error);
          this.optimizationWorker = null;
        };
      } catch (error) {
        console.warn('Failed to initialize image optimization worker:', error);
      }
    }
  }

  /**
   * Handle messages from optimization worker
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    
    switch (type) {
      case 'optimization_complete':
        this.handleOptimizationComplete(data);
        break;
      case 'placeholder_generated':
        this.handlePlaceholderGenerated(data);
        break;
      case 'optimization_error':
        console.warn('Image optimization error:', data.error);
        break;
    }
  }

  /**
   * Optimize and cache community icon
   */
  async optimizeCommunityIcon(
    url: string, 
    options: ImageOptimizationOptions = {}
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(url, options);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      this.updateAccessStats(cached);
      return this.getBestFormat(cached);
    }

    // Generate placeholder while loading
    const placeholder = await this.generatePlaceholder(url, options.placeholder);
    
    try {
      // Optimize image
      const optimized = await this.optimizeImage(url, options);
      
      // Cache the result
      const cacheEntry: ImageCacheEntry = {
        originalUrl: url,
        optimizedUrl: optimized.optimizedUrl,
        webpUrl: optimized.webpUrl,
        avifUrl: optimized.avifUrl,
        placeholder,
        dimensions: optimized.dimensions,
        size: optimized.size,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now()
      };
      
      this.cache.set(cacheKey, cacheEntry);
      
      return this.getBestFormat(cacheEntry);
      
    } catch (error) {
      console.warn('Image optimization failed:', error);
      return placeholder || url; // Fallback to original or placeholder
    }
  }

  /**
   * Set up lazy loading for an image element
   */
  setupLazyLoading(
    img: HTMLImageElement, 
    src: string, 
    options: ImageOptimizationOptions = {}
  ): void {
    // Set placeholder
    if (options.placeholder) {
      this.setPlaceholder(img, src, options.placeholder);
    }

    // Store original src
    img.dataset.src = src;
    img.dataset.options = JSON.stringify(options);

    // Add to lazy loading queue
    if (this.intersectionObserver && options.lazy !== false) {
      this.lazyImages.add(img);
      this.intersectionObserver.observe(img);
    } else {
      // Load immediately if not lazy or no observer
      this.loadImage(img);
    }

    // Preload if high priority
    if (options.priority === 'high') {
      this.preloadImage(src, options);
    }
  }

  /**
   * Load image with optimization
   */
  private async loadImage(img: HTMLImageElement): Promise<void> {
    const src = img.dataset.src;
    const options = img.dataset.options ? JSON.parse(img.dataset.options) : {};
    
    if (!src) return;

    try {
      const optimizedSrc = await this.optimizeCommunityIcon(src, options);
      
      // Create new image to test loading
      const testImg = new Image();
      testImg.onload = () => {
        img.src = optimizedSrc;
        img.classList.add('loaded');
        img.classList.remove('loading');
      };
      
      testImg.onerror = () => {
        // Fallback to original
        img.src = src;
        img.classList.add('error');
        img.classList.remove('loading');
      };
      
      img.classList.add('loading');
      testImg.src = optimizedSrc;
      
    } catch (error) {
      console.warn('Failed to load optimized image:', error);
      img.src = src; // Fallback to original
      img.classList.add('error');
      img.classList.remove('loading');
    }
  }

  /**
   * Preload image for future use
   */
  async preloadImage(src: string, options: ImageOptimizationOptions = {}): Promise<void> {
    if (this.preloadQueue.has(src)) return;
    
    this.preloadQueue.add(src);
    
    try {
      await this.optimizeCommunityIcon(src, options);
    } catch (error) {
      console.warn('Image preload failed:', error);
    } finally {
      this.preloadQueue.delete(src);
    }
  }

  /**
   * Batch preload multiple images
   */
  async batchPreloadImages(
    images: Array<{ src: string; options?: ImageOptimizationOptions }>
  ): Promise<void> {
    const preloadPromises = images.map(({ src, options }) => 
      this.preloadImage(src, options || {})
    );
    
    await Promise.allSettled(preloadPromises);
  }

  /**
   * Optimize image using worker or fallback
   */
  private async optimizeImage(
    url: string, 
    options: ImageOptimizationOptions
  ): Promise<{
    optimizedUrl: string;
    webpUrl?: string;
    avifUrl?: string;
    dimensions: { width: number; height: number };
    size: number;
  }> {
    if (this.optimizationWorker) {
      return this.optimizeWithWorker(url, options);
    } else {
      return this.optimizeWithCanvas(url, options);
    }
  }

  /**
   * Optimize image using web worker
   */
  private async optimizeWithWorker(
    url: string, 
    options: ImageOptimizationOptions
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = Date.now().toString();
      
      const handleMessage = (event: MessageEvent) => {
        const { type, data, id } = event.data;
        
        if (id === messageId) {
          this.optimizationWorker?.removeEventListener('message', handleMessage);
          
          if (type === 'optimization_complete') {
            resolve(data);
          } else if (type === 'optimization_error') {
            reject(new Error(data.error));
          }
        }
      };
      
      this.optimizationWorker?.addEventListener('message', handleMessage);
      
      this.optimizationWorker?.postMessage({
        type: 'optimize_image',
        id: messageId,
        data: { url, options }
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        this.optimizationWorker?.removeEventListener('message', handleMessage);
        reject(new Error('Image optimization timeout'));
      }, 10000);
    });
  }

  /**
   * Optimize image using canvas (fallback)
   */
  private async optimizeWithCanvas(
    url: string, 
    options: ImageOptimizationOptions
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Canvas context not available');
          }
          
          // Calculate dimensions
          const { width, height } = this.calculateDimensions(
            img.width, 
            img.height, 
            options.width, 
            options.height
          );
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          const quality = options.quality || 0.8;
          const format = options.format === 'auto' ? 'jpeg' : (options.format || 'jpeg');
          const mimeType = `image/${format}`;
          
          const optimizedUrl = canvas.toDataURL(mimeType, quality);
          
          resolve({
            optimizedUrl,
            dimensions: { width, height },
            size: optimizedUrl.length * 0.75 // Rough estimate
          });
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  /**
   * Generate placeholder for image
   */
  private async generatePlaceholder(
    url: string, 
    type: 'blur' | 'color' | 'skeleton' = 'blur'
  ): Promise<string> {
    switch (type) {
      case 'blur':
        return this.generateBlurPlaceholder(url);
      case 'color':
        return this.generateColorPlaceholder(url);
      case 'skeleton':
        return this.generateSkeletonPlaceholder();
      default:
        return this.generateBlurPlaceholder(url);
    }
  }

  /**
   * Generate blur placeholder
   */
  private async generateBlurPlaceholder(url: string): Promise<string> {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      return new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(this.generateSkeletonPlaceholder());
            return;
          }
          
          // Small size for blur effect
          canvas.width = 20;
          canvas.height = 20;
          
          ctx.filter = 'blur(2px)';
          ctx.drawImage(img, 0, 0, 20, 20);
          
          resolve(canvas.toDataURL('image/jpeg', 0.1));
        };
        
        img.onerror = () => resolve(this.generateSkeletonPlaceholder());
        img.src = url;
      });
    } catch (error) {
      return this.generateSkeletonPlaceholder();
    }
  }

  /**
   * Generate color placeholder
   */
  private generateColorPlaceholder(url: string): string {
    // Generate a color based on URL hash
    const hash = this.hashString(url);
    const hue = hash % 360;
    const saturation = 30 + (hash % 40);
    const lightness = 80 + (hash % 15);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return this.generateSkeletonPlaceholder();
    
    canvas.width = 100;
    canvas.height = 100;
    
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    ctx.fillRect(0, 0, 100, 100);
    
    return canvas.toDataURL('image/png');
  }

  /**
   * Generate skeleton placeholder
   */
  private generateSkeletonPlaceholder(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPg==';
    
    canvas.width = 100;
    canvas.height = 100;
    
    // Create gradient for skeleton effect
    const gradient = ctx.createLinearGradient(0, 0, 100, 0);
    gradient.addColorStop(0, '#f0f0f0');
    gradient.addColorStop(0.5, '#e0e0e0');
    gradient.addColorStop(1, '#f0f0f0');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 100, 100);
    
    return canvas.toDataURL('image/png');
  }

  /**
   * Set placeholder on image element
   */
  private setPlaceholder(
    img: HTMLImageElement, 
    src: string, 
    type: 'blur' | 'color' | 'skeleton'
  ): void {
    // Set a temporary placeholder while generating the real one
    img.src = this.generateSkeletonPlaceholder();
    
    // Generate and set the actual placeholder
    this.generatePlaceholder(src, type).then(placeholder => {
      if (!img.src || img.src.includes('data:image')) {
        img.src = placeholder;
      }
    });
  }

  /**
   * Calculate optimal dimensions
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth?: number,
    targetHeight?: number
  ): { width: number; height: number } {
    if (!targetWidth && !targetHeight) {
      return { width: originalWidth, height: originalHeight };
    }
    
    const aspectRatio = originalWidth / originalHeight;
    
    if (targetWidth && targetHeight) {
      return { width: targetWidth, height: targetHeight };
    } else if (targetWidth) {
      return { width: targetWidth, height: Math.round(targetWidth / aspectRatio) };
    } else if (targetHeight) {
      return { width: Math.round(targetHeight * aspectRatio), height: targetHeight };
    }
    
    return { width: originalWidth, height: originalHeight };
  }

  /**
   * Get best format based on browser support
   */
  private getBestFormat(cached: ImageCacheEntry): string {
    // Check for AVIF support
    if (cached.avifUrl && this.supportsFormat('avif')) {
      return cached.avifUrl;
    }
    
    // Check for WebP support
    if (cached.webpUrl && this.supportsFormat('webp')) {
      return cached.webpUrl;
    }
    
    // Fallback to optimized or original
    return cached.optimizedUrl || cached.originalUrl;
  }

  /**
   * Check if browser supports image format
   */
  private supportsFormat(format: string): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      return canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(url: string, options: ImageOptimizationOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${url}:${this.hashString(optionsStr)}`;
  }

  /**
   * Hash string for consistent keys
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: ImageCacheEntry): boolean {
    return Date.now() - entry.timestamp > (this.config.ttl || 60 * 60 * 1000);
  }

  /**
   * Update access statistics
   */
  private updateAccessStats(entry: ImageCacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  /**
   * Handle optimization completion from worker
   */
  private handleOptimizationComplete(data: any): void {
    // Update cache with worker results
    const { url, result } = data;
    // Implementation would update cache
  }

  /**
   * Handle placeholder generation from worker
   */
  private handlePlaceholderGenerated(data: any): void {
    // Handle placeholder from worker
    const { url, placeholder } = data;
    // Implementation would update UI
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = this.config.ttl || 60 * 60 * 1000;
    const maxSize = this.config.maxSize || 500;
    
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
    
    // Remove least recently used if over size limit
    if (this.cache.size > maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      const toRemove = entries.slice(0, this.cache.size - maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    totalSize: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    let totalSize = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
      oldestEntry = Math.min(oldestEntry, entry.timestamp);
      newestEntry = Math.max(newestEntry, entry.timestamp);
    }
    
    return {
      size: this.cache.size,
      totalSize,
      hitRate: 0, // Would need to track hits/misses
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.preloadQueue.clear();
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    if (this.optimizationWorker) {
      this.optimizationWorker.terminate();
      this.optimizationWorker = null;
    }
    
    this.clearCache();
    this.lazyImages.clear();
  }
}

// Export singleton instance
export const imageOptimizationService = new ImageOptimizationService();
export default ImageOptimizationService;
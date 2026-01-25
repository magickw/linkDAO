/**
 * Optimized Image Loader Component
 * Implements advanced image loading strategies for marketplace product images
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';
import { getProxiedIPFSUrl } from '@/utils/ipfsProxy';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: 'high' | 'medium' | 'low';
  placeholder?: 'blur' | 'skeleton' | 'none';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  lazy?: boolean;
  preload?: boolean;
  useProductDefault?: boolean; // Use product placeholder instead of avatar for invalid images
}

interface ImageLoadState {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  error?: Error;
}

interface ImageCache {
  [key: string]: {
    blob: Blob;
    objectURL: string;
    timestamp: number;
  };
}

class ImageCacheManager {
  private cache: ImageCache = {};
  private maxCacheSize = 50; // Maximum number of cached images
  private maxAge = 10 * 60 * 1000; // 10 minutes

  async get(src: string): Promise<string | null> {
    const cached = this.cache[src];

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.delete(src);
      return null;
    }

    return cached.objectURL;
  }

  async set(src: string, blob: Blob): Promise<string> {
    // Clean up old entries if cache is full
    if (Object.keys(this.cache).length >= this.maxCacheSize) {
      this.cleanup();
    }

    const objectURL = URL.createObjectURL(blob);

    this.cache[src] = {
      blob,
      objectURL,
      timestamp: Date.now()
    };

    return objectURL;
  }

  delete(src: string): void {
    const cached = this.cache[src];
    if (cached) {
      URL.revokeObjectURL(cached.objectURL);
      delete this.cache[src];
    }
  }

  private cleanup(): void {
    const entries = Object.entries(this.cache);
    const now = Date.now();

    // Remove expired entries first
    entries.forEach(([src, cached]) => {
      if (now - cached.timestamp > this.maxAge) {
        this.delete(src);
      }
    });

    // If still too many, remove oldest entries
    const remaining = Object.entries(this.cache);
    if (remaining.length >= this.maxCacheSize) {
      remaining
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, remaining.length - this.maxCacheSize + 10)
        .forEach(([src]) => this.delete(src));
    }
  }

  clear(): void {
    Object.keys(this.cache).forEach(src => this.delete(src));
  }
}

// Global image cache instance
const imageCache = new ImageCacheManager();

// Image optimization utilities
const isValidImageUrl = (src: string): boolean => {
  if (!src || typeof src !== 'string') return false;
  // Allow data URLs, blob URLs, absolute URLs, relative paths starting with /, and IPFS CIDs
  return src.startsWith('data:') ||
    src.startsWith('blob:') ||
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('/') ||
    src.startsWith('Qm') || // IPFS CIDv0
    src.startsWith('baf'); // IPFS CIDv1
};

const DEFAULT_AVATAR = '/images/default-avatar.png';
const DEFAULT_PRODUCT_IMAGE = '/images/placeholders/product-placeholder.svg';

const getOptimizedImageURL = (
  src: string,
  width?: number,
  height?: number,
  quality: number = 75,
  useProductDefault: boolean = false
): string => {
  // Validate src - if it looks like a wallet address or invalid, use default
  if (!isValidImageUrl(src)) {
    console.warn('Invalid image URL detected, using default:', src?.substring(0, 20));
    return useProductDefault ? DEFAULT_PRODUCT_IMAGE : DEFAULT_AVATAR;
  }

  // Check for invalid "fallback-" IPFS URLs (these are placeholder/error URLs from failed uploads)
  if (src.includes('fallback-') || src.includes('/ipfs/fallback-')) {
    console.warn('Detected invalid fallback IPFS URL, using placeholder:', src);
    return useProductDefault ? DEFAULT_PRODUCT_IMAGE : DEFAULT_AVATAR;
  }

  // If it's already a data URL or blob URL, return as is
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  // Handle IPFS CIDs by converting to gateway URL
  if (src.startsWith('Qm') || src.startsWith('baf')) {
    const proxyUrl = getProxiedIPFSUrl(src);
    const url = new URL(proxyUrl);

    // Add optimization parameters
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', quality.toString());
    url.searchParams.set('f', 'webp');

    return url.toString();
  }

  // For external URLs, try to use optimization services
  if (src.startsWith('http')) {
    // Fix malformed IPFS gateway URLs with double slashes
    if (src.includes('//ipfs//') || src.includes('/ipfs//')) {
      const fixed = src.replace(/\/\/ipfs\/\//, '/ipfs/').replace(/\/ipfs\/\//, '/ipfs/');
      console.warn('Fixed malformed IPFS URL:', src, '→', fixed);

      // If the fixed URL is still invalid (no CID after /ipfs/), use default
      if (fixed.endsWith('/ipfs/') || fixed.includes('/ipfs//')) {
        console.warn('Cannot fix malformed IPFS URL, using default');
        return useProductDefault ? DEFAULT_PRODUCT_IMAGE : DEFAULT_AVATAR;
      }

      src = fixed;
    }

    try {
      const url = new URL(src);

      // Add optimization parameters if the service supports them
      if (width) url.searchParams.set('w', width.toString());
      if (height) url.searchParams.set('h', height.toString());
      url.searchParams.set('q', quality.toString());
      url.searchParams.set('f', 'webp'); // Prefer WebP format

      return url.toString();
    } catch (urlError) {
      console.warn('Invalid URL format, using default:', src);
      return useProductDefault ? DEFAULT_PRODUCT_IMAGE : DEFAULT_AVATAR;
    }
  }

  return src;
};

const generateBlurDataURL = (width: number = 10, height: number = 10): string => {
  // Generate a simple blur placeholder
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Create a simple gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.1);
};

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = 'medium',
  placeholder = 'skeleton',
  blurDataURL,
  sizes,
  quality = 75,
  onLoad,
  onError,
  lazy = true,
  preload = false,
  useProductDefault = false
}) => {
  const [loadState, setLoadState] = useState<ImageLoadState>({
    isLoading: true,
    isLoaded: false,
    hasError: false
  });

  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [isInView, setIsInView] = useState(!lazy);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  // Generate optimized image URL
  const optimizedSrc = useMemo(() => {
    return getOptimizedImageURL(src, width, height, quality, useProductDefault);
  }, [src, width, height, quality, useProductDefault]);

  // Generate blur placeholder if needed
  const placeholderSrc = useMemo(() => {
    if (placeholder === 'blur') {
      return blurDataURL || generateBlurDataURL(width, height);
    }
    return '';
  }, [placeholder, blurDataURL, width, height]);

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || !containerRef.current) return;

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            intersectionObserverRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    intersectionObserverRef.current?.observe(containerRef.current);

    return () => {
      intersectionObserverRef.current?.disconnect();
    };
  }, [lazy]);

  // Preload image if requested
  useEffect(() => {
    if (preload && optimizedSrc) {
      const img = new Image();
      img.src = optimizedSrc;
    }
  }, [preload, optimizedSrc]);

  // Load image when in view
  const loadImage = useCallback(async () => {
    if (!optimizedSrc || loadState.isLoaded) return;

    setLoadState(prev => ({ ...prev, isLoading: true, hasError: false }));

    try {
      // Check cache first
      const cachedURL = await imageCache.get(optimizedSrc);

      if (cachedURL) {
        setCurrentSrc(cachedURL);
        setLoadState({
          isLoading: false,
          isLoaded: true,
          hasError: false
        });
        onLoad?.();
        return;
      }

      // Fetch and cache the image
      const response = await fetch(optimizedSrc);

      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }

      const blob = await response.blob();
      const objectURL = await imageCache.set(optimizedSrc, blob);

      setCurrentSrc(objectURL);
      setLoadState({
        isLoading: false,
        isLoaded: true,
        hasError: false
      });

      onLoad?.();

    } catch (error) {
      const err = error as Error;
      setLoadState({
        isLoading: false,
        isLoaded: false,
        hasError: true,
        error: err
      });

      onError?.(err);

      // Fallback to original src
      setCurrentSrc(optimizedSrc);
    }
  }, [optimizedSrc, loadState.isLoaded, onLoad, onError]);

  // Load image when in view
  useEffect(() => {
    if (isInView && optimizedSrc) {
      loadImage();
    }
  }, [isInView, optimizedSrc, loadImage]);

  // Handle image load events
  const handleImageLoad = useCallback(() => {
    if (!loadState.isLoaded) {
      setLoadState(prev => ({
        ...prev,
        isLoading: false,
        isLoaded: true,
        hasError: false
      }));
      onLoad?.();
    }
  }, [loadState.isLoaded, onLoad]);

  const handleImageError = useCallback(() => {
    const error = new Error('Image failed to load');
    setLoadState({
      isLoading: false,
      isLoaded: false,
      hasError: true,
      error
    });
    // Type guard to ensure error is an Error instance
    const errorObj = error instanceof Error ? error : new Error(String(error));
    onError?.(errorObj);
  }, [onError]);

  // Render placeholder
  const renderPlaceholder = () => {
    if (placeholder === 'skeleton') {
      return (
        <LoadingSkeleton
          variant="image"
          width={width ? `${width}px` : '100%'}
          height={height ? `${height}px` : '100%'}
          className="absolute inset-0"
        />
      );
    }

    if (placeholder === 'blur' && placeholderSrc) {
      return (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          aria-hidden="true"
        />
      );
    }

    return null;
  };

  // Render error state
  const renderError = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
      <div className="text-center">
        <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
        <span className="text-xs">Image unavailable</span>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder */}
      <AnimatePresence>
        {(loadState.isLoading || !isInView) && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {renderPlaceholder()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {loadState.hasError && renderError()}

      {/* Main Image */}
      {isInView && currentSrc && (
        <motion.img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loadState.isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority === 'high' ? 'eager' : 'lazy'}
          decoding="async"
          initial={{ opacity: 0 }}
          animate={{ opacity: loadState.isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Loading Indicator */}
      {loadState.isLoading && isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

// Hook for batch image preloading
export const useImagePreloader = () => {
  const preloadImages = useCallback(async (urls: string[], options?: {
    priority?: 'high' | 'medium' | 'low';
    maxConcurrent?: number;
  }) => {
    const { priority = 'low', maxConcurrent = 3 } = options || {};

    const preloadPromises: Promise<void>[] = [];

    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async (url) => {
        try {
          // Check if already cached
          const cached = await imageCache.get(url);
          if (cached) return;

          // Preload the image
          const response = await fetch(url);
          if (response.ok) {
            const blob = await response.blob();
            await imageCache.set(url, blob);
          }
        } catch (error) {
          console.debug('Failed to preload image:', url, error);
        }
      });

      preloadPromises.push(...batchPromises);

      // Wait for current batch before starting next (for low priority)
      if (priority === 'low') {
        await Promise.allSettled(batchPromises);
      }
    }

    return Promise.allSettled(preloadPromises);
  }, []);

  const clearImageCache = useCallback(() => {
    imageCache.clear();
  }, []);

  return {
    preloadImages,
    clearImageCache
  };
};

// Progressive image component for hero images
export const ProgressiveImage: React.FC<OptimizedImageProps & {
  lowQualitySrc?: string;
}> = ({ lowQualitySrc, ...props }) => {
  const [showLowQuality, setShowLowQuality] = useState(!!lowQualitySrc);

  const handleHighQualityLoad = useCallback(() => {
    setShowLowQuality(false);
    props.onLoad?.();
  }, [props.onLoad]);

  return (
    <div className="relative">
      {/* Low quality image */}
      {showLowQuality && lowQualitySrc && (
        <OptimizedImage
          {...props}
          src={lowQualitySrc}
          className={`${props.className} filter blur-sm`}
          priority="high"
          lazy={false}
        />
      )}

      {/* High quality image */}
      <OptimizedImage
        {...props}
        onLoad={handleHighQualityLoad}
        className={showLowQuality ? `${props.className} absolute inset-0` : props.className}
      />
    </div>
  );
};

export default OptimizedImage;
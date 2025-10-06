import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataSaving } from './MobileDataSavingMode';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

interface MobileProgressiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderSrc?: string;
  blurDataURL?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  sizes?: string;
  quality?: number;
  loading?: 'lazy' | 'eager';
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  aspectRatio?: string;
}

interface ImageState {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  currentSrc: string;
}

export const MobileProgressiveImage: React.FC<MobileProgressiveImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  placeholderSrc,
  blurDataURL,
  priority = false,
  onLoad,
  onError,
  sizes,
  quality = 75,
  loading = 'lazy',
  objectFit = 'cover',
  aspectRatio
}) => {
  const { getOptimizedImageUrl, shouldPreload, isLowBandwidth } = useDataSaving();
  const { devicePixelRatio, getOptimalImageSize } = useMobileOptimization();
  
  const [imageState, setImageState] = useState<ImageState>({
    isLoading: true,
    isLoaded: false,
    hasError: false,
    currentSrc: ''
  });
  
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isInView, setIsInView] = useState(priority);

  // Generate optimized image URLs
  const getImageSources = useCallback(() => {
    const containerWidth = width || 400;
    const containerHeight = height || 300;
    
    // Get optimal dimensions based on device pixel ratio
    const { width: optimalWidth, height: optimalHeight } = getOptimalImageSize(containerWidth);
    
    // Generate different quality versions
    const sources = {
      lowQuality: getOptimizedImageUrl(src, Math.round(optimalWidth * 0.1), Math.round(optimalHeight * 0.1)),
      mediumQuality: getOptimizedImageUrl(src, Math.round(optimalWidth * 0.5), Math.round(optimalHeight * 0.5)),
      highQuality: getOptimizedImageUrl(src, optimalWidth, optimalHeight),
      original: src
    };

    return sources;
  }, [src, width, height, getOptimizedImageUrl, getOptimalImageSize]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || loading === 'eager') {
      setIsInView(true);
      return;
    }

    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, loading]);

  // Progressive loading logic
  useEffect(() => {
    if (!isInView) return;

    const sources = getImageSources();
    let currentQualityIndex = 0;
    const qualityLevels = isLowBandwidth 
      ? [sources.lowQuality, sources.mediumQuality]
      : [sources.lowQuality, sources.mediumQuality, sources.highQuality];

    const loadNextQuality = () => {
      if (currentQualityIndex >= qualityLevels.length) return;

      const img = new Image();
      const currentSrc = qualityLevels[currentQualityIndex];

      img.onload = () => {
        setImageState(prev => ({
          ...prev,
          currentSrc,
          isLoading: currentQualityIndex === qualityLevels.length - 1 ? false : prev.isLoading,
          isLoaded: true
        }));

        // Load next quality level if available and network conditions allow
        if (currentQualityIndex < qualityLevels.length - 1 && shouldPreload('image')) {
          currentQualityIndex++;
          setTimeout(loadNextQuality, 100); // Small delay between quality upgrades
        } else {
          setImageState(prev => ({ ...prev, isLoading: false }));
          onLoad?.();
        }
      };

      img.onerror = () => {
        if (currentQualityIndex === 0) {
          // If even the lowest quality fails, show error
          setImageState(prev => ({
            ...prev,
            hasError: true,
            isLoading: false
          }));
          onError?.(new Error(`Failed to load image: ${currentSrc}`));
        } else {
          // Try next quality level
          currentQualityIndex++;
          loadNextQuality();
        }
      };

      img.src = currentSrc;
    };

    // Start with placeholder or blur data URL if available
    if (blurDataURL && !imageState.currentSrc) {
      setImageState(prev => ({ ...prev, currentSrc: blurDataURL }));
    } else if (placeholderSrc && !imageState.currentSrc) {
      setImageState(prev => ({ ...prev, currentSrc: placeholderSrc }));
    }

    loadNextQuality();
  }, [isInView, getImageSources, isLowBandwidth, shouldPreload, blurDataURL, placeholderSrc, imageState.currentSrc, onLoad, onError]);

  // Generate placeholder with blur effect
  const generatePlaceholder = () => {
    if (blurDataURL) return blurDataURL;
    if (placeholderSrc) return placeholderSrc;
    
    // Generate a simple colored placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, 10, 10);
      return canvas.toDataURL();
    }
    
    return '';
  };

  const containerStyle: React.CSSProperties = {
    aspectRatio: aspectRatio || (width && height ? `${width}/${height}` : undefined),
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto'
  };

  const imageStyle: React.CSSProperties = {
    objectFit,
    width: '100%',
    height: '100%'
  };

  if (imageState.hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${className}`}
        style={containerStyle}
        role="img"
        aria-label={`Failed to load image: ${alt}`}
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
          <p className="text-sm">Image failed to load</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={containerStyle}
    >
      <AnimatePresence mode="wait">
        {imageState.isLoading && !imageState.currentSrc && (
          <motion.div
            key="skeleton"
            className="absolute inset-0 bg-gray-200 dark:bg-gray-700"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Skeleton loading animation */}
            <div className="animate-pulse h-full w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main image */}
      <motion.img
        ref={imgRef}
        src={imageState.currentSrc || generatePlaceholder()}
        alt={alt}
        style={imageStyle}
        className={`
          transition-all duration-300
          ${imageState.isLoading ? 'blur-sm' : 'blur-0'}
          ${imageState.currentSrc === blurDataURL || imageState.currentSrc === placeholderSrc ? 'scale-110' : 'scale-100'}
        `}
        initial={{ opacity: 0 }}
        animate={{ opacity: imageState.currentSrc ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        loading={loading}
        sizes={sizes}
        onLoad={() => {
          if (imageState.currentSrc !== blurDataURL && imageState.currentSrc !== placeholderSrc) {
            setImageState(prev => ({ ...prev, isLoaded: true }));
          }
        }}
        onError={() => {
          setImageState(prev => ({ ...prev, hasError: true, isLoading: false }));
        }}
      />

      {/* Loading indicator */}
      <AnimatePresence>
        {imageState.isLoading && imageState.currentSrc && (
          <motion.div
            className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            Loading...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quality indicator (development only) */}
      {process.env.NODE_ENV === 'development' && imageState.currentSrc && (
        <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
          {imageState.currentSrc.includes('q=30') ? 'Low' :
           imageState.currentSrc.includes('q=60') ? 'Med' : 'High'}
        </div>
      )}
    </div>
  );
};

// Hook for batch image preloading
export const useImagePreloader = () => {
  const { shouldPreload } = useDataSaving();
  const preloadedImages = useRef<Set<string>>(new Set());

  const preloadImages = useCallback((urls: string[], priority: 'high' | 'low' = 'low') => {
    if (!shouldPreload('image') && priority === 'low') return;

    urls.forEach(url => {
      if (preloadedImages.current.has(url)) return;

      const img = new Image();
      img.src = url;
      preloadedImages.current.add(url);

      // Clean up after successful load
      img.onload = () => {
        // Image is now cached by the browser
      };

      img.onerror = () => {
        // Remove from preloaded set so it can be retried
        preloadedImages.current.delete(url);
      };
    });
  }, [shouldPreload]);

  const clearPreloadCache = useCallback(() => {
    preloadedImages.current.clear();
  }, []);

  return {
    preloadImages,
    clearPreloadCache,
    preloadedCount: preloadedImages.current.size
  };
};

export default MobileProgressiveImage;
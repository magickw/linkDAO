import React, { useState, useRef, useEffect, useCallback, ReactNode, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntersectionObserver } from './IntersectionObserverManager';

interface LazyLoadConfig {
  rootMargin: string;
  threshold: number;
  enableBlurTransition: boolean;
  preloadDistance: number;
  retryAttempts: number;
  retryDelay: number;
  enableIntersectionOptimization: boolean;
}

interface IntelligentLazyLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
  skeleton?: ReactNode;
  placeholder?: string;
  config?: Partial<LazyLoadConfig>;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onVisible?: () => void;
  className?: string;
  priority?: 'low' | 'normal' | 'high';
  enablePreloading?: boolean;
}

const DEFAULT_CONFIG: LazyLoadConfig = {
  rootMargin: '50px',
  threshold: 0.1,
  enableBlurTransition: true,
  preloadDistance: 200,
  retryAttempts: 3,
  retryDelay: 1000,
  enableIntersectionOptimization: true
};

export const IntelligentLazyLoader = memo(function IntelligentLazyLoader({
  children,
  fallback,
  skeleton,
  placeholder,
  config = {},
  onLoad,
  onError,
  onVisible,
  className = '',
  priority = 'normal',
  enablePreloading = true
}: IntelligentLazyLoaderProps) {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  const divRef = useRef<HTMLDivElement>(null);

  // Use optimized intersection observer
  const { ref: elementRef, isIntersecting } = useIntersectionObserver({
    rootMargin: finalConfig.rootMargin,
    threshold: finalConfig.threshold,
    triggerOnce: finalConfig.enableIntersectionOptimization,
    skip: priority === 'high' || hasLoaded
  });

  useEffect(() => {
    if (divRef.current) {
      (elementRef as React.MutableRefObject<Element | null>).current = divRef.current;
    }
  }, [elementRef]);

  // Preload based on priority
  useEffect(() => {
    if (priority === 'high' && !hasLoaded) {
      loadContent();
    }
  }, [priority]);

  // Load content when visible
  useEffect(() => {
    if (isIntersecting && !hasLoaded && priority !== 'high') {
      onVisible?.();
      loadContent();
    }
  }, [isIntersecting, hasLoaded, priority, onVisible]);

  const loadContent = useCallback(async () => {
    if (hasLoaded || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulate content loading with realistic delay based on priority
      await new Promise((resolve, reject) => {
        const loadTime = priority === 'high' ? 100 : 
                        priority === 'normal' ? 300 : 500;
        
        setTimeout(() => {
          // Simulate occasional failures for testing retry logic
          if (Math.random() < 0.05 && retryCount === 0) {
            reject(new Error('Simulated loading failure'));
          } else {
            resolve(void 0);
          }
        }, loadTime + Math.random() * 200);
      });

      setHasLoaded(true);
      setIsLoading(false);
      setRetryCount(0);
      onLoad?.();

    } catch (err) {
      const error = err as Error;
      setError(error);
      setIsLoading(false);
      
      // Retry logic with exponential backoff
      if (retryCount < finalConfig.retryAttempts) {
        const delay = finalConfig.retryDelay * Math.pow(2, retryCount);
        
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadContent();
        }, delay);
      } else {
        // Type guard to ensure error is an Error instance
        const errorObj = error instanceof Error ? error : new Error(String(error));
        onError?.(errorObj);
      }
    }
  }, [hasLoaded, isLoading, retryCount, priority, finalConfig, onLoad, onError]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const renderContent = () => {
    if (error && retryCount >= finalConfig.retryAttempts) {
      return <ErrorFallback error={error} onRetry={() => {
        setRetryCount(0);
        setError(null);
        loadContent();
      }} />;
    }

    if (hasLoaded) {
      return children;
    }

    if (isLoading || isIntersecting) {
      return skeleton || fallback || <DefaultSkeleton />;
    }

    return <PlaceholderContent placeholder={placeholder} />;
  };

  return (
    <div ref={divRef} className={`intelligent-lazy-loader ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={hasLoaded ? 'loaded' : 'loading'}
          initial={{ 
            opacity: 0, 
            filter: finalConfig.enableBlurTransition ? 'blur(4px)' : 'none' 
          }}
          animate={{ 
            opacity: 1, 
            filter: 'blur(0px)' 
          }}
          exit={{ 
            opacity: 0, 
            filter: finalConfig.enableBlurTransition ? 'blur(4px)' : 'none' 
          }}
          transition={{ 
            duration: finalConfig.enableBlurTransition ? 0.5 : 0.2,
            ease: "easeOut"
          }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* Loading indicator */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm"
        >
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">
              {retryCount > 0 ? `Retrying... (${retryCount}/${finalConfig.retryAttempts})` : 'Loading...'}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
});

// Enhanced lazy image with progressive loading and format detection
interface IntelligentLazyImageProps {
  src: string;
  alt: string;
  lowQualitySrc?: string;
  placeholder?: string;
  width?: number;
  height?: number;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  priority?: 'low' | 'normal' | 'high';
  quality?: number;
  enableWebP?: boolean;
  enableAVIF?: boolean;
  sizes?: string;
}

export const IntelligentLazyImage = memo(function IntelligentLazyImage({
  src,
  alt,
  lowQualitySrc,
  placeholder,
  width,
  height,
  className = '',
  onLoad,
  onError,
  priority = 'normal',
  quality = 75,
  enableWebP = true,
  enableAVIF = true,
  sizes
}: IntelligentLazyImageProps) {
  const [loadingState, setLoadingState] = useState<{
    phase: 'placeholder' | 'lowQuality' | 'highQuality' | 'error';
    progress: number;
  }>({
    phase: 'placeholder',
    progress: 0
  });

  const [currentSrc, setCurrentSrc] = useState(placeholder || '');
  const [supportedFormats, setSupportedFormats] = useState<{
    webp: boolean;
    avif: boolean;
  }>({ webp: false, avif: false });

  // Check format support on mount
  useEffect(() => {
    checkFormatSupport();
  }, []);

  const checkFormatSupport = useCallback(async () => {
    const [webpSupport, avifSupport] = await Promise.all([
      checkImageFormatSupport('webp'),
      checkImageFormatSupport('avif')
    ]);
    
    setSupportedFormats({
      webp: webpSupport,
      avif: avifSupport
    });
  }, []);

  const checkImageFormatSupport = useCallback((format: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.width > 0 && img.height > 0);
      img.onerror = () => resolve(false);
      
      const testImages = {
        webp: 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA',
        avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='
      };
      
      img.src = testImages[format as keyof typeof testImages];
    });
  }, []);

  const getOptimizedSrc = useCallback((originalSrc: string, isLowQuality = false): string => {
    if (!originalSrc || originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')) {
      return originalSrc;
    }

    // In a real implementation, you'd construct optimized URLs for your CDN
    // For now, we'll simulate the optimization
    const params = new URLSearchParams();
    
    // Add quality parameter
    params.set('q', isLowQuality ? '30' : quality.toString());

    // Add dimensions if provided
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());

    // Add format based on support
    if (enableAVIF && supportedFormats.avif) {
      params.set('f', 'avif');
    } else if (enableWebP && supportedFormats.webp) {
      params.set('f', 'webp');
    }

    // Return original URL for now (in real app, would return optimized URL)
    return originalSrc;
  }, [quality, width, height, enableWebP, enableAVIF, supportedFormats]);

  const loadImage = useCallback(async (imageSrc: string, phase: 'lowQuality' | 'highQuality') => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      const optimizedSrc = getOptimizedSrc(imageSrc, phase === 'lowQuality');
      
      img.onload = () => {
        setCurrentSrc(optimizedSrc);
        setLoadingState(prev => ({ 
          ...prev, 
          phase, 
          progress: phase === 'highQuality' ? 100 : 50 
        }));
        
        if (phase === 'highQuality') {
          onLoad?.();
        }
        resolve();
      };
      
      img.onerror = () => {
        if (phase === 'highQuality') {
          setLoadingState(prev => ({ ...prev, phase: 'error' }));
          onError?.(new Error('Failed to load image'));
        }
        reject();
      };

      // Simulate loading progress
      let progress = phase === 'lowQuality' ? 0 : 50;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 10;
        const maxProgress = phase === 'lowQuality' ? 50 : 100;
        
        if (progress >= maxProgress) {
          clearInterval(progressInterval);
          progress = maxProgress;
        }
        
        setLoadingState(prev => ({ ...prev, progress }));
      }, 100);
      
      img.src = optimizedSrc;
    });
  }, [getOptimizedSrc, onLoad, onError]);

  const handleLazyLoad = useCallback(async () => {
    try {
      // Load low quality first if available
      if (lowQualitySrc && loadingState.phase === 'placeholder') {
        await loadImage(lowQualitySrc, 'lowQuality');
      }
      
      // Then load high quality
      if (src) {
        await loadImage(src, 'highQuality');
      }
    } catch (error) {
      console.warn('Progressive image loading failed:', error);
    }
  }, [src, lowQualitySrc, loadingState.phase, loadImage]);

  const imageClasses = useMemo(() => [
    className,
    'transition-all duration-500 ease-out',
    loadingState.phase === 'lowQuality' ? 'blur-sm scale-105' : '',
    loadingState.phase === 'highQuality' ? 'blur-0 scale-100' : '',
    'object-cover w-full h-full'
  ].filter(Boolean).join(' '), [className, loadingState.phase]);

  return (
    <IntelligentLazyLoader
      onLoad={handleLazyLoad}
      priority={priority}
      className="relative overflow-hidden"
      skeleton={
        <div className="animate-pulse bg-gray-200 flex flex-col items-center justify-center" style={{ width, height }}>
          {/* Progress bar */}
          <div className="w-3/4 bg-gray-300 rounded-full h-1 mb-2">
            <motion.div
              className="bg-blue-500 h-1 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${loadingState.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          {/* Image icon */}
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          
          {/* Progress text */}
          <div className="text-xs text-gray-500 mt-2">
            {Math.round(loadingState.progress)}%
          </div>
        </div>
      }
    >
      {loadingState.phase === 'error' ? (
        <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
          <span>Failed to load image</span>
        </div>
      ) : (
        <motion.img
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          className={imageClasses}
          initial={{ opacity: 0 }}
          animate={{ opacity: currentSrc ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </IntelligentLazyLoader>
  );
});

// Default components
const DefaultSkeleton = memo(function DefaultSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  );
});

const PlaceholderContent = memo(function PlaceholderContent({ placeholder }: { placeholder?: string }) {
  return (
    <div className="flex items-center justify-center h-32 bg-gray-100 text-gray-500">
      <span>{placeholder || 'Content will load when visible'}</span>
    </div>
  );
});

const ErrorFallback = memo(function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 mb-4 text-red-500">
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Failed to load content
      </h3>
      
      <p className="text-sm text-gray-500 mb-4">
        {error.message}
      </p>
      
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
});

export default IntelligentLazyLoader;
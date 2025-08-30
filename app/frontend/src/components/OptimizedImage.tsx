import React, { useState, useRef, useEffect, useCallback } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  quality?: number;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  blur?: boolean;
}

interface ImageState {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  currentSrc: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder,
  quality = 75,
  priority = false,
  onLoad,
  onError,
  lazy = true,
  blur = true
}: OptimizedImageProps) {
  const [state, setState] = useState<ImageState>({
    isLoading: true,
    isLoaded: false,
    hasError: false,
    currentSrc: placeholder || ''
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate optimized image URLs
  const generateOptimizedSrc = useCallback((originalSrc: string, w?: number, q?: number) => {
    if (!originalSrc) return '';
    
    // If it's already a data URL or blob, return as is
    if (originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')) {
      return originalSrc;
    }

    // For external URLs, we might want to use a service like Cloudinary or similar
    // For now, we'll just return the original URL
    // In a real implementation, you'd construct optimized URLs here
    return originalSrc;
  }, []);

  // Load the actual image
  const loadImage = useCallback(() => {
    if (!src || state.isLoaded) return;

    const img = new Image();
    const optimizedSrc = generateOptimizedSrc(src, width, quality);

    img.onload = () => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoaded: true,
        hasError: false,
        currentSrc: optimizedSrc
      }));
      onLoad?.();
    };

    img.onerror = () => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoaded: false,
        hasError: true,
        currentSrc: placeholder || ''
      }));
      onError?.();
    };

    img.src = optimizedSrc;
  }, [src, width, quality, generateOptimizedSrc, placeholder, onLoad, onError, state.isLoaded]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || !imgRef.current) {
      loadImage();
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px' // Start loading 50px before the image comes into view
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, priority, loadImage]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const imageClasses = [
    className,
    'transition-opacity duration-300',
    state.isLoading && blur ? 'blur-sm' : '',
    state.isLoaded ? 'opacity-100' : 'opacity-0'
  ].filter(Boolean).join(' ');

  const containerStyle: React.CSSProperties = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle} className="relative">
      {/* Placeholder/Loading state */}
      {(state.isLoading || state.hasError) && (
        <div 
          className="absolute inset-0 bg-gray-200 flex items-center justify-center"
          style={{ width: '100%', height: '100%' }}
        >
          {state.isLoading && (
            <div className="animate-pulse bg-gray-300 w-full h-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-gray-400" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
          )}
          
          {state.hasError && (
            <div className="text-gray-500 text-center p-4">
              <svg 
                className="w-8 h-8 mx-auto mb-2 text-gray-400" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                  clipRule="evenodd" 
                />
              </svg>
              <p className="text-sm">Failed to load image</p>
            </div>
          )}
        </div>
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={state.currentSrc}
        alt={alt}
        width={width}
        height={height}
        className={imageClasses}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        loading={lazy && !priority ? 'lazy' : 'eager'}
      />
    </div>
  );
}

// Hook for managing multiple images
export function useImagePreloader(urls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const preloadImage = (url: string) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        
        img.onload = () => {
          setLoadedImages(prev => new Set(prev).add(url));
          resolve();
        };
        
        img.onerror = () => {
          setFailedImages(prev => new Set(prev).add(url));
          resolve();
        };
        
        img.src = url;
      });
    };

    // Preload all images
    Promise.all(urls.map(preloadImage));
  }, [urls]);

  return {
    loadedImages,
    failedImages,
    isLoaded: (url: string) => loadedImages.has(url),
    hasFailed: (url: string) => failedImages.has(url)
  };
}

// Progressive image component that loads different qualities
export function ProgressiveImage({
  src,
  alt,
  lowQualitySrc,
  className = '',
  ...props
}: OptimizedImageProps & { lowQualitySrc?: string }) {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || src);
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);

  useEffect(() => {
    if (!src || src === lowQualitySrc) return;

    const img = new Image();
    img.onload = () => {
      setCurrentSrc(src);
      setIsHighQualityLoaded(true);
    };
    img.src = src;
  }, [src, lowQualitySrc]);

  return (
    <OptimizedImage
      {...props}
      src={currentSrc}
      alt={alt}
      className={`${className} ${!isHighQualityLoaded && lowQualitySrc ? 'blur-sm' : ''}`}
    />
  );
}

export default OptimizedImage;
import React, { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { motion } from 'framer-motion';

// Generic lazy loading wrapper
interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function LazyWrapper({
  children,
  fallback,
  rootMargin = '50px',
  threshold = 0.1,
  onLoad,
  className = '',
  style
}: LazyWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          onLoad?.();
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold, hasLoaded, onLoad]);

  return (
    <div ref={elementRef} className={className} style={style}>
      {isVisible ? children : fallback}
    </div>
  );
}

// Enhanced lazy image with progressive loading
interface LazyImageProps {
  src: string;
  alt: string;
  lowQualitySrc?: string;
  placeholder?: string;
  width?: number;
  height?: number;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean;
  sizes?: string;
  quality?: number;
}

export function LazyImage({
  src,
  alt,
  lowQualitySrc,
  placeholder,
  width,
  height,
  className = '',
  onLoad,
  onError,
  priority = false,
  sizes,
  quality = 75
}: LazyImageProps) {
  const [currentSrc, setCurrentSrc] = useState(placeholder || lowQualitySrc || '');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadPhase, setLoadPhase] = useState<'placeholder' | 'lowQuality' | 'highQuality'>('placeholder');

  const loadImage = useCallback(async (imageSrc: string, phase: 'lowQuality' | 'highQuality') => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        setCurrentSrc(imageSrc);
        setLoadPhase(phase);
        if (phase === 'highQuality') {
          setIsLoading(false);
          onLoad?.();
        }
        resolve();
      };
      
      img.onerror = () => {
        if (phase === 'highQuality') {
          setHasError(true);
          setIsLoading(false);
          onError?.();
        }
        reject();
      };
      
      img.src = imageSrc;
    });
  }, [onLoad, onError]);

  const handleLazyLoad = useCallback(async () => {
    try {
      // Load low quality first if available
      if (lowQualitySrc && loadPhase === 'placeholder') {
        await loadImage(lowQualitySrc, 'lowQuality');
      }
      
      // Then load high quality
      if (src) {
        await loadImage(src, 'highQuality');
      }
    } catch (error) {
      console.warn('Image loading failed:', error);
    }
  }, [src, lowQualitySrc, loadPhase, loadImage]);

  // Load immediately if priority
  useEffect(() => {
    if (priority) {
      handleLazyLoad();
    }
  }, [priority, handleLazyLoad]);

  const imageClasses = [
    className,
    'transition-all duration-500',
    loadPhase === 'lowQuality' ? 'blur-sm' : '',
    isLoading ? 'opacity-0' : 'opacity-100'
  ].filter(Boolean).join(' ');

  if (priority) {
    return (
      <div className="relative overflow-hidden" style={{ width, height }}>
        {isLoading && (
          <div className="absolute inset-0 animate-pulse bg-gray-200 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        {hasError ? (
          <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
            <span>Failed to load</span>
          </div>
        ) : (
          <img
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            sizes={sizes}
            className={imageClasses}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>
    );
  }

  return (
    <LazyWrapper onLoad={handleLazyLoad} className="relative overflow-hidden" style={{ width, height }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {isLoading && (
          <div className="absolute inset-0 animate-pulse bg-gray-200 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        {hasError ? (
          <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
            <span>Failed to load</span>
          </div>
        ) : (
          <img
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            sizes={sizes}
            className={imageClasses}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </motion.div>
    </LazyWrapper>
  );
}

// Lazy video component
interface LazyVideoProps {
  src: string;
  poster?: string;
  width?: number;
  height?: number;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyVideo({
  src,
  poster,
  width,
  height,
  className = '',
  autoPlay = false,
  muted = true,
  loop = false,
  controls = true,
  onLoad,
  onError
}: LazyVideoProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLazyLoad = useCallback(() => {
    if (videoRef.current && !isLoaded) {
      const video = videoRef.current;
      
      video.onloadeddata = () => {
        setIsLoaded(true);
        onLoad?.();
      };
      
      video.onerror = () => {
        setHasError(true);
        onError?.();
      };
      
      video.src = src;
      video.load();
    }
  }, [src, isLoaded, onLoad, onError]);

  return (
    <LazyWrapper
      onLoad={handleLazyLoad}
      className="relative overflow-hidden"
      style={{ width, height }}
      fallback={
        <div className="flex items-center justify-center h-full bg-gray-200 animate-pulse">
          <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        </div>
      }
    >
      {hasError ? (
        <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
          <span>Failed to load video</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          width={width}
          height={height}
          className={className}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          controls={controls}
          poster={poster}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </LazyWrapper>
  );
}

// Lazy blockchain data component
interface LazyBlockchainDataProps {
  address?: string;
  tokenId?: string;
  contractAddress?: string;
  children: (data: any, loading: boolean, error: any) => ReactNode;
  onLoad?: (data: any) => void;
  onError?: (error: any) => void;
  refreshInterval?: number;
}

export function LazyBlockchainData({
  address,
  tokenId,
  contractAddress,
  children,
  onLoad,
  onError,
  refreshInterval
}: LazyBlockchainDataProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchBlockchainData = useCallback(async () => {
    if (!address && !contractAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulate blockchain data fetching
      // In real implementation, this would use Web3 providers
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData = {
        address,
        tokenId,
        contractAddress,
        balance: '1.234 ETH',
        transactions: [],
        metadata: {},
        timestamp: Date.now()
      };

      setData(mockData);
      onLoad?.(mockData);
    } catch (err) {
      setError(err);
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [address, tokenId, contractAddress, onLoad, onError]);

  const handleLazyLoad = useCallback(() => {
    fetchBlockchainData();
  }, [fetchBlockchainData]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval && data) {
      const interval = setInterval(fetchBlockchainData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, data, fetchBlockchainData]);

  return (
    <LazyWrapper onLoad={handleLazyLoad}>
      {children(data, isLoading, error)}
    </LazyWrapper>
  );
}

// Lazy content loader with skeleton
interface LazyContentProps {
  children: ReactNode;
  skeleton?: ReactNode;
  delay?: number;
  className?: string;
}

export function LazyContent({
  children,
  skeleton,
  delay = 0,
  className = ''
}: LazyContentProps) {
  const [showContent, setShowContent] = useState(false);

  const handleLazyLoad = useCallback(() => {
    if (delay > 0) {
      setTimeout(() => setShowContent(true), delay);
    } else {
      setShowContent(true);
    }
  }, [delay]);

  const defaultSkeleton = (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );

  return (
    <LazyWrapper onLoad={handleLazyLoad} className={className}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {showContent ? children : (skeleton || defaultSkeleton)}
      </motion.div>
    </LazyWrapper>
  );
}

// Hook for managing lazy loading state
export function useLazyLoading(threshold = 0.1, rootMargin = '50px') {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
        }
      },
      { threshold, rootMargin }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, hasLoaded]);

  return {
    elementRef,
    isVisible,
    hasLoaded
  };
}

export default LazyWrapper;
import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressiveLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
  skeleton?: ReactNode;
  priority?: 'low' | 'normal' | 'high';
  delay?: number;
  timeout?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  enableTransitions?: boolean;
}

interface LoadingState {
  phase: 'idle' | 'loading' | 'loaded' | 'error';
  progress: number;
  error?: Error;
}

export function ProgressiveLoader({
  children,
  fallback,
  skeleton,
  priority = 'normal',
  delay = 0,
  timeout = 10000,
  onLoad,
  onError,
  className = '',
  enableTransitions = true
}: ProgressiveLoaderProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    phase: 'idle',
    progress: 0
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const delayRef = useRef<NodeJS.Timeout>();
  const progressRef = useRef<NodeJS.Timeout>();

  const startLoading = useCallback(() => {
    setLoadingState(prev => ({ ...prev, phase: 'loading', progress: 0 }));

    // Simulate progressive loading with realistic progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15 + 5; // Random progress between 5-20%
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(progressInterval);
        
        setLoadingState(prev => ({ 
          ...prev, 
          phase: 'loaded', 
          progress: 100 
        }));
        
        onLoad?.();
      } else {
        setLoadingState(prev => ({ ...prev, progress }));
      }
    }, 100 + Math.random() * 200); // Variable timing for realism

    progressRef.current = progressInterval as any;

    // Set timeout for loading failure
    timeoutRef.current = setTimeout(() => {
      clearInterval(progressInterval);
      const error = new Error('Loading timeout');
      setLoadingState(prev => ({ 
        ...prev, 
        phase: 'error', 
        error 
      }));
      // Type guard to ensure error is an Error instance
      const errorObj = error instanceof Error ? error : new Error(String(error));
      onError?.(errorObj);
    }, timeout);

  }, [timeout, onLoad, onError]);

  useEffect(() => {
    if (delay > 0) {
      delayRef.current = setTimeout(startLoading, delay);
    } else {
      startLoading();
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (delayRef.current) clearTimeout(delayRef.current);
      if (progressRef.current) clearTimeout(progressRef.current);
    };
  }, [delay, startLoading]);

  const renderContent = () => {
    switch (loadingState.phase) {
      case 'idle':
      case 'loading':
        return skeleton || fallback || <DefaultSkeleton progress={loadingState.progress} />;
      
      case 'loaded':
        return children;
      
      case 'error':
        return <ErrorFallback error={loadingState.error} onRetry={startLoading} />;
      
      default:
        return fallback || <DefaultSkeleton progress={0} />;
    }
  };

  if (!enableTransitions) {
    return <div className={className}>{renderContent()}</div>;
  }

  return (
    <div className={`progressive-loader ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={loadingState.phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ 
            duration: 0.3,
            ease: "easeOut"
          }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Default skeleton component with progress
function DefaultSkeleton({ progress }: { progress: number }) {
  return (
    <div className="animate-pulse space-y-4 p-4">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1 mb-4">
        <motion.div
          className="bg-blue-500 h-1 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      
      {/* Content skeleton */}
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
      
      {/* Loading text */}
      <div className="text-center text-sm text-gray-500 mt-4">
        Loading... {Math.round(progress)}%
      </div>
    </div>
  );
}

// Error fallback component
function ErrorFallback({ error, onRetry }: { error?: Error; onRetry: () => void }) {
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
        {error instanceof Error ? error.message : String(error) || 'Something went wrong while loading this content.'}
      </p>
      
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

// Progressive image loader with blur-to-sharp transition
interface ProgressiveImageProps {
  src: string;
  alt: string;
  lowQualitySrc?: string;
  placeholder?: string;
  width?: number;
  height?: number;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  priority?: boolean;
  quality?: number;
}

export function ProgressiveImage({
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
  quality = 75
}: ProgressiveImageProps) {
  const [loadingState, setLoadingState] = useState<{
    phase: 'placeholder' | 'lowQuality' | 'highQuality' | 'error';
    progress: number;
  }>({
    phase: 'placeholder',
    progress: 0
  });

  const [currentSrc, setCurrentSrc] = useState(placeholder || '');

  const loadImage = useCallback(async (imageSrc: string, phase: 'lowQuality' | 'highQuality') => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        setCurrentSrc(imageSrc);
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
      img.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * (phase === 'highQuality' ? 100 : 50);
          setLoadingState(prev => ({ ...prev, progress }));
        }
      };
      
      img.src = imageSrc;
    });
  }, [onLoad, onError]);

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

  useEffect(() => {
    if (priority) {
      handleLazyLoad();
    }
  }, [priority, handleLazyLoad]);

  const imageClasses = [
    className,
    'transition-all duration-500 ease-out',
    loadingState.phase === 'lowQuality' ? 'blur-sm scale-105' : '',
    loadingState.phase === 'highQuality' ? 'blur-0 scale-100' : '',
    'object-cover w-full h-full'
  ].filter(Boolean).join(' ');

  if (priority) {
    return (
      <div className="relative overflow-hidden" style={{ width, height }}>
        {/* Loading progress */}
        {loadingState.phase !== 'highQuality' && loadingState.phase !== 'error' && (
          <div className="absolute inset-0 bg-gray-200 flex flex-col items-center justify-center">
            <div className="w-full bg-gray-300 rounded-full h-1 mb-2 mx-4">
              <motion.div
                className="bg-blue-500 h-1 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${loadingState.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
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
            className={imageClasses}
            initial={{ opacity: 0 }}
            animate={{ opacity: currentSrc ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </div>
    );
  }

  return (
    <ProgressiveLoader
      onLoad={handleLazyLoad}
      className="relative overflow-hidden"
      skeleton={
        <div className="animate-pulse bg-gray-200 flex items-center justify-center" style={{ width, height }}>
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      }
    >
      <motion.img
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        className={imageClasses}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
    </ProgressiveLoader>
  );
}

// Hook for managing progressive loading state
export function useProgressiveLoading(
  loadFn: () => Promise<any>,
  dependencies: any[] = [],
  options: {
    delay?: number;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
  } = {}
) {
  const [state, setState] = useState<LoadingState>({
    phase: 'idle',
    progress: 0
  });

  const [retryCount, setRetryCount] = useState(0);
  const { delay = 0, timeout = 10000, retryCount: maxRetries = 3, retryDelay = 1000 } = options;

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, phase: 'loading', progress: 0 }));

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 20, 90)
        }));
      }, 200);

      const result = await Promise.race([
        loadFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);

      clearInterval(progressInterval);
      setState(prev => ({ ...prev, phase: 'loaded', progress: 100 }));
      setRetryCount(0);
      
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        phase: 'error', 
        error: error as Error 
      }));
      throw error;
    }
  }, [loadFn, timeout]);

  const retry = useCallback(async () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      
      // Exponential backoff
      const backoffDelay = retryDelay * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      return load();
    }
    throw new Error('Max retries exceeded');
  }, [retryCount, maxRetries, retryDelay, load]);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(load, delay);
      return () => clearTimeout(timer);
    } else {
      load();
    }
  }, dependencies);

  return {
    ...state,
    retry,
    canRetry: retryCount < maxRetries
  };
}

export default ProgressiveLoader;
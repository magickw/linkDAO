import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

interface MobileLazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  className?: string;
}

export const MobileLazyLoader: React.FC<MobileLazyLoaderProps> = ({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Skip if already triggered and triggerOnce is true
    if (triggerOnce && hasTriggered) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasTriggered(true);
          
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
    </div>
  );

  return (
    <div ref={elementRef} className={className}>
      {isVisible ? (
        <Suspense fallback={fallback || defaultFallback}>
          {children}
        </Suspense>
      ) : (
        fallback || defaultFallback
      )}
    </div>
  );
};

// Higher-order component for lazy loading
export function withMobileLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ReactNode;
    threshold?: number;
    rootMargin?: string;
  }
) {
  return function LazyLoadedComponent(props: P) {
    return (
      <MobileLazyLoader {...options}>
        <Component {...props} />
      </MobileLazyLoader>
    );
  };
}

// Lazy loading for chart components
export const LazyChartLoader: React.FC<{
  chartType: string;
  data: any;
  options?: any;
}> = ({ chartType, data, options }) => {
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChart = async () => {
      try {
        setLoading(true);
        setError(null);

        let component;
        switch (chartType) {
          case 'line':
            const { LineChart } = await import('../../Visualizations/LineChart');
            component = LineChart;
            break;
          case 'bar':
            const { BarChart } = await import('../../Visualizations/BarChart');
            component = BarChart;
            break;
          case 'pie':
            const { PieChart } = await import('../../Visualizations/PieChart');
            component = PieChart;
            break;
          case 'heatmap':
            const { HeatmapChart } = await import('../../Visualizations/HeatmapChart');
            component = HeatmapChart;
            break;
          default:
            throw new Error(`Unknown chart type: ${chartType}`);
        }

        setChartComponent(() => component);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chart');
      } finally {
        setLoading(false);
      }
    };

    loadChart();
  }, [chartType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white/5 rounded-lg">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
          <p className="text-white/70 text-sm">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 bg-red-500/10 rounded-lg border border-red-500/20">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">Failed to load chart</p>
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!ChartComponent) {
    return (
      <div className="flex items-center justify-center p-8 bg-white/5 rounded-lg">
        <p className="text-white/50 text-sm">Chart component not available</p>
      </div>
    );
  }

  return <ChartComponent data={data} options={options} />;
};

// Image lazy loading with progressive enhancement
export const LazyImage: React.FC<{
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}> = ({ src, alt, placeholder, className = '', onLoad, onError }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(img);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(img);

    return () => {
      observer.unobserve(img);
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
          {placeholder ? (
            <img src={placeholder} alt="" className="w-full h-full object-cover opacity-50" />
          ) : (
            <div className="w-8 h-8 bg-white/10 rounded"></div>
          )}
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
          <p className="text-red-400 text-sm">Failed to load image</p>
        </div>
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={isVisible ? src : undefined}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
      />
    </div>
  );
};
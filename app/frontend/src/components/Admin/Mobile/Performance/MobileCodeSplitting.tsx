import React, { lazy, Suspense } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

// Loading fallback component
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
      <p className="text-white/70 text-sm">{message}</p>
    </div>
  </div>
);

// Error boundary for lazy-loaded components
class LazyLoadErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy load error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center p-8 bg-red-500/10 rounded-lg border border-red-500/20">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-400 text-sm mb-1">Failed to load component</p>
            <p className="text-red-300 text-xs">{this.state.error?.message}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy-loaded admin components
export const LazyModerationQueue = lazy(() => 
  import('../MobileModerationQueue').then(module => ({ default: module.MobileModerationQueue }))
);

export const LazyUserManagement = lazy(() => 
  import('../MobileUserManagement').then(module => ({ default: module.MobileUserManagement }))
);

export const LazyAnalytics = lazy(() => 
  import('../MobileAnalytics').then(module => ({ default: module.MobileAnalytics }))
);

export const LazySellerApplications = lazy(() => 
  import('../MobileSellerApplications').then(module => ({ default: module.MobileSellerApplications }))
);

export const LazyDisputeResolution = lazy(() => 
  import('../MobileDisputeResolution').then(module => ({ default: module.MobileDisputeResolution }))
);

export const LazyModerationHistory = lazy(() => 
  import('../MobileModerationHistory').then(module => ({ default: module.MobileModerationHistory }))
);

export const LazyNotificationHistory = lazy(() => 
  import('../Notifications/NotificationHistory').then(module => ({ default: module.NotificationHistory }))
);

// Lazy-loaded visualization components
export const LazyLineChart = lazy(() => 
  import('../../Visualizations/LineChart').then(module => ({ default: module.LineChart }))
);

export const LazyBarChart = lazy(() => 
  import('../../Visualizations/BarChart').then(module => ({ default: module.BarChart }))
);

export const LazyPieChart = lazy(() => 
  import('../../Visualizations/PieChart').then(module => ({ default: module.PieChart }))
);

export const LazyHeatmapChart = lazy(() => 
  import('../../Visualizations/HeatmapChart').then(module => ({ default: module.HeatmapChart }))
);

// Higher-order component for wrapping lazy components
export function withLazyLoading<P extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>,
  options?: {
    fallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
    loadingMessage?: string;
  }
) {
  return function WrappedLazyComponent(props: P) {
    const fallback = options?.fallback || <LoadingFallback message={options?.loadingMessage} />;
    
    return (
      <LazyLoadErrorBoundary fallback={options?.errorFallback}>
        <Suspense fallback={fallback}>
          <LazyComponent {...props} />
        </Suspense>
      </LazyLoadErrorBoundary>
    );
  };
}

// Preload function for critical components
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used soon
  const criticalComponents = [
    () => import('../MobileModerationQueue'),
    () => import('../MobileAnalytics'),
    () => import('../../Visualizations/LineChart'),
    () => import('../../Visualizations/BarChart')
  ];

  criticalComponents.forEach(importFn => {
    // Use requestIdleCallback if available, otherwise use setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => importFn().catch(() => {}));
    } else {
      setTimeout(() => importFn().catch(() => {}), 100);
    }
  });
};

// Dynamic import helper with retry logic
export const dynamicImport = async <T>(
  importFn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await importFn();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw new Error('Dynamic import failed after retries');
};

// Component registry for dynamic loading
interface ComponentRegistry {
  [key: string]: () => Promise<{ default: React.ComponentType<any> }>;
}

const componentRegistry: ComponentRegistry = {
  'moderation-queue': () => import('../MobileModerationQueue'),
  'user-management': () => import('../MobileUserManagement'),
  'analytics': () => import('../MobileAnalytics'),
  'seller-applications': () => import('../MobileSellerApplications'),
  'dispute-resolution': () => import('../MobileDisputeResolution'),
  'moderation-history': () => import('../MobileModerationHistory'),
  'notification-history': () => import('../Notifications/NotificationHistory'),
  'line-chart': () => import('../../Visualizations/LineChart'),
  'bar-chart': () => import('../../Visualizations/BarChart'),
  'pie-chart': () => import('../../Visualizations/PieChart'),
  'heatmap-chart': () => import('../../Visualizations/HeatmapChart')
};

// Dynamic component loader
export const DynamicComponentLoader: React.FC<{
  componentKey: string;
  props?: any;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}> = ({ componentKey, props = {}, fallback, errorFallback }) => {
  const [Component, setComponent] = React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadComponent = async () => {
      try {
        setLoading(true);
        setError(null);

        const importFn = componentRegistry[componentKey];
        if (!importFn) {
          throw new Error(`Component "${componentKey}" not found in registry`);
        }

        const module = await dynamicImport(importFn);
        setComponent(() => module.default);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load component');
      } finally {
        setLoading(false);
      }
    };

    loadComponent();
  }, [componentKey]);

  if (loading) {
    return fallback || <LoadingFallback message={`Loading ${componentKey}...`} />;
  }

  if (error) {
    return errorFallback || (
      <div className="flex items-center justify-center p-8 bg-red-500/10 rounded-lg border border-red-500/20">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm mb-1">Failed to load {componentKey}</p>
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!Component) {
    return errorFallback || (
      <div className="flex items-center justify-center p-8">
        <p className="text-white/50 text-sm">Component not available</p>
      </div>
    );
  }

  return <Component {...props} />;
};

// Bundle analyzer helper (development only)
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis available in development mode');
    // Add bundle analysis logic here
  }
};
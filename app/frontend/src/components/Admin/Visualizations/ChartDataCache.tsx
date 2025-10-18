import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface ChartDataCacheContextType {
  get: (key: string) => any | null;
  set: (key: string, data: any, ttl?: number) => void;
  invalidate: (key: string) => void;
  clear: () => void;
  getStats: () => CacheStats;
  preload: (key: string, dataLoader: () => Promise<any>, ttl?: number) => Promise<void>;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

const ChartDataCacheContext = createContext<ChartDataCacheContextType | undefined>(undefined);

interface ChartDataCacheProviderProps {
  children: ReactNode;
  maxSize?: number;
  defaultTTL?: number;
}

export const ChartDataCacheProvider: React.FC<ChartDataCacheProviderProps> = ({
  children,
  maxSize = 100,
  defaultTTL = 5 * 60 * 1000, // 5 minutes
}) => {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const statsRef = useRef({ hits: 0, misses: 0 });
  const [, forceUpdate] = useState({});

  // Cleanup expired entries
  const cleanup = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;
    
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        cache.delete(key);
      }
    }

    // Enforce max size by removing oldest entries
    if (cache.size > maxSize) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, cache.size - maxSize);
      toRemove.forEach(([key]) => cache.delete(key));
    }
  }, [maxSize]);

  const get = useCallback((key: string) => {
    const cache = cacheRef.current;
    const entry = cache.get(key);
    
    if (!entry) {
      statsRef.current.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
      statsRef.current.misses++;
      return null;
    }

    entry.hits++;
    statsRef.current.hits++;
    return entry.data;
  }, []);

  const set = useCallback((key: string, data: any, ttl: number = defaultTTL) => {
    const cache = cacheRef.current;
    
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });

    cleanup();
    forceUpdate({});
  }, [defaultTTL, cleanup]);

  const invalidate = useCallback((key: string) => {
    cacheRef.current.delete(key);
    forceUpdate({});
  }, []);

  const clear = useCallback(() => {
    cacheRef.current.clear();
    statsRef.current = { hits: 0, misses: 0 };
    forceUpdate({});
  }, []);

  const getStats = useCallback((): CacheStats => {
    const { hits, misses } = statsRef.current;
    const total = hits + misses;
    
    return {
      size: cacheRef.current.size,
      hits,
      misses,
      hitRate: total > 0 ? (hits / total) * 100 : 0,
    };
  }, []);

  const preload = useCallback(async (key: string, dataLoader: () => Promise<any>, ttl: number = defaultTTL) => {
    try {
      const data = await dataLoader();
      set(key, data, ttl);
    } catch (error) {
      console.error(`Failed to preload data for key ${key}:`, error);
    }
  }, [set, defaultTTL]);

  const contextValue: ChartDataCacheContextType = {
    get,
    set,
    invalidate,
    clear,
    getStats,
    preload,
  };

  return (
    <ChartDataCacheContext.Provider value={contextValue}>
      {children}
    </ChartDataCacheContext.Provider>
  );
};

export const useChartDataCache = () => {
  const context = useContext(ChartDataCacheContext);
  if (context === undefined) {
    throw new Error('useChartDataCache must be used within a ChartDataCacheProvider');
  }
  return context;
};

// Hook for individual charts to use caching
export const useCachedChartData = (
  key: string,
  dataLoader: () => Promise<any>,
  dependencies: any[] = [],
  ttl?: number
) => {
  const cache = useChartDataCache();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      if (!forceRefresh) {
        const cachedData = cache.get(key);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return cachedData;
        }
      }

      // Load fresh data
      const freshData = await dataLoader();
      cache.set(key, freshData, ttl);
      setData(freshData);
      return freshData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load data');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [key, dataLoader, cache, ttl]);

  // Load data when dependencies change
  React.useEffect(() => {
    loadData();
  }, [loadData, ...dependencies]);

  const refresh = useCallback(() => loadData(true), [loadData]);
  const invalidate = useCallback(() => cache.invalidate(key), [cache, key]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
  };
};

// Performance monitoring hook
export const useChartPerformance = (chartId: string) => {
  const renderTimesRef = useRef<number[]>([]);
  const [metrics, setMetrics] = useState({
    averageRenderTime: 0,
    lastRenderTime: 0,
    renderCount: 0,
  });

  const startRender = useCallback(() => {
    return performance.now();
  }, []);

  const endRender = useCallback((startTime: number) => {
    const renderTime = performance.now() - startTime;
    renderTimesRef.current.push(renderTime);

    // Keep only last 50 render times
    if (renderTimesRef.current.length > 50) {
      renderTimesRef.current = renderTimesRef.current.slice(-50);
    }

    const averageRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length;

    setMetrics({
      averageRenderTime,
      lastRenderTime: renderTime,
      renderCount: renderTimesRef.current.length,
    });

    // Log performance warnings
    if (renderTime > 100) {
      console.warn(`Chart ${chartId} render took ${renderTime.toFixed(2)}ms`);
    }
  }, [chartId]);

  return {
    metrics,
    startRender,
    endRender,
  };
};

// Data transformation utilities
export const useChartDataTransformer = () => {
  const transformTimeSeriesData = useCallback((rawData: any[], timeField: string, valueField: string) => {
    return rawData.map(item => ({
      x: new Date(item[timeField]).toISOString(),
      y: item[valueField],
    }));
  }, []);

  const aggregateData = useCallback((data: any[], groupBy: string, aggregateField: string, aggregateFunction: 'sum' | 'avg' | 'count' = 'sum') => {
    const groups = data.reduce((acc, item) => {
      const key = item[groupBy];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(groups).map(([key, items]) => {
      let value: number;
      const typedItems = items as any[];
      
      switch (aggregateFunction) {
        case 'sum':
          value = typedItems.reduce((sum, item) => sum + (item[aggregateField] || 0), 0);
          break;
        case 'avg':
          value = typedItems.reduce((sum, item) => sum + (item[aggregateField] || 0), 0) / typedItems.length;
          break;
        case 'count':
          value = typedItems.length;
          break;
        default:
          value = 0;
      }

      return { label: key, value };
    });
  }, []);

  const normalizeData = useCallback((data: number[], min?: number, max?: number) => {
    const dataMin = min ?? Math.min(...data);
    const dataMax = max ?? Math.max(...data);
    const range = dataMax - dataMin;
    
    if (range === 0) return data.map(() => 0);
    
    return data.map(value => (value - dataMin) / range);
  }, []);

  return {
    transformTimeSeriesData,
    aggregateData,
    normalizeData,
  };
};
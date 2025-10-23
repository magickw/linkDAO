import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createSellerCacheManager, SellerCacheManager } from '../services/sellerCacheManager';

// Conditionally import devtools only in development
let ReactQueryDevtools: any = null;
if (process.env.NODE_ENV === 'development') {
  try {
    // Use dynamic import for devtools to avoid including them in production bundle
    import('@tanstack/react-query-devtools').then((devtools) => {
      ReactQueryDevtools = devtools.ReactQueryDevtools;
    }).catch((error) => {
      console.warn('React Query Devtools failed to load:', error);
    });
  } catch (error) {
    console.warn('React Query Devtools not available');
  }
}

// Create context for seller cache manager
const SellerCacheContext = createContext<SellerCacheManager | null>(null);

// Custom hook to use seller cache manager
export const useSellerCacheContext = () => {
  const context = useContext(SellerCacheContext);
  if (!context) {
    throw new Error('useSellerCacheContext must be used within a SellerQueryProvider');
  }
  return context;
};

interface SellerQueryProviderProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

// Create a default query client with seller-optimized settings
const createDefaultQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Seller data specific defaults
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        retry: (failureCount, error: any) => {
          // Don't retry on 404s (seller not found)
          if (error?.status === 404) return false;
          // Don't retry on 403s (permission denied)
          if (error?.status === 403) return false;
          // Retry up to 2 times for other errors
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false, // Disable refetch on window focus for seller data
        refetchOnReconnect: true, // Refetch when network reconnects
      },
      mutations: {
        retry: 1, // Retry mutations once
        retryDelay: 1000,
      },
    },
  });
};

/**
 * Provider component that sets up React Query with seller cache management
 */
export const SellerQueryProvider: React.FC<SellerQueryProviderProps> = ({
  children,
  queryClient: providedQueryClient,
}) => {
  // Use provided query client or create default one
  const queryClient = providedQueryClient || createDefaultQueryClient();
  
  // Create seller cache manager
  const sellerCacheManager = createSellerCacheManager(queryClient);
  
  // State for React Query Devtools component
  const [DevtoolsComponent, setDevtoolsComponent] = useState<any>(null);

  useEffect(() => {
    // Setup global error handling for seller queries
    const handleQueryError = (error: any, query: any) => {
      const queryKey = query.queryKey;
      
      // Check if this is a seller query
      if (Array.isArray(queryKey) && queryKey[0] === 'seller') {
        console.error(`[SellerQueryProvider] Query error for ${queryKey.join('.')}:`, error);
        
        // Handle specific error types
        if (error?.status === 503) {
          console.warn('[SellerQueryProvider] Service unavailable, will retry later');
        } else if (error?.status === 429) {
          console.warn('[SellerQueryProvider] Rate limited, backing off');
        }
      }
    };

    // Setup global success handling for seller queries
    const handleQuerySuccess = (data: any, query: any) => {
      const queryKey = query.queryKey;
      
      // Check if this is a seller query
      if (Array.isArray(queryKey) && queryKey[0] === 'seller') {
        console.debug(`[SellerQueryProvider] Query success for ${queryKey.join('.')}`);
      }
    };

    // Add global query cache listeners
    const unsubscribeError = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'observerResultsUpdated' && event.query.state.error) {
        handleQueryError(event.query.state.error, event.query);
      }
    });

    const unsubscribeSuccess = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'observerResultsUpdated' && event.query.state.data) {
        handleQuerySuccess(event.query.state.data, event.query);
      }
    });

    // Setup periodic cache cleanup
    const cleanupInterval = setInterval(() => {
      // Remove stale queries older than 30 minutes
      queryClient.getQueryCache().findAll({
        predicate: (query) => {
          const isSellerQuery = Array.isArray(query.queryKey) && query.queryKey[0] === 'seller';
          const isStale = query.state.dataUpdatedAt && 
                         Date.now() - query.state.dataUpdatedAt > 30 * 60 * 1000;
          return Boolean(isSellerQuery && isStale && query.getObserversCount() === 0);
        }
      }).forEach(query => {
        queryClient.removeQueries({ queryKey: query.queryKey });
      });
    }, 10 * 60 * 1000); // Run every 10 minutes

    // Cleanup function
    return () => {
      unsubscribeError();
      unsubscribeSuccess();
      clearInterval(cleanupInterval);
      sellerCacheManager.cleanup();
    };
  }, [queryClient, sellerCacheManager]);

  // Setup cache warming on mount
  useEffect(() => {
    // Warm cache for common seller data when provider mounts
    const warmCommonCache = async () => {
      try {
        // This could be enhanced to warm cache for recently active sellers
        console.debug('[SellerQueryProvider] Provider initialized with cache warming capability');
      } catch (error) {
        console.warn('[SellerQueryProvider] Cache warming failed:', error);
      }
    };

    warmCommonCache();
  }, [sellerCacheManager]);
  
  // Load devtools in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@tanstack/react-query-devtools')
        .then((devtools) => {
          setDevtoolsComponent(() => devtools.ReactQueryDevtools);
        })
        .catch((error) => {
          console.warn('React Query Devtools failed to load:', error);
        });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SellerCacheContext.Provider value={sellerCacheManager}>
        {children}
        {/* Show React Query DevTools in development */}
        {process.env.NODE_ENV === 'development' && DevtoolsComponent && (
          <DevtoolsComponent 
            initialIsOpen={false}
            position="bottom-right"
            toggleButtonProps={{
              style: {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 99999,
              }
            }}
          />
        )}
      </SellerCacheContext.Provider>
    </QueryClientProvider>
  );
};

/**
 * Hook to get cache statistics and management functions
 */
export const useSellerCacheStats = () => {
  const cacheManager = useSellerCacheContext();
  const [stats, setStats] = React.useState(cacheManager.getCacheStats());

  useEffect(() => {
    const updateStats = () => {
      setStats(cacheManager.getCacheStats());
    };

    // Update stats every 30 seconds
    const interval = setInterval(updateStats, 30000);
    
    // Update stats immediately
    updateStats();

    return () => clearInterval(interval);
  }, [cacheManager]);

  return {
    stats,
    refreshStats: () => setStats(cacheManager.getCacheStats()),
    cacheManager,
  };
};

/**
 * Hook for debugging seller cache
 */
export const useSellerCacheDebug = () => {
  const cacheManager = useSellerCacheContext();

  const debugCache = React.useCallback((walletAddress?: string) => {
    const stats = cacheManager.getCacheStats();
    
    console.group('[SellerCacheDebug] Cache Statistics');
    console.log('Total Entries:', stats.totalEntries);
    console.log('Queue Size:', stats.queueSize);
    console.log('Dependencies:', stats.dependencies);
    console.log('Metadata:', stats.metadata);
    
    if (walletAddress) {
      const walletMetadata = stats.metadata.filter(m => m.walletAddress === walletAddress);
      console.log(`Metadata for ${walletAddress}:`, walletMetadata);
    }
    
    console.groupEnd();
    
    return stats;
  }, [cacheManager]);

  const clearDebugCache = React.useCallback(async (walletAddress?: string) => {
    if (walletAddress) {
      await cacheManager.clearSellerCache(walletAddress);
      console.log(`[SellerCacheDebug] Cleared cache for ${walletAddress}`);
    } else {
      // Clear all seller caches
      const stats = cacheManager.getCacheStats();
      const walletAddresses = [...new Set(stats.metadata.map(m => m.walletAddress))];
      
      for (const address of walletAddresses) {
        await cacheManager.clearSellerCache(address);
      }
      
      console.log(`[SellerCacheDebug] Cleared cache for ${walletAddresses.length} wallets`);
    }
  }, [cacheManager]);

  const warmDebugCache = React.useCallback(async (walletAddress: string, dataTypes?: string[]) => {
    await cacheManager.warmCache(walletAddress, dataTypes);
    console.log(`[SellerCacheDebug] Warmed cache for ${walletAddress}`, dataTypes);
  }, [cacheManager]);

  return {
    debugCache,
    clearDebugCache,
    warmDebugCache,
    cacheManager,
  };
};

export default SellerQueryProvider;
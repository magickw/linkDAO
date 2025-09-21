import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import {
  PerformanceState,
  VirtualScrollState,
  CacheState,
  PreloaderState,
  PerformanceMetrics,
  OptimizationSettings,
  CachedPost,
  CachedUser,
  CachedCommunity,
  CachedMedia
} from './types';

// Action Types
type PerformanceAction =
  | { type: 'UPDATE_VIRTUAL_SCROLL'; payload: Partial<VirtualScrollState> }
  | { type: 'SET_SCROLL_POSITION'; payload: { scrollTop: number; isScrolling: boolean } }
  | { type: 'UPDATE_VISIBLE_RANGE'; payload: [number, number] }
  | { type: 'CACHE_POST'; payload: { id: string; data: any; ttl?: number } }
  | { type: 'CACHE_USER'; payload: { id: string; data: any; ttl?: number } }
  | { type: 'CACHE_COMMUNITY'; payload: { id: string; data: any; ttl?: number } }
  | { type: 'CACHE_MEDIA'; payload: { url: string; blob: Blob; ttl?: number } }
  | { type: 'INVALIDATE_CACHE'; payload: { type: 'post' | 'user' | 'community' | 'media'; id: string } }
  | { type: 'CLEAR_CACHE'; payload?: 'post' | 'user' | 'community' | 'media' }
  | { type: 'UPDATE_CACHE_STATS'; payload: { hitRate: number; size: number } }
  | { type: 'SET_PRELOADER_STATE'; payload: Partial<PreloaderState> }
  | { type: 'UPDATE_METRICS'; payload: Partial<PerformanceMetrics> }
  | { type: 'UPDATE_OPTIMIZATIONS'; payload: Partial<OptimizationSettings> }
  | { type: 'CLEANUP_EXPIRED_CACHE' }
  | { type: 'BATCH_CACHE_UPDATE'; payload: { posts?: any[]; users?: any[]; communities?: any[] } };

// Initial State
const initialState: PerformanceState = {
  virtualScrolling: {
    itemHeight: 200,
    bufferSize: 5,
    visibleRange: [0, 10],
    totalItems: 0,
    scrollTop: 0,
    isScrolling: false,
  },
  cache: {
    posts: new Map(),
    users: new Map(),
    communities: new Map(),
    media: new Map(),
    size: 0,
    maxSize: 100 * 1024 * 1024, // 100MB
    hitRate: 0,
  },
  preloader: {
    isActive: false,
    queue: [],
    currentlyLoading: [],
    maxConcurrent: 3,
    strategy: 'predictive',
  },
  metrics: {
    renderTime: 0,
    scrollPerformance: 60,
    cacheHitRate: 0,
    memoryUsage: 0,
    networkLatency: 0,
    errorRate: 0,
  },
  optimizations: {
    virtualScrollEnabled: true,
    lazyLoadingEnabled: true,
    preloadingEnabled: true,
    cacheEnabled: true,
    compressionEnabled: true,
    batchUpdatesEnabled: true,
  },
};

// Reducer
function performanceReducer(state: PerformanceState, action: PerformanceAction): PerformanceState {
  switch (action.type) {
    case 'UPDATE_VIRTUAL_SCROLL': {
      return {
        ...state,
        virtualScrolling: {
          ...state.virtualScrolling,
          ...action.payload,
        },
      };
    }

    case 'SET_SCROLL_POSITION': {
      const { scrollTop, isScrolling } = action.payload;
      const { itemHeight, bufferSize, totalItems } = state.virtualScrolling;
      
      // Calculate visible range
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
      const endIndex = Math.min(
        totalItems - 1,
        Math.ceil((scrollTop + window.innerHeight) / itemHeight) + bufferSize
      );

      return {
        ...state,
        virtualScrolling: {
          ...state.virtualScrolling,
          scrollTop,
          isScrolling,
          visibleRange: [startIndex, endIndex],
        },
      };
    }

    case 'UPDATE_VISIBLE_RANGE': {
      return {
        ...state,
        virtualScrolling: {
          ...state.virtualScrolling,
          visibleRange: action.payload,
        },
      };
    }

    case 'CACHE_POST': {
      const { id, data, ttl = 300000 } = action.payload; // Default 5 minutes TTL
      const cachedPost: CachedPost = {
        data,
        timestamp: new Date(),
        ttl,
        accessCount: 1,
        lastAccessed: new Date(),
      };

      const newPosts = new Map(state.cache.posts);
      newPosts.set(id, cachedPost);

      const newSize = calculateCacheSize(newPosts, state.cache.users, state.cache.communities, state.cache.media);

      return {
        ...state,
        cache: {
          ...state.cache,
          posts: newPosts,
          size: newSize,
        },
      };
    }

    case 'CACHE_USER': {
      const { id, data, ttl = 600000 } = action.payload; // Default 10 minutes TTL
      const cachedUser: CachedUser = {
        data,
        timestamp: new Date(),
        ttl,
        accessCount: 1,
        lastAccessed: new Date(),
      };

      const newUsers = new Map(state.cache.users);
      newUsers.set(id, cachedUser);

      const newSize = calculateCacheSize(state.cache.posts, newUsers, state.cache.communities, state.cache.media);

      return {
        ...state,
        cache: {
          ...state.cache,
          users: newUsers,
          size: newSize,
        },
      };
    }

    case 'CACHE_COMMUNITY': {
      const { id, data, ttl = 900000 } = action.payload; // Default 15 minutes TTL
      const cachedCommunity: CachedCommunity = {
        data,
        timestamp: new Date(),
        ttl,
        accessCount: 1,
        lastAccessed: new Date(),
      };

      const newCommunities = new Map(state.cache.communities);
      newCommunities.set(id, cachedCommunity);

      const newSize = calculateCacheSize(state.cache.posts, state.cache.users, newCommunities, state.cache.media);

      return {
        ...state,
        cache: {
          ...state.cache,
          communities: newCommunities,
          size: newSize,
        },
      };
    }

    case 'CACHE_MEDIA': {
      const { url, blob, ttl = 1800000 } = action.payload; // Default 30 minutes TTL
      const cachedMedia: CachedMedia = {
        url,
        blob,
        timestamp: new Date(),
        ttl,
        accessCount: 1,
        lastAccessed: new Date(),
      };

      const newMedia = new Map(state.cache.media);
      newMedia.set(url, cachedMedia);

      const newSize = calculateCacheSize(state.cache.posts, state.cache.users, state.cache.communities, newMedia);

      return {
        ...state,
        cache: {
          ...state.cache,
          media: newMedia,
          size: newSize,
        },
      };
    }

    case 'INVALIDATE_CACHE': {
      const { type, id } = action.payload;
      let newCache = { ...state.cache };

      switch (type) {
        case 'post':
          newCache.posts = new Map(state.cache.posts);
          newCache.posts.delete(id);
          break;
        case 'user':
          newCache.users = new Map(state.cache.users);
          newCache.users.delete(id);
          break;
        case 'community':
          newCache.communities = new Map(state.cache.communities);
          newCache.communities.delete(id);
          break;
        case 'media':
          newCache.media = new Map(state.cache.media);
          newCache.media.delete(id);
          break;
      }

      newCache.size = calculateCacheSize(newCache.posts, newCache.users, newCache.communities, newCache.media);

      return {
        ...state,
        cache: newCache,
      };
    }

    case 'CLEAR_CACHE': {
      const cacheType = action.payload;
      let newCache = { ...state.cache };

      if (!cacheType) {
        // Clear all caches
        newCache = {
          posts: new Map(),
          users: new Map(),
          communities: new Map(),
          media: new Map(),
          size: 0,
          maxSize: state.cache.maxSize,
          hitRate: 0,
        };
      } else {
        switch (cacheType) {
          case 'post':
            newCache.posts = new Map();
            break;
          case 'user':
            newCache.users = new Map();
            break;
          case 'community':
            newCache.communities = new Map();
            break;
          case 'media':
            newCache.media = new Map();
            break;
        }
        newCache.size = calculateCacheSize(newCache.posts, newCache.users, newCache.communities, newCache.media);
      }

      return {
        ...state,
        cache: newCache,
      };
    }

    case 'UPDATE_CACHE_STATS': {
      return {
        ...state,
        cache: {
          ...state.cache,
          hitRate: action.payload.hitRate,
          size: action.payload.size,
        },
      };
    }

    case 'SET_PRELOADER_STATE': {
      return {
        ...state,
        preloader: {
          ...state.preloader,
          ...action.payload,
        },
      };
    }

    case 'UPDATE_METRICS': {
      return {
        ...state,
        metrics: {
          ...state.metrics,
          ...action.payload,
        },
      };
    }

    case 'UPDATE_OPTIMIZATIONS': {
      return {
        ...state,
        optimizations: {
          ...state.optimizations,
          ...action.payload,
        },
      };
    }

    case 'CLEANUP_EXPIRED_CACHE': {
      const now = new Date();
      const newPosts = new Map(state.cache.posts);
      const newUsers = new Map(state.cache.users);
      const newCommunities = new Map(state.cache.communities);
      const newMedia = new Map(state.cache.media);

      // Clean expired posts
      newPosts.forEach((cached, id) => {
        if (now.getTime() - cached.timestamp.getTime() > cached.ttl) {
          newPosts.delete(id);
        }
      });

      // Clean expired users
      newUsers.forEach((cached, id) => {
        if (now.getTime() - cached.timestamp.getTime() > cached.ttl) {
          newUsers.delete(id);
        }
      });

      // Clean expired communities
      newCommunities.forEach((cached, id) => {
        if (now.getTime() - cached.timestamp.getTime() > cached.ttl) {
          newCommunities.delete(id);
        }
      });

      // Clean expired media
      newMedia.forEach((cached, url) => {
        if (now.getTime() - cached.timestamp.getTime() > cached.ttl) {
          newMedia.delete(url);
        }
      });

      const newSize = calculateCacheSize(newPosts, newUsers, newCommunities, newMedia);

      return {
        ...state,
        cache: {
          ...state.cache,
          posts: newPosts,
          users: newUsers,
          communities: newCommunities,
          media: newMedia,
          size: newSize,
        },
      };
    }

    case 'BATCH_CACHE_UPDATE': {
      const { posts, users, communities } = action.payload;
      let newCache = { ...state.cache };

      if (posts) {
        const newPosts = new Map(state.cache.posts);
        posts.forEach((post) => {
          const cachedPost: CachedPost = {
            data: post,
            timestamp: new Date(),
            ttl: 300000,
            accessCount: 1,
            lastAccessed: new Date(),
          };
          newPosts.set(post.id, cachedPost);
        });
        newCache.posts = newPosts;
      }

      if (users) {
        const newUsers = new Map(state.cache.users);
        users.forEach((user) => {
          const cachedUser: CachedUser = {
            data: user,
            timestamp: new Date(),
            ttl: 600000,
            accessCount: 1,
            lastAccessed: new Date(),
          };
          newUsers.set(user.id, cachedUser);
        });
        newCache.users = newUsers;
      }

      if (communities) {
        const newCommunities = new Map(state.cache.communities);
        communities.forEach((community) => {
          const cachedCommunity: CachedCommunity = {
            data: community,
            timestamp: new Date(),
            ttl: 900000,
            accessCount: 1,
            lastAccessed: new Date(),
          };
          newCommunities.set(community.id, cachedCommunity);
        });
        newCache.communities = newCommunities;
      }

      newCache.size = calculateCacheSize(newCache.posts, newCache.users, newCache.communities, newCache.media);

      return {
        ...state,
        cache: newCache,
      };
    }

    default:
      return state;
  }
}

// Helper Functions
function calculateCacheSize(
  posts: Map<string, CachedPost>,
  users: Map<string, CachedUser>,
  communities: Map<string, CachedCommunity>,
  media: Map<string, CachedMedia>
): number {
  let size = 0;
  
  // Rough estimation of cache size
  posts.forEach((cached) => {
    size += JSON.stringify(cached.data).length * 2; // UTF-16 encoding
  });
  
  users.forEach((cached) => {
    size += JSON.stringify(cached.data).length * 2;
  });
  
  communities.forEach((cached) => {
    size += JSON.stringify(cached.data).length * 2;
  });
  
  media.forEach((cached) => {
    size += cached.blob.size;
  });
  
  return size;
}

// Context
interface PerformanceContextType {
  state: PerformanceState;
  updateVirtualScroll: (updates: Partial<VirtualScrollState>) => void;
  setScrollPosition: (scrollTop: number, isScrolling: boolean) => void;
  updateVisibleRange: (range: [number, number]) => void;
  cachePost: (id: string, data: any, ttl?: number) => void;
  cacheUser: (id: string, data: any, ttl?: number) => void;
  cacheCommunity: (id: string, data: any, ttl?: number) => void;
  cacheMedia: (url: string, blob: Blob, ttl?: number) => void;
  getCachedPost: (id: string) => any | null;
  getCachedUser: (id: string) => any | null;
  getCachedCommunity: (id: string) => any | null;
  getCachedMedia: (url: string) => Blob | null;
  invalidateCache: (type: 'post' | 'user' | 'community' | 'media', id: string) => void;
  clearCache: (type?: 'post' | 'user' | 'community' | 'media') => void;
  updateMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  updateOptimizations: (settings: Partial<OptimizationSettings>) => void;
  measureRenderTime: (callback: () => void) => void;
  preloadContent: (urls: string[]) => Promise<void>;
  getVisibleItems: () => [number, number];
  getCacheStats: () => { hitRate: number; size: number; itemCount: number };
  isItemVisible: (index: number) => boolean;
  optimizeMemoryUsage: () => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

// Provider
interface PerformanceProviderProps {
  children: React.ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  const [state, dispatch] = useReducer(performanceReducer, initialState);
  const metricsRef = useRef<{ hits: number; misses: number }>({ hits: 0, misses: 0 });

  // Cleanup expired cache periodically
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'CLEANUP_EXPIRED_CACHE' });
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  // Update cache hit rate
  useEffect(() => {
    const total = metricsRef.current.hits + metricsRef.current.misses;
    const hitRate = total > 0 ? metricsRef.current.hits / total : 0;
    
    dispatch({ 
      type: 'UPDATE_CACHE_STATS', 
      payload: { hitRate, size: state.cache.size } 
    });
  }, [state.cache.size]);

  const updateVirtualScroll = useCallback((updates: Partial<VirtualScrollState>) => {
    dispatch({ type: 'UPDATE_VIRTUAL_SCROLL', payload: updates });
  }, []);

  const setScrollPosition = useCallback((scrollTop: number, isScrolling: boolean) => {
    dispatch({ type: 'SET_SCROLL_POSITION', payload: { scrollTop, isScrolling } });
  }, []);

  const updateVisibleRange = useCallback((range: [number, number]) => {
    dispatch({ type: 'UPDATE_VISIBLE_RANGE', payload: range });
  }, []);

  const cachePost = useCallback((id: string, data: any, ttl?: number) => {
    if (!state.optimizations.cacheEnabled) return;
    dispatch({ type: 'CACHE_POST', payload: { id, data, ttl } });
  }, [state.optimizations.cacheEnabled]);

  const cacheUser = useCallback((id: string, data: any, ttl?: number) => {
    if (!state.optimizations.cacheEnabled) return;
    dispatch({ type: 'CACHE_USER', payload: { id, data, ttl } });
  }, [state.optimizations.cacheEnabled]);

  const cacheCommunity = useCallback((id: string, data: any, ttl?: number) => {
    if (!state.optimizations.cacheEnabled) return;
    dispatch({ type: 'CACHE_COMMUNITY', payload: { id, data, ttl } });
  }, [state.optimizations.cacheEnabled]);

  const cacheMedia = useCallback((url: string, blob: Blob, ttl?: number) => {
    if (!state.optimizations.cacheEnabled) return;
    dispatch({ type: 'CACHE_MEDIA', payload: { url, blob, ttl } });
  }, [state.optimizations.cacheEnabled]);

  const getCachedPost = useCallback((id: string): any | null => {
    const cached = state.cache.posts.get(id);
    if (!cached) {
      metricsRef.current.misses++;
      return null;
    }

    // Check if expired
    const now = new Date();
    if (now.getTime() - cached.timestamp.getTime() > cached.ttl) {
      dispatch({ type: 'INVALIDATE_CACHE', payload: { type: 'post', id } });
      metricsRef.current.misses++;
      return null;
    }

    // Update access stats
    cached.accessCount++;
    cached.lastAccessed = now;
    metricsRef.current.hits++;
    
    return cached.data;
  }, [state.cache.posts]);

  const getCachedUser = useCallback((id: string): any | null => {
    const cached = state.cache.users.get(id);
    if (!cached) {
      metricsRef.current.misses++;
      return null;
    }

    const now = new Date();
    if (now.getTime() - cached.timestamp.getTime() > cached.ttl) {
      dispatch({ type: 'INVALIDATE_CACHE', payload: { type: 'user', id } });
      metricsRef.current.misses++;
      return null;
    }

    cached.accessCount++;
    cached.lastAccessed = now;
    metricsRef.current.hits++;
    
    return cached.data;
  }, [state.cache.users]);

  const getCachedCommunity = useCallback((id: string): any | null => {
    const cached = state.cache.communities.get(id);
    if (!cached) {
      metricsRef.current.misses++;
      return null;
    }

    const now = new Date();
    if (now.getTime() - cached.timestamp.getTime() > cached.ttl) {
      dispatch({ type: 'INVALIDATE_CACHE', payload: { type: 'community', id } });
      metricsRef.current.misses++;
      return null;
    }

    cached.accessCount++;
    cached.lastAccessed = now;
    metricsRef.current.hits++;
    
    return cached.data;
  }, [state.cache.communities]);

  const getCachedMedia = useCallback((url: string): Blob | null => {
    const cached = state.cache.media.get(url);
    if (!cached) {
      metricsRef.current.misses++;
      return null;
    }

    const now = new Date();
    if (now.getTime() - cached.timestamp.getTime() > cached.ttl) {
      dispatch({ type: 'INVALIDATE_CACHE', payload: { type: 'media', id: url } });
      metricsRef.current.misses++;
      return null;
    }

    cached.accessCount++;
    cached.lastAccessed = now;
    metricsRef.current.hits++;
    
    return cached.blob;
  }, [state.cache.media]);

  const invalidateCache = useCallback((type: 'post' | 'user' | 'community' | 'media', id: string) => {
    dispatch({ type: 'INVALIDATE_CACHE', payload: { type, id } });
  }, []);

  const clearCache = useCallback((type?: 'post' | 'user' | 'community' | 'media') => {
    dispatch({ type: 'CLEAR_CACHE', payload: type });
    metricsRef.current = { hits: 0, misses: 0 };
  }, []);

  const updateMetrics = useCallback((metrics: Partial<PerformanceMetrics>) => {
    dispatch({ type: 'UPDATE_METRICS', payload: metrics });
  }, []);

  const updateOptimizations = useCallback((settings: Partial<OptimizationSettings>) => {
    dispatch({ type: 'UPDATE_OPTIMIZATIONS', payload: settings });
  }, []);

  const measureRenderTime = useCallback((callback: () => void) => {
    const startTime = performance.now();
    callback();
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    dispatch({ type: 'UPDATE_METRICS', payload: { renderTime } });
  }, []);

  const preloadContent = useCallback(async (urls: string[]): Promise<void> => {
    if (!state.optimizations.preloadingEnabled) return;

    const promises = urls.map(async (url) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        cacheMedia(url, blob);
      } catch (error) {
        console.warn('Failed to preload content:', url, error);
      }
    });

    await Promise.allSettled(promises);
  }, [state.optimizations.preloadingEnabled, cacheMedia]);

  const getVisibleItems = useCallback((): [number, number] => {
    return state.virtualScrolling.visibleRange;
  }, [state.virtualScrolling.visibleRange]);

  const getCacheStats = useCallback(() => {
    const itemCount = state.cache.posts.size + state.cache.users.size + 
                     state.cache.communities.size + state.cache.media.size;
    
    return {
      hitRate: state.cache.hitRate,
      size: state.cache.size,
      itemCount,
    };
  }, [state.cache]);

  const isItemVisible = useCallback((index: number): boolean => {
    const [start, end] = state.virtualScrolling.visibleRange;
    return index >= start && index <= end;
  }, [state.virtualScrolling.visibleRange]);

  const optimizeMemoryUsage = useCallback(() => {
    // Force garbage collection of expired items
    dispatch({ type: 'CLEANUP_EXPIRED_CACHE' });
    
    // If cache is still too large, remove least recently used items
    if (state.cache.size > state.cache.maxSize * 0.8) {
      // This would implement LRU eviction logic
      console.log('Cache size optimization needed');
    }
  }, [state.cache.size, state.cache.maxSize]);

  const contextValue: PerformanceContextType = {
    state,
    updateVirtualScroll,
    setScrollPosition,
    updateVisibleRange,
    cachePost,
    cacheUser,
    cacheCommunity,
    cacheMedia,
    getCachedPost,
    getCachedUser,
    getCachedCommunity,
    getCachedMedia,
    invalidateCache,
    clearCache,
    updateMetrics,
    updateOptimizations,
    measureRenderTime,
    preloadContent,
    getVisibleItems,
    getCacheStats,
    isItemVisible,
    optimizeMemoryUsage,
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
}

// Hook
export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
}
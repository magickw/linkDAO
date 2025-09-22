import { useCallback, useRef } from 'react';

interface CacheItem {
  url: string;
  timestamp: number;
  blob?: Blob;
}

interface IconCacheEntry {
  id: string;
  iconUrl: string;
}

/**
 * Community Cache Hook
 * 
 * Provides intelligent caching for community icons with LRU eviction
 * and preloading capabilities for performance optimization.
 */
export const useCommunityCache = () => {
  const iconCache = useRef<Map<string, CacheItem>>(new Map());
  const maxCacheSize = 100;
  const cacheTimeout = 30 * 60 * 1000; // 30 minutes

  const getCachedIcon = useCallback((communityId: string): string | null => {
    const cached = iconCache.current.get(communityId);
    
    if (!cached) return null;
    
    // Check if cache entry is expired
    if (Date.now() - cached.timestamp > cacheTimeout) {
      iconCache.current.delete(communityId);
      return null;
    }
    
    // Move to end (LRU)
    iconCache.current.delete(communityId);
    iconCache.current.set(communityId, cached);
    
    return cached.url;
  }, []);

  const setCachedIcon = useCallback((communityId: string, url: string) => {
    // Implement LRU eviction
    if (iconCache.current.size >= maxCacheSize) {
      const firstKey = iconCache.current.keys().next().value;
      if (firstKey) {
        iconCache.current.delete(firstKey);
      }
    }
    
    iconCache.current.set(communityId, {
      url,
      timestamp: Date.now()
    });
  }, []);

  const preloadIcons = useCallback(async (communities: IconCacheEntry[]) => {
    const preloadPromises = communities.map(async (community) => {
      if (iconCache.current.has(community.id)) return;
      
      try {
        // Create a new image to preload
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise<void>((resolve, reject) => {
          img.onload = () => {
            setCachedIcon(community.id, community.iconUrl);
            resolve();
          };
          img.onerror = () => {
            // Still cache the URL even if it fails to load
            setCachedIcon(community.id, community.iconUrl);
            resolve();
          };
          img.src = community.iconUrl;
        });
      } catch (error) {
        console.warn(`Failed to preload icon for community ${community.id}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }, [setCachedIcon]);

  const clearCache = useCallback(() => {
    iconCache.current.clear();
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      size: iconCache.current.size,
      maxSize: maxCacheSize,
      entries: Array.from(iconCache.current.keys())
    };
  }, []);

  return {
    getCachedIcon,
    setCachedIcon,
    preloadIcons,
    clearCache,
    getCacheStats
  };
};
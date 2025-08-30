import { useState, useEffect, useCallback, useMemo } from 'react';
import { PostService } from '../services/postService';
import { Post, CreatePostInput } from '../models/Post';
import { cacheManager } from '../services/cacheService';
import { performanceMonitor } from '../utils/performanceMonitor';

/**
 * Custom hook to fetch user feed with caching and performance monitoring
 * @param forUser - User address to get feed for (optional)
 * @returns Object containing feed data, loading state, and error
 */
export const useFeed = (forUser?: string) => {
  const [feed, setFeed] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  // Performance monitoring
  const startTiming = (name: string) => {
    performanceMonitor.mark(name);
    return () => performanceMonitor.measure(name);
  };
  const markEvent = (name: string, value?: number) => {
    performanceMonitor.recordMetric(name, value || 1, 'counter');
  };

  const fetchFeed = useCallback(async (force = false) => {
    const now = Date.now();
    const CACHE_DURATION = 30000; // 30 seconds cache duration
    
    // Prevent excessive requests - only fetch if forced or cache expired
    if (!force && now - lastFetch < CACHE_DURATION) {
      console.log('Feed fetch skipped - cache still fresh');
      return;
    }
    
    // Prevent concurrent requests
    if (isLoading) {
      console.log('Feed fetch skipped - already loading');
      return;
    }
    
    const endTiming = startTiming('feed.load');
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to get from cache first (only if not forced)
      const cacheKey = forUser || 'anonymous';
      if (!force) {
        const cachedFeed = cacheManager.postCache.getFeed(cacheKey);
        
        if (cachedFeed && cachedFeed.length > 0) {
          setFeed(cachedFeed);
          markEvent('feed.cache_hit');
          endTiming();
          setIsLoading(false);
          return;
        }
      }
      
      markEvent('feed.cache_miss');
      const fetchedFeed = await PostService.getFeed(forUser);
      
      // Cache the result
      cacheManager.postCache.setFeed(cacheKey, fetchedFeed);
      
      setFeed(fetchedFeed);
      setLastFetch(now);
      markEvent('feed.loaded', fetchedFeed.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch feed';
      setError(errorMessage);
      markEvent('feed.error');
      
      // On error, try to show cached data if available
      const cacheKey = forUser || 'anonymous';
      const cachedFeed = cacheManager.postCache.getFeed(cacheKey);
      if (cachedFeed && cachedFeed.length > 0) {
        setFeed(cachedFeed);
        console.log('Showing cached feed due to error:', errorMessage);
      }
    } finally {
      setIsLoading(false);
      endTiming();
    }
  }, [forUser, isLoading, lastFetch, startTiming, markEvent]);

  // Only fetch on mount or when forUser changes
  useEffect(() => {
    fetchFeed();
  }, [forUser]); // Removed fetchFeed from dependencies to prevent loops

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    feed,
    isLoading,
    error,
    refetch: () => fetchFeed(true), // Force refresh when manually called
    lastFetch
  }), [feed, isLoading, error, fetchFeed, lastFetch]);
};

/**
 * Custom hook to create a new post
 * @returns Object containing create function, loading state, and error
 */
export const useCreatePost = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const createPost = useCallback(async (data: CreatePostInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const post = await PostService.createPost(data);
      setSuccess(true);
      return post;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createPost, isLoading, error, success };
};

/**
 * Custom hook to fetch posts by author
 * @param author - Author address
 * @returns Object containing posts data, loading state, and error
 */
export const usePostsByAuthor = (author: string) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!author) {
      setPosts([]);
      return;
    }

    const fetchPosts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedPosts = await PostService.getPostsByAuthor(author);
        setPosts(fetchedPosts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [author]);

  return { posts, isLoading, error };
};
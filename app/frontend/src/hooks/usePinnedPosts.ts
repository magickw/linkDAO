import { useState, useCallback, useEffect } from 'react';
import { CommunityPost } from '@/models/CommunityPost';
import { CommunityPostService } from '@/services/communityPostService';

interface UsePinnedPostsOptions {
  communityId: string;
  canModerate?: boolean;
  onError?: (error: Error) => void;
}

interface UsePinnedPostsReturn {
  pinnedPosts: CommunityPost[];
  isLoading: boolean;
  error: string | null;
  pinPost: (postId: string, sortOrder?: number) => Promise<void>;
  unpinPost: (postId: string) => Promise<void>;
  reorderPosts: (postIds: string[]) => Promise<void>;
  refreshPinnedPosts: () => Promise<void>;
}

/**
 * Custom hook for managing pinned posts in a community
 */
export function usePinnedPosts({
  communityId,
  canModerate = false,
  onError
}: UsePinnedPostsOptions): UsePinnedPostsReturn {
  const [pinnedPosts, setPinnedPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch pinned posts
  const fetchPinnedPosts = useCallback(async () => {
    if (!communityId) return;

    setIsLoading(true);
    setError(null);

    try {
      const posts = await CommunityPostService.getPinnedPosts(communityId);
      setPinnedPosts(posts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pinned posts';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [communityId, onError]);

  // Pin a post
  const pinPost = useCallback(async (postId: string, sortOrder?: number) => {
    if (!canModerate) {
      throw new Error('Insufficient permissions to pin posts');
    }

    // Check if we already have 3 pinned posts
    if (pinnedPosts.length >= 3) {
      throw new Error('Maximum of 3 posts can be pinned. Please unpin a post first.');
    }

    setError(null);

    try {
      const updatedPost = await CommunityPostService.pinPost(postId, sortOrder);
      
      // Add the pinned post to the list
      setPinnedPosts(prev => {
        const newPosts = [...prev, updatedPost];
        return newPosts.sort((a, b) => a.sortOrder - b.sortOrder);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pin post';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [canModerate, pinnedPosts.length, onError]);

  // Unpin a post
  const unpinPost = useCallback(async (postId: string) => {
    if (!canModerate) {
      throw new Error('Insufficient permissions to unpin posts');
    }

    setError(null);

    try {
      await CommunityPostService.unpinPost(postId);
      
      // Remove the unpinned post from the list
      setPinnedPosts(prev => prev.filter(post => post.id !== postId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unpin post';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [canModerate, onError]);

  // Reorder pinned posts
  const reorderPosts = useCallback(async (postIds: string[]) => {
    if (!canModerate) {
      throw new Error('Insufficient permissions to reorder posts');
    }

    setError(null);

    // Optimistically update the order
    const previousPosts = [...pinnedPosts];
    const reorderedPosts = postIds.map(id => 
      pinnedPosts.find(post => post.id === id)
    ).filter(Boolean) as CommunityPost[];
    
    setPinnedPosts(reorderedPosts);

    try {
      await CommunityPostService.reorderPinnedPosts(communityId, postIds);
    } catch (err) {
      // Revert on error
      setPinnedPosts(previousPosts);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder posts';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [canModerate, communityId, pinnedPosts, onError]);

  // Refresh pinned posts
  const refreshPinnedPosts = useCallback(async () => {
    await fetchPinnedPosts();
  }, [fetchPinnedPosts]);

  // Initial fetch
  useEffect(() => {
    fetchPinnedPosts();
  }, [fetchPinnedPosts]);

  return {
    pinnedPosts,
    isLoading,
    error,
    pinPost,
    unpinPost,
    reorderPosts,
    refreshPinnedPosts
  };
}
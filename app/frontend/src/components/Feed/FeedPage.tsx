// Mock FeedPage component for testing
import React, { useState, useEffect } from 'react';
import { FeedSortingHeader } from './FeedSortingTabs';
import { FeedSortType, EnhancedPost } from '../../types/feed';
import { useFeedSortingPreferences } from '../../hooks/useFeedPreferences';
import { serviceWorkerCacheService } from '../../services/serviceWorkerCacheService';
import { FeedService } from '../../services/feedService';
import LoadingSkeletons from '../LoadingSkeletons/PostCardSkeleton';

interface FeedPageProps {
  communityId?: string;
  showHeader?: boolean;
  enablePullToRefresh?: boolean;
}

export const FeedPage: React.FC<FeedPageProps> = ({
  communityId,
  showHeader = true,
  enablePullToRefresh = false
}) => {
  const [posts, setPosts] = useState<EnhancedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { currentSort, currentTimeRange, updateSort, updateTimeRange } = useFeedSortingPreferences();
  // Use the service worker cache service directly instead of the hook
  const cacheService = serviceWorkerCacheService;

  useEffect(() => {
    loadPosts();
  }, [currentSort, currentTimeRange, communityId]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      // If communityId is provided, we should use postService to get posts for that community
      // Otherwise, use feedService for the enhanced feed (home/feed page)
      let response;
      if (communityId) {
        // For community-specific pages, we should get posts from that specific community
        const { PostService } = await import('../../services/postService');
        const communityPosts = await PostService.getPostsByCommunity(communityId);
        response = {
          posts: communityPosts,
          hasMore: false,
          totalPages: 1
        };
      } else {
        // For home/feed page, get the enhanced feed that includes both regular posts and quickPosts
        response = await FeedService.getEnhancedFeed({
          sortBy: currentSort,
          timeRange: currentTimeRange,
          feedSource: 'all' // Show all posts for home/feed
        }, 1, 20);
      }
      
      setPosts(response.posts);
      setHasMore(response.hasMore);
      setError(null);
    } catch (err) {
      setError('Failed to load feed');
      console.error('Error loading feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await cacheService.invalidateByTags(['feed', 'posts']);
    await loadPosts();
  };

  if (loading && posts.length === 0) {
    return <LoadingSkeletons />;
  }

  if (error && posts.length === 0) {
    return (
      <div>
        <p>Failed to load feed</p>
        <button onClick={loadPosts}>Try Again</button>
      </div>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <div>
        <p>No posts found</p>
        <button onClick={handleRefresh}>Refresh Feed</button>
      </div>
    );
  }

  return (
    <main aria-label="Feed" data-testid="feed-container">
      {showHeader && (
        <div>
          <h2>{communityId ? 'Community Feed' : 'Your Feed'}</h2>
          <button onClick={handleRefresh} aria-label="Refresh feed">
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <FeedSortingHeader
            activeSort={currentSort}
            activeTimeRange={currentTimeRange}
            onSortChange={updateSort}
            onTimeRangeChange={updateTimeRange}
          />
        </div>
      )}

      {loading && posts.length === 0 && (
        <div data-testid="loading-skeletons">
          <LoadingSkeletons />
        </div>
      )}

      {posts.length > 0 && (
        <div data-testid="virtualized-list">
          {posts.map((post, index) => (
            <article key={post.id || index} data-testid="post-card">
              Post content
            </article>
          ))}
        </div>
      )}

      {loading && posts.length > 0 && (
        <div data-testid="loading-indicator">Loading more...</div>
      )}

      {!hasMore && posts.length > 0 && (
        <div>🎉 You've reached the end!</div>
      )}

      <div role="status" aria-live="polite">
        {loading ? 'Loading...' : ''}
      </div>
    </main>
  );
};

export default FeedPage;
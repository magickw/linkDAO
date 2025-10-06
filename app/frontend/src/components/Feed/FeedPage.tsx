// Mock FeedPage component for testing
import React, { useState, useEffect } from 'react';
import { FeedSortingHeader } from './FeedSortingTabs';
import { FeedSortType } from '../../types/feed';
import { useFeedSortingPreferences } from '../../hooks/useFeedPreferences';
import { useIntelligentCache } from '../../hooks/useIntelligentCache';
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
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { currentSort, currentTimeRange, updateSort, updateTimeRange } = useFeedSortingPreferences();
  const { cacheWithStrategy, invalidateByTags, predictivePreload } = useIntelligentCache();

  useEffect(() => {
    loadPosts();
  }, [currentSort, currentTimeRange, communityId]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await FeedService.getEnhancedFeed({
        sortBy: currentSort,
        timeRange: currentTimeRange,
        communityId
      }, 1, 20);
      
      setPosts(response.posts);
      setHasMore(response.hasMore);
      setError(null);
    } catch (err) {
      setError('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await invalidateByTags(['feed', 'posts']);
    await loadPosts();
  };

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
// Mock FeedPage component for testing
import React, { useState, useEffect } from 'react';
import { FeedSortingHeader } from './FeedSortingTabs';
import { EnhancedPost } from '../../types/feed';
import EnhancedPostCard from './EnhancedPostCard';
import { useFeedSortingPreferences } from '../../hooks/useFeedPreferences';
import { serviceWorkerCacheService } from '../../services/serviceWorkerCacheService';
import { FeedService } from '../../services/feedService';
import LoadingSkeletons from '../LoadingSkeletons/PostCardSkeleton';
import { useWeb3 } from '../../context/Web3Context';

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
  const { address } = useWeb3();
  // Use the service worker cache service directly instead of the hook
  const cacheService = serviceWorkerCacheService;

  useEffect(() => {
    loadPosts();
  }, [currentSort, currentTimeRange, communityId, address]);

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
        // For home/feed page, get the enhanced feed that includes both regular posts and statuses
        // AND posts from communities the user has joined
        let userCommunities: string[] = [];

        // Fetch user's community memberships if they're connected
        if (address) {
          try {
            const { CommunityService } = await import('../../services/communityService');
            userCommunities = await CommunityService.getUserCommunityMemberships();
            console.log('📋 [FEED] User is member of communities:', userCommunities);
          } catch (err) {
            console.warn('Failed to fetch user communities, continuing without community filter:', err);
          }
        }

        response = await FeedService.getEnhancedFeed({
          sortBy: currentSort,
          timeRange: currentTimeRange,
          feedSource: 'following', // Show posts from followed users (including self) for home/feed
          userAddress: address, // CRITICAL: Pass user address for personalized feed
          communities: userCommunities // Include posts from user's communities
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

  if (error && posts.length === 0) {
    return (
      <div>
        <p>Failed to load feed</p>
        <button onClick={() => loadPosts()}>Try Again</button>
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

  if (loading && posts.length === 0) {
    return <LoadingSkeletons />;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
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
        <div data-testid="virtualized-list" className="space-y-4">
          {posts.map((post, index) => (
            <EnhancedPostCard
              key={post.id || index}
              post={post}
              onLike={async (postId) => {
                await FeedService.addReaction(postId, 'like');
              }}
              onComment={async (postId) => {
                // This is usually handled by the card expanding to show comments, 
                // but we can also trigger a focus or navigation if needed.
                // For now, we'll just log it as the card handles the UI.
                console.log('Comment clicked for', postId);
              }}
              onShare={async (postId) => {
                await FeedService.sharePost(postId, 'web_share');
              }}
              onTip={async (postId, amount, token, message) => {
                if (amount && token) {
                  await FeedService.sendTip(postId, parseFloat(amount), token, message);
                }
              }}
              onReaction={async (postId, type, amount) => {
                await FeedService.addReaction(postId, type, amount);
              }}
              className="mb-4"
            />
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
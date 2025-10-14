import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedPost as FeedEnhancedPost, FeedFilter, FeedSortType } from '../../types/feed';
import { useFeedSortingPreferences, useDisplayPreferences, useAutoRefreshPreferences } from '../../hooks/useFeedPreferences';
import { FeedSortingHeader } from './FeedSortingTabs';
import InfiniteScrollFeed from './InfiniteScrollFeed';
import LikedByModal from './LikedByModal';
import TrendingContentDetector, { TrendingBadge } from './TrendingContentDetector';
import CommunityEngagementMetrics from './CommunityEngagementMetrics';
import EnhancedPostCard, { EnhancedPost } from '../EnhancedPostCard/EnhancedPostCard';

interface EnhancedFeedViewProps {
  communityId?: string;
  initialFilter?: Partial<FeedFilter>;
  showCommunityMetrics?: boolean;
  className?: string;
}

export default function EnhancedFeedView({
  communityId,
  initialFilter = {},
  showCommunityMetrics = false,
  className = ''
}: EnhancedFeedViewProps) {
  // Preferences hooks
  const { currentSort, currentTimeRange, updateSort, updateTimeRange } = useFeedSortingPreferences();
  const { showSocialProof, showTrendingBadges, infiniteScroll, postsPerPage } = useDisplayPreferences();
  const { isEnabled: autoRefreshEnabled, interval: refreshInterval } = useAutoRefreshPreferences();

  // State
  const [filter, setFilter] = useState<FeedFilter>({
    sortBy: currentSort,
    timeRange: currentTimeRange,
    communityId,
    ...initialFilter
  });
  const [posts, setPosts] = useState<EnhancedPost[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<EnhancedPost[]>([]);
  const [likedByModal, setLikedByModal] = useState<{ isOpen: boolean; postId: string }>({
    isOpen: false,
    postId: ''
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Update filter when preferences change
  useEffect(() => {
    setFilter(prev => ({
      ...prev,
      sortBy: currentSort,
      timeRange: currentTimeRange,
      communityId
    }));
  }, [currentSort, currentTimeRange, communityId]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refreshInterval]);

  // Handle sorting changes
  const handleSortChange = useCallback((sort: FeedSortType) => {
    updateSort(sort, true); // Save as default
    setFilter(prev => ({ ...prev, sortBy: sort }));
  }, [updateSort]);

  // Handle time range changes
  const handleTimeRangeChange = useCallback((timeRange: string) => {
    updateTimeRange(timeRange, true); // Save as default
    setFilter(prev => ({ ...prev, timeRange }));
  }, [updateTimeRange]);

  // Convert feed post to card post format
  const convertFeedPostToCardPost = useCallback((feedPost: FeedEnhancedPost): EnhancedPost => {
    return {
      id: feedPost.id,
      title: '', // Feed posts don't have titles, use content preview
      content: '', // Will be loaded from IPFS using contentCid
      author: feedPost.author,
      authorProfile: {
        handle: feedPost.author.slice(0, 8),
        verified: false,
        avatar: undefined
      },
      createdAt: feedPost.createdAt,
      updatedAt: feedPost.createdAt,
      contentType: 'text',
      media: feedPost.mediaCids,
      previews: (feedPost.previews || []).map(p => ({
        id: `${feedPost.id}-${p.url}`,
        type: p.type as 'nft' | 'link' | 'proposal' | 'token',
        url: p.url,
        data: p.data || {},
        metadata: {},
        cached: false,
        securityStatus: 'safe' as const
      })),
      hashtags: feedPost.tags || [],
      mentions: [],
      reactions: feedPost.reactions?.map(r => ({
        type: 'hot' as const,
        emoji: r.type,
        label: r.type,
        totalStaked: r.totalAmount,
        userStaked: 0,
        contributors: r.users.map(u => u.address),
        rewardsEarned: 0
      })) || [],
      tips: feedPost.tips?.map(t => ({
        amount: t.amount,
        token: t.tokenType,
        from: t.from,
        timestamp: t.timestamp
      })) || [],
      comments: feedPost.comments || 0,
      shares: feedPost.shares || 0,
      views: feedPost.views || 0,
      engagementScore: feedPost.engagementScore || 0,
      socialProof: feedPost.socialProof ? {
        followedUsersWhoEngaged: feedPost.socialProof.followedUsersWhoEngaged.map((u: any) => ({
          ...u,
          id: u.address // Use address as id if not present
        })),
        totalEngagementFromFollowed: feedPost.socialProof.totalEngagementFromFollowed,
        communityLeadersWhoEngaged: feedPost.socialProof.communityLeadersWhoEngaged.map((u: any) => ({
          ...u,
          id: u.address
        })),
        verifiedUsersWhoEngaged: feedPost.socialProof.verifiedUsersWhoEngaged.map((u: any) => ({
          ...u,
          id: u.address
        }))
      } : {
        followedUsersWhoEngaged: [],
        totalEngagementFromFollowed: 0,
        communityLeadersWhoEngaged: [],
        verifiedUsersWhoEngaged: []
      },
      trendingStatus: feedPost.trendingStatus as any,
      communityId: (feedPost as any).communityId,
      tags: (feedPost as any).tags || feedPost.tags
    };
  }, []);

  // Handle posts loading
  const handlePostsLoad = useCallback((newPosts: FeedEnhancedPost[]) => {
    const convertedPosts = newPosts.map(convertFeedPostToCardPost);
    setPosts(convertedPosts);
  }, [convertFeedPostToCardPost]);

  // Handle trending updates
  const handleTrendingUpdate = useCallback((trending: EnhancedPost[]) => {
    setTrendingPosts(trending);
  }, []);

  // Handle liked by modal
  const handleShowLikedBy = useCallback((postId: string) => {
    setLikedByModal({ isOpen: true, postId });
  }, []);

  const handleCloseLikedBy = useCallback(() => {
    setLikedByModal({ isOpen: false, postId: '' });
  }, []);

  // Render post card with enhanced features
  const renderPost = useCallback((post: EnhancedPost) => (
    <div key={post.id} className="mb-6">
      <EnhancedPostCard
        post={post}
        showSocialProof={showSocialProof}
        showTrending={showTrendingBadges}
        className="transition-all duration-200 hover:shadow-lg"
      />
    </div>
  ), [showSocialProof, showTrendingBadges, handleShowLikedBy]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Community Metrics */}
      {showCommunityMetrics && communityId && (
        <CommunityEngagementMetrics
          communityId={communityId}
          timeRange={filter.timeRange}
        />
      )}

      {/* Trending Content Detector */}
      <TrendingContentDetector
        posts={posts}
        onTrendingUpdate={handleTrendingUpdate}
      />

      {/* Feed Header with Sorting */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 design-card hover-lift">
        <FeedSortingHeader
          activeSort={filter.sortBy}
          activeTimeRange={filter.timeRange || 'day'}
          onSortChange={handleSortChange}
          onTimeRangeChange={handleTimeRangeChange}
          showTimeRange={filter.sortBy !== FeedSortType.NEW}
          showCounts={false}
        />
      </div>

      {/* Feed Content */}
      {infiniteScroll ? (
        <InfiniteScrollFeed
          key={`${JSON.stringify(filter)}-${refreshKey}`}
          filter={filter}
          onPostsLoad={handlePostsLoad}
          postsPerPage={postsPerPage}
          threshold={1000}
        >
          {(feedPosts, scrollState) => (
            <div>
              {/* Posts are managed by the handlePostsLoad callback */}

              {/* Render posts */}
              {feedPosts.length === 0 && !scrollState.isLoading ? (
                <EmptyFeedState filter={filter} />
              ) : (
                <div className="space-y-6">
                  {posts.map(renderPost)}
                </div>
              )}

              {/* Loading state */}
              {scrollState.isLoading && feedPosts.length === 0 && (
                <FeedLoadingState />
              )}

              {/* Error state */}
              {scrollState.error && (
                <FeedErrorState 
                  error={scrollState.error} 
                  onRetry={(scrollState as any).retry}
                />
              )}
            </div>
          )}
        </InfiniteScrollFeed>
      ) : (
        <PaginatedFeed
          filter={filter}
          postsPerPage={postsPerPage}
          renderPost={renderPost}
          onPostsUpdate={setPosts}
          convertPost={convertFeedPostToCardPost}
        />
      )}

      {/* Liked By Modal */}
      <LikedByModal
        postId={likedByModal.postId}
        isOpen={likedByModal.isOpen}
        onClose={handleCloseLikedBy}
      />
    </div>
  );
}

// Empty feed state component
interface EmptyFeedStateProps {
  filter: FeedFilter;
}

function EmptyFeedState({ filter }: EmptyFeedStateProps) {
  const getSortDescription = (sort: FeedSortType) => {
    switch (sort) {
      case FeedSortType.HOT: return 'trending posts';
      case FeedSortType.NEW: return 'recent posts';
      case FeedSortType.TOP: return 'top-rated posts';
      case FeedSortType.RISING: return 'rising posts';
      default: return 'posts';
    }
  };

  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📭</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No {getSortDescription(filter.sortBy)} found
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {filter.communityId 
          ? 'This community doesn\'t have any posts matching your criteria yet.'
          : 'Try adjusting your filters or check back later for new content.'
        }
      </p>
      <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
        <p>Current filters:</p>
        <div className="flex items-center justify-center space-x-4">
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
            Sort: {filter.sortBy}
          </span>
          {filter.timeRange && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
              Time: {filter.timeRange}
            </span>
          )}
          {filter.communityId && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
              Community: {filter.communityId}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Feed loading state component
function FeedLoadingState() {
  return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Feed error state component
interface FeedErrorStateProps {
  error: string;
  onRetry: () => void;
}

function FeedErrorState({ error, onRetry }: FeedErrorStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-red-600 dark:text-red-400 mb-4">
        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-lg font-medium">Failed to load feed</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors duration-200"
      >
        Try Again
      </button>
    </div>
  );
}

// Paginated feed component (fallback for when infinite scroll is disabled)
interface PaginatedFeedProps {
  filter: FeedFilter;
  postsPerPage: number;
  renderPost: (post: EnhancedPost) => React.ReactNode;
  onPostsUpdate: (posts: EnhancedPost[]) => void;
  convertPost: (feedPost: FeedEnhancedPost) => EnhancedPost;
}

function PaginatedFeed({ filter, postsPerPage, renderPost, onPostsUpdate, convertPost }: PaginatedFeedProps) {
  const [posts, setPosts] = useState<EnhancedPost[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load posts for current page
  useEffect(() => {
    loadPage(currentPage);
  }, [filter, currentPage]);

  const loadPage = async (page: number) => {
    setLoading(true);
    setError(null);

    try {
      const { FeedService } = await import('../../services/feedService');
      const response = await FeedService.getEnhancedFeed(filter, page, postsPerPage);
      const convertedPosts = response.posts.map(convertPost);
      
      setPosts(convertedPosts);
      setTotalPages(response.totalPages);
      onPostsUpdate(convertedPosts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  if (loading && posts.length === 0) {
    return <FeedLoadingState />;
  }

  if (error && posts.length === 0) {
    return <FeedErrorState error={error} onRetry={() => loadPage(currentPage)} />;
  }

  return (
    <div>
      {/* Posts */}
      <div className="space-y-6 mb-8">
        {posts.map(renderPost)}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
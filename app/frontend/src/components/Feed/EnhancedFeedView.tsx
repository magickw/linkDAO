import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EnhancedPost as FeedEnhancedPost, FeedFilter, FeedSortType, FeedError } from '../../types/feed';
import { useFeedSortingPreferences, useDisplayPreferences, useAutoRefreshPreferences } from '../../hooks/useFeedPreferences';
import InfiniteScrollFeed from './InfiniteScrollFeed';
import LikedByModal from './LikedByModal';
import TrendingContentDetector, { TrendingBadge } from './TrendingContentDetector';
import CommunityEngagementMetrics from './CommunityEngagementMetrics';
import EnhancedPostCard from '../EnhancedPostCard/EnhancedPostCard';
import { useToast } from '@/context/ToastContext';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { analyticsService } from '@/services/analyticsService';
import FeedErrorBoundary from './FeedErrorBoundary';
import { FeedSkeleton } from '@/components/animations/LoadingSkeletons';
import { useAccount } from 'wagmi';
import { useFollowing } from '@/hooks/useFollow';
import { CommunityMembershipService } from '@/services/communityMembershipService';

interface EnhancedPost {
  id: string;
  title: string;
  content: string;
  author: string;
  authorProfile: {
    handle: string;
    verified: boolean;
    reputationTier?: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Enhanced content
  contentType?: 'text' | 'media' | 'link' | 'poll' | 'proposal';
  media?: string[];
  previews: any[];
  hashtags: string[];
  mentions: string[];
  
  // Engagement data
  reactions: any[];
  tips: any[];
  comments: number;
  shares: number;
  views: number;
  engagementScore: number;
  
  // Social proof
  socialProof: any;
  trendingStatus?: any;
  pinnedUntil?: Date;
  
  // Community context
  communityId?: string;
  communityName?: string;
  tags?: string[];
}

interface EnhancedFeedViewProps {
  communityId?: string;
  initialFilter?: Partial<FeedFilter>;
  showCommunityMetrics?: boolean;
  className?: string;
  externalRefreshKey?: number; // Add externalRefreshKey prop to force refresh
}

const EnhancedFeedView = React.memo(({
  communityId,
  initialFilter = {},
  showCommunityMetrics = false,
  className = '',
  externalRefreshKey = 0
}: EnhancedFeedViewProps) => {
  const { addToast } = useToast();
  const { isMobile } = useMobileOptimization();
  const { address } = useAccount();
  const { data: following = [], isLoading: followingLoading } = useFollowing(address);
  const [userCommunityIds, setUserCommunityIds] = useState<string[]>([]);
  const [userInterestTags, setUserInterestTags] = useState<string[]>([]);

  // Load user's joined communities (ids)
  useEffect(() => {
    let cancelled = false;
    const loadMemberships = async () => {
      if (!address) {
        setUserCommunityIds([]);
        return;
      }
      try {
        const memberships = await CommunityMembershipService.getUserMemberships(address);
        if (!cancelled) {
          const ids = (memberships || []).map((m: any) => m.communityId).filter(Boolean);
          setUserCommunityIds(Array.from(new Set(ids)));
        }
      } catch (err) {
        if (!cancelled) setUserCommunityIds([]);
      }
    };
    loadMemberships();
    return () => { cancelled = true; };
  }, [address]);

  // Load user's interest tags from local storage as a lightweight heuristic
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_favorite_topics');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setUserInterestTags(parsed.map((t: string) => t.toLowerCase()));
      }
    } catch {}
  }, []);
  
  // Preferences hooks - now defaults to following feed with newest posts
  const { currentSort, currentTimeRange, updateSort, updateTimeRange } = useFeedSortingPreferences();
  const { showSocialProof, showTrendingBadges, infiniteScroll, postsPerPage } = useDisplayPreferences();
  const { isEnabled: autoRefreshEnabled, interval: refreshInterval } = useAutoRefreshPreferences();

  // State - properly memoized
  const [filter, setFilter] = useState<FeedFilter>({
    sortBy: currentSort,
    timeRange: currentTimeRange,
    feedSource: 'following', // Ensure 'following' feed to include user's own posts
    userAddress: address || '', // Add user address for personalized feed
    ...initialFilter
  });
  const [posts, setPosts] = useState<EnhancedPost[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<EnhancedPost[]>([]);
  const [likedByModal, setLikedByModal] = useState<{ isOpen: boolean; postId: string }>({
    isOpen: false,
    postId: ''
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<FeedError | null>(null);

  // Update filter when preferences change - memoized
  useEffect(() => {
    setFilter(prev => ({
      ...prev,
      sortBy: currentSort,
      timeRange: currentTimeRange,
      // Ensure feedSource is always 'following' to include user's own posts
      feedSource: 'following',
      userAddress: address || '' // Update user address when it changes
    }));
  }, [currentSort, currentTimeRange, address]);

  // Handle external refresh key changes - trigger a refresh when externalRefreshKey prop changes
  useEffect(() => {
    // Only trigger refresh if externalRefreshKey is a positive number (not undefined, null, or 0)
    if (typeof externalRefreshKey === 'number' && externalRefreshKey > 0) {
      // Trigger a refresh by updating the internal refreshKey state
      setRefreshKey(prev => prev + 1);
    }
  }, [externalRefreshKey]);

  // Auto-refresh functionality - memoized
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refreshInterval]);

  // Handle sorting changes - memoized
  const handleSortChange = useCallback((sort: FeedSortType) => {
    updateSort(sort, true); // Save as default
    setFilter(prev => ({ ...prev, sortBy: sort }));
  }, [updateSort]);

  // Handle time range changes - memoized
  const handleTimeRangeChange = useCallback((timeRange: string) => {
    updateTimeRange(timeRange, true); // Save as default
    setFilter(prev => ({ ...prev, timeRange }));
  }, [updateTimeRange]);

  // Convert feed post to card post format - memoized
  const convertFeedPostToCardPost = useCallback((feedPost: FeedEnhancedPost): EnhancedPost => {
    return {
      id: feedPost.id,
      title: feedPost.title || '', 
      content: '', // Will be loaded from IPFS using contentCid
      author: feedPost.author,
      authorProfile: {
        handle: feedPost.handle || feedPost.author.slice(0, 8),
        verified: false,
        avatar: feedPost.profileCid || undefined,
        reputationTier: undefined
      },
      createdAt: feedPost.createdAt,
      updatedAt: feedPost.updatedAt || feedPost.createdAt,
      contentType: feedPost.contentType || 'text',
      media: feedPost.mediaCids,
      previews: (feedPost.previews || []).map(p => ({
        id: p.id || `${feedPost.id}-${p.url}`,
        type: p.type as 'nft' | 'link' | 'proposal' | 'token',
        url: p.url,
        data: p.data || {},
        metadata: p.metadata || {},
        cached: p.cached || false,
        securityStatus: p.securityStatus === 'danger' ? 'blocked' : (p.securityStatus as 'safe' | 'warning' | 'blocked') || 'safe'
      })),
      hashtags: feedPost.tags || [],
      mentions: [],
      reactions: feedPost.reactions?.map(r => ({
        type: r.type as 'hot' | 'diamond' | 'bullish' | 'governance' | 'art',
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
      communityId: feedPost.communityId || (feedPost as any).dao,
      tags: (feedPost as any).tags || feedPost.tags
    };
  }, []);

  // Handle posts loading - memoized
  const handlePostsLoad = useCallback((newPosts: FeedEnhancedPost[]) => {
    let convertedPosts = newPosts.map(convertFeedPostToCardPost);
    // No client-side filtering needed since backend handles it
    setPosts(convertedPosts);
    setError(null); // Clear any previous errors
  }, [convertFeedPostToCardPost]);

  // Handle trending updates - memoized
  const handleTrendingUpdate = useCallback((trending: EnhancedPost[]) => {
    setTrendingPosts(trending);
  }, []);

  // Handle liked by modal - memoized
  const handleShowLikedBy = useCallback((postId: string) => {
    setLikedByModal({ isOpen: true, postId });
  }, []);

  const handleCloseLikedBy = useCallback(() => {
    setLikedByModal({ isOpen: false, postId: '' });
  }, []);

  // Handle error with enhanced analytics - memoized
  const handleError = useCallback((error: FeedError) => {
    setError(error);
    addToast(error.message, 'error');
    
    // Track error with analytics
    analyticsService.trackUserEvent('feed_view_error', {
      error: error.message,
      code: error.code,
      timestamp: error.timestamp,
      retryable: error.retryable,
      filter: filter,
      communityId: communityId
    });
    
    // Log to console for debugging
    console.error('Feed error:', error);
  }, [addToast, filter, communityId]);

  // Enhanced retry function with analytics - memoized
  const handleRetry = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    
    // Track retry attempt
    analyticsService.trackUserEvent('feed_retry_attempt', {
      filter: filter,
      communityId: communityId,
      timestamp: new Date()
    });
    
    // Log retry attempt
    console.log('Feed retry attempt', { filter, communityId });
  }, [filter, communityId]);

  // Render post card with enhanced features - memoized
  const renderPost = useCallback((post: EnhancedPost) => (
    <div key={post.id} className="mb-4">
      <EnhancedPostCard
        post={post}
        showSocialProof={showSocialProof}
        showTrending={showTrendingBadges}
        className=""
        onReaction={async (postId, reactionType, amount) => {
          console.log('Reaction', postId, reactionType, amount);
        }}
        onTip={async (postId, amount, token) => {
          console.log('Tip', postId, amount, token);
        }}
      />
    </div>
  ), [showSocialProof, showTrendingBadges]);

  // Memoized sorting options
  const sortingOptions = useMemo(() => [
    { value: FeedSortType.HOT, label: '🔥 Hot', desc: 'Trending' },
    { value: FeedSortType.NEW, label: '🆕 New', desc: 'Latest' },
    { value: FeedSortType.TOP, label: '⭐ Top', desc: 'Best' },
    { value: FeedSortType.RISING, label: '📈 Rising', desc: 'Growing' }
  ], []);

  // Memoized sorting header
  const sortingHeader = useMemo(() => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
      <div className="flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
        {sortingOptions.map(option => (
          <button
            key={option.value}
            onClick={() => handleSortChange(option.value)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative ${
              filter.sortBy === option.value
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
            title={option.desc}
          >
            {option.label}
            {filter.sortBy === option.value && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  ), [sortingOptions, filter.sortBy, handleSortChange]);

  // Memoized community metrics
  const communityMetrics = useMemo(() => {
    if (!showCommunityMetrics || !communityId) return null;
    
    return (
      <div className="mb-4">
        <CommunityEngagementMetrics
          communityId={communityId}
          timeRange={filter.timeRange}
        />
      </div>
    );
  }, [showCommunityMetrics, communityId, filter.timeRange]);

  // Memoized trending detector
  const trendingDetector = useMemo(() => (
    <div className="hidden">
      <TrendingContentDetector
        posts={posts}
        onTrendingUpdate={handleTrendingUpdate}
      />
    </div>
  ), [posts, handleTrendingUpdate]);

  // Memoized error state
  const errorState = useMemo(() => {
    if (!error) return null;
    
    return (
      <ErrorState 
        error={error} 
        onRetry={handleRetry} 
      />
    );
  }, [error, handleRetry]);

  // Memoized feed content
  const feedContent = useMemo(() => {
    if (infiniteScroll) {
      return (
        <InfiniteScrollFeed
          key={`${JSON.stringify(filter)}-${refreshKey}`}
          filter={filter}
          onPostsLoad={handlePostsLoad}
          postsPerPage={postsPerPage}
          threshold={1000}
          onError={handleError}
          enableVirtualization={true} // Enable virtual scrolling for better performance
          virtualHeight={isMobile ? 500 : 600} // Adjust height based on device
          itemHeight={isMobile ? 250 : 300} // Adjust item height based on device
        >
          {(feedPosts, scrollState) => (
            <div>
              {/* Render posts */}
              {feedPosts.length === 0 && !scrollState.isLoading && !scrollState.error ? (
                <EmptyFeedState filter={filter} />
              ) : (
                <div className="space-y-4">
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
      );
    } else {
      return (
        <PaginatedFeed
          filter={filter}
          postsPerPage={postsPerPage}
          renderPost={renderPost}
          onPostsUpdate={setPosts}
          convertPost={convertFeedPostToCardPost}
          onError={handleError}
        />
      );
    }
  }, [infiniteScroll, filter, refreshKey, handlePostsLoad, postsPerPage, handleError, isMobile, posts, renderPost, convertFeedPostToCardPost]);

  return (
    <FeedErrorBoundary>
      <div className={`${className}`}>
        {/* Community Metrics - Only show when explicitly enabled */}
        {communityMetrics}

        {/* Trending Content Detector - Hidden, runs in background */}
        {trendingDetector}

        {/* Simplified Header - Show that it's showing all posts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Feed</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {filter.feedSource === 'following' 
                  ? 'Posts from accounts you follow and your own posts' 
                  : 'All posts from the LinkDAO community'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                filter.feedSource === 'following' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}>
                {filter.feedSource === 'following' ? 'Following' : 'All Posts'}
              </span>
            </div>
          </div>
        </div>

        {/* Error state */}
        {errorState}

        {/* Feed Content */}
        {feedContent}

        {/* Liked By Modal */}
        <LikedByModal
          postId={likedByModal.postId}
          isOpen={likedByModal.isOpen}
          onClose={handleCloseLikedBy}
        />
      </div>
    </FeedErrorBoundary>
  );
});

// Add display name and proper comparison function for debugging
EnhancedFeedView.displayName = 'EnhancedFeedView';

// Add proper comparison function for React.memo
const areEqual = (prevProps: EnhancedFeedViewProps, nextProps: EnhancedFeedViewProps) => {
  return (
    prevProps.communityId === nextProps.communityId &&
    prevProps.showCommunityMetrics === nextProps.showCommunityMetrics &&
    prevProps.className === nextProps.className &&
    (prevProps.externalRefreshKey ?? 0) === (nextProps.externalRefreshKey ?? 0) &&
    JSON.stringify(prevProps.initialFilter) === JSON.stringify(nextProps.initialFilter)
  );
};

export default React.memo(EnhancedFeedView, areEqual);

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
        <div className="flex items-center justify-center space-x-4 flex-wrap">
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
      <FeedSkeleton count={3} />
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

// General error state component with enhanced analytics
interface ErrorStateProps {
  error: FeedError;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  // Track error display
  React.useEffect(() => {
    analyticsService.trackUserEvent('feed_error_displayed', {
      error: error.message,
      code: error.code,
      timestamp: error.timestamp
    });
  }, [error]);

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
      <div className="text-red-600 dark:text-red-400 mb-4">
        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-lg font-medium">Something went wrong</h3>
        <p className="text-sm mt-1">{error.message}</p>
        {error.code && (
          <p className="text-xs mt-1 opacity-75">Error code: {error.code}</p>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
        {error.retryable && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            Try Again
          </button>
        )}
        
        <button
          onClick={() => {
            analyticsService.trackUserEvent('feed_refresh_page', {
              error: error.message,
              code: error.code
            });
            window.location.reload();
          }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
        >
          Refresh Page
        </button>
      </div>
      
      {!error.retryable && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          This error may require administrator attention. Please try again later.
        </p>
      )}
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
  onError: (error: FeedError) => void;
}

function PaginatedFeed({ filter, postsPerPage, renderPost, onPostsUpdate, convertPost, onError }: PaginatedFeedProps) {
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
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load posts';
      setError(errorMessage);
      onError({
        code: err.code || 'PAGINATION_ERROR',
        message: errorMessage,
        timestamp: new Date(),
        retryable: true
      });
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
      <div className="space-y-4 mb-6">
        {posts.map(renderPost)}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 flex-wrap">
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
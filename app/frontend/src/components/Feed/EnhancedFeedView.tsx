import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { EnhancedPost as FeedEnhancedPost, FeedFilter, FeedSortType, FeedError } from '../../types/feed';
import { useFeedSortingPreferences, useDisplayPreferences, useAutoRefreshPreferences } from '../../hooks/useFeedPreferences';
import InfiniteScrollFeed from './InfiniteScrollFeed';
import LikedByModal from './LikedByModal';
import TrendingContentDetector, { TrendingBadge } from './TrendingContentDetector';
import CommunityEngagementMetrics from './CommunityEngagementMetrics';
import EnhancedPostCard, { EnhancedPost as CardEnhancedPost } from '../EnhancedPostCard/EnhancedPostCard';
import { useToast } from '@/context/ToastContext';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { analyticsService } from '@/services/analyticsService';
import FeedErrorBoundary from './FeedErrorBoundary';
import { FeedSkeleton } from '@/components/animations/LoadingSkeletons';
import { useAccount } from 'wagmi';
import { useFollowing } from '@/hooks/useFollow';
import { CommunityMembershipService } from '@/services/communityMembershipService';
import { ProfileService } from '@/services/profileService';

// Helper function to validate IPFS CID and construct proper URL
function getAvatarUrl(profileCid: string | undefined): string | undefined {
  if (!profileCid) return undefined;

  // Check if it's a valid IPFS CID
  if (profileCid.startsWith('Qm') || profileCid.startsWith('bafy')) {
    return `https://ipfs.io/ipfs/${profileCid}`;
  }

  // Check if it's already a full URL
  try {
    new URL(profileCid);
    return profileCid;
  } catch {
    // Not a valid URL, return undefined
    return undefined;
  }
}

interface EnhancedPost {
  id: string;
  title: string;
  content: string;
  contentCid: string;  // Add the contentCid property
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

  // Profile cache to avoid repeated API calls
  const profileCacheRef = useRef<Map<string, any>>(new Map());

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
    } catch { }
  }, []);

  // Preferences hooks - now defaults to following feed with newest posts
  const { currentSort, currentTimeRange, updateSort, updateTimeRange } = useFeedSortingPreferences();
  const { showSocialProof, showTrendingBadges, infiniteScroll, postsPerPage } = useDisplayPreferences();
  const { isEnabled: autoRefreshEnabled, interval: refreshInterval } = useAutoRefreshPreferences();

  // State - properly memoized
  const [filter, setFilter] = useState<FeedFilter>({
    sortBy: currentSort,
    timeRange: currentTimeRange,
    feedSource: address ? 'following' : 'all', // Use 'following' for authenticated users
    userAddress: address || '', // Add user address for personalized feed
    ...initialFilter
  });
  const [posts, setPosts] = useState<CardEnhancedPost[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<CardEnhancedPost[]>([]);
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
      feedSource: address ? 'following' : 'all',
      userAddress: address || ''
    }));
  }, [currentSort, currentTimeRange, address]);

  // Refresh the feed when user address changes (e.g., when wallet connects/disconnects)
  useEffect(() => {
    if (address) {
      // Refresh the feed when user connects their wallet
      setRefreshKey(prev => prev + 1);
    }
  }, [address]);

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

  // Convert feed post to card post format with profile fetching - memoized
  const convertFeedPostToCardPost = useCallback(async (feedPost: FeedEnhancedPost): Promise<CardEnhancedPost> => {
    // Fetch profile if not cached
    let profile = profileCacheRef.current.get(feedPost.author);
    if (!profile) {
      try {
        profile = await ProfileService.getProfileByAddress(feedPost.author);
        if (profile) {
          profileCacheRef.current.set(feedPost.author, profile);
        }
      } catch (error) {
        console.error('Failed to fetch profile for', feedPost.author, error);
      }
    }

    // Determine avatar URL with fallback logic
    let avatarUrl: string | undefined;
    if (profile?.avatarCid) {
      avatarUrl = getAvatarUrl(profile.avatarCid);
    } else if (profile?.profileCid) {
      avatarUrl = getAvatarUrl(profile.profileCid);
    } else if (feedPost.profileCid) {
      avatarUrl = getAvatarUrl(feedPost.profileCid);
    }

    return {
      id: feedPost.id,
      title: feedPost.title || '',
      content: feedPost.content || '', // Use content from feed data
      contentCid: feedPost.contentCid, // Add the missing contentCid field
      author: feedPost.author,
      authorProfile: {
        handle: profile?.displayName || profile?.handle || feedPost.handle || feedPost.author.slice(0, 8),
        verified: profile?.verified || false,
        avatar: avatarUrl,
        reputationTier: profile?.reputationTier
      },
      createdAt: feedPost.createdAt,
      updatedAt: feedPost.updatedAt || feedPost.createdAt,
      contentType: feedPost.contentType || 'text',
      media: feedPost.mediaCids,
      previews: (feedPost.previews || []).map(p => ({
        id: p.id || `${feedPost.id}-${p.url}`,
        type: p.type as 'nft' | 'link' | 'proposal' | 'token',
        url: p.url,
        data: p.data || {} as any,
        metadata: p.metadata || {},
        cached: p.cached || false,
        securityStatus: (p.securityStatus as 'safe' | 'warning' | 'blocked') || 'safe'
      })),
      hashtags: feedPost.tags || [],
      mentions: [],
      reactions: feedPost.reactions || [],
      tips: feedPost.tips || [],
      comments: feedPost.comments || 0,
      shares: feedPost.shares || 0,
      views: feedPost.views || 0,
      engagementScore: feedPost.engagementScore || 0,
      reputationScore: feedPost.reputationScore || 0,
      parentId: feedPost.parentId || null,
      mediaCids: feedPost.mediaCids || [],
      onchainRef: feedPost.onchainRef || '',
      stakedValue: feedPost.stakedValue || 0,
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

  // Handle posts loading - memoized (now async to handle profile fetching)
  const handlePostsLoad = useCallback(async (newPosts: FeedEnhancedPost[], page: number) => {
    try {
      // Convert posts with profile fetching
      const convertedPosts = await Promise.all(newPosts.map(convertFeedPostToCardPost));

      // Update posts state based on page number
      setPosts(prevPosts => {
        if (page === 1) {
          return convertedPosts;
        } else {
          // Filter out duplicates just in case
          const existingIds = new Set(prevPosts.map(p => p.id));
          const uniqueNewPosts = convertedPosts.filter(p => !existingIds.has(p.id));
          return [...prevPosts, ...uniqueNewPosts];
        }
      });

      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error('Error converting posts:', err);
      // Don't set global error state here to avoid breaking the entire feed
      // just because some posts failed to convert
    }
  }, [convertFeedPostToCardPost]);

  // Handle trending updates - memoized
  const handleTrendingUpdate = useCallback((trending: CardEnhancedPost[]) => {
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
  const renderPost = useCallback((post: CardEnhancedPost) => (
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
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative ${filter.sortBy === option.value
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
    <div className="text-center py-16 px-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="w-24 h-24 mx-auto mb-6 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center">
        <span className="text-5xl">📭</span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
        No {getSortDescription(filter.sortBy)} found
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
        {filter.communityId
          ? 'This community is quiet right now. Be the first to start a conversation!'
          : 'Your feed is looking a bit empty. Try adjusting your filters or follow more people to see their content here.'
        }
      </p>

      <div className="flex flex-col items-center space-y-6">
        <div className="flex items-center justify-center space-x-3 flex-wrap gap-y-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Active Filters:</span>
          <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium border border-primary-100 dark:border-primary-800">
            {filter.sortBy}
          </span>
          {filter.timeRange && (
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-600">
              {filter.timeRange}
            </span>
          )}
        </div>

        {!filter.communityId && (
          <button className="px-6 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm">
            Explore Communities
          </button>
        )}
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
    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 rounded-xl p-8 text-center shadow-sm">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>

      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Unable to load feed</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
        {error.message || "We encountered an unexpected issue while fetching the latest posts."}
      </p>

      {error.code && (
        <div className="mb-6 inline-block px-3 py-1 bg-red-100 dark:bg-red-900/40 rounded text-xs font-mono text-red-700 dark:text-red-300">
          Error Code: {error.code}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {error.retryable && (
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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
          className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors shadow-sm"
        >
          Refresh Page
        </button>
      </div>

      {!error.retryable && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 border-t border-red-100 dark:border-red-800/30 pt-4">
          If this persists, please contact support or check our status page.
        </p>
      )}
    </div>
  );
}

// Paginated feed component (fallback for when infinite scroll is disabled)
interface PaginatedFeedProps {
  filter: FeedFilter;
  postsPerPage: number;
  renderPost: (post: CardEnhancedPost) => React.ReactNode;
  onPostsUpdate: (posts: CardEnhancedPost[]) => void;
  convertPost: (feedPost: FeedEnhancedPost) => CardEnhancedPost | Promise<CardEnhancedPost>;
  onError: (error: FeedError) => void;
}

function PaginatedFeed({ filter, postsPerPage, renderPost, onPostsUpdate, convertPost, onError }: PaginatedFeedProps) {
  const [posts, setPosts] = useState<CardEnhancedPost[]>([]);
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
      const convertedPosts = await Promise.all(response.posts.map(convertPost));

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
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Heart,
  Share2,
  Bookmark,
  MoreHorizontal,
  Eye,
  TrendingUp,
  Hash,
  Play,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { GlassPanel } from '@/design-system';
import { useToast } from '@/context/ToastContext';
import { useInView } from 'react-intersection-observer';
import { FeedService } from '@/services/feedService';
import { FeedFilter, FeedSortType, EnhancedPost } from '@/types/feed';
import EnhancedPostCard from '@/components/EnhancedPostCard/EnhancedPostCard';

interface EnhancedHomeFeedProps {
  userProfile?: any;
  className?: string;
  externalRefreshKey?: number;
}

export default function EnhancedHomeFeed({
  userProfile,
  className = '',
  externalRefreshKey = 0
}: EnhancedHomeFeedProps) {
  const [posts, setPosts] = useState<EnhancedPost[]>([]);
  const [activeTab, setActiveTab] = useState<'following'>('following');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const LIMIT = 10;
  const { addToast } = useToast();

  // Refs to prevent concurrent requests
  const fetchRequestRef = useRef<string | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_DEBOUNCE_DELAY = 1000; // 1 second between requests

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Use ref to track loading state without causing re-renders in the callback
  const isLoadingRef = useRef(false);

  // Fetch posts function with debouncing and concurrency control
  // IMPORTANT: Do NOT include isLoading in dependencies - use isLoadingRef instead
  // to prevent infinite re-render loops
  const fetchPosts = useCallback(async (pageNum: number, isRefresh: boolean = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    const requestKey = `${activeTab}-${userProfile?.walletAddress || userProfile?.address || 'anonymous'}-${pageNum}`;

    // Prevent concurrent requests and add debouncing - use ref to check loading state
    if (isLoadingRef.current ||
        (fetchRequestRef.current === requestKey) ||
        (timeSinceLastFetch < FETCH_DEBOUNCE_DELAY && !isRefresh)) {
      console.log('[FEED] Skipping fetch - request in progress or debounced');
      return;
    }

    // Set request tracking
    fetchRequestRef.current = requestKey;
    lastFetchTimeRef.current = now;
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const filter: FeedFilter = {
        feedSource: activeTab,
        userAddress: userProfile?.walletAddress || userProfile?.address,
        sortBy: FeedSortType.NEW
      };

      const response = await FeedService.getEnhancedFeed(filter, pageNum, LIMIT);

      if (isRefresh) {
        setPosts(response.posts);
        setPage(2);
      } else {
        setPosts(prevPosts => {
          // Create a Set of existing post IDs for O(1) lookup
          const existingIds = new Set(prevPosts.map(p => p.id));

          // Filter out posts that already exist
          const newPosts = response.posts.filter(p => !existingIds.has(p.id));

          console.log('[FEED] Deduplication:', {
            existingCount: prevPosts.length,
            receivedCount: response.posts.length,
            newCount: newPosts.length,
            duplicatesFiltered: response.posts.length - newPosts.length
          });

          return [...prevPosts, ...newPosts];
        });
        setPage(prevPage => prevPage + 1);
      }

      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Error fetching posts:', error);
      addToast('Failed to load feed', 'error');
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      fetchRequestRef.current = null;
    }
  }, [activeTab, userProfile, addToast]); // Removed isLoading from dependencies

  // Track userProfile address for triggering refresh
  const userAddressRef = useRef<string | undefined>(undefined);

  // Initial load and refresh on tab/profile change
  // Use separate tracking to prevent infinite loops
  useEffect(() => {
    const currentAddress = userProfile?.walletAddress || userProfile?.address;

    // Only fetch if this is initial load or if the user address actually changed
    if (userAddressRef.current !== currentAddress) {
      userAddressRef.current = currentAddress;
      fetchPosts(1, true);
    }
  }, [fetchPosts, userProfile?.walletAddress, userProfile?.address]);

  // Handle external refresh - use a ref to track the last processed key
  const lastExternalRefreshKeyRef = useRef(0);
  useEffect(() => {
    if (externalRefreshKey > 0 && externalRefreshKey !== lastExternalRefreshKeyRef.current) {
      lastExternalRefreshKeyRef.current = externalRefreshKey;
      fetchPosts(1, true);
    }
  }, [externalRefreshKey, fetchPosts]);

  // Load more posts function with concurrency control
  // Use isLoadingRef instead of isLoading to prevent dependency loops
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || isLoadingRef.current) return;

    setLoadingMore(true);
    await fetchPosts(page, false);
    setLoadingMore(false);
  }, [loadingMore, hasMore, fetchPosts, page]);

  // Infinite scroll - use a ref to prevent rapid triggering
  const lastInViewTriggerRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    // Debounce inView triggers to prevent rapid re-fetching
    if (inView && hasMore && !loadingMore && (now - lastInViewTriggerRef.current > 500)) {
      lastInViewTriggerRef.current = now;
      loadMorePosts();
    }
  }, [inView, hasMore, loadingMore, loadMorePosts]);

  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;

    const query = searchQuery.toLowerCase();
    return posts.filter(post =>
      (post.content && post.content.toLowerCase().includes(query)) ||
      (post.authorProfile?.handle && post.authorProfile.handle.toLowerCase().includes(query)) ||
      (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }, [posts, searchQuery]);



  return (
    <div className={className}>
      {/* Enhanced Posts Feed */}
      <div className="space-y-6">
        {filteredPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <EnhancedPostCard
              post={post}
              onReaction={async (postId, type, amount) => {
                // Store the previous count for rollback in case of failure
                const previousReactionCount = posts.find(p => p.id === postId)?.reactionCount || 0;
                
                // Optimistic update
                setPosts(prevPosts => 
                  prevPosts.map(p => 
                    p.id === postId 
                      ? { 
                          ...p, 
                          reactionCount: (p.reactionCount || 0) + 1 
                        } 
                      : p
                  )
                );
                
                try {
                  await FeedService.addReaction(postId, type, amount || 0);
                  addToast('Reaction added successfully!', 'success');
                } catch (error) {
                  // Revert the optimistic update on error
                  setPosts(prevPosts => 
                    prevPosts.map(p => 
                      p.id === postId 
                        ? { 
                            ...p, 
                            reactionCount: previousReactionCount
                          } 
                        : p
                    )
                  );
                  console.error('Error adding reaction:', error);
                  addToast('Failed to add reaction. Please try again.', 'error');
                }
              }}
              onTip={async (postId, amount, token) => {
                if (amount && token) {
                  // Store the previous amount for rollback in case of failure
                  const previousTipAmount = posts.find(p => p.id === postId)?.totalTipAmount || 0;
                  
                  try {
                    await FeedService.sendTip(postId, parseFloat(amount), token, '');
                    // Update the local state to reflect the new tip
                    setPosts(prevPosts => 
                      prevPosts.map(p => 
                        p.id === postId 
                          ? { 
                              ...p, 
                              totalTipAmount: (p.totalTipAmount || 0) + parseFloat(amount)
                            } 
                          : p
                      )
                    );
                    addToast('Tip sent successfully!', 'success');
                  } catch (error) {
                    // Note: We don't revert tip amount here as it's harder to know exact previous state
                    // since multiple people may tip simultaneously
                    console.error('Error sending tip:', error);
                    addToast('Failed to send tip. Please try again.', 'error');
                  }
                }
              }}
              onExpand={() => {
                // Expand the post when clicked
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Load More Trigger */}
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {loadingMore && (
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading more posts...</span>
          </div>
        )}
      </div>

      {/* End of Feed Indicator */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            🎉 You've reached the end!
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loadingMore && posts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No posts yet</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Be the first to post something!
          </p>
        </div>
      )}
    </div>
  );
}
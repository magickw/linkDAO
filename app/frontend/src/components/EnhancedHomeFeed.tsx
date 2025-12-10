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

  // Fetch posts function with debouncing and concurrency control
  const fetchPosts = useCallback(async (pageNum: number, isRefresh: boolean = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    const requestKey = `${activeTab}-${userProfile?.walletAddress || userProfile?.address || 'anonymous'}-${pageNum}`;

    // Prevent concurrent requests and add debouncing
    if (isLoading || 
        (fetchRequestRef.current === requestKey) ||
        (timeSinceLastFetch < FETCH_DEBOUNCE_DELAY && !isRefresh)) {
      console.log('[FEED] Skipping fetch - request in progress or debounced');
      return;
    }

    // Set request tracking
    fetchRequestRef.current = requestKey;
    lastFetchTimeRef.current = now;
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
      setIsLoading(false);
      fetchRequestRef.current = null;
    }
  }, [activeTab, userProfile, addToast, isLoading]);

  // Initial load and refresh on tab/profile change
  useEffect(() => {
    fetchPosts(1, true);
  }, [fetchPosts]);

  // Handle external refresh
  useEffect(() => {
    if (externalRefreshKey > 0) {
      fetchPosts(1, true);
    }
  }, [externalRefreshKey, fetchPosts]);

  // Load more posts function with concurrency control
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || isLoading) return;

    setLoadingMore(true);
    await fetchPosts(page, false);
    setLoadingMore(false);
  }, [loadingMore, hasMore, fetchPosts, page, isLoading]);

  // Infinite scroll
  useEffect(() => {
    if (inView && hasMore && !loadingMore) {
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
                await FeedService.addReaction(postId, type, amount || 0);
                addToast('Reaction added successfully!', 'success');
              }}
              onTip={async (postId, amount, token) => {
                if (amount && token) {
                  await FeedService.sendTip(postId, parseFloat(amount), token, '');
                  addToast('Tip sent successfully!', 'success');
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
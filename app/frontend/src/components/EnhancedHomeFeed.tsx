import { useState, useEffect, useMemo, useCallback } from 'react';
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
import EnhancedPostCard from '@/components/Feed/EnhancedPostCard';

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
  const LIMIT = 10;
  const { addToast } = useToast();

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Fetch posts function
  const fetchPosts = useCallback(async (pageNum: number, isRefresh: boolean = false) => {
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
        setPosts(prevPosts => [...prevPosts, ...response.posts]);
        setPage(prevPage => prevPage + 1);
      }

      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Error fetching posts:', error);
      addToast('Failed to load feed', 'error');
    }
  }, [activeTab, userProfile, addToast]);

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

  // Load more posts function
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    await fetchPosts(page, false);
    setLoadingMore(false);
  }, [loadingMore, hasMore, fetchPosts, page]);

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
      {/* Enhanced Feed Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Feed</h2>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <MessageCircle className="w-4 h-4 mr-1" />
              Following + Yours
            </span>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          See the latest posts from accounts you follow and your own posts
        </p>
      </div>

      {/* Feed Filter - Simplified to only show Following */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-1 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('following')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'following'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
          >
            <MessageCircle className="w-4 h-4 inline mr-1" />
            Following + Yours
          </button>
        </div>
      </div>

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
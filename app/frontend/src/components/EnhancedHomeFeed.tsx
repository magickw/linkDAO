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

  // Handle bookmark toggle
  const handleBookmark = (postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
            ...post,
            isBookmarked: !post.isBookmarked
          }
          : post
      )
    );
  };

  // Handle like toggle
  // Note: This is a local optimistic update. In a real app, you'd call an API.
  const handleLike = (postId: string) => {
    // TODO: Implement API call for liking
    console.log('Liked post:', postId);
  };

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
            <GlassPanel className="p-0 overflow-hidden hover:shadow-lg transition-all duration-300">
              {/* Post Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img
                        src={post.authorProfile?.avatar || `https://ui-avatars.com/api/?name=${post.authorProfile?.handle || post.author}&background=random`}
                        alt={post.authorProfile?.handle || post.author}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {post.authorProfile?.handle || post.author.slice(0, 8)}
                        </h3>
                        {post.authorProfile?.verified && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>{post.views?.toLocaleString() || 0}</span>
                        </div>
                        {post.trendingStatus === 'trending' && (
                          <>
                            <span>•</span>
                            <div className="flex items-center space-x-1 text-orange-500">
                              <TrendingUp className="w-4 h-4" />
                              <span>Trending</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleBookmark(post.id)}
                    className={`p-2 rounded-lg transition-colors ${post.isBookmarked
                      ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                      }`}
                  >
                    <Bookmark className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Post Content */}
              <div className="px-6 pb-4">
                <p className="text-gray-900 dark:text-white leading-relaxed">
                  {post.content}
                </p>

                {/* Hashtags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {post.tags.map((hashtag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                      >
                        <Hash className="w-3 h-3 mr-1" />
                        {hashtag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Media Content */}
              {/* Note: EnhancedPost has mediaCids (string[]) or media (string[]). We assume they are URLs or CIDs */}
              {/* We'll check for 'media' property first which is added by convertBackendPostToPost */}
              {((post as any).media && (post as any).media.length > 0) && (
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-1 gap-3">
                    {(post as any).media.map((mediaUrl: string, mediaIndex: number) => (
                      <div key={mediaIndex} className="relative rounded-xl overflow-hidden">
                        <img
                          src={mediaUrl.startsWith('http') ? mediaUrl : `https://ipfs.io/ipfs/${mediaUrl}`}
                          alt="Post media"
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Post Actions */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center space-x-2 transition-colors text-gray-500 hover:text-red-500`}
                    >
                      <Heart className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {post.reactionCount || post.reactions?.length || 0}
                      </span>
                    </button>

                    <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {post.comments || 0}
                      </span>
                    </button>

                    <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors">
                      <Share2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Share</span>
                    </button>
                  </div>

                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </GlassPanel>
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
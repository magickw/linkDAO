import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  Heart, 
  Share2, 
  Bookmark, 
  MoreHorizontal, 
  Eye,
  TrendingUp,
  Clock,
  Award,
  Zap,
  Hash,
  Play,
  ExternalLink,
  Sparkles,
  ThumbsUp,
  Flame,
  Star
} from 'lucide-react';
import { GlassPanel } from '@/design-system';
import { useToast } from '@/context/ToastContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAccount } from 'wagmi';
import { useInView } from 'react-intersection-observer';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

// ... existing imports ...

interface EnhancedPost {
  id: string;
  author: string;
  authorProfile: {
    handle: string;
    avatar?: string;
    isOnline?: boolean;
    verified?: boolean;
    ens?: string;
  };
  content: string;
  contentCid: string;  // Add the contentCid property
  timestamp: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    hasLiked: boolean;
    hasBookmarked: boolean;
  };
  hashtags: string[];
  media?: {
    type: 'image' | 'video' | 'link';
    url: string;
    title?: string;
    description?: string;
    thumbnail?: string;
  }[];
  trending?: boolean;
  web3Data?: {
    tokenAmount?: string;
    tokenSymbol?: string;
    transactionHash?: string;
  };
}

interface EnhancedHomeFeedProps {
  onPostSubmit: (content: string) => void;
  isLoading: boolean;
  userProfile?: any;
  className?: string;
}

export default function EnhancedHomeFeed({
  onPostSubmit,
  isLoading,
  userProfile,
  className = ''
}: EnhancedHomeFeedProps) {
  const [posts, setPosts] = useState<EnhancedPost[]>([]);
  const [activeTab, setActiveTab] = useState<'following'>('following');
  const [showNewPostsBanner, setShowNewPostsBanner] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'following'>('following');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Initialize with empty posts array instead of mock data
  useEffect(() => {
    setPosts([]);
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (inView && hasMore && !loadingMore) {
      loadMorePosts();
    }
  }, [inView, hasMore, loadingMore]);

  // Load more posts function
  const loadMorePosts = async () => {
    if (loadingMore) return;
    
    setLoadingMore(true);
    
    try {
      // In a real implementation, this would fetch from your API
      // For now, we'll simulate loading more posts
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate reaching the end of posts
      setHasMore(false);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;
    
    const query = searchQuery.toLowerCase();
    return posts.filter(post => 
      post.content.toLowerCase().includes(query) ||
      post.authorProfile.handle.toLowerCase().includes(query) ||
      post.hashtags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [posts, searchQuery]);

  // Handle bookmark toggle
  const handleBookmark = (postId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              engagement: { 
                ...post.engagement, 
                hasBookmarked: !post.engagement.hasBookmarked 
              } 
            }
          : post
      )
    );
  };

  // Handle like toggle
  const handleLike = (postId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              engagement: { 
                ...post.engagement, 
                likes: post.engagement.hasLiked 
                  ? post.engagement.likes - 1 
                  : post.engagement.likes + 1,
                hasLiked: !post.engagement.hasLiked
              } 
            }
          : post
      )
    );
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
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'following'
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
                        src={post.authorProfile.avatar || `https://ui-avatars.com/api/?name=${post.authorProfile.handle}&background=random`}
                        alt={post.authorProfile.handle}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {post.authorProfile.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {post.authorProfile.handle}
                        </h3>
                        {post.authorProfile.verified && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {post.authorProfile.ens && (
                          <span className="text-sm text-primary-600 dark:text-primary-400">
                            {post.authorProfile.ens}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>{post.engagement.views.toLocaleString()}</span>
                        </div>
                        {post.trending && (
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
                    className={`p-2 rounded-lg transition-colors ${
                      post.engagement.hasBookmarked
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
                {post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {post.hashtags.map((hashtag) => (
                      <span
                        key={hashtag}
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
              {post.media && post.media.length > 0 && (
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-1 gap-3">
                    {post.media.map((media, mediaIndex) => (
                      <div key={mediaIndex} className="relative rounded-xl overflow-hidden">
                        {media.type === 'image' && (
                          <img
                            src={media.url}
                            alt={media.title || 'Post image'}
                            className="w-full h-auto object-cover"
                          />
                        )}
                        {media.type === 'video' && (
                          <div className="relative">
                            <img
                              src={media.thumbnail || media.url}
                              alt={media.title || 'Video thumbnail'}
                              className="w-full h-64 object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center">
                                <Play className="w-8 h-8 text-white ml-1" />
                              </div>
                            </div>
                          </div>
                        )}
                        {media.type === 'link' && (
                          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                            <div className="flex items-start space-x-3">
                              <ExternalLink className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {media.title}
                                </h4>
                                {media.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {media.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Web3 Data */}
              {post.web3Data && (
                <div className="px-6 pb-4">
                  <div className="bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-primary-200 dark:border-primary-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Sparkles className="w-5 h-5 text-primary-600" />
                      <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
                        Web3 Transaction
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        {post.web3Data.tokenAmount && (
                          <span className="text-lg font-bold text-primary-900 dark:text-primary-100">
                            {post.web3Data.tokenAmount} {post.web3Data.tokenSymbol}
                          </span>
                        )}
                      </div>
                      {post.web3Data.transactionHash && (
                        <a
                          href={`https://etherscan.io/tx/${post.web3Data.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                        >
                          View on Etherscan
                          <ExternalLink className="w-4 h-4 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Post Actions */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center space-x-2 transition-colors ${
                        post.engagement.hasLiked
                          ? 'text-red-500'
                          : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${post.engagement.hasLiked ? 'fill-current' : ''}`} />
                      <span className="text-sm font-medium">
                        {post.engagement.likes > 0 ? post.engagement.likes : 'Like'}
                      </span>
                    </button>
                    
                    <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {post.engagement.comments > 0 ? post.engagement.comments : 'Comment'}
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
    </div>
  );
}
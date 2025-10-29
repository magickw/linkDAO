/**
 * Enhanced Home Feed Component
 * Implements all the suggested UX improvements for LinkDAO home/feed interface
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Clock,
  Users,
  Eye,
  ChevronUp,
  Sparkles,
  Image as ImageIcon,
  Play,
  ExternalLink,
  Hash,
  Zap,
  Award,
  Filter,
  Search,
  Bell,
  Bookmark
} from 'lucide-react';
// Simple useInView hook replacement
const useInView = (options: { threshold: number; triggerOnce: boolean }) => {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: options.threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options.threshold]);

  return { ref, inView };
};
import FacebookStylePostComposer from './FacebookStylePostComposer';
import { GlassPanel } from '@/design-system';
import { CreatePostInput } from '@/models/Post';

interface EnhancedPost {
  id: string;
  author: string;
  authorProfile: {
    handle: string;
    ens?: string;
    avatar: string;
    verified: boolean;
    reputation: number;
    isOnline: boolean;
  };
  content: string;
  media?: {
    type: 'image' | 'video' | 'link';
    url: string;
    thumbnail?: string;
    title?: string;
    description?: string;
  }[];
  hashtags: string[];
  mentions: string[];
  timestamp: Date;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    hasLiked: boolean;
    hasBookmarked: boolean;
  };
  trending?: {
    score: number;
    velocity: number;
  };
  web3Data?: {
    tokenAmount?: string;
    tokenSymbol?: string;
    transactionHash?: string;
    nftContract?: string;
    nftTokenId?: string;
  };
}

interface EnhancedHomeFeedProps {
  onPostSubmit: (postData: CreatePostInput) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [showNewPostsBanner, setShowNewPostsBanner] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'following' | 'communities'>('all');
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

  const loadMorePosts = useCallback(async () => {
    setLoadingMore(true);
    // Simulate API call - in a real implementation, this would fetch actual data
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real implementation, we would fetch more posts from the API
    // For now, we'll just stop loading more since we're not using mock data
    setLoadingMore(false);
    setHasMore(false); // Stop infinite scroll since we're not adding mock data
    
  }, []);

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? {
            ...post,
            engagement: {
              ...post.engagement,
              likes: post.engagement.hasLiked 
                ? post.engagement.likes - 1 
                : post.engagement.likes + 1,
              hasLiked: !post.engagement.hasLiked,
            }
          }
        : post
    ));
  };

  const handleBookmark = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? {
            ...post,
            engagement: {
              ...post.engagement,
              hasBookmarked: !post.engagement.hasBookmarked,
            }
          }
        : post
    ));
  };

  const handleShare = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      navigator.clipboard.writeText(`Check out this post: ${window.location.origin}/post/${postId}`);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (selectedFilter === 'following') {
      // In a real implementation, this would check if the user follows the post author
      return true;
    }
    if (selectedFilter === 'communities') {
      // In a real implementation, this would check if the post is from a community the user belongs to
      return true;
    }
    return true;
  }).filter(post => 
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.hashtags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const showNewPosts = () => {
    setShowNewPostsBanner(false);
    setNewPostsCount(0);
    // Scroll to top and refresh feed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* Enhanced Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search posts, hashtags, or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400 cursor-pointer hover:text-primary-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Post Composer */}
      <FacebookStylePostComposer
        onSubmit={onPostSubmit}
        isLoading={isLoading}
        userName={userProfile?.handle || userProfile?.ens || 'You'}
        className="mb-6"
      />

      {/* New Posts Banner */}
      <AnimatePresence>
        {showNewPostsBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="mb-6"
          >
            <button
              onClick={showNewPosts}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-colors"
            >
              <ChevronUp className="w-5 h-5" />
              <span>Show {newPostsCount} new posts</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Feed Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-1 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm">
          {(['hot', 'new', 'top', 'rising'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {tab === 'hot' && <TrendingUp className="w-4 h-4 inline mr-1" />}
              {tab === 'new' && <Clock className="w-4 h-4 inline mr-1" />}
              {tab === 'top' && <Award className="w-4 h-4 inline mr-1" />}
              {tab === 'rising' && <Zap className="w-4 h-4 inline mr-1" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as any)}
            className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Posts</option>
            <option value="following">Following</option>
            <option value="communities">Communities</option>
          </select>
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
                        src={post.authorProfile.avatar}
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
                        <button className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                          View on Etherscan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Engagement Bar */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
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
                        {post.engagement.likes.toLocaleString()}
                      </span>
                    </button>
                    
                    <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {post.engagement.comments.toLocaleString()}
                      </span>
                    </button>
                    
                    <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors">
                      <Share2 className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {post.engagement.shares.toLocaleString()}
                      </span>
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{post.engagement.views.toLocaleString()} views</span>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        ))}

        {/* Load More Trigger */}
        <div ref={loadMoreRef} className="py-8">
          {loadingMore && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          )}
          {!hasMore && (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p>You've reached the end of the feed!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/**
 * Enhanced Post Card Component
 * Implements visual hierarchy, better engagement metrics, and improved UX
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Eye,
  TrendingUp,
  ExternalLink,
  Hash,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Copy,
  Flag,
  UserPlus,
  Zap,
  Award,
  Clock,
  Globe,
  Lock,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { GlassPanel } from '@/design-system';

interface PostMedia {
  type: 'image' | 'video' | 'link' | 'nft';
  url: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    size?: string;
    // Allow additional properties but maintain type safety
    [key: string]: unknown;
  };
}

interface PostAuthor {
  id: string;
  handle: string;
  ens?: string;
  avatar: string;
  verified: boolean;
  reputation: number;
  isOnline: boolean;
  followerCount: number;
  isFollowing: boolean;
}

interface PostEngagement {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  bookmarks: number;
  hasLiked: boolean;
  hasBookmarked: boolean;
  hasShared: boolean;
  recentLikers: PostAuthor[];
}

// Helper functions for type-safe media handling
const hasValidDuration = (metadata?: PostMedia['metadata']): boolean => {
  return metadata?.duration !== undefined && 
         typeof metadata.duration === 'number' && 
         metadata.duration > 0;
};

const formatDuration = (duration: number): string => {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getHostnameFromUrl = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

interface EnhancedPost {
  id: string;
  author: PostAuthor;
  content: string;
  media?: PostMedia[];
  hashtags: string[];
  mentions: string[];
  timestamp: Date;
  engagement: PostEngagement;
  visibility: 'public' | 'followers' | 'community';
  community?: {
    id: string;
    name: string;
    avatar: string;
  };
  trending?: {
    score: number;
    velocity: number;
    rank?: number;
  };
  web3Data?: {
    tokenAmount?: string;
    tokenSymbol?: string;
    transactionHash?: string;
    nftContract?: string;
    nftTokenId?: string;
    gasUsed?: string;
  };
  isPinned?: boolean;
  isSponsored?: boolean;
}

interface EnhancedPostCardProps {
  post: EnhancedPost;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onFollow: (userId: string) => void;
  onReport: (postId: string) => void;
  className?: string;
  showFullContent?: boolean;
}

export default function EnhancedPostCard({
  post,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onFollow,
  onReport,
  className = '',
  showFullContent = false
}: EnhancedPostCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [isExpanded, setIsExpanded] = useState(showFullContent);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const handleVideoToggle = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const getVisibilityIcon = () => {
    switch (post.visibility) {
      case 'public': return <Globe className="w-3 h-3" />;
      case 'followers': return <Users className="w-3 h-3" />;
      case 'community': return <Lock className="w-3 h-3" />;
      default: return <Globe className="w-3 h-3" />;
    }
  };

  const shouldTruncateContent = post.content.length > 280 && !isExpanded;
  const displayContent = shouldTruncateContent 
    ? post.content.slice(0, 280) + '...' 
    : post.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${className}`}
    >
      <GlassPanel className="p-0 hover:shadow-xl transition-all duration-300 group">
        {/* Trending/Pinned Badge */}
        {(post.trending || post.isPinned || post.isSponsored) && (
          <div className="absolute top-4 right-4 z-10 flex space-x-2">
            {post.isPinned && (
              <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                <Award className="w-3 h-3" />
                <span>Pinned</span>
              </div>
            )}
            {post.trending && (
              <div className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>#{post.trending.rank || 'Hot'}</span>
              </div>
            )}
            {post.isSponsored && (
              <div className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                Sponsored
              </div>
            )}
          </div>
        )}

        {/* Post Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {/* Author Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={post.author.avatar}
                  alt={post.author.handle}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm"
                />
                {post.author.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                )}
                {post.author.verified && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Author Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {post.author.handle}
                  </h3>
                  {post.author.ens && (
                    <span className="text-sm text-primary-600 dark:text-primary-400 truncate">
                      {post.author.ens}
                    </span>
                  )}
                  {!post.author.isFollowing && (
                    <button
                      onClick={() => onFollow(post.author.id)}
                      className="ml-2 px-2 py-1 bg-primary-100 hover:bg-primary-200 dark:bg-primary-900 dark:hover:bg-primary-800 text-primary-700 dark:text-primary-300 text-xs font-medium rounded-full transition-colors flex items-center space-x-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Follow</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{formatTimeAgo(post.timestamp)}</span>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    {getVisibilityIcon()}
                    <span className="capitalize">{post.visibility}</span>
                  </div>
                  {post.community && (
                    <>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <img
                          src={post.community.avatar}
                          alt={post.community.name}
                          className="w-4 h-4 rounded-full"
                        />
                        <span>{post.community.name}</span>
                      </div>
                    </>
                  )}
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{formatNumber(post.engagement.views)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20"
                  >
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy Link</span>
                    </button>
                    <button
                      onClick={() => {
                        onReport(post.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                    >
                      <Flag className="w-4 h-4" />
                      <span>Report</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="px-6 pb-4">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
              {displayContent}
            </p>
            
            {shouldTruncateContent && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium mt-2 flex items-center space-x-1"
              >
                <span>Show more</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            )}

            {isExpanded && post.content.length > 280 && (
              <button
                onClick={() => setIsExpanded(false)}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium mt-2 flex items-center space-x-1"
              >
                <span>Show less</span>
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Hashtags */}
          {post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.hashtags.map((hashtag) => (
                <button
                  key={hashtag}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                >
                  <Hash className="w-3 h-3 mr-1" />
                  {hashtag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Media Content */}
        {post.media && post.media.length > 0 && (
          <div className="px-6 pb-4">
            <div className="grid grid-cols-1 gap-3">
              {post.media.map((media, index) => (
                <div key={index} className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {media.type === 'image' && (
                    <img
                      src={media.url}
                      alt={media.title || 'Post image'}
                      className="w-full h-auto object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                      onClick={() => {/* Open image modal */}}
                    />
                  )}
                  
                  {media.type === 'video' && (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        src={media.url}
                        poster={media.thumbnail}
                        className="w-full h-auto object-cover"
                        muted={isMuted}
                        loop
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleVideoToggle}
                            className="w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                          >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                          </button>
                          <button
                            onClick={handleMuteToggle}
                            className="w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                          >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      {hasValidDuration(media.metadata) && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {formatDuration(media.metadata.duration!)}
                        </div>
                      )}
                    </div>
                  )}

                  {media.type === 'link' && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                      <div className="flex items-start space-x-3">
                        <ExternalLink className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2">
                            {media.title}
                          </h4>
                          {media.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {media.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                            {getHostnameFromUrl(media.url)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {media.type === 'nft' && (
                    <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center space-x-2 mb-3">
                        <Zap className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800 dark:text-purple-200">NFT</span>
                      </div>
                      <img
                        src={media.url}
                        alt={media.title || 'NFT'}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                      <h4 className="font-medium text-gray-900 dark:text-white">{media.title}</h4>
                      {media.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{media.description}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Web3 Transaction Data */}
        {post.web3Data && (
          <div className="px-6 pb-4">
            <div className="bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-primary-200 dark:border-primary-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-primary-600" />
                  <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
                    Web3 Transaction
                  </span>
                </div>
                {post.web3Data.transactionHash && (
                  <button className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center space-x-1">
                    <ExternalLink className="w-3 h-3" />
                    <span>View on Explorer</span>
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {post.web3Data.tokenAmount && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                    <p className="font-semibold text-primary-900 dark:text-primary-100">
                      {post.web3Data.tokenAmount} {post.web3Data.tokenSymbol}
                    </p>
                  </div>
                )}
                {post.web3Data.gasUsed && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Gas Used:</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {post.web3Data.gasUsed}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Engagement Section */}
        <div className="px-6 py-4 border-t border-gray-100/50 dark:border-gray-700/50">
          {/* Engagement Summary */}
          {post.engagement.recentLikers.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowLikers(!showLikers)}
                className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <div className="flex -space-x-1">
                  {post.engagement.recentLikers.slice(0, 3).map((liker, index) => (
                    <img
                      key={liker.id}
                      src={liker.avatar}
                      alt={liker.handle}
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800"
                      style={{ zIndex: 3 - index }}
                    />
                  ))}
                </div>
                <span>
                  Liked by {post.engagement.recentLikers[0]?.handle}
                  {post.engagement.likes > 1 && ` and ${formatNumber(post.engagement.likes - 1)} others`}
                </span>
              </button>

              <AnimatePresence>
                {showLikers && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2"
                  >
                    {post.engagement.recentLikers.slice(0, 5).map((liker) => (
                      <div key={liker.id} className="flex items-center space-x-2">
                        <img
                          src={liker.avatar}
                          alt={liker.handle}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">{liker.handle}</span>
                        {liker.verified && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onLike(post.id)}
                className={`flex items-center space-x-2 transition-colors ${
                  post.engagement.hasLiked
                    ? 'text-red-500'
                    : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <Heart className={`w-5 h-5 ${post.engagement.hasLiked ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">
                  {formatNumber(post.engagement.likes)}
                </span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onComment(post.id)}
                className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {formatNumber(post.engagement.comments)}
                </span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onShare(post.id)}
                className={`flex items-center space-x-2 transition-colors ${
                  post.engagement.hasShared
                    ? 'text-green-500'
                    : 'text-gray-500 hover:text-green-500'
                }`}
              >
                <Share2 className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {formatNumber(post.engagement.shares)}
                </span>
              </motion.button>
            </div>

            <div className="flex items-center space-x-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onBookmark(post.id)}
                className={`p-2 rounded-lg transition-colors ${
                  post.engagement.hasBookmarked
                    ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                }`}
              >
                <Bookmark className="w-5 h-5" />
              </motion.button>

              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{formatNumber(post.engagement.views)}</span>
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
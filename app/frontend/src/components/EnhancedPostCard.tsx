/**
 * Enhanced Post Card Component with HTML & Markdown Support
 * Implements visual hierarchy, better engagement metrics, and improved UX
 */

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { processContent, shouldTruncateContent, getTruncatedContent, formatTimestamp } from '@/utils/contentParser';
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
  ChevronUp,
  ArrowUp,
  ArrowDown
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
    [key: string]: unknown;
  };
}

interface PostStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  tips: {
    amount: number;
    currency: string;
  }[];
}

interface PostAuthor {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
  role?: string;
  reputation?: number;
}

interface Post {
  id: string;
  author: PostAuthor;
  content: string;
  contentType: 'text' | 'html' | 'markdown';
  media?: PostMedia[];
  stats: PostStats;
  timestamp: Date;
  visibility: 'public' | 'followers' | 'community';
  isPinned: boolean;
  isSponsored: boolean;
  trending: boolean;
  tags?: string[];
  stakedAmount?: number;
  upvotes?: number;
  downvotes?: number;
  userVote?: 'up' | 'down' | null;
  community?: {
    id: string;
    name: string;
    displayName: string;
    slug: string;
    avatar?: string;
  };
}

interface EnhancedPostCardProps {
  post: Post;
  className?: string;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onSave?: (postId: string) => void;
  onTip?: (postId: string, amount: number) => void;
  onVote?: (postId: string, voteType: 'up' | 'down') => void;
  onStake?: (postId: string, amount: number) => void;
  showActions?: boolean;
  compact?: boolean;
}



export const EnhancedPostCard: React.FC<EnhancedPostCardProps> = ({
  post,
  className = '',
  onLike,
  onComment,
  onShare,
  onSave,
  onTip,
  onVote,
  onStake,
  showActions = true,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(post.userVote || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const shouldTruncate = shouldTruncateContent(post.content, 280, isExpanded);
  const displayContent = getTruncatedContent(post.content, 280, isExpanded);

  const getVisibilityIcon = () => {
    switch (post.visibility) {
      case 'public': return <Globe className="w-3 h-3" />;
      case 'followers': return <Users className="w-3 h-3" />;
      case 'community': return <Lock className="w-3 h-3" />;
      default: return <Globe className="w-3 h-3" />;
    }
  };

  const handleVote = (voteType: 'up' | 'down') => {
    const newVote = userVote === voteType ? null : voteType;
    setUserVote(newVote);
    if (onVote) {
      onVote(post.id, voteType);
    }
  };



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
              <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>Trending</span>
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
            <div className="flex items-start space-x-3">
              {/* Author Avatar */}
              <div className="relative">
                <img
                  src={post.author.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.id}`}
                  alt={post.author.displayName}
                  className="w-10 h-10 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                />
                {post.author.verified && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
                    <Award className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Author Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {post.author.displayName}
                  </h3>
                  {post.author.role && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                      {post.author.role}
                    </span>
                  )}
                  {getVisibilityIcon()}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>@{post.author.username}</span>
                  {post.community && (
                    <>
                      <span>•</span>
                      <Link
                        href={`/communities/${post.community.slug || post.community.id}`}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {post.community.avatar && (
                          <span className="text-sm">{post.community.avatar}</span>
                        )}
                        <span>c/{post.community.displayName}</span>
                      </Link>
                    </>
                  )}
                  <span>•</span>
                  <span>{formatTimestamp(post.timestamp)}</span>
                </div>
              </div>
            </div>

            {/* More Options */}
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Post Content */}
          <div className="mt-4 prose prose-sm max-w-none dark:prose-invert">
            <div className="text-gray-900 dark:text-white leading-relaxed">
              {processContent(displayContent, post.contentType)}
            </div>

            {shouldTruncate && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium mt-2 flex items-center space-x-1"
              >
                <span>Show more</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            )}

            {isExpanded && shouldTruncateContent(post.content, 280, false) && (
              <button
                onClick={() => setIsExpanded(false)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium mt-2 flex items-center space-x-1"
              >
                <span>Show less</span>
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center space-x-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full"
                >
                  <Hash className="w-3 h-3" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          )}

          {/* Media Content */}
          {post.media && post.media.length > 0 && (
            <div className="mt-4 space-y-4">
              {post.media.map((media, index) => (
                <div key={index} className="relative group">
                  {media.type === 'image' && (
                    <img
                      src={media.url}
                      alt={media.title || 'Post image'}
                      className="w-full rounded-lg object-cover max-h-96"
                      loading="lazy"
                    />
                  )}
                  {media.type === 'video' && (
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        src={media.url}
                        className="w-full max-h-96"
                        controls={false}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              if (isPlaying) {
                                videoRef.current.pause();
                              } else {
                                videoRef.current.play();
                              }
                              setIsPlaying(!isPlaying);
                            }
                          }}
                          className="bg-white/80 hover:bg-white rounded-full p-3 transition-colors"
                        >
                          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </button>
                      </div>
                    </div>
                  )}
                  {media.type === 'link' && (
                    <a
                      href={media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        {media.thumbnail && (
                          <img
                            src={media.thumbnail}
                            alt={media.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {media.title}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {media.description}
                          </p>
                          <div className="flex items-center space-x-1 mt-1">
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-400">External link</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Post Actions */}
        {showActions && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              {/* Left Actions */}
              <div className="flex items-center space-x-6">
                {/* Vote Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleVote('up')}
                    className={`flex items-center space-x-1 transition-colors ${userVote === 'up'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    <ArrowUp className="w-5 h-5" />
                    <span className="text-sm font-medium">{post.upvotes || 0}</span>
                  </button>
                  <button
                    onClick={() => handleVote('down')}
                    className={`flex items-center space-x-1 transition-colors ${userVote === 'down'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    <ArrowDown className="w-5 h-5" />
                    <span className="text-sm font-medium">{post.downvotes || 0}</span>
                  </button>
                </div>

                {/* Comments */}
                <button
                  onClick={() => onComment?.(post.id)}
                  className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{post.stats.comments}</span>
                </button>

                {/* Share */}
                <button
                  onClick={() => onShare?.(post.id)}
                  className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm">{post.stats.shares}</span>
                </button>

                {/* Tip */}
                <button
                  onClick={() => onTip?.(post.id, 1)}
                  className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <Zap className="w-5 h-5" />
                  <span className="text-sm">Tip</span>
                </button>

                {/* Save */}
                <button
                  onClick={() => {
                    setIsSaved(!isSaved);
                    onSave?.(post.id);
                  }}
                  className={`flex items-center space-x-2 transition-colors ${isSaved
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                  <span className="text-sm">{isSaved ? 'Saved' : 'Save'}</span>
                </button>
              </div>

              {/* Right Info */}
              <div className="flex items-center space-x-4">
                {/* Views */}
                <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                  <Eye className="w-5 h-5" />
                  <span className="text-sm">{post.stats.views}</span>
                </div>

                {/* Staked Amount */}
                {post.stakedAmount !== undefined && (
                  <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400">
                    <Zap className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {post.stakedAmount} $LDAO staked
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </GlassPanel>
    </motion.div>
  );
};

export default EnhancedPostCard;
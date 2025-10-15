import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowUpIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  BookmarkIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { 
  ArrowUpIcon as ArrowUpIconSolid,
  BookmarkIcon as BookmarkIconSolid
} from '@heroicons/react/24/solid';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import Web3SwipeGestureHandler from './Web3SwipeGestureHandler';

interface CompactWeb3PostCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    author: {
      name: string;
      avatar: string;
      address: string;
    };
    community: {
      name: string;
      avatar: string;
    };
    metrics: {
      upvotes: number;
      comments: number;
      views: number;
      stakingAmount: number;
      stakerCount: number;
    };
    timestamp: string;
    isUpvoted: boolean;
    isSaved: boolean;
    postType: 'governance' | 'discussion' | 'showcase';
    onChainProof?: boolean;
  };
  onUpvote: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onTip: () => void;
  onStake: () => void;
  onViewPost: () => void;
  walletConnected?: boolean;
  className?: string;
}

export const CompactWeb3PostCard: React.FC<CompactWeb3PostCardProps> = ({
  post,
  onUpvote,
  onComment,
  onShare,
  onSave,
  onTip,
  onStake,
  onViewPost,
  walletConnected = false,
  className = ''
}) => {
  const { triggerHapticFeedback, touchTargetClasses } = useMobileOptimization();
  const [showFullContent, setShowFullContent] = useState(false);

  const postTypeColors = {
    governance: 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-900/10',
    discussion: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
    showcase: 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10'
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const truncateContent = (content: string, maxLength: number = 120) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <Web3SwipeGestureHandler
      postId={post.id}
      onUpvote={onUpvote}
      onSave={onSave}
      onTip={onTip}
      onStake={onStake}
      walletConnected={walletConnected}
      className={className}
    >  
      <motion.article
        className={`
          bg-white dark:bg-gray-800 rounded-xl border-l-4
          ${postTypeColors[post.postType]}
          shadow-sm hover:shadow-md transition-shadow duration-200
          overflow-hidden
        `}
        whileTap={{ scale: 0.98 }}
        layout
      >
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center space-x-3 mb-3">
            {/* Community Avatar */}
            <img
              src={post.community.avatar}
              alt={post.community.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            
            {/* Author Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  r/{post.community.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {post.timestamp}
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                  u/{post.author.name}
                </span>
                {post.onChainProof && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="On-chain verified" />
                )}
              </div>
            </div>

            {/* Post Type Badge */}
            <div className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${post.postType === 'governance' 
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : post.postType === 'discussion'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
              }
            `}>
              {post.postType}
            </div>
          </div>

          {/* Title */}
          <button
            onClick={onViewPost}
            className="text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">
              {post.title}
            </h3>
          </button>

          {/* Content */}
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            className="text-left w-full focus:outline-none"
          >
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {showFullContent ? post.content : truncateContent(post.content)}
              {post.content.length > 120 && (
                <span className="text-blue-500 dark:text-blue-400 ml-1">
                  {showFullContent ? ' Show less' : ' Show more'}
                </span>
              )}
            </p>
          </button>
        </div>

        {/* Web3 Metrics Bar */}
        {(post.metrics.stakingAmount > 0 || walletConnected) && (
          <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                {post.metrics.stakingAmount > 0 && (
                  <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400">
                    <ChartBarIcon className="w-3 h-3" />
                    <span>{formatNumber(post.metrics.stakingAmount)} staked</span>
                    <span className="text-gray-500">({post.metrics.stakerCount})</span>
                  </div>
                )}
              </div>
              
              {walletConnected && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={onTip}
                    className={`
                      ${touchTargetClasses}
                      flex items-center space-x-1 px-2 py-1 rounded-full
                      bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300
                      hover:bg-green-200 dark:hover:bg-green-900/50
                      transition-colors duration-200
                    `}
                  >
                    <CurrencyDollarIcon className="w-3 h-3" />
                    <span>Tip</span>
                  </button>
                  
                  <button
                    onClick={onStake}
                    className={`
                      ${touchTargetClasses}
                      flex items-center space-x-1 px-2 py-1 rounded-full
                      bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300
                      hover:bg-purple-200 dark:hover:bg-purple-900/50
                      transition-colors duration-200
                    `}
                  >
                    <ArrowUpIcon className="w-3 h-3" />
                    <span>Boost</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {/* Left Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  triggerHapticFeedback('light');
                  onUpvote();
                }}
                className={`
                  ${touchTargetClasses}
                  flex items-center space-x-1
                  ${post.isUpvoted 
                    ? 'text-red-500 dark:text-red-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'
                  }
                  transition-colors duration-200
                `}
              >
                {post.isUpvoted ? (
                  <ArrowUpIconSolid className="w-5 h-5" />
                ) : (
                  <ArrowUpIcon className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">
                  {formatNumber(post.metrics.upvotes)}
                </span>
              </button>

              <button
                onClick={() => {
                  triggerHapticFeedback('light');
                  onComment();
                }}
                className={`
                  ${touchTargetClasses}
                  flex items-center space-x-1 text-gray-500 dark:text-gray-400
                  hover:text-blue-500 dark:hover:text-blue-400
                  transition-colors duration-200
                `}
              >
                <ChatBubbleLeftIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {formatNumber(post.metrics.comments)}
                </span>
              </button>

              <div className="flex items-center space-x-1 text-gray-400 dark:text-gray-500">
                <EyeIcon className="w-4 h-4" />
                <span className="text-xs">
                  {formatNumber(post.metrics.views)}
                </span>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  triggerHapticFeedback('light');
                  onShare();
                }}
                className={`
                  ${touchTargetClasses}
                  p-2 text-gray-500 dark:text-gray-400
                  hover:text-blue-500 dark:hover:text-blue-400
                  transition-colors duration-200
                `}
              >
                <ShareIcon className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  triggerHapticFeedback('light');
                  onSave();
                }}
                className={`
                  ${touchTargetClasses}
                  p-2
                  ${post.isSaved 
                    ? 'text-blue-500 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400'
                  }
                  transition-colors duration-200
                `}
              >
                {post.isSaved ? (
                  <BookmarkIconSolid className="w-5 h-5" />
                ) : (
                  <BookmarkIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.article>
    </Web3SwipeGestureHandler>
  );
};

export default CompactWeb3PostCard;
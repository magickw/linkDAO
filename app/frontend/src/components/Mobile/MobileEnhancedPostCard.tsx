import React, { useState, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';
import { MobileTokenReactionSystem } from './MobileTokenReactionSystem';
import OptimizedImage from '@/components/OptimizedImage';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { CommunityPostService } from '@/services/communityPostService';
import { formatDistanceToNow } from 'date-fns';
import { EnhancedPost } from '@/types/feed';
import { ReactionType } from '@/types/tokenReaction';
import { InlinePreviewRenderer } from '@/components/InlinePreviews/InlinePreviewRenderer';
import SocialProofIndicator from '@/components/SocialProof/SocialProofIndicator';
import TrendingBadge from '@/components/TrendingBadge/TrendingBadge';
import EnhancedReactionSystem from '@/components/EnhancedReactionSystem';

interface MobileEnhancedPostCardProps {
  post: EnhancedPost;
  onReact: (postId: string, emoji: string, intensity: number) => void;
  onBookmark: (postId: string) => void;
  onShare: (postId: string) => void;
  onComment: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onViewReactors: (postId: string, type: ReactionType) => void;
  onUpvote?: (postId: string) => void;
  onDownvote?: (postId: string) => void;
  className?: string;
  defaultReactionEmoji?: string;
  defaultReactionIntensity?: number;
}

const MobileEnhancedPostCard: React.FC<MobileEnhancedPostCardProps> = ({
  post,
  onReact,
  onBookmark,
  onShare,
  onComment,
  onUserPress,
  onViewReactors,
  onUpvote,
  onDownvote,
  className = '',
  defaultReactionEmoji = '🔥',
  defaultReactionIntensity = 0.5
}) => {
  // Validate reaction emoji
  const validReactionEmojis = ['🔥', '🚀', '💎'] as const;
  const validatedReactionEmoji = validReactionEmojis.includes(defaultReactionEmoji as any)
    ? defaultReactionEmoji
    : '🔥';

  const { address, isConnected } = useWeb3();
  const { addToast, removeToast } = useToast();

  const {
    triggerHapticFeedback,
    createSwipeHandler,
    touchTargetClasses,
    mobileOptimizedClasses
  } = useMobileOptimization();

  const {
    announceToScreenReader,
    accessibilityClasses
  } = useMobileAccessibility();

  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeAction, setSwipeAction] = useState<'bookmark' | 'like' | null>(null);
  const [showFullContent, setShowFullContent] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const shouldTruncateContent = post.content.length > 300;
  const displayContent = showFullContent || !shouldTruncateContent
    ? post.content
    : `${post.content.slice(0, 300)}...`;

  const handleSwipe = createSwipeHandler({
    onSwipeLeft: (info: PanInfo) => {
      if (Math.abs(info.offset.x) > 100) {
        setSwipeAction('bookmark');
        triggerHapticFeedback('medium');
        setTimeout(() => {
          onBookmark(post.id);
          setSwipeAction(null);
          announceToScreenReader('Post bookmarked');
        }, 200);
      }
    },
    onSwipeRight: async (info: PanInfo) => {
      if (Math.abs(info.offset.x) > 100) {
        setSwipeAction('like');
        triggerHapticFeedback('medium');
        setTimeout(async () => {
          try {
            await onReact(post.id, validatedReactionEmoji, defaultReactionIntensity);
          } catch (error) {
            console.error('Failed to add reaction:', error);
          }
          setSwipeAction(null);
          announceToScreenReader('Post liked');
        }, 200);
      }
    }
  });

  const handleUserPress = () => {
    triggerHapticFeedback('light');
    onUserPress(post.author);
  };

  const handleToggleContent = () => {
    setShowFullContent(!showFullContent);
    triggerHapticFeedback('light');
    announceToScreenReader(showFullContent ? 'Content collapsed' : 'Content expanded');
  };

  const handleReaction = async (type: ReactionType, amount: number) => {
    await onReact(post.id, type, amount);
  };

  const handleViewReactors = (type: ReactionType) => {
    onViewReactors(post.id, type);
  };

  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(date) + " ago"
  }
  // Map emoji reactions to consistent emojis
  const getReactionEmoji = (type: string): string => {
    switch (type) {
      case 'like': return '👍';
      case 'love': return '❤️';
      case 'laugh': return '😂';
      case 'surprise': return '😮';
      case 'sad': return '😢';
      case 'angry': return '😠';
      default: return '🔥';
    }
  };

  const handleUpvote = () => {
    if (onUpvote) {
      onUpvote(post.id);
      triggerHapticFeedback('light');
      announceToScreenReader('Post upvoted');
    }
  };

  const handleDownvote = () => {
    if (onDownvote) {
      onDownvote(post.id);
      triggerHapticFeedback('light');
      announceToScreenReader('Post downvoted');
    }
  };

  return (
    <motion.div
      ref={cardRef}
      className={`
        relative bg-white dark:bg-gray-900 rounded-2xl shadow-sm
        border border-gray-200 dark:border-gray-700 overflow-hidden
        ${mobileOptimizedClasses} ${className}
      `}
      {...handleSwipe}
      whileTap={{ scale: 0.995 }}
    >
      {/* Swipe Action Indicators */}
      {swipeAction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`
            absolute inset-0 flex items-center justify-center z-10
            ${swipeAction === 'bookmark' ? 'bg-blue-500/20' : 'bg-green-500/20'}
          `}
        >
          <div className={`
            text-4xl ${swipeAction === 'bookmark' ? 'text-blue-500' : 'text-green-500'}
          `}>
            {swipeAction === 'bookmark' ? '🔖' : validatedReactionEmoji}
          </div>
        </motion.div>
      )}

      {/* Trending Badge */}
      {post.trendingStatus && (
        <div className="absolute top-3 right-3 z-10">
          <TrendingBadge
            level={post.trendingStatus === 'trending' ? 'hot' :
              post.trendingStatus === 'viral' ? 'viral' :
                post.trendingStatus === 'hot' ? 'hot' :
                  post.trendingStatus === 'rising' ? 'rising' : 'hot'}
          />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start space-x-3 mb-3">
          <button
            onClick={handleUserPress}
            className={`flex-shrink-0 ${touchTargetClasses} ${accessibilityClasses}`}
            aria-label={`View ${typeof post.author === 'string' ? post.author : post.author?.walletAddress || 'User'}'s profile`}
          >
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {(typeof post.author === 'string' ? post.author : post.author?.walletAddress || 'U').slice(0, 2).toUpperCase()}
              </span>
            </div>
          </button>

          <div className="flex-1 min-w-0">
            <button
              onClick={handleUserPress}
              className={`block text-left ${accessibilityClasses}`}
            >
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {post.author}
                </h3>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>@{post.author}</span>
                <span>•</span>
                <span>{formatTimeAgo(post.createdAt)}</span>
                {post.communityId && (
                  <>
                    <span>•</span>
                    <span className="text-blue-500 dark:text-blue-400">
                      #{post.communityId}
                    </span>
                  </>
                )}
              </div>
            </button>
          </div>

          {/* More Options Button */}
          <button
            className={`
              p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              ${touchTargetClasses} ${accessibilityClasses}
            `}
            aria-label="More options"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="mb-3">
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {displayContent}
          </p>

          {shouldTruncateContent && (
            <button
              onClick={handleToggleContent}
              className={`
                mt-2 text-blue-500 dark:text-blue-400 text-sm font-medium
                ${touchTargetClasses} ${accessibilityClasses}
              `}
            >
              {showFullContent ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {/* Hashtags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.map((hashtag, index) => (
              <span
                key={index}
                className="text-blue-500 dark:text-blue-400 text-sm font-medium"
              >
                #{hashtag}
              </span>
            ))}
          </div>
        )}

        {/* Media */}
        {post.mediaCids && post.mediaCids.length > 0 && (
          <div className="mb-3 -mx-4">
            {post.mediaCids.length === 1 ? (
              <OptimizedImage
                src={post.mediaCids[0]}
                alt="Post media"
                className="w-full max-h-96 object-cover"
              />
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {post.mediaCids.slice(0, 4).map((cid, index) => (
                  <div key={cid} className="relative">
                    <OptimizedImage
                      src={cid}
                      alt={`Post media ${index + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    {index === 3 && post.mediaCids!.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-semibold">
                          +{post.mediaCids!.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inline Previews */}
        {post.previews && post.previews.length > 0 && (
          <div className="mb-3">
            {post.previews.map((preview, index) => (
              <InlinePreviewRenderer
                key={index}
                preview={preview}
                className="mobile-optimized"
              />
            ))}
          </div>
        )}

        {/* Social Proof */}
        {post.socialProof && (
          <div className="mb-3">
            <SocialProofIndicator socialProof={post.socialProof} />
          </div>
        )}

        {/* Reactions */}
        <div className="mb-3">
          <EnhancedReactionSystem
            postId={post.id}
            postType="enhanced"
            initialReactions={post.reactions.map(r => {
              // Map the reaction type to a valid type for EnhancedReactionSystem
              let reactionType: 'hot' | 'diamond' | 'bullish' | 'governance' | 'art' | 'like' | 'love' | 'laugh' | 'angry' | 'sad' = 'like';

              // Map common reaction types
              switch (r.type) {
                case '🔥':
                case 'hot':
                  reactionType = 'hot';
                  break;
                case '💎':
                case 'diamond':
                  reactionType = 'diamond';
                  break;
                case '🚀':
                case 'bullish':
                  reactionType = 'bullish';
                  break;
                case '⚖️':
                case 'governance':
                  reactionType = 'governance';
                  break;
                case '🎨':
                case 'art':
                  reactionType = 'art';
                  break;
                case '👍':
                case 'like':
                  reactionType = 'like';
                  break;
                case '❤️':
                case 'love':
                  reactionType = 'love';
                  break;
                case '😂':
                case 'laugh':
                  reactionType = 'laugh';
                  break;
                case '😠':
                case 'angry':
                  reactionType = 'angry';
                  break;
                case '😢':
                case 'sad':
                  reactionType = 'sad';
                  break;
                default:
                  reactionType = 'like';
              }

              return {
                type: reactionType,
                emoji: getReactionEmoji(r.type),
                label: r.type,
                totalStaked: r.totalAmount,
                userStaked: 0, // We don't have user-specific data in this context
                contributors: r.users.map(u => u.address),
                rewardsEarned: 0, // We don't have reward data in this context
                count: r.users.length
              };
            })}
            onReaction={async (postId, reactionType, amount) => {
              // Map the reactionType back to an emoji for onReact
              let emoji = '👍'; // default
              switch (reactionType) {
                case 'hot':
                  emoji = '🔥';
                  break;
                case 'diamond':
                  emoji = '💎';
                  break;
                case 'bullish':
                  emoji = '🚀';
                  break;
                case 'governance':
                  emoji = '⚖️';
                  break;
                case 'art':
                  emoji = '🎨';
                  break;
                case 'like':
                  emoji = '👍';
                  break;
                case 'love':
                  emoji = '❤️';
                  break;
                case 'laugh':
                  emoji = '😂';
                  break;
                case 'angry':
                  emoji = '😠';
                  break;
                case 'sad':
                  emoji = '😢';
                  break;
              }
              await onReact(postId, emoji, amount || 1);
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onComment(post.id)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg
              text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
              ${touchTargetClasses} ${accessibilityClasses}
            `}
            aria-label="Comment"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium">{post.comments}</span>
          </button>

          <button
            onClick={() => onReact(post.id, validatedReactionEmoji, defaultReactionIntensity)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg
              text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
              ${touchTargetClasses} ${accessibilityClasses}
            `}
            aria-label="React"
          >
            <span className="text-lg">{validatedReactionEmoji}</span>
            <span className="text-sm font-medium">
              {post.reactions.reduce((sum, reaction) => sum + reaction.totalAmount, 0)}
            </span>
          </button>

          {/* Upvote/Downvote Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleUpvote}
              className={`
                flex items-center space-x-1 px-3 py-2 rounded-lg
                text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
                ${touchTargetClasses} ${accessibilityClasses}
              `}
              aria-label="Upvote"
            >
              <span className="text-lg">↑</span>
              <span className="text-sm font-medium">{(post as any).upvotes || 0}</span>
            </button>
          
            <button
              onClick={handleDownvote}
              className={`
                flex items-center space-x-1 px-3 py-2 rounded-lg
                text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
                ${touchTargetClasses} ${accessibilityClasses}
              `}
              aria-label="Downvote"
            >
              <span className="text-lg">↓</span>
              <span className="text-sm font-medium">{(post as any).downvotes || 0}</span>
            </button>
          </div>

          <button
            onClick={() => onShare(post.id)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg
              text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
              ${touchTargetClasses} ${accessibilityClasses}
            `}
            aria-label="Share"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="text-sm font-medium">{post.shares}</span>
          </button>

          <button
            onClick={() => onBookmark(post.id)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg
              text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
              ${touchTargetClasses} ${accessibilityClasses}
            `}
            aria-label={post.isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            <svg
              className="w-5 h-5"
              fill={post.isBookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MobileEnhancedPostCard;
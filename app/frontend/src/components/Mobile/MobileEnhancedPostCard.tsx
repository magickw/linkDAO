import React, { useState, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';
import { MobileTokenReactionSystem } from './MobileTokenReactionSystem';
import { InlinePreviewRenderer } from '@/components/InlinePreviews/InlinePreviewRenderer';
import SocialProofIndicator from '@/components/SocialProof/SocialProofIndicator';
import TrendingBadge from '@/components/TrendingBadge/TrendingBadge';
import { EnhancedPost } from '@/types/feed';
import { ReactionType } from '@/types/tokenReaction';

interface MobileEnhancedPostCardProps {
  post: EnhancedPost;
  onReact: (postId: string, emoji: string, intensity: number) => void;
  onBookmark: (postId: string) => void;
  onShare: (postId: string) => void;
  onComment: (postId: string) => void;
  onViewReactors: (postId: string, type: ReactionType) => void;
  onUserPress: (userId: string) => void;
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
  onViewReactors,
  onUserPress,
  className = '',
  defaultReactionEmoji = '🔥',
  defaultReactionIntensity = 0.5
}) => {
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

  const shouldTruncateContent = post.contentCid.length > 300;
  const displayContent = showFullContent || !shouldTruncateContent
    ? post.contentCid
    : `${post.contentCid.slice(0, 300)}...`;

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
    onSwipeRight: (info: PanInfo) => {
      if (Math.abs(info.offset.x) > 100) {
        setSwipeAction('like');
        triggerHapticFeedback('medium');
        setTimeout(() => {
          onReact(post.id, defaultReactionEmoji, defaultReactionIntensity);
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
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
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
            {swipeAction === 'bookmark' ? '🔖' : defaultReactionEmoji}
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
            aria-label={`View ${post.author}'s profile`}
          >
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {post.author.slice(0, 2).toUpperCase()}
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
              <img
                src={`https://ipfs.io/ipfs/${post.mediaCids[0]}`}
                alt="Post media"
                className="w-full max-h-96 object-cover"
              />
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {post.mediaCids.slice(0, 4).map((cid, index) => (
                  <div key={cid} className="relative">
                    <img
                      src={`https://ipfs.io/ipfs/${cid}`}
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
            <SocialProofIndicator
              socialProof={post.socialProof}
              className="mobile-optimized"
            />
          </div>
        )}

        {/* Engagement Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <span>{post.views} views</span>
          <span>{post.comments} comments</span>
          <span>{post.shares} shares</span>
        </div>

        {/* Token Reactions */}
        <MobileTokenReactionSystem
          postId={post.id}
          reactions={post.reactions.map(r => ({
            id: `${post.id}-${r.type}`,
            postId: post.id,
            userId: 'current-user',
            type: r.type as ReactionType,
            amount: r.totalAmount,
            rewardsEarned: 0,
            createdAt: new Date()
          }))}
          userWallet="user-wallet" // This should come from context
          onReact={handleReaction}
          onViewReactors={handleViewReactors}
          className="mb-3"
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onComment(post.id)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg
              text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
              ${touchTargetClasses} ${accessibilityClasses}
            `}
            aria-label="Comment on post"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium">Comment</span>
          </button>

          <button
            onClick={() => onShare(post.id)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg
              text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
              ${touchTargetClasses} ${accessibilityClasses}
            `}
            aria-label="Share post"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span className="text-sm font-medium">Share</span>
          </button>

          <button
            onClick={() => onBookmark(post.id)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg
              text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
              ${touchTargetClasses} ${accessibilityClasses}
            `}
            aria-label="Bookmark post"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-sm font-medium">Save</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MobileEnhancedPostCard;

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import PostActionsMenu from '../PostActionsMenu';
import { getPostActionPermissions } from '@/utils/postPermissions';
import { CommunityPostService } from '@/services/communityPostService';
import { StatusService } from '@/services/statusService';
import { PostService } from '@/services/postService';
import { InlinePreviewRenderer } from '../InlinePreviews/InlinePreviewRenderer';
import { ContentPreview } from '../../types/contentPreview';
import SocialProofIndicator, { SocialProofData } from '../SocialProof/SocialProofIndicator';
import TrendingBadge, { TrendingLevel, calculateTrendingLevel } from '../TrendingBadge/TrendingBadge';
import OptimizedImage from '../OptimizedImage';
import PostInteractionBar from '../PostInteractionBar';
import GestureHandler from '../GestureHandler';
import { EnhancedPostCardGlass, RippleEffect, VisualPolishClasses } from '../VisualPolish';
import EnhancedCommentSystem from '../EnhancedCommentSystem';
import { analyticsService } from '@/services/analyticsService';
import { EnhancedPost as SharedEnhancedPost, AuthorProfile, Reaction, Tip } from '@/types/feed';
import OnChainIdentityBadge, { XPBadge } from '../Community/OnChainIdentityBadge';
import VideoEmbed from '../VideoEmbed';
import { extractVideoUrls, VideoInfo } from '@/utils/videoUtils';
import ReactionPurchaseSystem from '../Community/ReactionPurchaseSystem';
import QuotedPost from './QuotedPost';
import { getAvatarUrl } from '@/utils/userDisplay';
import { linkifyText } from '@/utils/contentParser';


// Helper to map string badges to XPBadge objects
const mapToXPBadges = (badges: string[] | undefined): XPBadge[] => {
  if (!badges) return [];
  return badges.map((name, i) => ({
    id: `badge-${i}-${name}`,
    name,
    icon: 'engagement', // Default assignment
    level: 1,
    color: 'text-blue-500' // Default color
  }));
};

// Use the shared EnhancedPost type with extended properties for component-specific needs
export interface EnhancedPost extends Omit<SharedEnhancedPost, 'trendingStatus' | 'socialProof'> {
  // Social proof - optional and uses component-specific type
  socialProof?: SocialProofData;
  trendingStatus?: TrendingLevel | string | null; // Allow both TrendingLevel and string
  pinnedUntil?: Date;

  // Community context
  communityName?: string;
  media?: string[];

  // Voting
  upvotes?: number;
  downvotes?: number;
}

interface EnhancedPostCardProps {
  post: EnhancedPost;
  className?: string;
  showPreviews?: boolean;
  showSocialProof?: boolean;
  showTrending?: boolean;
  zenMode?: boolean;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onExpand?: () => void;
  onUpvote?: (postId: string) => Promise<void>;
  onDownvote?: (postId: string) => Promise<void>;
  isNested?: boolean;
  defaultExpanded?: boolean;
}

// Add proper comparison function for React.memo
const areEqual = (prevProps: EnhancedPostCardProps, nextProps: EnhancedPostCardProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.title === nextProps.post.title &&
    prevProps.post.content === nextProps.post.content &&
    prevProps.post.reactions.length === nextProps.post.reactions.length &&
    prevProps.post.comments === nextProps.post.comments &&
    prevProps.post.reposts === nextProps.post.reposts &&
    prevProps.post.views === nextProps.post.views &&
    prevProps.post.upvotes === nextProps.post.upvotes &&
    prevProps.post.downvotes === nextProps.post.downvotes &&
    prevProps.showPreviews === nextProps.showPreviews &&
    prevProps.showSocialProof === nextProps.showSocialProof &&
    prevProps.showTrending === nextProps.showTrending &&
    prevProps.zenMode === nextProps.zenMode
  );
};

const EnhancedPostCard = React.memo(({
  post,
  className = '',
  showPreviews = true,
  showSocialProof = true,
  showTrending = true,
  zenMode = false,
  onReaction,
  onTip,
  onExpand,
  onUpvote,
  onDownvote,
  isNested = false,
  defaultExpanded = false
}: EnhancedPostCardProps) => {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const router = useRouter();
  const [expanded, setExpanded] = useState(defaultExpanded || false);
  const [showAllPreviews, setShowAllPreviews] = useState(false);
  const [isPinned, setIsPinned] = useState(post.pinnedUntil && new Date(post.pinnedUntil) > new Date());

  // Vote state
  const [upvoteCount, setUpvoteCount] = useState(post.upvotes || 0);
  const [downvoteCount, setDownvoteCount] = useState(post.downvotes || 0);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>((post as any).userVote || null);

  // Extract video URLs from content for embedding
  const videoEmbeds = useMemo(() => {
    if (!post.content) return [];
    return extractVideoUrls(post.content || '');
  }, [post.content]);

  // Get post action permissions
  const permissions = useMemo(() => {
    return getPostActionPermissions(post as any, address);
  }, [post, address]);

  // Helper functions for reactions
  const getReactionEmoji = (type: string): string => {
    const emojiMap: Record<string, string> = {
      hot: '🔥', diamond: '💎', bullish: '🚀', love: '❤️', laugh: '😂', wow: '😮'
    };
    return emojiMap[type.toLowerCase()] || '👍';
  };

  const getReactionLabel = (type: string): string => {
    const labelMap: Record<string, string> = {
      hot: 'Hot', diamond: 'Diamond', bullish: 'Bullish', love: 'Love', laugh: 'Laugh', wow: 'Wow'
    };
    return labelMap[type.toLowerCase()] || type;
  };

  const getReactionPrice = (type: string): number => {
    const priceMap: Record<string, number> = {
      hot: 1, diamond: 2, bullish: 1, love: 1, laugh: 1, wow: 2
    };
    return priceMap[type.toLowerCase()] || 1;
  };

  // Action handlers


  const handleDelete = useCallback(async () => {
    try {
      // Determine if this is a status or regular post using the isStatus flag
      if (post.isStatus) {
        // Status (feed post)
        await StatusService.deleteStatus(post.id);
      } else {
        // Regular post or community post
        if (post.communityId) {
          // Community post
          await CommunityPostService.deletePost(post.communityId, post.id, address!.toLowerCase());
        } else {
          // Regular post (not a community post)
          await PostService.deletePost(post.id);
        }
      }
      addToast('Post deleted successfully', 'success');

      // Optionally trigger a refresh or remove from UI
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      addToast('Failed to delete post', 'error');
    }
  }, [post.id, post.communityId, post.isStatus, addToast]);

  const handlePin = useCallback(async () => {
    try {
      await CommunityPostService.pinPost(post.id);
      setIsPinned(true);
      addToast('Post pinned successfully', 'success');
    } catch (error) {
      console.error('Error pinning post:', error);
      addToast('Failed to pin post', 'error');
    }
  }, [post.id, addToast]);

  const handleUnpin = useCallback(async () => {
    try {
      await CommunityPostService.unpinPost(post.id);
      setIsPinned(false);
      addToast('Post unpinned successfully', 'success');
    } catch (error) {
      console.error('Error unpinning post:', error);
      addToast('Failed to unpin post', 'error');
    }
  }, [post.id, addToast]);

  // Sync state with props if post changes
  useEffect(() => {
    setUpvoteCount(post.upvotes || 0);
    setDownvoteCount(post.downvotes || 0);
    // Only sync userVote if explicitly provided, to avoid overwriting local optimistic state with null
    if ((post as any).userVote !== undefined) {
      setUserVote((post as any).userVote);
    }

    // Sync repost state
    setIsRepostedByMe(post.isRepostedByMe);
    setrepostsCount(post.reposts || 0);
  }, [post]);

  const handleReport = useCallback(() => {
    // TODO: Implement report modal
    addToast('Report functionality coming soon', 'info');
  }, [addToast]);

  const handleHide = useCallback(() => {
    // TODO: Implement hide functionality
    addToast('Post hidden from your feed', 'success');
  }, [addToast]);

  const [isRepostedByMe, setIsRepostedByMe] = useState(post.isRepostedByMe);
  const [repostsCount, setrepostsCount] = useState(post.reposts || 0);

  const handleRepost = useCallback(async (postId: string, message?: string, media?: string[], replyRestriction?: string) => {
    try {
      if (!address) {
        addToast('Please connect your wallet to repost', 'error');
        return;
      }
      const result = await PostService.repostPost(postId, address, message, media, replyRestriction);
      // Only set isRepostedByMe for simple reposts (no message)
      // Quote reposts (with message) create a new status and shouldn't change the original post's repost button state
      if (!message) {
        setIsRepostedByMe(true);
      }
      setrepostsCount(prev => prev + 1);
      addToast(message ? 'Quote post created successfully!' : 'Post reposted successfully!', 'success');
      // In a real app, you might want to refresh the feed
      return result;
    } catch (error) {
      console.error('Error reposting:', error);
      addToast('Failed to repost', 'error');
      throw error;
    }
  }, [address, addToast]);

  const handleUnrepost = useCallback(async (postId: string) => {
    try {
      if (!address) {
        addToast('Please connect your wallet', 'error');
        return;
      }
      await PostService.unrepostPost(postId, address);
      setIsRepostedByMe(false);
      setrepostsCount(prev => Math.max(0, prev - 1));
      addToast('Repost removed', 'success');
    } catch (error) {
      console.error('Error removing repost:', error);
      addToast('Failed to remove repost', 'error');
    }
  }, [address, addToast]);

  const handleShare = useCallback(async () => {
    const shareId = post.shareId || post.id;
    const url = post.communityId
      ? `${window.location.origin}/cp/${shareId}`
      : `${window.location.origin}/p/${shareId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title || 'Check out this post',
          text: post.content.substring(0, 100),
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        addToast('Link copied to clipboard', 'success');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      addToast('Failed to share post', 'error');
    }
  }, [post.id, post.shareId, post.title, post.content, post.communityId, addToast]);

  // Handle upvote
  const handleUpvote = useCallback(async () => {
    if (!onUpvote) return;

    // Optimistic update
    const isRemoving = userVote === 'upvote';

    // Update counts
    if (isRemoving) {
      setUpvoteCount(p => Math.max(0, p - 1));
      setUserVote(null);
    } else {
      if (userVote === 'downvote') {
        setDownvoteCount(p => Math.max(0, p - 1));
        setUpvoteCount(p => p + 1);
      } else {
        setUpvoteCount(p => p + 1);
      }
      setUserVote('upvote');
    }

    try {
      await onUpvote(post.id);
      analyticsService.trackUserEvent('post_upvote', { postId: post.id });
    } catch (error) {
      console.error('Error upvoting post:', error);
      addToast('Failed to upvote post', 'error');
      // Revert would go here
    }
  }, [onUpvote, post.id, addToast, userVote]);

  // Handle downvote
  const handleDownvote = useCallback(async () => {
    if (!onDownvote) return;

    // Optimistic update
    const isRemoving = userVote === 'downvote';

    // Update counts
    if (isRemoving) {
      setDownvoteCount(p => Math.max(0, p - 1));
      setUserVote(null);
    } else {
      if (userVote === 'upvote') {
        setUpvoteCount(p => Math.max(0, p - 1));
        setDownvoteCount(p => p + 1);
      } else {
        setDownvoteCount(p => p + 1);
      }
      setUserVote('downvote');
    }

    try {
      await onDownvote(post.id);
      analyticsService.trackUserEvent('post_downvote', { postId: post.id });
    } catch (error) {
      console.error('Error downvoting post:', error);
      addToast('Failed to downvote post', 'error');
    }
  }, [onDownvote, post.id, addToast, userVote]);

  // Calculate trending level if not provided - memoized
  const trendingLevel = useMemo(() => {
    // If trendingStatus is already a valid TrendingLevel, use it
    if (post.trendingStatus && typeof post.trendingStatus === 'string' &&
      ['hot', 'rising', 'viral', 'breaking'].includes(post.trendingStatus)) {
      return post.trendingStatus as TrendingLevel;
    }

    // Otherwise calculate it
    return calculateTrendingLevel(
      post.engagementScore,
      post.createdAt,
      (post.reactions || []).reduce((sum, r) => sum + r.totalAmount, 0),
      post.comments,
      post.reposts
    );
  }, [post.trendingStatus, post.engagementScore, post.createdAt, post.reactions, post.comments, post.reposts]);

  // Format timestamp - memoized
  const formatTimestamp = useCallback((dateInput: Date | string) => {
    // Handle null/undefined input
    if (!dateInput) {
      return 'recently';
    }

    const now = new Date();
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

    // Handle invalid dates
    if (isNaN(date.getTime())) {
      return 'recently';
    }

    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  }, []);

  // Get visual hierarchy styles based on content importance - memoized
  const contentHierarchy = useMemo(() => {
    const isPinned = post.pinnedUntil && new Date(post.pinnedUntil) > new Date();
    const isTrending = trendingLevel !== null;
    const hasHighEngagement = post.engagementScore > 1000;

    if (isPinned) {
      return 'ring-2 ring-yellow-400 dark:ring-yellow-500 shadow-lg shadow-yellow-400/20';
    } else if (isTrending) {
      return 'ring-1 ring-primary-400 dark:ring-primary-500 shadow-lg shadow-primary-400/10';
    } else if (hasHighEngagement) {
      return 'shadow-lg hover:shadow-xl';
    }
    return 'shadow-md hover:shadow-lg';
  }, [post.pinnedUntil, trendingLevel, post.engagementScore]);

  // Get category styling based on content type - memoized
  const categoryStyle = useMemo(() => {
    switch (post.contentType) {
      case 'media':
        return 'border-l-4 border-l-purple-500';
      case 'link':
        return 'border-l-4 border-l-blue-500';
      case 'poll':
        return 'border-l-4 border-l-green-500';
      case 'proposal':
        return 'border-l-4 border-l-indigo-500';
      default:
        return 'border-l-4 border-l-gray-300 dark:border-l-gray-600';
    }
  }, [post.contentType]);

  // Truncate content for preview - memoized
  const truncateContent = useCallback((content: string, maxLength: number = 280) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }, []);

  // Handle double tap for quick reaction
  const handleDoubleTap = useCallback(async () => {
    if (onReaction) {
      await onReaction(post.id, 'hot', 1);

      // Track double tap reaction
      analyticsService.trackUserEvent('post_double_tap_reaction', {
        postId: post.id,
        reactionType: 'hot',
        amount: 1,
        timestamp: new Date()
      });
    }
  }, [onReaction, post.id]);

  // Memoized content display
  const contentDisplay = useMemo(() => {
    return expanded ? post.content : truncateContent(post.content);
  }, [expanded, post.content, truncateContent]);

  // Keyboard event handler for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Don't handle keyboard shortcuts when typing in inputs or textareas
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Space or Enter to expand/collapse
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const newExpanded = !expanded;
      setExpanded(newExpanded);

      // Track expand/collapse
      analyticsService.trackUserEvent(newExpanded ? 'post_expanded' : 'post_collapsed', {
        postId: post.id,
        timestamp: new Date()
      });
    }

    // ESC to collapse
    if (e.key === 'Escape') {
      setExpanded(false);

      // Track collapse
      analyticsService.trackUserEvent('post_collapsed_esc', {
        postId: post.id,
        timestamp: new Date()
      });
    }
  }, [expanded, post.id]);

  // Log missing original post for debugging
  if (!isNested && post.isRepost && !post.originalPost) {
    console.log('⚠️ [FRONTEND] Repost missing originalPost:', {
      postId: post.id,
      isRepost: post.isRepost,
      parentId: (post as any).parentId
    });
  }

  return (
    <GestureHandler
      onDoubleTap={handleDoubleTap}
      onSwipeLeft={() => {
        // Track swipe left
        analyticsService.trackUserEvent('post_swipe_left', {
          postId: post.id,
          timestamp: new Date()
        });

        // Could be used for actions like "dislike" or "archive"
        console.log('Swiped left on post:', post.id);
      }}
      onSwipeRight={() => {
        // Track swipe right
        analyticsService.trackUserEvent('post_swipe_right', {
          postId: post.id,
          timestamp: new Date()
        });

        // Could be used for actions like "like" or "save"
        console.log('Swiped right on post:', post.id);
      }}
      onTap={() => {
        // Track tap
        analyticsService.trackUserEvent('post_tap', {
          postId: post.id,
          timestamp: new Date()
        });
      }}
    >
      <div
        role="article"
        aria-label={`Post by ${post.authorProfile.handle} titled ${post.title || 'Untitled'}`}
        aria-expanded={expanded}
        aria-describedby={`post-content-${post.id}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-2xl"
      >
        <RippleEffect className="rounded-2xl">
          <EnhancedPostCardGlass
            trending={trendingLevel !== null}
            pinned={post.pinnedUntil && new Date(post.pinnedUntil) > new Date()}
            onClick={() => {
              if (onExpand) onExpand();
              else setExpanded(!expanded);
            }}
            className={`${categoryStyle} ${className} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/10 dark:hover:shadow-primary-900/20`}
          >
            {/* Header with improved visual hierarchy */}
            <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
              {/* Repost Label */}
              {post.isRepost && (
                <div className="flex items-center space-x-2 mb-3 text-sm text-green-600 dark:text-green-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="font-medium">
                    {post.isRepostedByMe ? 'You reposted' : 'Reposted'}
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Author Avatar */}
                  <div className="relative flex-shrink-0">
                    <Link
                      href={`/u/${post.author}`}
                      className="block w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary-400 to-secondary-500 border-2 border-white dark:border-gray-800 shadow-md hover:ring-2 hover:ring-primary-400 transition-all duration-200"
                      aria-label={`${post.authorProfile.handle}'s avatar`}
                    >
                      {getAvatarUrl(post) ? (
                        <img
                          src={getAvatarUrl(post)!}
                          alt={post.authorProfile.handle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {post.authorProfile.handle.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>

                    {/* Reputation indicator */}
                    {!zenMode && post.authorProfile.reputationTier && (
                      <div
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm"
                        aria-label={`Reputation tier: ${post.authorProfile.reputationTier}`}
                      >
                        <span className="text-xs">🏆</span>
                      </div>
                    )}
                  </div>

                  {/* Author Info with On-Chain Identity */}
                  <div className="flex-1 min-w-0">
                    <OnChainIdentityBadge
                      address={post.author}
                      identityData={{
                        address: post.author,
                        handle: post.authorProfile?.handle,
                        ensName: post.authorProfile?.ensName,
                        reputationScore: post.authorProfile?.reputationScore || 0,
                        votingPower: post.authorProfile?.votingPower || 0,
                        xpBadges: mapToXPBadges(post.authorProfile?.xpBadges),
                        totalContributions: post.authorProfile?.totalContributions || 0,
                        memberSince: post.authorProfile?.memberSince
                      }}
                      size="md"
                      showTooltip={true}
                      zenMode={zenMode}
                    />

                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span>{formatTimestamp(post.createdAt)}</span>

                      {post.communityName && (
                        <>
                          <span aria-hidden="true">•</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/communities/${encodeURIComponent(post.communityId ?? '')}`);
                            }}
                            className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 truncate"
                            aria-label={`View community ${post.communityName}`}
                          >
                            {post.communityName}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Post Actions Menu */}
                <div className="flex items-center space-x-2">
                  {/* Trending Badge */}
                  {!zenMode && showTrending && trendingLevel && (
                    <div className="flex-shrink-0">
                      <TrendingBadge
                        level={trendingLevel}
                        score={post.engagementScore}
                        showScore
                        aria-label={`Trending level: ${trendingLevel}, Score: ${post.engagementScore}`}
                      />
                    </div>
                  )}

                  {/* Actions Menu */}
                  <PostActionsMenu
                    postId={post.id}
                    isPinned={isPinned}
                    permissions={permissions}

                    onDelete={handleDelete}
                    onPin={handlePin}
                    onUnpin={handleUnpin}
                    onShare={handleShare}
                    onReport={handleReport}
                    onHide={handleHide}
                  />
                </div>
              </div>
            </div>

            {/* Content with emphasized hierarchy */}
            <div className="px-4 py-2">
              {/* Title - emphasized */}
              {post.title && (
                <h2
                  className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-3 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                  id={`post-title-${post.id}`}
                >
                  {post.title}
                </h2>
              )}

              {/* Content - main focus */}
              <div className="mb-4">
                {post.isRepost && (!post.content || post.content.trim() === '') ? null : (
                  <>
                    <p
                      className="text-gray-700 dark:text-gray-300 text-base leading-relaxed"
                      id={`post-content-${post.id}`}
                    >
                      {linkifyText(contentDisplay)}
                    </p>

                    {!expanded && post.content.length > 280 && (
                      <button
                        onClick={() => setExpanded(true)}
                        className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium mt-2 transition-colors duration-200"
                        aria-expanded={expanded}
                        aria-controls={`post-content-${post.id}`}
                      >
                        Read more
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Video Embeds - Auto-detected from content URLs */}
              {videoEmbeds.length > 0 && (
                <div className="mb-4 space-y-4">
                  {videoEmbeds.map((videoInfo: VideoInfo, index: number) => (
                    <div key={`video-${index}-${videoInfo.id}`} className="rounded-xl overflow-hidden">
                      <VideoEmbed
                        url={videoInfo.url}
                        width={560}
                        height={315}
                        showPlaceholder={true}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Media */}
              {post.media && post.media.length > 0 && (
                <div className="mb-4 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800" data-cursor="nft">
                  {post.media.length === 1 ? (
                    <div className="flex justify-center cursor-zoom-in" onClick={() => window.open(post.media[0], '_blank')}>
                      <OptimizedImage
                        src={post.media[0]}
                        alt="Post media"
                        width={800}
                        height={600}
                        className="max-h-[500px] w-auto object-contain"
                        lazy={true}
                        quality={90}
                      />
                    </div>
                  ) : post.media.length === 2 ? (
                    <div className="flex flex-col sm:flex-row gap-1">
                      {post.media.slice(0, 2).map((media, index) => (
                        <div key={index} className="flex-1 aspect-video cursor-zoom-in" onClick={() => window.open(media, '_blank')}>
                          <OptimizedImage
                            src={media}
                            alt={`Post media ${index + 1}`}
                            width={800}
                            height={450}
                            className="w-full h-full object-cover"
                            lazy={true}
                            quality={90}
                          />
                        </div>
                      ))}
                    </div>
                  ) : post.media.length === 3 ? (
                    <div className="grid grid-cols-2 gap-1">
                      <div className="aspect-video cursor-zoom-in" onClick={() => window.open(post.media[0], '_blank')}>
                        <OptimizedImage
                          src={post.media[0]}
                          alt="Post media 1"
                          width={800}
                          height={450}
                          className="w-full h-full object-cover"
                          lazy={true}
                          quality={90}
                        />
                      </div>
                      <div className="grid grid-rows-2 gap-1">
                        {post.media.slice(1, 3).map((media, index) => (
                          <div key={index + 1} className="aspect-video cursor-zoom-in" onClick={() => window.open(media, '_blank')}>
                            <OptimizedImage
                              src={media}
                              alt={`Post media ${index + 2}`}
                              width={400}
                              height={225}
                              className="w-full h-full object-cover"
                              lazy={true}
                              quality={90}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {post.media.slice(0, 4).map((media, index) => (
                        <div key={index} className="aspect-video cursor-zoom-in" onClick={() => window.open(media, '_blank')}>
                          <OptimizedImage
                            src={media}
                            alt={`Post media ${index + 1}`}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover"
                            lazy={true}
                            quality={90}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quoted Post (Repost Content) */}
              {!isNested && post.originalPost && (
                <div className="mb-4 mt-2 px-1">
                  <QuotedPost post={post.originalPost as any} />
                </div>
              )}
              {!isNested && post.isRepost && !post.originalPost && (
                <div className="mb-4 mt-2 px-1 text-sm text-gray-500 italic">
                  Original post unavailable
                </div>
              )}

              {/* Inline Previews */}
              {showPreviews && post.previews.length > 0 && (
                <div className="mb-4">
                  {post.previews.slice(0, showAllPreviews ? undefined : 2).map((contentPreview, index) => {
                    // Extract LinkPreview from ContentPreview
                    if (contentPreview.type === 'link' && contentPreview.data) {
                      const linkPreview = contentPreview.data as any;
                      const preview = {
                        url: linkPreview.url || contentPreview.url,
                        title: linkPreview.title,
                        description: linkPreview.description,
                        image: linkPreview.image,
                        siteName: linkPreview.siteName,
                        type: linkPreview.type || 'website'
                      };
                      return (
                        <InlinePreviewRenderer
                          key={index}
                          preview={preview}
                          className="mb-2"
                        />
                      );
                    }
                    return null;
                  })}

                  {post.previews.length > 2 && !showAllPreviews && (
                    <button
                      onClick={() => setShowAllPreviews(true)}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2"
                      aria-label={`Show ${post.previews.length - 2} more previews`}
                    >
                      Show {post.previews.length - 2} more preview{post.previews.length - 2 > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              )}

              {/* Hashtags - de-emphasized */}
              {post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.hashtags.map((tag, index) => (
                    <Link
                      key={index}
                      href={`/search?q=${encodeURIComponent('#' + tag)}`}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-200"
                      aria-label={`View posts tagged with ${tag}`}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Social Proof */}
              {!zenMode && showSocialProof && post.socialProof && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <SocialProofIndicator socialProof={post.socialProof} />
                </div>
              )}

              {/* Reaction Purchase System */}
              {!zenMode && post.reactions && post.reactions.length > 0 && (
                <div className="mb-4">
                  <ReactionPurchaseSystem
                    postId={post.id}
                    postAuthor={post.author}
                    reactions={post.reactions.map(r => ({
                      type: r.type,
                      emoji: getReactionEmoji(r.type),
                      label: getReactionLabel(r.type),
                      price: getReactionPrice(r.type),
                      count: r.count || 0,
                      userOwned: r.users?.some((user: any) => user.address === address) || false
                    }))}
                    onReactionPurchase={async (postId, reactionType) => {
                      if (onReaction) {
                        await onReaction(postId, reactionType, getReactionPrice(reactionType));
                      }
                    }}
                  />
                </div>
              )}

              {/* Consolidated Engagement Bar */}
              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <PostInteractionBar
                  post={{
                    id: post.id,
                    title: post.title,
                    contentCid: post.contentCid,
                    content: post.content,
                    author: post.author,
                    walletAddress: post.walletAddress, // Ensure walletAddress is passed
                    communityId: post.communityId,
                    communityName: post.communityName || 'general',
                    commentsCount: post.comments,
                    shareId: (post as any).shareId,
                    isRepostedByMe: isRepostedByMe,
                    reposts: repostsCount,
                    authorProfile: post.authorProfile,
                    media: post.media,
                    views: post.views,
                    upvotes: upvoteCount,
                    downvotes: downvoteCount
                  }}
                  postType={post.communityId ? 'community' : 'feed'}
                  userVote={userVote}
                  onComment={() => {
                    setExpanded(true);
                    if (onExpand) onExpand();
                  }}
                  onReaction={onReaction}
                  onTip={onTip}
                  onShare={async (postId, shareType, message, media, replyRestriction) => {
                    if (shareType === 'timeline') {
                      await handleRepost(postId, message, media, replyRestriction);
                    }
                  }}
                  onUnrepost={handleUnrepost}
                  onUpvote={onUpvote}
                  onDownvote={onDownvote}
                  zenMode={zenMode}
                  className="border-none p-0 !bg-transparent"
                />
              </div>

              {/* Comment System - Show when expanded */}
              {expanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <EnhancedCommentSystem
                    postId={post.id}
                    postType={post.communityId ? 'community' : 'feed'} // Use 'feed' for quick posts, 'community' for community posts
                    communityId={post.communityId} // Pass communityId for community posts
                    onCommentAdded={(comment) => {
                      console.log('New comment added:', comment);
                      addToast('Comment posted!', 'success');
                      // Track comment event
                      analyticsService.trackUserEvent('post_comment_added', {
                        postId: post.id,
                        timestamp: new Date()
                      });
                    }}
                    className="mt-4"
                  />
                </div>
              )}
            </div>
          </EnhancedPostCardGlass>
        </RippleEffect>
      </div>
    </GestureHandler>
  );
});

// Add display name for debugging
EnhancedPostCard.displayName = 'EnhancedPostCard';

export default EnhancedPostCard;
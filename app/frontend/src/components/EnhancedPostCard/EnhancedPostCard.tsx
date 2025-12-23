import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import PostActionsMenu from '../PostActionsMenu';
import { getPostActionPermissions } from '@/utils/postPermissions';
import { CommunityPostService } from '@/services/communityPostService';
import { QuickPostService } from '@/services/quickPostService';
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
import OnChainIdentityBadge from '../Community/OnChainIdentityBadge';
import VideoEmbed from '../VideoEmbed';
import { extractVideoUrls, VideoInfo } from '@/utils/videoUtils';

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
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onExpand?: () => void;
  onUpvote?: (postId: string) => Promise<void>;
  onDownvote?: (postId: string) => Promise<void>;
}

// Add proper comparison function for React.memo
const areEqual = (prevProps: EnhancedPostCardProps, nextProps: EnhancedPostCardProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.title === nextProps.post.title &&
    prevProps.post.content === nextProps.post.content &&
    prevProps.post.reactions.length === nextProps.post.reactions.length &&
    prevProps.post.comments === nextProps.post.comments &&
    prevProps.post.shares === nextProps.post.shares &&
    prevProps.post.views === nextProps.post.views &&
    prevProps.showPreviews === nextProps.showPreviews &&
    prevProps.showSocialProof === nextProps.showSocialProof &&
    prevProps.showTrending === nextProps.showTrending
  );
};

const EnhancedPostCard = React.memo(({
  post,
  className = '',
  showPreviews = true,
  showSocialProof = true,
  showTrending = true,
  onReaction,
  onTip,
  onExpand,
  onUpvote,
  onDownvote
}: EnhancedPostCardProps) => {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showAllPreviews, setShowAllPreviews] = useState(false);
  const [isPinned, setIsPinned] = useState(post.pinnedUntil && new Date(post.pinnedUntil) > new Date());

  // Extract video URLs from content for embedding
  const videoEmbeds = useMemo(() => {
    if (!post.content) return [];
    return extractVideoUrls(post.content);
  }, [post.content]);

  // Get post action permissions
  const permissions = useMemo(() => {
    return getPostActionPermissions(post as any, address);
  }, [post, address]);

  // Action handlers
  const handleEdit = useCallback(() => {
    router.push(`/edit-post/${post.id}`);
  }, [router, post.id]);

  const handleDelete = useCallback(async () => {
    try {
      // Determine if this is a quick post or regular post using the isQuickPost flag
      if (post.isQuickPost) {
        // Quick post (feed post)
        await QuickPostService.deleteQuickPost(post.id);
      } else {
        // Regular post or community post
        if (post.communityId) {
          // Community post
          await CommunityPostService.deletePost(post.communityId, post.id);
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
  }, [post.id, post.communityId, post.isQuickPost, addToast]);

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

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/post/${post.id}`;
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
  }, [post.id, post.title, post.content, addToast]);

  const handleReport = useCallback(() => {
    // TODO: Implement report modal
    addToast('Report functionality coming soon', 'info');
  }, [addToast]);

  const handleHide = useCallback(() => {
    // TODO: Implement hide functionality
    addToast('Post hidden from your feed', 'success');
  }, [addToast]);

  // Handle upvote
  const handleUpvote = useCallback(async () => {
    if (!onUpvote) return;

    try {
      await onUpvote(post.id);
      analyticsService.trackUserEvent('post_upvote', { postId: post.id });
    } catch (error) {
      console.error('Error upvoting post:', error);
      addToast('Failed to upvote post', 'error');
    }
  }, [onUpvote, post.id, addToast]);

  // Handle downvote
  const handleDownvote = useCallback(async () => {
    if (!onDownvote) return;

    try {
      await onDownvote(post.id);
      analyticsService.trackUserEvent('post_downvote', { postId: post.id });
    } catch (error) {
      console.error('Error downvoting post:', error);
      addToast('Failed to downvote post', 'error');
    }
  }, [onDownvote, post.id, addToast]);

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
      post.reactions.reduce((sum, r) => sum + r.totalAmount, 0),
      post.comments,
      post.shares
    );
  }, [post.trendingStatus, post.engagementScore, post.createdAt, post.reactions, post.comments, post.shares]);

  // Format timestamp - memoized
  const formatTimestamp = useCallback((dateInput: Date | string) => {
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
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Author Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary-400 to-secondary-500 border-2 border-white dark:border-gray-800 shadow-md"
                      aria-label={`${post.authorProfile.handle}'s avatar`}
                    >
                      {post.authorProfile.avatar ? (
                        <img
                          src={post.authorProfile.avatar}
                          alt={post.authorProfile.handle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {post.authorProfile.handle.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Reputation indicator */}
                    {post.authorProfile.reputationTier && (
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
                        ensName: post.authorProfile?.ensName,
                        reputationScore: post.authorProfile?.reputationScore || 0,
                        votingPower: post.authorProfile?.votingPower || 0,
                        xpBadges: post.authorProfile?.xpBadges || [],
                        totalContributions: post.authorProfile?.totalContributions || 0,
                        memberSince: post.authorProfile?.memberSince
                      }}
                      size="md"
                      showTooltip={true}
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
                  {showTrending && trendingLevel && (
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
                    onEdit={handleEdit}
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
            <div className="px-6 py-4">
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
                <p
                  className="text-gray-700 dark:text-gray-300 text-base leading-relaxed"
                  id={`post-content-${post.id}`}
                >
                  {contentDisplay}
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
                <div className="mb-4 rounded-xl overflow-hidden">
                  <OptimizedImage
                    src={post.media[0]}
                    alt="Post media"
                    width={600}
                    height={300}
                    className="w-full h-64 object-cover transition-transform duration-500 hover:scale-105"
                    lazy={true}
                    quality={85}
                  />
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
                      href={`/hashtag/${tag}`}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-200"
                      aria-label={`View posts tagged with ${tag}`}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Social Proof */}
              {showSocialProof && post.socialProof && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <SocialProofIndicator socialProof={post.socialProof} />
                </div>
              )}

              {/* Enhanced Interactions */}
              <PostInteractionBar
                post={{
                  id: post.id,
                  title: post.title,
                  contentCid: post.contentCid, // Use contentCid field instead of content
                  content: post.content, 
                  author: post.author,
                  communityId: post.communityId,
                  communityName: post.communityName || 'general',
                  commentCount: post.comments,
                  stakedValue: post.reactions.reduce((sum, r) => sum + r.totalAmount, 0),
                  shareId: (post as any).shareId, // Pass shareId if available
                  authorProfile: post.authorProfile 
                }}
                postType={post.communityId ? 'community' : 'feed'} // Use appropriate post type
                onComment={() => {
                  // Expand the post to show comments
                  setExpanded(true);
                  // If there's an onExpand handler provided, also call it
                  if (onExpand) onExpand();
                }}
                onReaction={onReaction}
                onTip={onTip}
                onShare={async (postId, shareType, message) => {
                  if (shareType === 'timeline') {
                    // Handle repost to timeline
                    try {
                      if (!isConnected || !address) {
                        addToast('Please connect your wallet to share posts', 'error');
                        return;
                      }
                      const response = await fetch('/api/posts/repost', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          originalPostId: postId,
                          message: message,
                          author: address.toLowerCase()
                        })
                      });
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to repost');
                      }
                      const result = await response.json();
                      addToast('Post shared to your timeline!', 'success');
                      // Track repost event
                      analyticsService.trackUserEvent('post_repost', {
                        postId,
                        repostId: result.data.id,
                        timestamp: new Date()
                      });
                    } catch (error) {
                      console.error('Repost failed:', error);
                      addToast(error instanceof Error ? error.message : 'Failed to share post', 'error');
                    }
                  } else {
                    // External share (Twitter, etc.) - handled by SharePostModal
                    console.log('Sharing post:', postId, shareType, message);
                    addToast(`Post shared via ${shareType}!`, 'success');
                    // Track share event
                    analyticsService.trackUserEvent('post_share', {
                      postId,
                      shareType,
                      message,
                      timestamp: new Date()
                    });
                  }
                }}
              />

              {/* Upvote/Downvote Buttons */}
              <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                <button
                  onClick={handleUpvote}
                  disabled={!onUpvote}
                  className={`flex items-center space-x-2 ${onUpvote
                    ? 'text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400'
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    } transition-colors duration-200`}
                  aria-label="Upvote post"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="font-medium">{post.upvotes || 0}</span>
                </button>

                <button
                  onClick={handleDownvote}
                  disabled={!onDownvote}
                  className={`flex items-center space-x-2 ${onDownvote
                    ? 'text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400'
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    } transition-colors duration-200`}
                  aria-label="Downvote post"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="font-medium">{post.downvotes || 0}</span>
                </button>
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
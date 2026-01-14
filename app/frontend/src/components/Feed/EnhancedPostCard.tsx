// Mock EnhancedPostCard component for testing
import React, { useState, useEffect, useMemo } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { useToast } from '../../context/ToastContext';
import { useCacheInvalidation } from '../../hooks/useCacheInvalidation';
import { InlinePreviewRenderer } from '../InlinePreviews/InlinePreviewRenderer';
import SocialProofIndicator from '../SocialProof/SocialProofIndicator';
import TrendingBadge from '../TrendingBadge/TrendingBadge';
import EnhancedReactionSystem from '../EnhancedReactionSystem';
import OptimizedImage from '../OptimizedImage';
import { ModerationWarning, ReportContentButton } from '../Moderation';
import { IPFSContentService } from '../../services/ipfsContentService';
import { getDisplayName, getUserAddress } from '../../utils/userDisplay';
import { linkifyHtmlUrls } from '../../utils/contentParser';
import DOMPurify from 'dompurify';
import VideoEmbed from '../VideoEmbed';
import { extractVideoUrls, VideoInfo } from '../../utils/videoUtils';
import { communityWeb3Service } from '../../services/communityWeb3Service';
import { FeedService } from '../../services/feedService';
import { PostService } from '../../services/postService';

interface EnhancedPostCardProps {
  post: any;
  className?: string;
  showPreviews?: boolean;
  showSocialProof?: boolean;
  showTrending?: boolean;
  onLike?: (postId: string) => Promise<void>;
  onComment?: (postId: string) => Promise<void>;
  onShare?: (postId: string) => Promise<void>;
  onTip?: (postId: string, amount?: string, token?: string, message?: string) => Promise<void>;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onExpand?: () => void;
  onUpvote?: (postId: string) => Promise<void>;
  onDownvote?: (postId: string) => Promise<void>;
}

export const EnhancedPostCard: React.FC<EnhancedPostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onTip,
  onReaction,
  onExpand,
  onUpvote,
  onDownvote,
  className = '',
  showPreviews = true,
  showSocialProof = true,
  showTrending = true
}) => {
  const [showTipModal, setShowTipModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);
  const [content, setContent] = useState<string>('');
  const [imageError, setImageError] = useState(false);
  const [ipfsGatewayIndex, setIpfsGatewayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState<number>(post.views || 0);
  const hasRecordedView = React.useRef(false);

  // Track view on mount
  useEffect(() => {
    if (!hasRecordedView.current && post.id) {
      hasRecordedView.current = true;
      // Optimistic update (optional, but good for immediate feedback if valid)
      // For views, we usually wait for server or just increment locally if we want strictly 
      // but here we will fetch the updated count from the server response

      const isStatus = post.isStatus || false;

      // Delay slightly to prioritize critical rendering
      const timer = setTimeout(() => {
        PostService.markAsViewed(post.id, isStatus)
          .then(newCount => {
            if (newCount > viewCount) {
              setViewCount(newCount);
            } else {
              // If server returns 0 or error, just increment locally for this session
              setViewCount(prev => prev + 1);
            }
          })
          .catch(err => {
            console.warn('Failed to record view:', err);
            // Best effort: increment locally
            setViewCount(prev => prev + 1);
          });
      }, 2000); // 2 second delay to ensure user actually saw it

      return () => clearTimeout(timer);
    }
  }, [post.id, post.isStatus]);

  // Extract video URLs from content for embedding
  const videoEmbeds = useMemo(() => {
    if (!content) return [];
    return extractVideoUrls(content);
  }, [content]);

  // List of IPFS gateways to try as fallbacks
  const ipfsGateways = [
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/'
  ];

  const { isConnected } = useWeb3();
  const { addToast } = useToast();

  // Add a safety check for the toast function
  const safeAddToast = (...args: Parameters<typeof addToast>) => {
    if (typeof addToast === 'function') {
      return addToast(...args);
    } else {
      // Fallback to console logging
      console.log(`[Toast Fallback] ${args[1]}: ${args[0]}`);
    }
  };

  const { invalidateFeedCache, invalidateUserCache, invalidateCommunityCache } = useCacheInvalidation();

  // Fetch content from IPFS when component mounts or when post.contentCid changes
  useEffect(() => {
    const fetchContent = async () => {
      // Reset states when fetching new content
      setLoading(true);
      setError(null);

      try {
        // First, check if post has direct content (not empty and not a CID)
        if (post.content && typeof post.content === 'string' && post.content.length > 0 &&
          !post.content.startsWith('Qm') && !post.content.startsWith('bafy')) {
          console.log('Using direct content for post:', { id: post.id, contentLength: post.content.length });
          setContent(post.content);
          setLoading(false);
          return;
        }

        // If post has contentCid that looks like a valid IPFS CID, fetch from IPFS
        if (post.contentCid && (post.contentCid.startsWith('Qm') || post.contentCid.startsWith('bafy'))) {
          console.log('Fetching content from IPFS for CID:', post.contentCid);

          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('IPFS fetch timeout')), 3000);
          });

          const contentText = await Promise.race([
            IPFSContentService.getContentFromIPFS(post.contentCid),
            timeoutPromise
          ]) as string;
          console.log('Received content from IPFS:', { contentText, length: contentText?.length });

          if (contentText && contentText.length > 0) {
            // Try to parse as JSON if it looks like JSON
            try {
              const parsed = JSON.parse(contentText);
              if (typeof parsed === 'string') {
                setContent(parsed);
              } else if (typeof parsed === 'object' && parsed.content) {
                setContent(parsed.content);
              } else {
                setContent(contentText);
              }
            } catch (parseError) {
              // If not valid JSON, use as is
              setContent(contentText);
            }
          } else {
            // If we got empty content from IPFS, try to use any existing content
            if (post.content && post.content.length > 0) {
              setContent(post.content);
            } else {
              setContent(`Content not available (CID: ${post.contentCid})`);
            }
          }
        } else if (post.content) {
          // If we have content but no CID, use the content directly
          console.log('Using direct content for post:', { id: post.id, contentLength: post.content.length });
          setContent(post.content);
        } else {
          // If no content CID and no direct content, show default message
          console.log('No content available for post:', { id: post.id });
          setContent('No content available');
        }
      } catch (error) {
        console.error('Failed to fetch content:', error);

        // Check if this is a backend IPFS service error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage === 'BACKEND_IPFS_ERROR') {
          setError('BACKEND_IPFS_ERROR');
          setContent('');
        } else {
          setError(`Failed to load content: ${errorMessage}`);
          // Even on error, show what content we have
          setContent(post.content || `Content not available`);
        }
      } finally {
        setLoading(false);
      }
    };

    // Debug: Log post data to see what we're working with
    console.log('EnhancedPostCard mounted with post:', {
      id: post.id,
      contentCid: post.contentCid,
      content: post.content,
      contentLength: post.content?.length,
      mediaCids: post.mediaCids,
      mediaCidsLength: post.mediaCids?.length,
      hasMediaCids: !!post.mediaCids && post.mediaCids.length > 0
    });

    fetchContent();
  }, [post.contentCid, post.id, post.mediaCids, post.content]);

  const formatTimestamp = (dateInput: Date | string) => {
    const now = new Date();
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

    // Handle invalid dates
    if (isNaN(date.getTime())) {
      return 'recently';
    }

    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes <= 1 ? 'just now' : `${diffInMinutes}m ago`;
    }
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays}d ago`;
    }
    return date.toLocaleDateString();
  };

  const handleLike = async () => {
    try {
      if (onLike) {
        await onLike(post.id);
        safeAddToast('Post liked successfully!', 'success');

        // Invalidate feed cache to reflect updated like counts
        await invalidateFeedCache();

        // Invalidate user cache for like history
        if (post.author) {
          await invalidateUserCache(post.author, ['likes', 'earnings']);
        }
      }
    } catch (error) {
      safeAddToast('Failed to like post', 'error');
    }
  };

  const handleComment = async () => {
    try {
      if (onComment) {
        await onComment(post.id);
        safeAddToast('Comment posted successfully!', 'success');

        // Invalidate feed cache to reflect updated comment counts
        await invalidateFeedCache();
      }
    } catch (error) {
      safeAddToast('Failed to post comment', 'error');
    }
  };

  const handleShare = async (shareType?: string, target?: string) => {
    try {
      if (onShare) {
        await onShare(post.id);
        safeAddToast('Post shared successfully!', 'success');

        // Invalidate feed cache to reflect updated share counts
        await invalidateFeedCache();

        // If sharing to a community, invalidate community cache
        if (post.communityId) {
          await invalidateCommunityCache(post.communityId, ['posts', 'activity']);
        }
      }
      setShowShareModal(false);
    } catch (error) {
      safeAddToast('Failed to share post', 'error');
    }
  };

  const [isTipping, setIsTipping] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const handleTip = async (amount?: string, token?: string, message?: string) => {
    try {
      if (!amount || parseFloat(amount) <= 0) {
        safeAddToast('Please enter a valid tip amount', 'error');
        return;
      }

      setIsTipping(true);
      setLastTxHash(null);
      setShowTipModal(false);
      
      safeAddToast('Initiating blockchain transaction...', 'info');

      // Perform on-chain tipping using communityWeb3Service
      const txHash = await communityWeb3Service.tipCommunityPost({
        postId: post.id,
        recipientAddress: getUserAddress(post),
        amount: amount,
        token: token || 'LDAO',
        message: message || ''
      });

      setLastTxHash(txHash);
      
      if (onTip) {
        await onTip(post.id, amount, token, message);
        await invalidateFeedCache();
        if (post.author) {
          await invalidateUserCache(post.author, ['tips', 'earnings']);
        }
        if (post.communityId) {
          await invalidateCommunityCache(post.communityId, ['posts', 'activity']);
        }
      }

      safeAddToast(
        <div className="flex flex-col gap-1">
          <span>Successfully tipped {amount} {token || 'LDAO'}!</span>
          <a 
            href={`https://sepolia.etherscan.io/tx/${txHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs underline flex items-center gap-1"
          >
            View on Etherscan <ExternalLink size={12} />
          </a>
        </div> as any, 
        'success'
      );
    } catch (error: any) {
      console.error('Tipping error:', error);
      safeAddToast(`Failed to send tip: ${error.message || 'Please try again.'}`, 'error');
    } finally {
      setIsTipping(false);
    }
  };

  const handleBookmark = async () => {
    setIsBookmarked(!isBookmarked);
    safeAddToast(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks', 'success');

    // Invalidate user cache for bookmarks
    try {
      await invalidateUserCache('current', ['bookmarks']);
    } catch (error) {
      console.warn('Failed to invalidate bookmark cache:', error);
    }
  };

  const handleUpvote = async () => {
    try {
      if (onUpvote) {
        await onUpvote(post.id);
        safeAddToast('Post upvoted successfully!', 'success');

        // Invalidate feed cache to reflect updated vote counts
        await invalidateFeedCache();
      }
    } catch (error) {
      safeAddToast('Failed to upvote post', 'error');
    }
  };

  const handleDownvote = async () => {
    try {
      if (onDownvote) {
        await onDownvote(post.id);
        safeAddToast('Post downvoted successfully!', 'success');

        // Invalidate feed cache to reflect updated vote counts
        await invalidateFeedCache();
      }
    } catch (error) {
      safeAddToast('Failed to downvote post', 'error');
    }
  };

  const copyToClipboard = async () => {
    const shareId = post.shareId || post.id;
    const url = post.communityId
      ? `${window.location.origin}/cp/${shareId}`
      : `${window.location.origin}/p/${shareId}`;
    await navigator.clipboard.writeText(url);
    safeAddToast('Share link copied to clipboard!', 'success');
    if (onShare) {
      await onShare(post.id);
    }
  };

  return (
    <article role="article" className={`relative ${className}`}>
      {/* Tipping Status Overlay */}
      {isTipping && (
        <div className="absolute inset-0 z-10 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl transition-all duration-300">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-xl border border-blue-100 dark:border-blue-900 flex flex-col items-center gap-3 animate-fadeIn">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">Processing Tip</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Waiting for blockchain confirmation...</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <div>
          <a href={`/u/${getUserAddress(post)}`}>
            {getDisplayName(post)}
          </a>
          <span>{formatTimestamp(post.createdAt)}</span>
        </div>

        <div>
          {showTrending && post.trendingStatus && (
            <TrendingBadge level={post.trendingStatus} score={post.engagementScore} showScore />
          )}

          <button
            onClick={handleBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
            className={isBookmarked ? 'text-yellow-500' : ''}
          >
            Bookmark
          </button>

          <ReportContentButton
            contentId={post.id}
            contentType="post"
          />
        </div>
      </div>

      {/* Moderation Warning */}
      {post.moderationStatus && post.moderationStatus !== 'active' && (
        <ModerationWarning
          status={post.moderationStatus}
          warning={post.moderationWarning}
          riskScore={post.riskScore}
          className="mb-3"
        />
      )}

      {/* Content */}
      <div>
        {loading ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ) : error === 'BACKEND_IPFS_ERROR' ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                  Content Temporarily Unavailable
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                  We're experiencing technical difficulties loading content from our storage system. Our team has been notified and is working on a fix.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Post ID: {post.id}
                </p>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">Error loading content</p>
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                {/* Still show content if we have it, even if there was an error */}
                {content && content !== 'No content available' && content !== 'Content not available' && (
                  <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{content}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : content ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-gray-100"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(linkifyHtmlUrls(content), {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
                ALLOW_DATA_ATTR: false,
                FORBID_TAGS: ['style', 'script', 'object', 'embed', 'iframe'],
                FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
              })
            }}
          />
        ) : (
          <p className="text-gray-500 dark:text-gray-400 italic">No content available</p>
        )}

        {/* Video Embeds - Auto-detected from content URLs */}
        {videoEmbeds.length > 0 && (
          <div className="mt-4 space-y-4">
            {videoEmbeds.map((videoInfo: VideoInfo, index: number) => (
              <div key={`video-${index}-${videoInfo.id}`} className="rounded-lg overflow-hidden">
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

        {/* Media - Display all images in a grid layout */}
        {post.mediaCids && post.mediaCids.length > 0 && !imageError && (
          <div
            onClick={onExpand}
            className={`mt-3 grid gap-2 ${
              post.mediaCids.length === 1
                ? 'grid-cols-1'
                : post.mediaCids.length === 2
                  ? 'grid-cols-2'
                  : post.mediaCids.length === 3
                    ? 'grid-cols-2'
                    : 'grid-cols-2'
            }`}
          >
            {post.mediaCids.map((mediaCid: string, index: number) => (
              <div
                key={`media-${index}-${mediaCid}`}
                className={`relative overflow-hidden rounded-lg ${
                  post.mediaCids.length === 3 && index === 0
                    ? 'col-span-2'
                    : ''
                }`}
              >
                <OptimizedImage
                  src={mediaCid}
                  alt={`Post media ${index + 1}`}
                  width={post.mediaCids.length === 1 ? 600 : 300}
                  height={post.mediaCids.length === 1 ? 300 : 200}
                  lazy={true}
                  quality={0.85}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', {
                      postId: post.id,
                      mediaCid: mediaCid,
                      index: index,
                      error: e
                    });
                    // Only set error if all images fail
                    if (index === post.mediaCids.length - 1) {
                      setImageError(true);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
        {/* Show error message if image failed to load from all gateways */}
        {post.mediaCids && post.mediaCids.length > 0 && imageError && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Failed to load {post.mediaCids.length > 1 ? 'images' : 'image'} from IPFS
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
              {post.mediaCids.length > 1
                ? `CIDs: ${post.mediaCids.slice(0, 2).join(', ')}${post.mediaCids.length > 2 ? ` (+${post.mediaCids.length - 2} more)` : ''}`
                : `CID: ${post.mediaCids[0]}`
              }
            </p>
            <button
              onClick={() => {
                setImageError(false);
                setIpfsGatewayIndex(0);
              }}
              className="mt-2 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Retry
            </button>
          </div>
        )}
        {/* Debug: Show CIDs */}
        {post.mediaCids && post.mediaCids.length > 0 && process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 mt-1">
            {post.mediaCids.length > 1
              ? `CIDs: ${post.mediaCids.length} images`
              : `CID: ${post.mediaCids[0]}`
            } (Gateway: {ipfsGateways[ipfsGatewayIndex]})
          </div>
        )}

        {/* Previews */}
        {showPreviews && post.previews && post.previews.length > 0 && (
          <div>
            {post.previews.slice(0, 2).map((preview: any, index: number) => (
              <InlinePreviewRenderer key={index} preview={preview} />
            ))}
            {post.previews.length > 2 && (
              <button>Show {post.previews.length - 2} more preview{post.previews.length - 2 > 1 ? 's' : ''}</button>
            )}
          </div>
        )}

        {/* Hashtags */}
        {post.tags && post.tags.length > 0 && (
          <div>
            {post.tags.map((tag: string, index: number) => (
              <a key={index} href={`/hashtag/${tag}`}>#{tag}</a>
            ))}
          </div>
        )}

        {/* Social Proof */}
        {showSocialProof && post.socialProof && (
          <div>
            <SocialProofIndicator socialProof={post.socialProof} />
          </div>
        )}
      </div>

      {/* Enhanced Reactions */}
      <div>
        <EnhancedReactionSystem
          postId={post.id}
          postType="feed"
          initialReactions={post.reactions?.map((r: any) => ({
            type: r.type,
            totalStaked: r.totalAmount || 0,
            userStaked: r.userAmount || 0,
            contributors: r.users?.map((user: any) => user.address) || [],
            rewardsEarned: 0,
            count: r.users?.length || 0
          })) || []}
          onReaction={async (postId, reactionType, amount) => {
            try {
              if (onReaction) {
                await onReaction(postId, reactionType, amount);
              }
            } catch (error) {
              console.error('Reaction error:', error);
            }
          }}
          className="scale-75 origin-left"
        />
      </div>

      {/* Action Buttons */}
      <div>
        <button onClick={() => { }}>
          {post.comments}
        </button>

        <button
          onClick={() => setShowTipModal(true)}
          disabled={!isConnected}
        >
          {post.tips?.reduce((sum: number, tip: any) => sum + tip.amount, 0) || 'Tip'}
        </button>

        <button onClick={() => setShowShareModal(true)}>
          {post.reposts || 'Share'}
        </button>

        {/* Upvote/Downvote Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUpvote}
            className="flex items-center space-x-1 text-gray-500 hover:text-green-600 transition-colors"
            aria-label="Upvote post"
          >
            <span>↑</span>
            <span>{post.upvotes || 0}</span>
          </button>

          <button
            onClick={handleDownvote}
            className="flex items-center space-x-1 text-gray-500 hover:text-red-600 transition-colors"
            aria-label="Downvote post"
          >
            <span>↓</span>
            <span>{post.downvotes || 0}</span>
          </button>
        </div>

        <div className="flex items-center space-x-1 text-gray-500 text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>{viewCount} views</span>
          <span className="mx-1">•</span>
          <span>Score: {post.engagementScore}</span>
        </div>
      </div>

      {/* Tip Modal */}
      {showTipModal && (
        <div data-testid="tip-modal">
          <h3>Send Tip</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const amount = formData.get('amount');
            const token = formData.get('token');
            const message = formData.get('message');

            // Pass the tip data to the handleTip function
            handleTip(
              amount as string,
              token as string,
              message as string
            );
          }}>
            <div>
              <label>Amount</label>
              <input name="amount" type="number" step="0.01" min="0" required />
              <select name="token">
                <option value="USDC">USDC</option>
                <option value="ETH">ETH</option>
                <option value="LDAO">LDAO</option>
              </select>
            </div>
            <div>
              <label>Message (optional)</label>
              <textarea name="message" placeholder="Great post!" />
            </div>
            <div>
              <button type="button" onClick={() => setShowTipModal(false)}>Cancel</button>
              <button type="submit">Tip USDC</button>
            </div>
          </form>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div data-testid="share-modal">
          <h3>Share Post</h3>
          <div>
            <button onClick={() => handleShare('dm')}>Send as Direct Message</button>
            <button onClick={() => handleShare('community')}>Share to Community</button>
            <button onClick={copyToClipboard}>Copy Link</button>
          </div>
        </div>
      )}

      <div role="status" aria-live="polite"></div>
    </article>
  );
};

export default EnhancedPostCard;
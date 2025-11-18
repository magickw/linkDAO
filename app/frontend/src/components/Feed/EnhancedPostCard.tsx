// Mock EnhancedPostCard component for testing
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { useToast } from '../../context/ToastContext';
import { useCacheInvalidation } from '../../hooks/useCacheInvalidation';
import { InlinePreviewRenderer } from '../InlinePreviews/InlinePreviewRenderer';
import SocialProofIndicator from '../SocialProof/SocialProofIndicator';
import TrendingBadge from '../TrendingBadge/TrendingBadge';
import TokenReactionSystem from '../TokenReactionSystem/TokenReactionSystem';
import OptimizedImage from '../OptimizedImage';
import { ModerationWarning, ReportContentButton } from '../Moderation';
import { IPFSContentService } from '../../services/ipfsContentService';

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
}

export const EnhancedPostCard: React.FC<EnhancedPostCardProps> = ({ 
  post, 
  onLike, 
  onComment, 
  onShare,
  onTip,
  onReaction,
  onExpand,
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
        
        // If post has contentCid, fetch from IPFS
        if (post.contentCid) {
          console.log('Fetching content from IPFS for CID:', post.contentCid);
          const contentText = await IPFSContentService.getContentFromIPFS(post.contentCid);
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
            setContent(`Content not available (CID: ${post.contentCid})`);
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
        setError(`Failed to load content: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Even on error, show what content we have
        setContent(post.content || `Content not available`);
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

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    return `${diffInHours}h ago`;
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

  const handleTip = async (amount?: string, token?: string, message?: string) => {
    try {
      if (onTip) {
        await onTip(post.id, amount, token, message);
        safeAddToast('Tip sent successfully!', 'success');
        
        // Invalidate feed cache to reflect updated tip counts
        await invalidateFeedCache();
        
        // Invalidate user cache for tip history
        if (post.author) {
          await invalidateUserCache(post.author, ['tips', 'earnings']);
        }
        
        // If tipping in a community, invalidate community cache
        if (post.communityId) {
          await invalidateCommunityCache(post.communityId, ['posts', 'activity']);
        }
      }
      setShowTipModal(false);
    } catch (error) {
      safeAddToast('Failed to send tip', 'error');
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

  const copyToClipboard = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    await navigator.clipboard.writeText(url);
    handleShare();
  };

  return (
    <article role="article" className={className}>
      {/* Header */}
      <div>
        <div>
          <a href={`/profile/${post.author}`}>
            {post.author.slice(0, 8)}...{post.author.slice(-4)}
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
          <p>Loading content...</p>
        ) : error ? (
          <div>
            <p className="text-red-500">{error}</p>
            {/* Still show content if we have it, even if there was an error */}
            {content && content !== 'No content available' && (
              <p>{content}</p>
            )}
          </div>
        ) : content ? (
          <p>{content}</p>
        ) : (
          <p className="text-gray-500">No content available</p>
        )}

        {/* Media */}
        {post.mediaCids && post.mediaCids.length > 0 && !imageError && (
          <div onClick={onExpand}>
            <OptimizedImage
              src={`${ipfsGateways[ipfsGatewayIndex]}${post.mediaCids[0]}`}
              alt="Post media"
              width={600}
              height={300}
              lazy={true}
              quality={0.85}
              onError={(e) => {
                console.error('Image failed to load:', {
                  postId: post.id,
                  mediaCid: post.mediaCids[0],
                  gateway: ipfsGateways[ipfsGatewayIndex],
                  fullUrl: `${ipfsGateways[ipfsGatewayIndex]}${post.mediaCids[0]}`,
                  error: e
                });

                // Try next gateway if available
                if (ipfsGatewayIndex < ipfsGateways.length - 1) {
                  console.log(`Trying next IPFS gateway: ${ipfsGateways[ipfsGatewayIndex + 1]}`);
                  setIpfsGatewayIndex(ipfsGatewayIndex + 1);
                } else {
                  console.error('All IPFS gateways failed for this image');
                  setImageError(true);
                }
              }}
            />
          </div>
        )}
        {/* Show error message if image failed to load from all gateways */}
        {post.mediaCids && post.mediaCids.length > 0 && imageError && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Failed to load image from IPFS
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
              CID: {post.mediaCids[0]}
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
        {/* Debug: Show CID */}
        {post.mediaCids && post.mediaCids.length > 0 && process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 mt-1">
            CID: {post.mediaCids[0]} (Gateway: {ipfsGateways[ipfsGatewayIndex]})
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

      {/* Token Reactions */}
      <div>
        <TokenReactionSystem
          postId={post.id}
          initialReactions={post.reactions.map((r: any) => ({
            type: r.type,
            totalAmount: r.totalAmount,
            totalCount: r.users.length,
            userAmount: 0,
            topContributors: r.users.slice(0, 3).map((user: any) => ({
              userId: user.address,
              walletAddress: user.address,
              handle: user.username,
              avatar: user.avatar,
              amount: user.amount
            })),
            milestones: []
          }))}
          onReaction={onReaction}
          showAnalytics={true}
        />
      </div>

      {/* Action Buttons */}
      <div>
        <button onClick={() => {}}>
          {post.comments}
        </button>

        <button
          onClick={() => setShowTipModal(true)}
          disabled={!isConnected}
        >
          {post.tips?.reduce((sum: number, tip: any) => sum + tip.amount, 0) || 'Tip'}
        </button>

        <button onClick={() => setShowShareModal(true)}>
          {post.shares || 'Share'}
        </button>

        <div>
          <span>{post.views} views</span>
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
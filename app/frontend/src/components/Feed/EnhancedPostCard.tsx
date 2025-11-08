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
import { ipfsContentService } from '../../services/ipfsContentService';

interface EnhancedPostCardProps {
  post: any;
  className?: string;
  showPreviews?: boolean;
  showSocialProof?: boolean;
  showTrending?: boolean;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string, message?: string) => Promise<void>;
  onShare?: (postId: string, shareType: string, target?: string) => Promise<void>;
  onExpand?: () => void;
}

export const EnhancedPostCard: React.FC<EnhancedPostCardProps> = ({
  post,
  className = '',
  showPreviews = true,
  showSocialProof = true,
  showTrending = true,
  onReaction,
  onTip,
  onShare,
  onExpand
}) => {
  const [showTipModal, setShowTipModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);
  const [content, setContent] = useState<string>('');

  const { isConnected } = useWeb3();
  const { addToast } = useToast();
  const { invalidateFeedCache, invalidateUserCache, invalidateCommunityCache } = useCacheInvalidation();

  // Fetch content from IPFS when component mounts
  useEffect(() => {
    const fetchContent = async () => {
      if (post.contentCid) {
        try {
          const contentText = await ipfsContentService.getContentFromIPFS(post.contentCid);
          setContent(contentText);
        } catch (error) {
          console.error('Failed to fetch content:', error);
          setContent(`Failed to load content (CID: ${post.contentCid})`);
        }
      }
    };

    fetchContent();
  }, [post.contentCid]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    return `${diffInHours}h ago`;
  };

  const handleTip = async (amount: string, token: string, message?: string) => {
    if (!isConnected) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }

    try {
      if (onTip) {
        await onTip(post.id, amount, token, message);
        addToast(`Successfully tipped ${amount} ${token}!`, 'success');
        
        // Invalidate feed cache to reflect updated tip counts
        await invalidateFeedCache();
        
        // Invalidate user cache for tip history
        if (post.author) {
          await invalidateUserCache(post.author, ['tips', 'earnings']);
        }
      }
      setShowTipModal(false);
    } catch (error) {
      addToast('Failed to send tip', 'error');
    }
  };

  const handleShare = async (shareType: string, target?: string) => {
    try {
      if (onShare) {
        await onShare(post.id, shareType, target);
        addToast('Post shared successfully!', 'success');
        
        // Invalidate feed cache to reflect updated share counts
        await invalidateFeedCache();
        
        // If sharing to a community, invalidate community cache
        if (shareType === 'community' && target) {
          await invalidateCommunityCache(target, ['posts', 'activity']);
        }
      }
      setShowShareModal(false);
    } catch (error) {
      addToast('Failed to share post', 'error');
    }
  };

  const handleBookmark = async () => {
    setIsBookmarked(!isBookmarked);
    addToast(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks', 'success');
    
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
    handleShare('external');
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
        <p>{content || 'Loading content...'}</p>

        {/* Media */}
        {post.mediaCids && post.mediaCids.length > 0 && (
          <div onClick={onExpand}>
            <OptimizedImage
              src={`https://ipfs.io/ipfs/${post.mediaCids[0]}`}
              alt="Post media"
              width={600}
              height={300}
              lazy={true}
              quality={0.85}
            />
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
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            handleTip(
              formData.get('amount') as string,
              formData.get('token') as string,
              formData.get('message') as string
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
import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useWeb3 } from '../../context/Web3Context';
import { useToast } from '../../context/ToastContext';
import { EnhancedPost } from '../../types/feed';
import { InlinePreviewRenderer } from '../InlinePreviews/InlinePreviewRenderer';
import SocialProofIndicator from '../SocialProof/SocialProofIndicator';
import TrendingBadge, { calculateTrendingLevel } from '../TrendingBadge/TrendingBadge';
import TokenReactionSystem from '../TokenReactionSystem/TokenReactionSystem';
import OptimizedImage from '../OptimizedImage';
import { ErrorBoundary } from '../ErrorHandling/ErrorBoundary';

interface EnhancedPostCardProps {
  post: EnhancedPost;
  className?: string;
  showPreviews?: boolean;
  showSocialProof?: boolean;
  showTrending?: boolean;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string, message?: string) => Promise<void>;
  onShare?: (postId: string, shareType: 'dm' | 'community' | 'external', target?: string) => Promise<void>;
  onExpand?: () => void;
}

export default function EnhancedPostCard({
  post,
  className = '',
  showPreviews = true,
  showSocialProof = true,
  showTrending = true,
  onReaction,
  onTip,
  onShare,
  onExpand
}: EnhancedPostCardProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  
  // State
  const [expanded, setExpanded] = useState(false);
  const [showAllPreviews, setShowAllPreviews] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);

  // Calculate trending level
  const trendingLevel = useMemo(() => {
    return post.trendingStatus || calculateTrendingLevel(
      post.engagementScore,
      post.createdAt,
      post.reactions.reduce((sum, r) => sum + r.totalAmount, 0),
      post.comments,
      post.shares
    );
  }, [post]);

  // Format timestamp
  const formatTimestamp = useCallback((date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }, []);

  // Get visual hierarchy styles
  const getContentHierarchy = useCallback(() => {
    const isTrending = trendingLevel !== null;
    const hasHighEngagement = post.engagementScore > 1000;

    if (isTrending) {
      return 'ring-1 ring-primary-400 dark:ring-primary-500 shadow-lg shadow-primary-400/10';
    } else if (hasHighEngagement) {
      return 'shadow-lg hover:shadow-xl';
    }
    return 'shadow-md hover:shadow-lg';
  }, [trendingLevel, post.engagementScore]);

  // Get category styling
  const getCategoryStyle = useCallback(() => {
    // Determine content type based on available data
    if (post.mediaCids && post.mediaCids.length > 0) {
      return 'border-l-4 border-l-purple-500'; // media
    } else if (post.previews && post.previews.length > 0) {
      return 'border-l-4 border-l-blue-500'; // link
    } else {
      return 'border-l-4 border-l-gray-300 dark:border-l-gray-600'; // text
    }
  }, [post.mediaCids, post.previews]);

  // Truncate content
  const truncateContent = useCallback((content: string, maxLength: number = 280) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }, []);

  // Handle tip submission
  const handleTip = useCallback(async (amount: string, token: string, message?: string) => {
    if (!isConnected) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }

    try {
      if (onTip) {
        await onTip(post.id, amount, token, message);
        addToast(`Successfully tipped ${amount} ${token}!`, 'success');
      }
      setShowTipModal(false);
    } catch (error) {
      console.error('Tip failed:', error);
      addToast('Failed to send tip', 'error');
    }
  }, [isConnected, onTip, post.id, addToast]);

  // Handle share
  const handleShare = useCallback(async (shareType: 'dm' | 'community' | 'external', target?: string) => {
    try {
      if (onShare) {
        await onShare(post.id, shareType, target);
        addToast(`Post shared successfully!`, 'success');
      }
      setShowShareModal(false);
    } catch (error) {
      console.error('Share failed:', error);
      addToast('Failed to share post', 'error');
    }
  }, [onShare, post.id, addToast]);

  // Handle bookmark toggle
  const handleBookmark = useCallback(async () => {
    try {
      // TODO: Implement bookmark API call
      setIsBookmarked(!isBookmarked);
      addToast(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks', 'success');
    } catch (error) {
      console.error('Bookmark failed:', error);
      addToast('Failed to update bookmark', 'error');
    }
  }, [isBookmarked, addToast]);

  return (
    <ErrorBoundary fallback={<PostErrorFallback />}>
      <div className={`
        bg-white dark:bg-gray-800 rounded-2xl transition-all duration-300 hover:shadow-xl
        ${getContentHierarchy()} ${getCategoryStyle()} ${className}
      `}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* Author Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary-400 to-secondary-500 border-2 border-white dark:border-gray-800 shadow-md">
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {post.author.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                
                {/* Reputation indicator - placeholder */}
              </div>

              {/* Author Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Link 
                    href={`/profile/${post.author}`}
                    className="font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 truncate"
                  >
                    {post.author.slice(0, 8)}...{post.author.slice(-4)}
                  </Link>
                  
                  {/* Verified badge - placeholder */}
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{formatTimestamp(post.createdAt)}</span>
                  
                  {/* Community info would go here */}
                </div>
              </div>
            </div>

            {/* Trending Badge & Actions */}
            <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
              {showTrending && trendingLevel && (
                <TrendingBadge 
                  level={trendingLevel} 
                  score={post.engagementScore}
                  showScore
                />
              )}
              
              {/* Bookmark Button */}
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  isBookmarked 
                    ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
              >
                <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Title - Posts don't have titles in this model */}

          {/* Content */}
          <div className="mb-4">
            <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
              Content from IPFS: {post.contentCid}
            </p>
          </div>

          {/* Media */}
          {post.mediaCids && post.mediaCids.length > 0 && (
            <div className="mb-4 rounded-xl overflow-hidden cursor-pointer" onClick={onExpand}>
              <OptimizedImage
                src={`https://ipfs.io/ipfs/${post.mediaCids[0]}`}
                alt="Post media"
                width={600}
                height={300}
                className="w-full h-64 object-cover transition-transform duration-500 hover:scale-105"
                lazy={true}
                quality={0.85}
              />
            </div>
          )}

          {/* Inline Previews */}
          {showPreviews && post.previews.length > 0 && (
            <div className="mb-4">
              {post.previews.slice(0, showAllPreviews ? undefined : 2).map((contentPreview, index) => {
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
                >
                  Show {post.previews.length - 2} more preview{post.previews.length - 2 > 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}

          {/* Hashtags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag, index) => (
                <Link
                  key={index}
                  href={`/hashtag/${tag}`}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-200"
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
        </div>

        {/* Interaction Bar */}
        <div className="px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50">
          {/* Token Reactions */}
          <div className="mb-4">
            <TokenReactionSystem
              postId={post.id}
              initialReactions={post.reactions.map(r => ({
                type: r.type as any,
                totalAmount: r.totalAmount,
                totalCount: r.users.length,
                userAmount: 0, // This would need to be calculated based on current user
                topContributors: r.users.slice(0, 3).map(user => ({ 
                  userId: user.address,
                  walletAddress: user.address,
                  handle: user.username,
                  avatar: user.avatar,
                  amount: user.amount
                })),
                milestones: [] // Empty milestones for now
              }))}
              onReaction={onReaction}
              showAnalytics={true}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Comment Button */}
              <button
                onClick={() => setExpanded(true)}
                className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm font-medium">{post.comments}</span>
              </button>

              {/* Tip Button */}
              <button
                onClick={() => setShowTipModal(true)}
                className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors duration-200"
                disabled={!isConnected}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="text-sm font-medium">
                  {post.tips.reduce((sum, tip) => sum + tip.amount, 0) || 'Tip'}
                </span>
              </button>

              {/* Share Button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span className="text-sm font-medium">{post.shares || 'Share'}</span>
              </button>
            </div>

            {/* Engagement Stats */}
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{post.views} views</span>
              <span>Score: {post.engagementScore}</span>
            </div>
          </div>
        </div>

        {/* Tip Modal */}
        {showTipModal && (
          <TipModal
            isOpen={showTipModal}
            postId={post.id}
            authorAddress={post.author}
            onTip={handleTip}
            onClose={() => setShowTipModal(false)}
          />
        )}

        {/* Share Modal */}
        {showShareModal && (
          <ShareModal
            isOpen={showShareModal}
            post={post}
            onShare={handleShare}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

// Tip Modal Component
interface TipModalProps {
  isOpen: boolean;
  postId: string;
  authorAddress: string;
  onTip: (amount: string, token: string, message?: string) => Promise<void>;
  onClose: () => void;
}

function TipModal({ isOpen, postId, authorAddress, onTip, onClose }: TipModalProps) {
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('USDC');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setLoading(true);
    try {
      await onTip(amount, token, message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Send Tip</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                step="0.01"
                min="0"
                required
              />
              <select
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="USDC">USDC</option>
                <option value="ETH">ETH</option>
                <option value="LDAO">LDAO</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Great post!"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
            >
              {loading ? 'Sending...' : `Tip ${amount} ${token}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Share Modal Component
interface ShareModalProps {
  isOpen: boolean;
  post: EnhancedPost;
  onShare: (shareType: 'dm' | 'community' | 'external', target?: string) => Promise<void>;
  onClose: () => void;
}

function ShareModal({ isOpen, post, onShare, onClose }: ShareModalProps) {
  const [shareType, setShareType] = useState<'dm' | 'community' | 'external'>('external');
  const [target, setTarget] = useState('');

  const handleShare = async () => {
    await onShare(shareType, target);
  };

  const copyToClipboard = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    await navigator.clipboard.writeText(url);
    onShare('external');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Post</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onShare('dm')}
            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900 dark:text-white">Send as Direct Message</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Share privately with someone</div>
            </div>
          </button>

          <button
            onClick={() => onShare('community')}
            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900 dark:text-white">Share to Community</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Cross-post to another community</div>
            </div>
          </button>

          <button
            onClick={copyToClipboard}
            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900 dark:text-white">Copy Link</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Copy post URL to clipboard</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Post Error Fallback
function PostErrorFallback() {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-sm font-medium">Failed to load post</span>
      </div>
    </div>
  );
}
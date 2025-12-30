import React, { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import TokenReactionSystem from './TokenReactionSystem/TokenReactionSystem';
import SharePostModal from './SharePostModal';
import RepostModal from './RepostModal';
import CommunityTipButton from './CommunityTipButton';
import AwardSelectionModal from './TokenReactionSystem/AwardSelectionModal';
import { communityWeb3Service } from '@/services/communityWeb3Service';

interface PostInteractionBarProps {
  post: {
    id: string;
    title?: string;
    contentCid: string;
    content?: string;
    media?: string[];
    author: string;
    communityId?: string;
    communityName?: string;
    commentCount?: number;
    shareId?: string;
    isRepostedByMe?: boolean;
    authorProfile?: {
      avatar?: string;
      handle?: string;
    };
    stakedValue?: number;
  };
  postType: 'feed' | 'community' | 'enhanced';
  userMembership?: any;
  onComment?: () => void;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onShare?: (postId: string, shareType: string, message?: string, media?: string[]) => Promise<void>;
  onUnrepost?: (postId: string) => Promise<void>;
  onAward?: (postId: string) => void;
  className?: string;
}

export default function PostInteractionBar({
  post,
  postType,
  userMembership,
  onComment,
  onReaction,
  onTip,
  onShare,
  onUnrepost,
  onAward,
  className = ''
}: PostInteractionBarProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  const [showShareModal, setShowShareModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showTipInput, setShowTipInput] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('USDC');

  // Handle comment button click
  const handleCommentClick = () => {
    if (!isConnected) {
      addToast('Please connect your wallet to comment', 'error');
      return;
    }

    if (postType === 'community' && !userMembership) {
      addToast('You must join the community to comment', 'error');
      return;
    }

    if (onComment) {
      onComment();
    }
  };

  // Handle share button click
  const handleShareClick = () => {
    setShowShareModal(true);
  };

  // Handle repost button click
  const handleRepostClick = async () => {
    if (!isConnected) {
      addToast('Please connect your wallet to repost', 'error');
      return;
    }

    if (post.isRepostedByMe && onUnrepost) {
      if (window.confirm('Remove this repost from your timeline?')) {
        await onUnrepost(post.id);
      }
    } else {
      setShowRepostModal(true);
    }
  };

  // Handle save post
  const handleSavePost = () => {
    if (!isConnected) {
      addToast('Please connect your wallet to save posts', 'error');
      return;
    }

    // TODO: Implement save post functionality
    addToast('Post saved to your collection!', 'success');
  };

  // Handle quick tip
  const handleQuickTip = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }

    if (!tipAmount || parseFloat(tipAmount) <= 0) {
      addToast('Please enter a valid tip amount', 'error');
      return;
    }

    if (address?.toLowerCase() === post.author.toLowerCase()) {
      addToast('You cannot tip yourself', 'error');
      return;
    }

    try {
      // Use real blockchain tipping functionality
      const txHash = await communityWeb3Service.tipCommunityPost({
        postId: post.id,
        recipientAddress: post.author,
        amount: tipAmount,
        token: selectedToken,
        message: ''
      });

      if (onTip) {
        // Let the parent component handle the success message
        await onTip(post.id, tipAmount, selectedToken);
        // Don't show success message here since the parent component will handle it
      } else {
        // Only show success message if there's no parent handler
        addToast(`Successfully tipped ${tipAmount} ${selectedToken}! Transaction: ${txHash.substring(0, 10)}...`, 'success');
      }

      setTipAmount('');
      setShowTipInput(false);
    } catch (error: any) {
      console.error('Error sending tip:', error);
      // Only show error message here
      addToast(`Failed to send tip: ${error.message || 'Please try again.'}`, 'error');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center space-x-4">
          {/* Comment Button */}
          <button
            onClick={handleCommentClick}
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium transition-colors duration-200 hover:scale-105"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="hidden sm:inline">{post.commentCount || 0} Comments</span>
            <span className="sm:hidden">{post.commentCount || 0}</span>
          </button>

          {/* Repost Button - Only show for non-community posts and ensure strict check */}
          {postType !== 'community' && !post.communityId && (
            <button
              onClick={handleRepostClick}
              className={`flex items-center space-x-2 text-sm font-medium transition-colors duration-200 hover:scale-105 ${post.isRepostedByMe
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400'
                }`}
              aria-label={post.isRepostedByMe ? "Undo repost" : "Repost to your timeline"}
            >
              <svg className={`h-5 w-5 ${post.isRepostedByMe ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">{post.isRepostedByMe ? 'Reposted' : 'Repost'}</span>
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={handleShareClick}
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium transition-colors duration-200 hover:scale-105"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Tip Button */}
          {postType === 'community' && userMembership ? (
            <CommunityTipButton
              postId={post.id}
              recipientAddress={post.author}
              communityId={post.communityId || ''}
              onTip={onTip}
            />
          ) : (
            <button
              onClick={() => setShowTipInput(!showTipInput)}
              className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium transition-colors duration-200 hover:scale-105"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Tip</span>
            </button>
          )}

          {/* Award Button */}
          <button
            onClick={() => setShowAwardModal(true)}
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium transition-colors duration-200 hover:scale-105"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            <span className="hidden sm:inline">Award</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSavePost}
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium transition-colors duration-200 hover:scale-105"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>


      </div>

      {/* Quick Tip Input */}
      {showTipInput && (postType === 'feed' || postType === 'enhanced') && (
        <form onSubmit={handleQuickTip} className="flex items-center space-x-2 animate-fadeIn">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
            placeholder="Amount"
            className="w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-l-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="px-3 py-2 text-sm border-y border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-white"
          >
            <option value="USDC">USDC</option>
            <option value="ETH">ETH</option>
            <option value="LDAO">LDAO</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-r-lg transition-all duration-200 font-medium"
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => setShowTipInput(false)}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200"
          >
            Cancel
          </button>
        </form>
      )}



      {/* Share Modal */}
      <SharePostModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
        }}
        post={post}
        postType={postType}
        onShare={onShare}
        addToast={addToast}
      />

      {/* Repost Modal */}
      <RepostModal
        isOpen={showRepostModal}
        onClose={() => setShowRepostModal(false)}
        post={post}
        onRepost={async (postId, message) => {
          if (onShare) {
            await onShare(postId, 'timeline', message);
          }
        }}
      />

      {/* Award Selection Modal */}
      <AwardSelectionModal
        isOpen={showAwardModal}
        postId={post.id}
        userGoldBalance={0} // TODO: Fetch user's actual gold balance
        onAwardGiven={async (awardId: string) => {
          if (onAward) {
            await onAward(post.id);
          }
          addToast('Award given successfully!', 'success');
        }}
        onClose={() => setShowAwardModal(false)}
      />
    </div>
  );
}
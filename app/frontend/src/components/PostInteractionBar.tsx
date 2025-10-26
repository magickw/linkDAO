import React, { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import EnhancedReactionSystem from './EnhancedReactionSystem';
import SharePostModal from './SharePostModal';
import CommunityTipButton from './CommunityTipButton';

interface PostInteractionBarProps {
  post: {
    id: string;
    title?: string;
    contentCid: string;
    author: string;
    dao?: string;
    communityId?: string;
    commentCount?: number;
    stakedValue?: number;
  };
  postType: 'feed' | 'community' | 'enhanced';
  userMembership?: any;
  onComment?: () => void;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onShare?: (postId: string, shareType: string, message?: string) => Promise<void>;
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
  className = ''
}: PostInteractionBarProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  const [showShareModal, setShowShareModal] = useState(false);
  const [showTipInput, setShowTipInput] = useState(false);
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
    
    if (!isConnected) {
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
      if (onTip) {
        await onTip(post.id, tipAmount, selectedToken);
      }
      
      addToast(`Successfully tipped ${tipAmount} ${selectedToken}!`, 'success');
      setTipAmount('');
      setShowTipInput(false);
    } catch (error) {
      console.error('Error sending tip:', error);
      addToast('Failed to send tip. Please try again.', 'error');
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Enhanced Reaction System */}
      <EnhancedReactionSystem
        postId={post.id}
        postType={postType}
        onReaction={onReaction}
      />

      {/* Action Buttons - Facebook-style */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          {/* Comment Button */}
          <button
            onClick={handleCommentClick}
            className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 text-sm font-medium transition-colors duration-200 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="hidden sm:inline text-xs">{post.commentCount || 0}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShareClick}
            className="flex items-center space-x-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 text-sm font-medium transition-colors duration-200 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="hidden sm:inline text-xs">Share</span>
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
              className="flex items-center space-x-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 text-sm font-medium transition-colors duration-200 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline text-xs">Tip</span>
            </button>
          )}

          {/* Save Button */}
          <button
            onClick={handleSavePost}
            className="flex items-center space-x-2 text-gray-500 hover:text-yellow-600 dark:text-gray-400 dark:hover:text-yellow-400 text-sm font-medium transition-colors duration-200 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="hidden sm:inline text-xs">Save</span>
          </button>
        </div>

        {/* Staked Value Display */}
        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {post.stakedValue ? `${post.stakedValue} $LNK` : '0 $LNK'}
        </div>
      </div>

      {/* Quick Tip Input */}
      {showTipInput && (postType === 'feed' || postType === 'enhanced') && (
        <form onSubmit={handleQuickTip} className="flex items-center space-x-2 animate-fadeIn bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
            placeholder="Amount"
            className="w-20 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded dark:bg-gray-600 dark:text-white focus:ring-1 focus:ring-primary-500 focus:border-transparent"
          />
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 dark:text-white"
          >
            <option value="USDC">USDC</option>
            <option value="ETH">ETH</option>
            <option value="LDAO">LDAO</option>
          </select>
          <button
            type="submit"
            className="px-3 py-1 text-xs bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded transition-all duration-200 font-medium"
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => setShowTipInput(false)}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Share Modal */}
      <SharePostModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={post}
        postType={postType}
        onShare={onShare}
      />
    </div>
  );
}

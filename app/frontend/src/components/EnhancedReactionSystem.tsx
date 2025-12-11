import React, { useState, useCallback, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { ldaoTokenService } from '@/services/web3/ldaoTokenService';
import { tokenReactionService } from '@/services/tokenReactionService';
import { 
  checkAuthentication, 
  checkWalletConnection, 
  handleReactionWithAuth, 
  getReactionsWithFallback 
} from '@/utils/reactionFixes';

interface Reaction {
  type: 'hot' | 'diamond' | 'bullish' | 'governance' | 'art' | 'like' | 'love' | 'laugh' | 'angry' | 'sad';
  emoji: string;
  label: string;
  totalStaked: number;
  userStaked: number;
  contributors: string[];
  rewardsEarned: number;
  count: number; // For simple reactions without staking
}

interface EnhancedReactionSystemProps {
  postId: string;
  postType: 'feed' | 'community' | 'enhanced';
  initialReactions?: Reaction[];
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  className?: string;
}

const FEED_REACTIONS: Omit<Reaction, 'totalStaked' | 'userStaked' | 'contributors' | 'rewardsEarned' | 'count'>[] = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'laugh', emoji: '😂', label: 'Laugh' },
  { type: 'angry', emoji: '😠', label: 'Angry' },
  { type: 'sad', emoji: '😢', label: 'Sad' }
];

const COMMUNITY_REACTIONS: Omit<Reaction, 'totalStaked' | 'userStaked' | 'contributors' | 'rewardsEarned' | 'count'>[] = [
  { type: 'hot', emoji: '🔥', label: 'Hot Take' },
  { type: 'diamond', emoji: '💎', label: 'Diamond Hands' },
  { type: 'bullish', emoji: '🚀', label: 'Bullish' },
  { type: 'governance', emoji: '⚖️', label: 'Governance' },
  { type: 'art', emoji: '🎨', label: 'Art Appreciation' }
];

// Helper to format wallet address in shortened form (e.g., "0x1234...5678")
const formatShortAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return address.substring(0, 6) + '...' + address.substring(address.length - 4);
};

export default function EnhancedReactionSystem({
  postId,
  postType,
  initialReactions = [],
  onReaction,
  className = ''
}: EnhancedReactionSystemProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  // Initialize reactions based on post type
  const getInitialReactions = useCallback(() => {
    const baseReactions = postType === 'community' ? COMMUNITY_REACTIONS : FEED_REACTIONS;
    
    return baseReactions.map(base => {
      const existing = initialReactions.find(r => r.type === base.type);
      return {
        ...base,
        totalStaked: existing?.totalStaked || 0,
        userStaked: existing?.userStaked || 0,
        contributors: existing?.contributors || [],
        rewardsEarned: existing?.rewardsEarned || 0,
        count: existing?.count || 0
      };
    });
  }, [postType, initialReactions]);

  const [reactions, setReactions] = useState<Reaction[]>(getInitialReactions());
  const [isFetchingReactions, setIsFetchingReactions] = useState(true);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState('1');

  // Merge backend summaries with current local state to preserve user interactions
  const mergeReactions = useCallback((summaries: any[]) => {
    setReactions(prev => prev.map(reaction => {
      const summary = summaries.find(s => s.type === reaction.emoji);
      if (summary) {
        return {
          ...reaction,
          // Preserve user's local stake (they just interacted with it)
          // Only update if local userStaked is 0 (no recent user interaction)
          userStaked: reaction.userStaked > 0 ? reaction.userStaked : (summary.userAmount || 0),
          totalStaked: summary.totalAmount || 0,
          count: summary.totalCount || 0,
          // Format all contributor addresses to shortened format for consistency
          contributors: summary.topContributors?.map((c: any) => formatShortAddress(c.walletAddress)) || []
        };
      }
      return reaction;
    }));
  }, []);

  // Sync initialReactions prop into state when it changes
  useEffect(() => {
    const updated = getInitialReactions();
    setReactions(updated);
    setIsFetchingReactions(true);
  }, [initialReactions, postType, getInitialReactions]);

  // Fetch reactions from backend and merge with local state
  useEffect(() => {
    const fetchReactions = async () => {
      try {
        // Use the enhanced reaction fetcher with fallback
        const summaries = await getReactionsWithFallback(postId);
        
        if (summaries && summaries.length > 0) {
          // Merge backend data with current local state to preserve user interactions
          mergeReactions(summaries);
        }
      } catch (error) {
        console.error('Failed to fetch reactions:', error);
      } finally {
        setIsFetchingReactions(false);
      }
    };

    if (postId) {
      fetchReactions();
    } else {
      setIsFetchingReactions(false);
    }
  }, [postId, mergeReactions]);

  // Handle simple reaction (for feed posts)
  const handleSimpleReaction = async (reactionType: string) => {
    if (!isConnected) {
      addToast('Please connect your wallet to react', 'error');
      return;
    }

    // Check authentication
    if (!checkAuthentication()) {
      addToast('Please authenticate to react. Try refreshing the page.', 'error');
      return;
    }

    try {
      // Use the enhanced reaction handler
      await handleReactionWithAuth(postId, reactionType, 0);

      // Update local state
      setReactions(prev => prev.map(reaction => {
        if (reaction.type === reactionType) {
          const hasUserReacted = reaction.userStaked > 0 || reaction.count > 0;
          return {
            ...reaction,
            count: hasUserReacted ? Math.max(0, reaction.count - 1) : reaction.count + 1,
            userStaked: hasUserReacted ? 0 : 1 // Use userStaked as a flag for user interaction
          };
        }
        return reaction;
      }));

      addToast(`Reacted with ${reactionType}!`, 'success');
    } catch (error: any) {
      console.error('Error reacting:', error);
      addToast(error.message || 'Failed to react. Please try again.', 'error');
    }
  };

  // Handle reaction with staking
  const handleReactionWithStake = async (reactionType: string, amount: number) => {
    if (!isConnected) {
      addToast('Please connect your wallet to react', 'error');
      return;
    }

    // Check authentication
    if (!checkAuthentication()) {
      addToast('Please authenticate to react. Try refreshing the page.', 'error');
      return;
    }

    try {
      // Use real LDAO staking functionality
      const stakeResult = await ldaoTokenService.stakeTokens(amount.toString(), 1); // Use tier 1 (30 days)
      
      if (!stakeResult.success) {
        addToast(stakeResult.error || 'Failed to stake LDAO tokens', 'error');
        return;
      }

      // Use the enhanced reaction handler
      await handleReactionWithAuth(postId, reactionType, amount);

      // Update local state
      setReactions(prev => prev.map(reaction => {
        if (reaction.type === reactionType) {
          const reward = amount * 0.1;
          return {
            ...reaction,
            totalStaked: reaction.totalStaked + amount,
            userStaked: reaction.userStaked + amount,
            rewardsEarned: reaction.rewardsEarned + reward,
            // Use same address formatting helper for consistency
            contributors: [...reaction.contributors, formatShortAddress(address!)]
          };
        }
        return reaction;
      }));

      addToast(`Successfully staked ${amount} $LDAO on ${reactionType} reaction!`, 'success');
      setShowStakeModal(null);
      setStakeAmount('1');
    } catch (error: any) {
      console.error('Error reacting:', error);
      addToast(error.message || 'Failed to react. Please try again.', 'error');
    }
  };

  // Handle reaction click
  const handleReactionClick = (reactionType: string) => {
    if (postType === 'community') {
      setShowStakeModal(reactionType);
    } else {
      handleSimpleReaction(reactionType);
    }
  };

  // Get top reactions to display
  const getTopReactions = () => {
    return reactions
      .filter(r => (postType === 'community' ? r.totalStaked > 0 : r.count > 0))
      .sort((a, b) => (postType === 'community' || postType === 'enhanced' ? b.totalStaked - a.totalStaked : b.count - a.count))
      .slice(0, 5);
  };

  const topReactions = getTopReactions();

  // Show loading state or withhold rendering during initial fetch to prevent stale UI flash
  if (isFetchingReactions && topReactions.length === 0) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex gap-2 mb-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Reaction Display */}
      <div className="flex flex-wrap gap-2 mb-3">
        {topReactions.map((reaction) => (
          <button
            key={reaction.type}
            onClick={() => handleReactionClick(reaction.type)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
              (postType === 'community' || postType === 'enhanced' ? reaction.userStaked > 0 : reaction.userStaked > 0)
                ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md animate-pulse'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span className="text-lg">{reaction.emoji}</span>
            <span>
              {postType === 'community' || postType === 'enhanced' ? reaction.totalStaked : reaction.count}
            </span>
            {(postType === 'community' || postType === 'enhanced') && reaction.userStaked > 0 && (
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                +{reaction.userStaked}
              </span>
            )}
            {postType === 'community' && (
              <span className="text-xs bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 rounded-full px-2 py-0.5">
                {reaction.rewardsEarned.toFixed(1)}★
              </span>
            )}
          </button>
        ))}

        {/* Add Reaction Button */}
        <button
          onClick={() => setShowReactionPicker(!showReactionPicker)}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {/* Reaction Picker */}
      {showReactionPicker && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-10">
          <div className="grid grid-cols-5 gap-2">
            {reactions.map((reaction) => (
              <button
                key={reaction.type}
                onClick={() => {
                  handleReactionClick(reaction.type);
                  setShowReactionPicker(false);
                }}
                className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                title={reaction.label}
              >
                <span className="text-2xl mb-1">{reaction.emoji}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {reaction.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Staking Modal for Community Posts */}
      {showStakeModal && postType === 'community' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Stake on Reaction
              </h4>
              <button
                onClick={() => setShowStakeModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center mb-4">
              <div className="text-4xl mb-2">
                {reactions.find(r => r.type === showStakeModal)?.emoji}
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white">
                {reactions.find(r => r.type === showStakeModal)?.label}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stake Amount (LDAO)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter amount to stake"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Higher stakes earn more rewards and have more influence
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleReactionWithStake(showStakeModal, parseFloat(stakeAmount))}
                disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Stake & React
              </button>
              <button
                onClick={() => setShowStakeModal(null)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close reaction picker */}
      {showReactionPicker && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowReactionPicker(false)}
        />
      )}
    </div>
  );
}
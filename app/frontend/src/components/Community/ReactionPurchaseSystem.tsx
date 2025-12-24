import React, { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { ldaoTokenService } from '@/services/web3/ldaoTokenService';

interface Reaction {
  type: string;
  emoji: string;
  label: string;
  price: number; // LDAO tokens required to purchase
  count: number; // How many times this reaction was purchased
  userOwned: boolean; // Whether current user owns this reaction
}

interface ReactionPurchaseSystemProps {
  postId: string;
  postAuthor: string; // Author's wallet address
  reactions: Reaction[];
  onReactionPurchase: (postId: string, reactionType: string) => Promise<void>;
}

const REACTION_PRICES = {
  hot: 1,
  diamond: 2,
  bullish: 1,
  love: 1,
  laugh: 1,
  wow: 2,
};

export default function ReactionPurchaseSystem({ 
  postId, 
  postAuthor,
  reactions, 
  onReactionPurchase 
}: ReactionPurchaseSystemProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handlePurchaseReaction = async (reactionType: string) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    const price = REACTION_PRICES[reactionType as keyof typeof REACTION_PRICES] || 1;
    const authorShare = Math.floor(price * 0.7); // 70% to author
    const treasuryShare = price - authorShare; // 30% to treasury
    
    try {
      setPurchasing(reactionType);
      
      // Split payment: 70% to author, 30% to treasury
      if (authorShare > 0) {
        const authorResult = await ldaoTokenService.transferTokens(
          postAuthor,
          authorShare.toString()
        );
        
        if (!authorResult.success) {
          addToast(authorResult.error || 'Failed to send payment to author', 'error');
          return;
        }
      }
      
      if (treasuryShare > 0) {
        const treasuryResult = await ldaoTokenService.transferTokens(
          '0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5', // Treasury address
          treasuryShare.toString()
        );
        
        if (!treasuryResult.success) {
          addToast(treasuryResult.error || 'Failed to send payment to treasury', 'error');
          return;
        }
      }

      await onReactionPurchase(postId, reactionType);
      addToast(`Purchased ${reactionType} reaction! Author earned ${authorShare} LDAO`, 'success');
    } catch (error) {
      console.error('Error purchasing reaction:', error);
      addToast('Failed to purchase reaction', 'error');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reactions</h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {reactions.reduce((sum, r) => sum + r.count, 0)} total
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {reactions.map((reaction) => (
          <button
            key={reaction.type}
            onClick={() => handlePurchaseReaction(reaction.type)}
            disabled={purchasing === reaction.type || reaction.userOwned}
            className={`flex flex-col items-center p-2 rounded-lg border transition-all duration-200 ${
              reaction.userOwned
                ? 'bg-primary-100 border-primary-300 dark:bg-primary-900/30 dark:border-primary-600'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-primary-500'
            } ${purchasing === reaction.type ? 'opacity-50' : ''}`}
            title={`${reaction.label} - ${reaction.price} LDAO (${Math.floor(reaction.price * 0.7)} to author)${reaction.userOwned ? ' (Owned)' : ''}`}
          >
            <span className="text-2xl mb-1">{reaction.emoji}</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {reaction.count}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {reaction.userOwned ? 'Owned' : `${reaction.price} LDAO`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
/**
 * TokenReactionSystem Component
 * Main component for token-based reactions with 🔥🚀💎 reaction types
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { useToast } from '../../context/ToastContext';
import {
  TokenReactionSystemProps,
  ReactionSummary,
  ReactionType,
  REACTION_TYPES,
  CelebrationEvent
} from '../../types/tokenReaction';
import tokenReactionService from '../../services/tokenReactionService';
import ReactionButton from './ReactionButton';
import ReactorModal from './ReactorModal';
import ReactionStakeModal from './ReactionStakeModal';
import CelebrationAnimation from './CelebrationAnimation';

const TokenReactionSystem: React.FC<TokenReactionSystemProps> = ({
  postId,
  initialReactions = [],
  onReaction,
  onViewReactors,
  showAnalytics = false,
  className = ''
}) => {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  // State management
  const [reactions, setReactions] = useState<ReactionSummary[]>(initialReactions);
  const [isLoading, setIsLoading] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState<ReactionType | null>(null);
  const [showReactorModal, setShowReactorModal] = useState<{
    isOpen: boolean;
    reactionType?: ReactionType;
  }>({ isOpen: false });
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);

  // Load reactions on mount
  useEffect(() => {
    if (postId && initialReactions.length === 0) {
      loadReactions();
    }
  }, [postId]);

  const loadReactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const summaries = await tokenReactionService.getReactionSummaries(postId);
      setReactions(summaries);
    } catch (error) {
      console.error('Failed to load reactions:', error);
      addToast('Failed to load reactions', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [postId, addToast]);

  // Handle reaction click
  const handleReactionClick = useCallback((reactionType: ReactionType) => {
    if (!isConnected) {
      addToast('Please connect your wallet to react', 'error');
      return;
    }

    setShowStakeModal(reactionType);
  }, [isConnected, addToast]);

  // Handle stake submission
  const handleStake = useCallback(async (reactionType: ReactionType, amount: number) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    try {
      setIsLoading(true);

      // Validate input
      const validation = tokenReactionService.validateReactionInput(reactionType, amount);
      if (!validation.isValid) {
        addToast(validation.errors[0], 'error');
        return;
      }

      // Create reaction
      const response = await tokenReactionService.createReaction({
        postId,
        type: reactionType,
        amount
      });

      if (response.success) {
        // Update local state
        setReactions(prev => {
          const updated = [...prev];
          const existingIndex = updated.findIndex(r => r.type === reactionType);
          
          if (existingIndex >= 0) {
            updated[existingIndex] = response.newSummary;
          } else {
            updated.push(response.newSummary);
          }
          
          return updated;
        });

        // Show success message
        const config = REACTION_TYPES[reactionType];
        addToast(
          `Successfully staked ${amount} tokens on ${config.name} reaction! Earned ${response.rewardsEarned.toFixed(2)} rewards.`,
          'success'
        );

        // Trigger celebration if milestone reached
        if (response.milestoneReached) {
          setCelebration({
            type: 'milestone',
            reactionType,
            amount,
            milestone: response.milestoneReached,
            animation: config.animation,
            message: `Milestone reached! ${response.milestoneReached.description}`
          });
        } else if (amount >= 100) {
          setCelebration({
            type: 'big_stake',
            reactionType,
            amount,
            animation: config.animation,
            message: `Big stake! ${amount} ${config.name} tokens!`
          });
        }

        // Call external handler
        if (onReaction) {
          await onReaction(postId, reactionType, amount);
        }

        setShowStakeModal(null);
      }
    } catch (error: any) {
      console.error('Failed to create reaction:', error);
      addToast(error.message || 'Failed to create reaction', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, postId, onReaction, addToast]);

  // Handle view reactors
  const handleViewReactors = useCallback((reactionType?: ReactionType) => {
    setShowReactorModal({ isOpen: true, reactionType });
    
    if (onViewReactors) {
      onViewReactors(postId, reactionType);
    }
  }, [postId, onViewReactors]);

  // Get user's stake for a reaction type
  const getUserStake = useCallback((reactionType: ReactionType): number => {
    const reaction = reactions.find(r => r.type === reactionType);
    return reaction?.userAmount || 0;
  }, [reactions]);

  // Get top reactions to display
  const getTopReactions = useCallback(() => {
    return reactions
      .filter(r => r.totalAmount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 3);
  }, [reactions]);

  const topReactions = getTopReactions();

  return (
    <div className={`token-reaction-system ${className}`}>
      {/* Main Reaction Display */}
      <div className="flex flex-wrap gap-2 mb-3">
        {topReactions.map((reaction) => (
          <ReactionButton
            key={reaction.type}
            reactionType={reaction.type}
            summary={reaction}
            isUserReacted={reaction.userAmount > 0}
            onClick={() => handleReactionClick(reaction.type)}
            className="transition-all duration-200 hover:scale-105"
          />
        ))}

        {/* Add Reaction Button */}
        <div className="relative">
          <button
            onClick={() => {
              // Show all reaction types if none are active
              const availableTypes = Object.keys(REACTION_TYPES) as ReactionType[];
              const inactiveTypes = availableTypes.filter(
                type => !reactions.find(r => r.type === type && r.totalAmount > 0)
              );
              
              if (inactiveTypes.length > 0) {
                handleReactionClick(inactiveTypes[0]);
              }
            }}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
            title="Add reaction"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Analytics Summary (if enabled) */}
      {showAnalytics && topReactions.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {topReactions.reduce((sum, r) => sum + r.totalCount, 0)} reactions
            </span>
            <span>
              {tokenReactionService.formatReactionAmount(
                topReactions.reduce((sum, r) => sum + r.totalAmount, 0)
              )} tokens staked
            </span>
            <button
              onClick={() => handleViewReactors()}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View all
            </button>
          </div>
        </div>
      )}

      {/* Reaction Stake Modal */}
      {showStakeModal && (
        <ReactionStakeModal
          isOpen={true}
          reactionType={showStakeModal}
          postId={postId}
          currentUserStake={getUserStake(showStakeModal)}
          onStake={(amount) => handleStake(showStakeModal, amount)}
          onClose={() => setShowStakeModal(null)}
          isLoading={isLoading}
        />
      )}

      {/* Reactor Modal */}
      <ReactorModal
        isOpen={showReactorModal.isOpen}
        postId={postId}
        reactionType={showReactorModal.reactionType}
        onClose={() => setShowReactorModal({ isOpen: false })}
      />

      {/* Celebration Animation */}
      {celebration && (
        <CelebrationAnimation
          event={celebration}
          onComplete={() => setCelebration(null)}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  );
};

export default TokenReactionSystem;
/**
 * EnhancedReactionSystem Component
 * Advanced Web3-native reaction system with visual feedback and token integration
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Web3InteractionButtons, { Web3ReactionType, WEB3_REACTIONS } from './Web3InteractionButtons';
import { 
  FloatingReaction, 
  PulseEffect, 
  RippleEffect, 
  ParticleExplosion,
  CounterAnimation,
  useMicroAnimations 
} from './MicroAnimations';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

interface ReactionData {
  type: Web3ReactionType;
  totalAmount: number;
  totalCount: number;
  userAmount: number;
  isUserReacted: boolean;
  recentReactors: Array<{
    address: string;
    amount: number;
    timestamp: Date;
  }>;
}

interface EnhancedReactionSystemProps {
  postId: string;
  initialReactions?: ReactionData[];
  onReaction?: (postId: string, reactionType: Web3ReactionType, amount: number) => Promise<void>;
  onViewReactors?: (postId: string, reactionType?: Web3ReactionType) => void;
  showAnalytics?: boolean;
  className?: string;
  compact?: boolean;
}

const EnhancedReactionSystem: React.FC<EnhancedReactionSystemProps> = ({
  postId,
  initialReactions = [],
  onReaction,
  onViewReactors,
  showAnalytics = false,
  className = '',
  compact = false
}) => {
  const { isConnected, address } = useWeb3();
  const { addToast } = useToast();
  const { triggerAnimation, isAnimationActive } = useMicroAnimations();

  const [reactions, setReactions] = useState<ReactionData[]>(initialReactions);
  const [floatingReactions, setFloatingReactions] = useState<Array<{
    id: string;
    type: Web3ReactionType;
    timestamp: number;
  }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate total engagement metrics
  const engagementMetrics = useMemo(() => {
    const totalTokens = reactions.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalReactions = reactions.reduce((sum, r) => sum + r.totalCount, 0);
    const userTotalStake = reactions.reduce((sum, r) => sum + r.userAmount, 0);
    
    // Find most popular reaction
    const mostPopular: ReactionData | null = reactions.length > 0
      ? reactions.reduce((max, r) => (r.totalAmount > max.totalAmount ? r : max))
      : null;

    return {
      totalTokens,
      totalReactions,
      userTotalStake,
      mostPopular: mostPopular?.type,
      hasUserReacted: reactions.some(r => r.isUserReacted)
    };
  }, [reactions]);

  // Handle reaction with enhanced feedback
  const handleReaction = useCallback(async (postId: string, reactionType: Web3ReactionType, amount: number) => {
    if (!isConnected) {
      addToast('Please connect your wallet to react', 'error');
      return;
    }

    if (isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Trigger immediate visual feedback
      triggerAnimation(`reaction-${reactionType}`, 2000);
      
      // Add floating reaction animation
      const floatingId = `${Date.now()}-${Math.random()}`;
      setFloatingReactions(prev => [...prev, {
        id: floatingId,
        type: reactionType,
        timestamp: Date.now()
      }]);

      // Call the actual reaction handler
      if (onReaction) {
        await onReaction(postId, reactionType, amount);
      }

      // Update local state optimistically
      setReactions(prev => prev.map(reaction => {
        if (reaction.type === reactionType) {
          return {
            ...reaction,
            totalAmount: reaction.totalAmount + amount,
            totalCount: reaction.totalCount + 1,
            userAmount: reaction.userAmount + amount,
            isUserReacted: true,
            recentReactors: [
              {
                address: address!,
                amount,
                timestamp: new Date()
              },
              ...reaction.recentReactors.slice(0, 4)
            ]
          };
        }
        return reaction;
      }));

      // Success feedback
      const config = WEB3_REACTIONS[reactionType];
      addToast(
        `${config.emoji} ${config.name} reaction added! Staked ${amount} tokens`,
        'success'
      );

      // Remove floating reaction after animation
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(f => f.id !== floatingId));
      }, 2000);

    } catch (error) {
      console.error('Reaction failed:', error);
      // Remove floating reaction on error
      setFloatingReactions(prev => prev.filter(f => f.id !== floatingId));
      addToast('Failed to add reaction. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, address, isProcessing, onReaction, addToast, triggerAnimation]);

  // Handle viewing reactors
  const handleViewReactors = useCallback((reactionType?: Web3ReactionType) => {
    if (onViewReactors) {
      onViewReactors(postId, reactionType);
    }
  }, [onViewReactors, postId]);

  // Format large numbers
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }, []);

  // Prepare reaction summaries for the interaction buttons
  const reactionSummaries = useMemo(() => {
    return Object.keys(WEB3_REACTIONS).map(type => {
      const reactionType = type as Web3ReactionType;
      const data = reactions.find(r => r.type === reactionType);
      
      return {
        type: reactionType,
        totalAmount: data?.totalAmount || 0,
        totalCount: data?.totalCount || 0,
        userAmount: data?.userAmount || 0,
        isUserReacted: data?.isUserReacted || false
      };
    });
  }, [reactions]);

  return (
    <div className={`relative ${className}`}>
      {/* Floating reaction animations */}
      <AnimatePresence>
        {floatingReactions.map(floating => (
          <FloatingReaction
            key={floating.id}
            reaction={floating.type}
            onComplete={() => {
              setFloatingReactions(prev => prev.filter(f => f.id !== floating.id));
            }}
          />
        ))}
      </AnimatePresence>

      {/* Main interaction buttons */}
      <div className="relative">
        <Web3InteractionButtons
          postId={postId}
          reactions={reactionSummaries}
          onReaction={handleReaction}
          onShare={() => {/* Handle share */}}
          onBookmark={() => {/* Handle bookmark */}}
          compact={compact}
          showLabels={!compact}
        />

        {/* Pulse effects for active reactions */}
        {Object.keys(WEB3_REACTIONS).map(type => {
          const reactionType = type as Web3ReactionType;
          const config = WEB3_REACTIONS[reactionType];
          return (
            <PulseEffect
              key={reactionType}
              isActive={isAnimationActive(`reaction-${reactionType}`)}
              color={config.color}
              size={compact ? 'sm' : 'md'}
            />
          );
        })}
      </div>

      {/* Enhanced analytics display */}
      {showAnalytics && engagementMetrics.totalReactions > 0 && (
        <motion.div
          className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Engagement Analytics
            </h4>
            <button
              onClick={() => handleViewReactors()}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All Reactors
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {/* Total Tokens Staked */}
            <div className="space-y-1">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                <CounterAnimation 
                  value={engagementMetrics.totalTokens}
                  className="text-green-600 dark:text-green-400"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Tokens Staked
              </div>
            </div>

            {/* Total Reactions */}
            <div className="space-y-1">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                <CounterAnimation 
                  value={engagementMetrics.totalReactions}
                  className="text-blue-600 dark:text-blue-400"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Total Reactions
              </div>
            </div>

            {/* User Stake */}
            <div className="space-y-1">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                <CounterAnimation 
                  value={engagementMetrics.userTotalStake}
                  className="text-purple-600 dark:text-purple-400"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Your Stake
              </div>
            </div>

            {/* Most Popular */}
            <div className="space-y-1">
              <div className="text-lg">
                {engagementMetrics.mostPopular && WEB3_REACTIONS[engagementMetrics.mostPopular].emoji}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Most Popular
              </div>
            </div>
          </div>

          {/* Recent reactors preview */}
          {reactions.some(r => r.recentReactors.length > 0) && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Recent Activity
              </div>
              <div className="flex items-center space-x-2">
                {reactions
                  .flatMap(r => r.recentReactors.slice(0, 2))
                  .slice(0, 5)
                  .map((reactor, index) => (
                    <motion.div
                      key={`${reactor.address}-${index}`}
                      className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      title={`${reactor.address.slice(0, 6)}...${reactor.address.slice(-4)} staked ${reactor.amount} tokens`}
                    >
                      {reactor.address.slice(2, 4).toUpperCase()}
                    </motion.div>
                  ))}
                {reactions.reduce((sum, r) => sum + r.recentReactors.length, 0) > 5 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{reactions.reduce((sum, r) => sum + r.recentReactors.length, 0) - 5} more
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Processing overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Processing reaction...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedReactionSystem;
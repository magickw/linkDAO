/**
 * Web3InteractionButtons Component
 * Enhanced interaction buttons with Web3-native reactions and visual feedback
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

// Web3-native reaction types with enhanced configurations
export const WEB3_REACTIONS = {
  '🔥': {
    emoji: '🔥',
    name: 'Fire',
    description: 'This content is hot and trending',
    color: 'from-red-500 to-orange-500',
    glowColor: 'shadow-red-500/50',
    animation: 'flame',
    tokenCost: 1,
    multiplier: 1.5
  },
  '💎': {
    emoji: '💎',
    name: 'Diamond',
    description: 'Diamond hands quality content',
    color: 'from-blue-400 to-cyan-500',
    glowColor: 'shadow-blue-500/50',
    animation: 'sparkle',
    tokenCost: 5,
    multiplier: 3.0
  },
  '🚀': {
    emoji: '🚀',
    name: 'Rocket',
    description: 'Boost this content to the moon',
    color: 'from-purple-500 to-pink-500',
    glowColor: 'shadow-purple-500/50',
    animation: 'launch',
    tokenCost: 2,
    multiplier: 2.0
  }
} as const;

export type Web3ReactionType = keyof typeof WEB3_REACTIONS;

interface ReactionSummary {
  type: Web3ReactionType;
  totalAmount: number;
  totalCount: number;
  userAmount: number;
  isUserReacted: boolean;
}

interface Web3InteractionButtonsProps {
  postId: string;
  reactions: ReactionSummary[];
  onReaction: (postId: string, reactionType: Web3ReactionType, amount: number) => Promise<void>;
  onShare?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

const Web3InteractionButtons: React.FC<Web3InteractionButtonsProps> = ({
  postId,
  reactions,
  onReaction,
  onShare,
  onBookmark,
  className = '',
  showLabels = true,
  compact = false
}) => {
  const { isConnected } = useWeb3();
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [hoveredReaction, setHoveredReaction] = useState<Web3ReactionType | null>(null);
  const [celebratingReaction, setCelebratingReaction] = useState<Web3ReactionType | null>(null);

  // Handle reaction with visual feedback and animations
  const handleReaction = useCallback(async (reactionType: Web3ReactionType) => {
    if (!isConnected) {
      addToast('Please connect your wallet to react', 'error');
      return;
    }

    if (isProcessing) {
      return; // Prevent double-clicks
    }

    setIsProcessing(reactionType);
    setCelebratingReaction(reactionType);

    try {
      const config = WEB3_REACTIONS[reactionType];
      await onReaction(postId, reactionType, config.tokenCost);
      
      // Show success feedback
      addToast(
        `${config.emoji} ${config.name} reaction added! (+${config.tokenCost} tokens)`,
        'success'
      );

      // Celebration animation
      setTimeout(() => setCelebratingReaction(null), 1500);
    } catch (error) {
      console.error('Reaction failed:', error);
      addToast('Failed to add reaction. Please try again.', 'error');
      setCelebratingReaction(null);
    } finally {
      setIsProcessing(null);
    }
  }, [isConnected, isProcessing, onReaction, postId, addToast]);

  // Handle share action
  const handleShare = useCallback(() => {
    if (onShare) {
      onShare(postId);
    } else {
      // Fallback to native share API
      if (navigator.share) {
        navigator.share({
          title: 'Check out this Web3 post',
          url: window.location.href
        });
      } else {
        // Copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        addToast('Link copied to clipboard!', 'success');
      }
    }
  }, [onShare, postId, addToast]);

  // Handle bookmark action
  const handleBookmark = useCallback(() => {
    if (onBookmark) {
      onBookmark(postId);
      addToast('Post bookmarked!', 'success');
    }
  }, [onBookmark, postId, addToast]);

  // Get reaction summary for a specific type
  const getReactionSummary = useCallback((type: Web3ReactionType): ReactionSummary => {
    return reactions.find(r => r.type === type) || {
      type,
      totalAmount: 0,
      totalCount: 0,
      userAmount: 0,
      isUserReacted: false
    };
  }, [reactions]);

  // Format amount display
  const formatAmount = useCallback((amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  }, []);

  // Reaction button component
  const ReactionButton: React.FC<{ reactionType: Web3ReactionType }> = ({ reactionType }) => {
    const config = WEB3_REACTIONS[reactionType];
    const summary = getReactionSummary(reactionType);
    const isHovered = hoveredReaction === reactionType;
    const isCelebrating = celebratingReaction === reactionType;
    const isLoading = isProcessing === reactionType;

    return (
      <motion.button
        onClick={() => handleReaction(reactionType)}
        onMouseEnter={() => setHoveredReaction(reactionType)}
        onMouseLeave={() => setHoveredReaction(null)}
        disabled={isLoading}
        className={`
          group relative flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium
          transition-all duration-300 transform-gpu
          ${summary.isUserReacted
            ? `bg-gradient-to-r ${config.color} text-white shadow-lg ${config.glowColor} ring-2 ring-white/20`
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }
          ${isHovered ? 'scale-105 shadow-xl' : ''}
          ${isCelebrating ? 'animate-pulse scale-110' : ''}
          ${isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-lg'}
          ${compact ? 'px-2 py-1 text-xs' : ''}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Background glow effect */}
        {summary.isUserReacted && (
          <motion.div
            className={`absolute inset-0 rounded-full bg-gradient-to-r ${config.color} opacity-20 blur-sm`}
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* Reaction emoji with animation */}
        <motion.span
          className={`${compact ? 'text-base' : 'text-lg'} relative z-10`}
          animate={isCelebrating ? {
            scale: [1, 1.3, 1],
            rotate: [0, 10, -10, 0]
          } : {}}
          transition={{ duration: 0.6 }}
        >
          {config.emoji}
        </motion.span>

        {/* Amount display */}
        {summary.totalAmount > 0 && (
          <span className="font-semibold relative z-10">
            {formatAmount(summary.totalAmount)}
          </span>
        )}

        {/* User stake indicator */}
        {summary.isUserReacted && summary.userAmount > 0 && (
          <motion.span
            className="text-xs bg-white/20 rounded-full px-2 py-0.5 relative z-10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            +{formatAmount(summary.userAmount)}
          </motion.span>
        )}

        {/* Loading spinner */}
        {isLoading && (
          <motion.div
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}

        {/* Hover tooltip */}
        <AnimatePresence>
          {isHovered && !compact && (
            <motion.div
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg whitespace-nowrap z-20"
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="font-semibold">{config.name} Reaction</div>
              <div className="text-gray-300 dark:text-gray-600">
                {summary.totalCount} reactions • {formatAmount(summary.totalAmount)} tokens
              </div>
              <div className="text-yellow-300 dark:text-yellow-600">
                Cost: {config.tokenCost} tokens
              </div>
              {summary.userAmount > 0 && (
                <div className="text-green-300 dark:text-green-600">
                  Your stake: {formatAmount(summary.userAmount)} tokens
                </div>
              )}
              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Celebration particles */}
        <AnimatePresence>
          {isCelebrating && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-1 h-1 bg-gradient-to-r ${config.color} rounded-full`}
                  initial={{
                    x: '50%',
                    y: '50%',
                    scale: 0
                  }}
                  animate={{
                    x: `${50 + (Math.random() - 0.5) * 200}%`,
                    y: `${50 + (Math.random() - 0.5) * 200}%`,
                    scale: [0, 1, 0]
                  }}
                  transition={{
                    duration: 1,
                    delay: i * 0.1,
                    ease: 'easeOut'
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      {/* Web3 Reaction Buttons */}
      <div className={`flex flex-wrap items-center ${compact ? 'gap-2' : 'gap-3'}`}>
        {Object.keys(WEB3_REACTIONS).map((reactionType) => (
          <ReactionButton
            key={reactionType}
            reactionType={reactionType as Web3ReactionType}
          />
        ))}
      </div>

      {/* Additional Action Buttons */}
      <div className={`flex flex-wrap items-center ${compact ? 'gap-2' : 'gap-3'}`}>
        {/* Share Button */}
        <motion.button
          onClick={handleShare}
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium
            bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
            hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200
            ${compact ? 'px-2 py-1 text-xs' : ''}
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
          {showLabels && !compact && <span>Share</span>}
        </motion.button>

        {/* Bookmark Button */}
        {onBookmark && (
          <motion.button
            onClick={handleBookmark}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium
              bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
              hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200
              ${compact ? 'px-2 py-1 text-xs' : ''}
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {showLabels && !compact && <span>Save</span>}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default Web3InteractionButtons;
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';
import { TokenReaction, ReactionType, REACTION_TYPES, TokenReactionConfig } from '@/types/tokenReaction';

interface MobileTokenReactionSystemProps {
  postId: string;
  reactions: TokenReaction[];
  userWallet: string;
  onReact: (type: ReactionType, amount: number) => Promise<void>;
  onViewReactors: (type: ReactionType) => void;
  className?: string;
}

export const MobileTokenReactionSystem: React.FC<MobileTokenReactionSystemProps> = ({
  postId,
  reactions,
  userWallet,
  onReact,
  onViewReactors,
  className = ''
}) => {
  const {
    triggerHapticFeedback,
    touchTargetClasses,
    mobileOptimizedClasses
  } = useMobileOptimization();

  const {
    announceToScreenReader,
    accessibilityClasses
  } = useMobileAccessibility();

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<TokenReactionConfig | null>(null);
  const [isReacting, setIsReacting] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const reactionBarRef = useRef<HTMLDivElement>(null);

  const getUserReaction = (type: ReactionType) => {
    return reactions.find(r => r.type === type && r.userId === userWallet);
  };

  const getReactionCount = (type: ReactionType) => {
    return reactions.filter(r => r.type === type).length;
  };

  const getReactionAmount = (type: ReactionType) => {
    return reactions
      .filter(r => r.type === type)
      .reduce((total, r) => total + r.amount, 0);
  };

  const handleQuickReaction = async (type: ReactionType) => {
    if (isReacting) return;

    setIsReacting(true);
    triggerHapticFeedback('medium');

    try {
      const reactionConfig = REACTION_TYPES[type];
      await onReact(type, reactionConfig.tokenCost);
      announceToScreenReader(`Reacted with ${reactionConfig.name}`);
    } catch (error) {
      triggerHapticFeedback('error');
      announceToScreenReader('Failed to react');
    } finally {
      setIsReacting(false);
    }
  };

  const handleLongPressStart = (type: TokenReactionConfig) => {
    triggerHapticFeedback('light');
    const timer = setTimeout(() => {
      setSelectedReaction(type);
      setShowReactionPicker(true);
      triggerHapticFeedback('medium');
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleReactionWithAmount = async (amount: number) => {
    if (!selectedReaction || isReacting) return;

    setIsReacting(true);
    setShowReactionPicker(false);
    triggerHapticFeedback('medium');

    try {
      await onReact(selectedReaction.emoji, amount);
      announceToScreenReader(`Reacted with ${selectedReaction.name} for ${amount} tokens`);
    } catch (error) {
      triggerHapticFeedback('error');
      announceToScreenReader('Failed to react');
    } finally {
      setIsReacting(false);
      setSelectedReaction(null);
    }
  };

  const handleViewReactors = (type: ReactionType) => {
    triggerHapticFeedback('light');
    onViewReactors(type);
  };

  return (
    <div className={`${className} ${mobileOptimizedClasses}`}>
      {/* Main Reaction Bar */}
      <div 
        ref={reactionBarRef}
        className="flex items-center space-x-2 py-2"
      >
        {Object.values(REACTION_TYPES).map((type) => {
          const userReaction = getUserReaction(type.emoji);
          const count = getReactionCount(type.emoji);
          const amount = getReactionAmount(type.emoji);
          const hasReacted = !!userReaction;

          return (
            <motion.button
              key={type.emoji}
              onTouchStart={() => handleLongPressStart(type)}
              onTouchEnd={handleLongPressEnd}
              onTouchCancel={handleLongPressEnd}
              onClick={() => handleQuickReaction(type.emoji)}
              disabled={isReacting}
              className={`
                relative flex items-center space-x-1 px-3 py-2 rounded-full
                transition-all duration-200 border-2
                ${hasReacted 
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                }
                ${touchTargetClasses} ${accessibilityClasses}
                active:scale-95 disabled:opacity-50
              `}
              whileTap={{ scale: 0.95 }}
              aria-label={`React with ${type.name}. Current: ${count} reactions, ${amount} tokens`}
            >
              {/* Reaction Emoji */}
              <span className="text-lg">{type.emoji}</span>
              
              {/* Count and Amount */}
              {count > 0 && (
                <div className="flex flex-col items-center text-xs">
                  <span className="font-medium">{count}</span>
                  {amount > 0 && (
                    <span className="text-xs opacity-75">{amount.toFixed(1)}</span>
                  )}
                </div>
              )}

              {/* User's Reaction Indicator */}
              {hasReacted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"
                />
              )}

              {/* Loading Indicator */}
              {isReacting && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full"
                />
              )}
            </motion.button>
          );
        })}

        {/* View All Reactions Button */}
        {reactions.length > 0 && (
          <button
            onClick={() => handleViewReactors(Object.values(REACTION_TYPES)[0].emoji)}
            className={`
              px-3 py-2 text-sm text-gray-500 dark:text-gray-400
              hover:text-gray-700 dark:hover:text-gray-300
              ${touchTargetClasses} ${accessibilityClasses}
            `}
            aria-label="View all reactions"
          >
            View all
          </button>
        )}
      </div>

      {/* Reaction Amount Picker Modal */}
      <AnimatePresence>
        {showReactionPicker && selectedReaction && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowReactionPicker(false)}
            />

            {/* Picker Modal */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">{selectedReaction.emoji}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  React with {selectedReaction.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choose token amount
                </p>
              </div>

              {/* Amount Options */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 5, 10, 25, 50].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleReactionWithAmount(amount * selectedReaction.tokenCost)}
                    className={`
                      py-3 px-4 rounded-xl border-2 transition-all
                      border-gray-300 dark:border-gray-600
                      hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20
                      ${touchTargetClasses} ${accessibilityClasses}
                    `}
                  >
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {amount}×
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {(amount * selectedReaction.tokenCost).toFixed(1)} tokens
                    </div>
                  </button>
                ))}
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => setShowReactionPicker(false)}
                className={`
                  w-full py-3 px-4 rounded-xl border-2 border-gray-300 dark:border-gray-600
                  text-gray-700 dark:text-gray-300 font-medium
                  ${touchTargetClasses} ${accessibilityClasses}
                `}
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reaction Summary */}
      {reactions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.values(REACTION_TYPES)
            .filter(reactionType => reactions.some(r => r.type === reactionType.emoji))
            .slice(0, 3)
            .map((reactionType) => {
              const typeReactions = reactions.filter(r => r.type === reactionType.emoji);
              const totalAmount = typeReactions.reduce((sum, r) => sum + r.amount, 0);

              return (
                <button
                  key={reactionType.emoji}
                  onClick={() => handleViewReactors(reactionType.emoji)}
                  className={`
                    text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800
                    text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700
                    ${accessibilityClasses}
                  `}
                >
                  {reactionType.emoji} {typeReactions.length} ({totalAmount.toFixed(1)})
                </button>
              );
            })}
          
          {reactions.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
              +{reactions.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};
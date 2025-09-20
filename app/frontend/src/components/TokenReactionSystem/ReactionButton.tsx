/**
 * ReactionButton Component
 * Individual reaction button with smooth animations and feedback
 */

import React, { useState } from 'react';
import {
  ReactionButtonProps,
  REACTION_TYPES
} from '../../types/tokenReaction';
import tokenReactionService from '../../services/tokenReactionService';

const ReactionButton: React.FC<ReactionButtonProps> = ({
  reactionType,
  summary,
  isUserReacted,
  onClick,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const config = REACTION_TYPES[reactionType];
  const theme = tokenReactionService.getReactionTheme(reactionType);

  const handleClick = () => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium
        transition-all duration-200 transform
        ${isUserReacted
          ? `bg-gradient-to-r ${theme.gradient} text-white shadow-lg ${theme.glow} animate-pulse`
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }
        ${isHovered ? 'scale-105' : ''}
        ${isPressed ? 'scale-95' : ''}
        ${className}
      `}
      title={`${config.description} (${config.tokenCost} tokens minimum)`}
    >
      {/* Reaction Emoji with Animation */}
      <span 
        className={`
          text-lg transition-transform duration-200
          ${isHovered ? 'scale-110' : ''}
          ${isPressed ? 'scale-90' : ''}
          ${isUserReacted ? 'animate-bounce' : ''}
        `}
      >
        {config.emoji}
      </span>

      {/* Amount Display */}
      <span className="font-semibold">
        {tokenReactionService.formatReactionAmount(summary.totalAmount)}
      </span>

      {/* User Stake Indicator */}
      {isUserReacted && summary.userAmount > 0 && (
        <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
          +{tokenReactionService.formatReactionAmount(summary.userAmount)}
        </span>
      )}

      {/* Hover Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg whitespace-nowrap z-10">
          <div className="font-semibold">{config.name} Reaction</div>
          <div className="text-gray-300 dark:text-gray-600">
            {summary.totalCount} reactions • {summary.totalAmount} tokens
          </div>
          {summary.userAmount > 0 && (
            <div className="text-yellow-300 dark:text-yellow-600">
              Your stake: {summary.userAmount} tokens
            </div>
          )}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
        </div>
      )}

      {/* Glow Effect for Active Reactions */}
      {isUserReacted && (
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${theme.gradient} opacity-20 blur-sm`}></div>
      )}

      {/* Pulse Animation for New Reactions */}
      {isUserReacted && (
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${theme.gradient} opacity-30 animate-ping`}></div>
      )}
    </button>
  );
};

export default ReactionButton;
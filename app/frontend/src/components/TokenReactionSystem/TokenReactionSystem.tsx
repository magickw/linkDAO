// Mock Token Reaction System for testing
import React from 'react';

interface TokenReactionSystemProps {
  postId: string;
  initialReactions: any[];
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  showAnalytics?: boolean;
}

const TokenReactionSystem: React.FC<TokenReactionSystemProps> = ({
  postId,
  initialReactions,
  onReaction,
  showAnalytics
}) => {
  return (
    <div data-testid="token-reaction-system">
      {initialReactions.map((reaction, index) => (
        <button
          key={index}
          onClick={() => onReaction?.(postId, reaction.type, 1)}
          className="reaction-button"
        >
          {reaction.type} {reaction.totalAmount}
        </button>
      ))}
    </div>
  );
};

export default TokenReactionSystem;
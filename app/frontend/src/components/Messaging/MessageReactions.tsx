import React, { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { unifiedMessagingService } from '@/services/unifiedMessagingService';

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentUserAddress: string;
  onReactionToggle?: (messageId: string, emoji: string, added: boolean) => void;
  compact?: boolean;
  className?: string;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  currentUserAddress,
  onReactionToggle,
  compact = false,
  className = ''
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const normalizedUserAddress = currentUserAddress.toLowerCase();

  const handleReactionClick = useCallback(async (emoji: string) => {
    const reaction = reactions.find(r => r.emoji === emoji);
    const hasReacted = reaction?.users.some(
      u => u.toLowerCase() === normalizedUserAddress
    );

    setIsLoading(emoji);
    try {
      if (hasReacted) {
        await unifiedMessagingService.removeReaction(messageId, emoji);
        onReactionToggle?.(messageId, emoji, false);
      } else {
        await unifiedMessagingService.addReaction(messageId, emoji);
        onReactionToggle?.(messageId, emoji, true);
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    } finally {
      setIsLoading(null);
    }
  }, [messageId, reactions, normalizedUserAddress, onReactionToggle]);

  const handleAddNewReaction = useCallback(async (emoji: string) => {
    setShowPicker(false);
    setIsLoading(emoji);
    try {
      await unifiedMessagingService.addReaction(messageId, emoji);
      onReactionToggle?.(messageId, emoji, true);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    } finally {
      setIsLoading(null);
    }
  }, [messageId, onReactionToggle]);

  if (reactions.length === 0 && !showPicker) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowPicker(true)}
          className="p-1 text-gray-400 hover:text-gray-200 rounded-full
                   hover:bg-gray-600/50 transition-colors opacity-0 group-hover:opacity-100"
          title="Add reaction"
        >
          <Plus size={14} />
        </button>
        {showPicker && (
          <div className="absolute bottom-full right-0 mb-2 z-50">
            <EmojiPicker
              onEmojiSelect={handleAddNewReaction}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {reactions.map((reaction) => {
        const hasReacted = reaction.users.some(
          u => u.toLowerCase() === normalizedUserAddress
        );
        const isLoadingThis = isLoading === reaction.emoji;

        return (
          <button
            key={reaction.emoji}
            onClick={() => handleReactionClick(reaction.emoji)}
            disabled={isLoadingThis}
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
              transition-all duration-200
              ${hasReacted
                ? 'bg-blue-500/30 border border-blue-400/50 text-blue-200'
                : 'bg-gray-600/50 border border-gray-500/30 text-gray-300 hover:bg-gray-500/50'
              }
              ${isLoadingThis ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
              ${compact ? 'text-[10px] px-1.5 py-0' : ''}
            `}
            title={`${reaction.users.length} ${reaction.users.length === 1 ? 'person' : 'people'} reacted with ${reaction.emoji}`}
          >
            <span className={compact ? 'text-sm' : 'text-base'}>{reaction.emoji}</span>
            {reaction.count > 1 && (
              <span className="font-medium">{reaction.count}</span>
            )}
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={`
            inline-flex items-center justify-center rounded-full
            bg-gray-600/30 border border-gray-500/30 text-gray-400
            hover:bg-gray-500/50 hover:text-gray-200 transition-colors
            ${compact ? 'w-5 h-5' : 'w-6 h-6'}
          `}
          title="Add reaction"
        >
          <Plus size={compact ? 10 : 12} />
        </button>

        {showPicker && (
          <div className="absolute bottom-full right-0 mb-2 z-50">
            <EmojiPicker
              onEmojiSelect={handleAddNewReaction}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Quick reaction bar for common emojis
interface QuickReactionBarProps {
  messageId: string;
  onReactionSelect: (emoji: string) => void;
  className?: string;
}

export const QuickReactionBar: React.FC<QuickReactionBarProps> = ({
  messageId,
  onReactionSelect,
  className = ''
}) => {
  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

  return (
    <div className={`flex items-center gap-1 p-1 bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {quickEmojis.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReactionSelect(emoji)}
          className="p-1.5 hover:bg-gray-700 rounded transition-colors text-lg"
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
      <div className="w-px h-6 bg-gray-600 mx-1" />
      <button
        onClick={() => onReactionSelect('more')}
        className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400"
        title="More reactions"
      >
        <Plus size={16} />
      </button>
    </div>
  );
};

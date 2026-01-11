import React, { useState, useEffect, useCallback } from 'react';
import { X, Pin, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Message } from '@/types/messaging';
import { unifiedMessagingService } from '@/services/unifiedMessagingService';
import { format } from 'date-fns';

interface PinnedMessagesPanelProps {
  conversationId: string;
  currentUserAddress: string;
  isAdmin?: boolean;
  onMessageClick?: (messageId: string) => void;
  onClose?: () => void;
  className?: string;
}

export const PinnedMessagesPanel: React.FC<PinnedMessagesPanelProps> = ({
  conversationId,
  currentUserAddress,
  isAdmin = false,
  onMessageClick,
  onClose,
  className = ''
}) => {
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadPinnedMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const messages = await unifiedMessagingService.getPinnedMessages(conversationId);
      setPinnedMessages(messages);
    } catch (err) {
      setError('Failed to load pinned messages');
      console.error('Error loading pinned messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadPinnedMessages();
  }, [loadPinnedMessages]);

  const handleUnpin = useCallback(async (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await unifiedMessagingService.unpinMessage(messageId);
      setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Error unpinning message:', err);
    }
  }, []);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, HH:mm');
  };

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center py-8">
          <p className="text-red-400 mb-2">{error}</p>
          <button
            onClick={loadPinnedMessages}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (pinnedMessages.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center py-8 text-gray-500">
          <Pin size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No pinned messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Pin size={16} className="text-yellow-500" />
          <span className="font-medium text-white text-sm">
            Pinned Messages ({pinnedMessages.length})
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Messages list */}
      <div className="max-h-80 overflow-y-auto">
        {pinnedMessages.map((message) => {
          const isExpanded = expandedId === message.id;
          const isOwn = message.fromAddress.toLowerCase() === currentUserAddress.toLowerCase();

          return (
            <div
              key={message.id}
              className="border-b border-gray-800 last:border-b-0"
            >
              <button
                onClick={() => {
                  if (isExpanded) {
                    setExpandedId(null);
                  } else {
                    setExpandedId(message.id);
                  }
                }}
                className="w-full p-3 text-left hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  {/* Avatar */}
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-[10px] flex-shrink-0">
                    {message.fromAddress.slice(2, 4).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-white text-xs">
                        {isOwn ? 'You' : truncateAddress(message.fromAddress)}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>

                    {/* Preview */}
                    <p className={`text-sm text-gray-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {message.content}
                    </p>
                  </div>

                  {/* Expand/collapse icon */}
                  <div className="flex-shrink-0 text-gray-500">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </button>

              {/* Expanded actions */}
              {isExpanded && (
                <div className="px-3 pb-3 flex items-center gap-2">
                  <button
                    onClick={() => onMessageClick?.(message.id)}
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-700 text-white rounded
                             hover:bg-gray-600 transition-colors"
                  >
                    Jump to message
                  </button>
                  {(isAdmin || isOwn) && (
                    <button
                      onClick={(e) => handleUnpin(message.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-400 rounded
                               hover:bg-gray-700 transition-colors"
                      title="Unpin message"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Compact pinned message banner for conversation header
interface PinnedMessageBannerProps {
  conversationId: string;
  onExpand: () => void;
  className?: string;
}

export const PinnedMessageBanner: React.FC<PinnedMessageBannerProps> = ({
  conversationId,
  onExpand,
  className = ''
}) => {
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [totalPinned, setTotalPinned] = useState(0);

  useEffect(() => {
    const loadPinned = async () => {
      try {
        const messages = await unifiedMessagingService.getPinnedMessages(conversationId);
        if (messages.length > 0) {
          setPinnedMessage(messages[0]);
          setTotalPinned(messages.length);
        } else {
          setPinnedMessage(null);
          setTotalPinned(0);
        }
      } catch (err) {
        console.error('Error loading pinned messages:', err);
      }
    };

    loadPinned();
  }, [conversationId]);

  if (!pinnedMessage) return null;

  return (
    <button
      onClick={onExpand}
      className={`
        w-full px-3 py-2 bg-gray-800/80 border-b border-gray-700
        flex items-center gap-2 text-left hover:bg-gray-800 transition-colors
        ${className}
      `}
    >
      <Pin size={14} className="text-yellow-500 flex-shrink-0" />
      <p className="flex-1 text-sm text-gray-300 truncate">
        {pinnedMessage.content}
      </p>
      {totalPinned > 1 && (
        <span className="text-xs text-gray-500 flex-shrink-0">
          +{totalPinned - 1} more
        </span>
      )}
      <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
    </button>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare, Send, ArrowLeft } from 'lucide-react';
import { Message } from '@/types/messaging';
import { unifiedMessagingService } from '@/services/unifiedMessagingService';
import { MessageReactions, Reaction } from './MessageReactions';
import { format } from 'date-fns';

interface MessageThreadViewProps {
  messageId: string;
  conversationId: string;
  currentUserAddress: string;
  onClose: () => void;
  onReplyCountChange?: (messageId: string, count: number) => void;
  className?: string;
}

export const MessageThreadView: React.FC<MessageThreadViewProps> = ({
  messageId,
  conversationId,
  currentUserAddress,
  onClose,
  onReplyCountChange,
  className = ''
}) => {
  const [parentMessage, setParentMessage] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);
  const [replyCount, setReplyCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadThread = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const threadData = await unifiedMessagingService.getMessageThread(messageId);
      setParentMessage(threadData.parentMessage);
      setReplies(threadData.replies);
      setReplyCount(threadData.replyCount);
    } catch (err) {
      setError('Failed to load thread');
      console.error('Error loading thread:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messageId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const handleSendReply = useCallback(async () => {
    if (!replyContent.trim() || isSending) return;

    setIsSending(true);
    try {
      const newReply = await unifiedMessagingService.replyToMessage({
        conversationId,
        replyToId: messageId,
        content: replyContent.trim()
      });

      setReplies(prev => [...prev, newReply]);
      setReplyCount(prev => {
        const newCount = prev + 1;
        onReplyCountChange?.(messageId, newCount);
        return newCount;
      });
      setReplyContent('');
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setIsSending(false);
    }
  }, [replyContent, isSending, conversationId, messageId, onReplyCountChange]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }, [handleSendReply]);

  const formatMessageTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 168) {
      return format(date, 'EEE HH:mm');
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderMessage = (message: Message, isParent: boolean = false) => {
    const isOwn = message.fromAddress.toLowerCase() === currentUserAddress.toLowerCase();

    return (
      <div
        key={message.id}
        className={`
          ${isParent ? 'p-4 bg-gray-800/50 rounded-lg border border-gray-700' : 'p-3 hover:bg-gray-800/30 rounded-lg'}
          ${isOwn ? '' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
            {message.fromAddress.slice(2, 4).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-white text-sm">
                {isOwn ? 'You' : truncateAddress(message.fromAddress)}
              </span>
              <span className="text-xs text-gray-500">
                {formatMessageTime(message.timestamp)}
              </span>
              {message.editedAt && (
                <span className="text-xs text-gray-500">(edited)</span>
              )}
            </div>

            {/* Content */}
            <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">
              {message.content}
            </p>

            {/* Reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="mt-2">
                <MessageReactions
                  messageId={message.id}
                  reactions={message.reactions as Reaction[]}
                  currentUserAddress={currentUserAddress}
                  compact
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-400" />
            <span className="font-medium text-white">Thread</span>
            {replyCount > 0 && (
              <span className="text-sm text-gray-400">
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-2">{error}</p>
            <button
              onClick={loadThread}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Parent message */}
            {parentMessage && renderMessage(parentMessage, true)}

            {/* Divider */}
            {replies.length > 0 && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-gray-700"></div>
                <span className="text-xs text-gray-500">
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </span>
                <div className="flex-1 h-px bg-gray-700"></div>
              </div>
            )}

            {/* Replies */}
            <div className="space-y-1">
              {replies.map(reply => renderMessage(reply))}
            </div>
          </>
        )}
      </div>

      {/* Reply input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-end gap-2">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Reply to thread..."
            rows={1}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl
                     text-white placeholder-gray-500 resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSendReply}
            disabled={!replyContent.trim() || isSending}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Thread indicator shown on messages that have replies
interface ThreadIndicatorProps {
  replyCount: number;
  onClick: () => void;
  className?: string;
}

export const ThreadIndicator: React.FC<ThreadIndicatorProps> = ({
  replyCount,
  onClick,
  className = ''
}) => {
  if (replyCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 text-blue-400 hover:text-blue-300
        text-xs font-medium transition-colors
        ${className}
      `}
    >
      <MessageSquare size={14} />
      <span>
        {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
      </span>
    </button>
  );
};

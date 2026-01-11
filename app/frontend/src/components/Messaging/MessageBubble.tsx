import React, { useState } from 'react';
import { Message } from '../../types/messaging';
import { formatDistanceToNow, format } from 'date-fns';
import { Pin } from 'lucide-react';
import { MessageReactions, Reaction } from './MessageReactions';
import { ThreadIndicator } from './MessageThreadView';
import { MessageActionsButton } from './MessageContextMenu';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
  currentUserAddress?: string;
  replyCount?: number;
  onContextMenu?: (event: React.MouseEvent, message: Message) => void;
  onThreadClick?: (messageId: string) => void;
  onReactionToggle?: (messageId: string, emoji: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar,
  showTimestamp,
  currentUserAddress,
  replyCount = 0,
  onContextMenu,
  onThreadClick,
  onReactionToggle,
}) => {
  const [showActions, setShowActions] = useState(false);
  const formatMessageTime = (timestamp: Date) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(messageDate, 'HH:mm');
    } else if (diffInHours < 168) { // 7 days
      return format(messageDate, 'EEE HH:mm');
    } else {
      return format(messageDate, 'MMM d, HH:mm');
    }
  };

  const getDeliveryStatusIcon = () => {
    switch (message.deliveryStatus) {
      case 'sent':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'delivered':
        return (
          <div className="flex">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <svg className="w-4 h-4 text-gray-400 -ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'read':
        return (
          <div className="flex">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <svg className="w-4 h-4 text-blue-500 -ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const renderMessageContent = () => {
    switch (message.contentType) {
      case 'image':
        return (
          <div className="max-w-xs">
            <img 
              src={message.content} 
              alt="Shared image" 
              className="rounded-lg max-w-full h-auto"
              loading="lazy"
            />
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center space-x-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {message.content}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">File attachment</p>
            </div>
          </div>
        );
      case 'post_share':
        // Parse shared post data
        try {
          const sharedPost = JSON.parse(message.content);
          return (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Shared Post</span>
              </div>
              <p className="text-sm text-gray-900 dark:text-white">{sharedPost.content}</p>
              {sharedPost.author && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  by {sharedPost.author}
                </p>
              )}
            </div>
          );
        } catch {
          return <p className="text-sm">{message.content}</p>;
        }
      default:
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        );
    }
  };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-1'} group`}
      onContextMenu={(e) => onContextMenu?.(e, message)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-xs sm:max-w-md`}>
        {/* Avatar */}
        {showAvatar && !isOwn && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
            {message.fromAddress.slice(2, 4).toUpperCase()}
          </div>
        )}

        {/* Message Content Container */}
        <div className="relative">
          {/* Pinned Indicator */}
          {message.isPinned && (
            <div className="absolute -top-2 -right-2 z-10">
              <Pin size={12} className="text-yellow-500 fill-yellow-500" />
            </div>
          )}

          {/* Actions Button (shows on hover) */}
          {showActions && (
            <div className={`absolute top-0 ${isOwn ? '-left-8' : '-right-8'} z-10`}>
              <MessageActionsButton
                onClick={(e) => {
                  e.stopPropagation();
                  onContextMenu?.(e as unknown as React.MouseEvent, message);
                }}
              />
            </div>
          )}

          {/* Message Bubble */}
          <div className={`
            relative px-4 py-2 rounded-2xl max-w-full
            ${isOwn
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-md'
            }
            ${message.isPinned ? 'ring-1 ring-yellow-500/50' : ''}
          `}>
            {renderMessageContent()}

            {/* Message Info */}
            <div className={`flex items-center justify-between mt-1 space-x-2 ${
              isOwn ? 'flex-row-reverse space-x-reverse' : 'flex-row'
            }`}>
              {showTimestamp && (
                <span className={`text-xs ${
                  isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {formatMessageTime(message.timestamp)}
                  {message.editedAt && (
                    <span className="ml-1 opacity-70">(edited)</span>
                  )}
                </span>
              )}

              {/* Delivery Status (only for own messages) */}
              {isOwn && (
                <div className="flex items-center">
                  {getDeliveryStatusIcon()}
                </div>
              )}
            </div>
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={`mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
              <MessageReactions
                messageId={message.id}
                reactions={message.reactions as Reaction[]}
                currentUserAddress={currentUserAddress || ''}
                onReactionToggle={onReactionToggle}
                compact
              />
            </div>
          )}

          {/* Thread Indicator */}
          {replyCount > 0 && (
            <div className={`mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
              <ThreadIndicator
                replyCount={replyCount}
                onClick={() => onThreadClick?.(message.id)}
              />
            </div>
          )}
        </div>

        {/* Spacer for alignment */}
        {showAvatar && isOwn && <div className="w-8" />}
      </div>
    </div>
  );
};
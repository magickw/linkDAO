import React, { useState, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { MessageItem } from './MessageItem';
import { ChatMessage } from '../../services/messagingService';
import { Trash2, Heart, Reply } from 'lucide-react';

interface SwipeableMessageProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  formatTime: (date: Date) => string;
  getMessageStatus: (message: ChatMessage) => React.ReactNode;
  getOtherParticipant: (conversationId: string | null) => string | null;
  selectedConversation: string | null;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyToMessage?: (message: ChatMessage) => void;
}

export const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  message,
  isOwn,
  showAvatar,
  formatTime,
  getMessageStatus,
  getOtherParticipant,
  selectedConversation,
  onAddReaction,
  onEditMessage,
  onDeleteMessage,
  onReplyToMessage
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showLeftActions, setShowLeftActions] = useState(false);
  const [showRightActions, setShowRightActions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlers = useSwipeable({
    onSwipeStart: () => {
      setSwipeOffset(0);
    },
    onSwiping: (EventData) => {
      const { deltaX } = EventData;
      
      // Only allow horizontal swiping
      if (Math.abs(EventData.deltaY) > Math.abs(deltaX)) return;
      
      setSwipeOffset(deltaX);
      
      // Show actions based on swipe direction
      if (deltaX > 50) {
        setShowLeftActions(true);
        setShowRightActions(false);
      } else if (deltaX < -50) {
        setShowRightActions(true);
        setShowLeftActions(false);
      } else {
        setShowLeftActions(false);
        setShowRightActions(false);
      }
    },
    onSwiped: (EventData) => {
      const { deltaX } = EventData;
      
      // Reset swipe state
      setSwipeOffset(0);
      setShowLeftActions(false);
      setShowRightActions(false);
      
      // Handle swipe actions
      if (deltaX > 100) {
        // Swiped right - add heart reaction
        onAddReaction?.(message.id, '❤️');
      } else if (deltaX < -100) {
        // Swiped left - reply to message
        onReplyToMessage?.(message);
      }
    },
    onTouchStartOrOnMouseDown: () => {
      // Reset on touch start
      setSwipeOffset(0);
      setShowLeftActions(false);
      setShowRightActions(false);
    },
    trackMouse: true,
    trackTouch: true
  });

  const handleDelete = () => {
    onDeleteMessage?.(message.id);
  };

  const handleReply = () => {
    onReplyToMessage?.(message);
  };

  const handleReact = () => {
    onAddReaction?.(message.id, '❤️');
  };

  return (
    <div 
      {...handlers}
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Left swipe actions (reply) */}
      {showLeftActions && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center pl-4 bg-green-500 z-10">
          <Reply size={20} className="text-white" />
        </div>
      )}
      
      {/* Right swipe actions (react) */}
      {showRightActions && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-4 bg-red-500 z-10">
          <Heart size={20} className="text-white" />
        </div>
      )}
      
      {/* Message content with swipe transform */}
      <div 
        className="relative"
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.3s ease' : 'none'
        }}
      >
        <MessageItem
          message={message}
          isOwn={isOwn}
          showAvatar={showAvatar}
          formatTime={formatTime}
          getMessageStatus={getMessageStatus}
          getOtherParticipant={getOtherParticipant}
          selectedConversation={selectedConversation}
          onAddReaction={onAddReaction}
          onEditMessage={onEditMessage}
        />
      </div>
      
      {/* Overlay actions for small screens */}
      <div className="absolute right-2 top-2 flex space-x-1 opacity-0 hover:opacity-100 transition-opacity">
        <button
          onClick={handleReact}
          className="p-1 bg-gray-700/50 rounded-full hover:bg-gray-600 transition-colors"
          title="Add heart reaction"
        >
          <Heart size={14} className="text-white" />
        </button>
        <button
          onClick={handleReply}
          className="p-1 bg-gray-700/50 rounded-full hover:bg-gray-600 transition-colors"
          title="Reply"
        >
          <Reply size={14} className="text-white" />
        </button>
        {isOwn && (
          <button
            onClick={handleDelete}
            className="p-1 bg-gray-700/50 rounded-full hover:bg-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} className="text-white" />
          </button>
        )}
      </div>
    </div>
  );
};
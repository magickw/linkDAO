import React, { useState, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { MessageBubble } from './MessageBubble';
import { Message } from '../../types/messaging';
import { Reply, Heart, Trash2 } from 'lucide-react';

interface SwipeableBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
  currentUserAddress?: string;
  replyCount?: number;
  repliedToMessage?: Message;
  quotedMessage?: Message;
  onContextMenu?: (event: React.MouseEvent, message: Message) => void;
  onThreadClick?: (messageId: string) => void;
  onReactionToggle?: (messageId: string, emoji: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: Message) => void;
}

export const SwipeableBubble: React.FC<SwipeableBubbleProps> = (props) => {
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
      
      // Limit swipe distance
      const limitedDeltaX = Math.max(Math.min(deltaX, 100), -100);
      setSwipeOffset(limitedDeltaX);
      
      // Show actions based on swipe direction
      if (limitedDeltaX > 40) {
        setShowLeftActions(true);
        setShowRightActions(false);
      } else if (limitedDeltaX < -40) {
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
      if (deltaX > 70) {
        // Swiped right - reply
        props.onReply?.(props.message);
      } else if (deltaX < -70) {
        // Swiped left - react
        props.onReactionToggle?.(props.message.id, '❤️');
      }
    },
    trackMouse: true,
    trackTouch: true,
    delta: 10
  });

  return (
    <div 
      {...handlers}
      ref={containerRef}
      className="relative overflow-hidden w-full"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Left swipe actions (reply) - Reveal from left when swiping right */}
      {swipeOffset > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 flex items-center pl-4 bg-blue-500 text-white z-0 transition-opacity"
          style={{ opacity: Math.min(swipeOffset / 50, 1) }}
        >
          <Reply size={20} className="animate-in fade-in zoom-in duration-200" />
        </div>
      )}
      
      {/* Right swipe actions (react) - Reveal from right when swiping left */}
      {swipeOffset < 0 && (
        <div 
          className="absolute right-0 top-0 bottom-0 flex items-center pr-4 bg-red-500 text-white z-0 transition-opacity"
          style={{ opacity: Math.min(Math.abs(swipeOffset) / 50, 1) }}
        >
          <Heart size={20} className="animate-in fade-in zoom-in duration-200" />
        </div>
      )}
      
      {/* Message content with swipe transform */}
      <div 
        className="relative z-10 w-full"
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)' : 'none'
        }}
      >
        <MessageBubble {...props} />
      </div>
    </div>
  );
};

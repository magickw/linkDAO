import React, { useCallback, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Bookmark, Share2, Check, X } from 'lucide-react';
import { CommunityPost } from '@/models/CommunityPost';
import { Community } from '@/models/Community';
import { EnhancedPost } from '@/types/feed';
import { usePostCardSwipeGestures } from '@/hooks/useSwipeGestures';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';
import RedditStylePostCard from './RedditStylePostCard';

interface SwipeablePostCardProps {
  post: CommunityPost;
  community?: Community;
  viewMode?: 'card' | 'compact';
  showThumbnail?: boolean;
  onVote: (postId: string, direction: 'up' | 'down') => void;
  onSave?: (postId: string) => void;
  onHide?: (postId: string) => void;
  onReport?: (postId: string, reason: string, details?: string) => void;
  onShare?: (postId: string) => void;
  onComment?: (postId: string) => void;
  isPinned?: boolean;
  className?: string;
  enableSwipeGestures?: boolean;
}

export default function SwipeablePostCard({
  post,
  community,
  viewMode = 'card',
  showThumbnail = true,
  onVote,
  onSave,
  onHide,
  onReport,
  onShare,
  onComment,
  isPinned = false,
  className = '',
  enableSwipeGestures = true
}: SwipeablePostCardProps) {
  const [swipeAction, setSwipeAction] = useState<{
    type: 'upvote' | 'downvote' | 'save' | 'share' | null;
    confirmed: boolean;
  }>({ type: null, confirmed: false });
  
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { announceToScreenReader } = useMobileAccessibility();
  
  // Convert CommunityPost to EnhancedPost for compatibility
  const enhancedPost = useMemo((): EnhancedPost => {
    return {
      ...post,
      parentId: post.parentId ?? null, // Ensure parentId is never undefined
      comments: post.comments.length, // Convert comments array to count
    };
  }, [post]);

  // Handle swipe actions with visual feedback
  const handleSwipeVote = useCallback(async (postId: string, direction: 'up' | 'down') => {
    setSwipeAction({ type: direction === 'up' ? 'upvote' : 'downvote', confirmed: false });
    
    try {
      await onVote(postId, direction);
      setSwipeAction(prev => ({ ...prev, confirmed: true }));
      announceToScreenReader(`Post ${direction === 'up' ? 'upvoted' : 'downvoted'}`);
      
      // Clear action after animation
      setTimeout(() => {
        setSwipeAction({ type: null, confirmed: false });
      }, 1500);
    } catch (error) {
      setSwipeAction({ type: null, confirmed: false });
      announceToScreenReader('Vote failed, please try again');
    }
  }, [onVote, announceToScreenReader]);

  const handleSwipeSave = useCallback(async (postId: string) => {
    if (!onSave) return;
    
    setSwipeAction({ type: 'save', confirmed: false });
    
    try {
      await onSave(postId);
      setSwipeAction(prev => ({ ...prev, confirmed: true }));
      announceToScreenReader('Post saved');
      
      setTimeout(() => {
        setSwipeAction({ type: null, confirmed: false });
      }, 1500);
    } catch (error) {
      setSwipeAction({ type: null, confirmed: false });
      announceToScreenReader('Save failed, please try again');
    }
  }, [onSave, announceToScreenReader]);

  const handleSwipeShare = useCallback(async (postId: string) => {
    if (!onShare) return;
    
    setSwipeAction({ type: 'share', confirmed: false });
    
    try {
      await onShare(postId);
      setSwipeAction(prev => ({ ...prev, confirmed: true }));
      announceToScreenReader('Post shared');
      
      setTimeout(() => {
        setSwipeAction({ type: null, confirmed: false });
      }, 1500);
    } catch (error) {
      setSwipeAction({ type: null, confirmed: false });
      announceToScreenReader('Share failed, please try again');
    }
  }, [onShare, announceToScreenReader]);

  // Configure swipe gestures
  const { swipeState, swipeHandlers, isSwipeSupported } = usePostCardSwipeGestures(
    post.id,
    handleSwipeVote,
    onSave ? handleSwipeSave : undefined,
    onShare ? handleSwipeShare : undefined
  );

  // Show swipe hint on first interaction
  const handleFirstTouch = useCallback(() => {
    if (isSwipeSupported && !showSwipeHint) {
      setShowSwipeHint(true);
      setTimeout(() => setShowSwipeHint(false), 3000);
    }
  }, [isSwipeSupported, showSwipeHint]);

  // Get swipe visual feedback
  const getSwipeVisualFeedback = () => {
    if (!swipeState.isActive || !swipeState.direction) return null;

    const { direction, distance } = swipeState;
    const opacity = Math.min(distance / 100, 0.8);
    
    let icon = null;
    let color = '';
    let text = '';

    if (direction === 'left') {
      if (distance > 100) {
        icon = <ChevronDown className="w-8 h-8" />;
        color = 'bg-blue-500';
        text = 'Downvote';
      } else {
        icon = <ChevronUp className="w-8 h-8" />;
        color = 'bg-orange-500';
        text = 'Upvote';
      }
    } else if (direction === 'right') {
      if (distance > 100 && onShare) {
        icon = <Share2 className="w-8 h-8" />;
        color = 'bg-blue-500';
        text = 'Share';
      } else if (onSave) {
        icon = <Bookmark className="w-8 h-8" />;
        color = 'bg-yellow-500';
        text = 'Save';
      }
    }

    if (!icon) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity }}
        className={`absolute inset-0 ${color} bg-opacity-20 flex items-center justify-center z-10 rounded-lg`}
      >
        <div className="flex flex-col items-center text-white">
          {icon}
          <span className="text-sm font-medium mt-1">{text}</span>
        </div>
      </motion.div>
    );
  };

  // Get action confirmation feedback
  const getActionFeedback = () => {
    if (!swipeAction.type) return null;

    let icon = null;
    let color = '';
    let text = '';

    switch (swipeAction.type) {
      case 'upvote':
        icon = swipeAction.confirmed ? <Check className="w-8 h-8" /> : <ChevronUp className="w-8 h-8" />;
        color = swipeAction.confirmed ? 'bg-green-500' : 'bg-orange-500';
        text = swipeAction.confirmed ? 'Upvoted!' : 'Upvoting...';
        break;
      case 'downvote':
        icon = swipeAction.confirmed ? <Check className="w-8 h-8" /> : <ChevronDown className="w-8 h-8" />;
        color = swipeAction.confirmed ? 'bg-green-500' : 'bg-blue-500';
        text = swipeAction.confirmed ? 'Downvoted!' : 'Downvoting...';
        break;
      case 'save':
        icon = swipeAction.confirmed ? <Check className="w-8 h-8" /> : <Bookmark className="w-8 h-8" />;
        color = swipeAction.confirmed ? 'bg-green-500' : 'bg-yellow-500';
        text = swipeAction.confirmed ? 'Saved!' : 'Saving...';
        break;
      case 'share':
        icon = swipeAction.confirmed ? <Check className="w-8 h-8" /> : <Share2 className="w-8 h-8" />;
        color = swipeAction.confirmed ? 'bg-green-500' : 'bg-blue-500';
        text = swipeAction.confirmed ? 'Shared!' : 'Sharing...';
        break;
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`absolute inset-0 ${color} bg-opacity-90 flex items-center justify-center z-20 rounded-lg`}
      >
        <div className="flex flex-col items-center text-white">
          <motion.div
            animate={swipeAction.confirmed ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {icon}
          </motion.div>
          <span className="text-sm font-medium mt-1">{text}</span>
        </div>
      </motion.div>
    );
  };

  // Fallback to regular post card if swipe is not supported or disabled
  if (!isSwipeSupported || !enableSwipeGestures) {
    return (
      <RedditStylePostCard
        post={enhancedPost}
        community={community}
        viewMode={viewMode}
        showThumbnail={showThumbnail}
        onVote={onVote}
        onSave={onSave}
        onHide={onHide}
        onReport={onReport}
        onShare={onShare}
        onComment={onComment}
        isPinned={isPinned}
        className={className}
      />
    );
  }

  return (
    <div className="relative">
      {/* Swipe Hint */}
      <AnimatePresence>
        {showSwipeHint && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1 rounded-full z-30 whitespace-nowrap"
          >
            ← Swipe for actions →
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card Container */}
      <div
        ref={cardRef}
        className="relative touch-pan-y"
        {...swipeHandlers}
        onTouchStart={(e) => {
          handleFirstTouch();
          swipeHandlers.onTouchStart(e);
        }}
      >
        {/* Swipe Visual Feedback */}
        {getSwipeVisualFeedback()}

        {/* Action Confirmation Feedback */}
        <AnimatePresence>
          {getActionFeedback()}
        </AnimatePresence>

        {/* Post Card */}
        <RedditStylePostCard
          post={enhancedPost}
          community={community}
          viewMode={viewMode}
          showThumbnail={showThumbnail}
          onVote={onVote}
          onSave={onSave}
          onHide={onHide}
          onReport={onReport}
          onShare={onShare}
          onComment={onComment}
          isPinned={isPinned}
          className={className}
        />
      </div>

      {/* Accessibility: Screen reader instructions */}
      <div className="sr-only" aria-live="polite">
        {isSwipeSupported && (
          <span>
            Swipe left to vote, swipe right to save or share. 
            Double tap to open post options menu.
          </span>
        )}
      </div>
    </div>
  );
}
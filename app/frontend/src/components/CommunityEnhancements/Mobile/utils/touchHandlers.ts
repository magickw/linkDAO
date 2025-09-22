/**
 * Simple touch gesture handlers for mobile components
 * Replaces react-swipeable dependency with basic touch event handling
 */

export interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export interface SwipeConfig {
  onSwipedLeft?: () => void;
  onSwipedRight?: () => void;
  onSwipedUp?: () => void;
  onSwipedDown?: () => void;
  threshold?: number;
}

export const useSimpleSwipe = (config: SwipeConfig): SwipeHandlers => {
  const {
    onSwipedLeft,
    onSwipedRight,
    onSwipedUp,
    onSwipedDown,
    threshold = 50
  } = config;

  let touchStartX: number | null = null;
  let touchStartY: number | null = null;
  let touchEndX: number | null = null;
  let touchEndY: number | null = null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX = null;
    touchEndY = null;
    touchStartX = e.targetTouches[0].clientX;
    touchStartY = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX = e.targetTouches[0].clientX;
    touchEndY = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchStartY || !touchEndX || !touchEndY) return;
    
    const distanceX = touchStartX - touchEndX;
    const distanceY = touchStartY - touchEndY;
    
    const isLeftSwipe = distanceX > threshold;
    const isRightSwipe = distanceX < -threshold;
    const isUpSwipe = distanceY > threshold;
    const isDownSwipe = distanceY < -threshold;
    
    // Determine primary direction (horizontal vs vertical)
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Horizontal swipe
      if (isLeftSwipe && onSwipedLeft) {
        onSwipedLeft();
      } else if (isRightSwipe && onSwipedRight) {
        onSwipedRight();
      }
    } else {
      // Vertical swipe
      if (isUpSwipe && onSwipedUp) {
        onSwipedUp();
      } else if (isDownSwipe && onSwipedDown) {
        onSwipedDown();
      }
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};
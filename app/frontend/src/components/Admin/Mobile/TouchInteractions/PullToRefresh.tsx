import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPullDistance?: number;
  refreshingText?: string;
  pullText?: string;
  releaseText?: string;
  disabled?: boolean;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  refreshingText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  disabled = false,
  className = ''
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number>(0);
  const scrollTopRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    scrollTopRef.current = container.scrollTop;
    
    // Only start pull-to-refresh if we're at the top of the container
    if (scrollTopRef.current <= 0) {
      touchStartYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !isPullingRef.current) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartYRef.current;
    
    // Only allow pulling down when at the top
    if (deltaY > 0 && container.scrollTop <= 0) {
      e.preventDefault(); // Prevent default scrolling
      
      // Apply resistance to the pull distance
      const resistance = 0.5;
      const distance = Math.min(deltaY * resistance, maxPullDistance);
      
      setPullDistance(distance);
      setCanRefresh(distance >= threshold);
    } else {
      isPullingRef.current = false;
      setPullDistance(0);
      setCanRefresh(false);
    }
  }, [disabled, isRefreshing, threshold, maxPullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !isPullingRef.current) return;
    
    isPullingRef.current = false;
    
    if (canRefresh) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setCanRefresh(false);
  }, [disabled, isRefreshing, canRefresh, onRefresh]);

  // Add touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate refresh indicator properties
  const indicatorOpacity = Math.min(pullDistance / threshold, 1);
  const indicatorScale = Math.min(pullDistance / threshold, 1);
  const iconRotation = (pullDistance / threshold) * 180;

  const getStatusText = () => {
    if (isRefreshing) return refreshingText;
    if (canRefresh) return releaseText;
    return pullText;
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{
        transform: `translateY(${isRefreshing ? threshold : pullDistance}px)`,
        transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center bg-white/10 backdrop-blur-md"
        style={{
          height: `${threshold}px`,
          transform: `translateY(-${threshold}px)`,
          opacity: indicatorOpacity,
          pointerEvents: 'none'
        }}
      >
        <div
          className="flex items-center space-x-2 text-white"
          style={{
            transform: `scale(${indicatorScale})`
          }}
        >
          {isRefreshing ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <ChevronDown
              className="w-5 h-5 transition-transform duration-200"
              style={{
                transform: `rotate(${canRefresh ? 180 : iconRotation}deg)`
              }}
            />
          )}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        
        {/* Progress indicator */}
        <div className="w-16 h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-white/60 rounded-full transition-all duration-200"
            style={{
              width: `${Math.min((pullDistance / threshold) * 100, 100)}%`
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="min-h-full">
        {children}
      </div>
    </div>
  );
};
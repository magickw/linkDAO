/**
 * React Performance Optimizations
 * React.memo, useMemo, and useCallback optimizations for expensive components
 */

import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { EnhancedCommunityData, EnhancedPost, UserProfile } from '../../../types/communityEnhancements';

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const startTime = useRef<number>(0);

  useEffect(() => {
    startTime.current = performance.now();
    renderCount.current++;
  });

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    renderTimes.current.push(renderTime);
    
    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    if (renderTime > 16) { // More than one frame (60fps)
      console.warn(`Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  });

  const getMetrics = useCallback(() => {
    const avgRenderTime = renderTimes.current.length > 0 
      ? renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length
      : 0;

    return {
      renderCount: renderCount.current,
      averageRenderTime: avgRenderTime,
      lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0,
      slowRenders: renderTimes.current.filter(time => time > 16).length
    };
  }, []);

  return { getMetrics };
}

// Optimized Community Icon Component
interface CommunityIconProps {
  community: EnhancedCommunityData;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  onClick?: (community: EnhancedCommunityData) => void;
  className?: string;
}

export const OptimizedCommunityIcon = memo<CommunityIconProps>(({
  community,
  size = 'medium',
  showBadge = false,
  onClick,
  className = ''
}) => {
  const { getMetrics } = usePerformanceMonitor('CommunityIcon');

  // Memoize size calculations
  const sizeClasses = useMemo(() => {
    const sizes = {
      small: 'w-8 h-8',
      medium: 'w-12 h-12',
      large: 'w-16 h-16'
    };
    return sizes[size];
  }, [size]);

  // Memoize badge content
  const badgeContent = useMemo(() => {
    if (!showBadge) return null;
    
    const { userMembership } = community;
    if (userMembership.reputation > 1000) {
      return (
        <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          ⭐
        </div>
      );
    } else if (userMembership.tokenBalance > 100) {
      return (
        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          💎
        </div>
      );
    }
    return null;
  }, [showBadge, community.userMembership.reputation, community.userMembership.tokenBalance]);

  // Memoize click handler
  const handleClick = useCallback(() => {
    onClick?.(community);
  }, [onClick, community]);

  // Memoize style object
  const iconStyle = useMemo(() => ({
    backgroundColor: community.brandColors?.primary || '#f3f4f6'
  }), [community.brandColors?.primary]);

  return (
    <div 
      className={`relative ${sizeClasses} ${className} cursor-pointer transition-transform hover:scale-105`}
      onClick={handleClick}
      style={iconStyle}
    >
      <img
        src={community.icon}
        alt={community.name}
        className="w-full h-full rounded-full object-cover"
        loading="lazy"
      />
      {badgeContent}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.community.id === nextProps.community.id &&
    prevProps.community.icon === nextProps.community.icon &&
    prevProps.size === nextProps.size &&
    prevProps.showBadge === nextProps.showBadge &&
    prevProps.className === nextProps.className &&
    prevProps.community.userMembership.reputation === nextProps.community.userMembership.reputation &&
    prevProps.community.userMembership.tokenBalance === nextProps.community.userMembership.tokenBalance
  );
});

OptimizedCommunityIcon.displayName = 'OptimizedCommunityIcon';

// Optimized Post Card Component
interface PostCardProps {
  post: EnhancedPost;
  showPreview?: boolean;
  onInteraction?: (postId: string, action: string) => void;
  className?: string;
}

export const OptimizedPostCard = memo<PostCardProps>(({
  post,
  showPreview = true,
  onInteraction,
  className = ''
}) => {
  const { getMetrics } = usePerformanceMonitor('PostCard');

  // Memoize engagement calculations
  const engagementMetrics = useMemo(() => {
    const { upvotes, downvotes, comments, tips } = post.engagement;
    const totalEngagement = upvotes + downvotes + comments + tips.length;
    const engagementRatio = upvotes > 0 ? upvotes / (upvotes + downvotes) : 0;
    
    return {
      totalEngagement,
      engagementRatio,
      netVotes: upvotes - downvotes,
      tipAmount: tips.reduce((sum, tip) => sum + tip.amount, 0)
    };
  }, [post.engagement]);

  // Memoize preview content
  const previewContent = useMemo(() => {
    if (!showPreview || !post.previews) return null;

    const { nft, proposal, defi, link } = post.previews;
    
    if (nft) {
      return (
        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-3">
            <img src={nft.image} alt="NFT" className="w-12 h-12 rounded object-cover" />
            <div>
              <p className="font-medium text-sm">{nft.collection}</p>
              <p className="text-xs text-gray-600">Floor: {nft.floorPrice} ETH</p>
            </div>
          </div>
        </div>
      );
    }

    if (proposal) {
      return (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-sm mb-2">{proposal.title}</h4>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${proposal.votingProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {Math.floor(proposal.timeRemaining / 3600000)}h remaining
          </p>
        </div>
      );
    }

    if (defi) {
      return (
        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm">DeFi Yield</span>
            <span className="text-green-600 font-bold">{defi.apy}% APY</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">TVL: ${defi.tvl}</p>
        </div>
      );
    }

    if (link) {
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-sm">{link.title}</h4>
          <p className="text-xs text-gray-600 mt-1">{link.description}</p>
        </div>
      );
    }

    return null;
  }, [showPreview, post.previews]);

  // Memoize interaction handlers
  const handleUpvote = useCallback(() => {
    onInteraction?.(post.id, 'upvote');
  }, [onInteraction, post.id]);

  const handleDownvote = useCallback(() => {
    onInteraction?.(post.id, 'downvote');
  }, [onInteraction, post.id]);

  const handleComment = useCallback(() => {
    onInteraction?.(post.id, 'comment');
  }, [onInteraction, post.id]);

  const handleTip = useCallback(() => {
    onInteraction?.(post.id, 'tip');
  }, [onInteraction, post.id]);

  // Memoize time formatting
  const formattedTime = useMemo(() => {
    const now = new Date();
    const postTime = new Date(post.timestamp);
    const diffMs = now.getTime() - postTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  }, [post.timestamp]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      {/* Post Header */}
      <div className="flex items-center space-x-3 mb-3">
        <OptimizedUserAvatar user={post.author} size="sm" />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm">{post.author.username}</span>
            {post.author.ensName && (
              <span className="text-xs text-blue-600">@{post.author.ensName}</span>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{formattedTime}</span>
            {post.postType && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                {post.postType}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-3">
        <h3 className="font-medium text-gray-900 mb-2">{post.title}</h3>
        <p className="text-gray-700 text-sm line-clamp-3">{post.content}</p>
      </div>

      {/* Preview Content */}
      {previewContent}

      {/* Engagement Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleUpvote}
            className="flex items-center space-x-1 text-gray-500 hover:text-green-600 transition-colors"
          >
            <span>↑</span>
            <span className="text-sm">{engagementMetrics.netVotes}</span>
          </button>
          
          <button
            onClick={handleComment}
            className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors"
          >
            <span>💬</span>
            <span className="text-sm">{post.engagement.comments}</span>
          </button>
          
          <button
            onClick={handleTip}
            className="flex items-center space-x-1 text-gray-500 hover:text-yellow-600 transition-colors"
          >
            <span>💰</span>
            <span className="text-sm">{engagementMetrics.tipAmount}</span>
          </button>
        </div>

        <div className="text-xs text-gray-500">
          {engagementMetrics.totalEngagement} interactions
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for post card
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.engagement.upvotes === nextProps.post.engagement.upvotes &&
    prevProps.post.engagement.downvotes === nextProps.post.engagement.downvotes &&
    prevProps.post.engagement.comments === nextProps.post.engagement.comments &&
    prevProps.showPreview === nextProps.showPreview &&
    prevProps.className === nextProps.className
  );
});

OptimizedPostCard.displayName = 'OptimizedPostCard';

// Optimized User Avatar Component
interface UserAvatarProps {
  user: UserProfile;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  className?: string;
}

export const OptimizedUserAvatar = memo<UserAvatarProps>(({
  user,
  size = 'medium',
  showStatus = false,
  className = ''
}) => {
  const { getMetrics } = usePerformanceMonitor('UserAvatar');

  // Memoize size classes
  const sizeClasses = useMemo(() => {
    const sizes = {
      small: 'w-8 h-8',
      medium: 'w-10 h-10',
      large: 'w-12 h-12'
    };
    return sizes[size];
  }, [size]);

  // Memoize status indicator
  const statusIndicator = useMemo(() => {
    if (!showStatus) return null;
    
    return (
      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
    );
  }, [showStatus]);

  return (
    <div className={`relative ${sizeClasses} ${className}`}>
      <img
        src={user.avatar}
        alt={user.username}
        className="w-full h-full rounded-full object-cover"
        loading="lazy"
      />
      {statusIndicator}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.user.id === nextProps.user.id &&
    prevProps.user.avatar === nextProps.user.avatar &&
    prevProps.size === nextProps.size &&
    prevProps.showStatus === nextProps.showStatus &&
    prevProps.className === nextProps.className
  );
});

OptimizedUserAvatar.displayName = 'OptimizedUserAvatar';

// Optimized Filter Component
interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface OptimizedFilterProps {
  options: FilterOption[];
  selectedFilters: string[];
  onFilterChange: (filterId: string, selected: boolean) => void;
  className?: string;
}

export const OptimizedFilter = memo<OptimizedFilterProps>(({
  options,
  selectedFilters,
  onFilterChange,
  className = ''
}) => {
  const { getMetrics } = usePerformanceMonitor('Filter');

  // Memoize filter handlers
  const filterHandlers = useMemo(() => {
    const handlers: Record<string, () => void> = {};
    
    options.forEach(option => {
      handlers[option.id] = () => {
        const isSelected = selectedFilters.includes(option.id);
        onFilterChange(option.id, !isSelected);
      };
    });
    
    return handlers;
  }, [options, selectedFilters, onFilterChange]);

  // Memoize rendered options
  const renderedOptions = useMemo(() => {
    return options.map(option => {
      const isSelected = selectedFilters.includes(option.id);
      
      return (
        <button
          key={option.id}
          onClick={filterHandlers[option.id]}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            isSelected
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {option.label}
          {option.count !== undefined && (
            <span className="ml-1 opacity-75">({option.count})</span>
          )}
        </button>
      );
    });
  }, [options, selectedFilters, filterHandlers]);

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {renderedOptions}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.options.length === nextProps.options.length &&
    prevProps.options.every((option, index) => 
      option.id === nextProps.options[index]?.id &&
      option.label === nextProps.options[index]?.label &&
      option.count === nextProps.options[index]?.count
    ) &&
    prevProps.selectedFilters.length === nextProps.selectedFilters.length &&
    prevProps.selectedFilters.every(filter => nextProps.selectedFilters.includes(filter)) &&
    prevProps.className === nextProps.className
  );
});

OptimizedFilter.displayName = 'OptimizedFilter';

// Performance monitoring component
interface PerformanceMonitorProps {
  children: React.ReactNode;
  componentName: string;
  onSlowRender?: (renderTime: number) => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  children,
  componentName,
  onSlowRender
}) => {
  const startTime = useRef<number>(0);
  const renderCount = useRef(0);

  useEffect(() => {
    startTime.current = performance.now();
    renderCount.current++;
  });

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    if (renderTime > 16 && onSlowRender) {
      onSlowRender(renderTime);
    }

    if (process.env.NODE_ENV === 'development' && renderTime > 50) {
      console.warn(
        `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
      );
    }
  });

  return <>{children}</>;
};

// Hook for component lazy loading
export function useLazyComponent<T>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const [Component, setComponent] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = useCallback(async () => {
    if (Component || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const module = await importFn();
      setComponent(module.default);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load component'));
    } finally {
      setIsLoading(false);
    }
  }, [Component, isLoading, importFn]);

  return {
    Component,
    isLoading,
    error,
    loadComponent
  };
}

// Animation performance monitor
export function useAnimationPerformance() {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fps = useRef(60);

  const measureFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastTime.current;
    
    if (delta >= 1000) {
      fps.current = Math.round((frameCount.current * 1000) / delta);
      frameCount.current = 0;
      lastTime.current = now;
    } else {
      frameCount.current++;
    }

    requestAnimationFrame(measureFPS);
  }, []);

  useEffect(() => {
    const animationId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(animationId);
  }, [measureFPS]);

  return {
    fps: fps.current,
    isPerformant: fps.current >= 55 // Consider 55+ FPS as performant
  };
}

export default {
  OptimizedCommunityIcon,
  OptimizedPostCard,
  OptimizedUserAvatar,
  OptimizedFilter,
  PerformanceMonitor,
  usePerformanceMonitor,
  useLazyComponent,
  useAnimationPerformance
};
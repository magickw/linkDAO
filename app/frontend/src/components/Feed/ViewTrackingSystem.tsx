import React, { useEffect, useRef, useCallback, useState } from 'react';
import { EnhancedPost } from '../../types/feed';

interface ViewTrackingSystemProps {
  post: EnhancedPost;
  onViewTracked?: (postId: string, viewData: ViewData) => void;
  threshold?: number; // Percentage of post that must be visible
  minViewTime?: number; // Minimum time in milliseconds for a valid view
  className?: string;
}

interface ViewData {
  postId: string;
  viewedAt: Date;
  viewDuration: number;
  scrollDepth: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  referrer?: string;
  userAgent?: string;
}

interface ViewMetrics {
  totalViews: number;
  uniqueViews: number;
  averageViewTime: number;
  bounceRate: number;
  engagementRate: number;
  viewsByHour: { [hour: string]: number };
  viewsByDevice: { mobile: number; tablet: number; desktop: number };
}

export const ViewTrackingSystem: React.FC<ViewTrackingSystemProps> = ({
  post,
  onViewTracked,
  threshold = 0.5, // 50% of post must be visible
  minViewTime = 1000, // 1 second minimum view time
  className = ''
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const viewStartTime = useRef<number | null>(null);
  const hasBeenViewed = useRef(false);
  const intersectionObserver = useRef<IntersectionObserver | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [viewDuration, setViewDuration] = useState(0);

  // Get device type
  const getDeviceType = useCallback((): 'mobile' | 'tablet' | 'desktop' => {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, []);

  // Track view
  const trackView = useCallback(() => {
    if (hasBeenViewed.current || !viewStartTime.current) return;

    const duration = Date.now() - viewStartTime.current;
    
    if (duration >= minViewTime) {
      hasBeenViewed.current = true;
      
      const viewData: ViewData = {
        postId: post.id,
        viewedAt: new Date(),
        viewDuration: duration,
        scrollDepth: window.scrollY / (document.documentElement.scrollHeight - window.innerHeight),
        deviceType: getDeviceType(),
        referrer: document.referrer,
        userAgent: navigator.userAgent
      };

      // Store view locally
      const viewKey = `view-${post.id}-${Date.now()}`;
      localStorage.setItem(viewKey, JSON.stringify(viewData));

      // Update post view count
      const updatedPost = { ...post, views: post.views + 1 };
      
      onViewTracked?.(post.id, viewData);
      
      // Clean up old view data (keep last 100 views)
      const allViews = Object.keys(localStorage)
        .filter(key => key.startsWith(`view-${post.id}-`))
        .sort();
      
      if (allViews.length > 100) {
        allViews.slice(0, allViews.length - 100).forEach(key => {
          localStorage.removeItem(key);
        });
      }
    }
  }, [post.id, post.views, minViewTime, getDeviceType, onViewTracked]);

  // Handle intersection changes
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const entry = entries[0];
    const isCurrentlyVisible = entry.isIntersecting && entry.intersectionRatio >= threshold;
    
    setIsVisible(isCurrentlyVisible);
    
    if (isCurrentlyVisible && !viewStartTime.current) {
      // Start tracking view time
      viewStartTime.current = Date.now();
    } else if (!isCurrentlyVisible && viewStartTime.current) {
      // Stop tracking and record view if minimum time met
      trackView();
      viewStartTime.current = null;
    }
  }, [threshold, trackView]);

  // Set up intersection observer
  useEffect(() => {
    if (!elementRef.current) return;

    intersectionObserver.current = new IntersectionObserver(handleIntersection, {
      threshold: [0, threshold, 1],
      rootMargin: '0px'
    });

    intersectionObserver.current.observe(elementRef.current);

    return () => {
      if (intersectionObserver.current) {
        intersectionObserver.current.disconnect();
      }
      
      // Track view on unmount if currently viewing
      if (viewStartTime.current) {
        trackView();
      }
    };
  }, [handleIntersection, threshold, trackView]);

  // Update view duration while visible
  useEffect(() => {
    if (!isVisible || !viewStartTime.current) return;

    const interval = setInterval(() => {
      if (viewStartTime.current) {
        setViewDuration(Date.now() - viewStartTime.current);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && viewStartTime.current) {
        // Page became hidden, track the view
        trackView();
        viewStartTime.current = null;
      } else if (!document.hidden && isVisible && !viewStartTime.current) {
        // Page became visible again and post is in view
        viewStartTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isVisible, trackView]);

  return (
    <div ref={elementRef} className={className}>
      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50">
          <div>Post: {post.id}</div>
          <div>Visible: {isVisible ? 'Yes' : 'No'}</div>
          <div>Duration: {viewDuration}ms</div>
          <div>Viewed: {hasBeenViewed.current ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

// Hook for getting view metrics
export const useViewMetrics = (postId: string): ViewMetrics | null => {
  const [metrics, setMetrics] = useState<ViewMetrics | null>(null);

  useEffect(() => {
    const calculateMetrics = () => {
      const viewKeys = Object.keys(localStorage)
        .filter(key => key.startsWith(`view-${postId}-`));

      if (viewKeys.length === 0) {
        setMetrics(null);
        return;
      }

      const views = viewKeys.map(key => {
        try {
          return JSON.parse(localStorage.getItem(key) || '{}') as ViewData;
        } catch {
          return null;
        }
      }).filter(Boolean) as ViewData[];

      const uniqueViews = new Set(views.map(v => v.userAgent)).size;
      const totalViews = views.length;
      const averageViewTime = views.reduce((sum, v) => sum + v.viewDuration, 0) / views.length;
      
      // Calculate bounce rate (views < 3 seconds)
      const bounces = views.filter(v => v.viewDuration < 3000).length;
      const bounceRate = (bounces / totalViews) * 100;
      
      // Calculate engagement rate (views > 10 seconds)
      const engaged = views.filter(v => v.viewDuration > 10000).length;
      const engagementRate = (engaged / totalViews) * 100;

      // Views by hour
      const viewsByHour: { [hour: string]: number } = {};
      views.forEach(view => {
        const hour = new Date(view.viewedAt).getHours().toString();
        viewsByHour[hour] = (viewsByHour[hour] || 0) + 1;
      });

      // Views by device
      const viewsByDevice = views.reduce(
        (acc, view) => {
          acc[view.deviceType]++;
          return acc;
        },
        { mobile: 0, tablet: 0, desktop: 0 }
      );

      setMetrics({
        totalViews,
        uniqueViews,
        averageViewTime,
        bounceRate,
        engagementRate,
        viewsByHour,
        viewsByDevice
      });
    };

    calculateMetrics();
    
    // Recalculate every 30 seconds
    const interval = setInterval(calculateMetrics, 30000);
    return () => clearInterval(interval);
  }, [postId]);

  return metrics;
};

// Component to display view count with real-time updates
interface ViewCountDisplayProps {
  post: EnhancedPost;
  showDetailed?: boolean;
  className?: string;
}

export const ViewCountDisplay: React.FC<ViewCountDisplayProps> = ({
  post,
  showDetailed = false,
  className = ''
}) => {
  const metrics = useViewMetrics(post.id);
  const [currentViews, setCurrentViews] = useState(post.views);

  // Update view count from metrics
  useEffect(() => {
    if (metrics) {
      setCurrentViews(post.views + metrics.totalViews);
    }
  }, [metrics, post.views]);

  // Format view count
  const formatViewCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Format duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
        <span className="text-sm">👁️</span>
        <span className="text-sm font-medium">
          {formatViewCount(currentViews)}
        </span>
        {showDetailed && metrics && (
          <span className="text-xs">
            ({metrics.uniqueViews} unique)
          </span>
        )}
      </div>

      {showDetailed && metrics && (
        <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
          <span title="Average view time">
            ⏱️ {formatDuration(metrics.averageViewTime)}
          </span>
          <span title="Engagement rate">
            📊 {metrics.engagementRate.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default ViewTrackingSystem;
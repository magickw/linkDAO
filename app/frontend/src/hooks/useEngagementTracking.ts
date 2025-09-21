import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { EngagementAnalyticsService } from '../services/engagementAnalyticsService';
import type { EngagementInteraction } from '../types/engagementAnalytics';

interface UseEngagementTrackingOptions {
  enableAutoTracking?: boolean;
  batchSize?: number;
  flushInterval?: number; // in milliseconds
  enableOfflineQueue?: boolean;
}

interface EngagementTrackingMethods {
  trackInteraction: (interaction: Omit<EngagementInteraction, 'id' | 'timestamp' | 'userId'>) => void;
  trackReaction: (postId: string, reactionType: string, value?: number) => void;
  trackComment: (postId: string, commentId?: string) => void;
  trackShare: (postId: string, platform?: string) => void;
  trackTip: (postId: string, amount: number, tokenType: string, message?: string) => void;
  trackView: (postId: string, viewDuration?: number) => void;
  flushQueue: () => Promise<void>;
  getQueueSize: () => number;
}

export function useEngagementTracking(
  options: UseEngagementTrackingOptions = {}
): EngagementTrackingMethods {
  const {
    enableAutoTracking = true,
    batchSize = 10,
    flushInterval = 30000, // 30 seconds
    enableOfflineQueue = true
  } = options;

  const { user } = useAuth();
  const queueRef = useRef<Omit<EngagementInteraction, 'id' | 'timestamp'>[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFlushingRef = useRef(false);

  // Auto-flush queue at intervals
  useEffect(() => {
    if (!enableAutoTracking) return;

    const scheduleFlush = () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      
      flushTimeoutRef.current = setTimeout(() => {
        flushQueue();
        scheduleFlush();
      }, flushInterval);
    };

    scheduleFlush();

    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
  }, [enableAutoTracking, flushInterval]);

  // Flush queue when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (queueRef.current.length > 0) {
        // Use sendBeacon for reliable delivery
        const data = JSON.stringify(queueRef.current);
        navigator.sendBeacon('/api/analytics/engagement/track-batch', data);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && queueRef.current.length > 0) {
        flushQueue();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Process offline queue on reconnection
  useEffect(() => {
    if (!enableOfflineQueue) return;

    const handleOnline = () => {
      EngagementAnalyticsService.processQueuedInteractions();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [enableOfflineQueue]);

  // Determine user type and context
  const getUserContext = useCallback(() => {
    if (!user) {
      return {
        userType: 'regular' as const,
        socialProofWeight: 1,
        influenceScore: 0
      };
    }

    // Determine user type based on user properties
    let userType: 'verified' | 'community_leader' | 'follower' | 'regular' = 'regular';
    let socialProofWeight = 1;
    let influenceScore = 0;

    // Check if user is admin or moderator (community leader)
    if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator') {
      userType = 'community_leader';
      socialProofWeight = user.role === 'super_admin' ? 3 : user.role === 'admin' ? 2.5 : 2;
      influenceScore = user.role === 'super_admin' ? 90 : user.role === 'admin' ? 70 : 50;
    }
    // Check if user has advanced KYC (treat as verified)
    else if (user.kycStatus === 'advanced' || user.kycStatus === 'intermediate') {
      userType = 'verified';
      socialProofWeight = user.kycStatus === 'advanced' ? 2.5 : 2;
      influenceScore = user.kycStatus === 'advanced' ? 60 : 40;
    }

    return {
      userType,
      socialProofWeight,
      influenceScore,
      userReputation: undefined, // Not available in AuthUser
      userBadges: undefined // Not available in AuthUser
    };
  }, [user]);

  // Add interaction to queue
  const queueInteraction = useCallback((interaction: Omit<EngagementInteraction, 'id' | 'timestamp'>) => {
    queueRef.current.push(interaction);

    // Auto-flush if queue is full
    if (queueRef.current.length >= batchSize) {
      flushQueue();
    }
  }, [batchSize]);

  // Generic interaction tracking
  const trackInteraction = useCallback((
    interaction: Omit<EngagementInteraction, 'id' | 'timestamp' | 'userId'>
  ) => {
    if (!user) return;

    const userContext = getUserContext();
    const fullInteraction: Omit<EngagementInteraction, 'id' | 'timestamp'> = {
      ...interaction,
      userId: user.address,
      ...userContext,
      source: 'web',
      userAgent: navigator.userAgent
    };

    queueInteraction(fullInteraction);
  }, [user, getUserContext, queueInteraction]);

  // Specific interaction tracking methods
  const trackReaction = useCallback((
    postId: string,
    reactionType: string,
    value: number = 1
  ) => {
    const userContext = getUserContext();
    trackInteraction({
      postId,
      type: 'reaction',
      value,
      message: reactionType,
      source: 'web',
      ...userContext
    });
  }, [trackInteraction, getUserContext]);

  const trackComment = useCallback((
    postId: string,
    commentId?: string
  ) => {
    const userContext = getUserContext();
    trackInteraction({
      postId,
      type: 'comment',
      message: commentId,
      source: 'web',
      ...userContext
    });
  }, [trackInteraction, getUserContext]);

  const trackShare = useCallback((
    postId: string,
    platform?: string
  ) => {
    const userContext = getUserContext();
    trackInteraction({
      postId,
      type: 'share',
      message: platform,
      source: 'web',
      ...userContext
    });
  }, [trackInteraction, getUserContext]);

  const trackTip = useCallback((
    postId: string,
    amount: number,
    tokenType: string,
    message?: string
  ) => {
    const userContext = getUserContext();
    trackInteraction({
      postId,
      type: 'tip',
      value: amount,
      tokenType,
      message,
      source: 'web',
      ...userContext
    });
  }, [trackInteraction, getUserContext]);

  const trackView = useCallback((
    postId: string,
    viewDuration?: number
  ) => {
    const userContext = getUserContext();
    trackInteraction({
      postId,
      type: 'view',
      value: viewDuration,
      source: 'web',
      ...userContext
    });
  }, [trackInteraction, getUserContext]);

  // Flush queue to server
  const flushQueue = useCallback(async () => {
    if (isFlushingRef.current || queueRef.current.length === 0) {
      return;
    }

    isFlushingRef.current = true;
    const interactions = [...queueRef.current];
    queueRef.current = [];

    try {
      // Send interactions in batch
      await Promise.all(
        interactions.map(interaction =>
          EngagementAnalyticsService.trackEngagementInteraction(interaction)
        )
      );
    } catch (error) {
      console.error('Error flushing engagement queue:', error);
      
      // Re-queue failed interactions if offline queue is enabled
      if (enableOfflineQueue) {
        queueRef.current.unshift(...interactions);
      }
    } finally {
      isFlushingRef.current = false;
    }
  }, [enableOfflineQueue]);

  // Get current queue size
  const getQueueSize = useCallback(() => {
    return queueRef.current.length;
  }, []);

  return {
    trackInteraction,
    trackReaction,
    trackComment,
    trackShare,
    trackTip,
    trackView,
    flushQueue,
    getQueueSize
  };
}

// Hook for automatic view tracking
export function useViewTracking(
  postId: string,
  options: {
    threshold?: number; // Percentage of post visible
    minDuration?: number; // Minimum time in view (ms)
    enabled?: boolean;
  } = {}
) {
  const { threshold = 0.5, minDuration = 1000, enabled = true } = options;
  const { trackView } = useEngagementTracking();
  const viewStartRef = useRef<number | null>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !postId || hasTrackedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            // Post came into view
            if (!viewStartRef.current) {
              viewStartRef.current = Date.now();
            }
          } else {
            // Post left view
            if (viewStartRef.current) {
              const viewDuration = Date.now() - viewStartRef.current;
              
              if (viewDuration >= minDuration) {
                trackView(postId, viewDuration);
                hasTrackedRef.current = true;
              }
              
              viewStartRef.current = null;
            }
          }
        });
      },
      { threshold }
    );

    // Find the post element
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (postElement) {
      observer.observe(postElement);
    }

    return () => {
      observer.disconnect();
      
      // Track final view if still in view
      if (viewStartRef.current && !hasTrackedRef.current) {
        const viewDuration = Date.now() - viewStartRef.current;
        if (viewDuration >= minDuration) {
          trackView(postId, viewDuration);
        }
      }
    };
  }, [postId, threshold, minDuration, enabled, trackView]);
}

// Hook for tracking engagement interactions on post components
export function usePostEngagementTracking(postId: string) {
  const { trackReaction, trackComment, trackShare, trackTip } = useEngagementTracking();

  const handleReaction = useCallback((reactionType: string, value?: number) => {
    trackReaction(postId, reactionType, value);
  }, [postId, trackReaction]);

  const handleComment = useCallback((commentId?: string) => {
    trackComment(postId, commentId);
  }, [postId, trackComment]);

  const handleShare = useCallback((platform?: string) => {
    trackShare(postId, platform);
  }, [postId, trackShare]);

  const handleTip = useCallback((amount: number, tokenType: string, message?: string) => {
    trackTip(postId, amount, tokenType, message);
  }, [postId, trackTip]);

  return {
    handleReaction,
    handleComment,
    handleShare,
    handleTip
  };
}
/**
 * Community Event Tracking Service
 *
 * Provides specialized event tracking for community features including:
 * - Post interactions (create, vote, comment, share)
 * - Community actions (join, leave, moderate)
 * - Creator tool usage (pin, announce, monthly updates)
 * - Engagement metrics (reactions, tips, staking)
 */

import { analyticsService } from './analyticsService';

// Event types for community tracking
export type CommunityEventType =
  // Post events
  | 'post_create'
  | 'post_view'
  | 'post_vote'
  | 'post_comment'
  | 'post_share'
  | 'post_reaction'
  | 'post_tip'
  | 'post_pin'
  | 'post_unpin'
  | 'post_delete'
  | 'post_edit'
  // Comment events
  | 'comment_create'
  | 'comment_vote'
  | 'comment_reply'
  | 'comment_delete'
  // Community events
  | 'community_join'
  | 'community_leave'
  | 'community_create'
  | 'community_view'
  | 'community_search'
  // Announcement events
  | 'announcement_create'
  | 'announcement_view'
  | 'announcement_dismiss'
  | 'announcement_click'
  | 'announcement_edit'
  | 'announcement_delete'
  // Monthly update events
  | 'monthly_update_create'
  | 'monthly_update_view'
  | 'monthly_update_publish'
  | 'monthly_update_edit'
  | 'monthly_update_delete'
  // Moderation events
  | 'moderation_action'
  | 'report_submit'
  | 'report_resolve'
  // Staking events
  | 'stake_tokens'
  | 'unstake_tokens'
  | 'claim_rewards'
  // Engagement events
  | 'reaction_add'
  | 'reaction_remove'
  | 'bookmark_add'
  | 'bookmark_remove'
  // User journey events
  | 'onboarding_start'
  | 'onboarding_complete'
  | 'onboarding_step'
  | 'wallet_connect'
  | 'wallet_disconnect';

// Event data interfaces
export interface PostEventData {
  postId: string;
  communityId: string;
  authorAddress?: string;
  postType?: 'text' | 'media' | 'link' | 'nft' | 'defi' | 'governance';
  tags?: string[];
  hasMedia?: boolean;
  contentLength?: number;
  voteType?: 'upvote' | 'downvote';
  stakeAmount?: number;
  reactionType?: string;
  tipAmount?: number;
  tipToken?: string;
  shareType?: 'copy' | 'twitter' | 'telegram' | 'warpcast';
}

export interface CommentEventData {
  commentId: string;
  postId: string;
  communityId: string;
  parentCommentId?: string;
  contentLength?: number;
  isReply?: boolean;
}

export interface CommunityEventData {
  communityId: string;
  communityName?: string;
  category?: string;
  memberCount?: number;
  role?: 'member' | 'moderator' | 'admin' | 'creator';
}

export interface AnnouncementEventData {
  announcementId: string;
  communityId: string;
  announcementType?: 'info' | 'warning' | 'success' | 'error';
  isExpired?: boolean;
}

export interface MonthlyUpdateEventData {
  updateId: string;
  communityId: string;
  month: number;
  year: number;
  isPublished?: boolean;
  hasMedia?: boolean;
  hasMetrics?: boolean;
}

export interface ModerationEventData {
  actionType: 'warn' | 'mute' | 'ban' | 'delete' | 'approve' | 'reject';
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  communityId: string;
  reason?: string;
}

export interface StakingEventData {
  amount: number;
  tokenSymbol: string;
  tier?: number;
  postId?: string;
  communityId?: string;
  reactionType?: string;
  transactionHash?: string;
}

export interface OnboardingEventData {
  step: number;
  stepName: string;
  completed?: boolean;
  skipped?: boolean;
  duration?: number;
}

// Union type for all event data
export type EventData =
  | PostEventData
  | CommentEventData
  | CommunityEventData
  | AnnouncementEventData
  | MonthlyUpdateEventData
  | ModerationEventData
  | StakingEventData
  | OnboardingEventData
  | Record<string, unknown>;

class CommunityEventTracker {
  private eventQueue: Array<{ eventType: CommunityEventType; data: EventData; timestamp: Date }> = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_QUEUE_SIZE = 50;
  private isInitialized = false;

  constructor() {
    // Initialize only in browser
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialize the event tracker
   */
  private initialize(): void {
    if (this.isInitialized) return;

    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flushQueue();
    }, this.FLUSH_INTERVAL);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushQueue();
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushQueue();
      }
    });

    this.isInitialized = true;
  }

  /**
   * Track a community event
   */
  track(eventType: CommunityEventType, data: EventData): void {
    if (typeof window === 'undefined') return;

    const event = {
      eventType,
      data: {
        ...data,
        url: window.location.href,
        path: window.location.pathname,
      },
      timestamp: new Date(),
    };

    this.eventQueue.push(event);

    // Flush if queue is full
    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flushQueue();
    }

    // Also send to main analytics service for real-time tracking
    analyticsService.trackUserEvent(eventType, data);
  }

  /**
   * Flush the event queue to the analytics service
   */
  private async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Batch send events to backend
      await fetch('/api/analytics/batch-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          sessionId: this.getSessionId(),
          userId: this.getUserId(),
        }),
        keepalive: true, // Ensure request completes even if page unloads
      });
    } catch (error) {
      // Re-queue events on failure (with a limit to prevent memory issues)
      if (this.eventQueue.length < this.MAX_QUEUE_SIZE * 2) {
        this.eventQueue = [...events, ...this.eventQueue];
      }
      console.debug('Failed to flush event queue:', error);
    }
  }

  /**
   * Get session ID from storage
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server';

    let sessionId = sessionStorage.getItem('eventSessionId');
    if (!sessionId) {
      sessionId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('eventSessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Get user ID from storage
   */
  private getUserId(): string {
    if (typeof window === 'undefined') return 'anonymous';

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || user.walletAddress || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  // Convenience methods for specific event types

  /**
   * Track post creation
   */
  trackPostCreate(data: PostEventData): void {
    this.track('post_create', data);
  }

  /**
   * Track post view
   */
  trackPostView(data: PostEventData): void {
    this.track('post_view', data);
  }

  /**
   * Track post vote
   */
  trackPostVote(data: PostEventData): void {
    this.track('post_vote', data);
  }

  /**
   * Track post comment
   */
  trackPostComment(data: CommentEventData): void {
    this.track('post_comment', data);
  }

  /**
   * Track post share
   */
  trackPostShare(data: PostEventData): void {
    this.track('post_share', data);
  }

  /**
   * Track post reaction
   */
  trackPostReaction(data: PostEventData): void {
    this.track('post_reaction', data);
  }

  /**
   * Track post tip
   */
  trackPostTip(data: PostEventData): void {
    this.track('post_tip', data);
  }

  /**
   * Track post pin
   */
  trackPostPin(postId: string, communityId: string): void {
    this.track('post_pin', { postId, communityId });
  }

  /**
   * Track post unpin
   */
  trackPostUnpin(postId: string, communityId: string): void {
    this.track('post_unpin', { postId, communityId });
  }

  /**
   * Track community join
   */
  trackCommunityJoin(data: CommunityEventData): void {
    this.track('community_join', data);
  }

  /**
   * Track community leave
   */
  trackCommunityLeave(data: CommunityEventData): void {
    this.track('community_leave', data);
  }

  /**
   * Track community view
   */
  trackCommunityView(data: CommunityEventData): void {
    this.track('community_view', data);
  }

  /**
   * Track announcement creation
   */
  trackAnnouncementCreate(data: AnnouncementEventData): void {
    this.track('announcement_create', data);
  }

  /**
   * Track announcement view
   */
  trackAnnouncementView(data: AnnouncementEventData): void {
    this.track('announcement_view', data);
  }

  /**
   * Track announcement dismiss
   */
  trackAnnouncementDismiss(data: AnnouncementEventData): void {
    this.track('announcement_dismiss', data);
  }

  /**
   * Track monthly update creation
   */
  trackMonthlyUpdateCreate(data: MonthlyUpdateEventData): void {
    this.track('monthly_update_create', data);
  }

  /**
   * Track monthly update view
   */
  trackMonthlyUpdateView(data: MonthlyUpdateEventData): void {
    this.track('monthly_update_view', data);
  }

  /**
   * Track monthly update publish
   */
  trackMonthlyUpdatePublish(data: MonthlyUpdateEventData): void {
    this.track('monthly_update_publish', data);
  }

  /**
   * Track moderation action
   */
  trackModerationAction(data: ModerationEventData): void {
    this.track('moderation_action', data);
  }

  /**
   * Track token staking
   */
  trackStakeTokens(data: StakingEventData): void {
    this.track('stake_tokens', data);
  }

  /**
   * Track token unstaking
   */
  trackUnstakeTokens(data: StakingEventData): void {
    this.track('unstake_tokens', data);
  }

  /**
   * Track rewards claim
   */
  trackClaimRewards(data: StakingEventData): void {
    this.track('claim_rewards', data);
  }

  /**
   * Track bookmark add
   */
  trackBookmarkAdd(postId: string, communityId: string): void {
    this.track('bookmark_add', { postId, communityId });
  }

  /**
   * Track bookmark remove
   */
  trackBookmarkRemove(postId: string, communityId: string): void {
    this.track('bookmark_remove', { postId, communityId });
  }

  /**
   * Track onboarding step
   */
  trackOnboardingStep(data: OnboardingEventData): void {
    this.track('onboarding_step', data);
  }

  /**
   * Track wallet connection
   */
  trackWalletConnect(walletType: string, address: string): void {
    this.track('wallet_connect', {
      walletType,
      address: `${address.slice(0, 6)}...${address.slice(-4)}`, // Truncate for privacy
    });
  }

  /**
   * Track wallet disconnection
   */
  trackWalletDisconnect(): void {
    this.track('wallet_disconnect', {});
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flushQueue();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const communityEventTracker = new CommunityEventTracker();

// Export React hook for easy usage in components
export function useEventTracking() {
  return {
    track: communityEventTracker.track.bind(communityEventTracker),
    trackPostCreate: communityEventTracker.trackPostCreate.bind(communityEventTracker),
    trackPostView: communityEventTracker.trackPostView.bind(communityEventTracker),
    trackPostVote: communityEventTracker.trackPostVote.bind(communityEventTracker),
    trackPostComment: communityEventTracker.trackPostComment.bind(communityEventTracker),
    trackPostShare: communityEventTracker.trackPostShare.bind(communityEventTracker),
    trackPostReaction: communityEventTracker.trackPostReaction.bind(communityEventTracker),
    trackPostTip: communityEventTracker.trackPostTip.bind(communityEventTracker),
    trackPostPin: communityEventTracker.trackPostPin.bind(communityEventTracker),
    trackPostUnpin: communityEventTracker.trackPostUnpin.bind(communityEventTracker),
    trackCommunityJoin: communityEventTracker.trackCommunityJoin.bind(communityEventTracker),
    trackCommunityLeave: communityEventTracker.trackCommunityLeave.bind(communityEventTracker),
    trackCommunityView: communityEventTracker.trackCommunityView.bind(communityEventTracker),
    trackAnnouncementCreate: communityEventTracker.trackAnnouncementCreate.bind(communityEventTracker),
    trackAnnouncementView: communityEventTracker.trackAnnouncementView.bind(communityEventTracker),
    trackAnnouncementDismiss: communityEventTracker.trackAnnouncementDismiss.bind(communityEventTracker),
    trackMonthlyUpdateCreate: communityEventTracker.trackMonthlyUpdateCreate.bind(communityEventTracker),
    trackMonthlyUpdateView: communityEventTracker.trackMonthlyUpdateView.bind(communityEventTracker),
    trackMonthlyUpdatePublish: communityEventTracker.trackMonthlyUpdatePublish.bind(communityEventTracker),
    trackModerationAction: communityEventTracker.trackModerationAction.bind(communityEventTracker),
    trackStakeTokens: communityEventTracker.trackStakeTokens.bind(communityEventTracker),
    trackUnstakeTokens: communityEventTracker.trackUnstakeTokens.bind(communityEventTracker),
    trackClaimRewards: communityEventTracker.trackClaimRewards.bind(communityEventTracker),
    trackBookmarkAdd: communityEventTracker.trackBookmarkAdd.bind(communityEventTracker),
    trackBookmarkRemove: communityEventTracker.trackBookmarkRemove.bind(communityEventTracker),
    trackOnboardingStep: communityEventTracker.trackOnboardingStep.bind(communityEventTracker),
    trackWalletConnect: communityEventTracker.trackWalletConnect.bind(communityEventTracker),
    trackWalletDisconnect: communityEventTracker.trackWalletDisconnect.bind(communityEventTracker),
  };
}

export default communityEventTracker;

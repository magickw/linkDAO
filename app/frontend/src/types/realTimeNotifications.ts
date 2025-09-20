export enum NotificationCategory {
  MENTION = 'mention',
  TIP = 'tip',
  GOVERNANCE = 'governance',
  COMMUNITY = 'community',
  REACTION = 'reaction',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  SYSTEM = 'system'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationUrgency {
  IMMEDIATE = 'immediate',
  TIMELY = 'timely',
  EVENTUAL = 'eventual',
  BACKGROUND = 'background'
}

export interface BaseNotification {
  id: string;
  userId: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  urgency: NotificationUrgency;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
  actionUrl?: string;
  metadata: Record<string, any>;
  expiresAt?: Date;
}

export interface MentionNotification extends BaseNotification {
  category: NotificationCategory.MENTION;
  metadata: {
    postId: string;
    commentId?: string;
    mentionedBy: string;
    mentionedByUsername: string;
    mentionedByAvatar?: string;
    context: string;
  };
}

export interface TipNotification extends BaseNotification {
  category: NotificationCategory.TIP;
  metadata: {
    postId: string;
    tipAmount: number;
    tokenSymbol: string;
    tipperAddress: string;
    tipperUsername: string;
    tipperAvatar?: string;
    message?: string;
  };
}

export interface GovernanceNotification extends BaseNotification {
  category: NotificationCategory.GOVERNANCE;
  metadata: {
    proposalId: string;
    proposalTitle: string;
    action: 'created' | 'voting_started' | 'voting_ending' | 'executed' | 'rejected';
    votingDeadline?: Date;
    timeRemaining?: number;
    quorumStatus?: 'met' | 'not_met' | 'approaching';
    userVoteStatus?: 'voted' | 'not_voted';
  };
}

export interface CommunityNotification extends BaseNotification {
  category: NotificationCategory.COMMUNITY;
  metadata: {
    communityId: string;
    communityName: string;
    communityIcon?: string;
    eventType: 'new_member' | 'new_post' | 'announcement' | 'event' | 'milestone';
    eventData: Record<string, any>;
  };
}

export interface ReactionNotification extends BaseNotification {
  category: NotificationCategory.REACTION;
  metadata: {
    postId: string;
    reactionType: string;
    reactionEmoji: string;
    reactorAddress: string;
    reactorUsername: string;
    reactorAvatar?: string;
    tokenAmount?: number;
  };
}

export type RealTimeNotification = 
  | MentionNotification 
  | TipNotification 
  | GovernanceNotification 
  | CommunityNotification 
  | ReactionNotification 
  | BaseNotification;

export interface NotificationQueue {
  online: RealTimeNotification[];
  offline: RealTimeNotification[];
  failed: RealTimeNotification[];
}

export interface NotificationSettings {
  categories: Record<NotificationCategory, {
    enabled: boolean;
    priority: NotificationPriority;
    sound: boolean;
    desktop: boolean;
    email: boolean;
  }>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  batchDelay: number;
  maxBatchSize: number;
}

export interface LiveUpdateIndicator {
  type: 'new_posts' | 'new_comments' | 'new_reactions' | 'live_discussion';
  count: number;
  lastUpdate: Date;
  priority: NotificationPriority;
  contextId: string; // postId, discussionId, etc.
}

export interface NotificationState {
  notifications: RealTimeNotification[];
  unreadCount: number;
  queue: NotificationQueue;
  settings: NotificationSettings;
  liveIndicators: LiveUpdateIndicator[];
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastSync: Date;
}
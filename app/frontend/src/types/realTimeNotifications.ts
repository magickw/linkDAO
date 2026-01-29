export enum NotificationCategory {
  MENTION = 'mention',
  TIP = 'tip',
  GOVERNANCE = 'governance',
  COMMUNITY = 'community',
  REACTION = 'reaction',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  SYSTEM = 'system',
  // Social interaction categories
  UPVOTE = 'upvote',
  DOWNVOTE = 'downvote',
  REPOST = 'repost',
  AWARD = 'award',
  BOOKMARK = 'bookmark',
  // Order/marketplace categories
  ORDER_CREATED = 'order_created',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_PROCESSING = 'order_processing',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_COMPLETED = 'order_completed',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_REFUNDED = 'order_refunded',
  ORDER_DISPUTED = 'order_disputed',
  PAYMENT_RECEIVED = 'payment_received',
  DELIVERY_CONFIRMED = 'delivery_confirmed',
  ESCROW_FUNDED = 'escrow_funded',
  ESCROW_RELEASED = 'escrow_released'
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
    mentionedByHandle: string;
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
    tipperHandle: string;
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
    commentId?: string;
    reactionType: string;
    reactionEmoji: string;
    reactorAddress: string;
    reactorHandle: string;
    reactorAvatar?: string;
    tokenAmount?: number;
    count?: number;
    userReacted?: boolean;
  };
}

export interface UpvoteNotification extends BaseNotification {
  category: NotificationCategory.UPVOTE;
  metadata: {
    postId: string;
    postTitle?: string;
    postPreview?: string;
    voterAddress: string;
    voterHandle: string;
    voterAvatar?: string;
    totalUpvotes: number;
    isAggregated?: boolean;
    aggregatedCount?: number;
    aggregatedUsers?: Array<{ address: string; handle: string; avatar?: string }>;
  };
}

export interface DownvoteNotification extends BaseNotification {
  category: NotificationCategory.DOWNVOTE;
  metadata: {
    postId: string;
    postTitle?: string;
    postPreview?: string;
    voterAddress: string;
    voterHandle: string;
    voterAvatar?: string;
    totalDownvotes: number;
  };
}

export interface RepostNotification extends BaseNotification {
  category: NotificationCategory.REPOST;
  metadata: {
    originalPostId: string;
    repostId: string;
    postTitle?: string;
    postPreview?: string;
    reposterAddress: string;
    reposterHandle: string;
    reposterAvatar?: string;
    repostComment?: string;
    totalReposts: number;
  };
}

export interface AwardNotification extends BaseNotification {
  category: NotificationCategory.AWARD;
  metadata: {
    postId: string;
    postTitle?: string;
    postPreview?: string;
    awardType: 'silver' | 'gold' | 'platinum' | 'diamond' | string;
    awardIcon?: string;
    awardCost: number;
    awardMessage?: string;
    giverAddress: string;
    giverHandle: string;
    giverAvatar?: string;
    totalAwards: number;
  };
}

export interface BookmarkNotification extends BaseNotification {
  category: NotificationCategory.BOOKMARK;
  metadata: {
    postId: string;
    postTitle?: string;
    postPreview?: string;
    bookmarkerAddress: string;
    bookmarkerHandle: string;
    bookmarkerAvatar?: string;
    totalBookmarks: number;
  };
}

// Order/Marketplace notification interfaces
export interface OrderCreatedNotification extends BaseNotification {
  category: NotificationCategory.ORDER_CREATED;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    productImage?: string;
    amount: number;
    currency: string;
    buyerAddress: string;
    buyerHandle?: string;
    sellerAddress: string;
    sellerHandle?: string;
    recipientType: 'buyer' | 'seller';
  };
}

export interface OrderConfirmedNotification extends BaseNotification {
  category: NotificationCategory.ORDER_CONFIRMED;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    productImage?: string;
    sellerAddress: string;
    sellerHandle?: string;
    recipientType: 'buyer' | 'seller';
  };
}

export interface OrderProcessingNotification extends BaseNotification {
  category: NotificationCategory.ORDER_PROCESSING;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    productImage?: string;
    estimatedCompletion?: string;
    recipientType: 'buyer' | 'seller';
  };
}

export interface OrderShippedNotification extends BaseNotification {
  category: NotificationCategory.ORDER_SHIPPED;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    productImage?: string;
    trackingNumber?: string;
    trackingCarrier?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
    recipientType: 'buyer' | 'seller';
  };
}

export interface OrderDeliveredNotification extends BaseNotification {
  category: NotificationCategory.ORDER_DELIVERED;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    productImage?: string;
    deliveredAt: string;
    recipientType: 'buyer' | 'seller';
  };
}

export interface OrderCompletedNotification extends BaseNotification {
  category: NotificationCategory.ORDER_COMPLETED;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    productImage?: string;
    amount: number;
    currency: string;
    completedAt: string;
    recipientType: 'buyer' | 'seller';
  };
}

export interface OrderCancelledNotification extends BaseNotification {
  category: NotificationCategory.ORDER_CANCELLED;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    productImage?: string;
    cancellationReason?: string;
    cancelledBy: 'buyer' | 'seller' | 'system';
    recipientType: 'buyer' | 'seller';
  };
}

export interface OrderRefundedNotification extends BaseNotification {
  category: NotificationCategory.ORDER_REFUNDED;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    productImage?: string;
    refundAmount: number;
    currency: string;
    refundReason?: string;
    recipientType: 'buyer' | 'seller';
  };
}

export interface OrderDisputedNotification extends BaseNotification {
  category: NotificationCategory.ORDER_DISPUTED;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    productImage?: string;
    disputeId: string;
    disputeReason: string;
    openedBy: 'buyer' | 'seller';
    recipientType: 'buyer' | 'seller';
  };
}

export interface PaymentReceivedNotification extends BaseNotification {
  category: NotificationCategory.PAYMENT_RECEIVED;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    productImage?: string;
    amount: number;
    currency: string;
    paymentMethod: 'crypto' | 'fiat' | 'escrow';
    transactionHash?: string;
    recipientType: 'buyer' | 'seller';
  };
}

export interface DeliveryConfirmedNotification extends BaseNotification {
  category: NotificationCategory.DELIVERY_CONFIRMED;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    productImage?: string;
    confirmedAt: string;
    buyerAddress: string;
    buyerHandle?: string;
    recipientType: 'buyer' | 'seller';
  };
}

export interface EscrowFundedNotification extends BaseNotification {
  category: NotificationCategory.ESCROW_FUNDED;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    escrowContractAddress: string;
    amount: number;
    currency: string;
    recipientType: 'buyer' | 'seller';
  };
}

export interface EscrowReleasedNotification extends BaseNotification {
  category: NotificationCategory.ESCROW_RELEASED;
  metadata: {
    orderId: string;
    orderNumber: string;
    productTitle: string;
    escrowContractAddress: string;
    amount: number;
    currency: string;
    releasedTo: string;
    transactionHash?: string;
    recipientType: 'buyer' | 'seller';
  };
}

export type RealTimeNotification =
  | MentionNotification
  | TipNotification
  | GovernanceNotification
  | CommunityNotification
  | ReactionNotification
  | UpvoteNotification
  | DownvoteNotification
  | RepostNotification
  | AwardNotification
  | BookmarkNotification
  | OrderCreatedNotification
  | OrderConfirmedNotification
  | OrderProcessingNotification
  | OrderShippedNotification
  | OrderDeliveredNotification
  | OrderCompletedNotification
  | OrderCancelledNotification
  | OrderRefundedNotification
  | OrderDisputedNotification
  | PaymentReceivedNotification
  | DeliveryConfirmedNotification
  | EscrowFundedNotification
  | EscrowReleasedNotification
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
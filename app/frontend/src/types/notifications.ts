export interface BaseNotification {
  id: string;
  userId: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export interface SocialNotification extends BaseNotification {
  type: 'follow' | 'like' | 'comment' | 'mention' | 'share';
  postId?: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
}

export interface CommunityNotification extends BaseNotification {
  type: 'community_post' | 'community_comment' | 'community_mention' | 'community_moderation' | 'community_join' | 'community_leave';
  communityId: string;
  communityName: string;
  postId?: string;
  fromUserId?: string;
  fromUserName?: string;
  moderationAction?: 'approved' | 'rejected' | 'removed' | 'pinned' | 'locked';
}

export interface Web3Notification extends BaseNotification {
  type: 'tip_received' | 'tip_sent' | 'governance_vote' | 'token_reward' | 'nft_received' | 'transaction_confirmed';
  transactionHash?: string;
  tokenAmount?: string;
  tokenSymbol?: string;
  nftContractAddress?: string;
  nftTokenId?: string;
  proposalId?: string;
}

export type Notification = SocialNotification | CommunityNotification | Web3Notification;

export interface NotificationPreferences {
  userId: string;
  email: {
    enabled: boolean;
    social: boolean;
    community: boolean;
    web3: boolean;
  };
  push: {
    enabled: boolean;
    social: boolean;
    community: boolean;
    web3: boolean;
  };
  inApp: {
    enabled: boolean;
    social: boolean;
    community: boolean;
    web3: boolean;
  };
  communitySpecific: {
    [communityId: string]: {
      newPosts: boolean;
      comments: boolean;
      mentions: boolean;
      moderation: boolean;
    };
  };
}

export interface NotificationFilter {
  type?: Notification['type'][];
  read?: boolean;
  communityId?: string;
  limit?: number;
  offset?: number;
}
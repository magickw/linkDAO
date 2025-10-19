export interface User {
  id: string;
  walletAddress: string;
  handle: string;
  avatarCid?: string;
  bio?: string;
  reputation: number;
  createdAt: Date;
}

export interface Community {
  id: string;
  name: string;
  displayName: string;
  description: string;
  rules?: string;
  memberCount: number;
  postCount: number;
  avatar?: string;
  banner?: string;
  category: string;
  tags?: string[];
  isPublic: boolean;
  moderators?: string[];
  treasuryAddress?: string;
  governanceToken?: string;
  settings?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  communityId: string;
  authorId: string;
  content: string;
  title?: string;
  tags?: string[];
  images?: string[]; // CID references
  likes: number;
  comments: number;
  shares: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId?: string; // For nested comments
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Proposal {
  id: string;
  communityId: string;
  title: string;
  description: string;
  proposerId: string;
  status: 'draft' | 'active' | 'passed' | 'rejected' | 'executed' | 'failed';
  voteCount: {
    yes: number;
    no: number;
    abstain: number;
  };
  endTime: Date;
  createdAt: Date;
  updatedAt: Date;
  proposalType: 'spending' | 'parameter' | 'grant' | 'membership' | 'custom';
  metadata?: any; // Additional data based on proposal type
}

export interface Vote {
  id: string;
  proposalId: string;
  userId: string;
  vote: 'yes' | 'no' | 'abstain';
  votingPower: number;
  reason?: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'post' | 'comment' | 'governance' | 'moderation' | 'role_change' | 'mention';
  isRead: boolean;
  actionUrl?: string;
  createdAt: Date;
}

export interface Wallet {
  address: string;
  balance: string; // In wei or smallest unit
  currency: string;
  tokens: TokenBalance[];
}

export interface TokenBalance {
  tokenId: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
}

export interface GovernanceSettings {
  votingPeriod: number; // in seconds
  quorum: number; // percentage
  proposalThreshold: number; // minimum tokens to propose
  timelockDelay: number; // in seconds
}

export interface CommunityEvent {
  id: string;
  communityId: string;
  title: string;
  description: string;
  eventType: 'meeting' | 'ama' | 'workshop' | 'competition' | 'other';
  startTime: Date;
  endTime?: Date;
  location?: string; // Could be physical address or virtual link
  isRecurring: boolean;
  recurrencePattern?: string; // cron expression or simple pattern
  maxAttendees?: number;
  currentAttendees: number;
  rsvpRequired: boolean;
  rsvpDeadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventRSVP {
  id: string;
  eventId: string;
  userId: string;
  status: 'confirmed' | 'maybe' | 'declined';
  attendeesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  posts: boolean;
  comments: boolean;
  governance: boolean;
  moderation: boolean;
  mentions: boolean;
  digestFrequency: 'never' | 'daily' | 'weekly';
  quietHours?: {
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}
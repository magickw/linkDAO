export interface UserReputation {
  totalScore: number;
  level: ReputationLevel;
  badges: Badge[];
  progress: ProgressMilestone[];
  breakdown: ReputationBreakdown;
  achievements: Achievement[];
}

export interface ReputationLevel {
  id: number;
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
  icon: string;
  privileges: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  earnedAt: Date;
  requirements: BadgeRequirement[];
  category: BadgeCategory;
}

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type BadgeCategory = 'posting' | 'governance' | 'community' | 'trading' | 'moderation' | 'special';

export interface BadgeRequirement {
  type: 'score' | 'action' | 'time' | 'community';
  value: number;
  description: string;
}

export interface ProgressMilestone {
  category: ReputationCategory;
  current: number;
  target: number;
  reward: string;
  progress: number;
  nextMilestone?: ProgressMilestone;
}

export type ReputationCategory = 'posting' | 'governance' | 'community' | 'trading' | 'moderation';

export interface ReputationBreakdown {
  posting: number;
  governance: number;
  community: number;
  trading: number;
  moderation: number;
  total: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  rarity: BadgeRarity;
  category: BadgeCategory;
  points: number;
}

export interface ReputationEvent {
  id: string;
  userId: string;
  type: ReputationEventType;
  category: ReputationCategory;
  points: number;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type ReputationEventType = 
  | 'post_created'
  | 'post_liked'
  | 'comment_created'
  | 'vote_cast'
  | 'proposal_created'
  | 'community_joined'
  | 'tip_received'
  | 'tip_given'
  | 'moderation_action'
  | 'achievement_unlocked';

export interface MiniProfileData {
  user: {
    id: string;
    hanndle: string;
    displayName: string;
    avatar: string;
    walletAddress: string;
    ensName?: string;
  };
  reputation: UserReputation;
  stats: {
    followers: number;
    following: number;
    posts: number;
    communities: number;
  };
  isFollowing: boolean;
  mutualConnections: number;
}

// Constants for reputation system
export const REPUTATION_LEVELS: ReputationLevel[] = [
  {
    id: 1,
    name: 'Newcomer',
    minScore: 0,
    maxScore: 99,
    color: '#94A3B8',
    icon: '🌱',
    privileges: ['basic_posting', 'basic_voting']
  },
  {
    id: 2,
    name: 'Contributor',
    minScore: 100,
    maxScore: 499,
    color: '#10B981',
    icon: '🌿',
    privileges: ['basic_posting', 'basic_voting', 'create_polls']
  },
  {
    id: 3,
    name: 'Active Member',
    minScore: 500,
    maxScore: 1499,
    color: '#3B82F6',
    icon: '⭐',
    privileges: ['basic_posting', 'basic_voting', 'create_polls', 'moderate_comments']
  },
  {
    id: 4,
    name: 'Trusted User',
    minScore: 1500,
    maxScore: 4999,
    color: '#8B5CF6',
    icon: '💎',
    privileges: ['basic_posting', 'basic_voting', 'create_polls', 'moderate_comments', 'create_proposals']
  },
  {
    id: 5,
    name: 'Community Leader',
    minScore: 5000,
    maxScore: 14999,
    color: '#F59E0B',
    icon: '👑',
    privileges: ['basic_posting', 'basic_voting', 'create_polls', 'moderate_comments', 'create_proposals', 'moderate_posts']
  },
  {
    id: 6,
    name: 'Legend',
    minScore: 15000,
    maxScore: Infinity,
    color: '#EF4444',
    icon: '🏆',
    privileges: ['basic_posting', 'basic_voting', 'create_polls', 'moderate_comments', 'create_proposals', 'moderate_posts', 'admin_actions']
  }
];

export const BADGE_DEFINITIONS: Omit<Badge, 'earnedAt'>[] = [
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined the platform in its early days',
    icon: '🚀',
    rarity: 'legendary',
    category: 'special',
    requirements: [
      { type: 'time', value: 1640995200000, description: 'Joined before 2022' }
    ]
  },
  {
    id: 'expert',
    name: 'Expert',
    description: 'Demonstrated expertise in their field',
    icon: '🎓',
    rarity: 'epic',
    category: 'posting',
    requirements: [
      { type: 'score', value: 1000, description: 'Reach 1000 posting reputation' }
    ]
  },
  {
    id: 'dao_member',
    name: 'DAO Member',
    description: 'Active participant in governance',
    icon: '🏛️',
    rarity: 'rare',
    category: 'governance',
    requirements: [
      { type: 'action', value: 10, description: 'Vote on 10 proposals' }
    ]
  },
  {
    id: 'community_leader',
    name: 'Community Leader',
    description: 'Leader of a thriving community',
    icon: '👥',
    rarity: 'epic',
    category: 'community',
    requirements: [
      { type: 'community', value: 100, description: 'Lead a community with 100+ members' }
    ]
  },
  {
    id: 'generous_tipper',
    name: 'Generous Tipper',
    description: 'Supports creators with tips',
    icon: '💰',
    rarity: 'rare',
    category: 'trading',
    requirements: [
      { type: 'action', value: 50, description: 'Give 50 tips to other users' }
    ]
  },
  {
    id: 'content_creator',
    name: 'Content Creator',
    description: 'Creates engaging content regularly',
    icon: '✍️',
    rarity: 'common',
    category: 'posting',
    requirements: [
      { type: 'action', value: 25, description: 'Create 25 posts' }
    ]
  },
  {
    id: 'helpful_moderator',
    name: 'Helpful Moderator',
    description: 'Keeps the community safe and clean',
    icon: '🛡️',
    rarity: 'epic',
    category: 'moderation',
    requirements: [
      { type: 'action', value: 100, description: 'Complete 100 moderation actions' }
    ]
  }
];
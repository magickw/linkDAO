/**
 * Reputation system types for backend services
 */

export interface UserReputation {
  userId: string;
  totalScore: number;
  level: number;
  levelName: string;
  breakdown: ReputationBreakdown;
  progress: ProgressMilestone[];
  badges: string[];
  achievements?: string[]; // List of achievement IDs or names
  rank?: number;
  percentile?: number;
}

export interface ReputationBreakdown {
  posting: number;
  governance: number;
  community: number;
  trading: number;
  moderation: number;
  total: number;
}

export interface ProgressMilestone {
  category: string;
  current: number;
  target: number;
  reward: string;
  progress: number;
}

export interface ReputationHistory {
  timestamp: Date;
  action: string;
  scoreChange: number;
  category: string;
  details?: string;
}

export interface ReputationLevel {
  level: number;
  name: string;
  minScore: number;
  maxScore: number;
  benefits: string[];
}

export const REPUTATION_LEVELS: ReputationLevel[] = [
  {
    level: 1,
    name: 'Newcomer',
    minScore: 0,
    maxScore: 99,
    benefits: ['Basic platform access']
  },
  {
    level: 2,
    name: 'Member',
    minScore: 100,
    maxScore: 499,
    benefits: ['Basic platform access', 'Create posts']
  },
  {
    level: 3,
    name: 'Contributor',
    minScore: 500,
    maxScore: 1499,
    benefits: ['Basic platform access', 'Create posts', 'Vote on proposals']
  },
  {
    level: 4,
    name: 'Trusted',
    minScore: 1500,
    maxScore: 4999,
    benefits: ['Basic platform access', 'Create posts', 'Vote on proposals', 'Create proposals']
  },
  {
    level: 5,
    name: 'Expert',
    minScore: 5000,
    maxScore: 9999,
    benefits: ['Basic platform access', 'Create posts', 'Vote on proposals', 'Create proposals', 'Moderate content']
  },
  {
    level: 6,
    name: 'Leader',
    minScore: 10000,
    maxScore: Infinity,
    benefits: ['All privileges', 'Platform governance']
  }
];

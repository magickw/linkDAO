/**
 * Governance proposal and voting data structures
 */

import { TokenInfo } from './web3Community';

export const ProposalStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PASSED: 'passed',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  EXECUTED: 'executed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;
export type ProposalStatus = typeof ProposalStatus[keyof typeof ProposalStatus];
export type VoteChoice = 'for' | 'against' | 'abstain';
export type ProposalType = 'parameter' | 'treasury' | 'upgrade' | 'general' | 'emergency';

export const ProposalCategory = {
  GOVERNANCE: 'governance',
  COMMUNITY: 'community',
  FUNDING: 'funding',
  TECHNICAL: 'technical',
  TREASURY: 'treasury',
} as const;
export type ProposalCategory = typeof ProposalCategory[keyof typeof ProposalCategory];

export interface Proposal {
  id: string;
  onChainId?: string;
  title: string;
  description: string;
  type: ProposalType;
  proposer: string;
  proposerENS?: string;
  proposerReputation?: number;
  communityId?: string;
  
  // Voting details
  status: ProposalStatus;
  votingPower?: VotingResults;
  quorumRequired?: number;
  passingThreshold?: number;
  
  // UI voting aggregates (used by widgets/services)
  forVotes: string;
  againstVotes: string;
  abstainVotes?: string;
  quorum: string;
  participationRate: number;
  canVote?: boolean;
  userVote?: VoteChoice | UserVote;
  
  // Timing
  createdAt?: Date;
  startTime: Date;
  endTime: Date;
  executionTime?: Date;
  executedAt?: Date;
  executionDelay?: number;
  requiredMajority?: number;
  
  // Blockchain data
  contractAddress?: string;
  transactionHash?: string;
  blockNumber?: number;
  
  // Additional metadata
  category?: ProposalCategory | string;
  tags?: string[];
  relatedProposals?: string[];
  discussionUrl?: string;
  documentationUrl?: string;
  
  // User interaction (legacy fields)
  userCanVote?: boolean;
  userVotingPower?: number;
}

export interface VotingResults {
  for: number;
  against: number;
  abstain: number;
  total: number;
  participationRate: number;
}

// Aggregate voting metrics for a proposal (used by services)
export interface VotingMetrics {
  totalVotingPower: string;
  participationRate: number;
  quorumReached: boolean;
  timeRemaining: number; // seconds
  userVotingPower: string;
  userHasVoted: boolean;
}

export interface UserVote {
  proposalId: string;
  choice: VoteChoice;
  votingPower: number;
  timestamp: Date;
  transactionHash?: string;
  blockNumber?: number;
  reason?: string;
  delegatedFrom?: string[];
}

export interface VotingPowerBreakdown {
  directHolding: number;
  delegatedPower: number;
  stakingBonus: number;
  reputationBonus: number;
  total: number;
  lastUpdated: Date;
}

export interface GovernanceData {
  activeProposals: Proposal[];
  recentProposals: Proposal[];
  userVotingPower: VotingPowerBreakdown;
  expiringVotes: ExpiringVote[];
  governanceToken?: TokenInfo;
  delegationStatus?: DelegationStatus;
  participationHistory?: ParticipationHistory;
}

export interface ExpiringVote {
  proposalId: string;
  proposalTitle: string;
  endTime: Date;
  timeRemaining: number;
  userHasVoted: boolean;
  userVotingPower: number;
  currentResults: VotingResults;
}

export interface DelegationStatus {
  isDelegating: boolean;
  delegateTo?: string;
  delegateToENS?: string;
  delegatedPower: number;
  delegatedFrom: DelegatedPower[];
  canDelegate: boolean;
}

export interface DelegatedPower {
  fromAddress: string;
  fromENS?: string;
  amount: number;
  delegatedAt: Date;
  canRevoke: boolean;
}

export interface ParticipationMetrics {
  currentParticipationRate: number; // %
  eligibleVoters: number;
  totalVoters: number;
  userVotingWeight: number;
  userVotingWeightPercentage: number; // %
  historicalParticipationRate: number; // %
  participationTrend: 'increasing' | 'decreasing' | 'stable';
  quorumProgress: number; // %
  averageParticipationRate: number; // %
}

export interface ParticipationHistory {
  totalProposalsVoted: number;
  totalProposalsCreated: number;
  participationRate: number;
  averageVotingPower: number;
  recentVotes: UserVote[];
  streak: number;
  lastParticipation: Date;
}

export interface GovernanceNotification {
  id: string;
  type: 'proposal_created' | 'proposal_ending' | 'vote_executed' | 'delegation_received' | 'quorum_reached';
  proposalId?: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionRequired: boolean;
  actionUrl?: string;
}

export interface CreateProposalRequest {
  title: string;
  description: string;
  type: ProposalType;
  executionData?: string;
  discussionUrl?: string;
  tags?: string[];
}

export interface VoteRequest {
  proposalId: string;
  choice: VoteChoice;
  reason?: string;
  gasLimit?: number;
  gasPrice?: number;
}

export interface DelegateRequest {
  delegateTo: string;
  amount?: number;
  gasLimit?: number;
  gasPrice?: number;
}
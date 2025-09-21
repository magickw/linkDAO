// Governance Widget Types
export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  proposerReputation?: number;
  communityId: string;
  startTime: Date;
  endTime: Date;
  forVotes: string;
  againstVotes: string;
  abstainVotes?: string;
  quorum: string;
  status: ProposalStatus;
  actions: ProposalAction[];
  category: ProposalCategory;
  executionDelay?: number;
  requiredMajority: number;
  participationRate: number;
  userVote?: VoteChoice;
  canVote: boolean;
}

export interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
  description?: string;
}

export enum ProposalStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACTIVE = 'active',
  SUCCEEDED = 'succeeded',
  DEFEATED = 'defeated',
  QUEUED = 'queued',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum ProposalCategory {
  GOVERNANCE = 'governance',
  FUNDING = 'funding',
  PARAMETER = 'parameter',
  UPGRADE = 'upgrade',
  COMMUNITY = 'community'
}

export enum VoteChoice {
  FOR = 'for',
  AGAINST = 'against',
  ABSTAIN = 'abstain'
}

export interface VotingMetrics {
  totalVotingPower: string;
  participationRate: number;
  quorumReached: boolean;
  timeRemaining: number; // in seconds
  userVotingPower: string;
  userHasVoted: boolean;
  userVoteChoice?: VoteChoice;
}

export interface ParticipationMetrics {
  currentParticipationRate: number;
  eligibleVoters: number;
  totalVoters: number;
  userVotingWeight: number;
  userVotingWeightPercentage: number;
  historicalParticipationRate?: number;
  participationTrend?: 'increasing' | 'decreasing' | 'stable';
  quorumProgress: number;
  averageParticipationRate: number;
}

export interface GovernanceWidgetProps {
  activeProposals: Proposal[];
  userVotingPower: number;
  participationRate: number;
  participationMetrics?: ParticipationMetrics;
  onVote: (proposalId: string, choice: VoteChoice) => Promise<void>;
  onViewProposal: (proposalId: string) => void;
  loading?: boolean;
  error?: string | null;
}

export interface GovernanceWidgetState {
  expandedProposal: string | null;
  votingInProgress: string | null;
  showAllProposals: boolean;
}

export interface ProposalCardProps {
  proposal: Proposal;
  userVotingPower: number;
  onVote: (proposalId: string, choice: VoteChoice) => Promise<void>;
  onViewDetails: (proposalId: string) => void;
  isExpanded: boolean;
  onToggleExpand: (proposalId: string) => void;
  votingInProgress: boolean;
}

export interface VotingButtonProps {
  proposal: Proposal;
  choice: VoteChoice;
  onVote: (proposalId: string, choice: VoteChoice) => Promise<void>;
  disabled: boolean;
  userVotingPower: number;
}

export interface ParticipationMetricsProps {
  proposal: Proposal;
  userVotingPower: number;
  participationMetrics?: ParticipationMetrics;
}
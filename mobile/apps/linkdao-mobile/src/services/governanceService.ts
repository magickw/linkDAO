/**
 * Governance Service
 * Handles DAO governance operations including proposals, voting, and delegation
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

// Types
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
  CHARITY: 'charity',
  PROTOCOL: 'protocol',
  OTHER: 'other',
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

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  address?: string;
  price?: number;
  balance?: string;
}

// AI Analysis Types
export interface AIProposalAnalysis {
  proposalId: string;
  analysis: string;
  recommendation: 'APPROVE' | 'REJECT' | 'NEUTRAL';
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  keyPoints: string[];
  potentialImpact: string;
}

// Charity Proposal Types
export interface CharityProposal {
  id: string;
  title: string;
  description: string;
  charityName: string;
  charityRecipient: string;
  donationAmount: string;
  charityDescription: string;
  proofOfVerification: string;
  impactMetrics: string;
  isVerifiedCharity: boolean;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  status: ProposalStatus;
  endTime: Date;
  proposer: string;
}

export interface CharityProposalData {
  title: string;
  description: string;
  charityName: string;
  charityAddress: string;
  donationAmount: string;
  charityDescription: string;
  proofOfVerification: string;
  impactMetrics: string;
}

export interface Delegation {
  id: string;
  delegator: string;
  delegate: string;
  votingPower: number;
  createdAt: Date;
  isRevocable: boolean;
  expiryDate?: Date;
}

export interface TreasuryData {
  totalValue: number;
  currency: string;
  tokens: Array<{
    symbol: string;
    balance: number;
    value: number;
    contractAddress?: string;
  }>;
  lastUpdated: Date;
}

class GovernanceService {
  private baseUrl = `${ENV.BACKEND_URL}/api/governance`;

  /**
   * Get all active proposals
   */
  async getActiveProposals(): Promise<Proposal[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/proposals/active`);
      return this.transformProposals(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching active proposals:', error);
      return [];
    }
  }

  /**
   * Search proposals by title or description
   */
  async searchProposals(query: string): Promise<Proposal[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/proposals/search`, {
        params: { q: query }
      });
      return this.transformProposals(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error searching proposals:', error);
      return [];
    }
  }

  /**
   * Get all proposals (including ended)
   */
  async getAllProposals(status?: string): Promise<Proposal[]> {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get(`${this.baseUrl}/proposals`, { params });
      return this.transformProposals(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching all proposals:', error);
      return [];
    }
  }

  /**
   * Get a specific proposal by ID
   */
  async getProposal(proposalId: string): Promise<Proposal | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/proposals/${proposalId}`);
      const data = response.data.data || response.data;
      return this.transformProposal(data);
    } catch (error) {
      console.error('Error fetching proposal:', error);
      return null;
    }
  }

  /**
   * Get proposals for a specific community/DAO
   */
  async getCommunityProposals(communityId: string): Promise<Proposal[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/dao/${communityId}/proposals`);
      return this.transformProposals(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching community proposals:', error);
      return [];
    }
  }

  /**
   * Create a new governance proposal
   */
  async createProposal(proposalData: {
    title: string;
    description: string;
    category?: string;
    votingDuration?: number;
    executionDelay?: number;
    requiredMajority?: number;
    daoId?: string;
  }): Promise<Proposal | null> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/proposals`, proposalData);
      const data = response.data.data || response.data;
      return this.transformProposal(data);
    } catch (error) {
      console.error('Error creating proposal:', error);
      return null;
    }
  }

  /**
   * Vote on a proposal
   */
  async vote(proposalId: string, support: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/proposals/${proposalId}/vote`, {
        support,
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error voting:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to vote',
      };
    }
  }

  /**
   * Get voting metrics for a proposal
   */
  async getVotingMetrics(proposalId: string): Promise<VotingMetrics | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/proposals/${proposalId}/metrics`);
      const data = response.data.data || response.data;
      return {
        totalVotingPower: data.totalVotingPower || 0,
        votesFor: data.votesFor || 0,
        votesAgainst: data.votesAgainst || 0,
        votesAbstain: data.votesAbstain || 0,
        participationRate: data.participationRate || 0,
        quorumReached: data.quorumReached || false,
        hasVoted: data.hasVoted || false,
        userVotingPower: data.userVotingPower || 0,
      };
    } catch (error) {
      console.error('Error fetching voting metrics:', error);
      return null;
    }
  }

  /**
   * Delegate voting power to another user
   */
  async delegateVotingPower(
    delegateAddress: string,
    votingPower: number,
    daoId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/delegate`, {
        delegateAddress,
        votingPower,
        daoId,
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error delegating voting power:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to delegate',
      };
    }
  }

  /**
   * Get user's delegations
   */
  async getDelegations(): Promise<Delegation[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/delegations`);
      return this.transformDelegations(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching delegations:', error);
      return [];
    }
  }

  /**
   * Revoke a delegation
   */
  async revokeDelegation(delegationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/delegations/${delegationId}/revoke`);
      return { success: true };
    } catch (error: any) {
      console.error('Error revoking delegation:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to revoke delegation',
      };
    }
  }

  /**
   * Get DAO treasury data
   */
  async getTreasuryData(daoId: string): Promise<TreasuryData | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/dao/${daoId}/treasury`);
      const data = response.data.data || response.data;
      return {
        totalValue: data.totalValue || 0,
        currency: data.currency || 'USD',
        tokens: data.tokens || [],
        lastUpdated: new Date(data.lastUpdated || Date.now()),
      };
    } catch (error) {
      console.error('Error fetching treasury data:', error);
      return null;
    }
  }

  /**
   * Get user's voting power
   */
  async getUserVotingPower(daoId?: string): Promise<number> {
    try {
      const url = daoId ? `${this.baseUrl}/dao/${daoId}/voting-power` : `${this.baseUrl}/voting-power`;
      const response = await apiClient.get(url);
      return response.data.data?.votingPower || response.data.votingPower || 0;
    } catch (error) {
      console.error('Error fetching voting power:', error);
      return 0;
    }
  }

  /**
   * Get detailed voting power breakdown for user
   */
  async getVotingPowerBreakdown(userAddress: string, daoId?: string): Promise<VotingPowerBreakdown | null> {
    try {
      const url = daoId 
        ? `${this.baseUrl}/dao/${daoId}/users/${userAddress}/voting-power-breakdown`
        : `${this.baseUrl}/users/${userAddress}/voting-power-breakdown`;
      
      const response = await apiClient.get(url);
      const data = response.data.data || response.data;
      
      return {
        directHolding: data.directHolding || 0,
        delegatedPower: data.delegatedPower || 0,
        stakingBonus: data.stakingBonus || 0,
        reputationBonus: data.reputationBonus || 0,
        total: data.total || 0,
        lastUpdated: new Date(data.lastUpdated || Date.now()),
      };
    } catch (error) {
      console.error('Error fetching voting power breakdown:', error);
      return null;
    }
  }

  /**
   * Get participation metrics for a community
   */
  async getParticipationMetrics(communityId: string, userAddress?: string): Promise<ParticipationMetrics | null> {
    try {
      const url = `${this.baseUrl}/dao/${communityId}/participation-metrics${userAddress ? `?userAddress=${userAddress}` : ''}`;
      const response = await apiClient.get(url);
      const data = response.data.data || response.data;
      
      return {
        currentParticipationRate: data.currentParticipationRate || 0,
        eligibleVoters: data.eligibleVoters || 0,
        totalVoters: data.totalVoters || 0,
        userVotingWeight: data.userVotingWeight || 0,
        userVotingWeightPercentage: data.userVotingWeightPercentage || 0,
        historicalParticipationRate: data.historicalParticipationRate || 0,
        participationTrend: data.participationTrend || 'stable',
        quorumProgress: data.quorumProgress || 0,
        averageParticipationRate: data.averageParticipationRate || 0,
      };
    } catch (error) {
      console.error('Error fetching participation metrics:', error);
      return null;
    }
  }

  /**
   * Get historical participation data for a community
   */
  async getHistoricalParticipation(
    communityId: string, 
    timeframe: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<{
    periods: Array<{
      period: string;
      participationRate: number;
      totalProposals: number;
      avgVotingPower: number;
    }>;
    trend: 'increasing' | 'decreasing' | 'stable';
  } | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/dao/${communityId}/historical-participation?timeframe=${timeframe}`);
      const data = response.data.data || response.data;
      return data;
    } catch (error) {
      console.error('Error fetching historical participation:', error);
      return null;
    }
  }

  /**
   * Get user's voting weight as percentage of total voting power
   */
  async getUserVotingWeight(communityId: string, userAddress: string): Promise<{
    votingPower: number;
    percentage: number;
    rank: number;
    totalVoters: number;
  } | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/dao/${communityId}/users/${userAddress}/voting-weight`);
      const data = response.data.data || response.data;
      return data;
    } catch (error) {
      console.error('Error getting voting weight:', error);
      return null;
    }
  }

  /**
   * Get user's voting history
   */
  async getUserVotingHistory(userId: string, daoId?: string): Promise<Array<{
    proposalId: string;
    proposalTitle: string;
    voteChoice: string;
    votingPower: number;
    createdAt: Date;
  }>> {
    try {
      const url = `${this.baseUrl}/users/${userId}/voting-history${daoId ? `?daoId=${daoId}` : ''}`;
      const response = await apiClient.get(url);
      const data = response.data.data || response.data || [];
      
      return data.map((vote: any) => ({
        ...vote,
        createdAt: new Date(vote.createdAt),
      }));
    } catch (error) {
      console.error('Error fetching voting history:', error);
      return [];
    }
  }

  /**
   * Get expiring votes for user
   */
  async getExpiringVotes(userAddress: string): Promise<ExpiringVote[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/users/${userAddress}/expiring-votes`);
      const data = response.data.data || response.data || [];
      
      return data.map((vote: any) => ({
        ...vote,
        endTime: new Date(vote.endTime),
      }));
    } catch (error) {
      console.error('Error fetching expiring votes:', error);
      return [];
    }
  }

  /**
   * Analyze proposal with AI (mock implementation)
   */
  async analyzeProposal(proposal: Proposal): Promise<AIProposalAnalysis | null> {
    try {
      // Mock AI analysis - in production, this would call an AI service
      const mockAnalysis: AIProposalAnalysis = {
        proposalId: proposal.id,
        analysis: `This proposal ${proposal.title} aims to ${proposal.description.substring(0, 100)}... The proposal appears to be well-structured with clear objectives.`,
        recommendation: Math.random() > 0.3 ? 'APPROVE' : Math.random() > 0.5 ? 'REJECT' : 'NEUTRAL',
        confidence: Math.floor(Math.random() * 30) + 70,
        riskLevel: proposal.category === 'treasury' ? 'medium' : 'low',
        keyPoints: [
          'Clear proposal objectives',
          'Reasonable voting duration',
          'Adequate quorum requirements',
        ],
        potentialImpact: proposal.category === 'treasury' ? 'High financial impact' : 'Moderate community impact',
      };
      return mockAnalysis;
    } catch (error) {
      console.error('Error analyzing proposal:', error);
      return null;
    }
  }

  /**
   * Get governance data summary
   */
  async getGovernanceData(userAddress: string, communityId?: string): Promise<GovernanceData | null> {
    try {
      const [activeProposals, votingPower, expiringVotes] = await Promise.all([
        this.getActiveProposals(),
        this.getVotingPowerBreakdown(userAddress, communityId),
        this.getExpiringVotes(userAddress),
      ]);

      return {
        activeProposals,
        recentProposals: activeProposals.slice(0, 5),
        userVotingPower: votingPower || {
          directHolding: 0,
          delegatedPower: 0,
          stakingBonus: 0,
          reputationBonus: 0,
          total: 0,
          lastUpdated: new Date(),
        },
        expiringVotes,
      };
    } catch (error) {
      console.error('Error fetching governance data:', error);
      return null;
    }
  }

  // Helper methods to transform API responses
  private transformProposals(data: any[]): Proposal[] {
    return data.map((item) => this.transformProposal(item)).filter(Boolean) as Proposal[];
  }

  private transformProposal(data: any): Proposal {
    // Handle web app data format
    const forVotes = data.votingPower?.for || data.forVotes || data.yesVotes || 0;
    const againstVotes = data.votingPower?.against || data.againstVotes || data.noVotes || 0;
    const abstainVotes = data.votingPower?.abstain || data.abstainVotes || 0;

    return {
      id: data.id || data.proposalId || data.onChainId || '',
      onChainId: data.onChainId || data.proposalId || data.id,
      title: data.title || data.description?.substring(0, 100) || '',
      description: data.description || '',
      type: data.type || 'general',
      proposer: data.proposer || data.proposerAddress || '',
      proposerENS: data.proposerENS,
      proposerReputation: data.proposerReputation,
      communityId: data.communityId || data.daoId,
      status: this.mapStatus(data.status),
      votingPower: {
        for: forVotes,
        against: againstVotes,
        abstain: abstainVotes,
        total: forVotes + againstVotes + abstainVotes,
        participationRate: data.participationRate || 0,
      },
      forVotes: forVotes.toString(),
      againstVotes: againstVotes.toString(),
      abstainVotes: abstainVotes.toString(),
      quorum: data.quorum?.toString() || data.quorumRequired?.toString() || '1000',
      participationRate: data.participationRate || 75,
      canVote: data.canVote !== false,
      userVote: data.userVote,
      startTime: new Date(data.startTime || data.votingStarts || data.createdAt || Date.now()),
      endTime: new Date(data.endTime || data.votingEnds || data.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      executionTime: data.executionTime ? new Date(data.executionTime) : undefined,
      executedAt: data.executedAt ? new Date(data.executedAt) : undefined,
      executionDelay: data.executionDelay || 2 * 24 * 60 * 60 * 1000,
      requiredMajority: data.requiredMajority || data.passingThreshold || 51,
      contractAddress: data.contractAddress,
      transactionHash: data.transactionHash,
      blockNumber: data.blockNumber,
      category: this.mapCategory(data.category),
      tags: data.tags,
      relatedProposals: data.relatedProposals,
      discussionUrl: data.discussionUrl,
      documentationUrl: data.documentationUrl,
      userCanVote: data.userCanVote,
      userVotingPower: data.userVotingPower,
    };
  }

  private mapStatus(status: string): ProposalStatus {
    if (!status) return ProposalStatus.DRAFT;
    
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'draft':
      case 'pending':
        return ProposalStatus.DRAFT;
      case 'active':
        return ProposalStatus.ACTIVE;
      case 'passed':
      case 'succeeded':
        return ProposalStatus.SUCCEEDED;
      case 'failed':
      case 'rejected':
        return ProposalStatus.FAILED;
      case 'executed':
        return ProposalStatus.EXECUTED;
      case 'cancelled':
        return ProposalStatus.CANCELLED;
      case 'expired':
        return ProposalStatus.EXPIRED;
      default:
        return ProposalStatus.DRAFT;
    }
  }

  private mapCategory(category: string): ProposalCategory | string {
    if (!category) return ProposalCategory.GOVERNANCE;
    
    const categoryLower = category.toLowerCase();
    switch (categoryLower) {
      case 'governance':
      case 'protocol':
        return ProposalCategory.GOVERNANCE;
      case 'community':
        return ProposalCategory.COMMUNITY;
      case 'funding':
      case 'treasury':
        return ProposalCategory.FUNDING;
      case 'technical':
        return ProposalCategory.TECHNICAL;
      case 'charity':
        return ProposalCategory.CHARITY;
      default:
        return category;
    }
  }

  private transformDelegations(data: any[]): Delegation[] {
    return data.map((item) => ({
      id: item.id || '',
      delegator: item.delegator || item.delegatorAddress || '',
      delegate: item.delegate || item.delegateAddress || '',
      votingPower: item.votingPower || 0,
      createdAt: new Date(item.createdAt || Date.now()),
      isRevocable: item.isRevocable !== false,
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
    }));
  }

  }

export const governanceService = new GovernanceService();
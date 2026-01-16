/**
 * Governance Service
 * Handles DAO governance operations including proposals, voting, and delegation
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

// Types
export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: 'active' | 'pending' | 'executed' | 'rejected' | 'expired';
  category: 'protocol' | 'treasury' | 'community' | 'charity' | 'other';
  votingPower: {
    for: number;
    against: number;
    abstain: number;
  };
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  votingDuration: number;
  requiredMajority: number;
  executionDelay: number;
  daoId?: string;
  transactionHash?: string;
}

export interface VoteChoice {
  proposalId: string;
  support: boolean; // true = for, false = against
  votingPower: number;
  voter: string;
  timestamp: Date;
}

export interface VotingMetrics {
  totalVotingPower: number;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  participationRate: number;
  quorumReached: boolean;
  hasVoted: boolean;
  userVotingPower: number;
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
      return this.getMockProposals();
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
      return this.getMockProposals();
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

  // Helper methods to transform API responses
  private transformProposals(data: any[]): Proposal[] {
    return data.map((item) => this.transformProposal(item)).filter(Boolean) as Proposal[];
  }

  private transformProposal(data: any): Proposal {
    return {
      id: data.id || data.proposalId || '',
      title: data.title || data.description?.substring(0, 100) || '',
      description: data.description || '',
      proposer: data.proposer || data.proposerAddress || '',
      status: data.status || 'pending',
      category: data.category || 'other',
      votingPower: {
        for: data.votingPower?.for || data.forVotes || 0,
        against: data.votingPower?.against || data.againstVotes || 0,
        abstain: data.votingPower?.abstain || data.abstainVotes || 0,
      },
      startTime: new Date(data.startTime || data.createdAt || Date.now()),
      endTime: new Date(data.endTime || data.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(data.createdAt || Date.now()),
      votingDuration: data.votingDuration || 7 * 24 * 60 * 60 * 1000,
      requiredMajority: data.requiredMajority || 51,
      executionDelay: data.executionDelay || 2 * 24 * 60 * 60 * 1000,
      daoId: data.daoId || data.communityId,
      transactionHash: data.transactionHash,
    };
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

  // Mock data for development
  private getMockProposals(): Proposal[] {
    return [
      {
        id: '1',
        title: 'Increase Community Fund Allocation',
        description: 'Proposal to increase the community fund allocation from 10% to 15% of protocol revenue to support more community initiatives and grants.',
        proposer: '0x1234...5678',
        status: 'active',
        category: 'treasury',
        votingPower: { for: 45000, against: 12000, abstain: 3000 },
        startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        votingDuration: 7 * 24 * 60 * 60 * 1000,
        requiredMajority: 51,
        executionDelay: 2 * 24 * 60 * 60 * 1000,
      },
      {
        id: '2',
        title: 'Implement New Governance Token',
        description: 'Proposal to implement a new governance token with enhanced voting rights and staking capabilities.',
        proposer: '0x8765...4321',
        status: 'active',
        category: 'protocol',
        votingPower: { for: 32000, against: 8000, abstain: 5000 },
        startTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        votingDuration: 7 * 24 * 60 * 60 * 1000,
        requiredMajority: 60,
        executionDelay: 2 * 24 * 60 * 60 * 1000,
      },
      {
        id: '3',
        title: 'Charity Grant for Education Initiative',
        description: 'Proposal to allocate 50,000 LDAO tokens to support blockchain education programs in developing countries.',
        proposer: '0x9876...1234',
        status: 'pending',
        category: 'charity',
        votingPower: { for: 15000, against: 2000, abstain: 1000 },
        startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        votingDuration: 7 * 24 * 60 * 60 * 1000,
        requiredMajority: 51,
        executionDelay: 2 * 24 * 60 * 60 * 1000,
      },
    ];
  }
}

export const governanceService = new GovernanceService();
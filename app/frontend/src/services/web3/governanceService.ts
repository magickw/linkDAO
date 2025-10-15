/**
 * Governance service for Web3 integration
 */

import { 
  Proposal, 
  GovernanceData, 
  UserVote, 
  VoteRequest, 
  CreateProposalRequest,
  DelegateRequest,
  VotingPowerBreakdown 
} from '../../types/governance';
import { web3ErrorHandler } from '../../utils/web3ErrorHandling';

export class GovernanceService {
  private static instance: GovernanceService;
  private proposalCache: Map<string, Proposal> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  static getInstance(): GovernanceService {
    if (!GovernanceService.instance) {
      GovernanceService.instance = new GovernanceService();
    }
    return GovernanceService.instance;
  }

  async getGovernanceData(communityId: string, userAddress?: string): Promise<GovernanceData> {
    try {
      const [activeProposals, recentProposals, votingPower] = await Promise.all([
        this.getActiveProposals(communityId),
        this.getRecentProposals(communityId),
        userAddress ? this.getUserVotingPower(userAddress, communityId) : this.getDefaultVotingPower()
      ]);

      return {
        activeProposals,
        recentProposals,
        userVotingPower: votingPower,
        expiringVotes: await this.getExpiringVotes(userAddress, communityId),
        governanceToken: await this.getGovernanceToken(communityId),
        delegationStatus: userAddress ? await this.getDelegationStatus(userAddress, communityId) : undefined,
        participationHistory: userAddress ? await this.getParticipationHistory(userAddress, communityId) : undefined
      };
    } catch (error) {
      web3ErrorHandler.handleError(error as Error, {
        action: 'getGovernanceData',
        component: 'GovernanceService'
      });
      
      return this.getEmptyGovernanceData();
    }
  }

  async getActiveProposals(communityId: string): Promise<Proposal[]> {
    try {
      // This would fetch from governance contracts or indexer
      return [];
    } catch (error) {
      web3ErrorHandler.handleError(error as Error, {
        action: 'getActiveProposals',
        component: 'GovernanceService'
      });
      return [];
    }
  }

  async getRecentProposals(communityId: string, limit: number = 10): Promise<Proposal[]> {
    try {
      // This would fetch recent proposals from contracts or indexer
      return [];
    } catch (error) {
      web3ErrorHandler.handleError(error as Error, {
        action: 'getRecentProposals',
        component: 'GovernanceService'
      });
      return [];
    }
  }

  async getProposal(proposalId: string): Promise<Proposal | null> {
    try {
      // Check cache first
      const cached = this.proposalCache.get(proposalId);
      if (cached) {
        return cached;
      }

      // This would fetch from governance contract
      const proposal: Proposal | null = null; // Mock for now
      
      if (proposal) {
        this.proposalCache.set(proposalId, proposal);
      }

      return proposal;
    } catch (error) {
      web3ErrorHandler.handleError(error as Error, {
        action: 'getProposal',
        component: 'GovernanceService'
      });
      return null;
    }
  }

  async getUserVotingPower(userAddress: string, communityId: string): Promise<VotingPowerBreakdown> {
    try {
      // This would calculate voting power from various sources
      return {
        directHolding: 0,
        delegatedPower: 0,
        stakingBonus: 0,
        reputationBonus: 0,
        total: 0,
        lastUpdated: new Date()
      };
    } catch (error) {
      web3ErrorHandler.handleError(error as Error, {
        action: 'getUserVotingPower',
        component: 'GovernanceService'
      });
      return this.getDefaultVotingPower();
    }
  }

  private getDefaultVotingPower(): VotingPowerBreakdown {
    return {
      directHolding: 0,
      delegatedPower: 0,
      stakingBonus: 0,
      reputationBonus: 0,
      total: 0,
      lastUpdated: new Date()
    };
  }

  async estimateVoteGas(
    proposalId: string,
    choice: 'for' | 'against' | 'abstain',
    votingPower?: number
  ): Promise<string> {
    // In real implementation, query provider/contract for gas estimate.
    // Here we provide a simple mock based on voting power.
    const baseGwei = 120_000; // base units
    const extra = Math.min(Math.floor((votingPower || 0) / 1000) * 10_000, 100_000);
    const total = baseGwei + extra; // pseudo gas units
    // Return a human-friendly string. In real code convert via gasPrice.
    return `~${(total / 1_000_000).toFixed(3)} ETH`;
  }

  async submitVote(
    proposalId: string,
    choice: 'for' | 'against' | 'abstain',
    votingPower?: number
  ): Promise<{ transactionHash: string }> {
    const txHash = await this.vote({ proposalId, choice });
    return { transactionHash: txHash };
  }

  async vote(voteRequest: VoteRequest): Promise<string> {
    try {
      // This would interact with governance contract
      const txHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      // Clear proposal cache to force refresh
      this.proposalCache.delete(voteRequest.proposalId);
      
      return txHash;
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'vote',
        component: 'GovernanceService'
      });
      throw new Error(errorResponse.message);
    }
  }

  async createProposal(request: CreateProposalRequest, communityId: string): Promise<string> {
    try {
      // This would interact with governance contract
      const txHash = '0x' + Math.random().toString(16).substr(2, 64);
      return txHash;
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'createProposal',
        component: 'GovernanceService'
      });
      throw new Error(errorResponse.message);
    }
  }

  async delegate(request: DelegateRequest, communityId: string): Promise<string> {
    try {
      // This would interact with governance contract
      const txHash = '0x' + Math.random().toString(16).substr(2, 64);
      return txHash;
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'delegate',
        component: 'GovernanceService'
      });
      throw new Error(errorResponse.message);
    }
  }

  private async getExpiringVotes(userAddress?: string, communityId?: string) {
    // This would fetch votes that are expiring soon
    return [];
  }

  private async getGovernanceToken(communityId: string) {
    // This would fetch governance token info
    return undefined;
  }

  private async getDelegationStatus(userAddress: string, communityId: string) {
    // This would fetch delegation status
    return undefined;
  }

  private async getParticipationHistory(userAddress: string, communityId: string) {
    // This would fetch participation history
    return undefined;
  }

  private getEmptyGovernanceData(): GovernanceData {
    return {
      activeProposals: [],
      recentProposals: [],
      userVotingPower: this.getDefaultVotingPower(),
      expiringVotes: []
    };
  }

  clearCache(): void {
    this.proposalCache.clear();
  }
}

export const governanceService = GovernanceService.getInstance();
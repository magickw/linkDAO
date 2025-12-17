import {
  Proposal,
  ProposalStatus,
  ProposalCategory,
  VoteChoice,
  VotingMetrics,
  ParticipationMetrics
} from '../types/governance';
import { communityWeb3Service, CommunityGovernanceProposal } from './communityWeb3Service';
import { ethers } from 'ethers';
import { ENV_CONFIG } from '@/config/environment';
import { enhancedAuthService } from './enhancedAuthService';
import { csrfService } from './csrfService';

// Safe JSON helper to avoid crashing on non-JSON API responses
async function safeJson(response: Response): Promise<any | null> {
  try {
    // Prefer checking content-type when available
    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

// Governance Contract ABI (from CONTRACT_ADDRESSES_ABIS.md)
const GOVERNANCE_ABI = [
  {
    "type": "function",
    "name": "proposalCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getProposal",
    "inputs": [{ "name": "proposalId", "type": "uint256" }],
    "outputs": [
      { "name": "proposer", "type": "address" },
      { "name": "description", "type": "string" },
      { "name": "forVotes", "type": "uint256" },
      { "name": "againstVotes", "type": "uint256" },
      { "name": "executed", "type": "bool" },
      { "name": "category", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "vote",
    "inputs": [
      { "name": "proposalId", "type": "uint256" },
      { "name": "support", "type": "bool" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createProposal",
    "inputs": [
      { "name": "description", "type": "string" },
      { "name": "category", "type": "uint256" },
      { "name": "data", "type": "bytes" }
    ],
    "outputs": [{ "name": "proposalId", "type": "uint256" }],
    "stateMutability": "nonpayable"
  }
];

export class GovernanceService {
  private baseUrl = `${ENV_CONFIG.BACKEND_URL}/api`;
  private governanceAddress = process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS || '0x27a78A860445DFFD9073aFd7065dd421487c0F8A';
  private contract: ethers.Contract | null = null;
  private provider: ethers.Provider | null = null;

  /**
   * Initialize Web3 contract connection
   */
  private async initializeContract(): Promise<void> {
    if (this.contract) return;

    try {
      // Try to use window.ethereum if available
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        this.provider = provider;
        this.contract = new ethers.Contract(this.governanceAddress, GOVERNANCE_ABI, provider);
      } else {
        // Fallback to JSON-RPC provider
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.drpc.org';
            try {
              this.provider = new ethers.JsonRpcProvider(rpcUrl, 11155111);
            } catch (error) {
              console.warn('Failed to initialize governance provider:', error);
              this.provider = null;
            }        this.contract = new ethers.Contract(this.governanceAddress, GOVERNANCE_ABI, this.provider);
      }
    } catch (error) {
      console.error('Failed to initialize governance contract:', error);
    }
  }

  /**
   * Get proposal count from contract
   */
  async getProposalCount(): Promise<number> {
    try {
      await this.initializeContract();
      if (!this.contract) return 0;

      const count = await this.contract.proposalCount();
      return count.toNumber();
    } catch (error) {
      console.error('Error getting proposal count:', error);
      return 0;
    }
  }

  /**
   * Get governance proposals for a community
   */
  async getCommunityProposals(communityId: string): Promise<Proposal[]> {
    try {
      // First try to get from blockchain
      await this.initializeContract();
      if (this.contract) {
        try {
          const proposalCount = await this.getProposalCount();
          const proposals: Proposal[] = [];

          // Fetch each proposal from the contract
          for (let i = 0; i < proposalCount; i++) {
            try {
              const proposal = await this.contract.getProposal(i);
              proposals.push(this.transformContractProposal(i, proposal, communityId));
            } catch (err) {
              console.warn(`Failed to fetch proposal ${i}:`, err);
            }
          }

          if (proposals.length > 0) {
            return proposals;
          }
        } catch (contractError) {
          console.warn('Contract fetch failed, trying backend:', contractError);
        }
      }

      // Try backend API
      const response = await fetch(`${this.baseUrl}/governance/dao/${communityId}/proposals`);
      if (response.ok) {
        const data = await safeJson(response);
        if (data) {
          const payload = Array.isArray(data) ? data : (data?.data || data?.results || data?.proposals || []);
          if (Array.isArray(payload)) {
            return this.transformBackendProposals(payload);
          }
        }
      }

      // Fallback to Web3 service for real data
      const web3Proposals = await communityWeb3Service.getCommunityProposals(communityId);
      return this.transformWeb3Proposals(web3Proposals);
    } catch (error) {
      console.error('Error fetching community proposals:', error);

      // Return mock data for development
      return this.getMockProposals(communityId);
    }
  }

  /**
   * Get all active proposals across all communities
   */
  async getAllActiveProposals(): Promise<Proposal[]> {
    try {
      const response = await fetch(`${this.baseUrl}/governance/proposals/active`);
      if (!response.ok) {
        return this.getMockProposals('all');
      }
      const json = await safeJson(response);
      if (!json) {
        return this.getMockProposals('all');
      }
      const payload = Array.isArray(json) ? json : (json?.data || json?.results || json?.proposals || []);
      if (!Array.isArray(payload)) {
        return this.getMockProposals('all');
      }
      return this.transformBackendProposals(payload);
    } catch (error) {
      console.error('Error fetching active proposals:', error);
      return this.getMockProposals('all');
    }
  }

  /**
   * Get a specific proposal by ID
   */
  async getProposal(proposalId: string): Promise<Proposal | null> {
    try {
      const response = await fetch(`${this.baseUrl}/governance/proposals/${proposalId}`);
      if (!response.ok) return null;
      const data = await safeJson(response);
      if (!data) return null;
      const payload = data?.data || data?.proposal || data;
      return this.transformBackendProposal(payload);
    } catch (error) {
      console.error('Error fetching proposal:', error);
      return null;
    }
  }

  /**
   * Create a new governance proposal
   */
  async createProposal(proposalData: {
    title: string;
    description: string;
    daoId?: string;
    proposerId: string;
    votingDuration?: number;
    category?: string;
    executionDelay?: number;
    requiredMajority?: number;
  }): Promise<Proposal | null> {
    try {
      // Get authentication headers including CSRF token
      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/governance/proposals`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(proposalData)
      });

      if (response.ok) {
        const data = await response.json();
        return this.transformBackendProposal(data);
      }

      return null;
    } catch (error) {
      console.error('Error creating proposal:', error);
      return null;
    }
  }

  /**
   * Get DAO treasury data
   */
  async getDAOTreasuryData(daoId: string): Promise<{
    totalValue: number;
    currency: string;
    tokens: Array<{
      symbol: string;
      balance: number;
      value: number;
      contractAddress?: string;
    }>;
    nfts?: Array<{
      collection: string;
      count: number;
      estimatedValue: number;
    }>;
    lastUpdated: Date;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/governance/dao/${daoId}/treasury`);

      if (response.ok) {
        const json = await safeJson(response);
        if (json) {
          const data = json?.data || json;
          return {
            ...data,
            lastUpdated: new Date(data.lastUpdated)
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching treasury data:', error);
      return null;
    }
  }

  /**
   * Get user's voting power for a DAO
   */
  async getDAOVotingPower(daoId: string, userId: string): Promise<{
    votingPower: number;
    delegatedPower?: number;
    totalPower: number;
    tokenBalance: number;
    stakingMultiplier?: number;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/governance/dao/${daoId}/users/${userId}/voting-power`);

      if (response.ok) {
        const data = await response.json();
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching voting power:', error);
      return null;
    }
  }

  /**
   * Delegate voting power to another user
   */
  async delegateVotingPower(
    delegatorId: string,
    delegateId: string,
    daoId: string,
    votingPower: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get authentication headers including CSRF token
      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/governance/delegate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          delegatorId,
          delegateId,
          daoId,
          votingPower
        })
      });

      if (response.ok) {
        return { success: true };
      }

      const errorData = await response.json();
      return { success: false, error: errorData.error };
    } catch (error) {
      console.error('Error delegating voting power:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Revoke voting power delegation
   */
  async revokeDelegation(
    delegatorId: string,
    delegateId: string,
    daoId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get authentication headers including CSRF token
      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/governance/revoke-delegation`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          delegatorId,
          delegateId,
          daoId
        })
      });

      if (response.ok) {
        return { success: true };
      }

      const errorData = await response.json();
      return { success: false, error: errorData.error };
    } catch (error) {
      console.error('Error revoking delegation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
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
      const url = `${this.baseUrl}/governance/users/${userId}/voting-history${daoId ? `?daoId=${daoId}` : ''}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        return data.map((vote: any) => ({
          ...vote,
          createdAt: new Date(vote.createdAt)
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching voting history:', error);
      return [];
    }
  }

  /**
   * Get active governance proposals for a community
   */
  async getActiveProposals(communityId: string): Promise<Proposal[]> {
    const allProposals = await this.getCommunityProposals(communityId);
    return allProposals.filter(proposal => proposal.status === ProposalStatus.ACTIVE);
  }

  /**
   * Vote on a proposal
   */
  async voteOnProposal(
    proposalId: string,
    support: boolean
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      // Try to vote via smart contract
      await this.initializeContract();
      if (this.contract && typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const contractWithSigner = this.contract.connect(signer) as any;

        const tx = await contractWithSigner.vote(parseInt(proposalId), support);
        const receipt = await tx.wait();

        return {
          success: true,
          transactionHash: receipt.transactionHash
        };
      }

      // Fallback to Web3 service
      const transactionHash = await communityWeb3Service.voteOnProposal(proposalId, support);

      return {
        success: true,
        transactionHash
      };
    } catch (error) {
      console.error('Error voting on proposal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create a new governance proposal via Web3
   */
  async createProposalWeb3(proposalData: {
    title: string;
    description: string;
    communityId: string;
    actions: Array<{
      target: string;
      value: string;
      signature: string;
      calldata: string;
    }>;
  }): Promise<{ success: boolean; proposalId?: string; error?: string }> {
    try {
      const proposalId = await communityWeb3Service.createGovernanceProposal(
        proposalData.communityId,
        proposalData.title,
        proposalData.description,
        proposalData.actions
      );

      return {
        success: true,
        proposalId
      };
    } catch (error) {
      console.error('Error creating proposal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's voting power via Web3
   */
  async getVotingPowerWeb3(communityId: string, userAddress: string): Promise<{
    success: boolean;
    votingPower?: string;
    error?: string
  }> {
    try {
      const votingPower = await communityWeb3Service.getVotingPower(communityId, userAddress);

      return {
        success: true,
        votingPower
      };
    } catch (error) {
      console.error('Error getting voting power:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's voting power for a community
   */
  async getUserVotingPower(communityId: string, userAddress: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/governance/voting-power/${communityId}/${userAddress}`);

      if (response.ok) {
        const data = await response.json();
        return data.votingPower;
      }

      // Fallback to Web3 service
      const votingPower = await communityWeb3Service.getVotingPower(communityId, userAddress);
      return parseFloat(votingPower);
    } catch (error) {
      console.error('Error getting voting power:', error);
      // Return mock voting power for development
      return Math.random() * 1000 + 100;
    }
  }

  /**
   * Get community participation rate
   */
  async getCommunityParticipationRate(communityId: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/governance/participation/${communityId}`);

      if (response.ok) {
        const data = await response.json();
        return data.participationRate;
      }

      // Mock participation rate for development
      return Math.random() * 40 + 60; // 60-100%
    } catch (error) {
      console.error('Error getting participation rate:', error);
      return 75.5; // Default mock value
    }
  }

  /**
   * Get voting metrics for a specific proposal
   */
  async getProposalVotingMetrics(proposalId: string): Promise<VotingMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/governance/metrics/${proposalId}`);

      if (response.ok) {
        const data = await response.json();
        return data.metrics;
      }

      // Return mock metrics for development
      return this.getMockVotingMetrics();
    } catch (error) {
      console.error('Error getting voting metrics:', error);
      return this.getMockVotingMetrics();
    }
  }

  /**
   * Check if user can vote on a proposal
   */
  async canUserVote(proposalId: string, userAddress: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/governance/can-vote/${proposalId}/${userAddress}`);

      if (response.ok) {
        const data = await response.json();
        return data.canVote;
      }

      // Mock check for development
      return Math.random() > 0.2; // 80% chance user can vote
    } catch (error) {
      console.error('Error checking vote eligibility:', error);
      return true; // Default to allowing votes in development
    }
  }

  /**
   * Get detailed participation metrics for a community
   */
  async getParticipationMetrics(communityId: string, userAddress?: string): Promise<ParticipationMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/governance/participation-metrics/${communityId}${userAddress ? `?userAddress=${userAddress}` : ''}`);

      if (response.ok) {
        const data = await response.json();
        return data.metrics;
      }

      // Return mock metrics for development
      return this.getMockParticipationMetrics(userAddress);
    } catch (error) {
      console.error('Error getting participation metrics:', error);
      return this.getMockParticipationMetrics(userAddress);
    }
  }

  /**
   * Get historical participation data for a community
   */
  async getHistoricalParticipation(communityId: string, timeframe: 'week' | 'month' | 'quarter' = 'month'): Promise<{
    periods: Array<{
      period: string;
      participationRate: number;
      totalProposals: number;
      avgVotingPower: number;
    }>;
    trend: 'increasing' | 'decreasing' | 'stable';
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/governance/historical-participation/${communityId}?timeframe=${timeframe}`);

      if (response.ok) {
        const data = await response.json();
        return data;
      }

      // Return mock historical data for development
      return this.getMockHistoricalParticipation(timeframe);
    } catch (error) {
      console.error('Error getting historical participation:', error);
      return this.getMockHistoricalParticipation(timeframe);
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
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/governance/voting-weight/${communityId}/${userAddress}`);

      if (response.ok) {
        const data = await response.json();
        return data;
      }

      // Return mock voting weight for development
      const votingPower = Math.random() * 1000 + 100;
      const totalVotingPower = 50000;
      const percentage = (votingPower / totalVotingPower) * 100;

      return {
        votingPower,
        percentage,
        rank: Math.floor(Math.random() * 500) + 1,
        totalVoters: 1250
      };
    } catch (error) {
      console.error('Error getting voting weight:', error);
      return {
        votingPower: 250,
        percentage: 0.5,
        rank: 125,
        totalVoters: 1000
      };
    }
  }

  /**
   * Transform contract proposal to our Proposal type
   */
  private transformContractProposal(proposalId: number, contractProposal: any, communityId: string): Proposal {
    const [proposer, description, forVotes, againstVotes, executed, category] = contractProposal;

    // Calculate status based on execution and votes
    let status: ProposalStatus = ProposalStatus.ACTIVE;
    if (executed) {
      status = ProposalStatus.EXECUTED;
    } else {
      const totalVotes = forVotes.add(againstVotes);
      if (totalVotes.gt(0)) {
        const forPercentage = forVotes.mul(100).div(totalVotes);
        status = forPercentage.gte(60) ? ProposalStatus.SUCCEEDED : ProposalStatus.FAILED;
      }
    }

    return {
      id: `prop_${proposalId}`,
      onChainId: proposalId.toString(),
      title: description.substring(0, 100), // Use first 100 chars as title
      description: description,
      proposer: proposer,
      communityId,
      type: 'general',
      startTime: new Date(Date.now() - 7 * 86400000), // Assume started 7 days ago
      endTime: new Date(Date.now() + 7 * 86400000), // Ends 7 days from now
      forVotes: ethers.formatEther(forVotes),
      againstVotes: ethers.formatEther(againstVotes),
      abstainVotes: '0',
      quorum: '1000.0',
      status,
      category: this.mapContractCategory(category.toNumber()),
      executionDelay: 172800,
      requiredMajority: 60,
      participationRate: 75,
      canVote: !executed
    };
  }

  /**
   * Map contract category number to our ProposalCategory enum
   */
  private mapContractCategory(categoryNum: number): ProposalCategory {
    switch (categoryNum) {
      case 0: return ProposalCategory.GOVERNANCE;
      case 1: return ProposalCategory.FUNDING;
      case 2: return ProposalCategory.TECHNICAL;
      case 3: return ProposalCategory.COMMUNITY;
      default: return ProposalCategory.GOVERNANCE;
    }
  }

  /**
   * Transform Web3 service proposals to our Proposal type
   */
  private transformWeb3Proposals(web3Proposals: CommunityGovernanceProposal[]): Proposal[] {
    return web3Proposals.map(proposal => ({
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      proposer: proposal.proposer,
      proposerReputation: Math.floor(Math.random() * 1000 + 500),
      communityId: proposal.communityId,
      type: 'general',
      startTime: proposal.startTime,
      endTime: proposal.endTime,
      forVotes: proposal.forVotes,
      againstVotes: proposal.againstVotes,
      abstainVotes: '0',
      quorum: proposal.quorum,
      status: this.mapWeb3Status(proposal.status),
      category: ProposalCategory.GOVERNANCE,
      executionDelay: 172800, // 2 days
      requiredMajority: 60,
      participationRate: Math.random() * 40 + 60,
      canVote: proposal.status === 'active'
    }));
  }

  /**
   * Transform backend proposals array to our Proposal type
   */
  private transformBackendProposals(backendProposals: any[]): Proposal[] {
    return backendProposals.map(proposal => this.transformBackendProposal(proposal));
  }

  /**
   * Transform single backend proposal to our Proposal type
   */
  private transformBackendProposal(proposal: any): Proposal {
    return {
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      proposer: proposal.proposer,
      proposerReputation: proposal.proposerReputation || 500,
      communityId: proposal.daoId || 'general',
      type: (proposal.type as 'parameter' | 'treasury' | 'upgrade' | 'general' | 'emergency') || 'general',
      startTime: new Date(proposal.votingStarts),
      endTime: new Date(proposal.votingEnds),
      forVotes: proposal.yesVotes?.toString() || '0',
      againstVotes: proposal.noVotes?.toString() || '0',
      abstainVotes: proposal.abstainVotes?.toString() || '0',
      quorum: proposal.quorum?.toString() || '1000',
      status: this.mapBackendStatus(proposal.status),
      category: this.mapBackendCategory(proposal.category),
      executionDelay: proposal.executionDelay || 172800,
      requiredMajority: proposal.requiredMajority || 50,
      participationRate: proposal.participationRate || 75,
      userVote: proposal.userVote as VoteChoice | undefined,
      canVote: proposal.status === 'active' && new Date() < new Date(proposal.votingEnds)
    };
  }

  /**
   * Map backend status to our ProposalStatus enum
   */
  private mapBackendStatus(status: string): ProposalStatus {
    switch (status) {
      case 'pending':
        return ProposalStatus.DRAFT;
      case 'active':
        return ProposalStatus.ACTIVE;
      case 'passed':
        return ProposalStatus.SUCCEEDED;
      case 'failed':
        return ProposalStatus.FAILED;
      case 'executed':
        return ProposalStatus.EXECUTED;
      case 'cancelled':
        return ProposalStatus.CANCELLED;
      default:
        return ProposalStatus.DRAFT;
    }
  }

  /**
   * Map backend category to our ProposalCategory enum
   */
  private mapBackendCategory(category: string): ProposalCategory {
    switch (category) {
      case 'treasury':
        return ProposalCategory.FUNDING;
      case 'governance':
        return ProposalCategory.GOVERNANCE;
      case 'community':
        return ProposalCategory.COMMUNITY;
      case 'technical':
        return ProposalCategory.GOVERNANCE;
      default:
        return ProposalCategory.GOVERNANCE;
    }
  }

  /**
   * Map Web3 service status to our ProposalStatus enum
   */
  private mapWeb3Status(web3Status: string): ProposalStatus {
    switch (web3Status) {
      case 'pending':
        return ProposalStatus.DRAFT;
      case 'active':
        return ProposalStatus.ACTIVE;
      case 'passed':
        return ProposalStatus.SUCCEEDED;
      case 'failed':
        return ProposalStatus.FAILED;
      case 'executed':
        return ProposalStatus.EXECUTED;
      default:
        return ProposalStatus.DRAFT;
    }
  }

  /**
   * Get mock proposals for development
   */
  private getMockProposals(communityId: string): Proposal[] {
    return [
      {
        id: 'prop_1',
        title: 'Increase Community Staking Rewards',
        description: 'This proposal aims to increase the staking rewards for active community members by 25% to encourage more participation in governance and community activities. The increase will be funded from the community treasury surplus.',
        proposer: '0x1234567890123456789012345678901234567890',
        proposerReputation: 850,
        communityId,
        type: 'general',
        startTime: new Date(Date.now() - 86400000), // 1 day ago
        endTime: new Date(Date.now() + 6 * 86400000), // 6 days from now
        forVotes: '1250.5',
        againstVotes: '340.2',
        abstainVotes: '50.0',
        quorum: '1000.0',
        status: ProposalStatus.ACTIVE,
        category: ProposalCategory.GOVERNANCE,
        executionDelay: 172800,
        requiredMajority: 60,
        participationRate: 75.5,
        canVote: true
      },
      {
        id: 'prop_2',
        title: 'Community Treasury Allocation for Development',
        description: 'Proposal to allocate 100,000 LDAO tokens from the community treasury to fund development of new features and improvements to the platform.',
        proposer: '0x2345678901234567890123456789012345678901',
        proposerReputation: 920,
        communityId,
        type: 'general',
        startTime: new Date(Date.now() - 2 * 86400000), // 2 days ago
        endTime: new Date(Date.now() + 5 * 86400000), // 5 days from now
        forVotes: '2100.8',
        againstVotes: '150.3',
        abstainVotes: '75.2',
        quorum: '1500.0',
        status: ProposalStatus.ACTIVE,
        category: ProposalCategory.FUNDING,
        executionDelay: 259200, // 3 days
        requiredMajority: 65,
        participationRate: 82.1,
        canVote: true
      },
      {
        id: 'prop_3',
        title: 'Update Community Moderation Guidelines',
        description: 'Proposal to update the community moderation guidelines to better reflect current community standards and improve the moderation process.',
        proposer: '0x3456789012345678901234567890123456789012',
        proposerReputation: 780,
        communityId,
        type: 'general',
        startTime: new Date(Date.now() - 7 * 86400000), // 7 days ago
        endTime: new Date(Date.now() - 86400000), // 1 day ago (ended)
        forVotes: '1850.3',
        againstVotes: '120.7',
        abstainVotes: '30.0',
        quorum: '1200.0',
        status: ProposalStatus.SUCCEEDED,
        category: ProposalCategory.COMMUNITY,
        executionDelay: 172800,
        requiredMajority: 60,
        participationRate: 88.5,
        canVote: false
      }
    ];
  }

  /**
   * Get mock voting metrics for development
   */
  private getMockVotingMetrics(): VotingMetrics {
    return {
      totalVotingPower: '5000.0',
      participationRate: 75.5,
      quorumReached: true,
      timeRemaining: 5 * 24 * 60 * 60, // 5 days in seconds
      userVotingPower: '125.5',
      userHasVoted: false
    };
  }

  /**
   * Get mock participation metrics for development
   */
  private getMockParticipationMetrics(userAddress?: string): ParticipationMetrics {
    const eligibleVoters = 1250;
    const totalVoters = Math.floor(eligibleVoters * (0.6 + Math.random() * 0.3)); // 60-90% participation
    const currentParticipationRate = (totalVoters / eligibleVoters) * 100;
    const userVotingWeight = userAddress ? Math.random() * 500 + 50 : 0;
    const totalVotingPower = 50000;

    return {
      currentParticipationRate,
      eligibleVoters,
      totalVoters,
      userVotingWeight,
      userVotingWeightPercentage: (userVotingWeight / totalVotingPower) * 100,
      historicalParticipationRate: currentParticipationRate + (Math.random() - 0.5) * 10,
      participationTrend: Math.random() > 0.5 ? 'increasing' : Math.random() > 0.5 ? 'decreasing' : 'stable',
      quorumProgress: Math.min(currentParticipationRate * 1.2, 100),
      averageParticipationRate: 72.3
    };
  }

  /**
   * Get mock historical participation data for development
   */
  private getMockHistoricalParticipation(timeframe: string): {
    periods: Array<{
      period: string;
      participationRate: number;
      totalProposals: number;
      avgVotingPower: number;
    }>;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    const periods = [];
    const numPeriods = timeframe === 'week' ? 8 : timeframe === 'month' ? 6 : 4;
    let baseRate = 65;

    for (let i = numPeriods - 1; i >= 0; i--) {
      const variation = (Math.random() - 0.5) * 10;
      const rate = Math.max(40, Math.min(95, baseRate + variation));

      periods.push({
        period: timeframe === 'week'
          ? `Week ${i + 1}`
          : timeframe === 'month'
            ? `Month ${i + 1}`
            : `Q${i + 1}`,
        participationRate: rate,
        totalProposals: Math.floor(Math.random() * 5) + 2,
        avgVotingPower: Math.random() * 200 + 100
      });

      baseRate = rate;
    }

    const trend = periods[0].participationRate > periods[periods.length - 1].participationRate
      ? 'increasing'
      : periods[0].participationRate < periods[periods.length - 1].participationRate
        ? 'decreasing'
        : 'stable';

    return { periods, trend };
  }

  /**
   * Get authentication headers for API requests
   * Combines auth service headers with CSRF protection
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    // Get base auth headers from enhancedAuthService
    const headers = enhancedAuthService.getAuthHeaders();
    
    // Add CSRF headers for authenticated requests
    try {
      const csrfHeaders = await csrfService.getCSRFHeaders();
      Object.assign(headers, csrfHeaders);
    } catch (error) {
      console.warn('Failed to get CSRF headers:', error);
    }
    
    return headers;
  }
}

export const governanceService = new GovernanceService();
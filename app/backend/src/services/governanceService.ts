import { ethers } from 'ethers';
import { DatabaseService } from './databaseService';
import { ReputationService } from './reputationService';

const databaseService = new DatabaseService();
const reputationService = new ReputationService();

// Governance parameters
const GOVERNANCE_PARAMS = {
  BASE_QUORUM_PERCENTAGE: 10, // 10% of total tokens
  REPUTATION_WEIGHT_FACTOR: 0.2, // Reputation can add up to 20% more voting weight
  WHALE_CAP_PERCENTAGE: 0.05 // No single voter can have more than 5% of total voting weight
};

export interface Proposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  startBlock: number;
  endBlock: number;
  forVotes: string; // Using string to handle big numbers
  againstVotes: string;
  quorum: string;
  state: 'Pending' | 'Active' | 'Canceled' | 'Defeated' | 'Succeeded' | 'Queued' | 'Executed';
  targets: string[];
  values: string[];
  signatures: string[];
  calldatas: string[];
}

export interface Vote {
  voter: string;
  proposalId: number;
  support: boolean;
  votes: string; // Using string to handle big numbers
  reason: string;
}

export interface VotingPower {
  address: string;
  baseTokens: string; // Token balance
  reputationScore: number;
  weightedVotes: string; // Weighted voting power
  weightMultiplier: number; // The multiplier applied (1.0 to 1.2)
}

export class GovernanceService {
  private provider: ethers.JsonRpcProvider;
  private governanceContract: ethers.Contract | null;

  constructor(rpcUrl: string, governanceContractAddress: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.governanceContract = null;
    
    // Only initialize contract if we have a valid address
    if (governanceContractAddress && ethers.isAddress(governanceContractAddress)) {
      // In a real implementation, we would initialize the contract with ABI
      // this.governanceContract = new ethers.Contract(governanceContractAddress, GOVERNANCE_ABI, this.provider);
    }
  }

  /**
   * Calculate weighted voting power for a user
   * @param userAddress The user's wallet address
   * @param tokenBalance The user's token balance
   * @param totalSupply The total token supply
   * @returns The calculated voting power
   */
  async calculateVotingPower(
    userAddress: string, 
    tokenBalance: string, 
    totalSupply: string
  ): Promise<VotingPower> {
    try {
      // Get user's reputation score
      const reputation = await reputationService.getUserReputation(userAddress);
      const reputationScore = reputation ? reputation.totalScore : 0;

      // Calculate weight multiplier based on reputation (1.0 to 1.2)
      const weightMultiplier = 1.0 + (reputationScore / 1000) * GOVERNANCE_PARAMS.REPUTATION_WEIGHT_FACTOR;

      // Calculate weighted votes
      const baseTokens = ethers.parseUnits(tokenBalance, 18);
      const weightedVotes = baseTokens * BigInt(Math.floor(weightMultiplier * 10000)) / BigInt(10000);

      // Check if this exceeds the whale cap
      const totalSupplyBigInt = ethers.parseUnits(totalSupply, 18);
      const maxAllowedVotes = totalSupplyBigInt * BigInt(GOVERNANCE_PARAMS.WHALE_CAP_PERCENTAGE * 10000) / BigInt(10000);
      
      let finalWeightedVotes = weightedVotes;
      if (weightedVotes > maxAllowedVotes) {
        finalWeightedVotes = maxAllowedVotes;
      }

      return {
        address: userAddress,
        baseTokens: tokenBalance,
        reputationScore,
        weightedVotes: ethers.formatUnits(finalWeightedVotes, 18),
        weightMultiplier: Number(finalWeightedVotes) / Number(baseTokens)
      };
    } catch (error) {
      console.error("Error calculating voting power:", error);
      throw error;
    }
  }

  /**
   * Cast a vote with weighted voting power
   * @param voterAddress The voter's address
   * @param proposalId The proposal ID
   * @param support Whether to support the proposal
   * @param reason Optional reason for the vote
   * @param tokenBalance The voter's token balance
   * @param totalSupply The total token supply
   */
  async castVote(
    voterAddress: string,
    proposalId: number,
    support: boolean,
    reason: string,
    tokenBalance: string,
    totalSupply: string
  ): Promise<Vote> {
    try {
      // Calculate voting power
      const votingPower = await this.calculateVotingPower(voterAddress, tokenBalance, totalSupply);
      
      // Track voting participation for reputation
      await reputationService.trackVotingParticipation(voterAddress);

      // In a real implementation, we would interact with the governance contract
      console.log(`Casting vote for ${voterAddress} with ${votingPower.weightedVotes} weighted votes`);

      const vote: Vote = {
        voter: voterAddress,
        proposalId,
        support,
        votes: votingPower.weightedVotes,
        reason
      };

      return vote;
    } catch (error) {
      console.error("Error casting vote:", error);
      throw error;
    }
  }

  /**
   * Calculate proposal quorum based on total supply
   * @param totalSupply The total token supply
   * @returns The quorum required for the proposal
   */
  calculateQuorum(totalSupply: string): string {
    try {
      const totalSupplyBigInt = ethers.parseUnits(totalSupply, 18);
      const quorum = totalSupplyBigInt * BigInt(GOVERNANCE_PARAMS.BASE_QUORUM_PERCENTAGE * 10000) / BigInt(10000);
      return ethers.formatUnits(quorum, 18);
    } catch (error) {
      console.error("Error calculating quorum:", error);
      throw error;
    }
  }

  /**
   * Check if a proposal has reached quorum
   * @param proposal The proposal to check
   * @returns Whether the proposal has reached quorum
   */
  hasReachedQuorum(proposal: Proposal): boolean {
    try {
      const forVotes = ethers.parseUnits(proposal.forVotes, 18);
      const againstVotes = ethers.parseUnits(proposal.againstVotes, 18);
      const totalVotes = forVotes + againstVotes;
      const quorum = ethers.parseUnits(proposal.quorum, 18);
      
      return totalVotes >= quorum;
    } catch (error) {
      console.error("Error checking quorum:", error);
      return false;
    }
  }

  /**
   * Determine if a proposal has passed
   * @param proposal The proposal to check
   * @returns Whether the proposal has passed
   */
  isProposalPassed(proposal: Proposal): boolean {
    try {
      // Check if quorum is reached
      if (!this.hasReachedQuorum(proposal)) {
        return false;
      }

      // Check if for votes exceed against votes
      const forVotes = ethers.parseUnits(proposal.forVotes, 18);
      const againstVotes = ethers.parseUnits(proposal.againstVotes, 18);
      
      return forVotes > againstVotes;
    } catch (error) {
      console.error("Error determining if proposal passed:", error);
      return false;
    }
  }

  /**
   * Track successful proposal for reputation
   * @param proposal The successful proposal
   */
  async trackSuccessfulProposal(proposal: Proposal): Promise<void> {
    try {
      if (proposal.state === 'Executed') {
        await reputationService.trackSuccessfulProposal(proposal.proposer);
      }
    } catch (error) {
      console.error("Error tracking successful proposal:", error);
    }
  }
}
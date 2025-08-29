import { DatabaseService } from './databaseService';

const databaseService = new DatabaseService();

// Reputation scoring factors and weights
const REPUTATION_FACTORS = {
  DAO_PROPOSAL_SUCCESS_RATE: 0.3, // 30% weight
  VOTING_PARTICIPATION: 0.2,      // 20% weight
  INVESTMENT_ADVICE_ACCURACY: 0.25, // 25% weight
  COMMUNITY_CONTRIBUTION: 0.15,   // 15% weight
  ONCHAIN_ACTIVITY: 0.1          // 10% weight
};

// Reputation score ranges
const REPUTATION_TIERS = {
  NOVICE: { min: 0, max: 250, name: 'Novice' },
  APPRENTICE: { min: 251, max: 500, name: 'Apprentice' },
  EXPERT: { min: 501, max: 750, name: 'Expert' },
  MASTER: { min: 751, max: 1000, name: 'Master' }
};

export interface ReputationFactors {
  daoProposalSuccessRate: number; // 0-100
  votingParticipation: number;    // 0-100
  investmentAdviceAccuracy: number; // 0-100
  communityContribution: number;  // 0-100
  onchainActivity: number;        // 0-100
}

export interface ReputationScore {
  walletAddress: string;
  totalScore: number;
  tier: string;
  factors: ReputationFactors;
  lastUpdated: Date;
}

export class ReputationService {
  /**
   * Calculate reputation score based on various factors
   * @param factors The factors contributing to reputation
   * @returns The calculated reputation score (0-1000)
   */
  calculateReputationScore(factors: ReputationFactors): number {
    // Validate factors are within range
    const validatedFactors = {
      daoProposalSuccessRate: Math.min(100, Math.max(0, factors.daoProposalSuccessRate)),
      votingParticipation: Math.min(100, Math.max(0, factors.votingParticipation)),
      investmentAdviceAccuracy: Math.min(100, Math.max(0, factors.investmentAdviceAccuracy)),
      communityContribution: Math.min(100, Math.max(0, factors.communityContribution)),
      onchainActivity: Math.min(100, Math.max(0, factors.onchainActivity))
    };

    // Calculate weighted score
    const score = (
      validatedFactors.daoProposalSuccessRate * REPUTATION_FACTORS.DAO_PROPOSAL_SUCCESS_RATE +
      validatedFactors.votingParticipation * REPUTATION_FACTORS.VOTING_PARTICIPATION +
      validatedFactors.investmentAdviceAccuracy * REPUTATION_FACTORS.INVESTMENT_ADVICE_ACCURACY +
      validatedFactors.communityContribution * REPUTATION_FACTORS.COMMUNITY_CONTRIBUTION +
      validatedFactors.onchainActivity * REPUTATION_FACTORS.ONCHAIN_ACTIVITY
    );

    // Ensure score is within bounds and properly rounded
    return Math.min(1000, Math.max(0, Math.round(score * 10) / 10));
  }

  /**
   * Get reputation tier based on score
   * @param score The reputation score
   * @returns The reputation tier name
   */
  getReputationTier(score: number): string {
    if (score >= REPUTATION_TIERS.MASTER.min) return REPUTATION_TIERS.MASTER.name;
    if (score >= REPUTATION_TIERS.EXPERT.min) return REPUTATION_TIERS.EXPERT.name;
    if (score >= REPUTATION_TIERS.APPRENTICE.min) return REPUTATION_TIERS.APPRENTICE.name;
    return REPUTATION_TIERS.NOVICE.name;
  }

  /**
   * Get user reputation from database
   * @param address The user's wallet address
   * @returns The user's reputation score or null if not found
   */
  async getUserReputation(address: string): Promise<ReputationScore | null> {
    try {
      const dbReputation = await databaseService.getUserReputation(address);
      if (!dbReputation) return null;

      // For now, we'll return a simplified reputation object
      // In a real implementation, we would calculate factors from on-chain data
      const factors: ReputationFactors = {
        daoProposalSuccessRate: 75,
        votingParticipation: 80,
        investmentAdviceAccuracy: 70,
        communityContribution: 65,
        onchainActivity: 85
      };

      const totalScore = this.calculateReputationScore(factors);

      return {
        walletAddress: dbReputation.walletAddress,
        totalScore,
        tier: this.getReputationTier(totalScore),
        factors,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("Error getting user reputation:", error);
      throw error;
    }
  }

  /**
   * Update user reputation in database
   * @param address The user's wallet address
   * @param factors The new reputation factors
   * @returns The updated reputation score
   */
  async updateUserReputation(address: string, factors: ReputationFactors): Promise<ReputationScore> {
    try {
      const totalScore = this.calculateReputationScore(factors);
      const tier = this.getReputationTier(totalScore);

      // Update in database
      let dbReputation = await databaseService.getUserReputation(address);
      
      if (!dbReputation) {
        // Create new reputation record
        dbReputation = await databaseService.createUserReputation(address, totalScore, false);
      } else {
        // Update existing reputation record
        dbReputation = await databaseService.updateUserReputation(address, {
          score: totalScore
        });
      }

      return {
        walletAddress: dbReputation.walletAddress,
        totalScore,
        tier,
        factors,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("Error updating user reputation:", error);
      throw error;
    }
  }

  /**
   * Calculate voting weight based on reputation
   * @param tokenBalance The user's token balance
   * @param reputationScore The user's reputation score
   * @returns The voting weight (token balance multiplied by reputation factor)
   */
  calculateVotingWeight(tokenBalance: number, reputationScore: number): number {
    // Base voting weight is token balance
    // Reputation adds a multiplier (1.0 to 1.2 based on reputation)
    const reputationMultiplier = 1.0 + (reputationScore / 1000) * 0.2; // 0.2 is the max multiplier
    return tokenBalance * reputationMultiplier;
  }

  /**
   * Track successful DAO proposal
   * @param proposerAddress The address of the proposer
   */
  async trackSuccessfulProposal(proposerAddress: string): Promise<void> {
    try {
      // In a real implementation, we would update the user's proposal success rate
      console.log(`Tracked successful proposal by ${proposerAddress}`);
    } catch (error) {
      console.error("Error tracking successful proposal:", error);
    }
  }

  /**
   * Track voting participation
   * @param voterAddress The address of the voter
   */
  async trackVotingParticipation(voterAddress: string): Promise<void> {
    try {
      // In a real implementation, we would update the user's voting participation rate
      console.log(`Tracked voting participation by ${voterAddress}`);
    } catch (error) {
      console.error("Error tracking voting participation:", error);
    }
  }

  /**
   * Track investment advice accuracy
   * @param advisorAddress The address of the advisor
   * @param accuracy The accuracy percentage (0-100)
   */
  async trackInvestmentAdviceAccuracy(advisorAddress: string, accuracy: number): Promise<void> {
    try {
      // In a real implementation, we would update the user's investment advice accuracy
      console.log(`Tracked investment advice accuracy for ${advisorAddress}: ${accuracy}%`);
    } catch (error) {
      console.error("Error tracking investment advice accuracy:", error);
    }
  }
}
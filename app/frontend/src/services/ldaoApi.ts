import { apiClient } from './apiClient';

// Define types for LDAO dashboard data
export interface LDAOStakingInfo {
  totalStaked: string;
  stakingTier: number;
  votingPower: string;
  rewardsEarned: string;
  rewardsClaimed: string;
  nextRewardPayout: string;
  discountPercentage: number;
  stakingBenefits: {
    name: string;
    value: string;
    description: string;
  }[];
}

export interface LDAOMarketplaceBenefits {
  currentTier: string;
  tierBenefits: string[];
  transactionVolume: string;
  rewardsEarned: string;
  discountPercentage: number;
  feeReductionPercentage: number;
  ldaoPaymentDiscount: number;
  marketplaceStats: {
    totalTransactions: number;
    totalVolume: number;
    totalRewardsEarned: number;
    averageTransactionValue: number;
  };
}

export interface LDAOAcquisitionOptions {
  purchaseWithETH: {
    exchangeRate: string;
    minimumPurchase: string;
    maximumPurchase: string;
  };
  earnThroughActivity: {
    currentBalance: string;
    earnableTokens: string;
    availableTasks: {
      name: string;
      potentialReward: string;
      completionRate: string;
    }[];
  };
  stakingRewards: {
    currentAPR: string;
    estimatedAnnualEarnings: string;
    claimableRewards: string;
  };
}

export interface LDAORecentActivity {
  id: string;
  type: 'staking' | 'marketplace' | 'rewards' | 'discount';
  description: string;
  amount: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface LDAODashboardData {
  stakingInfo: LDAOStakingInfo;
  marketplaceBenefits: LDAOMarketplaceBenefits;
  acquisitionOptions: LDAOAcquisitionOptions;
  recentActivity: LDAORecentActivity[];
  nextMilestone: {
    name: string;
    description: string;
    progress: number;
    reward: string;
  } | null;
}

// API functions for LDAO benefits
export const ldaoApi = {
  /**
   * Get comprehensive LDAO benefits dashboard data
   */
  async getDashboardData(): Promise<LDAODashboardData> {
    const response = await apiClient.get('/api/ldao/benefits');
    return response.data.data;
  },

  /**
   * Get user's staking information
   */
  async getStakingInfo(): Promise<LDAOStakingInfo> {
    const response = await apiClient.get('/api/ldao/staking');
    return response.data.data;
  },

  /**
   * Get marketplace benefits
   */
  async getMarketplaceBenefits(): Promise<LDAOMarketplaceBenefits> {
    const response = await apiClient.get('/api/ldao/marketplace');
    return response.data.data;
  },

  /**
   * Get staking tier details
   */
  async getStakingTierDetails() {
    const response = await apiClient.get('/api/ldao/staking/tiers');
    return response.data.data;
  },

  /**
   * Get acquisition options
   */
  async getAcquisitionOptions() {
    const response = await apiClient.get('/api/ldao/acquisition');
    return response.data.data;
  },

  /**
   * Get recent activity
   */
  async getRecentActivity(): Promise<LDAORecentActivity[]> {
    const response = await apiClient.get('/api/ldao/activity');
    return response.data.data;
  }
};
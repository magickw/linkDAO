import { ENV_CONFIG } from '@/config/environment';
import { enhancedAuthService } from './enhancedAuthService';

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
const baseUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = enhancedAuthService.getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
};

export const ldaoApi = {
  /**
   * Get comprehensive LDAO benefits dashboard data
   */
  async getDashboardData(): Promise<LDAODashboardData> {
    const response = await fetchWithAuth('/api/ldao/benefits');
    return response.data;
  },

  /**
   * Get user's staking information
   */
  async getStakingInfo(): Promise<LDAOStakingInfo> {
    const response = await fetchWithAuth('/api/ldao/staking');
    return response.data;
  },

  /**
   * Get marketplace benefits
   */
  async getMarketplaceBenefits(): Promise<LDAOMarketplaceBenefits> {
    const response = await fetchWithAuth('/api/ldao/marketplace');
    return response.data;
  },

  /**
   * Get staking tier details
   */
  async getStakingTierDetails() {
    const response = await fetchWithAuth('/api/ldao/staking/tiers');
    return response.data;
  },

  /**
   * Get acquisition options
   */
  async getAcquisitionOptions() {
    const response = await fetchWithAuth('/api/ldao/acquisition');
    return response.data;
  },

  /**
   * Get recent activity
   */
  async getRecentActivity(): Promise<LDAORecentActivity[]> {
    const response = await fetchWithAuth('/api/ldao/activity');
    return response.data;
  }
};
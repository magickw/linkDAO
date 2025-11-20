import { ethers } from 'ethers';
import { webSocketService } from './webSocketService';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export interface APITier {
  id: string;
  name: string;
  description: string;
  requiredStake: string; // LDAO tokens required
  duration: number; // Lock period in days
  features: {
    requestsPerMinute: number;
    requestsPerDay: number;
    rateLimitWindow: number; // in seconds
    endpoints: string[]; // Array of accessible endpoints
    features: string[]; // Additional features like real-time data, analytics, etc.
  };
  pricing: {
    setupFee: string;
    monthlyFee: string;
    currency: 'LDAO' | 'USDC' | 'ETH';
  };
  benefits: string[];
  color: string;
  icon: string;
  isActive: boolean;
}

export interface APIKey {
  id: string;
  keyHash: string; // Hashed version of the API key
  userId: string;
  tierId: string;
  name: string;
  permissions: string[];
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
    currentUsage: {
      requestsThisMinute: number;
      requestsToday: number;
      lastReset: Date;
    };
  };
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastUsed?: Date;
  usageStats: {
    totalRequests: number;
    totalEndpoints: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export interface APIUsage {
  timestamp: Date;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  userId: string;
  apiKeyId: string;
}

export interface StakingPosition {
  id: string;
  userId: string;
  tierId: string;
  amount: string;
  lockPeriod: number;
  startTime: Date;
  endTime: Date;
  rewards: string;
  isLocked: boolean;
  apy: number;
  earlyWithdrawalPenalty: number;
}

export interface APIAccessRequest {
  id: string;
  userId: string;
  tierId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  stakingAmount: string;
  duration: number;
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

export class APIAccessService {
  private static currentAddress: string | null = null;
  private static provider: ethers.providers.Web3Provider | null = null;
  private static apiTiers: APITier[] | null = null;

  /**
   * Initialize the service with wallet connection
   */
  static async initialize(provider: ethers.providers.Web3Provider): Promise<void> {
    try {
      APIAccessService.provider = provider;
      const signer = provider.getSigner();
      APIAccessService.currentAddress = (await signer.getAddress()).toLowerCase();
      
      // Load API tiers
      await APIAccessService.loadAPITiers();
    } catch (error) {
      console.error('Failed to initialize API access service:', error);
      throw error;
    }
  }

  /**
   * Load API tiers from backend
   */
  private static async loadAPITiers(): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/access/tiers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const tiers = await response.json();
        APIAccessService.apiTiers = tiers;
      } else {
        // Use default API tiers if API fails
        APIAccessService.apiTiers = APIAccessService.getDefaultAPITiers();
      }
    } catch (error) {
      console.error('Error loading API tiers, using defaults:', error);
      APIAccessService.apiTiers = APIAccessService.getDefaultAPITiers();
    }
  }

  /**
   * Get default API tiers
   */
  private static getDefaultAPITiers(): APITier[] {
    return [
      {
        id: 'basic',
        name: 'Basic',
        description: 'Perfect for developers getting started with LinkDAO APIs',
        requiredStake: '100',
        duration: 30,
        features: {
          requestsPerMinute: 60,
          requestsPerDay: 1000,
          rateLimitWindow: 60,
          endpoints: [
            '/api/communities',
            '/api/posts',
            '/api/users/profile',
            '/api/marketplace/listings'
          ],
          features: [
            'Basic read access',
            'Community data',
            'Public posts',
            'Marketplace listings'
          ]
        },
        pricing: {
          setupFee: '10',
          monthlyFee: '5',
          currency: 'LDAO'
        },
        benefits: [
          'Access to essential endpoints',
          'Community support',
          'Basic documentation',
          'Monthly usage reports'
        ],
        color: '#94a3b8',
        icon: '🔓',
        isActive: true
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Enhanced access for serious developers and small businesses',
        requiredStake: '500',
        duration: 90,
        features: {
          requestsPerMinute: 300,
          requestsPerDay: 10000,
          rateLimitWindow: 60,
          endpoints: [
            '/api/communities',
            '/api/posts',
            '/api/users/profile',
            '/api/marketplace/listings',
            '/api/governance/proposals',
            '/api/tips',
            '/api/analytics/basic'
          ],
          features: [
            'Enhanced read access',
            'Write permissions',
            'Governance data',
            'Tipping analytics',
            'Real-time updates',
            'Advanced search'
          ]
        },
        pricing: {
          setupFee: '25',
          monthlyFee: '15',
          currency: 'LDAO'
        },
        benefits: [
          'Extended endpoint access',
            'Priority support',
            'Advanced analytics',
            'Custom integrations',
            'Webhook support'
        ],
        color: '#3b82f6',
        icon: '💼',
        isActive: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Full-featured access for large-scale applications',
        requiredStake: '2000',
        duration: 180,
        features: {
          requestsPerMinute: 1000,
          requestsPerDay: 100000,
          rateLimitWindow: 60,
          endpoints: [
            '/api/communities',
            '/api/posts',
            '/api/users/profile',
            '/api/marketplace/listings',
            '/api/governance/proposals',
            '/api/tips',
            '/api/analytics/basic',
            '/api/analytics/advanced',
            '/api/admin/tools',
            '/api/webhooks',
            '/api/subdao/economy'
          ],
          features: [
            'Full API access',
            'Admin endpoints',
            'Advanced analytics',
            'SubDAO economy data',
            'Real-time streaming',
            'Custom rate limits',
            'Dedicated infrastructure',
            'White-label options'
          ]
        },
        pricing: {
          setupFee: '100',
          monthlyFee: '50',
          currency: 'LDAO'
        },
        benefits: [
          'Unlimited endpoint access',
          'Dedicated support',
          'SLA guarantee',
          'Custom integrations',
          'Priority queue access',
          'Beta feature access',
          'On-premise options'
        ],
        color: '#8b5cf6',
        icon: '🚀',
        isActive: true
      },
      {
        id: 'institutional',
        name: 'Institutional',
        description: 'Premium access for institutions and enterprise clients',
        requiredStake: '10000',
        duration: 365,
        features: {
          requestsPerMinute: 5000,
          requestsPerDay: 1000000,
          rateLimitWindow: 60,
          endpoints: [
            '/api/*' // Full access to all endpoints
          ],
          features: [
            'Complete API access',
            'Source code access',
            'Protocol governance',
            'Custom endpoint development',
            'Direct database access',
            'Co-location options',
            'Custom blockchain nodes',
            'White-label deployment'
          ]
        },
        pricing: {
          setupFee: '500',
          monthlyFee: '200',
          currency: 'LDAO'
        },
        benefits: [
          'Full ecosystem access',
          'Governance participation',
          'Custom development',
          '24/7 dedicated support',
          'Direct team access',
          'Revenue sharing',
          'Protocol influence',
          'Early feature access'
        ],
        color: '#f59e0b',
        icon: '👑',
        isActive: true
      }
    ];
  }

  /**
   * Get available API tiers
   */
  static async getAPITiers(): Promise<APITier[]> {
    if (!APIAccessService.apiTiers) {
      await APIAccessService.loadAPITiers();
    }
    return APIAccessService.apiTiers!;
  }

  /**
   * Stake LDAO tokens for API access
   */
  static async stakeForAPIAccess(
    tierId: string,
    amount: string,
    duration: number
  ): Promise<StakingPosition> {
    if (!APIAccessService.currentAddress || !APIAccessService.provider) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      // Get LDAO token contract
      const ldaoAddress = process.env.NEXT_PUBLIC_LDAO_TOKEN_ADDRESS;
      if (!ldaoAddress) {
        throw new Error('LDAO token address not configured');
      }

      const ldaoContract = new ethers.Contract(
        ldaoAddress,
        ['function approve(address spender, uint256 amount) returns (bool)', 'function transfer(address to, uint256 amount) returns (bool)'],
        APIAccessService.provider
      );

      const signer = APIAccessService.provider.getSigner();

      // Approve tokens for staking
      const approveTx = await ldaoContract.connect(signer).approve(
        process.env.NEXT_PUBLIC_API_STAKING_ADDRESS,
        ethers.utils.parseEther(amount)
      );
      await approveTx.wait();

      // Create staking position
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/access/stake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: APIAccessService.currentAddress,
          tierId,
          amount,
          duration
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stake for API access');
      }

      const position = await response.json();
      
      // Send WebSocket notification
      webSocketService.send('api_access_staked', {
        userId: APIAccessService.currentAddress,
        tierId,
        amount,
        positionId: position.id
      });

      return {
        ...position,
        startTime: new Date(position.startTime),
        endTime: new Date(position.endTime)
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get user's staking positions
   */
  static async getUserStakingPositions(userId?: string): Promise<StakingPosition[]> {
    const address = userId || APIAccessService.currentAddress;
    if (!address) {
      throw new Error('No address provided');
    }

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/access/staking-positions/${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch staking positions');
      }

      const positions = await response.json();
      return positions.map((position: any) => ({
        ...position,
        startTime: new Date(position.startTime),
        endTime: new Date(position.endTime)
      }));
    } catch (error) {
      console.error('Error fetching staking positions:', error);
      return [];
    }
  }

  /**
   * Create API key
   */
  static async createAPIKey(
    tierId: string,
    name: string,
    permissions: string[] = []
  ): Promise<APIKey> {
    if (!APIAccessService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      // Verify user has active staking position for this tier
      const positions = await APIAccessService.getUserStakingPositions();
      const validPosition = positions.find(pos => 
        pos.tierId === tierId && 
        pos.isLocked && 
        new Date() < pos.endTime
      );

      if (!validPosition) {
        throw new Error('No valid staking position found for this tier');
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/access/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: APIAccessService.currentAddress,
          tierId,
          name,
          permissions
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }

      const apiKey = await response.json();
      
      // Send WebSocket notification
      webSocketService.send('api_key_created', {
        userId: APIAccessService.currentAddress,
        keyId: apiKey.id,
        tierId,
        name
      });

      return {
        ...apiKey,
        expiresAt: new Date(apiKey.expiresAt),
        createdAt: new Date(apiKey.createdAt),
        lastUsed: apiKey.lastUsed ? new Date(apiKey.lastUsed) : undefined,
        usageStats: {
          ...apiKey.usageStats,
          currentUsage: {
            ...apiKey.usageStats.currentUsage,
            lastReset: new Date(apiKey.usageStats.currentUsage.lastReset)
          }
        }
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get user's API keys
   */
  static async getUserAPIKeys(userId?: string): Promise<APIKey[]> {
    const address = userId || APIAccessService.currentAddress;
    if (!address) {
      throw new Error('No address provided');
    }

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/access/keys/${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }

      const keys = await response.json();
      return keys.map((key: any) => ({
        ...key,
        expiresAt: new Date(key.expiresAt),
        createdAt: new Date(key.createdAt),
        lastUsed: key.lastUsed ? new Date(key.lastUsed) : undefined,
        usageStats: {
          ...key.usageStats,
          currentUsage: {
            ...key.usageStats.currentUsage,
            lastReset: new Date(key.usageStats.currentUsage.lastReset)
          }
        }
      }));
    } catch (error) {
      console.error('Error fetching API keys:', error);
      return [];
    }
  }

  /**
   * Revoke API key
   */
  static async revokeAPIKey(keyId: string): Promise<void> {
    if (!APIAccessService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/access/keys/${keyId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: APIAccessService.currentAddress
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke API key');
      }

      // Send WebSocket notification
      webSocketService.send('api_key_revoked', {
        userId: APIAccessService.currentAddress,
        keyId
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get API usage statistics
   */
  static async getAPIUsageStats(
    keyId?: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<{
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    topEndpoints: Array<{
      endpoint: string;
      requests: number;
      avgResponseTime: number;
    }>;
    usageOverTime: Array<{
      timestamp: Date;
      requests: number;
    }>;
  }> {
    const userId = APIAccessService.currentAddress;
    if (!userId) {
      throw new Error('Wallet not connected');
    }

    try {
      const params = new URLSearchParams({ period });
      if (keyId) {
        params.append('keyId', keyId);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/access/usage/${userId}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch API usage stats');
      }

      const stats = await response.json();
      return {
        ...stats,
        usageOverTime: stats.usageOverTime.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
      };
    } catch (error) {
      console.error('Error fetching API usage stats:', error);
      throw error;
    }
  }

  /**
   * Unstake tokens (with penalty if early)
   */
  static async unstakeTokens(positionId: string): Promise<{
    success: boolean;
    amount: string;
    penalty: string;
    received: string;
  }> {
    if (!APIAccessService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/access/unstake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: APIAccessService.currentAddress,
          positionId
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unstake tokens');
      }

      const result = await response.json();
      
      // Send WebSocket notification
      webSocketService.send('api_access_unstaked', {
        userId: APIAccessService.currentAddress,
        positionId,
        amount: result.amount,
        penalty: result.penalty,
        received: result.received
      });

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get staking rewards
   */
  static async getStakingRewards(userId?: string): Promise<{
    totalRewards: string;
    claimableRewards: string;
    claimedRewards: string;
    rewardHistory: Array<{
      id: string;
      amount: string;
      timestamp: Date;
      positionId: string;
    }>;
  }> {
    const address = userId || APIAccessService.currentAddress;
    if (!address) {
      throw new Error('No address provided');
    }

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/access/rewards/${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch staking rewards');
      }

      const rewards = await response.json();
      return {
        ...rewards,
        rewardHistory: rewards.rewardHistory.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
      };
    } catch (error) {
      console.error('Error fetching staking rewards:', error);
      throw error;
    }
  }

  /**
   * Claim staking rewards
   */
  static async claimStakingRewards(): Promise<string> {
    if (!APIAccessService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/access/claim-rewards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: APIAccessService.currentAddress
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim rewards');
      }

      const result = await response.json();
      
      // Send WebSocket notification
      webSocketService.send('api_rewards_claimed', {
        userId: APIAccessService.currentAddress,
        amount: result.amount
      });

      return result.amount;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get API access revenue statistics (admin only)
   */
  static async getAccessRevenueStats(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<{
    totalRevenue: {
      LDAO: string;
      USDC: string;
      ETH: string;
    };
    activeStakes: number;
    totalStaked: string;
    averageStakeDuration: number;
    tierDistribution: Record<string, number>;
    revenueOverTime: Array<{
      date: string;
      revenue: string;
      newStakes: number;
    }>;
  }> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/access/revenue-stats?period=${period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch access revenue stats');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching access revenue stats:', error);
      throw error;
    }
  }

  /**
   * Update API tier configuration (admin only)
   */
  static async updateAPITier(tierId: string, updates: Partial<APITier>): Promise<APITier> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/access/tiers/${tierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update API tier');
      }

      const updatedTier = await response.json();
      
      // Update local cache
      if (APIAccessService.apiTiers) {
        const index = APIAccessService.apiTiers.findIndex(t => t.id === tierId);
        if (index !== -1) {
          APIAccessService.apiTiers[index] = updatedTier;
        }
      }

      return updatedTier;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }
}
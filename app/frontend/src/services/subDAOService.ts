import { ethers } from 'ethers';
import { webSocketService } from './webSocketService';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export interface SubDAO {
  id: string;
  name: string;
  symbol: string;
  description: string;
  creatorAddress: string;
  communityAddress: string;
  tokenAddress: string;
  totalSupply: string;
  treasuryAddress: string;
  createdAt: Date;
  isActive: boolean;
  members: number;
  reputationSystem: boolean;
  governanceEnabled: boolean;
  revenueSharing: {
    enabled: boolean;
    creatorShare: number; // Percentage
    communityPoolShare: number; // Percentage
    daoTreasuryShare: number; // Percentage
  };
  stakingRewards: {
    enabled: boolean;
    apr: number; // Annual Percentage Rate
    lockPeriods: number[]; // Lock periods in days
    bonuses: number[]; // Bonus percentages for each lock period
  };
}

export interface CommunityPool {
  id: string;
  subDAOId: string;
  balance: {
    LDAO: string;
    SUBDAO: string;
    USDC: string;
    ETH: string;
  };
  totalDistributed: {
    LDAO: string;
    SUBDAO: string;
    USDC: string;
    ETH: string;
  };
  lastDistribution: Date;
  distributionHistory: DistributionRecord[];
}

export interface DistributionRecord {
  id: string;
  timestamp: Date;
  amount: string;
  currency: string;
  recipient: string;
  type: 'reward' | 'airdrop' | 'staking' | 'governance';
  reason: string;
}

export interface StakingPosition {
  id: string;
  userAddress: string;
  subDAOId: string;
  amount: string;
  lockPeriod: number; // Days
  startTime: Date;
  endTime: Date;
  rewards: string;
  isLocked: boolean;
  apy: number;
}

export interface SubDAOMember {
  address: string;
  joinedAt: Date;
  reputation: number;
  contributions: number;
  stakedAmount: string;
  votingPower: number;
  roles: string[];
}

export class SubDAOService {
  private static currentAddress: string | null = null;
  private static provider: ethers.providers.Web3Provider | null = null;

  /**
   * Initialize the service with wallet connection
   */
  static async initialize(provider: ethers.providers.Web3Provider): Promise<void> {
    try {
      SubDAOService.provider = provider;
      const signer = provider.getSigner();
      SubDAOService.currentAddress = (await signer.getAddress()).toLowerCase();
    } catch (error) {
      console.error('Failed to initialize SubDAO service:', error);
      throw error;
    }
  }

  /**
   * Create a new SubDAO for a community
   */
  static async createSubDAO(params: {
    name: string;
    symbol: string;
    description: string;
    communityAddress: string;
    initialSupply: string;
    revenueSharing: {
      creatorShare: number;
      communityPoolShare: number;
      daoTreasuryShare: number;
    };
  }): Promise<SubDAO> {
    if (!SubDAOService.currentAddress || !SubDAOService.provider) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

    try {
      // Create SubDAO on backend
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/subdao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          creatorAddress: SubDAOService.currentAddress
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create SubDAO');
      }

      const subDAO = await response.json();

      // Send WebSocket notification
      webSocketService.send('subdao_created', {
        subDAOId: subDAO.id,
        creatorAddress: SubDAOService.currentAddress,
        communityAddress: params.communityAddress
      });

      return subDAO;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get SubDAO information
   */
  static async getSubDAO(subDAOId: string): Promise<SubDAO> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/subdao/${subDAOId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to fetch SubDAO');
      }

      const subDAO = await response.json();
      return {
        ...subDAO,
        createdAt: new Date(subDAO.createdAt)
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
   * Get all SubDAOs for a community
   */
  static async getCommunitySubDAOs(communityAddress: string): Promise<SubDAO[]> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/subdao/community/${communityAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch community SubDAOs');
      }

      const subDAOs = await response.json();
      return subDAOs.map((subDAO: any) => ({
        ...subDAO,
        createdAt: new Date(subDAO.createdAt)
      }));
    } catch (error) {
      console.error('Error fetching community SubDAOs:', error);
      return [];
    }
  }

  /**
   * Get community pool information
   */
  static async getCommunityPool(subDAOId: string): Promise<CommunityPool> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/subdao/${subDAOId}/pool`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch community pool');
      }

      const pool = await response.json();
      return {
        ...pool,
        lastDistribution: new Date(pool.lastDistribution),
        distributionHistory: pool.distributionHistory.map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp)
        }))
      };
    } catch (error) {
      console.error('Error fetching community pool:', error);
      throw error;
    }
  }

  /**
   * Stake SubDAO tokens
   */
  static async stakeTokens(params: {
    subDAOId: string;
    amount: string;
    lockPeriod: number;
  }): Promise<StakingPosition> {
    if (!SubDAOService.currentAddress || !SubDAOService.provider) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Get SubDAO token contract
      const subDAO = await SubDAOService.getSubDAO(params.subDAOId);
      const tokenContract = new ethers.Contract(
        subDAO.tokenAddress,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function transfer(address to, uint256 amount) returns (bool)',
          'function balanceOf(address) view returns (uint256)'
        ],
        SubDAOService.provider
      );

      const signer = SubDAOService.provider.getSigner();

      // Approve tokens for staking
      const approveTx = await tokenContract.connect(signer).approve(
        process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS,
        ethers.utils.parseEther(params.amount)
      );
      await approveTx.wait();

      // Create staking position
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/subdao/${params.subDAOId}/stake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: SubDAOService.currentAddress,
          amount: params.amount,
          lockPeriod: params.lockPeriod
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stake tokens');
      }

      const position = await response.json();
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
   * Unstake tokens
   */
  static async unstakeTokens(positionId: string): Promise<any> {
    if (!SubDAOService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/subdao/unstake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          positionId,
          userAddress: SubDAOService.currentAddress
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unstake tokens');
      }

      return response.json();
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
  static async getUserStakingPositions(userAddress?: string): Promise<StakingPosition[]> {
    const address = userAddress || SubDAOService.currentAddress;
    if (!address) {
      throw new Error('No address provided');
    }

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/subdao/positions/${address}`, {
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
   * Distribute revenue to community pool
   */
  static async distributeRevenue(params: {
    subDAOId: string;
    amount: string;
    currency: 'LDAO' | 'USDC' | 'ETH';
    source: 'marketplace' | 'tipping' | 'boosting' | 'advertising';
  }): Promise<any> {
    if (!SubDAOService.currentAddress || !SubDAOService.provider) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Get revenue sharing configuration
      const subDAO = await SubDAOService.getSubDAO(params.subDAOId);
      
      // Calculate distributions
      const creatorAmount = (parseFloat(params.amount) * subDAO.revenueSharing.creatorShare / 100).toString();
      const poolAmount = (parseFloat(params.amount) * subDAO.revenueSharing.communityPoolShare / 100).toString();
      const treasuryAmount = (parseFloat(params.amount) * subDAO.revenueSharing.daoTreasuryShare / 100).toString();

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/subdao/${params.subDAOId}/distribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency,
          source: params.source,
          distributions: {
            creator: creatorAmount,
            pool: poolAmount,
            treasury: treasuryAmount
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to distribute revenue');
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get SubDAO members
   */
  static async getSubDAOMembers(subDAOId: string): Promise<SubDAOMember[]> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/subdao/${subDAOId}/members`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch SubDAO members');
      }

      const members = await response.json();
      return members.map((member: any) => ({
        ...member,
        joinedAt: new Date(member.joinedAt)
      }));
    } catch (error) {
      console.error('Error fetching SubDAO members:', error);
      return [];
    }
  }

  /**
   * Join a SubDAO
   */
  static async joinSubDAO(subDAOId: string): Promise<any> {
    if (!SubDAOService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/subdao/${subDAOId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: SubDAOService.currentAddress
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join SubDAO');
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get SubDAO token balance
   */
  static async getSubDAOTokenBalance(subDAOId: string, userAddress?: string): Promise<string> {
    const address = userAddress || SubDAOService.currentAddress;
    if (!address || !SubDAOService.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const subDAO = await SubDAOService.getSubDAO(subDAOId);
      const tokenContract = new ethers.Contract(
        subDAO.tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        SubDAOService.provider
      );

      const balance = await tokenContract.balanceOf(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Error fetching SubDAO token balance:', error);
      return '0';
    }
  }

  /**
   * Claim staking rewards
   */
  static async claimStakingRewards(positionId: string): Promise<any> {
    if (!SubDAOService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/subdao/claim-rewards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          positionId,
          userAddress: SubDAOService.currentAddress
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim rewards');
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }
}
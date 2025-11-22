/**
 * Post Boosting Service
 * Handles post promotion and boosting with LDAO tokens
 */

import { ethers } from 'ethers';
import { webSocketService } from './webSocketService';
import { cacheInvalidationService } from './communityCache';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export interface PostBoost {
  id: string;
  postId: string;
  boostedBy: string;
  amount: string;
  currency: 'LDAO' | 'USDC';
  duration: number; // in hours
  boostType: 'standard' | 'premium' | 'featured';
  status: 'pending' | 'active' | 'expired' | 'failed';
  createdAt: Date;
  expiresAt?: Date;
  transactionHash?: string;
}

export interface BoostPackage {
  id: string;
  name: string;
  description: string;
  duration: number; // in hours
  boostType: 'standard' | 'premium' | 'featured';
  prices: {
    LDAO: number;
    USDC?: number;
  };
  benefits: string[];
  icon: string;
  color: string;
}

export const BOOST_PACKAGES: BoostPackage[] = [
  {
    id: 'standard',
    name: 'Standard Boost',
    description: 'Increase visibility for 24 hours',
    duration: 24,
    boostType: 'standard',
    prices: { LDAO: 50, USDC: 25 },
    benefits: [
      '2x visibility in feed',
      'Highlighted in search',
      'Priority in recommendations'
    ],
    icon: '⭐',
    color: 'blue'
  },
  {
    id: 'premium',
    name: 'Premium Boost',
    description: 'Maximum visibility for 48 hours',
    duration: 48,
    boostType: 'premium',
    prices: { LDAO: 100, USDC: 50 },
    benefits: [
      '3x visibility in feed',
      'Top placement in search',
      'Featured in community sidebar',
      'Priority in all recommendations'
    ],
    icon: '🚀',
    color: 'purple'
  },
  {
    id: 'featured',
    name: 'Featured Post',
    description: 'Ultimate visibility for 72 hours',
    duration: 72,
    boostType: 'featured',
    prices: { LDAO: 200, USDC: 100 },
    benefits: [
      '5x visibility in feed',
      'Top placement everywhere',
      'Featured on homepage',
      'Community banner placement',
      'Priority in all algorithms'
    ],
    icon: '👑',
    color: 'gold'
  }
];

class PostBoostingService {
  private currentAddress: string | null = null;
  private provider: ethers.BrowserProvider | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private activeBoosts: Map<string, PostBoost> = new Map();

  constructor() {
    this.initializeWebSocketListeners();
  }

  /**
   * Initialize the service with wallet connection
   */
  async initialize(provider: ethers.BrowserProvider): Promise<void> {
    try {
      this.provider = provider;
      const signer = await provider.getSigner();
      this.currentAddress = (await signer.getAddress()).toLowerCase();

      // Load active boosts
      await this.loadActiveBoosts();

      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize post boosting service:', error);
      throw error;
    }
  }

  /**
   * Boost a post
   */
  async boostPost(params: {
    postId: string;
    packageId: string;
    currency: 'LDAO' | 'USDC';
  }): Promise<PostBoost> {
    if (!this.currentAddress || !this.provider) {
      throw new Error('Wallet not connected');
    }

    const packageData = BOOST_PACKAGES.find(p => p.id === params.packageId);
    if (!packageData) {
      throw new Error('Invalid package selected');
    }

    const boost: PostBoost = {
      id: this.generateBoostId(),
      postId: params.postId,
      boostedBy: this.currentAddress,
      amount: packageData.prices[params.currency].toString(),
      currency: params.currency,
      duration: packageData.duration,
      boostType: packageData.boostType,
      status: 'pending',
      createdAt: new Date()
    };

    try {
      // Calculate fee distribution
      const feeDistribution = this.calculateFeeDistribution(
        boost.amount,
        params.currency
      );

      // Get token contract
      const tokenContract = (await this.getTokenContract(params.currency)) as any;

      // Get signer
      const signer = await this.provider.getSigner();

      // Approve tokens
      const approveTx = await tokenContract.connect(signer).approve(
        process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
        boost.amount
      );
      await approveTx.wait();

      // Create boost through Treasury contract
      const treasuryContract = await this.getTreasuryContract();
      const boostTx = await (treasuryContract.connect(signer) as any).createBoost({
        postId: params.postId,
        packageId: params.packageId,
        currency: params.currency,
        amount: boost.amount,
        duration: packageData.duration
      });

      boost.transactionHash = boostTx.hash;
      boost.status = 'active';
      boost.expiresAt = new Date(Date.now() + packageData.duration * 60 * 60 * 1000);

      // Store active boost
      this.activeBoosts.set(boost.id, boost);
      this.saveActiveBoosts();

      // Emit events
      this.emit('boost_created', boost);

      // Send through WebSocket for real-time updates
      webSocketService.send('boost_created', {
        boostId: boost.id,
        postId: boost.postId,
        boostedBy: boost.boostedBy,
        packageId: params.packageId,
        expiresAt: boost.expiresAt
      });

      return boost;
    } catch (error) {
      boost.status = 'failed';
      this.emit('boost_error', { boost, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get active boosts for posts
   */
  async getActiveBoosts(): Promise<PostBoost[]> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/boosts/active`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active boosts');
      }

      const data = await response.json();
      return data.boosts || [];
    } catch (error) {
      console.error('Error fetching active boosts:', error);
      return Array.from(this.activeBoosts.values());
    }
  }

  /**
   * Get boost for a specific post
   */
  async getPostBoost(postId: string): Promise<PostBoost | null> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/boosts/post/${postId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.boost || null;
    } catch (error) {
      console.error('Error fetching post boost:', error);
      return null;
    }
  }

  /**
   * Get boosts created by the current user
   */
  async getUserBoosts(limit: number = 50, offset: number = 0): Promise<PostBoost[]> {
    if (!this.currentAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/boosts/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: this.currentAddress,
          limit,
          offset
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user boosts');
      }

      const data = await response.json();
      return data.boosts || [];
    } catch (error) {
      console.error('Error fetching user boosts:', error);
      return [];
    }
  }

  /**
   * Get total boost revenue
   */
  async getTotalRevenue(): Promise<{ LDAO: string; USDC: string }> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/boosts/revenue`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch total revenue');
      }

      const data = await response.json();
      return data.revenue || { LDAO: '0', USDC: '0' };
    } catch (error) {
      console.error('Error fetching total revenue:', error);
      return { LDAO: '0', USDC: '0' };
    }
  }

  /**
   * Calculate fee distribution
   * 50% DAO treasury, 30% community rewards, 20% post creator
   */
  private calculateFeeDistribution(amount: string, currency: string): {
    daoTreasury: string;
    communityRewards: string;
    postCreator: string;
  } {
    const amountNum = parseFloat(amount);

    return {
      daoTreasury: (amountNum * 0.5).toString(),
      communityRewards: (amountNum * 0.3).toString(),
      postCreator: (amountNum * 0.2).toString()
    };
  }

  /**
   * Get token contract instance
   */
  private async getTokenContract(currency: string): Promise<ethers.Contract> {
    const tokenAddresses = {
      LDAO: process.env.NEXT_PUBLIC_LDAO_TOKEN_ADDRESS,
      USDC: process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS
    };

    const address = tokenAddresses[currency as keyof typeof tokenAddresses];
    if (!address) {
      throw new Error(`Token address not found for ${currency}`);
    }

    return new ethers.Contract(
      address,
      ['function approve(address spender, uint256 amount) returns (bool)', 'function transfer(address to, uint256 amount) returns (bool)'],
      this.provider!
    );
  }

  /**
   * Get Treasury contract instance
   */
  private async getTreasuryContract(): Promise<ethers.Contract> {
    const address = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
    if (!address) {
      throw new Error('Treasury contract address not configured');
    }

    return new ethers.Contract(
      address,
      [
        'function createBoost((string postId, string packageId, string currency, uint256 amount, uint256 duration) calldata params)',
        'function getBoost(string postId) view returns (tuple(address boostedBy, uint256 amount, uint256 expiresAt, string boostType))',
        'function getActiveBoosts() view returns (string[] memory)',
        'function distributeBoostRevenue(uint256 amount, string currency) returns (bool)'
      ],
      this.provider!
    );
  }

  /**
   * Generate unique boost ID
   */
  private generateBoostId(): string {
    return `boost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize WebSocket listeners
   */
  private initializeWebSocketListeners(): void {
    webSocketService.on('boost_updated', (data: { boost: PostBoost }) => {
      if (this.activeBoosts.has(data.boost.id)) {
        this.activeBoosts.set(data.boost.id, data.boost);
        this.saveActiveBoosts();
      }
      this.emit('boost_updated', data.boost);
    });

    webSocketService.on('boost_expired', (data: { boostId: string }) => {
      const boost = this.activeBoosts.get(data.boostId);
      if (boost) {
        boost.status = 'expired';
        this.activeBoosts.delete(data.boostId);
        this.saveActiveBoosts();
        this.emit('boost_expired', boost);
      }
    });
  }

  /**
   * Save active boosts to localStorage
   */
  private saveActiveBoosts(): void {
    if (typeof window !== 'undefined') {
      const boostsArray = Array.from(this.activeBoosts.values());
      localStorage.setItem('active_boosts', JSON.stringify(boostsArray));
    }
  }

  /**
   * Load active boosts from localStorage
   */
  private async loadActiveBoosts(): Promise<void> {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('active_boosts');
      if (stored) {
        try {
          const boostsArray = JSON.parse(stored);
          boostsArray.forEach((boost: PostBoost) => {
            // Check if boost is still active
            if (boost.expiresAt && new Date() < new Date(boost.expiresAt)) {
              this.activeBoosts.set(boost.id, boost);
            }
          });
        } catch (error) {
          console.error('Error loading active boosts:', error);
        }
      }
    }

    // Also fetch from API to sync
    try {
      const apiBoosts = await this.getActiveBoosts();
      apiBoosts.forEach(boost => {
        this.activeBoosts.set(boost.id, boost);
      });
      this.saveActiveBoosts();
    } catch (error) {
      console.error('Error syncing active boosts from API:', error);
    }
  }

  /**
   * Event emitter methods
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.splice(eventListeners.indexOf(callback), 1);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in boosting service event listener for ${event}:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export const postBoostingService = new PostBoostingService();

export default PostBoostingService;
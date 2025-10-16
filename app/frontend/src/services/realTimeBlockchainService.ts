/**
 * Real-time blockchain data service for Web3 community enhancements
 * Handles real-time token prices, governance updates, and post/comment updates
 */

import { TokenInfo } from '../types/web3Community';
import { Proposal, GovernanceData } from '../types/governance';
import { TokenActivity } from '../types/tokenActivity';
import { web3ErrorHandler } from '../utils/web3ErrorHandling';
import { tokenService } from './web3/tokenService';
import { governanceService } from './web3/governanceService';

interface PriceUpdate {
  tokenAddress: string;
  price: number;
  priceChange24h: number;
  timestamp: Date;
}

interface GovernanceUpdate {
  proposalId: string;
  communityId: string;
  votingProgress: {
    for: number;
    against: number;
    abstain: number;
  };
  status: 'active' | 'passed' | 'failed' | 'executed';
  timestamp: Date;
}

interface PostUpdate {
  postId: string;
  communityId: string;
  updateType: 'new_comment' | 'reaction_added' | 'stake_added' | 'tip_received';
  data: any;
  timestamp: Date;
}

interface BlockchainEventSubscription {
  id: string;
  type: 'token_price' | 'governance' | 'post_activity' | 'user_balance';
  target: string;
  callback: (data: any) => void;
  filters?: {
    tokenAddresses?: string[];
    communityIds?: string[];
    postIds?: string[];
    userAddresses?: string[];
  };
}

export class RealTimeBlockchainService {
  private static instance: RealTimeBlockchainService;
  private subscriptions: Map<string, BlockchainEventSubscription> = new Map();
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private governanceUpdateInterval: NodeJS.Timeout | null = null;
  private postUpdateInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  
  // Cache for preventing duplicate updates
  private lastPriceUpdate: Map<string, number> = new Map();
  private lastGovernanceUpdate: Map<string, Date> = new Map();
  private lastPostUpdate: Map<string, Date> = new Map();

  // Update intervals (in milliseconds)
  private readonly PRICE_UPDATE_INTERVAL = 60000; // 1 minute
  private readonly GOVERNANCE_UPDATE_INTERVAL = 120000; // 2 minutes
  private readonly POST_UPDATE_INTERVAL = 30000; // 30 seconds

  static getInstance(): RealTimeBlockchainService {
    if (!RealTimeBlockchainService.instance) {
      RealTimeBlockchainService.instance = new RealTimeBlockchainService();
    }
    return RealTimeBlockchainService.instance;
  }

  /**
   * Start real-time blockchain data updates
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('Starting real-time blockchain data updates');

    // Start price updates
    this.startPriceUpdates();
    
    // Start governance updates
    this.startGovernanceUpdates();
    
    // Start post activity updates
    this.startPostUpdates();
  }

  /**
   * Stop real-time blockchain data updates
   */
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    console.log('Stopping real-time blockchain data updates');

    // Clear intervals
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }

    if (this.governanceUpdateInterval) {
      clearInterval(this.governanceUpdateInterval);
      this.governanceUpdateInterval = null;
    }

    if (this.postUpdateInterval) {
      clearInterval(this.postUpdateInterval);
      this.postUpdateInterval = null;
    }

    // Clear caches
    this.lastPriceUpdate.clear();
    this.lastGovernanceUpdate.clear();
    this.lastPostUpdate.clear();
  }

  /**
   * Subscribe to real-time blockchain events
   */
  subscribe(
    type: 'token_price' | 'governance' | 'post_activity' | 'user_balance',
    target: string,
    callback: (data: any) => void,
    filters?: {
      tokenAddresses?: string[];
      communityIds?: string[];
      postIds?: string[];
      userAddresses?: string[];
    }
  ): string {
    const subscriptionId = `${type}_${target}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: BlockchainEventSubscription = {
      id: subscriptionId,
      type,
      target,
      callback,
      filters
    };

    this.subscriptions.set(subscriptionId, subscription);
    
    console.log(`Subscribed to ${type} updates for ${target}`);
    
    // If this is the first subscription and service isn't active, start it
    if (!this.isActive) {
      this.start();
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from real-time blockchain events
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      this.subscriptions.delete(subscriptionId);
      console.log(`Unsubscribed from ${subscription.type} updates`);
      
      // If no more subscriptions, stop the service
      if (this.subscriptions.size === 0) {
        this.stop();
      }
    }
  }

  /**
   * Get current subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get active subscriptions by type
   */
  getSubscriptionsByType(type: string): BlockchainEventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.type === type);
  }

  /**
   * Start real-time token price updates
   */
  private startPriceUpdates(): void {
    this.priceUpdateInterval = setInterval(async () => {
      try {
        await this.updateTokenPrices();
      } catch (error) {
        console.error('Error updating token prices:', error);
      }
    }, this.PRICE_UPDATE_INTERVAL);
  }

  /**
   * Start real-time governance updates
   */
  private startGovernanceUpdates(): void {
    this.governanceUpdateInterval = setInterval(async () => {
      try {
        await this.updateGovernanceData();
      } catch (error) {
        console.error('Error updating governance data:', error);
      }
    }, this.GOVERNANCE_UPDATE_INTERVAL);
  }

  /**
   * Start real-time post activity updates
   */
  private startPostUpdates(): void {
    this.postUpdateInterval = setInterval(async () => {
      try {
        await this.updatePostActivity();
      } catch (error) {
        console.error('Error updating post activity:', error);
      }
    }, this.POST_UPDATE_INTERVAL);
  }

  /**
   * Update token prices for all subscribed tokens
   */
  private async updateTokenPrices(): Promise<void> {
    const priceSubscriptions = this.getSubscriptionsByType('token_price');
    if (priceSubscriptions.length === 0) return;

    // Collect all unique token addresses
    const tokenAddresses = new Set<string>();
    priceSubscriptions.forEach(sub => {
      if (sub.filters?.tokenAddresses) {
        sub.filters.tokenAddresses.forEach(addr => tokenAddresses.add(addr));
      } else {
        tokenAddresses.add(sub.target);
      }
    });

    // Fetch prices for all tokens
    const priceUpdates: PriceUpdate[] = [];
    
    for (const tokenAddress of tokenAddresses) {
      try {
        const tokenInfo = await tokenService.getTokenInfo(tokenAddress);
        if (tokenInfo?.priceUSD !== undefined) {
          const lastPrice = this.lastPriceUpdate.get(tokenAddress);
          
          // Only emit update if price has changed significantly (>0.1%)
          if (!lastPrice || Math.abs(tokenInfo.priceUSD - lastPrice) / lastPrice > 0.001) {
            const priceUpdate: PriceUpdate = {
              tokenAddress,
              price: tokenInfo.priceUSD,
              priceChange24h: tokenInfo.priceChange24h || 0,
              timestamp: new Date()
            };
            
            priceUpdates.push(priceUpdate);
            this.lastPriceUpdate.set(tokenAddress, tokenInfo.priceUSD);
          }
        }
      } catch (error) {
        console.error(`Error fetching price for token ${tokenAddress}:`, error);
      }
    }

    // Emit updates to subscribers
    if (priceUpdates.length > 0) {
      this.emitPriceUpdates(priceUpdates);
    }
  }

  /**
   * Update governance data for all subscribed communities
   */
  private async updateGovernanceData(): Promise<void> {
    const governanceSubscriptions = this.getSubscriptionsByType('governance');
    if (governanceSubscriptions.length === 0) return;

    // Collect all unique community IDs
    const communityIds = new Set<string>();
    governanceSubscriptions.forEach(sub => {
      if (sub.filters?.communityIds) {
        sub.filters.communityIds.forEach(id => communityIds.add(id));
      } else {
        communityIds.add(sub.target);
      }
    });

    // Fetch governance data for all communities
    const governanceUpdates: GovernanceUpdate[] = [];
    
    for (const communityId of communityIds) {
      try {
        const governanceData = await governanceService.getGovernanceData(communityId);
        const lastUpdate = this.lastGovernanceUpdate.get(communityId);
        
        // Check if there are new updates (simplified check)
        const hasUpdates = !lastUpdate || 
          Date.now() - lastUpdate.getTime() > this.GOVERNANCE_UPDATE_INTERVAL;
        
        if (hasUpdates && governanceData.activeProposals.length > 0) {
          // Process each active proposal
          governanceData.activeProposals.forEach(proposal => {
            const governanceUpdate: GovernanceUpdate = {
              proposalId: proposal.id,
              communityId,
              votingProgress: {
                for: proposal.votingPower?.for ?? 0,
                against: proposal.votingPower?.against ?? 0,
                abstain: proposal.votingPower?.abstain ?? 0,
              },
              status: (proposal.status === 'succeeded'
                ? 'passed'
                : proposal.status === 'failed'
                ? 'failed'
                : proposal.status === 'executed'
                ? 'executed'
                : 'active'),
              timestamp: new Date()
            };
            
            governanceUpdates.push(governanceUpdate);
          });
          
          this.lastGovernanceUpdate.set(communityId, new Date());
        }
      } catch (error) {
        console.error(`Error fetching governance data for community ${communityId}:`, error);
      }
    }

    // Emit updates to subscribers
    if (governanceUpdates.length > 0) {
      this.emitGovernanceUpdates(governanceUpdates);
    }
  }

  /**
   * Update post activity for all subscribed posts
   */
  private async updatePostActivity(): Promise<void> {
    const postSubscriptions = this.getSubscriptionsByType('post_activity');
    if (postSubscriptions.length === 0) return;

    // Collect all unique post IDs
    const postIds = new Set<string>();
    postSubscriptions.forEach(sub => {
      if (sub.filters?.postIds) {
        sub.filters.postIds.forEach(id => postIds.add(id));
      } else {
        postIds.add(sub.target);
      }
    });

    // Simulate post activity updates (in real implementation, this would fetch from API/blockchain)
    const postUpdates: PostUpdate[] = [];
    
    for (const postId of postIds) {
      try {
        const lastUpdate = this.lastPostUpdate.get(postId);
        
        // Simulate random activity (in real implementation, fetch actual data)
        if (!lastUpdate || Math.random() > 0.8) { // 20% chance of update
          const updateTypes: PostUpdate['updateType'][] = [
            'new_comment', 'reaction_added', 'stake_added', 'tip_received'
          ];
          
          const postUpdate: PostUpdate = {
            postId,
            communityId: 'community_' + postId.split('_')[1], // Extract community ID
            updateType: updateTypes[Math.floor(Math.random() * updateTypes.length)],
            data: {
              count: Math.floor(Math.random() * 10) + 1,
              amount: Math.random() * 100
            },
            timestamp: new Date()
          };
          
          postUpdates.push(postUpdate);
          this.lastPostUpdate.set(postId, new Date());
        }
      } catch (error) {
        console.error(`Error updating post activity for ${postId}:`, error);
      }
    }

    // Emit updates to subscribers
    if (postUpdates.length > 0) {
      this.emitPostUpdates(postUpdates);
    }
  }

  /**
   * Emit price updates to subscribers
   */
  private emitPriceUpdates(updates: PriceUpdate[]): void {
    const priceSubscriptions = this.getSubscriptionsByType('token_price');
    
    priceSubscriptions.forEach(subscription => {
      const relevantUpdates = updates.filter(update => {
        if (subscription.filters?.tokenAddresses) {
          return subscription.filters.tokenAddresses.includes(update.tokenAddress);
        }
        return update.tokenAddress === subscription.target;
      });
      
      if (relevantUpdates.length > 0) {
        try {
          subscription.callback({
            type: 'token_price_update',
            updates: relevantUpdates,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error in price update callback:', error);
        }
      }
    });
  }

  /**
   * Emit governance updates to subscribers
   */
  private emitGovernanceUpdates(updates: GovernanceUpdate[]): void {
    const governanceSubscriptions = this.getSubscriptionsByType('governance');
    
    governanceSubscriptions.forEach(subscription => {
      const relevantUpdates = updates.filter(update => {
        if (subscription.filters?.communityIds) {
          return subscription.filters.communityIds.includes(update.communityId);
        }
        return update.communityId === subscription.target;
      });
      
      if (relevantUpdates.length > 0) {
        try {
          subscription.callback({
            type: 'governance_update',
            updates: relevantUpdates,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error in governance update callback:', error);
        }
      }
    });
  }

  /**
   * Emit post updates to subscribers
   */
  private emitPostUpdates(updates: PostUpdate[]): void {
    const postSubscriptions = this.getSubscriptionsByType('post_activity');
    
    postSubscriptions.forEach(subscription => {
      const relevantUpdates = updates.filter(update => {
        if (subscription.filters?.postIds) {
          return subscription.filters.postIds.includes(update.postId);
        }
        if (subscription.filters?.communityIds) {
          return subscription.filters.communityIds.includes(update.communityId);
        }
        return update.postId === subscription.target || update.communityId === subscription.target;
      });
      
      if (relevantUpdates.length > 0) {
        try {
          subscription.callback({
            type: 'post_activity_update',
            updates: relevantUpdates,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error in post update callback:', error);
        }
      }
    });
  }

  /**
   * Force update for specific token price
   */
  async forceTokenPriceUpdate(tokenAddress: string): Promise<void> {
    try {
      const tokenInfo = await tokenService.getTokenInfo(tokenAddress);
      if (tokenInfo?.priceUSD !== undefined) {
        const priceUpdate: PriceUpdate = {
          tokenAddress,
          price: tokenInfo.priceUSD,
          priceChange24h: tokenInfo.priceChange24h || 0,
          timestamp: new Date()
        };
        
        this.emitPriceUpdates([priceUpdate]);
        this.lastPriceUpdate.set(tokenAddress, tokenInfo.priceUSD);
      }
    } catch (error) {
      console.error(`Error forcing price update for ${tokenAddress}:`, error);
    }
  }

  /**
   * Force update for specific governance proposal
   */
  async forceGovernanceUpdate(communityId: string, proposalId?: string): Promise<void> {
    try {
      const governanceData = await governanceService.getGovernanceData(communityId);
      
      const proposals = proposalId 
        ? governanceData.activeProposals.filter(p => p.id === proposalId)
        : governanceData.activeProposals;
      
      const governanceUpdates: GovernanceUpdate[] = proposals.map(proposal => ({
        proposalId: proposal.id,
        communityId,
        votingProgress: {
          for: proposal.votingPower?.for ?? 0,
          against: proposal.votingPower?.against ?? 0,
          abstain: proposal.votingPower?.abstain ?? 0,
        },
        status: (proposal.status === 'succeeded'
          ? 'passed'
          : proposal.status === 'failed'
          ? 'failed'
          : proposal.status === 'executed'
          ? 'executed'
          : 'active'),
        timestamp: new Date()
      }));
      
      if (governanceUpdates.length > 0) {
        this.emitGovernanceUpdates(governanceUpdates);
        this.lastGovernanceUpdate.set(communityId, new Date());
      }
    } catch (error) {
      console.error(`Error forcing governance update for ${communityId}:`, error);
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    isActive: boolean;
    subscriptionCount: number;
    lastUpdates: {
      prices: number;
      governance: number;
      posts: number;
    };
  } {
    return {
      isActive: this.isActive,
      subscriptionCount: this.subscriptions.size,
      lastUpdates: {
        prices: this.lastPriceUpdate.size,
        governance: this.lastGovernanceUpdate.size,
        posts: this.lastPostUpdate.size
      }
    };
  }
}

// Export singleton instance
export const realTimeBlockchainService = RealTimeBlockchainService.getInstance();

// Export types for external use
export type {
  PriceUpdate,
  GovernanceUpdate,
  PostUpdate,
  BlockchainEventSubscription
};
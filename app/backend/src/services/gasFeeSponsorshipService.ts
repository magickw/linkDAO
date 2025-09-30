/**
 * Gas Fee Sponsorship Service
 * Manages gas fee sponsorship tiers, eligibility, and daily limits
 */

import { eq, and, desc, sum, sql } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';

export interface SponsorshipTier {
  id: string;
  name: string;
  description: string;
  coveragePercentage: number;
  requirements: {
    minReputation?: number;
    minTransactions?: number;
    daoMember?: boolean;
    stakingAmount?: string;
  };
  maxSponsorshipPerDay: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SponsorshipRequest {
  userId: string;
  transactionType: string;
  estimatedGasCost: string;
  tierId: string;
}

export interface SponsorshipApproval {
  approved: boolean;
  tier?: SponsorshipTier;
  sponsoredAmount: string;
  userPayAmount: string;
  dailyUsage: string;
  reason?: string;
}

export interface GasSponsorshipStats {
  totalSponsored: string;
  activeUsers: number;
  dailyLimit: string;
  utilizationRate: number;
  tierDistribution: Record<string, number>;
}

export class GasFeeSponsorshipService {
  
  /**
   * Get all active sponsorship tiers
   */
  async getActiveTiers(): Promise<SponsorshipTier[]> {
    try {
      // In a real implementation, this would query the database
      // For now, return hardcoded tiers
      return [
        {
          id: 'newcomer',
          name: 'Newcomer Support',
          description: 'Gas fee support for new users getting started',
          coveragePercentage: 50,
          requirements: {
            minTransactions: 10
          },
          maxSponsorshipPerDay: '0.01',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'community',
          name: 'Community Member',
          description: 'Enhanced support for active community members',
          coveragePercentage: 75,
          requirements: {
            minReputation: 100,
            minTransactions: 5
          },
          maxSponsorshipPerDay: '0.05',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'dao_member',
          name: 'DAO Member',
          description: 'Premium gas sponsorship for DAO governance participants',
          coveragePercentage: 90,
          requirements: {
            daoMember: true,
            minReputation: 250
          },
          maxSponsorshipPerDay: '0.1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'high_volume',
          name: 'High Volume Trader',
          description: 'Full gas sponsorship for frequent marketplace users',
          coveragePercentage: 100,
          requirements: {
            minTransactions: 50,
            minReputation: 500
          },
          maxSponsorshipPerDay: '0.2',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
    } catch (error) {
      console.error('Error fetching sponsorship tiers:', error);
      throw error;
    }
  }

  /**
   * Check user eligibility for sponsorship tiers
   */
  async checkEligibility(
    userId: string, 
    userReputation: number, 
    userTransactionCount: number, 
    isDaoMember: boolean
  ): Promise<SponsorshipTier[]> {
    try {
      const tiers = await this.getActiveTiers();
      
      return tiers.filter(tier => {
        const { requirements } = tier;
        
        if (requirements.minReputation && userReputation < requirements.minReputation) return false;
        if (requirements.minTransactions && userTransactionCount < requirements.minTransactions) return false;
        if (requirements.daoMember && !isDaoMember) return false;
        
        return true;
      }).sort((a, b) => b.coveragePercentage - a.coveragePercentage);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      throw error;
    }
  }

  /**
   * Get user's daily sponsorship usage
   */
  async getDailyUsage(userId: string): Promise<string> {
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // In a real implementation, this would query the gas sponsorship logs
      // For now, return mock data
      const mockUsage = Math.random() * 0.05; // Random usage up to 0.05 ETH
      return mockUsage.toFixed(6);
      
    } catch (error) {
      console.error('Error getting daily usage:', error);
      return '0';
    }
  }

  /**
   * Apply for gas fee sponsorship
   */
  async applyForSponsorship(request: SponsorshipRequest): Promise<SponsorshipApproval> {
    try {
      const tiers = await this.getActiveTiers();
      const tier = tiers.find(t => t.id === request.tierId);
      
      if (!tier) {
        return {
          approved: false,
          sponsoredAmount: '0',
          userPayAmount: request.estimatedGasCost,
          dailyUsage: '0',
          reason: 'Invalid sponsorship tier'
        };
      }

      // Check daily usage
      const dailyUsage = parseFloat(await this.getDailyUsage(request.userId));
      const maxDaily = parseFloat(tier.maxSponsorshipPerDay);
      const gasCost = parseFloat(request.estimatedGasCost);
      const sponsoredAmount = gasCost * (tier.coveragePercentage / 100);
      
      if (dailyUsage + sponsoredAmount > maxDaily) {
        return {
          approved: false,
          sponsoredAmount: '0',
          userPayAmount: request.estimatedGasCost,
          dailyUsage: dailyUsage.toString(),
          reason: 'Daily sponsorship limit exceeded'
        };
      }

      return {
        approved: true,
        tier,
        sponsoredAmount: sponsoredAmount.toString(),
        userPayAmount: (gasCost - sponsoredAmount).toString(),
        dailyUsage: (dailyUsage + sponsoredAmount).toString()
      };
    } catch (error) {
      console.error('Error applying for sponsorship:', error);
      throw error;
    }
  }

  /**
   * Get sponsorship statistics
   */
  async getSponsorshipStats(): Promise<GasSponsorshipStats> {
    try {
      // In a real implementation, this would query the database
      // For now, return mock data
      return {
        totalSponsored: '10.5',
        activeUsers: 1247,
        dailyLimit: '50.0',
        utilizationRate: 0.21,
        tierDistribution: {
          newcomer: 45,
          community: 30,
          dao_member: 20,
          high_volume: 5
        }
      };
    } catch (error) {
      console.error('Error getting sponsorship stats:', error);
      throw error;
    }
  }

  /**
   * Get user sponsorship history
   */
  async getUserSponsorshipHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      // In a real implementation, this would query the database
      // For now, return mock data
      return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
        id: `tx_${Date.now() - i * 1000}`,
        userId,
        transactionType: ['post', 'comment', 'vote', 'tip'][Math.floor(Math.random() * 4)],
        sponsoredAmount: (Math.random() * 0.01).toFixed(6),
        userPayAmount: (Math.random() * 0.005).toFixed(6),
        timestamp: new Date(Date.now() - i * 3600000)
      }));
    } catch (error) {
      console.error('Error getting user sponsorship history:', error);
      throw error;
    }
  }

  /**
   * Get gas estimates for different transaction types
   */
  getGasEstimates(): Record<string, string> {
    // Return mock gas estimates in ETH
    return {
      post: '0.001',
      comment: '0.0005',
      vote: '0.0003',
      tip: '0.0008',
      follow: '0.0002',
      createProposal: '0.002',
      voteOnProposal: '0.0005'
    };
  }

  /**
   * Get sponsorship pool balance
   */
  async getSponsorshipPoolBalance(): Promise<string> {
    try {
      // In a real implementation, this would query the database or blockchain
      // For now, return mock data
      return '150.75';
    } catch (error) {
      console.error('Error getting pool balance:', error);
      throw error;
    }
  }

  /**
   * Check pool health
   */
  async checkPoolHealth(): Promise<{ status: string; message: string }> {
    try {
      const balance = parseFloat(await this.getSponsorshipPoolBalance());
      
      if (balance > 100) {
        return { status: 'healthy', message: 'Pool has sufficient funds' };
      } else if (balance > 50) {
        return { status: 'warning', message: 'Pool funds are getting low' };
      } else {
        return { status: 'critical', message: 'Pool funds critically low' };
      }
    } catch (error) {
      console.error('Error checking pool health:', error);
      throw error;
    }
  }

  /**
   * Update sponsorship tier
   */
  async updateTier(tierId: string, updates: Partial<SponsorshipTier>): Promise<void> {
    try {
      // In a real implementation, this would update the database
      console.log(`Updating tier ${tierId} with updates:`, updates);
    } catch (error) {
      console.error('Error updating tier:', error);
      throw error;
    }
  }

  /**
   * Create new sponsorship tier
   */
  async createTier(tierData: Omit<SponsorshipTier, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // In a real implementation, this would insert into the database
      console.log('Creating new tier:', tierData);
      return `tier_${Date.now()}`;
    } catch (error) {
      console.error('Error creating tier:', error);
      throw error;
    }
  }
}
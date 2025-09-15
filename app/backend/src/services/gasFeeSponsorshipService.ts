/**
 * Gas Fee Sponsorship Service
 * Manages gas fee sponsorship tiers, eligibility, and daily limits
 */

import { eq, and, desc, sum, sql } from 'drizzle-orm';
import { db } from '../db';
import { users, sponsorshipTiers, gasSponsorshipLogs } from '../db/schema';

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
            maxTransactions: 10
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
        if (requirements.maxTransactions && userTransactionCount > requirements.maxTransactions) return false;
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

      // Check sponsorship pool balance
      const poolBalance = await this.getSponsorshipPoolBalance();
      if (parseFloat(poolBalance) < sponsoredAmount) {
        return {
          approved: false,
          sponsoredAmount: '0',
          userPayAmount: request.estimatedGasCost,
          dailyUsage: dailyUsage.toString(),
          reason: 'Insufficient sponsorship pool balance'
        };
      }

      // Approve sponsorship
      const userPayAmount = gasCost - sponsoredAmount;
      
      // Log the sponsorship
      await this.logSponsorship({
        userId: request.userId,
        tierId: request.tierId,
        transactionType: request.transactionType,
        originalGasCost: request.estimatedGasCost,
        sponsoredAmount: sponsoredAmount.toString(),
        userPaidAmount: userPayAmount.toString()
      });

      return {
        approved: true,
        tier,
        sponsoredAmount: sponsoredAmount.toString(),
        userPayAmount: userPayAmount.toString(),
        dailyUsage: (dailyUsage + sponsoredAmount).toString()
      };

    } catch (error) {
      console.error('Error applying for sponsorship:', error);
      return {
        approved: false,
        sponsoredAmount: '0',
        userPayAmount: request.estimatedGasCost,
        dailyUsage: '0',
        reason: 'Internal error occurred'
      };
    }
  }

  /**
   * Get sponsorship pool balance
   */
  async getSponsorshipPoolBalance(): Promise<string> {
    try {
      // In a real implementation, this would check the DAO treasury balance
      // allocated for gas sponsorship
      return '50.0'; // Mock 50 ETH available
    } catch (error) {
      console.error('Error getting pool balance:', error);
      return '0';
    }
  }

  /**
   * Log sponsorship transaction
   */
  async logSponsorship(logData: {
    userId: string;
    tierId: string;
    transactionType: string;
    originalGasCost: string;
    sponsoredAmount: string;
    userPaidAmount: string;
  }): Promise<void> {
    try {
      // In a real implementation, this would insert into gas sponsorship logs table
      console.log('Sponsorship logged:', logData);
      
      // Mock implementation - would actually save to database
      const logEntry = {
        ...logData,
        timestamp: new Date(),
        status: 'completed'
      };
      
    } catch (error) {
      console.error('Error logging sponsorship:', error);
      throw error;
    }
  }

  /**
   * Get sponsorship statistics
   */
  async getSponsorshipStats(): Promise<GasSponsorshipStats> {
    try {
      // In a real implementation, this would aggregate data from the database
      // For now, return mock statistics
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return {
        totalSponsored: '2.45', // Total ETH sponsored today
        activeUsers: 1247, // Number of users who received sponsorship today
        dailyLimit: '10.0', // Total daily sponsorship limit
        utilizationRate: 24.5, // Percentage of daily limit used
        tierDistribution: {
          'newcomer': 45,
          'community': 30,
          'dao_member': 20,
          'high_volume': 5
        }
      };
    } catch (error) {
      console.error('Error getting sponsorship stats:', error);
      throw error;
    }
  }

  /**
   * Get user's sponsorship history
   */
  async getUserSponsorshipHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      // In a real implementation, this would query the sponsorship logs
      // For now, return mock history
      
      return [
        {
          id: '1',
          transactionType: 'marketplace_purchase',
          tierName: 'Community Member',
          originalCost: '0.008',
          sponsoredAmount: '0.006',
          userPaid: '0.002',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          status: 'completed'
        },
        {
          id: '2',
          transactionType: 'escrow_create',
          tierName: 'Community Member',
          originalCost: '0.012',
          sponsoredAmount: '0.009',
          userPaid: '0.003',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          status: 'completed'
        }
      ];
    } catch (error) {
      console.error('Error getting user sponsorship history:', error);
      return [];
    }
  }

  /**
   * Update sponsorship tier
   */
  async updateTier(tierId: string, updates: Partial<SponsorshipTier>): Promise<void> {
    try {
      // In a real implementation, this would update the tier in the database
      console.log(`Updating tier ${tierId}:`, updates);
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
      const tierId = `tier_${Date.now()}`;
      console.log('Creating new tier:', { id: tierId, ...tierData });
      return tierId;
    } catch (error) {
      console.error('Error creating tier:', error);
      throw error;
    }
  }

  /**
   * Estimate gas costs for different transaction types
   */
  getGasEstimates(): Record<string, { gasLimit: number; description: string }> {
    return {
      'marketplace_purchase': {
        gasLimit: 150000,
        description: 'Purchase item from marketplace'
      },
      'escrow_create': {
        gasLimit: 200000,
        description: 'Create escrow for transaction'
      },
      'dispute_resolve': {
        gasLimit: 100000,
        description: 'Resolve marketplace dispute'
      },
      'dao_vote': {
        gasLimit: 80000,
        description: 'Cast vote in DAO governance'
      },
      'token_transfer': {
        gasLimit: 21000,
        description: 'Transfer ERC-20 tokens'
      }
    };
  }

  /**
   * Check if sponsorship pool needs refilling
   */
  async checkPoolHealth(): Promise<{
    needsRefill: boolean;
    currentBalance: string;
    recommendedRefill: string;
    utilizationTrend: 'increasing' | 'stable' | 'decreasing';
  }> {
    try {
      const balance = parseFloat(await this.getSponsorshipPoolBalance());
      const stats = await this.getSponsorshipStats();
      const dailyUsage = parseFloat(stats.totalSponsored);
      
      // Calculate if pool needs refilling (less than 7 days at current usage)
      const daysRemaining = balance / dailyUsage;
      const needsRefill = daysRemaining < 7;
      
      return {
        needsRefill,
        currentBalance: balance.toString(),
        recommendedRefill: (dailyUsage * 10).toString(), // 10 days worth
        utilizationTrend: 'stable' // Would calculate from historical data
      };
    } catch (error) {
      console.error('Error checking pool health:', error);
      throw error;
    }
  }
}", "original_text": "", "replace_all": false}]
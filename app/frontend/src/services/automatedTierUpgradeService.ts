/**
 * Automated Tier Upgrade Service (Frontend)
 * Handles client-side tier upgrade functionality
 */

import { unifiedSellerAPIClient } from './unifiedSellerAPIClient';

export interface TierProgressionData {
  currentTier: string;
  nextTier: string | null;
  progressPercentage: number;
  requirementsMet: Array<{
    requirement: string;
    current: number;
    required: number;
    met: boolean;
  }>;
  nextEvaluationDate: string;
  estimatedUpgradeTime: number | null;
}

export interface TierEvaluationResult {
  sellerId: string;
  walletAddress: string;
  currentTier: string;
  evaluatedTier: string;
  upgradeEligible: boolean;
  requirementsMet: Array<{
    requirement: string;
    current: number;
    required: number;
    met: boolean;
  }>;
  nextEvaluationDate: string;
  upgradeDate?: string;
}

export interface TierCriteria {
  tierId: string;
  name: string;
  level: number;
  requirements: {
    salesVolume?: number;
    averageRating?: number;
    totalReviews?: number;
    timeActive?: number;
    disputeRate?: number;
    responseTime?: number;
    completionRate?: number;
  };
  benefits: {
    listingLimit: number;
    commissionRate: number;
    prioritySupport: boolean;
    analyticsAccess: 'basic' | 'advanced' | 'premium';
    customBranding: boolean;
    featuredPlacement: boolean;
  };
}

export interface TierUpgradeNotification {
  id: string;
  sellerId: string;
  walletAddress: string;
  fromTier: string;
  toTier: string;
  upgradeDate: string;
  newBenefits: string[];
  congratulatoryMessage: string;
  read: boolean;
  createdAt: string;
}

class AutomatedTierUpgradeService {
  private baseUrl = '/api/marketplace/seller/tier';

  /**
   * Get tier progression tracking for a seller
   */
  async getTierProgressionTracking(walletAddress: string): Promise<TierProgressionData> {
    try {
      const response = await unifiedSellerAPIClient.request<{ data: TierProgressionData }>(
        `${this.baseUrl}/progression/${walletAddress}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting tier progression tracking:', error);
      throw new Error('Failed to get tier progression tracking');
    }
  }

  /**
   * Trigger manual tier evaluation
   */
  async triggerTierEvaluation(walletAddress: string, force: boolean = false): Promise<TierEvaluationResult> {
    try {
      const response = await unifiedSellerAPIClient.request<{ data: TierEvaluationResult }>(
        `${this.baseUrl}/evaluate`,
        {
          method: 'POST',
          body: JSON.stringify({ walletAddress, force }),
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error triggering tier evaluation:', error);
      throw new Error('Failed to trigger tier evaluation');
    }
  }

  /**
   * Get tier criteria and requirements
   */
  async getTierCriteria(): Promise<TierCriteria[]> {
    try {
      const response = await unifiedSellerAPIClient.request<{ data: TierCriteria[] }>(
        `${this.baseUrl}/criteria`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting tier criteria:', error);
      throw new Error('Failed to get tier criteria');
    }
  }

  /**
   * Get evaluation statistics
   */
  async getEvaluationStatistics(): Promise<any> {
    try {
      const response = await unifiedSellerAPIClient.request<{ data: any }>(
        `${this.baseUrl}/statistics`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting evaluation statistics:', error);
      throw new Error('Failed to get evaluation statistics');
    }
  }

  /**
   * Get tier evaluation history
   */
  async getTierEvaluationHistory(walletAddress: string): Promise<any> {
    try {
      const response = await unifiedSellerAPIClient.request<{ data: any }>(
        `${this.baseUrl}/history/${walletAddress}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting tier evaluation history:', error);
      throw new Error('Failed to get tier evaluation history');
    }
  }

  /**
   * Get tier upgrade notifications
   */
  async getTierUpgradeNotifications(walletAddress: string): Promise<{
    notifications: TierUpgradeNotification[];
    unreadCount: number;
  }> {
    try {
      const response = await unifiedSellerAPIClient.request<{ 
        data: { 
          notifications: TierUpgradeNotification[];
          unreadCount: number;
        }
      }>(`${this.baseUrl}/notifications/${walletAddress}`);
      return response.data;
    } catch (error) {
      console.error('Error getting tier upgrade notifications:', error);
      throw new Error('Failed to get tier upgrade notifications');
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<any> {
    try {
      const response = await unifiedSellerAPIClient.request<any>(
        `${this.baseUrl}/health`
      );
      return response;
    } catch (error) {
      console.error('Error checking service health:', error);
      throw new Error('Failed to check service health');
    }
  }

  /**
   * Calculate progress percentage for display
   */
  calculateProgressPercentage(requirementsMet: Array<{ met: boolean }>): number {
    if (!requirementsMet.length) return 0;
    const metCount = requirementsMet.filter(req => req.met).length;
    return Math.round((metCount / requirementsMet.length) * 100);
  }

  /**
   * Get next tier name
   */
  getNextTierName(currentTier: string): string | null {
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tierOrder.indexOf(currentTier.toLowerCase());
    
    if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
      return null;
    }
    
    return tierOrder[currentIndex + 1];
  }

  /**
   * Format tier name for display
   */
  formatTierName(tier: string): string {
    return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
  }

  /**
   * Get tier color
   */
  getTierColor(tier: string): string {
    const colors: Record<string, string> = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2',
    };
    return colors[tier.toLowerCase()] || '#6B7280';
  }

  /**
   * Get tier icon
   */
  getTierIcon(tier: string): string {
    const icons: Record<string, string> = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎',
    };
    return icons[tier.toLowerCase()] || '⭐';
  }

  /**
   * Format requirement description
   */
  formatRequirementDescription(requirement: string, current: number, required: number): string {
    switch (requirement.toLowerCase()) {
      case 'sales volume':
        return `$${current.toLocaleString()} / $${required.toLocaleString()} in sales`;
      case 'average rating':
        return `${current.toFixed(1)} / ${required.toFixed(1)} star rating`;
      case 'total reviews':
        return `${current} / ${required} reviews`;
      case 'time active (days)':
        return `${current} / ${required} days active`;
      default:
        return `${current} / ${required}`;
    }
  }

  /**
   * Get estimated time to upgrade in human-readable format
   */
  formatEstimatedUpgradeTime(days: number | null): string {
    if (days === null) return 'Unknown';
    if (days === 0) return 'Eligible now!';
    if (days < 7) return `${days} day${days === 1 ? '' : 's'}`;
    if (days < 30) return `${Math.ceil(days / 7)} week${Math.ceil(days / 7) === 1 ? '' : 's'}`;
    return `${Math.ceil(days / 30)} month${Math.ceil(days / 30) === 1 ? '' : 's'}`;
  }

  /**
   * Check if seller can trigger manual evaluation
   */
  canTriggerManualEvaluation(lastEvaluationDate: string | null): boolean {
    if (!lastEvaluationDate) return true;
    
    const lastEvaluation = new Date(lastEvaluationDate);
    const now = new Date();
    const hoursSinceLastEvaluation = (now.getTime() - lastEvaluation.getTime()) / (1000 * 60 * 60);
    
    // Allow manual evaluation once per hour
    return hoursSinceLastEvaluation >= 1;
  }

  /**
   * Get benefit description
   */
  getBenefitDescription(benefit: any): string {
    switch (benefit.type) {
      case 'listing_limit':
        return `Create up to ${benefit.value} listings`;
      case 'commission_rate':
        return `${benefit.value}% platform commission`;
      case 'priority_support':
        return 'Priority customer support';
      case 'analytics_access':
        return `${benefit.value} analytics access`;
      case 'custom_branding':
        return 'Custom branding options';
      case 'featured_placement':
        return 'Featured placement eligibility';
      default:
        return benefit.description || 'Unknown benefit';
    }
  }

  /**
   * Sort requirements by priority for display
   */
  sortRequirementsByPriority(requirements: Array<{ requirement: string; met: boolean }>): Array<{ requirement: string; met: boolean }> {
    const priority = ['Sales Volume', 'Average Rating', 'Total Reviews', 'Time Active (days)'];
    
    return requirements.sort((a, b) => {
      const aIndex = priority.indexOf(a.requirement);
      const bIndex = priority.indexOf(b.requirement);
      
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      return aIndex - bIndex;
    });
  }
}

export const automatedTierUpgradeService = new AutomatedTierUpgradeService();
export default automatedTierUpgradeService;
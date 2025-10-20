/**
 * Tier Management Service
 * Handles all tier-related operations and validations
 */

import { 
  SellerTier, 
  TierProgress, 
  TierUpgradeInfo, 
  TierValidationResult,
  TierRequirement,
  TIER_LEVELS,
  TIER_ACTIONS,
  TierAction
} from '../types/sellerTier';
import { unifiedSellerAPIClient } from './unifiedSellerAPIClient';

class TierManagementService {
  private apiBaseUrl = '/api/marketplace/seller';
  private tierCache = new Map<string, { tier: SellerTier; timestamp: number }>();
  private readonly CACHE_DURATION = 300000; // 5 minutes

  // Default tier definitions
  private defaultTiers: SellerTier[] = [
    {
      id: 'bronze',
      name: 'Bronze',
      level: TIER_LEVELS.BRONZE,
      color: '#CD7F32',
      icon: '🥉',
      requirements: [],
      benefits: [
        {
          type: 'listing_limit',
          description: 'Create up to 5 listings',
          value: 5,
          enabled: true,
        },
        {
          type: 'commission_rate',
          description: '5% platform commission',
          value: 5,
          enabled: true,
        },
      ],
      limitations: [
        {
          type: 'listing_limit',
          description: 'Maximum 5 active listings',
          value: 5,
          enforced: true,
        },
        {
          type: 'feature_access',
          description: 'Basic features only',
          value: 'basic',
          enforced: true,
        },
      ],
      upgradeThreshold: 80,
      isActive: true,
    },
    {
      id: 'silver',
      name: 'Silver',
      level: TIER_LEVELS.SILVER,
      color: '#C0C0C0',
      icon: '🥈',
      requirements: [
        {
          type: 'sales_volume',
          value: 1000,
          current: 0,
          met: false,
          description: 'Complete $1,000 in sales',
        },
        {
          type: 'rating',
          value: 4.0,
          current: 0,
          met: false,
          description: 'Maintain 4.0+ star rating',
        },
      ],
      benefits: [
        {
          type: 'listing_limit',
          description: 'Create up to 15 listings',
          value: 15,
          enabled: true,
        },
        {
          type: 'commission_rate',
          description: '4% platform commission',
          value: 4,
          enabled: true,
        },
        {
          type: 'analytics_access',
          description: 'Basic analytics dashboard',
          value: 'basic',
          enabled: true,
        },
      ],
      limitations: [
        {
          type: 'listing_limit',
          description: 'Maximum 15 active listings',
          value: 15,
          enforced: true,
        },
      ],
      upgradeThreshold: 80,
      isActive: true,
    },
    {
      id: 'gold',
      name: 'Gold',
      level: TIER_LEVELS.GOLD,
      color: '#FFD700',
      icon: '🥇',
      requirements: [
        {
          type: 'sales_volume',
          value: 5000,
          current: 0,
          met: false,
          description: 'Complete $5,000 in sales',
        },
        {
          type: 'rating',
          value: 4.5,
          current: 0,
          met: false,
          description: 'Maintain 4.5+ star rating',
        },
        {
          type: 'reviews',
          value: 50,
          current: 0,
          met: false,
          description: 'Receive 50+ reviews',
        },
      ],
      benefits: [
        {
          type: 'listing_limit',
          description: 'Create up to 50 listings',
          value: 50,
          enabled: true,
        },
        {
          type: 'commission_rate',
          description: '3% platform commission',
          value: 3,
          enabled: true,
        },
        {
          type: 'analytics_access',
          description: 'Advanced analytics dashboard',
          value: 'advanced',
          enabled: true,
        },
        {
          type: 'priority_support',
          description: 'Priority customer support',
          value: 'priority',
          enabled: true,
        },
      ],
      limitations: [
        {
          type: 'listing_limit',
          description: 'Maximum 50 active listings',
          value: 50,
          enforced: true,
        },
      ],
      upgradeThreshold: 80,
      isActive: true,
    },
  ];

  async getSellerTier(walletAddress: string): Promise<SellerTier> {
    // Check cache first
    const cached = this.tierCache.get(walletAddress);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.tier;
    }

    try {
      const tierData = await unifiedSellerAPIClient.getSellerTier(walletAddress);
      const tier = tierData || this.defaultTiers[0]; // Default to Bronze
      
      // Cache the result
      this.tierCache.set(walletAddress, { tier, timestamp: Date.now() });
      
      return tier;
    } catch (error) {
      console.error('Error fetching seller tier:', error);
      const fallbackTier = this.defaultTiers[0]; // Fallback to Bronze tier
      
      // Cache fallback for a shorter duration
      this.tierCache.set(walletAddress, { tier: fallbackTier, timestamp: Date.now() - this.CACHE_DURATION + 60000 });
      
      return fallbackTier;
    }
  }

  async getTierProgress(walletAddress: string): Promise<TierProgress> {
    try {
      const progressData = await unifiedSellerAPIClient.getTierProgress(walletAddress);
      return progressData;
    } catch (error) {
      console.error('Error fetching tier progress:', error);
      const currentTier = await this.getSellerTier(walletAddress);
      const nextTier = this.getNextTier(currentTier);
      
      return {
        currentTier,
        nextTier,
        progressPercentage: 0,
        requirementsMet: 0,
        totalRequirements: nextTier?.requirements.length || 0,
        estimatedUpgradeTime: null,
      };
    }
  }

  async checkTierUpgradeEligibility(walletAddress: string): Promise<TierUpgradeInfo> {
    try {
      const upgradeInfo = await unifiedSellerAPIClient.getTierUpgradeEligibility(walletAddress);
      return upgradeInfo;
    } catch (error) {
      console.error('Error checking tier upgrade eligibility:', error);
      const currentTier = await this.getSellerTier(walletAddress);
      const nextTier = this.getNextTier(currentTier);
      
      return {
        canUpgrade: false,
        nextTier,
        missingRequirements: nextTier?.requirements || [],
        upgradeActions: [],
        estimatedTimeToUpgrade: null,
      };
    }
  }

  async validateTierAction(walletAddress: string, action: TierAction): Promise<TierValidationResult> {
    try {
      const tier = await this.getSellerTier(walletAddress);
      return this.isActionAllowed(tier, action);
    } catch (error) {
      console.error('Error validating tier action:', error);
      return {
        isAllowed: false,
        reason: 'Unable to validate tier permissions',
        upgradeRequired: true,
      };
    }
  }

  private isActionAllowed(tier: SellerTier, action: TierAction): TierValidationResult {
    switch (action) {
      case TIER_ACTIONS.CREATE_LISTING:
        const listingLimit = tier.benefits.find(b => b.type === 'listing_limit');
        if (!listingLimit) {
          return {
            isAllowed: false,
            reason: 'Listing creation not available for your tier',
            upgradeRequired: true,
          };
        }
        return { isAllowed: true };

      case TIER_ACTIONS.ACCESS_ANALYTICS:
        const analyticsAccess = tier.benefits.find(b => b.type === 'analytics_access');
        if (!analyticsAccess) {
          return {
            isAllowed: false,
            reason: 'Analytics access requires Silver tier or higher',
            alternativeAction: 'Upgrade to Silver tier to access analytics',
            upgradeRequired: true,
          };
        }
        return { isAllowed: true };

      case TIER_ACTIONS.PRIORITY_SUPPORT:
        const prioritySupport = tier.benefits.find(b => b.type === 'priority_support');
        if (!prioritySupport) {
          return {
            isAllowed: false,
            reason: 'Priority support requires Gold tier or higher',
            alternativeAction: 'Upgrade to Gold tier for priority support',
            upgradeRequired: true,
          };
        }
        return { isAllowed: true };

      case TIER_ACTIONS.CUSTOM_BRANDING:
        if (tier.level < TIER_LEVELS.GOLD) {
          return {
            isAllowed: false,
            reason: 'Custom branding requires Gold tier or higher',
            alternativeAction: 'Upgrade to Gold tier for custom branding',
            upgradeRequired: true,
          };
        }
        return { isAllowed: true };

      case TIER_ACTIONS.FEATURED_PLACEMENT:
        if (tier.level < TIER_LEVELS.PLATINUM) {
          return {
            isAllowed: false,
            reason: 'Featured placement requires Platinum tier or higher',
            alternativeAction: 'Upgrade to Platinum tier for featured placement',
            upgradeRequired: true,
          };
        }
        return { isAllowed: true };

      default:
        return { isAllowed: true };
    }
  }

  private getNextTier(currentTier: SellerTier): SellerTier | null {
    const nextLevel = currentTier.level + 1;
    return this.defaultTiers.find(tier => tier.level === nextLevel) || null;
  }

  async refreshTierData(walletAddress: string): Promise<void> {
    try {
      await unifiedSellerAPIClient.refreshTierData(walletAddress);
      // Clear cache to force fresh data on next request
      this.tierCache.delete(walletAddress);
    } catch (error) {
      console.error('Error refreshing tier data:', error);
    }
  }

  // Clear tier cache for a specific wallet or all wallets
  clearTierCache(walletAddress?: string): void {
    if (walletAddress) {
      this.tierCache.delete(walletAddress);
    } else {
      this.tierCache.clear();
    }
  }

  // Check if tier data is cached and valid
  isTierCached(walletAddress: string): boolean {
    const cached = this.tierCache.get(walletAddress);
    return cached ? Date.now() - cached.timestamp < this.CACHE_DURATION : false;
  }

  getAllTiers(): SellerTier[] {
    return this.defaultTiers;
  }

  getTierById(tierId: string): SellerTier | null {
    return this.defaultTiers.find(tier => tier.id === tierId) || null;
  }

  getTierByLevel(level: number): SellerTier | null {
    return this.defaultTiers.find(tier => tier.level === level) || null;
  }
}

export const tierManagementService = new TierManagementService();
export default tierManagementService;
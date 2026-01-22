/**
 * Seller Tier Service
 * 
 * Manages seller tier system with upgrade functionality, benefits, and requirements.
 * 
 * Tiers:
 * - Basic: Free tier with basic features
 * - Standard: Enhanced features, lower fees
 * - Premium: Full features, lowest fees, priority support
 * - Enterprise: Custom solutions, dedicated support
 */

import apiClient from './apiClient';

// Seller tiers
export enum SellerTier {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

// Seller tier configuration
export interface SellerTierConfig {
  tier: SellerTier;
  name: string;
  description: string;
  monthlyFee: number;
  transactionFee: number; // Percentage
  maxListings: number;
  features: string[];
  benefits: TierBenefit[];
  requirements: TierRequirement[];
  upgradeFrom?: SellerTier[];
  downgradeTo?: SellerTier[];
}

// Tier benefit
export interface TierBenefit {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

// Tier requirement
export interface TierRequirement {
  type: 'sales_volume' | 'listing_count' | 'rating' | 'verification' | 'payment';
  value: number | string;
  description: string;
}

// Seller profile
export interface SellerProfile {
  id: string;
  userId: string;
  currentTier: SellerTier;
  tierStartDate: Date;
  tierEndDate?: Date;
  isAutoRenew: boolean;
  stats: SellerStats;
  upgradeHistory: TierUpgradeHistory[];
}

// Seller statistics
export interface SellerStats {
  totalSales: number;
  totalRevenue: number;
  totalListings: number;
  activeListings: number;
  averageRating: number;
  totalReviews: number;
  monthSales: number;
  monthRevenue: number;
  customerSatisfaction: number;
}

// Tier upgrade history
export interface TierUpgradeHistory {
  id: string;
  fromTier: SellerTier;
  toTier: SellerTier;
  upgradeDate: Date;
  paymentMethod: string;
  amount: number;
  duration: number; // Months
}

// Upgrade request
export interface UpgradeRequest {
  toTier: SellerTier;
  duration: number; // Months
  paymentMethod: 'crypto' | 'fiat' | 'credits';
  promoCode?: string;
}

// Upgrade response
export interface UpgradeResponse {
  success: boolean;
  newTier: SellerTier;
  startDate: Date;
  endDate: Date;
  paymentId?: string;
  transactionId?: string;
  error?: string;
}

// Tier comparison
export interface TierComparison {
  tiers: SellerTierConfig[];
  currentTier: SellerTier;
  recommendedTier?: SellerTier;
  savings?: {
    monthly: number;
    annual: number;
  };
}

class SellerTierService {
  private tierConfigs: Map<SellerTier, SellerTierConfig> = new Map();

  constructor() {
    this.initializeTierConfigs();
  }

  /**
   * Initialize tier configurations
   */
  private initializeTierConfigs(): void {
    const configs: SellerTierConfig[] = [
      {
        tier: SellerTier.BASIC,
        name: 'Basic',
        description: 'Get started with essential selling tools',
        monthlyFee: 0,
        transactionFee: 5.0, // 5%
        maxListings: 10,
        features: [
          'Basic listing tools',
          'Standard analytics',
          'Email support',
          'Community forum access',
        ],
        benefits: [
          {
            id: 'free',
            name: 'Free to use',
            description: 'No monthly subscription fee',
          },
          {
            id: 'basic-listings',
            name: 'Up to 10 listings',
            description: 'Create up to 10 active product listings',
          },
          {
            id: 'standard-analytics',
            name: 'Basic analytics',
            description: 'Track views and sales',
          },
        ],
        requirements: [
          {
            type: 'verification',
            value: 'email',
            description: 'Email verification required',
          },
        ],
        downgradeTo: [],
      },
      {
        tier: SellerTier.STANDARD,
        name: 'Standard',
        description: 'Enhanced features for growing sellers',
        monthlyFee: 29.99,
        transactionFee: 3.5, // 3.5%
        maxListings: 50,
        features: [
          'All Basic features',
          'Advanced analytics',
          'Priority support',
          'Bulk listing tools',
          'Promotional tools',
          'Custom branding',
        ],
        benefits: [
          {
            id: 'lower-fees',
            name: 'Lower transaction fees',
            description: '3.5% fee vs 5% on Basic',
          },
          {
            id: 'more-listings',
            name: 'Up to 50 listings',
            description: '5x more listings than Basic',
          },
          {
            id: 'priority-support',
            name: 'Priority support',
            description: '24-48 hour response time',
          },
          {
            id: 'bulk-tools',
            name: 'Bulk operations',
            description: 'Create and manage multiple listings at once',
          },
        ],
        requirements: [
          {
            type: 'verification',
            value: 'identity',
            description: 'Identity verification required',
          },
          {
            type: 'sales_volume',
            value: 1000,
            description: '$1,000+ in monthly sales recommended',
          },
        ],
        upgradeFrom: [SellerTier.BASIC],
        downgradeTo: [SellerTier.BASIC],
      },
      {
        tier: SellerTier.PREMIUM,
        name: 'Premium',
        description: 'Full-featured solution for professional sellers',
        monthlyFee: 99.99,
        transactionFee: 2.0, // 2%
        maxListings: 200,
        features: [
          'All Standard features',
          'Lowest transaction fees',
          'Dedicated support',
          'API access',
          'Advanced marketing tools',
          'Custom store branding',
          'Featured listings',
          'Seller analytics dashboard',
          'Multi-currency support',
        ],
        benefits: [
          {
            id: 'lowest-fees',
            name: 'Lowest transaction fees',
            description: '2% fee vs 5% on Basic',
          },
          {
            id: 'unlimited-listings',
            name: 'Up to 200 listings',
            description: '20x more listings than Basic',
          },
          {
            id: 'dedicated-support',
            name: 'Dedicated support',
            description: 'Personal account manager',
          },
          {
            id: 'api-access',
            name: 'API access',
            description: 'Integrate with your existing systems',
          },
          {
            id: 'featured-listings',
            name: 'Featured listings',
            description: 'Get your products highlighted',
          },
        ],
        requirements: [
          {
            type: 'verification',
            value: 'business',
            description: 'Business verification required',
          },
          {
            type: 'sales_volume',
            value: 5000,
            description: '$5,000+ in monthly sales recommended',
          },
          {
            type: 'rating',
            value: 4.5,
            description: '4.5+ star rating required',
          },
        ],
        upgradeFrom: [SellerTier.BASIC, SellerTier.STANDARD],
        downgradeTo: [SellerTier.BASIC, SellerTier.STANDARD],
      },
      {
        tier: SellerTier.ENTERPRISE,
        name: 'Enterprise',
        description: 'Custom solutions for large-scale operations',
        monthlyFee: 499.99,
        transactionFee: 1.0, // 1%
        maxListings: -1, // Unlimited
        features: [
          'All Premium features',
          'Unlimited listings',
          'White-label solution',
          'Custom integrations',
          'Dedicated account team',
          '24/7 phone support',
          'Custom fee structure',
          'Volume discounts',
          'Advanced security features',
          'Compliance support',
        ],
        benefits: [
          {
            id: 'unlimited',
            name: 'Unlimited listings',
            description: 'No limit on active listings',
          },
          {
            id: 'lowest-fees',
            name: 'Lowest transaction fees',
            description: '1% fee - best rate available',
          },
          {
            id: 'custom-solution',
            name: 'Custom solution',
            description: 'Tailored to your business needs',
          },
          {
            id: 'dedicated-team',
            name: 'Dedicated team',
            description: '24/7 dedicated support team',
          },
        ],
        requirements: [
          {
            type: 'verification',
            value: 'enterprise',
            description: 'Enterprise verification required',
          },
          {
            type: 'sales_volume',
            value: 50000,
            description: '$50,000+ in monthly sales required',
          },
          {
            type: 'listing_count',
            value: 100,
            description: '100+ active listings',
          },
        ],
        upgradeFrom: [SellerTier.BASIC, SellerTier.STANDARD, SellerTier.PREMIUM],
        downgradeTo: [SellerTier.BASIC, SellerTier.STANDARD, SellerTier.PREMIUM],
      },
    ];

    configs.forEach(config => {
      this.tierConfigs.set(config.tier, config);
    });
  }

  /**
   * Get tier configuration
   */
  getTierConfig(tier: SellerTier): SellerTierConfig | undefined {
    return this.tierConfigs.get(tier);
  }

  /**
   * Get all tier configurations
   */
  getAllTierConfigs(): SellerTierConfig[] {
    return Array.from(this.tierConfigs.values());
  }

  /**
   * Get seller profile
   */
  async getSellerProfile(sellerId: string): Promise<SellerProfile> {
    try {
      const response = await apiClient.get(`/sellers/${sellerId}/tier-profile`);
      return response.data;
    } catch (error) {
      console.error('Error fetching seller profile:', error);
      throw new Error('Failed to fetch seller profile');
    }
  }

  /**
   * Upgrade seller tier
   */
  async upgradeTier(
    sellerId: string,
    request: UpgradeRequest
  ): Promise<UpgradeResponse> {
    try {
      const config = this.getTierConfig(request.toTier);
      if (!config) {
        throw new Error('Invalid tier');
      }

      // Calculate total cost
      const totalCost = config.monthlyFee * request.duration;

      const response = await apiClient.post(`/sellers/${sellerId}/upgrade`, {
        toTier: request.toTier,
        duration: request.duration,
        paymentMethod: request.paymentMethod,
        promoCode: request.promoCode,
        amount: totalCost,
      });

      return response.data;
    } catch (error) {
      console.error('Error upgrading tier:', error);
      throw new Error('Failed to upgrade tier');
    }
  }

  /**
   * Downgrade seller tier
   */
  async downgradeTier(
    sellerId: string,
    toTier: SellerTier
  ): Promise<UpgradeResponse> {
    try {
      const response = await apiClient.post(`/sellers/${sellerId}/downgrade`, {
        toTier,
      });

      return response.data;
    } catch (error) {
      console.error('Error downgrading tier:', error);
      throw new Error('Failed to downgrade tier');
    }
  }

  /**
   * Cancel tier subscription
   */
  async cancelSubscription(sellerId: string): Promise<{ success: boolean; endDate: Date }> {
    try {
      const response = await apiClient.post(`/sellers/${sellerId}/cancel-subscription`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Get tier comparison
   */
  async getTierComparison(sellerId: string): Promise<TierComparison> {
    try {
      const profile = await this.getSellerProfile(sellerId);
      const allTiers = this.getAllTierConfigs();

      // Calculate recommended tier based on stats
      const recommendedTier = this.calculateRecommendedTier(profile.stats);

      // Calculate savings if upgrading from current tier
      let savings: { monthly: number; annual: number } | undefined;
      if (recommendedTier && recommendedTier !== profile.currentTier) {
        const currentConfig = this.getTierConfig(profile.currentTier);
        const recommendedConfig = this.getTierConfig(recommendedTier);
        
        if (currentConfig && recommendedConfig) {
          const monthlySavings = currentConfig.monthlyFee - recommendedConfig.monthlyFee;
          const annualSavings = monthlySavings * 12;
          
          // Also calculate transaction fee savings
          const avgOrderValue = profile.stats.totalRevenue / profile.stats.totalSales || 100;
          const monthlyOrders = profile.stats.monthSales;
          const transactionFeeSavings = 
            (currentConfig.transactionFee - recommendedConfig.transactionFee) / 100 *
            avgOrderValue *
            monthlyOrders;

          savings = {
            monthly: monthlySavings + transactionFeeSavings,
            annual: annualSavings + (transactionFeeSavings * 12),
          };
        }
      }

      return {
        tiers: allTiers,
        currentTier: profile.currentTier,
        recommendedTier,
        savings,
      };
    } catch (error) {
      console.error('Error getting tier comparison:', error);
      throw new Error('Failed to get tier comparison');
    }
  }

  /**
   * Calculate recommended tier based on seller stats
   */
  private calculateRecommendedTier(stats: SellerStats): SellerTier | undefined {
    const { monthSales, monthRevenue, totalListings, averageRating } = stats;

    // Enterprise tier requirements
    if (monthRevenue >= 50000 && totalListings >= 100 && averageRating >= 4.5) {
      return SellerTier.ENTERPRISE;
    }

    // Premium tier requirements
    if (monthRevenue >= 5000 && totalListings >= 50 && averageRating >= 4.5) {
      return SellerTier.PREMIUM;
    }

    // Standard tier requirements
    if (monthRevenue >= 1000 && totalListings >= 10 && averageRating >= 4.0) {
      return SellerTier.STANDARD;
    }

    // Basic tier (no requirements)
    return SellerTier.BASIC;
  }

  /**
   * Check if seller meets tier requirements
   */
  async checkTierRequirements(
    sellerId: string,
    tier: SellerTier
  ): Promise<{ meetsRequirements: boolean; missingRequirements: string[] }> {
    try {
      const profile = await this.getSellerProfile(sellerId);
      const config = this.getTierConfig(tier);

      if (!config) {
        throw new Error('Invalid tier');
      }

      const missingRequirements: string[] = [];

      for (const requirement of config.requirements) {
        const meets = this.checkRequirement(profile.stats, requirement);
        if (!meets) {
          missingRequirements.push(requirement.description);
        }
      }

      return {
        meetsRequirements: missingRequirements.length === 0,
        missingRequirements,
      };
    } catch (error) {
      console.error('Error checking tier requirements:', error);
      throw new Error('Failed to check tier requirements');
    }
  }

  /**
   * Check if a specific requirement is met
   */
  private checkRequirement(stats: SellerStats, requirement: TierRequirement): boolean {
    switch (requirement.type) {
      case 'sales_volume':
        return stats.monthRevenue >= (requirement.value as number);
      case 'listing_count':
        return stats.totalListings >= (requirement.value as number);
      case 'rating':
        return stats.averageRating >= (requirement.value as number);
      case 'verification':
        // Verification would be checked against user profile
        return true; // Placeholder
      case 'payment':
        // Payment method availability
        return true; // Placeholder
      default:
        return true;
    }
  }

  /**
   * Get upgrade options for current tier
   */
  getUpgradeOptions(currentTier: SellerTier): SellerTier[] {
    const options: SellerTier[] = [];
    const allTiers = this.getAllTierConfigs();

    for (const config of allTiers) {
      if (config.upgradeFrom?.includes(currentTier)) {
        options.push(config.tier);
      }
    }

    return options.sort((a, b) => {
      const aConfig = this.getTierConfig(a)!;
      const bConfig = this.getTierConfig(b)!;
      return aConfig.monthlyFee - bConfig.monthlyFee;
    });
  }

  /**
   * Get downgrade options for current tier
   */
  getDowngradeOptions(currentTier: SellerTier): SellerTier[] {
    const options: SellerTier[] = [];
    const allTiers = this.getAllTierConfigs();

    for (const config of allTiers) {
      if (config.downgradeTo?.includes(currentTier)) {
        options.push(config.tier);
      }
    }

    return options.sort((a, b) => {
      const aConfig = this.getTierConfig(a)!;
      const bConfig = this.getTierConfig(b)!;
      return bConfig.monthlyFee - aConfig.monthlyFee;
    });
  }

  /**
   * Calculate tier benefits value
   */
  calculateTierBenefitsValue(tier: SellerTier, monthlyRevenue: number): {
    transactionFeeSavings: number;
    totalSavings: number;
  } {
    const config = this.getTierConfig(tier);
    const basicConfig = this.getTierConfig(SellerTier.BASIC);

    if (!config || !basicConfig) {
      return { transactionFeeSavings: 0, totalSavings: 0 };
    }

    // Calculate transaction fee savings
    const basicFee = monthlyRevenue * (basicConfig.transactionFee / 100);
    const currentFee = monthlyRevenue * (config.transactionFee / 100);
    const transactionFeeSavings = basicFee - currentFee;

    // Calculate total savings (transaction fees - monthly fee)
    const totalSavings = transactionFeeSavings - config.monthlyFee;

    return {
      transactionFeeSavings,
      totalSavings,
    };
  }

  /**
   * Validate promo code
   */
  async validatePromoCode(code: string, tier: SellerTier): Promise<{
    valid: boolean;
    discount?: number;
    error?: string;
  }> {
    try {
      const response = await apiClient.post('/sellers/validate-promo-code', {
        code,
        tier,
      });

      return response.data;
    } catch (error) {
      console.error('Error validating promo code:', error);
      return {
        valid: false,
        error: 'Invalid promo code',
      };
    }
  }
}

// Export singleton instance
export const sellerTierService = new SellerTierService();

export default sellerTierService;
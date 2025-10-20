/**
 * Seller Tier System Types
 * Defines interfaces for tier-based feature gating across all seller components
 */

export interface TierRequirement {
  type: 'sales_volume' | 'rating' | 'reviews' | 'time_active' | 'verification_status';
  value: number;
  current: number;
  met: boolean;
  description: string;
}

export interface TierBenefit {
  type: 'listing_limit' | 'commission_rate' | 'priority_support' | 'analytics_access' | 'featured_placement' | 'custom_branding';
  description: string;
  value: string | number;
  enabled: boolean;
}

export interface TierLimitation {
  type: 'listing_limit' | 'withdrawal_limit' | 'feature_access' | 'support_level';
  description: string;
  value: string | number;
  enforced: boolean;
}

export interface SellerTier {
  id: string;
  name: string;
  level: number;
  color: string;
  icon: string;
  requirements: TierRequirement[];
  benefits: TierBenefit[];
  limitations: TierLimitation[];
  upgradeThreshold: number;
  isActive: boolean;
}

export interface TierProgress {
  currentTier: SellerTier;
  nextTier: SellerTier | null;
  progressPercentage: number;
  requirementsMet: number;
  totalRequirements: number;
  estimatedUpgradeTime: string | null;
}

export interface TierUpgradeInfo {
  canUpgrade: boolean;
  nextTier: SellerTier | null;
  missingRequirements: TierRequirement[];
  upgradeActions: string[];
  estimatedTimeToUpgrade: string | null;
}

export interface TierValidationResult {
  isAllowed: boolean;
  reason?: string;
  alternativeAction?: string;
  upgradeRequired?: boolean;
}

export interface TierContext {
  tier: SellerTier | null;
  progress: TierProgress | null;
  loading: boolean;
  error: string | null;
  canPerformAction: (action: string) => TierValidationResult;
  refreshTier: () => Promise<void>;
}

// Predefined tier levels
export const TIER_LEVELS = {
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
  DIAMOND: 5,
} as const;

// Action types for tier validation
export const TIER_ACTIONS = {
  CREATE_LISTING: 'create_listing',
  UPLOAD_IMAGES: 'upload_images',
  ACCESS_ANALYTICS: 'access_analytics',
  PRIORITY_SUPPORT: 'priority_support',
  CUSTOM_BRANDING: 'custom_branding',
  FEATURED_PLACEMENT: 'featured_placement',
  BULK_OPERATIONS: 'bulk_operations',
  ADVANCED_TOOLS: 'advanced_tools',
} as const;

export type TierAction = typeof TIER_ACTIONS[keyof typeof TIER_ACTIONS];
/**
 * Tier Mapping Utilities
 * 
 * Provides type-safe mapping between legacy tier names (BASIC, VERIFIED, PRO)
 * and unified tier names (TIER_1, TIER_2, TIER_3) used across the application.
 */

export type LegacyTier = 'BASIC' | 'VERIFIED' | 'PRO';
export type UnifiedTier = 'TIER_1' | 'TIER_2' | 'TIER_3';

/**
 * Maps legacy tier names to unified tier names
 * @param tier - Legacy tier name (case-insensitive)
 * @returns Unified tier name, defaults to TIER_1 if invalid
 */
export function mapLegacyTierToUnified(tier: string | undefined | null): UnifiedTier {
  if (!tier) return 'TIER_1';
  
  const mapping: Record<LegacyTier, UnifiedTier> = {
    'BASIC': 'TIER_1',
    'VERIFIED': 'TIER_2',
    'PRO': 'TIER_3'
  };
  
  const upperTier = tier.toUpperCase() as LegacyTier;
  return mapping[upperTier] || 'TIER_1';
}

/**
 * Maps unified tier names to legacy tier names
 * @param tier - Unified tier name
 * @returns Legacy tier name, defaults to BASIC if invalid
 */
export function mapUnifiedTierToLegacy(tier: UnifiedTier | string | undefined | null): LegacyTier {
  if (!tier) return 'BASIC';
  
  const mapping: Record<UnifiedTier, LegacyTier> = {
    'TIER_1': 'BASIC',
    'TIER_2': 'VERIFIED',
    'TIER_3': 'PRO'
  };
  
  return mapping[tier as UnifiedTier] || 'BASIC';
}

/**
 * Gets the numeric tier level (1-3)
 * @param tier - Either legacy or unified tier name
 * @returns Numeric tier level (1, 2, or 3)
 */
export function getTierLevel(tier: string | undefined | null): 1 | 2 | 3 {
  if (!tier) return 1;
  
  const upperTier = tier.toUpperCase();
  
  if (upperTier === 'BASIC' || upperTier === 'TIER_1') return 1;
  if (upperTier === 'VERIFIED' || upperTier === 'TIER_2') return 2;
  if (upperTier === 'PRO' || upperTier === 'TIER_3') return 3;
  
  return 1;
}

/**
 * Gets a human-readable tier display name
 * @param tier - Either legacy or unified tier name
 * @returns Display name for UI
 */
export function getTierDisplayName(tier: string | undefined | null): string {
  const level = getTierLevel(tier);
  
  const displayNames = {
    1: 'Basic Seller',
    2: 'Verified Seller',
    3: 'Pro Seller'
  };
  
  return displayNames[level];
}

/**
 * Compares two tiers and returns true if first tier is higher or equal
 * @param tier1 - First tier to compare
 * @param tier2 - Second tier to compare
 * @returns true if tier1 >= tier2
 */
export function isTierAtLeast(tier1: string | undefined | null, tier2: string | undefined | null): boolean {
  return getTierLevel(tier1) >= getTierLevel(tier2);
}

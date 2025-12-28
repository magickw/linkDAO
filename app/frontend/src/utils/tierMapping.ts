/**
 * Tier Mapping Utilities
 * 
 * Provides type-safe utilities for the unified tier system.
 * Tiers: bronze, silver, gold, platinum, diamond
 */

export type UnifiedTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

/**
 * Gets the numeric tier level (1-5)
 * @param tier - Tier name
 * @returns Numeric tier level (1-5)
 */
export function getTierLevel(tier: string | undefined | null): 1 | 2 | 3 | 4 | 5 {
  if (!tier) return 1;

  const tierLower = tier.toLowerCase();

  if (tierLower === 'bronze') return 1;
  if (tierLower === 'silver') return 2;
  if (tierLower === 'gold') return 3;
  if (tierLower === 'platinum') return 4;
  if (tierLower === 'diamond') return 5;

  return 1;
}

/**
 * Gets a human-readable tier display name
 * @param tier - Tier name
 * @returns Display name for UI
 */
export function getTierDisplayName(tier: string | undefined | null): string {
  if (!tier) return 'Bronze Seller';

  const tierLower = tier.toLowerCase();

  const displayNames: Record<string, string> = {
    'bronze': 'Bronze Seller',
    'silver': 'Silver Seller',
    'gold': 'Gold Seller',
    'platinum': 'Platinum Seller',
    'diamond': 'Diamond Seller'
  };

  return displayNames[tierLower] || 'Bronze Seller';
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

/**
 * Normalizes a tier value to the standard format
 * @param tier - Tier value to normalize
 * @returns Normalized tier value
 */
export function normalizeTier(tier: string | undefined | null): UnifiedTier {
  if (!tier) return 'bronze';

  const tierLower = tier.toLowerCase();

  const validTiers: UnifiedTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

  if (validTiers.includes(tierLower as UnifiedTier)) {
    return tierLower as UnifiedTier;
  }

  return 'bronze';
}

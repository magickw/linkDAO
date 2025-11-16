/**
 * Optimized Profile Service with Request Deduplication
 * Wraps ProfileService methods with intelligent caching and deduplication
 */

import { UserProfile } from '../models/UserProfile';
import { ProfileService } from './profileService';
import { requestDeduplicationService } from '../utils/requestDeduplication';

class OptimizedProfileService {
  // In-memory cache for profile data
  private profileCache: Map<string, { data: UserProfile | null; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 60 seconds

  /**
   * Get profile by address with intelligent caching
   */
  async getProfileByAddress(address: string): Promise<UserProfile | null> {
    const cacheKey = `profile:${address.toLowerCase()}`;

    // Check memory cache first
    const cached = this.profileCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`[OptimizedProfile] Memory cache hit for ${address}`);
      return cached.data;
    }

    try {
      // Use the original ProfileService method (it will be deduplicated by service worker)
      const profile = await ProfileService.getProfileByAddress(address);

      // Cache the result
      this.profileCache.set(cacheKey, {
        data: profile,
        timestamp: Date.now()
      });

      return profile;
    } catch (error) {
      console.error(`[OptimizedProfile] Error fetching profile for ${address}:`, error);
      return null;
    }
  }

  /**
   * Invalidate cache for a specific address
   */
  invalidateProfile(address: string): void {
    const cacheKey = `profile:${address.toLowerCase()}`;
    this.profileCache.delete(cacheKey);
    requestDeduplicationService.invalidate(`/api/profiles/address/${address}`);
  }

  /**
   * Clear all profile cache
   */
  clearAllCache(): void {
    this.profileCache.clear();
    requestDeduplicationService.invalidate('/api/profiles');
  }

  /**
   * Prefetch profiles for an array of addresses
   * Useful for loading profiles before they're needed
   */
  async prefetchProfiles(addresses: string[]): Promise<void> {
    // Batch prefetch in groups of 5 to avoid overwhelming the server
    const BATCH_SIZE = 5;
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(address => this.getProfileByAddress(address))
      );
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.profileCache.size,
      entries: Array.from(this.profileCache.keys())
    };
  }

  /**
   * Cleanup expired cache entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.profileCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.profileCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const optimizedProfileService = new OptimizedProfileService();

// Auto-cleanup every 2 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    optimizedProfileService.cleanup();
  }, 2 * 60 * 1000);
}

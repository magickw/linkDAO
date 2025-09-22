/**
 * Social Proof Service
 * Handles social proof data calculation and privacy management
 */

import { SocialConnection, SocialProofData } from '../components/CommunityEnhancements/AdvancedInteractions/SocialProofIndicators';

export interface UserInteraction {
  id: string;
  type: 'like' | 'comment' | 'tip' | 'follow' | 'mention' | 'share';
  timestamp: Date;
  weight: number; // Interaction importance weight
}

export interface CommunityMembership {
  communityId: string;
  communityName: string;
  joinDate: Date;
  role: 'member' | 'moderator' | 'admin';
  activityLevel: 'low' | 'medium' | 'high';
}

export interface PrivacySettings {
  showMutualFollows: boolean;
  showSharedCommunities: boolean;
  showConnectionStrength: boolean;
  showTrustScore: boolean;
  showInteractionHistory: boolean;
  allowDataCollection: boolean;
}

class SocialProofService {
  private cache = new Map<string, { data: SocialProofData; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  /**
   * Calculate connection strength between two users
   */
  calculateConnectionStrength(
    interactions: UserInteraction[],
    mutualFollows: SocialConnection[],
    sharedCommunities: CommunityMembership[],
    followRelationship: 'none' | 'following' | 'follower' | 'mutual'
  ): 'none' | 'weak' | 'medium' | 'strong' {
    let score = 0;

    // Base score from follow relationship
    switch (followRelationship) {
      case 'mutual':
        score += 30;
        break;
      case 'following':
      case 'follower':
        score += 15;
        break;
      case 'none':
        score += 0;
        break;
    }

    // Score from interactions
    const recentInteractions = interactions.filter(
      i => Date.now() - i.timestamp.getTime() < 30 * 24 * 60 * 60 * 1000 // Last 30 days
    );
    
    const interactionScore = recentInteractions.reduce((sum, interaction) => {
      return sum + interaction.weight;
    }, 0);
    
    score += Math.min(interactionScore, 40); // Cap at 40 points

    // Score from mutual connections
    const mutualFollowScore = Math.min(mutualFollows.length * 2, 20); // Cap at 20 points
    score += mutualFollowScore;

    // Score from shared communities
    const sharedCommunityScore = Math.min(sharedCommunities.length * 5, 25); // Cap at 25 points
    score += sharedCommunityScore;

    // Determine strength level
    if (score >= 70) return 'strong';
    if (score >= 40) return 'medium';
    if (score >= 15) return 'weak';
    return 'none';
  }

  /**
   * Calculate trust score based on various factors
   */
  calculateTrustScore(
    accountAge: number, // in days
    verificationStatus: {
      ensVerified: boolean;
      emailVerified: boolean;
      phoneVerified: boolean;
      kycVerified: boolean;
    },
    reputationScore: number,
    communityStanding: {
      moderatorEndorsements: number;
      communityBans: number;
      reportCount: number;
    },
    transactionHistory: {
      successfulTransactions: number;
      failedTransactions: number;
      disputeCount: number;
    }
  ): number {
    let score = 0;

    // Account age (max 20 points)
    score += Math.min(accountAge / 365 * 20, 20);

    // Verification status (max 25 points)
    if (verificationStatus.ensVerified) score += 8;
    if (verificationStatus.emailVerified) score += 5;
    if (verificationStatus.phoneVerified) score += 7;
    if (verificationStatus.kycVerified) score += 5;

    // Reputation score (max 30 points)
    score += Math.min(reputationScore / 1000 * 30, 30);

    // Community standing (max 15 points)
    score += Math.min(communityStanding.moderatorEndorsements * 3, 15);
    score -= communityStanding.communityBans * 10;
    score -= communityStanding.reportCount * 2;

    // Transaction history (max 10 points)
    const totalTransactions = transactionHistory.successfulTransactions + transactionHistory.failedTransactions;
    if (totalTransactions > 0) {
      const successRate = transactionHistory.successfulTransactions / totalTransactions;
      score += successRate * 10;
    }
    score -= transactionHistory.disputeCount * 5;

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get cached social proof data
   */
  private getCachedData(key: string): SocialProofData | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Cache social proof data
   */
  private setCachedData(key: string, data: SocialProofData): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL,
    });
  }

  /**
   * Fetch social proof data for a user relationship
   */
  async getSocialProofData(
    currentUserId: string,
    targetUserId: string,
    privacySettings?: PrivacySettings
  ): Promise<SocialProofData> {
    const cacheKey = `${currentUserId}-${targetUserId}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return this.filterDataByPrivacy(cached, privacySettings);
    }

    try {
      // In a real implementation, this would be an API call
      const response = await fetch(`${this.API_BASE_URL}/social-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentUserId,
          targetUserId,
          includePrivateData: privacySettings?.allowDataCollection ?? false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SocialProofData = await response.json();
      
      // Cache the full data
      this.setCachedData(cacheKey, data);
      
      // Return filtered data based on privacy settings
      return this.filterDataByPrivacy(data, privacySettings);
    } catch (error) {
      console.error('Failed to fetch social proof data:', error);
      
      // Return mock data for development
      return this.generateMockSocialProofData(currentUserId, targetUserId);
    }
  }

  /**
   * Filter social proof data based on privacy settings
   */
  private filterDataByPrivacy(
    data: SocialProofData,
    privacySettings?: PrivacySettings
  ): SocialProofData {
    if (!privacySettings) {
      return data;
    }

    return {
      mutualFollows: privacySettings.showMutualFollows ? data.mutualFollows : [],
      sharedCommunities: privacySettings.showSharedCommunities ? data.sharedCommunities : [],
      connectionStrength: privacySettings.showConnectionStrength ? data.connectionStrength : 'none',
      interactionHistory: privacySettings.showInteractionHistory ? data.interactionHistory : {
        totalInteractions: 0,
        recentInteractions: 0,
      },
      trustScore: privacySettings.showTrustScore ? data.trustScore : 0,
    };
  }

  /**
   * Generate mock social proof data for development
   */
  private generateMockSocialProofData(
    currentUserId: string,
    targetUserId: string
  ): SocialProofData {
    const mutualFollowCount = Math.floor(Math.random() * 10);
    const sharedCommunityCount = Math.floor(Math.random() * 5);
    const interactionCount = Math.floor(Math.random() * 50);

    return {
      mutualFollows: Array.from({ length: mutualFollowCount }, (_, i) => ({
        userId: `mutual_${i}`,
        username: `mutual_user_${i}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=mutual${i}`,
        ensName: Math.random() > 0.7 ? `mutual${i}.eth` : undefined,
        connectionType: 'mutual_follow',
        strength: ['weak', 'medium', 'strong'][Math.floor(Math.random() * 3)] as any,
        metadata: {
          followedSince: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        },
      })),
      sharedCommunities: Array.from({ length: sharedCommunityCount }, (_, i) => ({
        communityId: `community_${i}`,
        communityName: `Community ${i + 1}`,
        memberCount: Math.floor(Math.random() * 1000) + 100,
        mutualMembers: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => ({
          userId: `member_${j}`,
          username: `member_${j}`,
          connectionType: 'shared_community',
          strength: 'medium',
        })),
      })),
      connectionStrength: this.calculateConnectionStrength(
        [], // Mock empty interactions for now
        [],
        [],
        Math.random() > 0.5 ? 'mutual' : 'none'
      ),
      interactionHistory: {
        totalInteractions: interactionCount,
        recentInteractions: Math.floor(interactionCount * 0.3),
        lastInteraction: interactionCount > 0 ? 
          new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : 
          undefined,
      },
      trustScore: this.calculateTrustScore(
        Math.floor(Math.random() * 1000) + 30, // Account age
        {
          ensVerified: Math.random() > 0.7,
          emailVerified: Math.random() > 0.5,
          phoneVerified: Math.random() > 0.8,
          kycVerified: Math.random() > 0.9,
        },
        Math.floor(Math.random() * 1000), // Reputation score
        {
          moderatorEndorsements: Math.floor(Math.random() * 5),
          communityBans: Math.floor(Math.random() * 2),
          reportCount: Math.floor(Math.random() * 3),
        },
        {
          successfulTransactions: Math.floor(Math.random() * 100),
          failedTransactions: Math.floor(Math.random() * 5),
          disputeCount: Math.floor(Math.random() * 2),
        }
      ),
    };
  }

  /**
   * Update privacy settings for a user
   */
  async updatePrivacySettings(
    userId: string,
    settings: Partial<PrivacySettings>
  ): Promise<void> {
    try {
      await fetch(`${this.API_BASE_URL}/users/${userId}/privacy-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      // Clear cache for this user to force refresh
      const keysToDelete = Array.from(this.cache.keys()).filter(
        key => key.includes(userId)
      );
      keysToDelete.forEach(key => this.cache.delete(key));
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      throw error;
    }
  }

  /**
   * Get user's privacy settings
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/users/${userId}/privacy-settings`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch privacy settings:', error);
      
      // Return default settings
      return {
        showMutualFollows: true,
        showSharedCommunities: true,
        showConnectionStrength: true,
        showTrustScore: false,
        showInteractionHistory: true,
        allowDataCollection: true,
      };
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const socialProofService = new SocialProofService();
export default socialProofService;
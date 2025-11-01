import { Redis } from 'redis';
import { safeLogger } from '../utils/safeLogger';
import { redisService } from './redisService';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: {
    userIds?: string[];
    userGroups?: string[];
    environments?: string[];
    minReputation?: number;
    maxReputation?: number;
  };
  metadata?: {
    description: string;
    owner: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface FeatureFlagEvaluation {
  enabled: boolean;
  reason: string;
  flagName: string;
  userId?: string;
}

class FeatureFlagService {
  private redis: Redis;
  private defaultFlags: Map<string, FeatureFlag> = new Map();

  constructor() {
    this.redis = redisService.getClient();
    this.initializeDefaultFlags();
  }

  private initializeDefaultFlags(): void {
    const defaultFlags: FeatureFlag[] = [
      {
        name: 'ai_moderation_enabled',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          description: 'Enable AI-powered content moderation',
          owner: 'moderation-team',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        name: 'human_review_queue',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          description: 'Enable human moderation review queue',
          owner: 'moderation-team',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        name: 'appeals_system',
        enabled: true,
        rolloutPercentage: 50,
        conditions: {
          environments: ['staging', 'production'],
          minReputation: 100
        },
        metadata: {
          description: 'Enable appeals system for moderation decisions',
          owner: 'governance-team',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        name: 'dao_jury_voting',
        enabled: false,
        rolloutPercentage: 10,
        conditions: {
          environments: ['staging'],
          minReputation: 500
        },
        metadata: {
          description: 'Enable DAO jury voting for appeals',
          owner: 'governance-team',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        name: 'marketplace_protection',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          description: 'Enable marketplace-specific content protection',
          owner: 'marketplace-team',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        name: 'link_safety_scanning',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          description: 'Enable URL safety scanning',
          owner: 'security-team',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        name: 'custom_scam_detection',
        enabled: true,
        rolloutPercentage: 80,
        metadata: {
          description: 'Enable custom crypto scam detection models',
          owner: 'security-team',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        name: 'performance_optimization',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          description: 'Enable performance optimizations and caching',
          owner: 'platform-team',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        name: 'privacy_compliance',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          description: 'Enable privacy compliance features',
          owner: 'compliance-team',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        name: 'enhanced_monitoring',
        enabled: true,
        rolloutPercentage: 100,
        metadata: {
          description: 'Enable enhanced monitoring and observability',
          owner: 'platform-team',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    ];

    defaultFlags.forEach(flag => {
      this.defaultFlags.set(flag.name, flag);
    });
  }

  async isEnabled(
    flagName: string,
    userId?: string,
    userReputation?: number,
    userGroups?: string[]
  ): Promise<FeatureFlagEvaluation> {
    try {
      const flag = await this.getFlag(flagName);
      
      if (!flag) {
        return {
          enabled: false,
          reason: 'Flag not found',
          flagName,
          userId
        };
      }

      // Check if flag is globally disabled
      if (!flag.enabled) {
        return {
          enabled: false,
          reason: 'Flag globally disabled',
          flagName,
          userId
        };
      }

      // Check environment conditions
      if (flag.conditions?.environments) {
        const currentEnv = process.env.NODE_ENV || 'development';
        if (!flag.conditions.environments.includes(currentEnv)) {
          return {
            enabled: false,
            reason: `Environment ${currentEnv} not in allowed environments`,
            flagName,
            userId
          };
        }
      }

      // Check user-specific conditions
      if (userId && flag.conditions?.userIds) {
        if (flag.conditions.userIds.includes(userId)) {
          return {
            enabled: true,
            reason: 'User in explicit allow list',
            flagName,
            userId
          };
        }
      }

      // Check user group conditions
      if (userGroups && flag.conditions?.userGroups) {
        const hasMatchingGroup = userGroups.some(group => 
          flag.conditions!.userGroups!.includes(group)
        );
        if (!hasMatchingGroup) {
          return {
            enabled: false,
            reason: 'User not in required groups',
            flagName,
            userId
          };
        }
      }

      // Check reputation conditions
      if (userReputation !== undefined) {
        if (flag.conditions?.minReputation && userReputation < flag.conditions.minReputation) {
          return {
            enabled: false,
            reason: `User reputation ${userReputation} below minimum ${flag.conditions.minReputation}`,
            flagName,
            userId
          };
        }
        
        if (flag.conditions?.maxReputation && userReputation > flag.conditions.maxReputation) {
          return {
            enabled: false,
            reason: `User reputation ${userReputation} above maximum ${flag.conditions.maxReputation}`,
            flagName,
            userId
          };
        }
      }

      // Check rollout percentage
      if (flag.rolloutPercentage < 100) {
        const hash = this.hashUserId(userId || 'anonymous', flagName);
        const userPercentile = hash % 100;
        
        if (userPercentile >= flag.rolloutPercentage) {
          return {
            enabled: false,
            reason: `User not in rollout percentage (${userPercentile} >= ${flag.rolloutPercentage})`,
            flagName,
            userId
          };
        }
      }

      return {
        enabled: true,
        reason: 'All conditions met',
        flagName,
        userId
      };
    } catch (error) {
      safeLogger.error(`Error evaluating feature flag ${flagName}:`, error);
      return {
        enabled: false,
        reason: 'Error evaluating flag',
        flagName,
        userId
      };
    }
  }

  async getFlag(flagName: string): Promise<FeatureFlag | null> {
    try {
      // Try to get from Redis first
      const cached = await this.redis.get(`feature_flag:${flagName}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fall back to default flags
      return this.defaultFlags.get(flagName) || null;
    } catch (error) {
      safeLogger.error(`Error getting feature flag ${flagName}:`, error);
      return this.defaultFlags.get(flagName) || null;
    }
  }

  async setFlag(flag: FeatureFlag): Promise<void> {
    try {
      flag.metadata = {
        ...flag.metadata,
        updatedAt: new Date()
      };

      await this.redis.setex(
        `feature_flag:${flag.name}`,
        3600, // 1 hour TTL
        JSON.stringify(flag)
      );

      // Also update in-memory defaults for fallback
      this.defaultFlags.set(flag.name, flag);
    } catch (error) {
      safeLogger.error(`Error setting feature flag ${flag.name}:`, error);
      throw error;
    }
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    try {
      const keys = await this.redis.keys('feature_flag:*');
      const flags: FeatureFlag[] = [];

      for (const key of keys) {
        const cached = await this.redis.get(key);
        if (cached) {
          flags.push(JSON.parse(cached));
        }
      }

      // Add default flags that aren't in Redis
      for (const [name, flag] of this.defaultFlags) {
        if (!flags.find(f => f.name === name)) {
          flags.push(flag);
        }
      }

      return flags;
    } catch (error) {
      safeLogger.error('Error getting all feature flags:', error);
      return Array.from(this.defaultFlags.values());
    }
  }

  async deleteFlag(flagName: string): Promise<void> {
    try {
      await this.redis.del(`feature_flag:${flagName}`);
      this.defaultFlags.delete(flagName);
    } catch (error) {
      safeLogger.error(`Error deleting feature flag ${flagName}:`, error);
      throw error;
    }
  }

  private hashUserId(userId: string, flagName: string): number {
    // Simple hash function for consistent user bucketing
    let hash = 0;
    const str = `${userId}:${flagName}`;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }

  // Convenience methods for common feature flags
  async isAIModerationEnabled(userId?: string, userReputation?: number): Promise<boolean> {
    const result = await this.isEnabled('ai_moderation_enabled', userId, userReputation);
    return result.enabled;
  }

  async isHumanReviewEnabled(userId?: string, userReputation?: number): Promise<boolean> {
    const result = await this.isEnabled('human_review_queue', userId, userReputation);
    return result.enabled;
  }

  async isAppealsSystemEnabled(userId?: string, userReputation?: number): Promise<boolean> {
    const result = await this.isEnabled('appeals_system', userId, userReputation);
    return result.enabled;
  }

  async isDAOJuryEnabled(userId?: string, userReputation?: number): Promise<boolean> {
    const result = await this.isEnabled('dao_jury_voting', userId, userReputation);
    return result.enabled;
  }

  async isMarketplaceProtectionEnabled(userId?: string, userReputation?: number): Promise<boolean> {
    const result = await this.isEnabled('marketplace_protection', userId, userReputation);
    return result.enabled;
  }

  async isLinkSafetyScanningEnabled(userId?: string, userReputation?: number): Promise<boolean> {
    const result = await this.isEnabled('link_safety_scanning', userId, userReputation);
    return result.enabled;
  }

  async isCustomScamDetectionEnabled(userId?: string, userReputation?: number): Promise<boolean> {
    const result = await this.isEnabled('custom_scam_detection', userId, userReputation);
    return result.enabled;
  }

  async isPerformanceOptimizationEnabled(userId?: string, userReputation?: number): Promise<boolean> {
    const result = await this.isEnabled('performance_optimization', userId, userReputation);
    return result.enabled;
  }

  async isPrivacyComplianceEnabled(userId?: string, userReputation?: number): Promise<boolean> {
    const result = await this.isEnabled('privacy_compliance', userId, userReputation);
    return result.enabled;
  }

  async isEnhancedMonitoringEnabled(userId?: string, userReputation?: number): Promise<boolean> {
    const result = await this.isEnabled('enhanced_monitoring', userId, userReputation);
    return result.enabled;
  }
}

export const featureFlagService = new FeatureFlagService();

import { db } from '../db';
import { referralConfig } from '../db/schema';
import { eq } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

interface ReferralConfigItem {
  id: string;
  configKey: string;
  configValue: string;
  configType: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ReferralProgramSettings {
  programActive: boolean;
  bonusPercentage: number;
  bonusTokens: number;
  maxReferrals: number;
  tiersEnabled: boolean;
  expirationDays: number;
  milestoneRewards: Record<string, number>;
}

class ReferralConfigService {
  private static instance: ReferralConfigService;
  private configCache: Map<string, ReferralConfigItem> = new Map();
  private cacheExpiry: Map<string, Date> = new Map();
  private cacheTimeoutMs: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): ReferralConfigService {
    if (!ReferralConfigService.instance) {
      ReferralConfigService.instance = new ReferralConfigService();
    }
    return ReferralConfigService.instance;
  }

  /**
   * Get a configuration value by key
   */
  async getConfigValue(key: string, defaultValue?: any): Promise<any> {
    try {
      // Check cache first
      const cached = this.getCachedValue(key);
      if (cached !== undefined) {
        return this.convertConfigValue(cached.configValue, cached.configType);
      }

      // Fetch from database
      const [config] = await db
        .select()
        .from(referralConfig)
        .where(eq(referralConfig.configKey, key))
        .limit(1);

      if (!config) {
        return defaultValue;
      }

      // Cache the value
      this.setCachedValue(key, config);

      return this.convertConfigValue(config.configValue, config.configType);
    } catch (error) {
      safeLogger.error(`Error getting config value for key ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Get all configuration values
   */
  async getAllConfig(): Promise<ReferralConfigItem[]> {
    try {
      const configs = await db
        .select()
        .from(referralConfig);

      return configs.map(config => ({
        id: config.id,
        configKey: config.configKey,
        configValue: config.configValue,
        configType: config.configType,
        description: config.description,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }));
    } catch (error) {
      safeLogger.error('Error getting all referral config:', error);
      return [];
    }
  }

  /**
   * Update a configuration value
   */
  async updateConfigValue(key: string, value: any, type?: string): Promise<boolean> {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      const [updated] = await db
        .update(referralConfig)
        .set({
          configValue: stringValue,
          configType: type || 'string',
          updatedAt: new Date()
        })
        .where(eq(referralConfig.configKey, key))
        .returning();

      if (updated) {
        // Update cache
        this.setCachedValue(key, updated);
        return true;
      }

      return false;
    } catch (error) {
      safeLogger.error(`Error updating config value for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get referral program settings
   */
  async getProgramSettings(): Promise<ReferralProgramSettings> {
    try {
      const settings = {
        programActive: await this.getConfigValue('referral_program_active', true) as boolean,
        bonusPercentage: await this.getConfigValue('referral_bonus_percentage', 10) as number,
        bonusTokens: await this.getConfigValue('referral_bonus_tokens', 25) as number,
        maxReferrals: await this.getConfigValue('max_referrals_per_user', 100) as number,
        tiersEnabled: await this.getConfigValue('referral_tiers_enabled', true) as boolean,
        expirationDays: await this.getConfigValue('referral_expiration_days', 365) as number,
        milestoneRewards: await this.getConfigValue('referral_milestone_rewards', {}) as Record<string, number>
      };

      return settings;
    } catch (error) {
      safeLogger.error('Error getting referral program settings:', error);
      
      // Return default settings
      return {
        programActive: true,
        bonusPercentage: 10,
        bonusTokens: 25,
        maxReferrals: 100,
        tiersEnabled: true,
        expirationDays: 365,
        milestoneRewards: { "5": 100, "10": 250, "25": 500, "50": 1000, "100": 2500 }
      };
    }
  }

  /**
   * Check if referral program is active
   */
  async isProgramActive(): Promise<boolean> {
    return await this.getConfigValue('referral_program_active', true) as boolean;
  }

  /**
   * Get referral code length
   */
  async getReferralCodeLength(): Promise<number> {
    return await this.getConfigValue('referral_code_length', 8) as number;
  }

  /**
   * Get milestone rewards
   */
  async getMilestoneRewards(): Promise<Record<string, number>> {
    return await this.getConfigValue('referral_milestone_rewards', { "5": 100, "10": 250, "25": 500, "50": 1000, "100": 2500 }) as Record<string, number>;
  }

  /**
   * Convert config value based on type
   */
  private convertConfigValue(value: string, type: string): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch (error) {
          safeLogger.error('Error parsing JSON config value:', error);
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Get cached value if not expired
   */
  private getCachedValue(key: string): ReferralConfigItem | undefined {
    const cached = this.configCache.get(key);
    const expiry = this.cacheExpiry.get(key);

    if (cached && expiry && new Date() < expiry) {
      return cached;
    }

    // Remove expired cache entry
    if (cached) {
      this.configCache.delete(key);
      this.cacheExpiry.delete(key);
    }

    return undefined;
  }

  /**
   * Set cached value with expiry
   */
  private setCachedValue(key: string, value: any): void {
    this.configCache.set(key, value);
    this.cacheExpiry.set(key, new Date(Date.now() + this.cacheTimeoutMs));
  }

  /**
   * Clear cache for a specific key
   */
  clearCache(key: string): void {
    this.configCache.delete(key);
    this.cacheExpiry.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.configCache.clear();
    this.cacheExpiry.clear();
  }
}

export const referralConfigService = ReferralConfigService.getInstance();
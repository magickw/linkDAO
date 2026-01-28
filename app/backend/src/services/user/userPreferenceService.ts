/**
 * User Preference Service
 * Manages user payment preferences with encrypted storage and learning capabilities
 */

import { eq, desc, and, lt, isNull, or } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';
import { db } from '../../db';
import { 
  paymentMethodPreferences, 
  paymentMethodUsageHistory, 
  paymentMethodPreferenceOverrides 
} from '../../db/schema';
import crypto from 'crypto';

export interface PaymentMethodPreference {
  methodType: string;
  preferenceScore: number;
  usageCount: number;
  lastUsed?: Date;
  averageCost?: number;
  successRate?: number;
}

export interface UserPreferences {
  preferredMethods: PaymentMethodPreference[];
  avoidedMethods: string[];
  maxGasFeeThreshold: number;
  preferStablecoins: boolean;
  preferFiat: boolean;
  lastUsedMethods: RecentPaymentMethod[];
}

export interface RecentPaymentMethod {
  methodType: string;
  timestamp: Date;
  transactionAmount?: number;
  gasFeeUsd?: number;
  wasSuccessful: boolean;
}

export interface TransactionContext {
  amount: number;
  currency: string;
  networkId?: number;
  gasFeeUsd?: number;
  totalCostUsd?: number;
  wasPreferred: boolean;
  wasSuggested: boolean;
  marketConditions?: Record<string, any>;
}

export class UserPreferenceService {
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly PREFERENCE_DECAY_DAYS = 30; // Days after which preferences start to decay
  private readonly MAX_RECENT_METHODS = 10;
  private readonly LEARNING_RATE = 0.1;

  /**
   * Get user payment preferences with decryption
   */
  async getUserPaymentPreferences(userId: string): Promise<UserPreferences> {
    try {
      const [preference] = await db
        .select()
        .from(paymentMethodPreferences)
        .where(eq(paymentMethodPreferences.userId, userId))
        .limit(1);

      if (!preference) {
        return this.getDefaultPreferences();
      }

      // Decrypt sensitive preferences
      const decryptedPreferences = this.decryptPreferences(
        preference.encryptedPreferences,
        userId
      );

      // Combine with quick access fields
      return {
        preferredMethods: this.parsePreferredMethods(preference.preferenceScores),
        avoidedMethods: (preference.avoidedMethods as string[]) || [],
        maxGasFeeThreshold: parseFloat(preference.maxGasFeeThreshold || '50.00'),
        preferStablecoins: preference.preferStablecoins || true,
        preferFiat: preference.preferFiat || false,
        lastUsedMethods: this.parseRecentMethods(preference.lastUsedMethods),
        ...decryptedPreferences
      };
    } catch (error) {
      safeLogger.error('Failed to get user payment preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Update payment preference based on user transaction
   */
  async updatePaymentPreference(
    userId: string,
    methodType: string,
    context: TransactionContext
  ): Promise<void> {
    try {
      // Record usage history
      await this.recordPaymentMethodUsage(userId, methodType, context);

      // Get current preferences
      const currentPreferences = await this.getUserPaymentPreferences(userId);

      // Update preference scores using learning algorithm
      const updatedPreferences = this.updatePreferenceScores(
        currentPreferences,
        methodType,
        context
      );

      // Save updated preferences
      await this.saveUserPreferences(userId, updatedPreferences);
    } catch (error) {
      safeLogger.error('Failed to update payment preference:', error);
      throw error;
    }
  }

  /**
   * Calculate preference score for a payment method
   */
  calculatePreferenceScore(
    methodType: string,
    preferences: UserPreferences
  ): number {
    const methodPreference = preferences.preferredMethods.find(
      pref => pref.methodType === methodType
    );

    if (!methodPreference) {
      return this.getBasePreferenceScore(methodType);
    }

    // Apply time decay to preference scores
    const daysSinceLastUse = methodPreference.lastUsed
      ? (Date.now() - methodPreference.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
      : this.PREFERENCE_DECAY_DAYS;

    const decayFactor = Math.max(0.1, 1 - (daysSinceLastUse / this.PREFERENCE_DECAY_DAYS));
    
    return methodPreference.preferenceScore * decayFactor;
  }

  /**
   * Get recommended payment method based on preferences
   */
  getRecommendedMethod(
    availableMethods: string[],
    preferences: UserPreferences
  ): string | null {
    if (availableMethods.length === 0) {
      return null;
    }

    // Filter out avoided methods
    const viableMethods = availableMethods.filter(
      method => !preferences.avoidedMethods.includes(method)
    );

    if (viableMethods.length === 0) {
      return availableMethods[0]; // Fallback to first available if all are avoided
    }

    // Calculate scores for viable methods
    const scoredMethods = viableMethods.map(method => ({
      method,
      score: this.calculatePreferenceScore(method, preferences)
    }));

    // Sort by score and return highest
    scoredMethods.sort((a, b) => b.score - a.score);
    return scoredMethods[0].method;
  }

  /**
   * Add preference override (manual selection, temporary preference, etc.)
   */
  async addPreferenceOverride(
    userId: string,
    overrideType: string,
    methodType: string,
    options: {
      networkId?: number;
      priorityBoost?: number;
      expiresAt?: Date;
      reason?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      await db.insert(paymentMethodPreferenceOverrides).values({
        userId,
        overrideType,
        paymentMethodType: methodType,
        networkId: options.networkId,
        priorityBoost: options.priorityBoost || 0,
        expiresAt: options.expiresAt,
        reason: options.reason,
        metadata: options.metadata || {}
      });
    } catch (error) {
      safeLogger.error('Failed to add preference override:', error);
      throw error;
    }
  }

  /**
   * Reset user preferences to defaults
   */
  async resetUserPreferences(userId: string): Promise<void> {
    try {
      await db
        .delete(paymentMethodPreferences)
        .where(eq(paymentMethodPreferences.userId, userId));

      await db
        .delete(paymentMethodPreferenceOverrides)
        .where(eq(paymentMethodPreferenceOverrides.userId, userId));
    } catch (error) {
      safeLogger.error('Failed to reset user preferences:', error);
      throw error;
    }
  }

  /**
   * Clean up expired preference overrides
   */
  async cleanupExpiredOverrides(): Promise<number> {
    try {
      const result = await db
        .delete(paymentMethodPreferenceOverrides)
        .where(
          and(
            lt(paymentMethodPreferenceOverrides.expiresAt, new Date()),
            isNull(paymentMethodPreferenceOverrides.expiresAt)
          )
        )
        .returning();

      return result.length;
    } catch (error) {
      safeLogger.error('Failed to cleanup expired overrides:', error);
      return 0;
    }
  }

  /**
   * Get payment method usage analytics for a user
   */
  async getUserPaymentAnalytics(userId: string, days: number = 30): Promise<{
    totalTransactions: number;
    methodBreakdown: Record<string, number>;
    averageGasFee: number;
    preferenceAccuracy: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const history = await db
        .select()
        .from(paymentMethodUsageHistory)
        .where(
          and(
            eq(paymentMethodUsageHistory.userId, userId),
            lt(paymentMethodUsageHistory.createdAt, cutoffDate)
          )
        );

      const totalTransactions = history.length;
      const methodBreakdown: Record<string, number> = {};
      let totalGasFee = 0;
      let preferredCount = 0;

      history.forEach(record => {
        methodBreakdown[record.paymentMethodType] = 
          (methodBreakdown[record.paymentMethodType] || 0) + 1;
        
        if (record.gasFeeUsd) {
          totalGasFee += parseFloat(record.gasFeeUsd);
        }
        
        if (record.wasPreferred) {
          preferredCount++;
        }
      });

      return {
        totalTransactions,
        methodBreakdown,
        averageGasFee: totalTransactions > 0 ? totalGasFee / totalTransactions : 0,
        preferenceAccuracy: totalTransactions > 0 ? preferredCount / totalTransactions : 0
      };
    } catch (error) {
      safeLogger.error('Failed to get user payment analytics:', error);
      return {
        totalTransactions: 0,
        methodBreakdown: {},
        averageGasFee: 0,
        preferenceAccuracy: 0
      };
    }
  }

  // Private helper methods

  private getDefaultPreferences(): UserPreferences {
    return {
      preferredMethods: [
        { methodType: 'STABLECOIN_USDC', preferenceScore: 1.0, usageCount: 0 },
        { methodType: 'FIAT_STRIPE', preferenceScore: 0.8, usageCount: 0 },
        { methodType: 'NATIVE_ETH', preferenceScore: 0.6, usageCount: 0 }
      ],
      avoidedMethods: [],
      maxGasFeeThreshold: 50.00,
      preferStablecoins: true,
      preferFiat: false,
      lastUsedMethods: []
    };
  }

  private getBasePreferenceScore(methodType: string): number {
    const baseScores: Record<string, number> = {
      'STABLECOIN_USDC': 1.0,
      'STABLECOIN_USDT': 0.9,
      'FIAT_STRIPE': 0.8,
      'NATIVE_ETH': 0.6
    };
    return baseScores[methodType] || 0.5;
  }

  private generateEncryptionKey(userId: string): Buffer {
    // In production, this should use a more secure key derivation
    const secret = process.env.PAYMENT_PREFERENCE_SECRET || 'default-secret-key';
    return crypto.scryptSync(userId, secret, 32);
  }

  private encryptPreferences(preferences: any, userId: string): string {
    try {
      const key = this.generateEncryptionKey(userId);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);
      
      let encrypted = cipher.update(JSON.stringify(preferences), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return JSON.stringify({
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      });
    } catch (error) {
      safeLogger.error('Failed to encrypt preferences:', error);
      return JSON.stringify({});
    }
  }

  private decryptPreferences(encryptedData: string, userId: string): any {
    try {
      const key = this.generateEncryptionKey(userId);
      const data = JSON.parse(encryptedData);
      
      const decipher = crypto.createDecipheriv(this.ENCRYPTION_ALGORITHM, key, Buffer.from(data.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
      
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      safeLogger.error('Failed to decrypt preferences:', error);
      return {};
    }
  }

  private parsePreferredMethods(preferenceScores: any): PaymentMethodPreference[] {
    if (!preferenceScores || typeof preferenceScores !== 'object') {
      return this.getDefaultPreferences().preferredMethods;
    }

    return Object.entries(preferenceScores).map(([methodType, data]: [string, any]) => ({
      methodType,
      preferenceScore: data.score || 0,
      usageCount: data.usageCount || 0,
      lastUsed: data.lastUsed ? new Date(data.lastUsed) : undefined,
      averageCost: data.averageCost,
      successRate: data.successRate
    }));
  }

  private parseRecentMethods(lastUsedMethods: any): RecentPaymentMethod[] {
    if (!Array.isArray(lastUsedMethods)) {
      return [];
    }

    return lastUsedMethods.slice(0, this.MAX_RECENT_METHODS).map(method => ({
      methodType: method.methodType,
      timestamp: new Date(method.timestamp),
      transactionAmount: method.transactionAmount,
      gasFeeUsd: method.gasFeeUsd,
      wasSuccessful: method.wasSuccessful !== false
    }));
  }

  private updatePreferenceScores(
    preferences: UserPreferences,
    methodType: string,
    context: TransactionContext
  ): UserPreferences {
    const updatedPreferences = { ...preferences };
    
    // Find or create preference for this method
    let methodPreference = updatedPreferences.preferredMethods.find(
      pref => pref.methodType === methodType
    );

    if (!methodPreference) {
      methodPreference = {
        methodType,
        preferenceScore: this.getBasePreferenceScore(methodType),
        usageCount: 0
      };
      updatedPreferences.preferredMethods.push(methodPreference);
    }

    // Update usage count and last used
    methodPreference.usageCount++;
    methodPreference.lastUsed = new Date();

    // Update preference score based on context
    if (context.wasPreferred) {
      // Boost score if user preferred this method
      methodPreference.preferenceScore = Math.min(
        1.0,
        methodPreference.preferenceScore + this.LEARNING_RATE
      );
    } else if (context.wasSuggested && !context.wasPreferred) {
      // Slightly reduce score if suggested but not preferred
      methodPreference.preferenceScore = Math.max(
        0.1,
        methodPreference.preferenceScore - (this.LEARNING_RATE * 0.5)
      );
    }

    // Update recent methods
    updatedPreferences.lastUsedMethods.unshift({
      methodType,
      timestamp: new Date(),
      transactionAmount: context.amount,
      gasFeeUsd: context.gasFeeUsd,
      wasSuccessful: true // Assume successful if we're recording it
    });

    // Keep only recent methods
    updatedPreferences.lastUsedMethods = updatedPreferences.lastUsedMethods
      .slice(0, this.MAX_RECENT_METHODS);

    return updatedPreferences;
  }

  private async recordPaymentMethodUsage(
    userId: string,
    methodType: string,
    context: TransactionContext
  ): Promise<void> {
    await db.insert(paymentMethodUsageHistory).values({
      userId,
      paymentMethodType: methodType,
      transactionAmount: context.amount.toString(),
      transactionCurrency: context.currency,
      gasFeeUsd: context.gasFeeUsd?.toString(),
      totalCostUsd: context.totalCostUsd?.toString(),
      networkId: context.networkId,
      wasPreferred: context.wasPreferred,
      wasSuggested: context.wasSuggested,
      contextData: context.marketConditions || {}
    });
  }

  private async saveUserPreferences(
    userId: string,
    preferences: UserPreferences
  ): Promise<void> {
    const encryptedPreferences = this.encryptPreferences(preferences, userId);
    
    // Prepare preference scores for quick access
    const preferenceScores = preferences.preferredMethods.reduce((acc, pref) => {
      acc[pref.methodType] = {
        score: pref.preferenceScore,
        usageCount: pref.usageCount,
        lastUsed: pref.lastUsed?.toISOString(),
        averageCost: pref.averageCost,
        successRate: pref.successRate
      };
      return acc;
    }, {} as Record<string, any>);

    const existingPreference = await db
      .select()
      .from(paymentMethodPreferences)
      .where(eq(paymentMethodPreferences.userId, userId))
      .limit(1);

    if (existingPreference.length > 0) {
      // Update existing preferences
      await db
        .update(paymentMethodPreferences)
        .set({
          encryptedPreferences,
          preferredMethods: preferences.preferredMethods.map(p => p.methodType),
          avoidedMethods: preferences.avoidedMethods,
          maxGasFeeThreshold: preferences.maxGasFeeThreshold.toString(),
          preferStablecoins: preferences.preferStablecoins,
          preferFiat: preferences.preferFiat,
          preferenceScores,
          lastUsedMethods: preferences.lastUsedMethods,
          totalTransactions: preferences.preferredMethods.reduce((sum, p) => sum + p.usageCount, 0),
          updatedAt: new Date()
        })
        .where(eq(paymentMethodPreferences.userId, userId));
    } else {
      // Create new preferences
      await db.insert(paymentMethodPreferences).values({
        userId,
        encryptedPreferences,
        preferredMethods: preferences.preferredMethods.map(p => p.methodType),
        avoidedMethods: preferences.avoidedMethods,
        maxGasFeeThreshold: preferences.maxGasFeeThreshold.toString(),
        preferStablecoins: preferences.preferStablecoins,
        preferFiat: preferences.preferFiat,
        preferenceScores,
        lastUsedMethods: preferences.lastUsedMethods,
        totalTransactions: preferences.preferredMethods.reduce((sum, p) => sum + p.usageCount, 0)
      });
    }
  }
}

export const userPreferenceService = new UserPreferenceService();

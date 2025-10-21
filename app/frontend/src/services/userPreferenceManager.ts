/**
 * User Preference Manager
 * Manages user payment preferences and learning algorithms
 */

import {
  PaymentMethod,
  PaymentMethodType,
  UserPreferences,
  PaymentMethodPreference,
  RecentPaymentMethod
} from '../types/paymentPrioritization';
import { IUserPreferenceManager } from './paymentMethodPrioritizationService';

export class UserPreferenceManager implements IUserPreferenceManager {
  private readonly PREFERENCE_DECAY_DAYS = 30; // Preferences decay after 30 days
  private readonly MAX_RECENT_METHODS = 10; // Keep last 10 transactions
  private readonly LEARNING_RATE = 0.1; // How quickly preferences adapt

  async getUserPaymentPreferences(userId: string): Promise<UserPreferences> {
    try {
      // In production, this would fetch from a database or API
      const stored = localStorage.getItem(`payment_preferences_${userId}`);
      
      if (stored) {
        const preferences = JSON.parse(stored);
        // Convert date strings back to Date objects
        preferences.preferredMethods = preferences.preferredMethods.map((pref: any) => ({
          ...pref,
          lastUsed: new Date(pref.lastUsed)
        }));
        preferences.lastUsedMethods = preferences.lastUsedMethods.map((method: any) => ({
          ...method,
          usedAt: new Date(method.usedAt)
        }));
        
        return this.applyPreferenceDecay(preferences);
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }

    // Return default preferences
    return this.getDefaultPreferences();
  }

  async updatePaymentPreference(
    userId: string,
    method: PaymentMethodType,
    transactionContext: { amount: number; successful: boolean; chainId?: number }
  ): Promise<void> {
    try {
      const preferences = await this.getUserPaymentPreferences(userId);
      
      // Update or create preference for this method
      const existingPrefIndex = preferences.preferredMethods.findIndex(
        pref => pref.methodType === method
      );

      if (existingPrefIndex >= 0) {
        const existingPref = preferences.preferredMethods[existingPrefIndex];
        
        // Update existing preference
        preferences.preferredMethods[existingPrefIndex] = {
          ...existingPref,
          score: this.calculateUpdatedScore(existingPref.score, transactionContext.successful),
          usageCount: existingPref.usageCount + 1,
          lastUsed: new Date(),
          averageTransactionAmount: this.calculateAverageAmount(
            existingPref.averageTransactionAmount,
            existingPref.usageCount,
            transactionContext.amount
          )
        };
      } else {
        // Create new preference
        preferences.preferredMethods.push({
          methodType: method,
          score: transactionContext.successful ? 0.7 : 0.3, // Start with moderate score
          usageCount: 1,
          lastUsed: new Date(),
          averageTransactionAmount: transactionContext.amount
        });
      }

      // Add to recent methods
      preferences.lastUsedMethods.unshift({
        methodType: method,
        usedAt: new Date(),
        transactionAmount: transactionContext.amount,
        chainId: transactionContext.chainId,
        successful: transactionContext.successful
      });

      // Keep only recent methods
      preferences.lastUsedMethods = preferences.lastUsedMethods.slice(0, this.MAX_RECENT_METHODS);

      // Update auto-preferences based on usage patterns
      this.updateAutoPreferences(preferences);

      // Save updated preferences
      await this.saveUserPreferences(userId, preferences);
    } catch (error) {
      console.error('Failed to update payment preference:', error);
    }
  }

  calculatePreferenceScore(method: PaymentMethod, preferences: UserPreferences): number {
    const methodPreference = preferences.preferredMethods.find(
      pref => pref.methodType === method.type
    );

    if (!methodPreference) {
      // No preference data, return neutral score based on method type
      return this.getDefaultMethodScore(method.type);
    }

    // Apply time decay to preference score
    const daysSinceLastUse = this.getDaysSince(methodPreference.lastUsed);
    const decayFactor = Math.max(0.1, 1 - (daysSinceLastUse / this.PREFERENCE_DECAY_DAYS));
    
    return methodPreference.score * decayFactor;
  }

  getRecommendedMethod(
    availableMethods: PaymentMethod[],
    preferences: UserPreferences
  ): PaymentMethod | null {
    if (availableMethods.length === 0) return null;

    // Calculate scores for all available methods
    const methodScores = availableMethods.map(method => ({
      method,
      score: this.calculatePreferenceScore(method, preferences)
    }));

    // Sort by score and return highest
    methodScores.sort((a, b) => b.score - a.score);
    
    return methodScores[0].method;
  }

  // Utility methods
  private getDefaultPreferences(): UserPreferences {
    return {
      preferredMethods: [],
      avoidedMethods: [],
      maxGasFeeThreshold: 25, // $25 USD default
      preferStablecoins: true,
      preferFiat: false,
      lastUsedMethods: [],
      autoSelectBestOption: true
    };
  }

  private getDefaultMethodScore(methodType: PaymentMethodType): number {
    // Default scores based on general user preferences
    switch (methodType) {
      case PaymentMethodType.STABLECOIN_USDC:
        return 0.8; // High default preference for USDC
      case PaymentMethodType.FIAT_STRIPE:
        return 0.7; // Good default for fiat
      case PaymentMethodType.STABLECOIN_USDT:
        return 0.6; // Moderate preference for USDT
      case PaymentMethodType.NATIVE_ETH:
        return 0.4; // Lower default due to volatility
      default:
        return 0.5; // Neutral
    }
  }

  private calculateUpdatedScore(currentScore: number, successful: boolean): number {
    // Use learning rate to adjust score based on transaction success
    const adjustment = successful ? this.LEARNING_RATE : -this.LEARNING_RATE;
    const newScore = currentScore + adjustment;
    
    // Keep score within bounds [0, 1]
    return Math.max(0, Math.min(1, newScore));
  }

  private calculateAverageAmount(
    currentAverage: number,
    usageCount: number,
    newAmount: number
  ): number {
    return ((currentAverage * usageCount) + newAmount) / (usageCount + 1);
  }

  private getDaysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private applyPreferenceDecay(preferences: UserPreferences): UserPreferences {
    // Apply time-based decay to preference scores
    preferences.preferredMethods = preferences.preferredMethods.map(pref => {
      const daysSinceLastUse = this.getDaysSince(pref.lastUsed);
      const decayFactor = Math.max(0.1, 1 - (daysSinceLastUse / this.PREFERENCE_DECAY_DAYS));
      
      return {
        ...pref,
        score: pref.score * decayFactor
      };
    });

    return preferences;
  }

  private updateAutoPreferences(preferences: UserPreferences): void {
    // Analyze recent usage patterns to update auto-preferences
    const recentSuccessfulMethods = preferences.lastUsedMethods
      .filter(method => method.successful)
      .slice(0, 5); // Last 5 successful transactions

    if (recentSuccessfulMethods.length >= 3) {
      // Check if user prefers stablecoins
      const stablecoinUsage = recentSuccessfulMethods.filter(method =>
        method.methodType === PaymentMethodType.STABLECOIN_USDC ||
        method.methodType === PaymentMethodType.STABLECOIN_USDT
      ).length;

      preferences.preferStablecoins = stablecoinUsage / recentSuccessfulMethods.length > 0.6;

      // Check if user prefers fiat
      const fiatUsage = recentSuccessfulMethods.filter(method =>
        method.methodType === PaymentMethodType.FIAT_STRIPE
      ).length;

      preferences.preferFiat = fiatUsage / recentSuccessfulMethods.length > 0.6;

      // Adjust gas fee threshold based on usage patterns
      const avgTransactionAmount = recentSuccessfulMethods.reduce(
        (sum, method) => sum + method.transactionAmount, 0
      ) / recentSuccessfulMethods.length;

      // Higher transaction amounts might tolerate higher gas fees
      if (avgTransactionAmount > 1000) {
        preferences.maxGasFeeThreshold = Math.max(preferences.maxGasFeeThreshold, 50);
      } else if (avgTransactionAmount < 100) {
        preferences.maxGasFeeThreshold = Math.min(preferences.maxGasFeeThreshold, 15);
      }
    }
  }

  private async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      // In production, this would save to a database or API
      localStorage.setItem(`payment_preferences_${userId}`, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  // Additional utility methods for preference management
  async resetUserPreferences(userId: string): Promise<void> {
    try {
      localStorage.removeItem(`payment_preferences_${userId}`);
    } catch (error) {
      console.error('Failed to reset user preferences:', error);
    }
  }

  async addAvoidedMethod(userId: string, methodType: PaymentMethodType): Promise<void> {
    const preferences = await this.getUserPaymentPreferences(userId);
    
    if (!preferences.avoidedMethods.includes(methodType)) {
      preferences.avoidedMethods.push(methodType);
      await this.saveUserPreferences(userId, preferences);
    }
  }

  async removeAvoidedMethod(userId: string, methodType: PaymentMethodType): Promise<void> {
    const preferences = await this.getUserPaymentPreferences(userId);
    
    preferences.avoidedMethods = preferences.avoidedMethods.filter(
      method => method !== methodType
    );
    
    await this.saveUserPreferences(userId, preferences);
  }

  async updateGasFeeThreshold(userId: string, threshold: number): Promise<void> {
    const preferences = await this.getUserPaymentPreferences(userId);
    preferences.maxGasFeeThreshold = Math.max(0, threshold);
    await this.saveUserPreferences(userId, preferences);
  }

  // Analytics methods
  getPreferenceAnalytics(preferences: UserPreferences): {
    mostUsedMethod: PaymentMethodType | null;
    averageTransactionAmount: number;
    successRate: number;
    preferenceStrength: number;
  } {
    if (preferences.preferredMethods.length === 0) {
      return {
        mostUsedMethod: null,
        averageTransactionAmount: 0,
        successRate: 0,
        preferenceStrength: 0
      };
    }

    // Find most used method
    const mostUsed = preferences.preferredMethods.reduce((prev, current) =>
      prev.usageCount > current.usageCount ? prev : current
    );

    // Calculate average transaction amount
    const totalAmount = preferences.preferredMethods.reduce(
      (sum, pref) => sum + (pref.averageTransactionAmount * pref.usageCount), 0
    );
    const totalTransactions = preferences.preferredMethods.reduce(
      (sum, pref) => sum + pref.usageCount, 0
    );

    // Calculate success rate from recent methods
    const successfulTransactions = preferences.lastUsedMethods.filter(
      method => method.successful
    ).length;
    const successRate = preferences.lastUsedMethods.length > 0 
      ? successfulTransactions / preferences.lastUsedMethods.length 
      : 0;

    // Calculate preference strength (how concentrated preferences are)
    const maxScore = Math.max(...preferences.preferredMethods.map(pref => pref.score));
    const avgScore = preferences.preferredMethods.reduce((sum, pref) => sum + pref.score, 0) 
      / preferences.preferredMethods.length;
    const preferenceStrength = maxScore - avgScore;

    return {
      mostUsedMethod: mostUsed.methodType,
      averageTransactionAmount: totalAmount / totalTransactions,
      successRate,
      preferenceStrength
    };
  }
}

export default UserPreferenceManager;
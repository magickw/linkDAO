/**
 * Preference Override Service
 * Handles manual payment method selection and preference overrides
 */

import { eq, and, or, isNull, lt, gte } from 'drizzle-orm';
import { db } from '../db/connection';
import { paymentMethodPreferenceOverrides, paymentMethodPreferences } from '../db/schema';
import { userPreferenceService, UserPreferences } from './userPreferenceService';

export interface PreferenceOverride {
  id: string;
  userId: string;
  overrideType: 'manual_selection' | 'temporary_preference' | 'network_specific';
  paymentMethodType: string;
  networkId?: number;
  priorityBoost: number;
  expiresAt?: Date;
  reason?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface OverrideOptions {
  networkId?: number;
  priorityBoost?: number;
  expiresAt?: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface ManualSelectionContext {
  availableMethods: string[];
  recommendedMethod: string;
  transactionAmount: number;
  currency: string;
  networkId?: number;
  gasFeeUsd?: number;
}

export class PreferenceOverrideService {
  private readonly DEFAULT_MANUAL_BOOST = 5;
  private readonly DEFAULT_TEMPORARY_BOOST = 3;
  private readonly DEFAULT_NETWORK_BOOST = 2;
  private readonly MAX_PRIORITY_BOOST = 10;
  private readonly MIN_PRIORITY_BOOST = -10;

  /**
   * Handle manual payment method selection
   */
  async handleManualSelection(
    userId: string,
    selectedMethod: string,
    context: ManualSelectionContext
  ): Promise<void> {
    try {
      // Record the manual selection as an override
      await this.addPreferenceOverride(userId, 'manual_selection', selectedMethod, {
        priorityBoost: this.DEFAULT_MANUAL_BOOST,
        reason: `User manually selected ${selectedMethod} over recommended ${context.recommendedMethod}`,
        metadata: {
          availableMethods: context.availableMethods,
          recommendedMethod: context.recommendedMethod,
          transactionAmount: context.transactionAmount,
          currency: context.currency,
          networkId: context.networkId,
          gasFeeUsd: context.gasFeeUsd,
          selectionTimestamp: new Date().toISOString()
        }
      });

      // Update user preferences based on manual selection
      await userPreferenceService.updatePaymentPreference(userId, selectedMethod, {
        amount: context.transactionAmount,
        currency: context.currency,
        networkId: context.networkId,
        gasFeeUsd: context.gasFeeUsd,
        wasPreferred: true, // User manually selected it
        wasSuggested: selectedMethod === context.recommendedMethod
      });

      console.log(`Recorded manual selection for user ${userId}: ${selectedMethod}`);
    } catch (error) {
      console.error('Error handling manual selection:', error);
      throw error;
    }
  }

  /**
   * Add a preference override
   */
  async addPreferenceOverride(
    userId: string,
    overrideType: 'manual_selection' | 'temporary_preference' | 'network_specific',
    methodType: string,
    options: OverrideOptions = {}
  ): Promise<string> {
    try {
      // Validate priority boost
      const priorityBoost = Math.max(
        this.MIN_PRIORITY_BOOST,
        Math.min(this.MAX_PRIORITY_BOOST, options.priorityBoost || this.getDefaultBoost(overrideType))
      );

      // Set default expiration for temporary preferences
      let expiresAt = options.expiresAt;
      if (overrideType === 'temporary_preference' && !expiresAt) {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Default 24 hour expiration
      }

      const [override] = await db
        .insert(paymentMethodPreferenceOverrides)
        .values({
          userId,
          overrideType,
          paymentMethodType: methodType,
          networkId: options.networkId,
          priorityBoost,
          expiresAt,
          reason: options.reason,
          metadata: options.metadata || {}
        })
        .returning();

      console.log(`Added preference override for user ${userId}: ${overrideType} - ${methodType}`);
      return override.id;
    } catch (error) {
      console.error('Error adding preference override:', error);
      throw error;
    }
  }

  /**
   * Get active overrides for a user
   */
  async getActiveOverrides(userId: string, networkId?: number): Promise<PreferenceOverride[]> {
    try {
      const now = new Date();
      
      let whereConditions = and(
        eq(paymentMethodPreferenceOverrides.userId, userId),
        or(
          isNull(paymentMethodPreferenceOverrides.expiresAt),
          gte(paymentMethodPreferenceOverrides.expiresAt, now)
        )
      );

      // Filter by network if specified
      if (networkId !== undefined) {
        whereConditions = and(
          whereConditions,
          or(
            isNull(paymentMethodPreferenceOverrides.networkId),
            eq(paymentMethodPreferenceOverrides.networkId, networkId)
          )
        );
      }

      const overrides = await db
        .select()
        .from(paymentMethodPreferenceOverrides)
        .where(whereConditions);

      return overrides.map(override => ({
        id: override.id,
        userId: override.userId,
        overrideType: override.overrideType as any,
        paymentMethodType: override.paymentMethodType,
        networkId: override.networkId || undefined,
        priorityBoost: override.priorityBoost || 0,
        expiresAt: override.expiresAt || undefined,
        reason: override.reason || undefined,
        metadata: (override.metadata as Record<string, any>) || {},
        createdAt: override.createdAt
      }));
    } catch (error) {
      console.error('Error getting active overrides:', error);
      return [];
    }
  }

  /**
   * Apply overrides to payment method priorities
   */
  async applyOverridesToPreferences(
    userId: string,
    basePreferences: UserPreferences,
    networkId?: number
  ): Promise<UserPreferences> {
    try {
      const activeOverrides = await this.getActiveOverrides(userId, networkId);
      
      if (activeOverrides.length === 0) {
        return basePreferences;
      }

      const modifiedPreferences = { ...basePreferences };
      
      // Apply overrides to preferred methods
      modifiedPreferences.preferredMethods = basePreferences.preferredMethods.map(method => {
        const override = activeOverrides.find(o => o.paymentMethodType === method.methodType);
        
        if (override) {
          const boostedScore = Math.max(0, Math.min(1, method.preferenceScore + (override.priorityBoost * 0.1)));
          
          return {
            ...method,
            preferenceScore: boostedScore,
            overrideApplied: true,
            overrideReason: override.reason
          } as any;
        }
        
        return method;
      });

      // Add methods that have overrides but aren't in preferred methods
      activeOverrides.forEach(override => {
        const existingMethod = modifiedPreferences.preferredMethods.find(
          m => m.methodType === override.paymentMethodType
        );
        
        if (!existingMethod) {
          modifiedPreferences.preferredMethods.push({
            methodType: override.paymentMethodType,
            preferenceScore: Math.max(0.1, override.priorityBoost * 0.1),
            usageCount: 0,
            overrideApplied: true,
            overrideReason: override.reason
          } as any);
        }
      });

      // Sort by preference score (including overrides)
      modifiedPreferences.preferredMethods.sort((a, b) => b.preferenceScore - a.preferenceScore);

      return modifiedPreferences;
    } catch (error) {
      console.error('Error applying overrides to preferences:', error);
      return basePreferences;
    }
  }

  /**
   * Remove a specific override
   */
  async removeOverride(userId: string, overrideId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(paymentMethodPreferenceOverrides)
        .where(
          and(
            eq(paymentMethodPreferenceOverrides.id, overrideId),
            eq(paymentMethodPreferenceOverrides.userId, userId)
          )
        );

      const deleted = (result.rowCount || 0) > 0;
      
      if (deleted) {
        console.log(`Removed override ${overrideId} for user ${userId}`);
      }
      
      return deleted;
    } catch (error) {
      console.error('Error removing override:', error);
      return false;
    }
  }

  /**
   * Remove all overrides for a user
   */
  async removeAllOverrides(userId: string): Promise<number> {
    try {
      const result = await db
        .delete(paymentMethodPreferenceOverrides)
        .where(eq(paymentMethodPreferenceOverrides.userId, userId));

      const deletedCount = result.rowCount || 0;
      console.log(`Removed ${deletedCount} overrides for user ${userId}`);
      return deletedCount;
    } catch (error) {
      console.error('Error removing all overrides:', error);
      return 0;
    }
  }

  /**
   * Remove overrides by type
   */
  async removeOverridesByType(
    userId: string,
    overrideType: 'manual_selection' | 'temporary_preference' | 'network_specific'
  ): Promise<number> {
    try {
      const result = await db
        .delete(paymentMethodPreferenceOverrides)
        .where(
          and(
            eq(paymentMethodPreferenceOverrides.userId, userId),
            eq(paymentMethodPreferenceOverrides.overrideType, overrideType)
          )
        );

      const deletedCount = result.rowCount || 0;
      console.log(`Removed ${deletedCount} ${overrideType} overrides for user ${userId}`);
      return deletedCount;
    } catch (error) {
      console.error('Error removing overrides by type:', error);
      return 0;
    }
  }

  /**
   * Set temporary preference for a payment method
   */
  async setTemporaryPreference(
    userId: string,
    methodType: string,
    durationHours: number = 24,
    reason?: string
  ): Promise<string> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + durationHours);

      return await this.addPreferenceOverride(userId, 'temporary_preference', methodType, {
        priorityBoost: this.DEFAULT_TEMPORARY_BOOST,
        expiresAt,
        reason: reason || `Temporary preference for ${methodType} (${durationHours}h)`,
        metadata: {
          durationHours,
          setAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error setting temporary preference:', error);
      throw error;
    }
  }

  /**
   * Set network-specific preference
   */
  async setNetworkSpecificPreference(
    userId: string,
    methodType: string,
    networkId: number,
    reason?: string
  ): Promise<string> {
    try {
      return await this.addPreferenceOverride(userId, 'network_specific', methodType, {
        networkId,
        priorityBoost: this.DEFAULT_NETWORK_BOOST,
        reason: reason || `Network-specific preference for ${methodType} on network ${networkId}`,
        metadata: {
          networkId,
          setAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error setting network-specific preference:', error);
      throw error;
    }
  }

  /**
   * Get override statistics for a user
   */
  async getOverrideStats(userId: string): Promise<{
    totalOverrides: number;
    activeOverrides: number;
    expiredOverrides: number;
    overridesByType: Record<string, number>;
    mostOverriddenMethod: string | null;
  }> {
    try {
      const allOverrides = await db
        .select()
        .from(paymentMethodPreferenceOverrides)
        .where(eq(paymentMethodPreferenceOverrides.userId, userId));

      const now = new Date();
      const activeOverrides = allOverrides.filter(o => !o.expiresAt || o.expiresAt > now);
      const expiredOverrides = allOverrides.filter(o => o.expiresAt && o.expiresAt <= now);

      const overridesByType: Record<string, number> = {};
      const methodCounts: Record<string, number> = {};

      allOverrides.forEach(override => {
        overridesByType[override.overrideType] = (overridesByType[override.overrideType] || 0) + 1;
        methodCounts[override.paymentMethodType] = (methodCounts[override.paymentMethodType] || 0) + 1;
      });

      const mostOverriddenMethod = Object.entries(methodCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

      return {
        totalOverrides: allOverrides.length,
        activeOverrides: activeOverrides.length,
        expiredOverrides: expiredOverrides.length,
        overridesByType,
        mostOverriddenMethod
      };
    } catch (error) {
      console.error('Error getting override stats:', error);
      return {
        totalOverrides: 0,
        activeOverrides: 0,
        expiredOverrides: 0,
        overridesByType: {},
        mostOverriddenMethod: null
      };
    }
  }

  /**
   * Check if user has freedom to choose payment methods
   */
  async hasPaymentMethodFreedom(userId: string): Promise<boolean> {
    try {
      // Users always have freedom to choose - this is a core requirement
      // This method can be used to check if there are any system-level restrictions
      
      // For now, always return true as per requirement 5.3:
      // "WHEN a user manually selects a different payment method 
      //  THEN the Payment_Method_Prioritization_System SHALL allow the selection without restriction"
      
      return true;
    } catch (error) {
      console.error('Error checking payment method freedom:', error);
      return true; // Default to allowing freedom
    }
  }

  /**
   * Reset all preference overrides for a user (preference reset functionality)
   */
  async resetAllPreferenceOverrides(userId: string): Promise<{
    removedOverrides: number;
    resetTimestamp: Date;
  }> {
    try {
      const removedOverrides = await this.removeAllOverrides(userId);
      const resetTimestamp = new Date();

      // Also reset the user's base preferences
      await userPreferenceService.resetUserPreferences(userId);

      console.log(`Reset all preference overrides for user ${userId}: ${removedOverrides} overrides removed`);

      return {
        removedOverrides,
        resetTimestamp
      };
    } catch (error) {
      console.error('Error resetting all preference overrides:', error);
      throw error;
    }
  }

  // Private helper methods

  private getDefaultBoost(overrideType: string): number {
    switch (overrideType) {
      case 'manual_selection':
        return this.DEFAULT_MANUAL_BOOST;
      case 'temporary_preference':
        return this.DEFAULT_TEMPORARY_BOOST;
      case 'network_specific':
        return this.DEFAULT_NETWORK_BOOST;
      default:
        return 1;
    }
  }

  /**
   * Clean up expired overrides (called by maintenance service)
   */
  async cleanupExpiredOverrides(): Promise<number> {
    try {
      const now = new Date();
      const result = await db
        .delete(paymentMethodPreferenceOverrides)
        .where(
          and(
            lt(paymentMethodPreferenceOverrides.expiresAt, now)
          )
        );

      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} expired preference overrides`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired overrides:', error);
      return 0;
    }
  }
}

export const preferenceOverrideService = new PreferenceOverrideService();
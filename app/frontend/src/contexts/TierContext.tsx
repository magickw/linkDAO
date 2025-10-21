/**
 * Tier Context Provider
 * Provides tier information and validation throughout the seller component tree
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TierContext, SellerTier, TierProgress, TierValidationResult, TierAction, TIER_ACTIONS, TIER_LEVELS } from '../types/sellerTier';
import tierManagementService from '../services/tierManagementService';

const TierContextInstance = createContext<TierContext | null>(null);

interface TierProviderProps {
  children: React.ReactNode;
  walletAddress: string;
}

export const TierProvider: React.FC<TierProviderProps> = ({ children, walletAddress }) => {
  const [tier, setTier] = useState<SellerTier | null>(null);
  const [progress, setProgress] = useState<TierProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTierData = useCallback(async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      setError(null);

      const [tierData, progressData] = await Promise.all([
        tierManagementService.getSellerTier(walletAddress),
        tierManagementService.getTierProgress(walletAddress),
      ]);

      setTier(tierData);
      setProgress(progressData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tier data';
      setError(errorMessage);
      console.error('Error loading tier data:', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const refreshTier = useCallback(async () => {
    if (!walletAddress) return;

    try {
      await tierManagementService.refreshTierData(walletAddress);
      await loadTierData();
    } catch (err) {
      console.error('Error refreshing tier data:', err);
    }
  }, [walletAddress, loadTierData]);

  const canPerformAction = useCallback((action: TierAction): TierValidationResult => {
    if (!tier) {
      return {
        isAllowed: false,
        reason: 'Tier information not available',
        upgradeRequired: false,
      };
    }

    // Perform local validation based on tier object
    switch (action) {
      case TIER_ACTIONS.CREATE_LISTING:
        const listingLimit = tier.benefits.find(b => b.type === 'listing_limit');
        if (!listingLimit) {
          return {
            isAllowed: false,
            reason: 'Listing creation not available for your tier',
            upgradeRequired: true,
          };
        }
        return { isAllowed: true };

      case TIER_ACTIONS.ACCESS_ANALYTICS:
        const analyticsAccess = tier.benefits.find(b => b.type === 'analytics_access');
        if (!analyticsAccess) {
          return {
            isAllowed: false,
            reason: 'Analytics access requires Silver tier or higher',
            alternativeAction: 'Upgrade to Silver tier to access analytics',
            upgradeRequired: true,
          };
        }
        return { isAllowed: true };

      case TIER_ACTIONS.PRIORITY_SUPPORT:
        const prioritySupport = tier.benefits.find(b => b.type === 'priority_support');
        if (!prioritySupport) {
          return {
            isAllowed: false,
            reason: 'Priority support requires Gold tier or higher',
            alternativeAction: 'Upgrade to Gold tier for priority support',
            upgradeRequired: true,
          };
        }
        return { isAllowed: true };

      case TIER_ACTIONS.CUSTOM_BRANDING:
        if (tier.level < TIER_LEVELS.GOLD) {
          return {
            isAllowed: false,
            reason: 'Custom branding requires Gold tier or higher',
            alternativeAction: 'Upgrade to Gold tier for custom branding',
            upgradeRequired: true,
          };
        }
        return { isAllowed: true };

      default:
        return {
          isAllowed: false,
          reason: 'Unknown action',
          upgradeRequired: false,
        };
    }
  }, [tier]);

  useEffect(() => {
    loadTierData();
  }, [loadTierData]);

  const contextValue: TierContext = {
    tier,
    progress,
    loading,
    error,
    canPerformAction,
    refreshTier,
  };

  return (
    <TierContextInstance.Provider value={contextValue}>
      {children}
    </TierContextInstance.Provider>
  );
};

export const useTier = (): TierContext => {
  const context = useContext(TierContextInstance);
  if (!context) {
    throw new Error('useTier must be used within a TierProvider');
  }
  return context;
};

export default TierProvider;
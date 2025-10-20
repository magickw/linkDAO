/**
 * Tier Context Provider
 * Provides tier information and validation throughout the seller component tree
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TierContext, SellerTier, TierProgress, TierValidationResult, TierAction } from '../types/sellerTier';
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

    return tierManagementService.validateTierAction(walletAddress, action);
  }, [tier, walletAddress]);

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
/**
 * React hook for Reputation System
 * Provides easy access to reputation data and functions
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useEthersSigner } from '@/hooks/useEthersSigner';
import { reputationService, Reputation, ReputationAction } from '@/services/contracts/reputationService';

export const useReputation = (userAddress?: string) => {
  const { address: connectedAddress } = useAccount();
  const signer = useEthersSigner();
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetAddress = userAddress || connectedAddress;

  // Fetch reputation data
  const fetchReputation = useCallback(async () => {
    if (!targetAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rep = await reputationService.getUserReputation(targetAddress);
      setReputation(rep);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reputation');
    } finally {
      setLoading(false);
    }
  }, [targetAddress]);

  // Update reputation
  const updateReputation = useCallback(async (
    action: ReputationAction,
    amount: number
  ) => {
    if (!signer || !targetAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      await reputationService.updateReputation(targetAddress, action, amount, signer);
      // Refresh reputation after update
      await fetchReputation();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update reputation');
    }
  }, [signer, targetAddress, fetchReputation]);

  // Check if user has minimum reputation level
  const hasMinimumReputation = useCallback(async (requiredLevel: number) => {
    if (!targetAddress) return false;
    
    try {
      return await reputationService.hasMinimumReputation(targetAddress, requiredLevel);
    } catch {
      return false;
    }
  }, [targetAddress]);

  // Get reputation needed for next level
  const getReputationToNextLevel = useCallback(async () => {
    if (!targetAddress) return 0;
    
    try {
      return await reputationService.getReputationToNextLevel(targetAddress);
    } catch {
      return 0;
    }
  }, [targetAddress]);

  // Initialize service and fetch data
  useEffect(() => {
    const initialize = async () => {
      try {
        await reputationService.initialize();
        await fetchReputation();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize reputation service');
        setLoading(false);
      }
    };

    initialize();
  }, [fetchReputation]);

  // Set up event listeners
  useEffect(() => {
    if (!targetAddress) return;

    // Listen to reputation updates
    reputationService.listenToReputationUpdates((user, action, amount, newScore) => {
      if (user.toLowerCase() === targetAddress.toLowerCase()) {
        // Refresh reputation on update
        fetchReputation();
      }
    });

    // Listen to level ups
    reputationService.listenToLevelUps((user, newLevel) => {
      if (user.toLowerCase() === targetAddress.toLowerCase()) {
        // Refresh reputation on level up
        fetchReputation();
      }
    });

    // Cleanup
    return () => {
      reputationService.cleanup();
    };
  }, [targetAddress, fetchReputation]);

  return {
    reputation,
    loading,
    error,
    updateReputation,
    hasMinimumReputation,
    getReputationToNextLevel,
    refetch: fetchReputation
  };
};

// Hook for multiple users' reputations
export const useMultipleReputations = (userAddresses: string[]) => {
  const [reputations, setReputations] = useState<Record<string, Reputation>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMultipleReputations = useCallback(async () => {
    if (userAddresses.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await reputationService.initialize();
      const reps = await reputationService.getMultipleReputations(userAddresses);
      setReputations(reps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reputations');
    } finally {
      setLoading(false);
    }
  }, [userAddresses]);

  useEffect(() => {
    fetchMultipleReputations();
  }, [fetchMultipleReputations]);

  return {
    reputations,
    loading,
    error,
    refetch: fetchMultipleReputations
  };
};

// Hook for reputation level thresholds
export const useReputationLevels = () => {
  const getLevelThreshold = (level: number): number => {
    return reputationService.getLevelThreshold(level);
  };

  const calculateReputationChange = (action: ReputationAction, amount: number): number => {
    return reputationService.calculateReputationChange(action, amount);
  };

  const getLevelProgress = (score: number): { level: number; progress: number; nextThreshold: number } => {
    let level = 0;
    let threshold = 0;

    while (score >= getLevelThreshold(level + 1)) {
      level++;
    }

    const currentThreshold = getLevelThreshold(level);
    const nextThreshold = getLevelThreshold(level + 1);
    const progress = score > 0 ? ((score - currentThreshold) / (nextThreshold - currentThreshold)) * 100 : 0;

    return {
      level,
      progress: Math.min(100, progress),
      nextThreshold
    };
  };

  return {
    getLevelThreshold,
    calculateReputationChange,
    getLevelProgress
  };
};
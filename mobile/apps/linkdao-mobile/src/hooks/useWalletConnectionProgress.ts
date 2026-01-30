/**
 * Custom hook for tracking wallet connection progress
 * Provides real-time updates on wallet connection status and progress
 */

import { useState, useEffect, useCallback } from 'react';
import { walletService, WalletConnectionProgress, WalletProviderInfo } from '../services/walletConnectService';

export interface UseWalletConnectionProgressReturn {
  // Progress data
  progress: Record<string, WalletConnectionProgress>;
  currentProgress: WalletConnectionProgress | null;
  
  // Provider information
  providers: WalletProviderInfo[];
  loadingProviders: boolean;
  refreshProviders: () => Promise<void>;
  
  // Progress subscription
  subscribeToProgress: (callback: (progress: WalletConnectionProgress) => void) => () => void;
  
  // Utility methods
  getProgress: (providerId: string) => WalletConnectionProgress | undefined;
  clearProgress: (providerId: string) => void;
  clearAllProgress: () => void;
}

export function useWalletConnectionProgress(): UseWalletConnectionProgressReturn {
  const [progress, setProgress] = useState<Record<string, WalletConnectionProgress>>({});
  const [providers, setProviders] = useState<WalletProviderInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [currentProviderId, setCurrentProviderId] = useState<string | null>(null);

  // Load wallet providers
  const loadProviders = useCallback(async () => {
    try {
      setLoadingProviders(true);
      const providerList = await walletService.getWalletProviders();
      setProviders(providerList);
    } catch (error) {
      console.error('Failed to load wallet providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  // Refresh providers
  const refreshProviders = useCallback(async () => {
    await loadProviders();
  }, [loadProviders]);

  // Initialize providers on mount
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Subscribe to progress updates
  useEffect(() => {
    const unsubscribe = walletService.subscribeToProgress((progressUpdate) => {
      setProgress(prev => ({
        ...prev,
        [progressUpdate.providerId]: progressUpdate
      }));
      
      setCurrentProviderId(progressUpdate.providerId);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Get current progress (most recent)
  const currentProgress = currentProviderId ? progress[currentProviderId] : null;

  // Get progress for specific provider
  const getProgress = useCallback((providerId: string) => {
    return progress[providerId];
  }, [progress]);

  // Clear progress for specific provider
  const clearProgress = useCallback((providerId: string) => {
    walletService.clearConnectionProgress(providerId);
    setProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[providerId];
      return newProgress;
    });
    
    if (currentProviderId === providerId) {
      setCurrentProviderId(null);
    }
  }, [currentProviderId]);

  // Clear all progress
  const clearAllProgress = useCallback(() => {
    walletService.clearAllConnectionProgress();
    setProgress({});
    setCurrentProviderId(null);
  }, []);

  // Subscribe to progress updates externally
  const subscribeToProgress = useCallback((callback: (progress: WalletConnectionProgress) => void) => {
    return walletService.subscribeToProgress(callback);
  }, []);

  return {
    progress,
    currentProgress,
    providers,
    loadingProviders,
    refreshProviders,
    subscribeToProgress,
    getProgress,
    clearProgress,
    clearAllProgress
  };
}

export default useWalletConnectionProgress;
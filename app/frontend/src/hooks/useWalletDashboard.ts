/**
 * Wallet Dashboard Hook
 * Custom hook for wallet dashboard functionality
 */

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useWalletData } from './useWalletData';
import { useStaking } from './useContractInteractions';
import { useLDAOToken } from './useContractInteractions';
import { useWalletStore } from '@/stores/walletStore';

export interface DashboardData {
  portfolioValue: number;
  portfolioChange: number;
  stakingInfo: {
    totalStaked: string;
    totalRewards: string;
    activePositions: number;
    isPremiumMember: boolean;
    totalClaimableRewards: string;
  } | null;
  recentTransactions: number;
  notifications: number;
}

export function useWalletDashboard() {
  const { address, isConnected } = useAccount();
  const { dashboardView, setDashboardView } = useWalletStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    walletData,
    portfolio,
    tokens,
    transactions,
    isLoading,
    isRefreshing: isDataRefreshing,
    error,
    lastUpdated,
    refresh,
    clearError,
  } = useWalletData({
    autoRefresh: true,
    refreshInterval: 300000,
    enableTransactionHistory: true,
    maxTransactions: 20,
  });

  const { stakingInfo } = useStaking();
  const { balance } = useLDAOToken();

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh, isRefreshing]);

  const dashboardData: DashboardData = {
    portfolioValue: portfolio?.totalValueUSD || 0,
    portfolioChange: portfolio?.change24hPercent || 0,
    stakingInfo: stakingInfo || null,
    recentTransactions: transactions.length,
    notifications: 0, // This would come from the notification system
  };

  return {
    // Connection state
    isConnected,
    address,

    // Dashboard state
    dashboardView,
    setDashboardView,

    // Wallet data
    walletData,
    portfolio,
    tokens,
    transactions,
    dashboardData,

    // Staking data
    stakingInfo,
    tokenBalance: balance,

    // Loading states
    isLoading,
    isRefreshing: isRefreshing || isDataRefreshing,
    error,
    lastUpdated,

    // Actions
    refresh: handleRefresh,
    clearError,
  };
}
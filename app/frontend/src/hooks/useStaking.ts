/**
 * React hooks for Staking functionality
 * Provides easy access to staking operations and data
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSigner } from 'wagmi';
import { 
  stakingService, 
  StakingTier, 
  StakeInfo, 
  StakingStats 
} from '@/services/contracts/stakingService';

export const useStaking = () => {
  const { address } = useAccount();
  const { data: signer } = useSigner();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stake tokens
  const stake = useCallback(async (amount: number, tierId: number): Promise<string> => {
    if (!signer || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const stakeIndex = await stakingService.stake(amount, tierId, signer);
      return stakeIndex;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stake';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [signer, address]);

  // Unstake tokens
  const unstake = useCallback(async (stakeIndex: number, amount: number): Promise<void> => {
    if (!signer || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      await stakingService.unstake(stakeIndex, amount, signer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unstake';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [signer, address]);

  // Claim rewards from a specific stake
  const claimRewards = useCallback(async (stakeIndex: number): Promise<string> => {
    if (!signer || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const rewards = await stakingService.claimRewards(stakeIndex, signer);
      return rewards;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim rewards';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [signer, address]);

  // Claim all available rewards
  const claimAllRewards = useCallback(async (): Promise<string> => {
    if (!signer || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const rewards = await stakingService.claimAllRewards(signer);
      return rewards;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim all rewards';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [signer, address]);

  // Initialize service
  useEffect(() => {
    const initialize = async () => {
      try {
        await stakingService.initialize();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize staking service');
      }
    };

    initialize();
  }, []);

  return {
    loading,
    error,
    stake,
    unstake,
    claimRewards,
    claimAllRewards
  };
};

export const useStakingTiers = () => {
  const [tiers, setTiers] = useState<StakingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await stakingService.initialize();
      const stakingTiers = await stakingService.getStakingTiers();
      setTiers(stakingTiers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staking tiers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  return {
    tiers,
    loading,
    error,
    refetch: fetchTiers
  };
};

export const useUserStakes = (userAddress?: string) => {
  const { address: connectedAddress } = useAccount();
  const [stakes, setStakes] = useState<StakeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetAddress = userAddress || connectedAddress;

  const fetchStakes = useCallback(async () => {
    if (!targetAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await stakingService.initialize();
      const userStakes = await stakingService.getUserStakes(targetAddress);
      setStakes(userStakes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user stakes');
    } finally {
      setLoading(false);
    }
  }, [targetAddress]);

  useEffect(() => {
    fetchStakes();
  }, [fetchStakes]);

  // Listen to staking events
  useEffect(() => {
    if (!targetAddress) return;

    stakingService.listenToStakingEvents({
      onStaked: (user) => {
        if (user.toLowerCase() === targetAddress.toLowerCase()) {
          fetchStakes();
        }
      },
      onUnstaked: (user) => {
        if (user.toLowerCase() === targetAddress.toLowerCase()) {
          fetchStakes();
        }
      },
      onRewardsClaimed: (user) => {
        if (user.toLowerCase() === targetAddress.toLowerCase()) {
          fetchStakes();
        }
      }
    });

    return () => {
      stakingService.cleanup();
    };
  }, [targetAddress, fetchStakes]);

  return {
    stakes,
    loading,
    error,
    refetch: fetchStakes
  };
};

export const useStakingStats = (userAddress?: string) => {
  const { address: connectedAddress } = useAccount();
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetAddress = userAddress || connectedAddress;

  const fetchStats = useCallback(async () => {
    if (!targetAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await stakingService.initialize();
      const stakingStats = await stakingService.getStakingStats(targetAddress);
      setStats(stakingStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staking stats');
    } finally {
      setLoading(false);
    }
  }, [targetAddress]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Listen to staking events
  useEffect(() => {
    if (!targetAddress) return;

    stakingService.listenToStakingEvents({
      onStaked: (user) => {
        if (user.toLowerCase() === targetAddress.toLowerCase()) {
          fetchStats();
        }
      },
      onUnstaked: (user) => {
        if (user.toLowerCase() === targetAddress.toLowerCase()) {
          fetchStats();
        }
      },
      onRewardsClaimed: (user) => {
        if (user.toLowerCase() === targetAddress.toLowerCase()) {
          fetchStats();
        }
      }
    });

    return () => {
      stakingService.cleanup();
    };
  }, [targetAddress, fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};

export const useRewardPool = () => {
  const [balance, setBalance] = useState<string>('0');
  const [userRewards, setUserRewards] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();
  const { data: signer } = useSigner();

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await stakingService.initialize();
      const poolBalance = await stakingService.getRewardPoolBalance();
      setBalance(poolBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reward pool balance');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserRewards = useCallback(async () => {
    if (!address) {
      setUserRewards('0');
      return;
    }

    try {
      const rewards = await stakingService.getAvailableRewards(address);
      setUserRewards(rewards);
    } catch (err) {
      console.error('Failed to fetch user rewards:', err);
    }
  }, [address]);

  const depositRewards = useCallback(async (amount: number): Promise<void> => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      await stakingService.depositRewards(amount, signer);
      await fetchBalance();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit rewards';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [signer, fetchBalance]);

  useEffect(() => {
    fetchBalance();
    fetchUserRewards();
  }, [fetchBalance, fetchUserRewards]);

  // Listen to reward pool events
  useEffect(() => {
    stakingService.getRewardPoolContract().then(contract => {
      if (contract) {
        contract.on('RewardsDeposited', () => {
          fetchBalance();
        });
        contract.on('RewardsClaimed', (user) => {
          if (user.toLowerCase() === address?.toLowerCase()) {
            fetchUserRewards();
          }
        });
      }
    });

    return () => {
      stakingService.cleanup();
    };
  }, [fetchBalance, fetchUserRewards, address]);

  return {
    balance,
    userRewards,
    loading,
    error,
    depositRewards,
    refetch: () => {
      fetchBalance();
      fetchUserRewards();
    }
  };
};

// Helper hook for staking calculations
export const useStakingCalculations = () => {
  const calculateAPY = useCallback((rewardRate: number): number => {
    return stakingService.calculateAPY(rewardRate);
  }, []);

  const calculateExpectedRewards = useCallback((
    amount: number,
    rewardRate: number,
    lockPeriodSeconds: number,
    stakedDurationSeconds: number
  ): number => {
    return stakingService.calculateExpectedRewards(
      amount,
      rewardRate,
      lockPeriodSeconds,
      stakedDurationSeconds
    );
  }, []);

  const formatLockPeriod = useCallback((seconds: number): string => {
    const days = seconds / (24 * 60 * 60);
    if (days < 30) {
      return `${Math.floor(days)} days`;
    } else if (days < 365) {
      return `${(days / 30).toFixed(1)} months`;
    } else {
      return `${(days / 365).toFixed(1)} years`;
    }
  }, []);

  const getTimeRemaining = useCallback((endTime: number): string => {
    const now = Date.now() / 1000;
    const remaining = Math.max(0, endTime - now);
    
    if (remaining === 0) return 'Available now';
    
    const days = remaining / (24 * 60 * 60);
    if (days < 1) {
      const hours = remaining / 3600;
      return `${Math.floor(hours)} hours`;
    } else if (days < 30) {
      return `${Math.floor(days)} days`;
    } else {
      return `${(days / 30).toFixed(1)} months`;
    }
  }, []);

  return {
    calculateAPY,
    calculateExpectedRewards,
    formatLockPeriod,
    getTimeRemaining
  };
};
/**
 * React Hook for Community Token Gating
 * Provides easy access to token-gating functionality in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  communityTokenGatingService,
  TokenGatingRequirement,
  AccessCheckResult,
} from '@/services/blockchain/communityTokenGating';

export interface UseTokenGatingResult {
  hasAccess: boolean;
  loading: boolean;
  error: string | null;
  accessResult: AccessCheckResult | null;
  checkAccess: () => Promise<void>;
  userBalance?: string;
  userTokenIds?: string[];
}

/**
 * Hook to check if user has access to token-gated content
 */
export function useTokenGating(
  requirement: TokenGatingRequirement | null,
  autoCheck: boolean = true
): UseTokenGatingResult {
  const { address: userAddress } = useAccount();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessResult, setAccessResult] = useState<AccessCheckResult | null>(null);

  const checkAccess = useCallback(async () => {
    if (!userAddress || !requirement) {
      setHasAccess(false);
      setAccessResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await communityTokenGatingService.checkContentAccess(
        userAddress,
        requirement
      );

      setAccessResult(result);
      setHasAccess(result.hasAccess);

      if (!result.hasAccess) {
        setError(result.reason || 'Access denied');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check access';
      setError(errorMessage);
      setHasAccess(false);
      setAccessResult(null);
    } finally {
      setLoading(false);
    }
  }, [userAddress, requirement]);

  useEffect(() => {
    if (autoCheck) {
      checkAccess();
    }
  }, [autoCheck, checkAccess]);

  return {
    hasAccess,
    loading,
    error,
    accessResult,
    checkAccess,
    userBalance: accessResult?.userBalance,
    userTokenIds: accessResult?.userTokenIds,
  };
}

/**
 * Hook to check multiple token-gating requirements
 */
export function useMultipleTokenGating(
  requirements: TokenGatingRequirement[],
  logic: 'AND' | 'OR' = 'AND',
  autoCheck: boolean = true
): UseTokenGatingResult {
  const { address: userAddress } = useAccount();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessResult, setAccessResult] = useState<AccessCheckResult | null>(null);

  const checkAccess = useCallback(async () => {
    if (!userAddress || requirements.length === 0) {
      setHasAccess(false);
      setAccessResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result: boolean;

      if (logic === 'AND') {
        result = await communityTokenGatingService.checkAllRequirements(
          userAddress,
          requirements
        );
      } else {
        result = await communityTokenGatingService.checkAnyRequirement(
          userAddress,
          requirements
        );
      }

      setHasAccess(result);

      // Get details of first requirement for display
      if (requirements.length > 0) {
        const firstResult = await communityTokenGatingService.checkContentAccess(
          userAddress,
          requirements[0]
        );
        setAccessResult(firstResult);
      }

      if (!result) {
        setError(`Access denied: Must meet ${logic === 'AND' ? 'all' : 'at least one'} requirement(s)`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check access';
      setError(errorMessage);
      setHasAccess(false);
      setAccessResult(null);
    } finally {
      setLoading(false);
    }
  }, [userAddress, requirements, logic]);

  useEffect(() => {
    if (autoCheck) {
      checkAccess();
    }
  }, [autoCheck, checkAccess]);

  return {
    hasAccess,
    loading,
    error,
    accessResult,
    checkAccess,
    userBalance: accessResult?.userBalance,
    userTokenIds: accessResult?.userTokenIds,
  };
}

/**
 * Hook to get user's token balance
 */
export function useUserTokenBalance(tokenAddress?: string) {
  const { address: userAddress } = useAccount();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!userAddress) {
      setBalance('0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await communityTokenGatingService.getUserTokenBalance(
        userAddress,
        tokenAddress
      );
      setBalance(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
      setBalance('0');
    } finally {
      setLoading(false);
    }
  }, [userAddress, tokenAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, error, refetch: fetchBalance };
}

/**
 * Hook to get user's staked amount
 */
export function useUserStakedAmount(tokenAddress?: string) {
  const { address: userAddress } = useAccount();
  const [staked, setStaked] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStaked = useCallback(async () => {
    if (!userAddress) {
      setStaked('0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await communityTokenGatingService.getUserStakedAmount(
        userAddress,
        tokenAddress
      );
      setStaked(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch staked amount';
      setError(errorMessage);
      setStaked('0');
    } finally {
      setLoading(false);
    }
  }, [userAddress, tokenAddress]);

  useEffect(() => {
    fetchStaked();
  }, [fetchStaked]);

  return { staked, loading, error, refetch: fetchStaked };
}

/**
 * Hook to get user's voting power
 */
export function useUserVotingPower(tokenAddress?: string) {
  const { address: userAddress } = useAccount();
  const [votingPower, setVotingPower] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVotingPower = useCallback(async () => {
    if (!userAddress) {
      setVotingPower('0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await communityTokenGatingService.getUserVotingPower(
        userAddress,
        tokenAddress
      );
      setVotingPower(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch voting power';
      setError(errorMessage);
      setVotingPower('0');
    } finally {
      setLoading(false);
    }
  }, [userAddress, tokenAddress]);

  useEffect(() => {
    fetchVotingPower();
  }, [fetchVotingPower]);

  return { votingPower, loading, error, refetch: fetchVotingPower };
}

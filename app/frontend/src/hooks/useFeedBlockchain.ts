/**
 * React Hooks for Feed Blockchain Integration
 * Easy-to-use hooks for feed components
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  feedBlockchainService,
  UserBlockchainProfile,
  PostTokenGating,
} from '@/services/blockchain/feedBlockchain';

/**
 * Hook to get user's blockchain profile for display in feed
 */
export function useUserBlockchainProfile(userAddress: string | undefined) {
  const [profile, setProfile] = useState<UserBlockchainProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userAddress) {
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await feedBlockchainService.getUserBlockchainProfile(userAddress);
      setProfile(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
      setError(errorMessage);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}

/**
 * Hook to check if user has access to token-gated post
 */
export function usePostTokenGating(
  gatingRequirement: PostTokenGating['requirement'] | null
) {
  const { address: userAddress } = useAccount();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<string | undefined>();

  const checkAccess = useCallback(async () => {
    if (!userAddress || !gatingRequirement) {
      setHasAccess(false);
      setReason('Wallet not connected');
      return;
    }

    setLoading(true);

    try {
      const result = await feedBlockchainService.checkPostAccess(
        userAddress,
        gatingRequirement
      );

      setHasAccess(result.hasAccess);
      setReason(result.reason);
    } catch (err) {
      setHasAccess(false);
      setReason('Error checking access');
    } finally {
      setLoading(false);
    }
  }, [userAddress, gatingRequirement]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return { hasAccess, loading, reason, recheckAccess: checkAccess };
}

/**
 * Hook to send tips in feed
 */
export function useFeedTipping() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const sendTip = useCallback(
    async (recipientAddress: string, amount: string, message?: string) => {
      setLoading(true);
      setError(null);
      setTxHash(null);

      try {
        const result = await feedBlockchainService.sendTip(
          recipientAddress,
          amount,
          message
        );

        setTxHash(result.txHash || null);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send tip';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { sendTip, loading, error, txHash };
}

/**
 * Hook to batch fetch profiles for feed performance
 */
export function useBatchUserProfiles(userAddresses: string[]) {
  const [profiles, setProfiles] = useState<Map<string, UserBlockchainProfile>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    if (userAddresses.length === 0) {
      setProfiles(new Map());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await feedBlockchainService.batchGetUserProfiles(userAddresses);
      setProfiles(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profiles';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userAddresses.join(',')]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return { profiles, loading, error, refetch: fetchProfiles };
}

/**
 * Hook to display NFT avatar
 */
export function useNFTAvatar(
  userAddress: string | undefined,
  nftContract: string | undefined,
  tokenId: string | undefined
) {
  const [avatar, setAvatar] = useState<{ imageUrl: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvatar = useCallback(async () => {
    if (!userAddress || !nftContract || !tokenId) {
      setAvatar(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await feedBlockchainService.getUserNFTAvatar(
        userAddress,
        nftContract,
        tokenId
      );
      setAvatar(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch NFT avatar';
      setError(errorMessage);
      setAvatar(null);
    } finally {
      setLoading(false);
    }
  }, [userAddress, nftContract, tokenId]);

  useEffect(() => {
    fetchAvatar();
  }, [fetchAvatar]);

  return { avatar, loading, error, refetch: fetchAvatar };
}

/**
 * Hook to calculate weighted engagement score
 */
export function useWeightedEngagement(
  baseScore: number,
  authorAddress: string | undefined
) {
  const { profile, loading } = useUserBlockchainProfile(authorAddress);
  const [weightedScore, setWeightedScore] = useState(baseScore);

  useEffect(() => {
    if (profile && !loading) {
      const calculated = feedBlockchainService.calculateWeightedEngagementScore(
        baseScore,
        profile
      );
      setWeightedScore(calculated);
    } else {
      setWeightedScore(baseScore);
    }
  }, [baseScore, profile, loading]);

  return { weightedScore, loading, profile };
}

/**
 * Hook to get token tier display info
 */
export function useTokenTierDisplay(userAddress: string | undefined) {
  const { profile, loading } = useUserBlockchainProfile(userAddress);

  const getTierConfig = (tier: string) => {
    const configs = {
      whale: {
        label: 'Whale',
        icon: '🐋',
        color: '#9333EA',
        bgColor: '#F3E8FF',
      },
      dolphin: {
        label: 'Dolphin',
        icon: '🐬',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
      },
      fish: {
        label: 'Fish',
        icon: '🐟',
        color: '#10B981',
        bgColor: '#D1FAE5',
      },
      shrimp: {
        label: 'Shrimp',
        icon: '🦐',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
      },
      member: {
        label: 'Member',
        icon: '👤',
        color: '#6B7280',
        bgColor: '#F3F4F6',
      },
    };

    return configs[tier as keyof typeof configs] || configs.member;
  };

  const getReputationTierConfig = (tier: string) => {
    const configs = {
      legendary: {
        label: 'Legendary',
        icon: '👑',
        color: '#DC2626',
        bgColor: '#FEE2E2',
      },
      expert: {
        label: 'Expert',
        icon: '⭐',
        color: '#9333EA',
        bgColor: '#F3E8FF',
      },
      trusted: {
        label: 'Trusted',
        icon: '✓',
        color: '#10B981',
        bgColor: '#D1FAE5',
      },
      contributor: {
        label: 'Contributor',
        icon: '📝',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
      },
      active: {
        label: 'Active',
        icon: '🔥',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
      },
      new: {
        label: 'New',
        icon: '🌱',
        color: '#6B7280',
        bgColor: '#F3F4F6',
      },
    };

    return configs[tier as keyof typeof configs] || configs.new;
  };

  return {
    profile,
    loading,
    tokenTierConfig: profile ? getTierConfig(profile.tokenTier) : null,
    reputationTierConfig: profile ? getReputationTierConfig(profile.reputationTier) : null,
  };
}

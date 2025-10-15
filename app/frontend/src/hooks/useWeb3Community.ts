/**
 * React hook for Web3 community integration
 */

import { useState, useEffect, useCallback } from 'react';
import { CommunityWithWeb3Data, TokenActivity, GovernanceData } from '../types/web3/index';
import { tokenService, governanceService } from '../services/web3/index';
import { web3ErrorHandler } from '../utils/web3ErrorHandling';
import { useProgressiveEnhancement } from '../utils/progressiveEnhancement';

interface UseWeb3CommunityOptions {
  communityId: string;
  userAddress?: string;
  enableRealTimeUpdates?: boolean;
}

interface UseWeb3CommunityReturn {
  community: CommunityWithWeb3Data | null;
  tokenActivity: TokenActivity[];
  governanceData: GovernanceData | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  tipUser: (recipientAddress: string, amount: number, tokenAddress: string) => Promise<void>;
  stakeOnPost: (postId: string, amount: number, tokenAddress: string) => Promise<void>;
  vote: (proposalId: string, choice: 'for' | 'against' | 'abstain') => Promise<void>;
  
  // Web3 capabilities
  canUseWeb3Features: boolean;
  featureLevel: 'basic' | 'enhanced' | 'premium';
}

export function useWeb3Community(options: UseWeb3CommunityOptions): UseWeb3CommunityReturn {
  const [community, setCommunity] = useState<CommunityWithWeb3Data | null>(null);
  const [tokenActivity, setTokenActivity] = useState<TokenActivity[]>([]);
  const [governanceData, setGovernanceData] = useState<GovernanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Progressive enhancement for Web3 features
  const { capabilities, featureLevel } = useProgressiveEnhancement({
    level: 'enhanced',
    requiredCapabilities: ['wallet', 'transactions'],
    gracefulDegradation: true
  });

  const canUseWeb3Features = capabilities.wallet && capabilities.transactions;

  const loadCommunityData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load basic community data (this would come from your existing community service)
      const basicCommunity = await loadBasicCommunityData(options.communityId);
      
      if (canUseWeb3Features && options.userAddress) {
        // Enhance with Web3 data
        const [tokenBalance, userActivity, governance] = await Promise.all([
          tokenService.getUserTokenBalance(options.userAddress, basicCommunity.governanceToken?.address || ''),
          tokenService.getTokenActivity(options.userAddress),
          governanceService.getGovernanceData(options.communityId, options.userAddress)
        ]);

        const enhancedCommunity: CommunityWithWeb3Data = {
          ...basicCommunity,
          userTokenBalance: tokenBalance,
          governanceNotifications: governance.expiringVotes.length
        };

        setCommunity(enhancedCommunity);
        setTokenActivity(userActivity);
        setGovernanceData(governance);
      } else {
        // Basic mode without Web3 features
        setCommunity(basicCommunity);
        setTokenActivity([]);
        setGovernanceData(null);
      }
    } catch (err) {
      const errorResponse = web3ErrorHandler.handleError(err as Error, {
        action: 'loadCommunityData',
        component: 'useWeb3Community'
      });
      setError(errorResponse.message);
    } finally {
      setLoading(false);
    }
  }, [options.communityId, options.userAddress, canUseWeb3Features]);

  const refreshData = useCallback(async () => {
    await loadCommunityData();
  }, [loadCommunityData]);

  const tipUser = useCallback(async (recipientAddress: string, amount: number, tokenAddress: string) => {
    if (!canUseWeb3Features) {
      throw new Error('Web3 features not available');
    }

    try {
      const response = await tokenService.tipUser(recipientAddress, amount, tokenAddress);
      if (response.status === 'failed') {
        throw new Error(response.error || 'Transaction failed');
      }
      
      // Refresh data after successful transaction
      await refreshData();
    } catch (err) {
      const errorResponse = web3ErrorHandler.handleError(err as Error, {
        action: 'tipUser',
        component: 'useWeb3Community'
      });
      throw new Error(errorResponse.message);
    }
  }, [canUseWeb3Features, refreshData]);

  const stakeOnPost = useCallback(async (postId: string, amount: number, tokenAddress: string) => {
    if (!canUseWeb3Features) {
      throw new Error('Web3 features not available');
    }

    try {
      const response = await tokenService.stakeOnPost(postId, amount, tokenAddress);
      if (response.status === 'failed') {
        throw new Error(response.error || 'Transaction failed');
      }
      
      // Refresh data after successful transaction
      await refreshData();
    } catch (err) {
      const errorResponse = web3ErrorHandler.handleError(err as Error, {
        action: 'stakeOnPost',
        component: 'useWeb3Community'
      });
      throw new Error(errorResponse.message);
    }
  }, [canUseWeb3Features, refreshData]);

  const vote = useCallback(async (proposalId: string, choice: 'for' | 'against' | 'abstain') => {
    if (!canUseWeb3Features) {
      throw new Error('Web3 features not available');
    }

    try {
      await governanceService.vote({
        proposalId,
        choice
      });
      
      // Refresh governance data after successful vote
      await refreshData();
    } catch (err) {
      const errorResponse = web3ErrorHandler.handleError(err as Error, {
        action: 'vote',
        component: 'useWeb3Community'
      });
      throw new Error(errorResponse.message);
    }
  }, [canUseWeb3Features, refreshData]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData]);

  // Set up real-time updates if enabled
  useEffect(() => {
    if (!options.enableRealTimeUpdates || !canUseWeb3Features) {
      return;
    }

    const interval = setInterval(() => {
      refreshData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [options.enableRealTimeUpdates, canUseWeb3Features, refreshData]);

  return {
    community,
    tokenActivity,
    governanceData,
    loading,
    error,
    refreshData,
    tipUser,
    stakeOnPost,
    vote,
    canUseWeb3Features,
    featureLevel
  };
}

// Mock function to load basic community data
// This would be replaced with actual community service call
async function loadBasicCommunityData(communityId: string): Promise<CommunityWithWeb3Data> {
  // This would typically call your existing community API
  return {
    id: communityId,
    name: 'Sample Community',
    description: 'A sample Web3 community',
    avatar: '',
    memberCount: 100,
    isActive: true,
    userRole: 'member',
    governanceToken: {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'COMM',
      decimals: 18,
      name: 'Community Token',
      totalSupply: 1000000
    }
  };
}
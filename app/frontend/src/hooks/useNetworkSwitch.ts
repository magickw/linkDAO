/**
 * Network Switching Hook
 *
 * Provides utility for switching networks at transaction time,
 * allowing users to connect with any network and only switch when needed.
 */

import { useCallback, useState } from 'react';
import { useChainId, useSwitchChain, useAccount } from 'wagmi';
import { base, baseSepolia, mainnet, polygon, arbitrum, sepolia } from 'wagmi/chains';

// Chain ID to chain object mapping
const CHAIN_MAP: Record<number, typeof base> = {
  [base.id]: base,
  [baseSepolia.id]: baseSepolia,
  [mainnet.id]: mainnet,
  [polygon.id]: polygon,
  [arbitrum.id]: arbitrum,
  [sepolia.id]: sepolia,
};

// Chain names for display
const CHAIN_NAMES: Record<number, string> = {
  [base.id]: 'Base',
  [baseSepolia.id]: 'Base Sepolia',
  [mainnet.id]: 'Ethereum',
  [polygon.id]: 'Polygon',
  [arbitrum.id]: 'Arbitrum',
  [sepolia.id]: 'Sepolia',
};

export interface NetworkSwitchResult {
  success: boolean;
  chainId?: number;
  error?: string;
}

export function useNetworkSwitch() {
  const { isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync, isPending, error } = useSwitchChain();
  const [isSwitching, setIsSwitching] = useState(false);

  /**
   * Check if we're on the correct network for a transaction
   */
  const isCorrectNetwork = useCallback((requiredChainId: number): boolean => {
    return currentChainId === requiredChainId;
  }, [currentChainId]);

  /**
   * Switch to the required network if not already on it
   * Returns true if switch was successful or already on correct network
   */
  const ensureNetwork = useCallback(async (
    requiredChainId: number
  ): Promise<NetworkSwitchResult> => {
    if (!isConnected) {
      return { success: false, error: 'Wallet not connected' };
    }

    // Already on correct network
    if (currentChainId === requiredChainId) {
      return { success: true, chainId: currentChainId };
    }

    // Check if the chain is supported
    const targetChain = CHAIN_MAP[requiredChainId];
    if (!targetChain) {
      return { success: false, error: `Unsupported chain ID: ${requiredChainId}` };
    }

    try {
      setIsSwitching(true);
      await switchChainAsync({ chainId: requiredChainId });
      return { success: true, chainId: requiredChainId };
    } catch (err: any) {
      console.error('Network switch failed:', err);

      // Handle user rejection
      if (err.code === 4001 || err.message?.includes('rejected')) {
        return { success: false, error: 'Network switch rejected by user' };
      }

      // Handle chain not added to wallet
      if (err.code === 4902) {
        return { success: false, error: `Please add ${CHAIN_NAMES[requiredChainId]} to your wallet` };
      }

      return { success: false, error: err.message || 'Failed to switch network' };
    } finally {
      setIsSwitching(false);
    }
  }, [isConnected, currentChainId, switchChainAsync]);

  /**
   * Get chain name by ID
   */
  const getChainName = useCallback((chainId: number): string => {
    return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
  }, []);

  /**
   * Get current chain name
   */
  const currentChainName = CHAIN_NAMES[currentChainId] || `Chain ${currentChainId}`;

  return {
    currentChainId,
    currentChainName,
    isCorrectNetwork,
    ensureNetwork,
    getChainName,
    isSwitching: isSwitching || isPending,
    error,
    supportedChains: Object.keys(CHAIN_MAP).map(Number),
    supportedChainNames: CHAIN_NAMES,
  };
}

/**
 * Helper to get chain ID from network name (for payment modal)
 */
export function getChainIdFromName(name: string): number | null {
  const nameLower = name.toLowerCase();

  if (nameLower === 'base' || nameLower === 'base mainnet') return base.id;
  if (nameLower === 'base sepolia' || nameLower === 'base testnet') return baseSepolia.id;
  if (nameLower === 'ethereum' || nameLower === 'eth' || nameLower === 'mainnet') return mainnet.id;
  if (nameLower === 'polygon' || nameLower === 'matic') return polygon.id;
  if (nameLower === 'arbitrum' || nameLower === 'arb') return arbitrum.id;
  if (nameLower === 'sepolia') return sepolia.id;

  return null;
}

export { CHAIN_MAP, CHAIN_NAMES };

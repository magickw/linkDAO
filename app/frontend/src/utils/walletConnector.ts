import { ethers } from 'ethers';

/**
 * Wallet Connection Utility
 * Provides robust wallet connection handling with fallbacks and EIP-6963 support
 */

// EIP-6963 Interfaces
export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  detail: {
    info: EIP6963ProviderInfo;
    provider: any;
  };
}

// Store discovered providers
let discoveredProviders: EIP6963ProviderDetail[] = [];
let isListening = false;

/**
 * Listen for EIP-6963 announced providers
 */
export const listenForEIP6963Providers = () => {
  if (typeof window === 'undefined' || isListening) return;

  const handleAnnouncement = (event: EIP6963AnnounceProviderEvent) => {
    const { detail } = event;
    if (detail && detail.info && detail.provider) {
      // Check if already exists
      if (!discoveredProviders.find(p => p.info.uuid === detail.info.uuid)) {
        console.log(`[EIP-6963] Discovered provider: ${detail.info.name}`);
        discoveredProviders.push(detail);
      }
    }
  };

  window.addEventListener('eip6963:announceProvider', handleAnnouncement as EventListener);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  isListening = true;
};

/**
 * Check if an injected provider (like MetaMask) is available
 */
export const hasInjectedProvider = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check EIP-6963 providers first
  if (discoveredProviders.length > 0) return true;

  // Check for window.ethereum.providers (legacy multi-provider)
  if ((window as any).ethereum?.providers?.length > 0) return true;

  // Check standard injection
  return !!(window as any).ethereum;
};

/**
 * Find the best available provider, prioritizing MetaMask and avoiding LastPass
 */
export const getInjectedProvider = (): any => {
  if (typeof window === 'undefined') return null;

  // 1. Try to find MetaMask via EIP-6963
  listenForEIP6963Providers(); // Ensure we're listening
  const metaMask6963 = discoveredProviders.find(p => p.info.name.toLowerCase().includes('metamask'));
  if (metaMask6963) {
    console.log('[WalletConnector] Using EIP-6963 MetaMask provider');
    return metaMask6963.provider;
  }

  // 2. Try window.ethereum.providers (used by some wallets to coexist)
  const ethereum = (window as any).ethereum;
  if (ethereum?.providers?.length) {
    console.log('[WalletConnector] Found multi-provider array in window.ethereum');
    const metaMask = ethereum.providers.find((p: any) => p.isMetaMask);
    if (metaMask) {
      console.log('[WalletConnector] Selected MetaMask from providers array');
      return metaMask;
    }
  }

  // 3. Fallback to window.ethereum
  // If LastPass is present, this might be the LastPass provider
  // We'll wrap it in web3.ts to mitigate "read-only" errors
  return ethereum;
};

/**
 * Create a provider from the injected wallet
 */
export const createInjectedProvider = (): ethers.BrowserProvider | null => {
  const provider = getInjectedProvider();
  if (!provider) return null;

  try {
    return new ethers.BrowserProvider(provider, "any");
  } catch (error) {
    console.error('Failed to create injected provider:', error);
    return null;
  }
};

/**
 * Request wallet connection
 */
export const requestWalletConnection = async (): Promise<ethers.BrowserProvider | null> => {
  const provider = getInjectedProvider();
  if (!provider) {
    console.warn('No injected provider found');
    return null;
  }

  try {
    // Request account access
    await provider.request({ method: 'eth_requestAccounts' });

    // Create provider
    return new ethers.BrowserProvider(provider, "any");
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    return null;
  }
};

/**
 * Get signer from provider
 */
export const getSignerFromProvider = async (provider: ethers.BrowserProvider): Promise<ethers.Signer | null> => {
  try {
    const signer = await provider.getSigner();
    return signer;
  } catch (error) {
    console.error('Failed to get signer:', error);
    return null;
  }
};

/**
 * Get connected accounts
 */
export const getConnectedAccounts = async (provider: ethers.BrowserProvider): Promise<string[]> => {
  try {
    const accounts = await provider.send('eth_accounts', []);
    return accounts;
  } catch (error) {
    console.error('Failed to get accounts:', error);
    return [];
  }
};

/**
 * Listen for account changes
 */
export const onAccountsChanged = (callback: (accounts: string[]) => void): (() => void) => {
  const provider = getInjectedProvider();
  if (!provider) return () => { };

  try {
    provider.on('accountsChanged', callback);
  } catch (error) {
    console.debug('Could not attach accountsChanged listener:', error);
    return () => { };
  }

  return () => {
    try {
      provider.removeListener('accountsChanged', callback);
    } catch (error) {
      console.debug('Could not remove accountsChanged listener:', error);
    }
  };
};

/**
 * Listen for chain changes
 */
export const onChainChanged = (callback: (chainId: string) => void): (() => void) => {
  const provider = getInjectedProvider();
  if (!provider) return () => { };

  try {
    provider.on('chainChanged', callback);
  } catch (error) {
    console.debug('Could not attach chainChanged listener:', error);
    return () => { };
  }

  return () => {
    try {
      provider.removeListener('chainChanged', callback);
    } catch (error) {
      console.debug('Could not remove chainChanged listener:', error);
    }
  };
};

// Start listening immediately if in browser
if (typeof window !== 'undefined') {
  listenForEIP6963Providers();
}

export default {
  hasInjectedProvider,
  getInjectedProvider,
  createInjectedProvider,
  requestWalletConnection,
  getSignerFromProvider,
  getConnectedAccounts,
  onAccountsChanged,
  onChainChanged,
  listenForEIP6963Providers
};
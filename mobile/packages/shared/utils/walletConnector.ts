import { ethers } from 'ethers';

/**
 * Wallet Connection Utility
 * Provides robust wallet connection handling with fallbacks
 */

/**
 * Check if an injected provider (like MetaMask) is available
 */
export const hasInjectedProvider = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).ethereum;
};

/**
 * Get the injected provider if available
 */
export const getInjectedProvider = (): any => {
  if (typeof window === 'undefined') return null;
  return (window as any).ethereum;
};

/**
 * Create a provider from the injected wallet
 */
export const createInjectedProvider = (): ethers.BrowserProvider | null => {
  const provider = getInjectedProvider();
  if (!provider) return null;
  
  try {
    return new ethers.BrowserProvider(provider);
  } catch (error) {
    console.error('Failed to create injected provider:', error);
    return null;
  }
};

/**
 * Request wallet connection
 */
export const requestWalletConnection = async (): Promise<ethers.BrowserProvider | null> => {
  if (typeof window === 'undefined') return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    console.warn('No injected provider found');
    return null;
  }
  
  try {
    // Request account access
    await ethereum.request({ method: 'eth_requestAccounts' });
    
    // Create provider
    const provider = new ethers.BrowserProvider(ethereum);
    return provider;
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
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    return () => {};
  }
  
  const ethereum = (window as any).ethereum;
  try {
    ethereum.on('accountsChanged', callback);
  } catch (error) {
    console.debug('Could not attach accountsChanged listener:', error);
    return () => {};
  }
  
  return () => {
    try {
      ethereum.removeListener('accountsChanged', callback);
    } catch (error) {
      console.debug('Could not remove accountsChanged listener:', error);
    }
  };
};

/**
 * Listen for chain changes
 */
export const onChainChanged = (callback: (chainId: string) => void): (() => void) => {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    return () => {};
  }
  
  const ethereum = (window as any).ethereum;
  try {
    ethereum.on('chainChanged', callback);
  } catch (error) {
    console.debug('Could not attach chainChanged listener:', error);
    return () => {};
  }
  
  return () => {
    try {
      ethereum.removeListener('chainChanged', callback);
    } catch (error) {
      console.debug('Could not remove chainChanged listener:', error);
    }
  };
};

export default {
  hasInjectedProvider,
  getInjectedProvider,
  createInjectedProvider,
  requestWalletConnection,
  getSignerFromProvider,
  getConnectedAccounts,
  onAccountsChanged,
  onChainChanged
};
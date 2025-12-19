import { useMemo } from 'react';
import { useWalletClient } from 'wagmi';
import { ethers } from 'ethers';

/**
 * Custom hook to get an ethers signer from wagmi v2
 * Replaces the deprecated useSigner hook
 */
export function useEthersSigner() {
  const { data: walletClient } = useWalletClient();

  return useMemo(() => {
    if (!walletClient) return null;
    
    try {
      const { account, chain, transport } = walletClient;
      
      // Verify that necessary properties exist before using them
      if (!account || !chain || !transport) {
        console.error('Missing required wallet client properties:', { account, chain, transport });
        return null;
      }

      // Verify that chain has the required id property
      if (typeof chain.id === 'undefined') {
        console.error('Chain ID is undefined');
        return null;
      }

      const network = {
        chainId: chain.id,
        name: chain.name || 'unknown',
        ensAddress: chain.contracts?.ensRegistry?.address,
      };
      
      const provider = new ethers.BrowserProvider(transport, network);
      const signer = new ethers.JsonRpcSigner(provider, account.address);
      
      return signer;
    } catch (error) {
      console.error('Error creating ethers signer:', error);
      return null;
    }
  }, [walletClient]);
}
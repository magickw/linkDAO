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
      const network = {
        chainId: chain.id,
        name: chain.name,
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
import { useState, useEffect } from 'react';
import { useWalletClient } from 'wagmi';
import { ethers } from 'ethers';

/**
 * Custom hook to get an ethers signer from wagmi v2
 * Replaces the deprecated useSigner hook
 */
export function useEthersSigner() {
  const { data: walletClient } = useWalletClient();
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  useEffect(() => {
    if (!walletClient) {
      setSigner(null);
      return;
    }

    const getSigner = async () => {
      try {
        const { account, chain, transport } = walletClient;

        if (!account || !chain || !transport) return;

        const network = {
          chainId: chain.id,
          name: chain.name || 'unknown',
          ensAddress: chain.contracts?.ensRegistry?.address,
        };

        const provider = new ethers.BrowserProvider(transport, network);
        const newSigner = new ethers.JsonRpcSigner(provider, account.address);

        setSigner(newSigner);
      } catch (error) {
        // Silently fail or log debug only to prevent console spam
        // console.debug('Failed to create signer:', error);
        setSigner(null);
      }
    };

    getSigner();
  }, [walletClient]);

  return signer;
}
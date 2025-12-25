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
    
    // Create an async function to handle the async operations
    const createSigner = async () => {
      try {
        const { account, chain, transport } = walletClient;
        
        // Verify that necessary properties exist before using them
        if (!account || !chain || !transport) {
          console.debug('Missing required wallet client properties:', { account, chain, transport });
          return null;
        }

        // Verify that chain has the required id property
        if (typeof chain.id === 'undefined') {
          console.debug('Chain ID is undefined');
          return null;
        }

        const network = {
          chainId: chain.id,
          name: chain.name || 'unknown',
          ensAddress: chain.contracts?.ensRegistry?.address,
        };
        
        // Create provider with enhanced error handling
        let provider;
        try {
          provider = new ethers.BrowserProvider(transport, network);
        } catch (providerError) {
          console.error('Error creating BrowserProvider:', providerError);
          // Try without network config as fallback
          try {
            provider = new ethers.BrowserProvider(transport);
          } catch (fallbackError) {
            console.error('Error creating fallback BrowserProvider:', fallbackError);
            return null;
          }
        }
        
        // Create signer with error handling
        let signer;
        try {
          signer = new ethers.JsonRpcSigner(provider, account.address);
        } catch (signerError) {
          console.error('Error creating JsonRpcSigner:', signerError);
          // Try getting signer from provider directly as fallback
          try {
            signer = await provider.getSigner(account.address);
          } catch (fallbackError) {
            console.error('Error getting fallback signer:', fallbackError);
            return null;
          }
        }
        
        return signer;
      } catch (error) {
        console.error('Error creating ethers signer:', error);
        return null;
      }
    };

    // For now, create the signer synchronously to avoid async issues in useMemo
    // We'll use the JsonRpcSigner directly as the primary approach
    try {
      const { account, chain, transport } = walletClient;
      
      // Verify that necessary properties exist before using them
      if (!account || !chain || !transport) {
        console.debug('Missing required wallet client properties:', { account, chain, transport });
        return null;
      }

      // Verify that chain has the required id property
      if (typeof chain.id === 'undefined') {
        console.debug('Chain ID is undefined');
        return null;
      }

      const network = {
        chainId: chain.id,
        name: chain.name || 'unknown',
        ensAddress: chain.contracts?.ensRegistry?.address,
      };
      
      // Create provider with enhanced error handling
      let provider;
      try {
        provider = new ethers.BrowserProvider(transport, network);
      } catch (providerError) {
        console.error('Error creating BrowserProvider:', providerError);
        // Try without network config as fallback
        try {
          provider = new ethers.BrowserProvider(transport);
        } catch (fallbackError) {
          console.error('Error creating fallback BrowserProvider:', fallbackError);
          return null;
        }
      }
      
      // Create signer with error handling - use JsonRpcSigner directly
      try {
        const signer = new ethers.JsonRpcSigner(provider, account.address);
        return signer;
      } catch (signerError) {
        console.error('Error creating JsonRpcSigner:', signerError);
        return null;
      }
    } catch (error) {
      console.error('Error creating ethers signer:', error);
      return null;
    }
  }, [walletClient]);
}
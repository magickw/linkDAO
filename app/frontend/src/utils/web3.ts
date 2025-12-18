import { getPublicClient, getWalletClient } from '@wagmi/core'
import { config } from '@/lib/wagmi'
import { ethers } from 'ethers'
import { getChainRpcUrl } from '@/lib/wagmi'
import { hasInjectedProvider, getInjectedProvider } from '@/utils/walletConnector'

/**
 * Get the public client for read operations
 */
export async function getProvider() {
  try {
    console.log('Getting provider...');
    const client = getPublicClient(config);
    console.log('Public client:', client);
    
    // Check if client is available before accessing transport
    if (client) {
      // If wagmi transport exposes an injected provider, use it.
      const injectedProvider = (client as any).transport?.provider;
      console.log('Injected provider:', injectedProvider);
      
      if (injectedProvider) {
        const provider = new ethers.BrowserProvider(injectedProvider as any);
        console.log('Created BrowserProvider');
        return provider;
      }
    }

    // Try to use the injected provider directly if available
    if (hasInjectedProvider()) {
      const injectedProvider = getInjectedProvider();
      if (injectedProvider) {
        try {
          const provider = new ethers.BrowserProvider(injectedProvider);
          console.log('Created BrowserProvider from direct injected provider');
          return provider;
        } catch (e) {
          console.warn('Failed to create provider from injected provider:', e);
        }
      }
    }

    // Fallback: prefer an env-driven RPC URL for server-side reads. This lets
    // deployments control which RPC the app uses during SSR/build.
    const envRpc = process.env.NEXT_PUBLIC_RPC_URL;
    const envChainId = process.env.NEXT_PUBLIC_RPC_CHAIN_ID;
    console.log('Environment RPC:', envRpc, 'Chain ID:', envChainId);
    
    if (envRpc) {
      try {
        const chainId = envChainId ? parseInt(envChainId, 10) : undefined;
        console.log('Creating JsonRpcProvider with RPC:', envRpc, 'Chain ID:', chainId);
        return new ethers.JsonRpcProvider(envRpc, chainId);
      } catch (e) {
        console.warn('Invalid NEXT_PUBLIC_RPC_URL or NEXT_PUBLIC_RPC_CHAIN_ID, falling back to configured chain RPC', e);
      }
    }

    try {
      const chainId = envChainId ? parseInt(envChainId, 10) : 1;
      const rpcUrl = getChainRpcUrl(chainId);
      
      if (rpcUrl) {
        const provider = new ethers.JsonRpcProvider(rpcUrl, {
          chainId,
          name: chainId === 1 ? 'mainnet' : chainId === 11155111 ? 'sepolia' : 'unknown'
        });
        
        provider.ready.catch(() => {});
        
        return provider;
      }
    } catch (e) {
      console.warn('Error getting chain RPC URL:', e);
    }

    // Last-resort: use ethers default provider with fallback
    console.log('Using default provider with fallback');
    try {
      return ethers.getDefaultProvider('mainnet', {
        etherscan: process.env.ETHERSCAN_API_KEY,
        infura: process.env.INFURA_PROJECT_ID,
        alchemy: process.env.ALCHEMY_API_KEY,
        pocket: process.env.POCKET_APPLICATION_ID,
        quorum: 1
      });
    } catch (fallbackError) {
      console.warn('Default provider failed, using basic fallback:', fallbackError);
      return new ethers.JsonRpcProvider('https://eth.llamarpc.com', 1);
    }
  } catch (error) {
    console.error('Error getting provider:', error);
    return null;
  }
}

/**
 * Get the wallet client for write operations
 */
export async function getSigner() {
  try {
    const client = await getWalletClient(config);
    // Check if client is available before accessing transport
    if (!client) return null;

    const injectedProvider = (client as any).transport?.provider;
    if (injectedProvider) {
      const provider = new ethers.BrowserProvider(injectedProvider as any);
      const signer = await provider.getSigner();
      return signer;
    }

    // Fallback to direct injected provider
    if (hasInjectedProvider()) {
      const injectedProvider = getInjectedProvider();
      if (injectedProvider) {
        try {
          const provider = new ethers.BrowserProvider(injectedProvider);
          const signer = await provider.getSigner();
          return signer;
        } catch (e) {
          console.warn('Failed to create signer from injected provider:', e);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting signer:', error);
    return null;
  }
}

/**
 * Get the current connected account
 */
export async function getAccount() {
  try {
    const client = await getWalletClient(config);
    // Check if client is available before accessing account
    return client?.account || null;
  } catch (error) {
    console.error('Error getting account:', error);
    return null;
  }
}

/**
 * Format ether value
 */
export function formatEther(value: ethers.BigNumberish): string {
  try {
    return ethers.formatEther(value)
  } catch (error) {
    console.error('Error formatting ether:', error)
    return '0'
  }
}

/**
 * Parse ether value
 */
export function parseEther(value: string): bigint {
  try {
    return ethers.parseEther(value)
  } catch (error) {
    console.error('Error parsing ether:', error)
    return 0n
  }
}

/**
 * Format units
 */
export function formatUnits(value: ethers.BigNumberish, decimals: number): string {
  try {
    return ethers.formatUnits(value, decimals)
  } catch (error) {
    console.error('Error formatting units:', error)
    return '0'
  }
}

/**
 * Parse units
 */
export function parseUnits(value: string, decimals: number): bigint {
  try {
    return ethers.parseUnits(value, decimals)
  } catch (error) {
    console.error('Error parsing units:', error)
    return 0n
  }
}
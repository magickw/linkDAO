import { getPublicClient, getWalletClient, getChainId } from '@wagmi/core'
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
        // Create BrowserProvider with proper network configuration to prevent detection issues
        const provider = new ethers.BrowserProvider(injectedProvider as any);
        try {
          // Attempt to detect network but don't block if it fails
          await provider.getNetwork().catch(() => {
            console.warn('Network detection failed, using default configuration');
          });
          console.log('Created BrowserProvider');
          return provider;
        } catch (e) {
          console.warn('Failed to initialize BrowserProvider with network detection:', e);
          // Create provider without network detection as fallback
          return new ethers.BrowserProvider(injectedProvider as any);
        }
      }
    }

    // Try to use the injected provider directly if available
    if (hasInjectedProvider()) {
      const injectedProvider = getInjectedProvider();
      if (injectedProvider) {
        try {
          const provider = new ethers.BrowserProvider(injectedProvider);
          // Attempt to detect network but don't block if it fails
          await provider.getNetwork().catch(() => {
            console.warn('Network detection failed for injected provider, using default configuration');
          });
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
    const envChainId = process.env.NEXT_PUBLIC_CHAIN_ID;
    console.log('Environment RPC:', envRpc, 'Chain ID:', envChainId);

    if (envRpc) {
      try {
        const chainId = envChainId ? parseInt(envChainId, 10) : undefined;
        console.log('Creating JsonRpcProvider with RPC:', envRpc, 'Chain ID:', chainId);
        return new ethers.JsonRpcProvider(envRpc, chainId, {
          staticNetwork: true  // Prevent network detection issues
        });
      } catch (e) {
        console.warn('Invalid NEXT_PUBLIC_RPC_URL or NEXT_PUBLIC_RPC_CHAIN_ID, falling back to configured chain RPC', e);
      }
    }

    try {
      const chainId = envChainId ? parseInt(envChainId, 10) : 1;
      let rpcUrl = getChainRpcUrl(chainId);

      if (!rpcUrl) {
        console.warn(`No RPC URL found for chain ID ${chainId}, using fallback public RPC.`);
        rpcUrl = 'https://ethereum-sepolia-rpc.publicnode.com';
      }

      if (rpcUrl) {
        // Use staticNetwork: true to prevent network detection issues
        const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, {
          staticNetwork: true
        });

        // Don't wait for network detection - just return the provider
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
      return new ethers.JsonRpcProvider('https://eth.llamarpc.com', 1, {
        staticNetwork: true  // Prevent network detection issues
      });
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
    // Try wagmi wallet client first
    const client = await getWalletClient(config);

    if (client) {
      // Check if the client has the necessary methods before accessing them
      // Use getChainId helper from wagmi core instead of accessing properties directly
      try {
        const chainId = await getChainId(config);
        console.log('Wallet client chain ID:', chainId);
      } catch (e) {
        console.warn('Could not get chain ID:', e);
      }

      const injectedProvider = (client as any).transport?.provider;
      if (injectedProvider) {
        try {
          const provider = new ethers.BrowserProvider(injectedProvider as any);
          // Create provider with network detection disabled to prevent JsonRpcProvider issues
          try {
            // Disable network detection by setting polling: false and staticNetwork
            const signer = await provider.getSigner();
            // Verify that the signer has the necessary methods
            try {
              await signer.getAddress();
            } catch (addressError) {
              console.warn('Could not get address from signer:', addressError);
              return null;
            }
            return signer;
          } catch (signerError) {
            console.error('Error getting signer from provider:', signerError);
            // Don't return null here, try fallback approach
          }
        } catch (e) {
          console.warn('Failed to create signer from wagmi client:', e);
        }
      }
    }

    // Fallback to direct injected provider (window.ethereum) with better error handling
    if (hasInjectedProvider()) {
      const injectedProvider = getInjectedProvider();
      if (injectedProvider) {
        try {
          // Create provider with explicit network configuration to avoid detection issues
          const provider = new ethers.BrowserProvider(injectedProvider as any);

          // Try to get signer with timeout to prevent hanging
          const signerPromise = provider.getSigner();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Signer timeout')), 5000)
          );

          const signer = await Promise.race([signerPromise, timeoutPromise]) as any;

          // Verify that the signer has the necessary methods
          try {
            const address = await signer.getAddress();
            console.log('Successfully got signer with address:', address);
            return signer;
          } catch (addressError) {
            console.warn('Could not get address from signer:', addressError);
            return null;
          }
        } catch (e) {
          console.warn('Failed to create signer from injected provider:', e);
        }
      }
    }

    // Last resort: try to create signer from window.ethereum directly
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        console.log('Last resort signer created with address:', address);
        return signer;
      } catch (e) {
        console.warn('Last resort signer creation failed:', e);
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
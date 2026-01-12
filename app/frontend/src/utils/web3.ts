import { getPublicClient, getWalletClient, getChainId } from '@wagmi/core'
import { config } from '@/lib/wagmi'
import { ethers } from 'ethers'
import { getChainRpcUrl } from '@/lib/wagmi'
import { hasInjectedProvider, getInjectedProvider } from '@/utils/walletConnector'

// Provider creation state to prevent infinite retries
let providerCreationAttempts = 0;
const MAX_PROVIDER_CREATION_ATTEMPTS = 3;
let lastProviderError: Error | null = null;
let cachedProvider: ethers.Provider | null = null;

/**
 * Wrap an EIP-1193 provider to avoid "Cannot assign to read only property" errors.
 * This happens when extensions like LastPass freeze request objects.
 *
 * IMPORTANT: We do NOT spread (...provider) because that copies frozen properties
 * which causes "Cannot assign to read only property 'requestId'" errors.
 */
export function wrapProvider(provider: any): any {
  if (!provider) return provider;

  // Helper to deep clone objects to break references to frozen extension objects
  const deepClone = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => deepClone(item));
    }
    try {
      // For plain objects, manually clone to avoid issues with non-serializable values
      const cloned: any = {};
      for (const key of Object.keys(obj)) {
        try {
          const value = obj[key];
          if (typeof value === 'function') {
            // Skip functions - they can't be cloned
            continue;
          }
          cloned[key] = deepClone(value);
        } catch {
          // Skip properties that throw on access (frozen getters, etc.)
        }
      }
      return cloned;
    } catch (e) {
      // Fallback to JSON clone for simple objects
      try {
        return JSON.parse(JSON.stringify(obj));
      } catch {
        return obj;
      }
    }
  };

  // Helper to create a safe, mutable error object
  const createSafeError = (error: any): Error => {
    if (!error) return new Error('Unknown error');
    try {
      const message = typeof error === 'string' ? error : (error.message || error.reason || 'Unknown error');
      const safeError: any = new Error(message);

      // Safely copy error properties
      if (error.code !== undefined) {
        try { safeError.code = error.code; } catch {}
      }
      if (error.data !== undefined) {
        try { safeError.data = deepClone(error.data); } catch {}
      }
      if (error.reason !== undefined) {
        try { safeError.reason = error.reason; } catch {}
      }

      return safeError;
    } catch (e) {
      return new Error('Unknown error (failed to process original error)');
    }
  };

  // Create a clean object with ONLY the necessary methods - do NOT spread provider
  // This prevents copying frozen properties from browser extensions
  const wrapped: any = {
    // Forward specific known properties (read them once, don't reference frozen objects)
    isMetaMask: (() => { try { return provider.isMetaMask; } catch { return false; } })(),
    isStatus: (() => { try { return provider.isStatus; } catch { return false; } })(),
    isCoinbaseWallet: (() => { try { return provider.isCoinbaseWallet; } catch { return false; } })(),
    host: (() => { try { return provider.host; } catch { return undefined; } })(),
    path: (() => { try { return provider.path; } catch { return undefined; } })(),
    chainId: (() => { try { return provider.chainId; } catch { return undefined; } })(),
    selectedAddress: (() => { try { return provider.selectedAddress; } catch { return undefined; } })(),

    // Intercept request to ensure args are mutable and safe
    request: async (args: { method: string; params?: any[] }) => {
      // Create a completely new request object to ensure it's mutable
      const safeArgs = {
        method: String(args.method),
        params: args.params ? deepClone(args.params) : []
      };

      try {
        const result = await provider.request(safeArgs);
        // Deep clone result to ensure it's not frozen
        return deepClone(result);
      } catch (error: any) {
        // Wrap the error in a new Error object to avoid frozen error objects
        throw createSafeError(error);
      }
    },

    // Safe forwarding of send method (legacy)
    send: provider.send ? (method: string | any, params?: any) => {
      try {
        if (typeof method === 'string') {
          return provider.send(method, params ? deepClone(params) : params);
        }
        // Handle (payload, callback) signature
        return provider.send(deepClone(method), params);
      } catch (error) {
        throw createSafeError(error);
      }
    } : undefined,

    // Safe forwarding of sendAsync method (legacy)
    sendAsync: provider.sendAsync ? (payload: any, callback: any) => {
      try {
        return provider.sendAsync(deepClone(payload), (error: any, result: any) => {
          callback(error ? createSafeError(error) : null, deepClone(result));
        });
      } catch (error) {
        callback(createSafeError(error), null);
      }
    } : undefined,

    // Forward event listeners with error handling
    on: provider.on ? (eventName: string, listener: any) => {
      try {
        return provider.on(eventName, listener);
      } catch {
        return wrapped;
      }
    } : undefined,

    removeListener: provider.removeListener ? (eventName: string, listener: any) => {
      try {
        return provider.removeListener(eventName, listener);
      } catch {
        return wrapped;
      }
    } : undefined,

    removeAllListeners: provider.removeAllListeners ? (eventName?: string) => {
      try {
        return provider.removeAllListeners(eventName);
      } catch {
        return wrapped;
      }
    } : undefined,

    // Add enable method for older dapps
    enable: provider.enable ? async () => {
      try {
        const result = await provider.enable();
        return deepClone(result);
      } catch (error) {
        throw createSafeError(error);
      }
    } : undefined,
  };

  // Remove undefined properties
  Object.keys(wrapped).forEach(key => {
    if (wrapped[key] === undefined) {
      delete wrapped[key];
    }
  });

  return wrapped;
}

/**
 * Get the public client for read operations
 */
export async function getProvider() {
  // Return cached provider if available
  if (cachedProvider) {
    return cachedProvider;
  }

  // Check if we've exceeded max creation attempts
  if (providerCreationAttempts >= MAX_PROVIDER_CREATION_ATTEMPTS) {
    console.warn('Max provider creation attempts reached, returning null');
    return null;
  }

  providerCreationAttempts++;

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
        // Create BrowserProvider with "any" network to prevent detection issues
        // This is crucial for fixing "JsonRpcProvider failed to detect network" errors
        const provider = new ethers.BrowserProvider(injectedProvider as any, "any");
        console.log('Created BrowserProvider with "any" network');
        cachedProvider = provider;
        providerCreationAttempts = 0; // Reset on success
        return provider;
      }
    }

    // Try to use the injected provider directly if available
    if (hasInjectedProvider()) {
      const injectedProvider = getInjectedProvider();
      if (injectedProvider) {
        try {
          // Use "any" network here as well
          const provider = new ethers.BrowserProvider(injectedProvider, "any");
          console.log('Created BrowserProvider from direct injected provider with "any" network');
          cachedProvider = provider;
          providerCreationAttempts = 0;
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
        const chainId = envChainId ? parseInt(envChainId, 10) : 1;
        console.log('Creating JsonRpcProvider with RPC:', envRpc, 'Chain ID:', chainId);
        const provider = new ethers.JsonRpcProvider(envRpc, chainId, {
          staticNetwork: true  // Prevent network detection issues
        });
        cachedProvider = provider;
        providerCreationAttempts = 0;
        return provider;
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
        cachedProvider = provider;
        providerCreationAttempts = 0;
        return provider;
      }
    } catch (e) {
      console.warn('Error getting chain RPC URL:', e);
    }

    // Last-resort: use a simple JsonRpcProvider with staticNetwork
    console.log('Using fallback provider');
    try {
      const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com', 1, {
        staticNetwork: true  // Prevent network detection issues
      });
      cachedProvider = provider;
      providerCreationAttempts = 0;
      return provider;
    } catch (fallbackError) {
      console.warn('Fallback provider creation failed:', fallbackError);
      lastProviderError = fallbackError instanceof Error ? fallbackError : new Error('Unknown error');
      return null;
    }
  } catch (error) {
    console.error('Error getting provider:', error);
    lastProviderError = error instanceof Error ? error : new Error('Unknown error');
    return null;
  }
}

/**
 * Get the wallet client for write operations
 */
export async function getSigner() {
  try {
    // Reset provider cache to ensure fresh connection
    resetProviderCache();

    // Try wagmi wallet client first
    try {
      // getWalletClient can throw if connectors are in a bad state
      const client = await getWalletClient(config).catch(e => {
        console.warn('Wagmi getWalletClient failed:', e);
        return null;
      });

      if (client) {
        // Check if the client has the necessary methods before accessing them
        const injectedProvider = (client as any).transport?.provider;
        if (injectedProvider) {
          try {
            // Wrap provider to avoid read-only property errors
            const wrappedProvider = wrapProvider(injectedProvider);
            // Use "any" network to avoid strict detection
            const provider = new ethers.BrowserProvider(wrappedProvider as any, "any");

            const signer = await provider.getSigner();
            // Verify that the signer has the necessary methods
            try {
              await signer.getAddress();
              return signer;
            } catch (addressError) {
              console.warn('Could not get address from signer:', addressError);
              // Continue to fallback
            }
          } catch (e) {
            console.warn('Failed to create signer from wagmi client:', e);
          }
        }
      }
    } catch (walletClientError) {
      console.warn('Error getting wallet client, falling back to injected provider:', walletClientError);
    }

    // Fallback to direct injected provider (window.ethereum) with better error handling
    if (hasInjectedProvider()) {
      const injectedProvider = getInjectedProvider();
      if (injectedProvider) {
        try {
          // Wrap provider to avoid read-only property errors and create provider with explicit network configuration
          const wrappedProvider = wrapProvider(injectedProvider);
          // Use "any" network here as well
          const provider = new ethers.BrowserProvider(wrappedProvider as any, "any");

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
        // Wrap provider to avoid read-only property errors
        const wrappedProvider = wrapProvider((window as any).ethereum);
        // Use "any" network here as well
        const provider = new ethers.BrowserProvider(wrappedProvider, "any");
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

/**
 * Reset provider cache - useful when wallet state changes
 */
export function resetProviderCache(): void {
  cachedProvider = null;
  providerCreationAttempts = 0;
  lastProviderError = null;
}

/**
 * Get the last provider creation error
 */
export function getLastProviderError(): Error | null {
  return lastProviderError;
}
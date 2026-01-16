import { getPublicClient, getWalletClient, getChainId } from '@wagmi/core'
import { config } from '@/lib/wagmi'
import { ethers } from 'ethers'
import { getChainRpcUrl } from '@/lib/wagmi'
import { hasInjectedProvider, getInjectedProvider, listenForEIP6963Providers } from '@/utils/walletConnector'

// Initialize EIP-6963 listener
if (typeof window !== 'undefined') {
  listenForEIP6963Providers();
}

// Provider creation state to prevent infinite retries
let providerCreationAttempts = 0;
const MAX_PROVIDER_CREATION_ATTEMPTS = 3;
let lastProviderError: Error | null = null;
let cachedProvider: ethers.Provider | null = null;
let providerPromise: Promise<ethers.Provider | null> | null = null;

/**
 * Wrap an EIP-1193 provider to avoid "Cannot assign to read only property" errors.
 * This happens when extensions like LastPass freeze request objects.
 *
 * Uses complete isolation - we capture the original request function via bind()
 * and never expose the original provider object to ethers.js. This prevents
 * any attempts to modify frozen objects.
 */
export function wrapProvider(provider: any): any {
  if (!provider) return provider;

  // If already wrapped, return as-is
  if (provider.isWrapped) return provider;

  // Create a completely fresh object with NO prototype chain
  // This ensures ethers.js can freely add/modify properties on it
  const wrappedProvider: any = Object.create(null);

  // Mark as wrapped to prevent double-wrapping
  wrappedProvider.isWrapped = true;

  // Internal state that ethers.js might try to add
  // Pre-create these so ethers.js doesn't need to add new properties
  wrappedProvider._requestId = 0;
  wrappedProvider._events = {};
  wrappedProvider._emitted = {};

  // Safely copy static properties
  try { wrappedProvider.isMetaMask = !!provider.isMetaMask; } catch { }
  try { wrappedProvider.chainId = provider.chainId; } catch { }
  try { wrappedProvider.networkVersion = provider.networkVersion; } catch { }
  try { wrappedProvider.selectedAddress = provider.selectedAddress; } catch { }

  // CRITICAL: Capture the request function via bind() so we never pass
  // the original provider object to ethers.js. The bound function
  // internally references 'provider' but ethers.js never sees it.
  const boundRequest = provider.request.bind(provider);

  // Helper for safe deep cloning that handles BigInts
  const safeClone = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (typeof obj === 'bigint') {
      return obj.toString();
    }

    if (Array.isArray(obj)) {
      return obj.map(safeClone);
    }

    const clone: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clone[key] = safeClone(obj[key]);
      }
    }
    return clone;
  };

  wrappedProvider.request = async (args: any) => {
    try {
      // Create a completely safe, mutable clone of the arguments
      const safeRequest: any = {
        method: String(args?.method || ''),
        params: args?.params ? safeClone(args.params) : [],
        jsonrpc: '2.0',
        id: Date.now()
      };

      // Call the bound request function
      const result = await boundRequest(safeRequest);

      // Deep clone result to ensure no frozen objects leak through
      return safeClone(result);
    } catch (error: any) {
      // Create a new error object to avoid frozen error objects
      const message = error?.message || error?.toString() || 'Request failed';
      const safeError: any = new Error(message);
      if (error?.code !== undefined) safeError.code = error.code;
      if (error?.data !== undefined) {
        safeError.data = safeClone(error.data);
      }
      throw safeError;
    }
  };

  // Legacy send method - capture via bind
  if (typeof provider.send === 'function') {
    const boundSend = provider.send.bind(provider);
    wrappedProvider.send = (...args: any[]) => {
      try {
        const safeArgs = args.map(arg => {
          if (typeof arg === 'function') return arg;
          try {
            return JSON.parse(JSON.stringify(arg));
          } catch {
            return arg;
          }
        });
        return boundSend(...safeArgs);
      } catch (error: any) {
        throw new Error(error?.message || 'Send failed');
      }
    };
  }

  // Legacy sendAsync method - capture via bind
  if (typeof provider.sendAsync === 'function') {
    const boundSendAsync = provider.sendAsync.bind(provider);
    wrappedProvider.sendAsync = (...args: any[]) => {
      try {
        const safeArgs = args.map(arg => {
          if (typeof arg === 'function') return arg;
          try {
            return JSON.parse(JSON.stringify(arg));
          } catch {
            return arg;
          }
        });
        return boundSendAsync(...safeArgs);
      } catch (error: any) {
        throw new Error(error?.message || 'SendAsync failed');
      }
    };
  }

  // Event listener methods - capture via bind
  if (typeof provider.on === 'function') {
    wrappedProvider.on = provider.on.bind(provider);
  }
  if (typeof provider.once === 'function') {
    wrappedProvider.once = provider.once.bind(provider);
  }
  if (typeof provider.off === 'function') {
    wrappedProvider.off = provider.off.bind(provider);
  }
  if (typeof provider.removeListener === 'function') {
    wrappedProvider.removeListener = provider.removeListener.bind(provider);
  }
  if (typeof provider.removeAllListeners === 'function') {
    wrappedProvider.removeAllListeners = provider.removeAllListeners.bind(provider);
  }
  if (typeof provider.emit === 'function') {
    wrappedProvider.emit = provider.emit.bind(provider);
  }
  if (typeof provider.listeners === 'function') {
    wrappedProvider.listeners = provider.listeners.bind(provider);
  }

  // Add enable method for legacy compatibility
  if (typeof provider.enable === 'function') {
    wrappedProvider.enable = provider.enable.bind(provider);
  } else {
    // Fallback enable that uses request
    wrappedProvider.enable = async () => {
      return wrappedProvider.request({ method: 'eth_requestAccounts' });
    };
  }

  // isConnected method
  if (typeof provider.isConnected === 'function') {
    wrappedProvider.isConnected = provider.isConnected.bind(provider);
  } else {
    wrappedProvider.isConnected = () => true;
  }

  return wrappedProvider;
}

/**
 * Get the public client for read operations
 */
export async function getProvider() {
  // Return cached provider if available
  if (cachedProvider) {
    return cachedProvider;
  }

  // If a provider creation is already in progress, return that promise
  if (providerPromise) {
    return providerPromise;
  }

  // Check if we've exceeded max creation attempts
  if (providerCreationAttempts >= MAX_PROVIDER_CREATION_ATTEMPTS) {
    console.warn('Max provider creation attempts reached, returning null');
    return null;
  }

  // Start new provider creation
  providerCreationAttempts++;

  providerPromise = (async () => {
    try {
      console.log('Getting provider...');

      // Check if config is properly initialized before using it
      if (!config || !config.connectors || config.connectors.length === 0) {
        console.warn('Wagmi config not properly initialized, skipping getPublicClient');
      } else {
        let client: any = null;
        try {
          client = getPublicClient(config);
        } catch (e) {
          console.warn('Wagmi getPublicClient failed:', e);
        }
        console.log('Public client:', client);

        // Check if client is available before accessing transport
        if (client) {
          // If wagmi transport exposes an injected provider, use it.
          const injectedProvider = (client as any).transport?.provider;
          console.log('Injected provider:', injectedProvider);

          if (injectedProvider) {
            try {
              // CRITICAL: Wrap the provider to avoid "Cannot assign to read only property" errors
              const wrappedProvider = wrapProvider(injectedProvider);
              // Create BrowserProvider with "any" network to prevent detection issues
              // This is crucial for fixing "JsonRpcProvider failed to detect network" errors
              const provider = new ethers.BrowserProvider(wrappedProvider as any, "any");
              console.log('Created BrowserProvider with "any" network');
              cachedProvider = provider;
              providerCreationAttempts = 0; // Reset on success
              return provider;
            } catch (e) {
              console.warn('Failed to create provider from wagmi client:', e);
            }
          }
        }
      }

      // Try to use the injected provider directly if available
      if (hasInjectedProvider()) {
        const injectedProvider = getInjectedProvider();
        if (injectedProvider) {
          try {
            // CRITICAL: Wrap the provider to avoid "Cannot assign to read only property" errors
            const wrappedProvider = wrapProvider(injectedProvider);
            // Use "any" network here as well
            const provider = new ethers.BrowserProvider(wrappedProvider, "any");
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
          let chainId = envChainId ? parseInt(envChainId, 10) : 11155111;
          if (isNaN(chainId) || chainId <= 0) {
            console.warn('Invalid Chain ID from env, falling back to Sepolia (11155111)');
            chainId = 11155111;
          }
          console.log('Creating JsonRpcProvider with RPC:', envRpc, 'Chain ID:', chainId);

          // Correct way to initialize JsonRpcProvider in ethers v6 with static network
          const network = ethers.Network.from(chainId);
          const provider = new ethers.JsonRpcProvider(envRpc, network, {
            staticNetwork: network,
            polling: false
          });

          cachedProvider = provider;
          providerCreationAttempts = 0;
          return provider;
        } catch (e) {
          console.warn('Failed to create env RPC provider (ignoring network detection error):', e);
          // Continue to fallback
        }
      }

      // Fallback to configured chain RPC
      // Default to Sepolia (11155111) if not specified, as most dev/staging happens there
      const chainId = (envChainId && !isNaN(parseInt(envChainId, 10))) ? parseInt(envChainId, 10) : 11155111;
      let rpcUrl = getChainRpcUrl(chainId);

      if (!rpcUrl) {
        console.warn(`No RPC URL found for chain ID ${chainId}, using fallback public RPC.`);
        rpcUrl = 'https://ethereum-sepolia-rpc.publicnode.com';
      }

      if (rpcUrl) {
        // Correct way to initialize JsonRpcProvider in ethers v6 with static network
        const network = ethers.Network.from(chainId);
        const provider = new ethers.JsonRpcProvider(rpcUrl, network, {
          staticNetwork: network,
          polling: false
        });

        // Don't wait for network detection - just return the provider
        cachedProvider = provider;
        providerCreationAttempts = 0;
        return provider;
      }
    } catch (e) {
      console.warn('Error getting provider:', e);
    }

    // Last-resort: use a simple JsonRpcProvider with staticNetwork
    console.log('Using fallback provider');
    try {
      const fallbackRpcs = [
        'https://ethereum-sepolia-rpc.publicnode.com',
        'https://rpc.ankr.com/eth_sepolia',
        'https://1rpc.io/sepolia'
      ];

      const network = ethers.Network.from(11155111);
      // Try the first working fallback RPC
      const provider = new ethers.JsonRpcProvider(fallbackRpcs[0], network, {
        staticNetwork: network,
        polling: false,
        batchMaxCount: 1 // Disable batching for fallback to improve reliability
      });

      cachedProvider = provider;
      providerCreationAttempts = 0;
      return provider;
    } catch (fallbackError) {
      console.warn('Fallback provider creation failed:', fallbackError);
      lastProviderError = fallbackError instanceof Error ? fallbackError : new Error('Unknown error');
      return null;
    }
  })().finally(() => {
    // Clear the promise when done, so subsequent calls (if failed) can try again
    // But if success, cachedProvider will be set, so getProvider returns it immediately
    providerPromise = null;
  });

  return providerPromise;
}

/**
 * Get the wallet client for write operations
 */
export async function getSigner() {
  try {
    // Check if LastPass is likely causing issues
    if (typeof window !== 'undefined' && (window as any).chrome) {
      const lastPassDetected = document.querySelectorAll('[data-lp-version]').length > 0;
      if (lastPassDetected) {
        console.warn('LastPass extension detected. This may cause wallet connection issues. Please disable LastPass for this site or use a different browser.');
      }
    }

    // Check if MetaMask is installed and warn about known issues
    if (typeof window !== 'undefined' && (window as any).ethereum && (window as any).ethereum.isMetaMask) {
      console.warn('MetaMask detected. Some versions of MetaMask have a known issue where they freeze request objects, causing wallet connection failures. If you experience issues, try:');
      console.warn('1. Updating MetaMask to the latest version');
      console.warn('2. Using a different wallet (Coinbase Wallet, WalletConnect, etc.)');
      console.warn('3. Using a different browser (Firefox, Safari)');
    }

    // Try direct injected provider (window.ethereum) first
    if (hasInjectedProvider()) {
      const injectedProvider = getInjectedProvider();
      if (injectedProvider) {
        try {
          // Wrap provider to avoid read-only property errors
          const wrappedProvider = wrapProvider(injectedProvider);

          // Try to get accounts first to test if the provider works
          const accounts = await wrappedProvider.request({ method: 'eth_accounts' });
          console.log('Got accounts:', accounts);

          // Create a BrowserProvider with the wrapped provider
          // Use "any" network to avoid strict detection
          const provider = new ethers.BrowserProvider(wrappedProvider as any, "any");

          // Get signer with timeout to prevent hanging
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
        } catch (e: any) {
          console.warn('Failed to create signer from injected provider:', e);

          // If it's a frozen object error, try viem instead
          if (e?.message?.includes('read only property') || e?.message?.includes('requestId')) {
            console.log('Trying viem as fallback for frozen object issue...');
            const viemSigner = await getViemSigner();
            if (viemSigner) {
              // Convert viem signer to ethers signer
              const ethersSigner = await viemToEthersSigner(viemSigner);
              if (ethersSigner) {
                return ethersSigner;
              }
            }

            // If viem also fails, try direct JSON-RPC
            console.log('Trying direct JSON-RPC as final fallback...');
            const directSigner = await getDirectJsonRpcSigner();
            if (directSigner) {
              return directSigner;
            }

            // All methods failed - this is a MetaMask bug
            throw new Error('Wallet connection failed due to a known MetaMask issue where request objects are frozen. Please try one of these solutions:\n\n1. Update MetaMask to the latest version\n2. Use a different wallet (Coinbase Wallet, WalletConnect, RainbowKit)\n3. Use a different browser (Firefox, Safari)\n4. Disable MetaMask and enable it again\n\nThis is a MetaMask bug, not an issue with this application.');
          }
        }
      }
    }

    // Fallback: try window.ethereum directly
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const wrappedProvider = wrapProvider((window as any).ethereum);
        const provider = new ethers.BrowserProvider(wrappedProvider as any, "any");
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        console.log('Last resort signer created with address:', address);
        return signer;
      } catch (e: any) {
        console.warn('Last resort signer creation failed:', e);

        // Try viem as fallback
        if (e?.message?.includes('read only property') || e?.message?.includes('requestId')) {
          console.log('Trying viem as fallback for frozen object issue...');
          const viemSigner = await getViemSigner();
          if (viemSigner) {
            // Convert viem signer to ethers signer
            const ethersSigner = await viemToEthersSigner(viemSigner);
            if (ethersSigner) {
              return ethersSigner;
            }
          }

          // If viem also fails, try direct JSON-RPC
          console.log('Trying direct JSON-RPC as final fallback...');
          const directSigner = await getDirectJsonRpcSigner();
          if (directSigner) {
            return directSigner;
          }

          // All methods failed
          throw new Error('Wallet connection failed due to a known MetaMask issue where request objects are frozen. Please try one of these solutions:\n\n1. Update MetaMask to the latest version\n2. Use a different wallet (Coinbase Wallet, WalletConnect, RainbowKit)\n3. Use a different browser (Firefox, Safari)\n4. Disable MetaMask and enable it again\n\nThis is a MetaMask bug, not an issue with this application.');
        }
      }
    }

    console.error('No signer available');
    return null;
  } catch (error) {
    console.error('Error getting signer:', error);

    // Re-throw MetaMask-related errors with clearer message
    if (error instanceof Error && (error.message.includes('read only property') || error.message.includes('requestId'))) {
      throw error;
    }

    return null;
  }
}

/**
 * Get the current connected account
 */
export async function getAccount() {
  try {
    // Check if config is properly initialized before using it
    if (!config || !config.connectors || config.connectors.length === 0) {
      console.warn('Wagmi config not properly initialized, skipping getWalletClient');
      return null;
    }

    const client = await getWalletClient(config).catch(e => {
      console.warn('Wagmi getWalletClient failed in getAccount:', e);
      return null;
    });

    // Check if client is available before accessing account
    return client?.account || null;
  } catch (error) {
    console.error('Error getting account:', error);
    return null;
  }
}

/**
 * Get a direct JSON-RPC signer that bypasses ethers.js and viem
 * This is the ultimate fallback for when all libraries fail due to frozen objects
 */
export async function getDirectJsonRpcSigner(): Promise<ethers.Signer | null> {
  try {
    if (!hasInjectedProvider()) {
      return null;
    }

    const injectedProvider = getInjectedProvider();
    if (!injectedProvider) {
      return null;
    }

    // Wrap the provider to ensure we handle frozen objects correctly
    const wrappedProvider = wrapProvider(injectedProvider);

    // Get accounts directly
    const accounts = await wrappedProvider.request({ method: 'eth_accounts' }) as string[];
    if (!accounts || accounts.length === 0) {
      // Request accounts if not connected
      const requestedAccounts = await wrappedProvider.request({ method: 'eth_requestAccounts' }) as string[];
      if (!requestedAccounts || requestedAccounts.length === 0) {
        return null;
      }
    }

    const address = accounts[0];

    // Get chain ID
    const chainId = await wrappedProvider.request({ method: 'eth_chainId' }) as string;

    // Create a minimal signer object that implements the ethers.js Signer interface
    const directSigner: any = {
      address: address,
      provider: {
        getNetwork: async () => ({
          chainId: parseInt(chainId, 16),
          name: 'unknown'
        }),
        getBalance: async (addr: string) => {
          const result = await wrappedProvider.request({
            method: 'eth_getBalance',
            params: [addr, 'latest']
          });
          return ethers.toBigInt(result);
        },
        getCode: async (addr: string) => {
          const result = await wrappedProvider.request({
            method: 'eth_getCode',
            params: [addr, 'latest']
          });
          return result;
        },
        getStorage: async (addr: string, slot: bigint) => {
          const result = await wrappedProvider.request({
            method: 'eth_getStorageAt',
            params: [addr, slot, 'latest']
          });
          return result;
        },
        call: async (tx: any) => {
          const result = await wrappedProvider.request({
            method: 'eth_call',
            params: [tx, 'latest']
          });
          return result;
        },
        estimateGas: async (tx: any) => {
          const result = await wrappedProvider.request({
            method: 'eth_estimateGas',
            params: [tx]
          });
          return ethers.toBigInt(result);
        },
        broadcastTransaction: async (tx: string) => {
          const result = await wrappedProvider.request({
            method: 'eth_sendRawTransaction',
            params: [tx]
          });
          return result;
        },
        getTransaction: async (hash: string) => {
          const result = await wrappedProvider.request({
            method: 'eth_getTransactionByHash',
            params: [hash]
          });
          return result;
        },
        getTransactionReceipt: async (hash: string) => {
          const result = await wrappedProvider.request({
            method: 'eth_getTransactionReceipt',
            params: [hash]
          });
          return result;
        },
        getBlock: async (blockTag: string | number) => {
          const result = await wrappedProvider.request({
            method: 'eth_getBlockByNumber',
            params: [blockTag, false]
          });
          return result;
        },
        getFeeData: async () => {
          const [gasPrice, maxFeePerGas, maxPriorityFeePerGas] = await wrappedProvider.request({
            method: 'eth_feeHistory',
            params: [4, 'latest', []]
          });

          return {
            gasPrice: gasPrice ? ethers.toBigInt(gasPrice[0]) : undefined,
            maxFeePerGas: maxFeePerGas ? ethers.toBigInt(maxFeePerGas[0]) : undefined,
            maxPriorityFeePerGas: maxPriorityFeePerGas ? ethers.toBigInt(maxPriorityFeePerGas[0]) : undefined
          };
        }
      },
      getAddress: () => address,
      connect: async (provider: any) => directSigner,
      signMessage: async (message: string | Uint8Array) => {
        const msg = typeof message === 'string' ? message : ethers.toUtf8String(message);
        const result = await wrappedProvider.request({
          method: 'personal_sign',
          params: [msg, address]
        });
        return result;
      },
      signTransaction: async (tx: any) => {
        const result = await wrappedProvider.request({
          method: 'eth_signTransaction',
          params: [tx]
        });
        return result;
      },
      sendTransaction: async (tx: any) => {
        // Try to send transaction
        const hash = await wrappedProvider.request({
          method: 'eth_sendTransaction',
          params: [tx]
        });

        // Wait for confirmation
        let receipt: any = null;
        let attempts = 0;
        const maxAttempts = 60; // Wait up to 60 seconds

        while (!receipt && attempts < maxAttempts) {
          receipt = await wrappedProvider.request({
            method: 'eth_getTransactionReceipt',
            params: [hash]
          });

          if (!receipt) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }

        if (!receipt) {
          throw new Error('Transaction confirmation timeout');
        }

        return {
          hash: receipt.hash,
          blockNumber: parseInt(receipt.blockNumber, 16),
          blockHash: receipt.blockHash,
          from: receipt.from,
          to: receipt.to,
          gasUsed: ethers.toBigInt(receipt.gasUsed),
          logs: receipt.logs,
          wait: async () => {
            // Already waited, return receipt
            return {
              hash: receipt.hash,
              blockNumber: parseInt(receipt.blockNumber, 16),
              blockHash: receipt.blockHash,
              from: receipt.from,
              to: receipt.to,
              gasUsed: ethers.toBigInt(receipt.gasUsed),
              logs: receipt.logs,
              status: parseInt(receipt.status, 16) === 1 ? 1 : 0,
              confirmations: 1
            };
          }
        };
      },
      signTypedData: async (domain: any, types: any, value: any) => {
        const result = await wrappedProvider.request({
          method: 'eth_signTypedData_v4',
          params: [address, JSON.stringify({ domain, types, value })]
        });
        return result;
      }
    };

    console.log('Successfully created direct JSON-RPC signer with address:', address);
    return directSigner;
  } catch (error) {
    console.error('Error creating direct JSON-RPC signer:', error);
    return null;
  }
}

/**
 * Get a viem wallet client (signer) that works better with frozen objects
 */
export async function getViemSigner() {
  try {
    if (!hasInjectedProvider()) {
      return null;
    }

    const injectedProvider = getInjectedProvider();
    if (!injectedProvider) {
      return null;
    }

    // Create a viem wallet client directly from the injected provider
    // viem handles frozen objects better than ethers.js
    const { createWalletClient, custom } = await import('viem');
    const { http } = await import('viem');

    try {
      // Wrap the provider to ensure it's safe even for viem
      const wrappedProvider = wrapProvider(injectedProvider);

      const walletClient = createWalletClient({
        transport: custom(wrappedProvider),
      });

      // Test if it works by getting accounts
      const accounts = await walletClient.getAddresses();
      if (accounts.length === 0) {
        console.warn('No accounts found');
        return null;
      }

      console.log('Successfully created viem wallet client with address:', accounts[0]);
      return walletClient;
    } catch (e) {
      console.warn('Failed to create viem wallet client:', e);
      return null;
    }
  } catch (error) {
    console.error('Error getting viem signer:', error);
    return null;
  }
}

/**
 * Convert viem wallet client to ethers.js signer
 * This allows using viem's better frozen object handling while maintaining compatibility with ethers.js contracts
 */
export async function viemToEthersSigner(viemWalletClient: any): Promise<ethers.Signer | null> {
  try {
    if (!viemWalletClient) {
      return null;
    }

    const injectedProvider = getInjectedProvider();
    if (!injectedProvider) {
      return null;
    }

    // Wrap the provider and create an ethers.js signer
    const wrappedProvider = wrapProvider(injectedProvider);
    const provider = new ethers.BrowserProvider(wrappedProvider as any, "any");

    // Get the signer for the viem wallet's account
    const accounts = await viemWalletClient.getAddresses();
    if (accounts.length === 0) {
      return null;
    }

    const signer = await provider.getSigner(accounts[0] as `0x${string}`);
    return signer;
  } catch (error) {
    console.error('Error converting viem to ethers signer:', error);
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

/**
 * Switch the wallet to a specific network
 * If the network is not added, try to add it (currently supports Sepolia)
 */
export async function switchNetwork(chainId: number): Promise<void> {
  // Use getProvider to get the correct provider instance, possibly wrapped
  const provider = await getProvider();

  if (!provider) {
    throw new Error('No provider available to switch network');
  }

  const chainIdHex = `0x${chainId.toString(16)}`;

  try {
    // We need to use 'send' to interact with the provider's JSON-RPC method directly
    // Using 'any' cast because the Provider interface in ethers v6 abstracts this slightly differently depending on subclass
    // But BrowserProvider/JsonRpcProvider usually supports send.
    await (provider as any).send('wallet_switchEthereumChain', [{ chainId: chainIdHex }]);
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask.
    // 4902 is the standard EIP-1193 error code for "Unrecognized chain ID"
    // Also handle possible wrapped error structures or internal JSON-RPC error formats
    const errorCode = switchError.code || switchError.data?.originalError?.code || switchError.data?.code;

    if (errorCode === 4902 || switchError.message?.includes('Unrecognized chain ID') || switchError.message?.includes('check your network configuration')) {
      // Sepolia Config
      if (chainId === 11155111) {
        try {
          await (provider as any).send('wallet_addEthereumChain', [{
            chainId: chainIdHex,
            chainName: 'Sepolia',
            nativeCurrency: {
              name: 'Sepolia Ether',
              symbol: 'SEP',
              decimals: 18
            },
            rpcUrls: ['https://rpc.sepolia.org', 'https://ethereum-sepolia-rpc.publicnode.com'],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }]);

          // After adding, we might need to request switch again or it handles it automatically.
          // Usually wallet_addEthereumChain prompts to switch.
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError);
          throw new Error('Failed to add Sepolia network to your wallet. Please add it manually.');
        }
      } else {
        throw new Error(`Chain ID ${chainId} is not configured for automatic addition.`);
      }
    } else {
      console.error('Failed to switch network:', switchError);
      throw switchError;
    }
  }
}
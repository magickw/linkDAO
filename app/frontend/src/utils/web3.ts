import { getPublicClient, getWalletClient } from '@wagmi/core'
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
 */
export function wrapProvider(provider: any): any {
  if (!provider) return provider;
  if (provider.isWrapped) return provider;

  const wrappedProvider: any = Object.create(null);
  wrappedProvider.isWrapped = true;
  wrappedProvider._requestId = 0;
  wrappedProvider._events = {};
  wrappedProvider._emitted = {};

  try { wrappedProvider.isMetaMask = !!provider.isMetaMask; } catch { }
  try { wrappedProvider.chainId = provider.chainId; } catch { }
  try { wrappedProvider.networkVersion = provider.networkVersion; } catch { }
  try { wrappedProvider.selectedAddress = provider.selectedAddress; } catch { }

  const boundRequest = provider.request.bind(provider);

  const safeClone = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (Array.isArray(obj)) return obj.map(safeClone);
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
      const safeRequest: any = {
        method: String(args?.method || ''),
        params: args?.params ? safeClone(args.params) : [],
        jsonrpc: '2.0',
        id: Date.now()
      };
      const result = await boundRequest(safeRequest);
      return safeClone(result);
    } catch (error: any) {
      const message = error?.message || error?.toString() || 'Request failed';
      const safeError: any = new Error(message);
      if (error?.code !== undefined) safeError.code = error.code;
      if (error?.data !== undefined) safeError.data = safeClone(error.data);
      throw safeError;
    }
  };

  if (typeof provider.send === 'function') {
    const boundSend = provider.send.bind(provider);
    wrappedProvider.send = (...args: any[]) => {
      try {
        const safeArgs = args.map(arg => {
          if (typeof arg === 'function') return arg;
          try { return JSON.parse(JSON.stringify(arg)); } catch { return arg; }
        });
        return boundSend(...safeArgs);
      } catch (error: any) { throw new Error(error?.message || 'Send failed'); }
    };
  }

  if (typeof provider.sendAsync === 'function') {
    const boundSendAsync = provider.sendAsync.bind(provider);
    wrappedProvider.sendAsync = (...args: any[]) => {
      try {
        const safeArgs = args.map(arg => {
          if (typeof arg === 'function') return arg;
          try { return JSON.parse(JSON.stringify(arg)); } catch { return arg; }
        });
        return boundSendAsync(...safeArgs);
      } catch (error: any) { throw new Error(error?.message || 'SendAsync failed'); }
    };
  }

  if (typeof provider.on === 'function') wrappedProvider.on = provider.on.bind(provider);
  if (typeof provider.once === 'function') wrappedProvider.once = provider.once.bind(provider);
  if (typeof provider.off === 'function') wrappedProvider.off = provider.off.bind(provider);
  if (typeof provider.removeListener === 'function') wrappedProvider.removeListener = provider.removeListener.bind(provider);
  if (typeof provider.removeAllListeners === 'function') wrappedProvider.removeAllListeners = provider.removeAllListeners.bind(provider);
  if (typeof provider.emit === 'function') wrappedProvider.emit = provider.emit.bind(provider);
  if (typeof provider.listeners === 'function') wrappedProvider.listeners = provider.listeners.bind(provider);

  if (typeof provider.enable === 'function') {
    wrappedProvider.enable = provider.enable.bind(provider);
  } else {
    wrappedProvider.enable = async () => wrappedProvider.request({ method: 'eth_requestAccounts' });
  }

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
  if (cachedProvider) return cachedProvider;
  if (providerPromise) return providerPromise;
  if (providerCreationAttempts >= MAX_PROVIDER_CREATION_ATTEMPTS) {
    console.warn('Max provider creation attempts reached, returning null');
    return null;
  }

  providerCreationAttempts++;

  providerPromise = (async () => {
    try {
      if (config && config.connectors && config.connectors.length > 0) {
        let client: any = null;
        try { client = getPublicClient(config); } catch (e) { }
        
        if (client && (client as any).transport?.provider) {
          try {
            const wrappedProvider = wrapProvider((client as any).transport.provider);
            const provider = new ethers.BrowserProvider(wrappedProvider as any, "any");
            cachedProvider = provider;
            providerCreationAttempts = 0;
            return provider;
          } catch (e) { }
        }
      }

      if (hasInjectedProvider()) {
        const injectedProvider = getInjectedProvider();
        if (injectedProvider) {
          try {
            const wrappedProvider = wrapProvider(injectedProvider);
            const provider = new ethers.BrowserProvider(wrappedProvider, "any");
            cachedProvider = provider;
            providerCreationAttempts = 0;
            return provider;
          } catch (e) { }
        }
      }

      // Env-driven RPC
      const envRpc = process.env.NEXT_PUBLIC_RPC_URL;
      const envChainId = process.env.NEXT_PUBLIC_CHAIN_ID;
      
      const chainId = (envChainId && !isNaN(parseInt(envChainId, 10))) ? parseInt(envChainId, 10) : 11155111;
      const network = new ethers.Network(chainId === 1 ? 'mainnet' : 'sepolia', chainId);

      if (envRpc) {

              try {

                const proxiedRpc = (typeof window !== 'undefined')

                  ? `${window.location.origin}/api/proxy/rpc?target=${encodeURIComponent(envRpc)}`

                  : envRpc;

      

                const provider = new ethers.JsonRpcProvider(proxiedRpc, undefined, {

                  staticNetwork: true,

                  polling: false,

                  batchMaxCount: 1

                });

      

                // Test connection with a simple method call

                await provider._networkPromise;

                await provider.getBlockNumber();

                cachedProvider = provider;

                providerCreationAttempts = 0;

                return provider;

              } catch (e) {

                console.warn('Env RPC failed, trying fallback...', e);

              }

            }

      

            // Fallback to configured chain RPC

            let rpcUrl = getChainRpcUrl(chainId);

            if (rpcUrl) {

              try {

                // Try with proxy first

                const proxiedRpcUrl = (typeof window !== 'undefined')

                  ? `${window.location.origin}/api/proxy/rpc?target=${encodeURIComponent(rpcUrl)}`

                  : rpcUrl;

      

                const provider = new ethers.JsonRpcProvider(proxiedRpcUrl, undefined, {

                  staticNetwork: true,

                  polling: false,

                  batchMaxCount: 1

                });

      

                // Test connection

                await provider._networkPromise;

                await provider.getBlockNumber();

                cachedProvider = provider;

                providerCreationAttempts = 0;

                return provider;

              } catch (err) {

                // If proxy fails (e.g. 403), try direct if not in browser or if browser allows (public RPC)

                // Note: Browser calls to external RPCs might fail CORS if not proxied, but some are CORS-open.

                try {

                   console.warn('Proxy RPC failed, trying direct RPC connection...');

                   const directProvider = new ethers.JsonRpcProvider(rpcUrl, undefined, {

                      staticNetwork: true,

                      polling: false,

                      batchMaxCount: 1

                   });

      

                   // Test connection

                   await directProvider._networkPromise;

                   await directProvider.getBlockNumber();

                   cachedProvider = directProvider;

                   providerCreationAttempts = 0;

                   return directProvider;

                } catch(directErr) {

                   console.warn('Direct RPC also failed:', directErr);

                }

              }

            }

          } catch (e) {

            console.warn('Error getting provider:', e);

          }

      

          // Hardcoded Fallbacks

          console.log('Using hardcoded fallback provider');

          const fallbackRpcs = [

            'https://ethereum-sepolia-rpc.publicnode.com',

            'https://rpc.sepolia.org',

            'https://1rpc.io/sepolia'

          ];

          

          for (const rpc of fallbackRpcs) {

            try {

              // Try direct first for hardcoded fallbacks to avoid proxy issues if proxy is broken

              const provider = new ethers.JsonRpcProvider(rpc, undefined, {

                staticNetwork: true,

                polling: false,

                batchMaxCount: 1

              });

              

              // Test connection

              await provider._networkPromise;

              await provider.getBlockNumber();

              cachedProvider = provider;

              providerCreationAttempts = 0;

              return provider;

            } catch (err) {

              continue;

            }

          }

          

          console.error('All RPC providers failed. Returning null provider.');

          return null;
  })().finally(() => {
    providerPromise = null;
  });

  return providerPromise;
}

export async function getSigner() {
  // ... (keep existing implementation, it's fine)
  try {
    if (typeof window !== 'undefined' && (window as any).chrome) {
      const lastPassDetected = document.querySelectorAll('[data-lp-version]').length > 0;
      if (lastPassDetected) {
        console.warn('LastPass extension detected.');
      }
    }

    if (hasInjectedProvider()) {
      const injectedProvider = getInjectedProvider();
      if (injectedProvider) {
        try {
          const wrappedProvider = wrapProvider(injectedProvider);
          const provider = new ethers.BrowserProvider(wrappedProvider as any, "any");
          const signerPromise = provider.getSigner();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Signer timeout')), 5000)
          );
          const signer = await Promise.race([signerPromise, timeoutPromise]) as any;
          await signer.getAddress();
          return signer;
        } catch (e: any) {
          if (e?.message?.includes('read only property') || e?.message?.includes('requestId')) {
            const viemSigner = await getViemSigner();
            if (viemSigner) return await viemToEthersSigner(viemSigner);
            return await getDirectJsonRpcSigner();
          }
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function getAccount() {
  try {
    if (!config || !config.connectors || config.connectors.length === 0) return null;
    const client = await getWalletClient(config).catch(() => null);
    return client?.account || null;
  } catch (error) {
    return null;
  }
}

export async function getDirectJsonRpcSigner(): Promise<ethers.Signer | null> {
  // ... (keep existing implementation)
  try {
    if (!hasInjectedProvider()) return null;
    const injectedProvider = getInjectedProvider();
    if (!injectedProvider) return null;
    const wrappedProvider = wrapProvider(injectedProvider);
    const accounts = await wrappedProvider.request({ method: 'eth_accounts' }) as string[];
    if (!accounts || accounts.length === 0) {
      const requestedAccounts = await wrappedProvider.request({ method: 'eth_requestAccounts' }) as string[];
      if (!requestedAccounts || requestedAccounts.length === 0) return null;
    }
    const address = accounts[0];
    const chainId = await wrappedProvider.request({ method: 'eth_chainId' }) as string;
    
    // Minimal signer implementation
    const directSigner: any = {
      address: address,
      provider: null, // Simplified
      getAddress: () => address,
      connect: async () => directSigner,
      signMessage: async (message: string | Uint8Array) => {
        const msg = typeof message === 'string' ? message : ethers.toUtf8String(message);
        return await wrappedProvider.request({ method: 'personal_sign', params: [msg, address] });
      },
      signTransaction: async (tx: any) => {
        return await wrappedProvider.request({ method: 'eth_signTransaction', params: [tx] });
      },
      sendTransaction: async (tx: any) => {
        const hash = await wrappedProvider.request({ method: 'eth_sendTransaction', params: [tx] });
        return {
          hash,
          wait: async () => ({ hash, confirmations: 1, status: 1 }) // Dummy wait
        };
      },
      signTypedData: async (domain: any, types: any, value: any) => {
        return await wrappedProvider.request({ method: 'eth_signTypedData_v4', params: [address, JSON.stringify({ domain, types, value })] });
      }
    };
    return directSigner;
  } catch (error) {
    return null;
  }
}

export async function getViemSigner() {
  // ... (keep existing implementation)
  try {
    if (!hasInjectedProvider()) return null;
    const injectedProvider = getInjectedProvider();
    if (!injectedProvider) return null;
    const { createWalletClient, custom } = await import('viem');
    const wrappedProvider = wrapProvider(injectedProvider);
    const walletClient = createWalletClient({ transport: custom(wrappedProvider) });
    const accounts = await walletClient.getAddresses();
    if (accounts.length === 0) return null;
    return walletClient;
  } catch { return null; }
}

export async function viemToEthersSigner(viemWalletClient: any): Promise<ethers.Signer | null> {
  // ... (keep existing implementation)
  try {
    if (!viemWalletClient) return null;
    const injectedProvider = getInjectedProvider();
    if (!injectedProvider) return null;
    const wrappedProvider = wrapProvider(injectedProvider);
    const provider = new ethers.BrowserProvider(wrappedProvider as any, "any");
    const accounts = await viemWalletClient.getAddresses();
    if (accounts.length === 0) return null;
    return await provider.getSigner(accounts[0] as `0x${string}`);
  } catch { return null; }
}

export function formatEther(value: ethers.BigNumberish): string {
  try { return ethers.formatEther(value) } catch { return '0' }
}

export function parseEther(value: string): bigint {
  try { return ethers.parseEther(value) } catch { return 0n }
}

export function formatUnits(value: ethers.BigNumberish, decimals: number): string {
  try { return ethers.formatUnits(value, decimals) } catch { return '0' }
}

export function parseUnits(value: string, decimals: number): bigint {
  try { return ethers.parseUnits(value, decimals) } catch { return 0n }
}

let cachedMainnetProvider: ethers.Provider | null = null;

export async function getMainnetProvider() {
  if (cachedMainnetProvider) return cachedMainnetProvider;

  const mainnetRpc = process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://eth.llamarpc.com';
  const network = new ethers.Network('mainnet', 1);

  try {
    // Check if we're in the browser and need to use the proxy
    const shouldUseProxy = typeof window !== 'undefined';
    // Logic: if it's an Alchemy/Infura URL, try proxy. If it's a public one, maybe direct.
    // If proxy fails, we MUST try direct or fallback.
    
    if (shouldUseProxy) {
        const rpcUrl = `${window.location.origin}/api/proxy/rpc?target=${encodeURIComponent(mainnetRpc)}`;
        const provider = new ethers.JsonRpcProvider(rpcUrl, network, {
          staticNetwork: true,
          polling: false,
          batchMaxCount: 1
        });
        await provider.getBlockNumber();
        cachedMainnetProvider = provider;
        return provider;
    } else {
        const provider = new ethers.JsonRpcProvider(mainnetRpc, network, {
          staticNetwork: true,
          polling: false
        });
        await provider.getBlockNumber();
        cachedMainnetProvider = provider;
        return provider;
    }
  } catch (error) {
    console.warn('Failed to create Mainnet provider via primary method:', error);
    
    // Fallback: Direct connection to public RPC (bypass proxy)
    try {
      const fallbackRpc = 'https://eth.llamarpc.com';
      console.log('Trying direct fallback RPC for mainnet:', fallbackRpc);
      
      const provider = new ethers.JsonRpcProvider(fallbackRpc, network, {
        staticNetwork: true,
        polling: false,
        batchMaxCount: 1
      });
      
      await provider.getBlockNumber();
      cachedMainnetProvider = provider;
      return provider;
    } catch (e) {
      console.warn('Mainnet provider fallback failed:', e);
      return null;
    }
  }
}

export function resetProviderCache(): void {
  cachedProvider = null;
  providerCreationAttempts = 0;
  lastProviderError = null;
}

export function getLastProviderError(): Error | null {
  return lastProviderError;
}

export async function switchNetwork(chainId: number): Promise<void> {
  const provider = await getProvider();
  if (!provider) throw new Error('No provider available to switch network');
  const chainIdHex = `0x${chainId.toString(16)}`;
  try {
    await (provider as any).send('wallet_switchEthereumChain', [{ chainId: chainIdHex }]);
  } catch (switchError: any) {
    const errorCode = switchError.code || switchError.data?.originalError?.code || switchError.data?.code;
    if (errorCode === 4902 || switchError.message?.includes('Unrecognized chain ID')) {
      if (chainId === 11155111) {
        try {
          await (provider as any).send('wallet_addEthereumChain', [{
            chainId: chainIdHex,
            chainName: 'Sepolia',
            nativeCurrency: { name: 'Sepolia Ether', symbol: 'SEP', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }]);
        } catch (addError) { throw new Error('Failed to add network'); }
      } else {
        throw new Error(`Chain ID ${chainId} not configured.`);
      }
    } else {
      throw switchError;
    }
  }
}

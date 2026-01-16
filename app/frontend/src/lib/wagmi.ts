import { createConfig, http, createStorage } from 'wagmi'
import { base, baseSepolia, mainnet, polygon, arbitrum, sepolia } from 'wagmi/chains'
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors'
import './devConfig' // Import development configuration

// Create persistent storage for wallet state
const storage = createStorage({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'linkdao-wallet-storage',
})

// WalletConnect project ID - in production, this should be from environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

// Suppress WalletConnect warnings in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    if (message.includes('Failed to fetch remote project configuration') ||
      message.includes('api.web3modal.org') ||
      message.includes('Reown Config')) {
      return; // Suppress these specific warnings
    }
    originalWarn.apply(console, args);
  };
}

const getFrontendUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // Default URL for SSR or non-browser environments
  return 'https://linkdao.io'
}

// Use the backend as a proxy for RPC requests to avoid CORS issues and protect RPC keys
const getRpcUrl = (chainId: number) => {
  const targetUrl = getChainRpcUrl(chainId);
  // Always route through our backend proxy for consistent behavior across environments
  // and to avoid CORS issues with providers like Alchemy
  return `/api/proxy?target=${encodeURIComponent(targetUrl)}`;
};

export const getChainRpcUrl = (chainId: number) => {
  switch (chainId) {
    case base.id:
      return process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
    case baseSepolia.id:
      return process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    case mainnet.id:
      return process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://eth.llamarpc.com';
    case polygon.id:
      return process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon.llamarpc.com';
    case arbitrum.id:
      return process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arbitrum.llamarpc.com';
    case sepolia.id:
      return process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
    default:
      return 'https://eth.llamarpc.com';
  }
};

// Set up wagmi config with enhanced connectors
export const config = createConfig({
  chains: [base, baseSepolia, mainnet, polygon, arbitrum, sepolia],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'LinkDAO Marketplace',
        url: getFrontendUrl(),
        iconUrl: 'https://linkdao.io/icon.png',
      },
    }),
    coinbaseWallet({
      appName: 'LinkDAO Marketplace',
      appLogoUrl: 'https://linkdao.io/icon.png',
      preference: 'smartWalletOnly', // Use Smart Wallet for Base
    }),
    injected(),
  ],
  transports: {
    [base.id]: http(getRpcUrl(base.id)),
    [baseSepolia.id]: http(getRpcUrl(baseSepolia.id)),
    [mainnet.id]: http(getRpcUrl(mainnet.id)),
    [polygon.id]: http(getRpcUrl(polygon.id)),
    [arbitrum.id]: http(getRpcUrl(arbitrum.id)),
    [sepolia.id]: http(getRpcUrl(sepolia.id)),
  },
  ssr: false, // Disable SSR for wallet state
  storage, // Add persistent storage
})

export { base, baseSepolia, mainnet, polygon, arbitrum, sepolia }

// Add a health check function
export const checkWagmiConnection = async () => {
  try {
    // Use a CORS-enabled RPC endpoint
    const rpcUrl = getRpcUrl(base.id);
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
    });
    if (response.ok) {
      console.log('Wagmi RPC connection is healthy');
      return true;
    }
    console.error('Wagmi RPC connection is unhealthy');
    return false;
  } catch (error) {
    console.error('Error checking Wagmi connection:', error);
    return false;
  }
};
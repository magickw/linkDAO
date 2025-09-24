import { createConfig, http } from 'wagmi'
import { base, baseGoerli, mainnet, polygon, arbitrum, sepolia } from 'wagmi/chains'
import { injected, metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import './devConfig' // Import development configuration

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
  return 'https://linkdao.vercel.app'
}

// For production deployment, use the backend as a proxy for RPC requests to avoid CORS issues
const getRpcUrl = (chainId: number) => {
  // In production, route through our backend to avoid CORS issues
  if (process.env.NODE_ENV === 'production') {
    return `/api/proxy?target=${encodeURIComponent(getChainRpcUrl(chainId))}`;
  }
  
  // In development, use direct URLs
  return getChainRpcUrl(chainId);
};

const getChainRpcUrl = (chainId: number) => {
  switch (chainId) {
    case base.id:
      return process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
    case baseGoerli.id:
      return process.env.NEXT_PUBLIC_BASE_GOERLI_RPC_URL || 'https://goerli.base.org';
    case mainnet.id:
      return process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://eth.llamarpc.com';
    case polygon.id:
      return process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon.llamarpc.com';
    case arbitrum.id:
      return process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arbitrum.llamarpc.com';
    case sepolia.id:
      return process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
    default:
      return 'https://eth.llamarpc.com';
  }
};

// Set up wagmi config with enhanced connectors
export const config = createConfig({
  chains: [base, baseGoerli, mainnet, polygon, arbitrum, sepolia],
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
    walletConnect({
      projectId,
      metadata: {
        name: 'LinkDAO Marketplace',
        description: 'Decentralized Web3 Marketplace',
        url: getFrontendUrl(),
        icons: ['https://linkdao.io/icon.png'],
      },
      showQrModal: true,
      // Disable remote config fetching in development
      disableProviderPing: process.env.NODE_ENV === 'development',
    }),
    injected({
      target() {
        return { 
          id: 'injected', 
          name: 'Injected Wallet', 
          provider: typeof window !== 'undefined' ? window.ethereum : undefined 
        }
      },
    }),
  ],
  transports: {
    [base.id]: http(getRpcUrl(base.id)),
    [baseGoerli.id]: http(getRpcUrl(baseGoerli.id)),
    [mainnet.id]: http(getRpcUrl(mainnet.id)),
    [polygon.id]: http(getRpcUrl(polygon.id)),
    [arbitrum.id]: http(getRpcUrl(arbitrum.id)),
    [sepolia.id]: http(getRpcUrl(sepolia.id)),
  },
})

export { base, baseGoerli, mainnet, polygon, arbitrum, sepolia }

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
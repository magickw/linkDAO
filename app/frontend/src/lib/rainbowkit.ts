import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, mainnet, polygon, arbitrum, sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

// Get the WalletConnect project ID from environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'd051afaee33392cccc42e141b9f7697b';

if (!projectId) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Using fallback project ID.');
}

// Define RPC URLs with fallbacks
const getRpcUrl = (chainId: number): string => {
  switch (chainId) {
    case mainnet.id:
      return process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/5qxkwSO4d_0qE4wjQPIrp';
    case base.id:
      return process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
    case baseSepolia.id:
      return process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    case polygon.id:
      return process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com';
    case arbitrum.id:
      return process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
    case sepolia.id:
      return process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
    default:
      return 'https://eth-mainnet.g.alchemy.com/v2/demo';
  }
};

// Create a singleton instance to prevent multiple initializations
let cachedConfig: ReturnType<typeof getDefaultConfig> | null = null;

export const config = (() => {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = getDefaultConfig({
    appName: 'LinkDAO Marketplace',
    projectId,
    chains: [base, baseSepolia, mainnet, polygon, arbitrum, sepolia],
    transports: {
      [mainnet.id]: http(getRpcUrl(mainnet.id)),
      [base.id]: http(getRpcUrl(base.id)),
      [baseSepolia.id]: http(getRpcUrl(baseSepolia.id)),
      [polygon.id]: http(getRpcUrl(polygon.id)),
      [arbitrum.id]: http(getRpcUrl(arbitrum.id)),
      [sepolia.id]: http(getRpcUrl(sepolia.id)),
    },
    ssr: true,
    appDescription: 'Decentralized Web3 Marketplace and DAO Platform',
    appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://linkdao.io',
    appIcon: 'https://linkdao.io/icon.png',
    // Disable remote config fetching to prevent network errors
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Disable analytics and other network requests
    appInfo: {
      projectName: 'LinkDAO Marketplace',
    },
  });

  return cachedConfig;
})();
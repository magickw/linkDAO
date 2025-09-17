import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseGoerli, mainnet, polygon, arbitrum, sepolia } from 'wagmi/chains';

// Get the WalletConnect project ID from environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'd051afaee33392cccc42e141b9f7697b';

if (!projectId) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Using fallback project ID.');
}

export const config = getDefaultConfig({
  appName: 'LinkDAO Marketplace',
  projectId,
  chains: [base, baseGoerli, mainnet, polygon, arbitrum, sepolia],
  ssr: true,
  appDescription: 'Decentralized Web3 Marketplace and DAO Platform',
  appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://linkdao.io',
  appIcon: 'https://linkdao.io/icon.png',
});
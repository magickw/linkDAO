import { createConfig, http } from 'wagmi'
import { base, baseGoerli, mainnet, polygon, arbitrum } from 'wagmi/chains'
import { injected, metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors'

// WalletConnect project ID - in production, this should be from environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

const getFrontendUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // Default URL for SSR or non-browser environments
  return 'https://linkdao.io'
}

// Set up wagmi config with enhanced connectors
export const config = createConfig({
  chains: [base, baseGoerli, mainnet, polygon, arbitrum],
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
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
    [baseGoerli.id]: http(process.env.NEXT_PUBLIC_BASE_GOERLI_RPC_URL || 'https://goerli.base.org'),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon.llamarpc.com'),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arbitrum.llamarpc.com'),
  },
})

export { base, baseGoerli, mainnet, polygon, arbitrum }

// Add a health check function
export const checkWagmiConnection = async () => {
  try {
    const response = await fetch(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org', {
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
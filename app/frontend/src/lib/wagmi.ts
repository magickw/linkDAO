import { createConfig, http } from 'wagmi'
import { base, baseGoerli, mainnet, polygon, arbitrum } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// WalletConnect project ID - in production, this should be from environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

// Set up wagmi config with enhanced connectors
export const config = createConfig({
  chains: [base, baseGoerli, mainnet, polygon, arbitrum],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'LinkDAO Marketplace',
        url: 'https://linkdao.io',
        iconUrl: 'https://linkdao.io/icon.png',
      },
    }),
    walletConnect({
      projectId,
      metadata: {
        name: 'LinkDAO Marketplace',
        description: 'Decentralized Web3 Marketplace',
        url: 'https://linkdao.io',
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
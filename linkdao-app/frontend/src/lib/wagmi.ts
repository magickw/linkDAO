import { createConfig, configureChains, mainnet } from 'wagmi'
import { base, baseGoerli } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'

// Configure chains & providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [base, baseGoerli, mainnet],
  [publicProvider()]
)

// Set up wagmi config
export const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new InjectedConnector({
      chains,
      options: {
        name: 'Injected',
        shimDisconnect: true,
      },
    }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
        showQrModal: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
})

export { chains }
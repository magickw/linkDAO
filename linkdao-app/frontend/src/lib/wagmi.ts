import { createConfig, http } from 'wagmi'
import { base, baseGoerli, mainnet } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Set up wagmi config
export const config = createConfig({
  chains: [base, baseGoerli, mainnet],
  connectors: [
    metaMask(),
    injected({
      target() {
        return { id: 'injected', name: 'Injected', provider: typeof window !== 'undefined' ? window.ethereum : undefined }
      },
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseGoerli.id]: http(),
    [mainnet.id]: http(),
  },
})

export { base, baseGoerli, mainnet }
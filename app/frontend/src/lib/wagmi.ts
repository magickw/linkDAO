import { createConfig, http } from 'wagmi'
import { base, baseGoerli, mainnet } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

// Set up wagmi config with basic connectors
export const config = createConfig({
  chains: [base, baseGoerli, mainnet],
  connectors: [
    metaMask(),
    injected({
      target() {
        return { id: 'injected', name: 'Injected', provider: typeof window !== 'undefined' ? window.ethereum : undefined }
      },
    }),
  ],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
    [baseGoerli.id]: http(process.env.NEXT_PUBLIC_BASE_GOERLI_RPC_URL || 'https://goerli.base.org'),
    [mainnet.id]: http(),
  },
})

export { base, baseGoerli, mainnet }
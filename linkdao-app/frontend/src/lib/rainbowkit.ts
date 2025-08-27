import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseGoerli } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'LinkDAO',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID_HERE',
  chains: [base, baseGoerli],
  ssr: true, // If your dApp uses server side rendering (SSR)
});
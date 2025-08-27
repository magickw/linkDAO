import React from 'react';
import type { AppProps } from 'next/app';
import { config, chains } from '@/lib/wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiConfig } from 'wagmi';
import { Web3Provider } from '@/context/Web3Context';
import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => setMounted(true), []);
  
  if (!mounted) return null;

  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider chains={chains}>
        <Web3Provider>
          <Component {...pageProps} />
        </Web3Provider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
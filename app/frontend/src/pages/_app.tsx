import React from 'react';
import type { AppProps } from 'next/app';
import { config } from '@/lib/wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Web3Provider } from '@/context/Web3Context';
import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => setMounted(true), []);
  
  if (!mounted) return null;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Web3Provider>
            <Component {...pageProps} />
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
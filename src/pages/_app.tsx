import React from 'react';
import type { AppProps } from 'next/app';
import { config } from '@/lib/wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Web3Provider } from '@/context/Web3Context';
import { ToastProvider } from '@/context/ToastContext';
import { NavigationProvider } from '@/context/NavigationContext';
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
            <ToastProvider>
              <NavigationProvider>
                <Component {...pageProps} />
              </NavigationProvider>
            </ToastProvider>
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
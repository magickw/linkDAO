'use client';

// Import Web3 polyfills first to ensure compatibility
import '@/utils/web3Polyfills';
import '@/lib/devConfig';

import { ReactNode, useEffect } from 'react';
import '../styles/globals.css';
import '../styles/enhanced-glassmorphism.css';
import '../styles/mobile-optimizations.css';
import '../styles/design-polish.css';
import '../styles/tiptap.css';
import '@rainbow-me/rainbowkit/styles.css';

import { config } from '@/lib/rainbowkit';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';
import { Web3Provider } from '@/context/Web3Context';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { NavigationProvider } from '@/context/NavigationContext';
import { SellerQueryProvider } from '@/providers/SellerQueryProvider';
import { ContactProvider } from '@/contexts/ContactContext';
import { ChatNotificationProvider } from '@/contexts/ChatNotificationContext';
import { SocialNotificationProvider } from '@/contexts/SocialNotificationContext';
import { OrderNotificationProvider } from '@/contexts/OrderNotificationContext';
import { EnhancedThemeProvider } from '@/components/VisualPolish';
import { performanceMonitor, memoryMonitor } from '@/utils/performanceMonitor';
import { initializeExtensionErrorSuppression } from '@/utils/extensionErrorHandler';
import ErrorBoundary from '@/components/ErrorBoundary';
import { default as dynamicImport } from 'next/dynamic';
import { SpeedInsights } from '@vercel/speed-insights/next';
import GlobalLoading from '@/components/GlobalLoading';

// Dynamically import WalletLoginBridge to avoid Solana SDK at build time
const WalletLoginBridgeWithToast = dynamicImport(
  () => import('@/components/Auth/WalletLoginBridgeWithToast'),
  { ssr: false }
);

const queryClient = new QueryClient();

// Prevent static generation for this dynamic layout
export const dynamic = 'force-dynamic';

function AppProviders({ children }: { children: ReactNode }) {
  // Initialize only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      performanceMonitor.mark('app_init_start');
      memoryMonitor.start();
      initializeExtensionErrorSuppression();
    }
  }, []);

  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <OnchainKitProvider chain={base}>
              <Web3Provider>
                <AuthProvider>
                  <ToastProvider>
                    <NavigationProvider>
                      <SellerQueryProvider>
                        <ContactProvider>
                          <ChatNotificationProvider>
                            <SocialNotificationProvider>
                              <OrderNotificationProvider>
                                <EnhancedThemeProvider>
                                  <WalletLoginBridgeWithToast />
                                  <GlobalLoading />
                                  {children}
                                  <SpeedInsights />
                                </EnhancedThemeProvider>
                              </OrderNotificationProvider>
                            </SocialNotificationProvider>
                          </ChatNotificationProvider>
                        </ContactProvider>
                      </SellerQueryProvider>
                    </NavigationProvider>
                  </ToastProvider>
                </AuthProvider>
              </Web3Provider>
            </OnchainKitProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>LinkDAO</title>
        <meta name="description" content="Decentralized marketplace for digital and physical goods" />
      </head>
      <body suppressHydrationWarning>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}

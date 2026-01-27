'use client';

// Force dynamic rendering for all admin routes
export const dynamic = 'force-dynamic';

// Import Web3 polyfills first to ensure compatibility
import '@/utils/web3Polyfills';
import '@/lib/devConfig';

import React, { ReactNode, useEffect, useState } from 'react';
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

// Dynamically import WalletLoginBridge with ssr: false to avoid Solana SDK at build time
const WalletLoginBridgeWithToast = dynamicImport(
  () => import('@/components/Auth/WalletLoginBridgeWithToast'),
  { ssr: false }
);

const queryClient = new QueryClient();

function ClientProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      performanceMonitor.mark('app_init_start');
      memoryMonitor.start();
      initializeExtensionErrorSuppression();
    }
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

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

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ClientProviders>
      {children}
    </ClientProviders>
  );
}

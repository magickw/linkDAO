'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
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
import { ServiceWorkerUtil } from '@/utils/serviceWorkerUtil';
import { performanceMonitor, memoryMonitor } from '@/utils/performanceMonitor';
import { initializeExtensionErrorSuppression } from '@/utils/extensionErrorHandler';
import ErrorBoundary from '@/components/ErrorBoundary';
import { WalletLoginBridgeWithToast } from '@/components/Auth/WalletLoginBridgeWithToast';
import { SpeedInsights } from '@vercel/speed-insights/next';
import GlobalLoading from '@/components/GlobalLoading';

const queryClient = new QueryClient();

// Track initialization state to prevent multiple initializations
let isContractRegistryInitializing = false;
let isContractRegistryInitialized = false;

function AppContent({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = React.useState(true);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const pathname = usePathname();
  const swUtilRef = React.useRef<ServiceWorkerUtil | null>(null);
  const [isBackendAvailable, setIsBackendAvailable] = React.useState(true);
  const [retryAttempt, setRetryAttempt] = React.useState(0);

  // Initialize service worker, performance monitoring, and network status
  React.useEffect(() => {
    // Check backend availability
    const checkBackendAvailability = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`);
        setIsBackendAvailable(response.ok);
        if (response.ok) setRetryAttempt(0);
      } catch (error) {
        setIsBackendAvailable(false);
        if (retryAttempt < 3) {
          setTimeout(() => {
            setRetryAttempt(prev => prev + 1);
          }, Math.min(1000 * Math.pow(2, retryAttempt), 30000));
        }
      }
    };

    checkBackendAvailability();
    const healthCheckInterval = setInterval(checkBackendAvailability, 60000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize performance monitoring
    performanceMonitor.mark('app_init_start');
    memoryMonitor.start();

    // Initialize extension error suppression
    initializeExtensionErrorSuppression();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(healthCheckInterval);
    };
  }, [retryAttempt]);

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

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppContent>
      {children}
    </AppContent>
  );
}

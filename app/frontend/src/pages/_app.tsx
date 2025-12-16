// Import Web3 polyfills first to ensure compatibility
import '@/utils/web3Polyfills';
import '@/lib/devConfig';

import React, { useEffect, useRef, useCallback } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { config } from '@/lib/rainbowkit';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';
import { Web3Provider } from '@/context/Web3Context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { NavigationProvider } from '@/context/NavigationContext';
import { SellerQueryProvider } from '@/providers/SellerQueryProvider';
import { ContactProvider } from '@/contexts/ContactContext';
import { ENV_CONFIG } from '@/config/environment';
import { contractRegistryService } from '@/services/contractRegistryService';

import { EnhancedThemeProvider } from '@/components/VisualPolish';
// Cart provider not needed - using service-based cart
import { ServiceWorkerUtil } from '@/utils/serviceWorkerUtil';
import { performanceMonitor, memoryMonitor } from '@/utils/performanceMonitor';
import { initializeExtensionErrorSuppression, debugExtensionErrors } from '@/utils/extensionErrorHandler';
import ErrorBoundary from '@/components/ErrorBoundary';
import { WalletLoginBridgeWithToast } from '@/components/Auth/WalletLoginBridgeWithToast';
import Head from 'next/head';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '../styles/globals.css';
import '../styles/enhanced-glassmorphism.css';
import '../styles/mobile-optimizations.css';
import '../styles/design-polish.css';
import '../styles/tiptap.css';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

// Track initialization state to prevent multiple initializations
let isContractRegistryInitializing = false;
let isContractRegistryInitialized = false;

function AppContent({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = React.useState(true);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const router = useRouter();
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
    // Service worker registration moved to initializeServices for better control
    // Network status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize performance monitoring
    performanceMonitor.mark('app_init_start');
    memoryMonitor.start();

    // Initialize ContractRegistry with provider
    const initializeContractRegistry = async () => {
      // Prevent multiple concurrent initializations
      if (isContractRegistryInitializing) {
        console.debug('ContractRegistry initialization already in progress, skipping...');
        return;
      }
      
      // Prevent multiple initializations
      if (isContractRegistryInitialized) {
        console.debug('ContractRegistry already initialized, skipping...');
        return;
      }

      try {
        isContractRegistryInitializing = true;
        
        // Use wagmi's public client for initialization
        if (typeof window !== 'undefined') {
          const { getPublicClient } = await import('@wagmi/core');
          const publicClient = getPublicClient(config);
          if (publicClient) {
            await contractRegistryService.initialize(publicClient);
            isContractRegistryInitialized = true;

            // Defer heavy preloading to avoid blocking initial navigation
            if ('requestIdleCallback' in window) {
              (window as any).requestIdleCallback(async () => {
                await contractRegistryService.preloadCommonContracts();
              }, { timeout: 5000 });
            } else {
              setTimeout(async () => {
                await contractRegistryService.preloadCommonContracts();
              }, 1000);
            }
          } else {
            console.warn('No public client available for ContractRegistry initialization');
          }
        }
      } catch (error) {
        console.warn('Failed to initialize ContractRegistry:', error);
      } finally {
        isContractRegistryInitializing = false;
      }
    };
    
    // Only initialize contract registry in browser environment
    if (typeof window !== 'undefined') {
      // Delay initialization slightly to ensure wagmi is fully ready
      setTimeout(() => {
        initializeContractRegistry();
      }, 100);
    }

    // Initialize extension error suppression with a single handler
    const cleanupExtensionErrorSuppression = initializeExtensionErrorSuppression();

    // Enable debug mode for extension errors in development
    debugExtensionErrors(process.env.NODE_ENV === 'development');

    const initializeServices = async () => {
      try {
        // Initialize performance monitoring
        performanceMonitor.mark('app_init');

        // Start memory monitoring in production
        if (process.env.NODE_ENV === 'production') {
          memoryMonitor.start();
        }

        // Initialize service worker with enhanced error handling
        try {
          if (process.env.NODE_ENV === 'production') {
            swUtilRef.current = new ServiceWorkerUtil({
              onUpdate: (registration) => {
                console.log('App update available');
                setUpdateAvailable(true);
              },
              onSuccess: (registration) => {
                console.log('Service worker registered successfully');
              },
              onError: (error) => {
                console.error('Service worker registration failed:', error);
              }
            });

            await swUtilRef.current.register();
          } else {
            console.log('Service Worker disabled in development');
            
            // Unregister any existing service workers in development to prevent conflicts
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                await registration.unregister();
              }
            }
          }
        } catch (swError) {
          console.warn('Service worker initialization failed, continuing without it:', swError);
          // Continue without service worker if initialization fails
        }

        performanceMonitor.measure('app_init');
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initializeServices();

    return () => {
      cleanupExtensionErrorSuppression();
      memoryMonitor.stop();
      clearInterval(healthCheckInterval);
    };
  }, []);

  const handleUpdateApp = async () => {
    // Simplified update handling since getServiceWorkerManager doesn't exist
    if (swUtilRef.current) {
      // Force service worker update check
      await swUtilRef.current.checkForUpdates();
      setUpdateAvailable(false);
    }
  };

  return (
    <>
      {children}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">You're offline</span>
          </div>
        </div>
      )}

      {/* Update Notification */}
      {updateAvailable && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Update Available</p>
              <p className="text-xs opacity-90">A new version is ready</p>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => setUpdateAvailable(false)}
                className="text-xs px-2 py-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
              >
                Later
              </button>
              <button
                onClick={handleUpdateApp}
                className="text-xs px-2 py-1 bg-white text-blue-500 rounded hover:bg-gray-100 transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function App({ Component, pageProps, router }: AppProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Render a minimal placeholder during SSR to prevent CSS HMR issues
  if (!mounted) {
    return (
      <div style={{ display: 'none' }} suppressHydrationWarning>
        Loading...
      </div>
    );
  }

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />
      </Head>
      <ErrorBoundary>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <OnchainKitProvider
              apiKey={ENV_CONFIG.CDP_API_KEY}
              chain={base}
            >
              <SellerQueryProvider queryClient={queryClient}>
                <RainbowKitProvider>
                  <Web3Provider>
                    <AuthProvider>
                      <ToastProvider>
                        <NavigationProvider>
                          <ContactProvider>
                            <EnhancedThemeProvider defaultTheme="system">
                              <AppContent>
                                <Component {...pageProps} />
                              </AppContent>
                              <WalletLoginBridgeWithToast autoLogin={true} />
                            </EnhancedThemeProvider>
                          </ContactProvider>
                        </NavigationProvider>
                      </ToastProvider>
                    </AuthProvider>
                  </Web3Provider>
                </RainbowKitProvider>
              </SellerQueryProvider>
            </OnchainKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ErrorBoundary>
      <SpeedInsights />
    </>
  );
}
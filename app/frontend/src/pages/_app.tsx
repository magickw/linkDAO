// Import Web3 polyfills first to ensure compatibility
import '@/utils/web3Polyfills';

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
      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          await contractRegistryService.initialize(window.ethereum);

          // FORCE UNREGISTER SERVICE WORKER FOR DEBUGGING
          if ('serviceWorker' in navigator) {
            console.log('Force unregistering Service Worker for navigation debugging...');
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
              console.log('Unregistered SW:', registration.scope);
            }
          }

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
        }
      } catch (error) {
        console.warn('Failed to initialize ContractRegistry:', error);
      }
    };
    initializeContractRegistry();

    // IMMEDIATE: Set up chrome.runtime error suppression before anything else
    const immediateErrorSuppressor = (event: any) => {
      if (event && (event.message || event.reason || event.error)) {
        const errorText = String(event.message || event.reason || event.error?.message || '').toLowerCase();
        const errorSource = event.filename || event.source || '';
        if (errorText.includes('chrome.runtime.sendmessage') ||
          errorText.includes('opfgelmcmbiajamepnmloijbpoleiama') ||
          errorText.includes('extension id') ||
          errorText.includes('runtime.sendmessage(optional string extensionid') ||
          errorText.includes('cannot redefine property: ethereum') ||
          errorSource.includes('background-redux-new.js')) {
          console.debug('🚫 IMMEDIATE: Chrome/extension runtime error blocked');
          event.preventDefault?.();
          // Don't stop propagation to allow navigation
          return false;
        }
      }
    };

    // Apply immediately with highest priority
    window.addEventListener('error', immediateErrorSuppressor, { capture: true, passive: false });
    window.addEventListener('unhandledrejection', immediateErrorSuppressor, { capture: true, passive: false });

    // Enable debug mode for extension errors in development
    debugExtensionErrors(process.env.NODE_ENV === 'development');

    // Initialize extension error suppression
    const cleanupExtensionErrorSuppression = initializeExtensionErrorSuppression();

    // More aggressive error handling for chrome.runtime.sendMessage specifically
    const chromeRuntimeErrorHandler = (event: ErrorEvent) => {
      const message = event.message || '';
      const filename = event.filename || '';
      const stack = event.error?.stack || '';

      // Very specific patterns for chrome.runtime.sendMessage errors
      const chromeRuntimePatterns = [
        'chrome.runtime.sendMessage',
        'Error in invocation of runtime.sendMessage',
        'runtime.sendMessage(optional string extensionId',
        'must specify an Extension ID',
        'called from a webpage must specify an Extension ID',
        'for its first argument',
        'opfgelmcmbiajamepnmloijbpoleiama',
        'Cannot redefine property: ethereum'
      ];

      // Check all error information
      const allErrorText = `${message} ${filename} ${stack}`.toLowerCase();

      // Look for the specific error pattern
      const isChromeRuntimeError = chromeRuntimePatterns.some(pattern =>
        allErrorText.includes(pattern.toLowerCase())
      ) || allErrorText.includes('chrome-extension://opfgelmcmbiajamepnmloijbpoleiama');

      if (isChromeRuntimeError) {
        console.debug('🔇 Chrome runtime error suppressed:', {
          message: message.substring(0, 200),
          filename,
          extensionId: 'opfgelmcmbiajamepnmloijbpoleiama',
          timestamp: new Date().toISOString()
        });

        // Only suppress the error, don't stop propagation to allow navigation
        event.preventDefault();
        // Don't call stopImmediatePropagation() to allow navigation events
        return false; // Don't prevent default actions like navigation
      }
    };

    // Handle promise rejections for chrome runtime errors
    const chromeRuntimeRejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason || '';
      let message = '';

      if (typeof reason === 'string') {
        message = reason;
      } else if (reason && typeof reason === 'object') {
        message = reason.message || reason.toString() || '';
      }

      const chromeRuntimePatterns = [
        'chrome.runtime.sendMessage',
        'Error in invocation of runtime.sendMessage',
        'runtime.sendMessage(optional string extensionId',
        'must specify an Extension ID',
        'called from a webpage must specify an Extension ID',
        'opfgelmcmbiajamepnmloijbpoleiama',
        'Cannot redefine property: ethereum'
      ];

      const isChromeRuntimeError = chromeRuntimePatterns.some(pattern =>
        message.toLowerCase().includes(pattern.toLowerCase())
      );

      if (isChromeRuntimeError) {
        console.debug('🔇 Chrome runtime promise rejection suppressed:', {
          reason: message.substring(0, 200),
          extensionId: 'opfgelmcmbiajamepnmloijbpoleiama',
          timestamp: new Date().toISOString()
        });

        // Only suppress the error, don't stop propagation to allow navigation
        event.preventDefault();
        // Don't call stopImmediatePropagation() to allow navigation events
        return false; // Don't prevent default actions like navigation
      }
    };

    // Add Chrome runtime specific handlers with highest priority (capture phase, first)
    window.addEventListener('error', chromeRuntimeErrorHandler, { capture: true, passive: false });
    window.addEventListener('unhandledrejection', chromeRuntimeRejectionHandler, { capture: true, passive: false });

    // Also override console.error temporarily to catch any console-level errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      const source = args.find(arg => typeof arg === 'string' && arg.includes('background-redux-new.js')) || '';
      if (message.toLowerCase().includes('chrome.runtime.sendmessage') ||
        message.toLowerCase().includes('opfgelmcmbiajamepnmloijbpoleiama') ||
        message.toLowerCase().includes('cannot redefine property: ethereum') ||
        source.includes('background-redux-new.js')) {
        console.debug('🔇 Console error suppressed (chrome/runtime extension):', message.substring(0, 200));
        return;
      }
      originalConsoleError.apply(console, args);
    };

    const initializeServices = async () => {
      try {
        // Initialize performance monitoring
        performanceMonitor.mark('app_init');

        // Start memory monitoring in production
        if (process.env.NODE_ENV === 'production') {
          memoryMonitor.start();
        }

        // Initialize service worker (production only to avoid dev interference)
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

          // Removed network status monitoring as it's not available in ServiceWorkerUtil
        } else {
          console.log('Service Worker disabled in development');
        }

        performanceMonitor.measure('app_init');
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initializeServices();

    return () => {
      window.removeEventListener('error', immediateErrorSuppressor, true);
      window.removeEventListener('unhandledrejection', immediateErrorSuppressor, true);
      cleanupExtensionErrorSuppression();
      window.removeEventListener('error', chromeRuntimeErrorHandler, true);
      window.removeEventListener('unhandledrejection', chromeRuntimeRejectionHandler, true);
      console.error = originalConsoleError; // Restore original console.error
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
  // Disable Service Worker in development to avoid CSP issues
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      });
    }
  }, []);
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
                              {/* Automatic wallet login bridge - DISABLED to prevent navigation blocking */}
                              {/* Authentication will trigger when user performs actions requiring auth */}
                              <WalletLoginBridgeWithToast autoLogin={false} />
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
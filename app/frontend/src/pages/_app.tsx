// Import Web3 polyfills first to ensure compatibility
import '@/utils/web3Polyfills';

import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { config } from '@/lib/rainbowkit';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Web3Provider } from '@/context/Web3Context';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { NavigationProvider } from '@/context/NavigationContext';
import { SellerQueryProvider } from '@/providers/SellerQueryProvider';
import { ContactProvider } from '@/contexts/ContactContext';

import { EnhancedThemeProvider } from '@/components/VisualPolish';
// Cart provider not needed - using service-based cart
import { ServiceWorkerUtil } from '@/utils/serviceWorkerUtil';
import { performanceMonitor, memoryMonitor } from '@/utils/performanceMonitor';
import { initializeExtensionErrorSuppression, debugExtensionErrors } from '@/utils/extensionErrorHandler';
import ErrorBoundary from '@/components/ErrorBoundary';
import { WalletLoginBridgeWithToast } from '@/components/Auth/WalletLoginBridgeWithToast';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import Head from 'next/head';
import '../styles/globals.css';
import '../styles/enhanced-glassmorphism.css';
import '../styles/mobile-optimizations.css';
import '../styles/design-polish.css';
import '@rainbow-me/rainbowkit/styles.css';

// Development authentication helper
if (process.env.NODE_ENV === 'development') {
  import('@/utils/devAuth');
}

const queryClient = new QueryClient();

function AppContent({ Component, pageProps, router }: AppProps) {
  const [isOnline, setIsOnline] = React.useState(true);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
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
    // Network status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Service worker registration with enhanced error handling
    if ('serviceWorker' in navigator) {
      swUtilRef.current = new ServiceWorkerUtil();
      swUtilRef.current.register()
        .then(() => console.log('Service Worker registered successfully'))
        .catch(error => console.warn('Service Worker registration failed:', error));
      
      // Check for updates
      setInterval(() => {
        swUtilRef.current?.checkForUpdates()
          .then(hasUpdate => setUpdateAvailable(hasUpdate));
      }, 60 * 60 * 1000); // Check every hour
    }

    // Initialize performance monitoring
    performanceMonitor.mark('app_init_start');
    memoryMonitor.start();

    // IMMEDIATE: Set up chrome.runtime error suppression before anything else
    const immediateErrorSuppressor = (event: any) => {
      if (event && (event.message || event.reason || event.error)) {
        const errorText = String(event.message || event.reason || event.error?.message || '').toLowerCase();
        if (errorText.includes('chrome.runtime.sendmessage') || 
            errorText.includes('opfgelmcmbiajamepnmloijbpoleiama') ||
            errorText.includes('extension id') ||
            errorText.includes('runtime.sendmessage(optional string extensionid')) {
          console.debug('🚫 IMMEDIATE: Chrome runtime error blocked');
          event.preventDefault?.();
          event.stopPropagation?.();
          event.stopImmediatePropagation?.();
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
        'opfgelmcmbiajamepnmloijbpoleiama'
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
        
        // Prevent error from propagating
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
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
        'opfgelmcmbiajamepnmloijbpoleiama'
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
        
        event.preventDefault();
        return false;
      }
    };
    
    // Add Chrome runtime specific handlers with highest priority (capture phase, first)
    window.addEventListener('error', chromeRuntimeErrorHandler, { capture: true, passive: false });
    window.addEventListener('unhandledrejection', chromeRuntimeRejectionHandler, { capture: true, passive: false });
    
    // Also override console.error temporarily to catch any console-level errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (message.toLowerCase().includes('chrome.runtime.sendmessage') || 
          message.toLowerCase().includes('opfgelmcmbiajamepnmloijbpoleiama')) {
        console.debug('🔇 Console error suppressed (chrome.runtime):', message.substring(0, 200));
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
      <Component {...pageProps} />
      <OfflineIndicator isOnline={isOnline} isBackendAvailable={isBackendAvailable} />
      
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
            <SellerQueryProvider queryClient={queryClient}>
            <RainbowKitProvider>
              <Web3Provider>
                <AuthProvider>
                  <ToastProvider>
                    {/* Automatic wallet login bridge with toast notifications */}
                    <WalletLoginBridgeWithToast />
                    <NavigationProvider>
                      <ContactProvider>
                        <EnhancedThemeProvider defaultTheme="system">
                          <AppContent Component={Component} pageProps={pageProps} router={router} />
                        </EnhancedThemeProvider>
                      </ContactProvider>
                    </NavigationProvider>
                  </ToastProvider>
                </AuthProvider>
              </Web3Provider>
            </RainbowKitProvider>
          </SellerQueryProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
    </>
  );
}

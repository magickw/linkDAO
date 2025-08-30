import React from 'react';
import type { AppProps } from 'next/app';
import { config } from '@/lib/wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Web3Provider } from '@/context/Web3Context';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { NavigationProvider } from '@/context/NavigationContext';
import { ServiceWorkerUtil } from '@/utils/serviceWorker';
import { performanceMonitor, memoryMonitor } from '@/utils/performanceMonitor';
import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function AppContent({ Component, pageProps, router }: AppProps) {
  const [isOnline, setIsOnline] = React.useState(true);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const swUtilRef = React.useRef<ServiceWorkerUtil | null>(null);

  // Initialize service worker and performance monitoring
  React.useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize performance monitoring
        performanceMonitor.mark('app_init');
        
        // Start memory monitoring in production
        if (process.env.NODE_ENV === 'production') {
          memoryMonitor.start();
        }

        // Initialize service worker
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

        await swUtilRef.current.init();

        // Monitor network status
        const networkStatus = swUtilRef.current.getNetworkStatus();
        networkStatus.addListener(setIsOnline);
        setIsOnline(networkStatus.getNetworkStatus());

        performanceMonitor.measure('app_init');
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initializeServices();

    return () => {
      if (swUtilRef.current) {
        swUtilRef.current.destroy();
      }
      memoryMonitor.stop();
    };
  }, []);

  const handleUpdateApp = async () => {
    if (swUtilRef.current) {
      const swManager = swUtilRef.current.getServiceWorkerManager();
      await swManager.skipWaiting();
      setUpdateAvailable(false);
    }
  };

  return (
    <>
      <Component {...pageProps} />
      
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
  
  if (!mounted) return null;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Web3Provider>
            <AuthProvider>
              <ToastProvider>
                <NavigationProvider>
                  <AppContent
                    Component={Component}
                    pageProps={pageProps}
                    router={router}
                  />
                </NavigationProvider>
              </ToastProvider>
            </AuthProvider>
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
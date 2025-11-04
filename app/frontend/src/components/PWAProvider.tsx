import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ServiceWorkerUtil } from '../utils/serviceWorkerUtil';
import PWAInstallPrompt from './PWAInstallPrompt';

interface PWAContextType {
  isOnline: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  isLoading: boolean;
  performanceScore: number;
  install: () => Promise<boolean>;
  updateAvailable: boolean;
  updateApp: () => void;
  cacheUpdateAvailable: boolean;
  refreshCache: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

interface PWAProviderProps {
  children: ReactNode;
  enableAutoOptimization?: boolean;
  enablePerformanceMonitoring?: boolean;
  showInstallPrompt?: boolean;
}

export function PWAProvider({
  children,
  enableAutoOptimization = true,
  enablePerformanceMonitoring = true,
  showInstallPrompt = true
}: PWAProviderProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceScore, setPerformanceScore] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [cacheUpdateAvailable, setCacheUpdateAvailable] = useState(false);
  const [swUtil, setSwUtil] = useState<ServiceWorkerUtil | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel | null>(null);

  useEffect(() => {
    initializePWA();
  }, []);

  const initializePWA = async () => {
    try {
      setIsLoading(true);

      // Initialize service worker
      const serviceWorkerUtil = new ServiceWorkerUtil({
        onUpdate: (registration) => {
          setUpdateAvailable(true);
          console.log('App update available');
        },
        onSuccess: (registration) => {
          console.log('Service worker registered successfully');
        },
        onError: (error) => {
          console.error('Service worker registration failed:', error);
        }
      });

      await serviceWorkerUtil.register();
      setSwUtil(serviceWorkerUtil);

      // Set up BroadcastChannel for cache update notifications
      setupBroadcastChannel();

      // Check installation status
      checkInstallationStatus();

      // Set up network status monitoring
      setupNetworkMonitoring();

      // Set up install prompt handling
      setupInstallPrompt();

      // Initialize performance monitoring
      if (enablePerformanceMonitoring) {
        await initializePerformanceMonitoring();
      }

      // Apply automatic optimizations
      if (enableAutoOptimization) {
        await applyOptimizations();
      }

      // Initialize CDN service
      // cdnService.init(); // TODO: Import and initialize CDN service

    } catch (error) {
      console.error('PWA initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkInstallationStatus = () => {
    // Check if app is running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isPWA = (window.navigator as any).standalone === true || isStandalone;
    setIsInstalled(isPWA);
  };

  const setupNetworkMonitoring = () => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('App is online');
      
      // Check for updates when back online
      if (swUtil) {
        swUtil.checkForUpdates();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  };

  const setupBroadcastChannel = () => {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('pwa-updates');
      setBroadcastChannel(channel);

      channel.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'CACHE_UPDATED':
            setCacheUpdateAvailable(true);
            console.log('Cache update available:', data);
            break;
          case 'CACHE_INVALIDATED':
            console.log('Cache invalidated:', data);
            break;
          case 'SW_UPDATE_AVAILABLE':
            setUpdateAvailable(true);
            console.log('Service worker update available');
            break;
          case 'CONTENT_UPDATED':
            setCacheUpdateAvailable(true);
            console.log('Content updated:', data);
            break;
        }
      });

      return () => {
        channel.close();
      };
    }
  };

  const setupInstallPrompt = () => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  };

  const initializePerformanceMonitoring = async () => {
    try {
      // Start performance monitoring
      // performanceMonitor.mark('pwa-init-start'); // TODO: Import performance monitor

      // Analyze current performance
      // const metrics = await lighthouseOptimizer.analyzePerformance(); // TODO: Import lighthouse optimizer
      // setPerformanceScore(metrics.performance || 0);
      setPerformanceScore(85); // Mock performance score

      // Monitor Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          // performanceMonitor.recordMetric(entry.name, entry.startTime, 'gauge'); // TODO: Import performance monitor
          console.log(`Performance metric: ${entry.name} - ${entry.startTime}ms`);
        });
      });

      try {
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }

      // performanceMonitor.mark('pwa-init-end'); // TODO: Import performance monitor
      // const initTime = performanceMonitor.measure('pwa-init-duration', 'pwa-init-start'); // TODO: Import performance monitor
      console.log('PWA initialization completed');

    } catch (error) {
      console.error('Performance monitoring initialization failed:', error);
    }
  };

  const applyOptimizations = async () => {
    try {
      // Apply Lighthouse optimizations
      // const result = await lighthouseOptimizer.applyOptimizations(); // TODO: Import lighthouse optimizer
      // console.log('Applied optimizations:', result.applied);
      
      // if (result.failed.length > 0) {
      //   console.warn('Failed optimizations:', result.failed);
      // }

      // Preload critical resources
      const criticalImages = [
        '/images/logo.svg',
        '/images/hero-bg.jpg',
        '/images/placeholder.jpg'
      ];

      // cdnService.preloadImages(criticalImages, { // TODO: Import CDN service
      //   width: 800,
      //   quality: 80,
      //   format: 'auto'
      // });
      
      console.log('Optimizations applied (mock)');

    } catch (error) {
      console.error('Auto-optimization failed:', error);
    }
  };

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      setDeferredPrompt(null);
      setCanInstall(false);
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Installation failed:', error);
      return false;
    }
  };

  const updateApp = async () => {
    if (swUtil) {
      // Request new service worker to take over
      window.location.reload();
    }
  };

  const refreshCache = () => {
    // Notify service worker to refresh cache
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'REFRESH_CACHE',
        timestamp: Date.now()
      });
    }
    
    // Clear cache update notification
    setCacheUpdateAvailable(false);
    
    // Reload the page to get fresh content
    window.location.reload();
  };

  const contextValue: PWAContextType = {
    isOnline,
    isInstalled,
    canInstall,
    isLoading,
    performanceScore,
    install,
    updateAvailable,
    updateApp,
    cacheUpdateAvailable,
    refreshCache
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      
      {/* PWA Install Prompt */}
      {showInstallPrompt && !isInstalled && (
        <PWAInstallPrompt
          onInstall={() => install()}
          onDismiss={() => setCanInstall(false)}
        />
      )}

      {/* Update Available Notification */}
      {updateAvailable && (
        <UpdateNotification onUpdate={updateApp} />
      )}

      {/* Cache Update Available Notification */}
      {cacheUpdateAvailable && (
        <CacheUpdateNotification onRefresh={refreshCache} />
      )}

      {/* Offline Indicator */}
      {!isOnline && <OfflineIndicator />}
    </PWAContext.Provider>
  );
}

// Update notification component
function UpdateNotification({ onUpdate }: { onUpdate: () => void }) {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">App update available</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShow(false)}
            className="text-white/80 hover:text-white text-sm"
          >
            Later
          </button>
          <button
            onClick={onUpdate}
            className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}

// Cache update notification component
function CacheUpdateNotification({ onRefresh }: { onRefresh: () => void }) {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">New content available</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShow(false)}
            className="text-white/80 hover:text-white text-sm"
          >
            Later
          </button>
          <button
            onClick={onRefresh}
            className="bg-white text-green-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

// Offline indicator component
function OfflineIndicator() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white text-center py-2 text-sm">
      <div className="flex items-center justify-center space-x-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>You're offline. Some features may be limited.</span>
      </div>
    </div>
  );
}

// Hook to use PWA context
export function usePWA() {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}

// Hook for network status
export function useNetworkStatus() {
  const { isOnline } = usePWA();
  return isOnline;
}

// Hook for installation status
export function useInstallation() {
  const { isInstalled, canInstall, install } = usePWA();
  return { isInstalled, canInstall, install };
}

// Hook for performance monitoring
export function usePerformance() {
  const { performanceScore } = usePWA();
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const updateMetrics = async () => {
      try {
        // const currentMetrics = await performanceMonitor.getMetrics(); // TODO: Import performance monitor
        const currentMetrics = { // Mock metrics
          lcp: 2.5,
          fid: 100,
          cls: 0.1
        };
        setMetrics(currentMetrics);
      } catch (error) {
        console.error('Failed to get performance metrics:', error);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    score: performanceScore,
    metrics,
    monitor: null // TODO: Import and return actual performance monitor
  };
}

export default PWAProvider;
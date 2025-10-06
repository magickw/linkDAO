import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

interface DataSavingSettings {
  enabled: boolean;
  reduceImageQuality: boolean;
  disableAutoplay: boolean;
  limitPreloading: boolean;
  compressRequests: boolean;
  cacheAggressively: boolean;
  reducedAnimations: boolean;
  lowBandwidthMode: boolean;
}

interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface DataSavingContextType {
  settings: DataSavingSettings;
  networkInfo: NetworkInfo;
  updateSetting: (key: keyof DataSavingSettings, value: boolean) => void;
  getOptimizedImageUrl: (originalUrl: string, width?: number, height?: number) => string;
  shouldPreload: (type: 'image' | 'video' | 'audio' | 'data') => boolean;
  getRequestOptions: (options?: RequestInit) => RequestInit;
  isLowBandwidth: boolean;
  estimatedDataUsage: number;
}

const DataSavingContext = createContext<DataSavingContextType | undefined>(undefined);

interface MobileDataSavingProviderProps {
  children: React.ReactNode;
  initialSettings?: Partial<DataSavingSettings>;
}

export const MobileDataSavingProvider: React.FC<MobileDataSavingProviderProps> = ({
  children,
  initialSettings = {}
}) => {
  const { isMobile } = useMobileOptimization();
  
  const [settings, setSettings] = useState<DataSavingSettings>({
    enabled: false,
    reduceImageQuality: true,
    disableAutoplay: true,
    limitPreloading: true,
    compressRequests: true,
    cacheAggressively: true,
    reducedAnimations: true,
    lowBandwidthMode: false,
    ...initialSettings
  });

  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    effectiveType: 'unknown',
    downlink: 10,
    rtt: 100,
    saveData: false
  });

  const [estimatedDataUsage, setEstimatedDataUsage] = useState(0);

  // Detect network conditions
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      if (connection) {
        setNetworkInfo({
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false
        });
      }

      // Check for Save-Data header support
      if ('connection' in navigator && 'saveData' in (navigator as any).connection) {
        const saveDataEnabled = (navigator as any).connection.saveData;
        if (saveDataEnabled && !settings.enabled) {
          setSettings(prev => ({ ...prev, enabled: true, lowBandwidthMode: true }));
        }
      }
    };

    updateNetworkInfo();

    // Listen for network changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', updateNetworkInfo);
      
      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, [settings.enabled]);

  // Auto-enable data saving on slow connections
  useEffect(() => {
    const isSlowConnection = networkInfo.effectiveType === '2g' || 
                            networkInfo.effectiveType === 'slow-2g' ||
                            networkInfo.downlink < 1;

    if (isSlowConnection && !settings.lowBandwidthMode) {
      setSettings(prev => ({
        ...prev,
        enabled: true,
        lowBandwidthMode: true,
        reduceImageQuality: true,
        disableAutoplay: true,
        limitPreloading: true
      }));
    }
  }, [networkInfo, settings.lowBandwidthMode]);

  const updateSetting = useCallback((key: keyof DataSavingSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Auto-enable data saving when any optimization is enabled
    if (value && key !== 'enabled') {
      setSettings(prev => ({ ...prev, enabled: true }));
    }
  }, []);

  const getOptimizedImageUrl = useCallback((
    originalUrl: string, 
    width?: number, 
    height?: number
  ): string => {
    if (!settings.enabled || !settings.reduceImageQuality) {
      return originalUrl;
    }

    // Apply image optimizations based on network conditions
    const quality = networkInfo.effectiveType === '2g' || networkInfo.effectiveType === 'slow-2g' ? 30 : 60;
    const format = 'webp'; // Use modern format for better compression
    
    // If using a CDN or image service, append optimization parameters
    const url = new URL(originalUrl);
    
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', quality.toString());
    url.searchParams.set('f', format);
    url.searchParams.set('auto', 'compress');
    
    return url.toString();
  }, [settings.enabled, settings.reduceImageQuality, networkInfo.effectiveType]);

  const shouldPreload = useCallback((type: 'image' | 'video' | 'audio' | 'data'): boolean => {
    if (!settings.enabled) return true;
    if (!settings.limitPreloading) return true;

    // Don't preload on slow connections
    if (networkInfo.effectiveType === '2g' || networkInfo.effectiveType === 'slow-2g') {
      return false;
    }

    // Limit preloading based on type and network conditions
    switch (type) {
      case 'image':
        return networkInfo.downlink > 2;
      case 'video':
      case 'audio':
        return networkInfo.downlink > 5 && !settings.disableAutoplay;
      case 'data':
        return networkInfo.downlink > 1;
      default:
        return true;
    }
  }, [settings.enabled, settings.limitPreloading, settings.disableAutoplay, networkInfo]);

  const getRequestOptions = useCallback((options: RequestInit = {}): RequestInit => {
    if (!settings.enabled || !settings.compressRequests) {
      return options;
    }

    const headers = new Headers(options.headers);
    
    // Add compression headers
    headers.set('Accept-Encoding', 'gzip, deflate, br');
    
    // Add Save-Data header if supported
    if (networkInfo.saveData || settings.lowBandwidthMode) {
      headers.set('Save-Data', 'on');
    }

    // Request compressed responses
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json, text/plain, */*');
    }

    return {
      ...options,
      headers
    };
  }, [settings.enabled, settings.compressRequests, settings.lowBandwidthMode, networkInfo.saveData]);

  const isLowBandwidth = networkInfo.effectiveType === '2g' || 
                        networkInfo.effectiveType === 'slow-2g' ||
                        networkInfo.downlink < 1.5;

  // Track estimated data usage
  useEffect(() => {
    const trackDataUsage = () => {
      // This is a simplified estimation
      // In a real app, you'd track actual network requests
      const baseUsage = 100; // KB per minute of usage
      const imageMultiplier = settings.reduceImageQuality ? 0.3 : 1;
      const videoMultiplier = settings.disableAutoplay ? 0.1 : 1;
      
      const estimated = baseUsage * imageMultiplier * videoMultiplier;
      setEstimatedDataUsage(estimated);
    };

    const interval = setInterval(trackDataUsage, 60000); // Update every minute
    trackDataUsage(); // Initial calculation

    return () => clearInterval(interval);
  }, [settings]);

  const contextValue: DataSavingContextType = {
    settings,
    networkInfo,
    updateSetting,
    getOptimizedImageUrl,
    shouldPreload,
    getRequestOptions,
    isLowBandwidth,
    estimatedDataUsage
  };

  return (
    <DataSavingContext.Provider value={contextValue}>
      {children}
    </DataSavingContext.Provider>
  );
};

export const useDataSaving = (): DataSavingContextType => {
  const context = useContext(DataSavingContext);
  if (!context) {
    throw new Error('useDataSaving must be used within a MobileDataSavingProvider');
  }
  return context;
};

// Data Saving Settings Component
interface DataSavingSettingsProps {
  onClose?: () => void;
  className?: string;
}

export const DataSavingSettings: React.FC<DataSavingSettingsProps> = ({
  onClose,
  className = ''
}) => {
  const { 
    settings, 
    networkInfo, 
    updateSetting, 
    isLowBandwidth, 
    estimatedDataUsage 
  } = useDataSaving();

  const settingsOptions = [
    {
      key: 'enabled' as const,
      label: 'Enable Data Saving',
      description: 'Reduce data usage across the app',
      icon: '📱'
    },
    {
      key: 'reduceImageQuality' as const,
      label: 'Reduce Image Quality',
      description: 'Load lower quality images to save data',
      icon: '🖼️'
    },
    {
      key: 'disableAutoplay' as const,
      label: 'Disable Autoplay',
      description: 'Prevent videos and GIFs from playing automatically',
      icon: '▶️'
    },
    {
      key: 'limitPreloading' as const,
      label: 'Limit Preloading',
      description: 'Reduce background loading of content',
      icon: '⬇️'
    },
    {
      key: 'compressRequests' as const,
      label: 'Compress Requests',
      description: 'Use compression for network requests',
      icon: '🗜️'
    },
    {
      key: 'cacheAggressively' as const,
      label: 'Aggressive Caching',
      description: 'Cache more content locally to reduce requests',
      icon: '💾'
    },
    {
      key: 'reducedAnimations' as const,
      label: 'Reduced Animations',
      description: 'Minimize animations to save battery and data',
      icon: '✨'
    }
  ];

  const getNetworkStatusColor = () => {
    switch (networkInfo.effectiveType) {
      case '4g': return 'text-green-600';
      case '3g': return 'text-yellow-600';
      case '2g':
      case 'slow-2g': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getNetworkStatusText = () => {
    switch (networkInfo.effectiveType) {
      case '4g': return 'Fast';
      case '3g': return 'Moderate';
      case '2g': return 'Slow';
      case 'slow-2g': return 'Very Slow';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Data Saving Settings
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close settings"
          >
            ✕
          </button>
        )}
      </div>

      {/* Network Status */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
          Network Status
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Connection: </span>
            <span className={`font-medium ${getNetworkStatusColor()}`}>
              {getNetworkStatusText()} ({networkInfo.effectiveType})
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Speed: </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {networkInfo.downlink} Mbps
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Latency: </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {networkInfo.rtt}ms
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Est. Usage: </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.round(estimatedDataUsage)}KB/min
            </span>
          </div>
        </div>
        
        {isLowBandwidth && (
          <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Slow connection detected. Consider enabling data saving features.
          </div>
        )}
      </div>

      {/* Settings Options */}
      <div className="space-y-4">
        {settingsOptions.map((option) => (
          <div key={option.key} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{option.icon}</span>
              <div>
                <label 
                  htmlFor={option.key}
                  className="font-medium text-gray-900 dark:text-white cursor-pointer"
                >
                  {option.label}
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {option.description}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id={option.key}
                type="checkbox"
                checked={settings[option.key]}
                onChange={(e) => updateSetting(option.key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-3">
          <button
            onClick={() => {
              // Enable all data saving features
              Object.keys(settings).forEach(key => {
                if (key !== 'enabled') {
                  updateSetting(key as keyof DataSavingSettings, true);
                }
              });
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Enable All
          </button>
          <button
            onClick={() => {
              // Disable all data saving features
              Object.keys(settings).forEach(key => {
                updateSetting(key as keyof DataSavingSettings, false);
              });
            }}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Disable All
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileDataSavingProvider;
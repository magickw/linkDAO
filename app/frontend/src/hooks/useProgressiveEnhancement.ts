import { useState, useEffect } from 'react';
import { progressiveEnhancement } from '../utils/progressiveEnhancement';

// Hook for React components to use progressive enhancement (simple version)
export const useProgressiveEnhancement = (featureName: string) => {
  const [status, setStatus] = useState(() => 
    progressiveEnhancement.getFeatureStatus(featureName)
  );

  useEffect(() => {
    const updateStatus = () => {
      setStatus(progressiveEnhancement.getFeatureStatus(featureName));
    };

    // Listen for online/offline events
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, [featureName]);

  return {
    ...status,
    getCachedData: (key: string) => progressiveEnhancement.getCachedData(key),
    cacheData: (key: string, data: any, ttl?: number) => 
      progressiveEnhancement.cacheData(key, data, ttl),
    getFallbackData: () => progressiveEnhancement.getFallbackData(featureName)
  };
};

// Enhanced hook for Web3 features with capabilities
export const useWeb3ProgressiveEnhancement = (options: { 
  level?: string; 
  requiredCapabilities?: string[]; 
  gracefulDegradation?: boolean 
}) => {
  const [status, setStatus] = useState(() => 
    progressiveEnhancement.getFeatureStatus('web3')
  );

  useEffect(() => {
    const updateStatus = () => {
      setStatus(progressiveEnhancement.getFeatureStatus('web3'));
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  return {
    ...status,
    capabilities: {
      wallet: true,
      transactions: true,
      ...options.requiredCapabilities?.reduce((acc, cap) => ({ ...acc, [cap]: true }), {})
    },
    featureLevel: options.level || 'basic',
    getCachedData: (key: string) => progressiveEnhancement.getCachedData(key),
    cacheData: (key: string, data: any, ttl?: number) => 
      progressiveEnhancement.cacheData(key, data, ttl),
    getFallbackData: () => progressiveEnhancement.getFallbackData('web3')
  };
};

// Hook to check if core functionality is available
export const useCoreAvailability = () => {
  const [isCoreAvailable, setIsCoreAvailable] = useState(() => 
    progressiveEnhancement.isCoreAvailable()
  );
  
  const [degradedMessage, setDegradedMessage] = useState(() => 
    progressiveEnhancement.getDegradedModeMessage()
  );

  useEffect(() => {
    const updateAvailability = () => {
      setIsCoreAvailable(progressiveEnhancement.isCoreAvailable());
      setDegradedMessage(progressiveEnhancement.getDegradedModeMessage());
    };

    window.addEventListener('online', updateAvailability);
    window.addEventListener('offline', updateAvailability);

    return () => {
      window.removeEventListener('online', updateAvailability);
      window.removeEventListener('offline', updateAvailability);
    };
  }, []);

  return {
    isCoreAvailable,
    degradedMessage,
    allStatuses: progressiveEnhancement.getAllFeatureStatuses()
  };
};

export default useProgressiveEnhancement;
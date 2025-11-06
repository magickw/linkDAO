import { useState, useEffect } from 'react';
import { apiCircuitBreaker, communityCircuitBreaker, feedCircuitBreaker, marketplaceCircuitBreaker } from '../services/circuitBreaker';

interface FeatureFlags {
  // Core features
  canCreatePosts: boolean;
  canCreateCommunities: boolean;
  canCreateProducts: boolean;
  canUpdateProfile: boolean;
  canJoinCommunities: boolean;
  
  // Enhanced features
  canUseRealTimeUpdates: boolean;
  canUseAdvancedSearch: boolean;
  canUseNotifications: boolean;
  canUseTipping: boolean;
  canUseGovernance: boolean;
  
  // UI features
  showAnimations: boolean;
  showRichContent: boolean;
  showPreviewCards: boolean;
  enableAutoRefresh: boolean;
  
  // Service status
  isApiAvailable: boolean;
  isCommunityServiceAvailable: boolean;
  isFeedServiceAvailable: boolean;
  isMarketplaceServiceAvailable: boolean;
}

interface ServiceStates {
  api: string;
  community: string;
  feed: string;
  marketplace: string;
}

/**
 * Hook to manage feature flags based on service availability
 * Automatically disables non-essential features during service outages
 */
export function useFeatureFlags(): FeatureFlags {
  const [serviceStates, setServiceStates] = useState<ServiceStates>({
    api: 'CLOSED',
    community: 'CLOSED',
    feed: 'CLOSED',
    marketplace: 'CLOSED'
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateServiceStates = () => {
      setServiceStates({
        api: apiCircuitBreaker.getState(),
        community: communityCircuitBreaker.getState(),
        feed: feedCircuitBreaker.getState(),
        marketplace: marketplaceCircuitBreaker.getState()
      });
    };

    // Initial update
    updateServiceStates();

    // Subscribe to circuit breaker changes
    const unsubscribes = [
      apiCircuitBreaker.subscribe(updateServiceStates),
      communityCircuitBreaker.subscribe(updateServiceStates),
      feedCircuitBreaker.subscribe(updateServiceStates),
      marketplaceCircuitBreaker.subscribe(updateServiceStates)
    ];

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribes.forEach(unsub => unsub());
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculate feature availability based on service states
  const isApiAvailable = isOnline && serviceStates.api === 'CLOSED';
  const isCommunityServiceAvailable = isOnline && serviceStates.community === 'CLOSED';
  const isFeedServiceAvailable = isOnline && serviceStates.feed === 'CLOSED';
  const isMarketplaceServiceAvailable = isOnline && serviceStates.marketplace === 'CLOSED';

  // Core features depend on specific services
  const canCreatePosts = isFeedServiceAvailable && isApiAvailable;
  const canCreateCommunities = isCommunityServiceAvailable && isApiAvailable;
  const canCreateProducts = isMarketplaceServiceAvailable && isApiAvailable;
  const canUpdateProfile = isApiAvailable;
  const canJoinCommunities = isCommunityServiceAvailable && isApiAvailable;

  // Enhanced features require multiple services or are non-essential
  const canUseRealTimeUpdates = isApiAvailable && (isFeedServiceAvailable || isCommunityServiceAvailable);
  const canUseAdvancedSearch = isApiAvailable;
  const canUseNotifications = isApiAvailable;
  const canUseTipping = isApiAvailable && isFeedServiceAvailable;
  const canUseGovernance = isApiAvailable && isCommunityServiceAvailable;

  // UI features can be disabled to improve performance during degradation
  const hasAnyServiceIssues = !isApiAvailable || !isCommunityServiceAvailable || !isFeedServiceAvailable || !isMarketplaceServiceAvailable;
  const showAnimations = !hasAnyServiceIssues;
  const showRichContent = isOnline && (isApiAvailable || isFeedServiceAvailable);
  const showPreviewCards = isOnline && isApiAvailable;
  const enableAutoRefresh = isOnline && !hasAnyServiceIssues;

  return {
    // Core features
    canCreatePosts,
    canCreateCommunities,
    canCreateProducts,
    canUpdateProfile,
    canJoinCommunities,
    
    // Enhanced features
    canUseRealTimeUpdates,
    canUseAdvancedSearch,
    canUseNotifications,
    canUseTipping,
    canUseGovernance,
    
    // UI features
    showAnimations,
    showRichContent,
    showPreviewCards,
    enableAutoRefresh,
    
    // Service status
    isApiAvailable,
    isCommunityServiceAvailable,
    isFeedServiceAvailable,
    isMarketplaceServiceAvailable
  };
}

/**
 * Hook to check if a specific feature is available
 */
export function useFeatureAvailability(featureName: keyof FeatureFlags): boolean {
  const flags = useFeatureFlags();
  return flags[featureName] as boolean;
}

/**
 * Hook to get degraded mode status
 */
export function useDegradedMode() {
  const flags = useFeatureFlags();
  
  const isDegraded = !flags.isApiAvailable || 
                    !flags.isCommunityServiceAvailable || 
                    !flags.isFeedServiceAvailable || 
                    !flags.isMarketplaceServiceAvailable;

  const degradedServices = [];
  if (!flags.isApiAvailable) degradedServices.push('API');
  if (!flags.isCommunityServiceAvailable) degradedServices.push('Communities');
  if (!flags.isFeedServiceAvailable) degradedServices.push('Feed');
  if (!flags.isMarketplaceServiceAvailable) degradedServices.push('Marketplace');

  const availableFeatures = {
    canBrowse: flags.showRichContent,
    canInteract: flags.canCreatePosts || flags.canJoinCommunities,
    canTrade: flags.canCreateProducts,
    hasRealTime: flags.canUseRealTimeUpdates
  };

  return {
    isDegraded,
    degradedServices,
    availableFeatures,
    recommendedActions: isDegraded ? [
      'Browse cached content',
      'Queue actions for later',
      'Check back in a few minutes'
    ] : []
  };
}

export default useFeatureFlags;
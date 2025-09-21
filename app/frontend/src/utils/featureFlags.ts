import { useState, useEffect, createContext, useContext } from 'react';

// Feature flag configuration
export interface FeatureFlags {
  // Enhanced Post Composer Features
  enableEnhancedPostComposer: boolean;
  enableContentTypeTabs: boolean;
  enableMediaUploadZone: boolean;
  enableHashtagMentionInput: boolean;
  enableDraftManagement: boolean;
  enablePollCreator: boolean;
  enableProposalCreator: boolean;

  // Token Reaction System Features
  enableTokenReactions: boolean;
  enableReactionStaking: boolean;
  enableReactionAnimations: boolean;
  enableCelebrationEffects: boolean;
  enableSocialProofIndicators: boolean;

  // Enhanced Feed Features
  enableInfiniteScroll: boolean;
  enableVirtualScrolling: boolean;
  enableFeedSorting: boolean;
  enableTrendingDetection: boolean;
  enableLikedByModal: boolean;
  enableCommunityMetrics: boolean;

  // Navigation and Sidebar Features
  enableQuickFilters: boolean;
  enableCommunityIcons: boolean;
  enableEnhancedUserCard: boolean;
  enableActivityIndicators: boolean;
  enableWalletDashboard: boolean;
  enablePortfolioModal: boolean;
  enableTrendingWidget: boolean;

  // Reputation and Badge System
  enableReputationSystem: boolean;
  enableBadgeCollection: boolean;
  enableProgressIndicators: boolean;
  enableAchievementNotifications: boolean;
  enableMiniProfileCards: boolean;

  // Real-time Features
  enableRealTimeNotifications: boolean;
  enableLiveUpdateIndicators: boolean;
  enableImmediateNotifications: boolean;
  enablePriorityNotifications: boolean;
  enableOfflineNotificationQueue: boolean;

  // Search and Discovery
  enableEnhancedSearch: boolean;
  enableRealTimeSearch: boolean;
  enableCommunityRecommendations: boolean;
  enableHashtagDiscovery: boolean;
  enableUserSearch: boolean;
  enableLearningAlgorithm: boolean;

  // Performance Optimizations
  enablePerformanceOptimizations: boolean;
  enableProgressiveLoading: boolean;
  enableOfflineCaching: boolean;
  enableIntelligentLazyLoading: boolean;
  enableContentPreloading: boolean;
  enableSeamlessSync: boolean;

  // Content Preview System
  enableContentPreviews: boolean;
  enableNFTPreviews: boolean;
  enableLinkPreviews: boolean;
  enableProposalPreviews: boolean;
  enableTokenPreviews: boolean;
  enablePreviewCaching: boolean;

  // Visual Polish and Theme
  enableVisualPolish: boolean;
  enableGlassmorphism: boolean;
  enableSmoothAnimations: boolean;
  enableThemeSystem: boolean;
  enableLoadingSkeletons: boolean;
  enableMicroAnimations: boolean;

  // Mobile Optimizations
  enableMobileOptimizations: boolean;
  enableTouchOptimizations: boolean;
  enableMobileNavigation: boolean;
  enableSwipeGestures: boolean;
  enableMobileModals: boolean;

  // Security and Validation
  enableSecurityValidation: boolean;
  enableInputSanitization: boolean;
  enableMediaValidation: boolean;
  enableLinkSecurity: boolean;
  enableWalletSecurity: boolean;
  enableAuditLogging: boolean;

  // Error Handling and Fallbacks
  enableGracefulDegradation: boolean;
  enableRetryMechanisms: boolean;
  enableOfflineSupport: boolean;
  enableErrorBoundaries: boolean;
  enableFallbackContent: boolean;

  // Analytics and Monitoring
  enableAnalytics: boolean;
  enablePerformanceMonitoring: boolean;
  enableErrorTracking: boolean;
  enableUserBehaviorTracking: boolean;
  enableFeatureUsageTracking: boolean;
}

// Default feature flag values
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Enhanced Post Composer Features
  enableEnhancedPostComposer: true,
  enableContentTypeTabs: true,
  enableMediaUploadZone: true,
  enableHashtagMentionInput: true,
  enableDraftManagement: true,
  enablePollCreator: true,
  enableProposalCreator: true,

  // Token Reaction System Features
  enableTokenReactions: true,
  enableReactionStaking: true,
  enableReactionAnimations: true,
  enableCelebrationEffects: true,
  enableSocialProofIndicators: true,

  // Enhanced Feed Features
  enableInfiniteScroll: true,
  enableVirtualScrolling: true,
  enableFeedSorting: true,
  enableTrendingDetection: true,
  enableLikedByModal: true,
  enableCommunityMetrics: true,

  // Navigation and Sidebar Features
  enableQuickFilters: true,
  enableCommunityIcons: true,
  enableEnhancedUserCard: true,
  enableActivityIndicators: true,
  enableWalletDashboard: true,
  enablePortfolioModal: true,
  enableTrendingWidget: true,

  // Reputation and Badge System
  enableReputationSystem: true,
  enableBadgeCollection: true,
  enableProgressIndicators: true,
  enableAchievementNotifications: true,
  enableMiniProfileCards: true,

  // Real-time Features
  enableRealTimeNotifications: true,
  enableLiveUpdateIndicators: true,
  enableImmediateNotifications: true,
  enablePriorityNotifications: true,
  enableOfflineNotificationQueue: true,

  // Search and Discovery
  enableEnhancedSearch: true,
  enableRealTimeSearch: true,
  enableCommunityRecommendations: true,
  enableHashtagDiscovery: true,
  enableUserSearch: true,
  enableLearningAlgorithm: false, // Experimental

  // Performance Optimizations
  enablePerformanceOptimizations: true,
  enableProgressiveLoading: true,
  enableOfflineCaching: true,
  enableIntelligentLazyLoading: true,
  enableContentPreloading: true,
  enableSeamlessSync: true,

  // Content Preview System
  enableContentPreviews: true,
  enableNFTPreviews: true,
  enableLinkPreviews: true,
  enableProposalPreviews: true,
  enableTokenPreviews: true,
  enablePreviewCaching: true,

  // Visual Polish and Theme
  enableVisualPolish: true,
  enableGlassmorphism: true,
  enableSmoothAnimations: true,
  enableThemeSystem: true,
  enableLoadingSkeletons: true,
  enableMicroAnimations: true,

  // Mobile Optimizations
  enableMobileOptimizations: true,
  enableTouchOptimizations: true,
  enableMobileNavigation: true,
  enableSwipeGestures: true,
  enableMobileModals: true,

  // Security and Validation
  enableSecurityValidation: true,
  enableInputSanitization: true,
  enableMediaValidation: true,
  enableLinkSecurity: true,
  enableWalletSecurity: true,
  enableAuditLogging: true,

  // Error Handling and Fallbacks
  enableGracefulDegradation: true,
  enableRetryMechanisms: true,
  enableOfflineSupport: true,
  enableErrorBoundaries: true,
  enableFallbackContent: true,

  // Analytics and Monitoring
  enableAnalytics: true,
  enablePerformanceMonitoring: true,
  enableErrorTracking: true,
  enableUserBehaviorTracking: false, // Privacy consideration
  enableFeatureUsageTracking: true,
};

// Feature flag context
const FeatureFlagContext = createContext<{
  flags: FeatureFlags;
  updateFlag: (key: keyof FeatureFlags, value: boolean) => void;
  isEnabled: (key: keyof FeatureFlags) => boolean;
  getVariant: (key: string) => string;
}>({
  flags: DEFAULT_FEATURE_FLAGS,
  updateFlag: () => {},
  isEnabled: () => false,
  getVariant: () => 'control',
});

// Feature flag provider
export const FeatureFlagProvider: React.FC<{
  children: React.ReactNode;
  initialFlags?: Partial<FeatureFlags>;
  userId?: string;
}> = ({ children, initialFlags = {}, userId }) => {
  const [flags, setFlags] = useState<FeatureFlags>({
    ...DEFAULT_FEATURE_FLAGS,
    ...initialFlags,
  });

  // Load feature flags from remote config
  useEffect(() => {
    const loadRemoteFlags = async () => {
      try {
        const response = await fetch('/api/feature-flags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        if (response.ok) {
          const remoteFlags = await response.json();
          setFlags(prevFlags => ({
            ...prevFlags,
            ...remoteFlags,
          }));
        }
      } catch (error) {
        console.warn('Failed to load remote feature flags:', error);
      }
    };

    loadRemoteFlags();
  }, [userId]);

  // Update individual flag
  const updateFlag = (key: keyof FeatureFlags, value: boolean) => {
    setFlags(prevFlags => ({
      ...prevFlags,
      [key]: value,
    }));

    // Persist to localStorage
    try {
      const storedFlags = JSON.parse(localStorage.getItem('featureFlags') || '{}');
      storedFlags[key] = value;
      localStorage.setItem('featureFlags', JSON.stringify(storedFlags));
    } catch (error) {
      console.warn('Failed to persist feature flag:', error);
    }
  };

  // Check if feature is enabled
  const isEnabled = (key: keyof FeatureFlags): boolean => {
    return flags[key] === true;
  };

  // Get A/B test variant
  const getVariant = (key: string): string => {
    if (!userId) return 'control';

    // Simple hash-based variant assignment
    const hash = userId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    const variants = ['control', 'variant_a', 'variant_b'];
    return variants[hash % variants.length];
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, updateFlag, isEnabled, getVariant }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

// Hook to use feature flags
export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
};

// Hook for individual feature flag
export const useFeatureFlag = (key: keyof FeatureFlags) => {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
};

// Hook for A/B testing
export const useABTest = (testName: string) => {
  const { getVariant } = useFeatureFlags();
  return getVariant(testName);
};

// Feature flag component wrapper
export const FeatureFlag: React.FC<{
  flag: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ flag, children, fallback = null }) => {
  const isEnabled = useFeatureFlag(flag);
  return isEnabled ? <>{children}</> : <>{fallback}</>;
};

// A/B test component wrapper
export const ABTest: React.FC<{
  testName: string;
  variants: Record<string, React.ReactNode>;
  fallback?: React.ReactNode;
}> = ({ testName, variants, fallback = null }) => {
  const variant = useABTest(testName);
  return <>{variants[variant] || fallback}</>;
};

// Gradual rollout configuration
export interface RolloutConfig {
  percentage: number; // 0-100
  userSegments?: string[];
  geoTargeting?: string[];
  deviceTypes?: string[];
  startDate?: Date;
  endDate?: Date;
}

// Gradual rollout hook
export const useGradualRollout = (
  featureKey: string,
  config: RolloutConfig,
  userId?: string
): boolean => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkRollout = () => {
      // Check date range
      const now = new Date();
      if (config.startDate && now < config.startDate) return false;
      if (config.endDate && now > config.endDate) return false;

      // Check percentage rollout
      if (!userId) return false;
      
      const hash = userId.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
      }, 0);
      
      const userPercentile = (hash % 100) + 1;
      if (userPercentile > config.percentage) return false;

      // Additional checks can be added here for user segments, geo, device types

      return true;
    };

    setIsEnabled(checkRollout());
  }, [featureKey, config, userId]);

  return isEnabled;
};

// Feature flag analytics
export const trackFeatureUsage = (featureKey: keyof FeatureFlags, action: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'feature_usage', {
      feature_name: featureKey,
      action: action,
      timestamp: new Date().toISOString(),
    });
  }
};

// Performance impact tracking
export const trackFeaturePerformance = (
  featureKey: keyof FeatureFlags,
  startTime: number,
  endTime: number
) => {
  const duration = endTime - startTime;
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'feature_performance', {
      feature_name: featureKey,
      duration: duration,
      timestamp: new Date().toISOString(),
    });
  }
};

export default FeatureFlagProvider;
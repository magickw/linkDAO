import { lazy } from 'react';
import { LoadingSkeleton } from '@/design-system/components/LoadingSkeleton';

// Dynamic imports for code splitting
export const DynamicComponents = {
  // Enhanced Post Composer Components
  EnhancedPostComposer: lazy(() => import('@/components/EnhancedPostComposer/EnhancedPostComposer')),
  ContentTypeTabs: lazy(() => import('@/components/EnhancedPostComposer/ContentTypeTabs')),
  MediaUploadZone: lazy(() => import('@/components/EnhancedPostComposer/MediaUploadZone')),
  PollCreator: lazy(() => import('@/components/EnhancedPostComposer/PollCreator')),
  ProposalCreator: lazy(() => import('@/components/EnhancedPostComposer/ProposalCreator')),

  // Token Reaction System Components
  TokenReactionSystem: lazy(() => import('@/components/TokenReactionSystem/TokenReactionSystem')),
  ReactionButton: lazy(() => import('@/components/TokenReactionSystem/ReactionButton')),
  ReactorModal: lazy(() => import('@/components/TokenReactionSystem/ReactorModal')),
  CelebrationAnimation: lazy(() => import('@/components/TokenReactionSystem/CelebrationAnimation')),

  // Enhanced Feed Components
  EnhancedFeedView: lazy(() => import('@/components/Feed/EnhancedFeedView')),
  InfiniteScrollFeed: lazy(() => import('@/components/Feed/InfiniteScrollFeed')),
  FeedSortingTabs: lazy(() => import('@/components/Feed/FeedSortingTabs')),
  TrendingContentDetector: lazy(() => import('@/components/Feed/TrendingContentDetector')),

  // Navigation Components
  AdvancedNavigationSidebar: lazy(() => import('@/components/Navigation/AdvancedNavigationSidebar')),
  QuickFilterPanel: lazy(() => import('@/components/Navigation/QuickFilterPanel')),
  CommunityIconList: lazy(() => import('@/components/Navigation/CommunityIconList')),
  EnhancedUserCard: lazy(() => import('@/components/Navigation/EnhancedUserCard')),

  // Smart Right Sidebar Components
  SmartRightSidebar: lazy(() => import('@/components/SmartRightSidebar/SmartRightSidebar')),
  WalletDashboard: lazy(() => import('@/components/SmartRightSidebar/WalletDashboard')),
  PortfolioModal: lazy(() => import('@/components/SmartRightSidebar/PortfolioModal')),
  TrendingContentWidget: lazy(() => import('@/components/SmartRightSidebar/TrendingContentWidget')),

  // Reputation System Components
  BadgeCollection: lazy(() => import('@/components/Reputation/BadgeCollection')),
  ProgressIndicator: lazy(() => import('@/components/Reputation/ProgressIndicator')),
  MiniProfileCard: lazy(() => import('@/components/Reputation/MiniProfileCard')),
  AchievementNotification: lazy(() => import('@/components/Reputation/AchievementNotification')),

  // Real-time Notification Components
  RealTimeNotificationSystem: lazy(() => import('@/components/RealTimeNotifications/RealTimeNotificationSystem')),
  NotificationCategorization: lazy(() => import('@/components/RealTimeNotifications/NotificationCategorization')),
  LiveUpdateIndicators: lazy(() => import('@/components/RealTimeNotifications/LiveUpdateIndicators')),
  PriorityNotifications: lazy(() => import('@/components/RealTimeNotifications/PriorityNotifications')),

  // Enhanced Search Components
  EnhancedSearchInterface: lazy(() => import('@/components/EnhancedSearch/EnhancedSearchInterface')),
  SearchResultsView: lazy(() => import('@/components/EnhancedSearch/SearchResultsView')),
  DiscoveryDashboard: lazy(() => import('@/components/EnhancedSearch/DiscoveryDashboard')),
  TrendingSection: lazy(() => import('@/components/EnhancedSearch/TrendingSection')),

  // Performance Components
  VirtualScrollManager: lazy(() => import('@/components/Performance/VirtualScrollManager')),
  ProgressiveLoader: lazy(() => import('@/components/Performance/ProgressiveLoader')),
  OfflineCacheManager: lazy(() => import('@/components/Performance/OfflineCacheManager')),
  IntelligentLazyLoader: lazy(() => import('@/components/Performance/IntelligentLazyLoader')),

  // Content Preview Components
  InlinePreviewRenderer: lazy(() => import('@/components/InlinePreviews/InlinePreviewRenderer')),
  NFTPreview: lazy(() => import('@/components/InlinePreviews/NFTPreview')),
  LinkPreview: lazy(() => import('@/components/InlinePreviews/LinkPreview')),
  ProposalPreview: lazy(() => import('@/components/InlinePreviews/ProposalPreview')),

  // Mobile Components
  MobileEnhancedPostComposer: lazy(() => import('@/components/Mobile/MobileEnhancedPostComposer')),
  MobileNavigationSidebar: lazy(() => import('@/components/Mobile/MobileNavigationSidebar')),
  MobileEnhancedFeed: lazy(() => import('@/components/Mobile/MobileEnhancedFeed')),
  MobileFloatingActionButton: lazy(() => import('@/components/Mobile/MobileFloatingActionButton')),

  // Visual Polish Components
  VisualPolishIntegration: lazy(() => import('@/components/VisualPolish/VisualPolishIntegration')),
  GlassmorphismCard: lazy(() => import('@/components/VisualPolish/GlassmorphismCard')),
  SmoothAnimations: lazy(() => import('@/components/VisualPolish/SmoothAnimations')),
  EnhancedThemeSystem: lazy(() => import('@/components/VisualPolish/EnhancedThemeSystem')),
};

// Route-based code splitting
export const DynamicPages = {
  Dashboard: lazy(() => import('@/pages/dashboard')),
  Profile: lazy(() => import('@/pages/profile')),
  Communities: lazy(() => import('@/pages/communities')),
  Governance: lazy(() => import('@/pages/governance')),
  Marketplace: lazy(() => import('@/pages/marketplace')),
  Analytics: lazy(() => import('@/pages/analytics')),
  Search: lazy(() => import('@/pages/search')),
  Recommendations: lazy(() => import('@/pages/recommendations')),
};

// Feature-based code splitting
export const DynamicFeatures = {
  // Advanced features that can be loaded on demand
  AdvancedAnalytics: lazy(() => import('@/components/Analytics/AnalyticsDashboard')),
  ProjectManagement: lazy(() => import('@/components/Marketplace/ProjectManagement')),
  DigitalAssetManager: lazy(() => import('@/components/DigitalAssetManager')),
  TrustLayer: lazy(() => import('@/components/Trust/TrustLayer')),
  SecurityProvider: lazy(() => import('@/components/Security/SecurityProvider')),
};

// Utility function to create suspense wrapper with loading skeleton
export const withSuspense = <T extends React.ComponentType<any>>(
  Component: T,
  fallback?: React.ComponentType
) => {
  const SuspenseWrapper = (props: React.ComponentProps<T>) => {
    const FallbackComponent = fallback || LoadingSkeleton;
    
    return (
      <React.Suspense fallback={<FallbackComponent />}>
        <Component {...props} />
      </React.Suspense>
    );
  };

  SuspenseWrapper.displayName = `withSuspense(${Component.displayName || Component.name})`;
  return SuspenseWrapper;
};

// Preload function for critical components
export const preloadComponent = (componentName: keyof typeof DynamicComponents) => {
  const component = DynamicComponents[componentName];
  if (component && typeof component === 'function') {
    // Trigger the dynamic import
    component();
  }
};

// Preload critical components on app initialization
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used immediately
  preloadComponent('EnhancedPostComposer');
  preloadComponent('EnhancedFeedView');
  preloadComponent('AdvancedNavigationSidebar');
  preloadComponent('SmartRightSidebar');
};

// Bundle size monitoring
export const getBundleInfo = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const jsResources = resources.filter(resource => 
      resource.name.includes('.js') && !resource.name.includes('node_modules')
    );
    
    const totalJSSize = jsResources.reduce((total, resource) => {
      return total + (resource.transferSize || 0);
    }, 0);
    
    return {
      totalJSSize: Math.round(totalJSSize / 1024), // KB
      jsResourceCount: jsResources.length,
      loadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
      domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
    };
  }
  
  return null;
};

export default DynamicComponents;
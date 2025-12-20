import React, { lazy, Suspense } from 'react';
import { LoadingSkeleton } from '@/design-system/components/LoadingSkeleton';

// Dynamic imports for code splitting
// Note: Temporarily using type assertions to handle mixed export patterns
export const DynamicComponents = {
  // Enhanced Post Composer Components
  EnhancedPostComposer: lazy(() => import('@/components/EnhancedPostComposer/EnhancedPostComposer') as any),
  ContentTypeTabs: lazy(() => import('@/components/EnhancedPostComposer/ContentTypeTabs').then(module => ({ default: module.ContentTypeTabs })) as any),
  MediaUploadZone: lazy(() => import('@/components/EnhancedPostComposer/MediaUploadZone').then(module => ({ default: module.MediaUploadZone })) as any),
  PollCreator: lazy(() => import('@/components/EnhancedPostComposer/PollCreator').then(module => ({ default: module.PollCreator })) as any),
  ProposalCreator: lazy(() => import('@/components/EnhancedPostComposer/ProposalCreator').then(module => ({ default: module.ProposalCreator })) as any),

  // Token Reaction System Components
  TokenReactionSystem: lazy(() => import('@/components/TokenReactionSystem/TokenReactionSystem') as any),
  ReactionButton: lazy(() => import('@/components/TokenReactionSystem/ReactionButton') as any),
  ReactorModal: lazy(() => import('@/components/TokenReactionSystem/ReactorModal') as any),
  CelebrationAnimation: lazy(() => import('@/components/TokenReactionSystem/CelebrationAnimation') as any),

  // Enhanced Feed Components
  EnhancedFeedView: lazy(() => import('@/components/Feed/EnhancedFeedView') as any),
  InfiniteScrollFeed: lazy(() => import('@/components/Feed/InfiniteScrollFeed') as any),
  FeedSortingTabs: lazy(() => import('@/components/Feed/FeedSortingTabs') as any),
  TrendingContentDetector: lazy(() => import('@/components/Feed/TrendingContentDetector') as any),

  // Navigation Components
  AdvancedNavigationSidebar: lazy(() => import('@/components/Navigation/AdvancedNavigationSidebar') as any),
  QuickFilterPanel: lazy(() => import('@/components/Navigation/QuickFilterPanel') as any),
  CommunityIconList: lazy(() => import('@/components/Navigation/CommunityIconList') as any),
  EnhancedUserCard: lazy(() => import('@/components/Navigation/EnhancedUserCard') as any),

  // Smart Right Sidebar Components
  SmartRightSidebar: lazy(() => import('@/components/SmartRightSidebar/SmartRightSidebar') as any),
  QuickActions: lazy(() => import('@/components/SmartRightSidebar/QuickActions') as any),
  PortfolioModal: lazy(() => import('@/components/SmartRightSidebar/PortfolioModal') as any),
  TrendingContentWidget: lazy(() => import('@/components/SmartRightSidebar/TrendingContentWidget') as any),

  // Reputation System Components
  BadgeCollection: lazy(() => import('@/components/Reputation/BadgeCollection') as any),
  ProgressIndicator: lazy(() => import('@/components/Reputation/ProgressIndicator') as any),
  MiniProfileCard: lazy(() => import('@/components/Reputation/MiniProfileCard') as any),
  AchievementNotification: lazy(() => import('@/components/Reputation/AchievementNotification') as any),

  // Real-time Notification Components
  RealTimeNotificationSystem: lazy(() => import('@/components/RealTimeNotifications/RealTimeNotificationSystem') as any),
  NotificationCategorization: lazy(() => import('@/components/RealTimeNotifications/NotificationCategorization') as any),
  LiveUpdateIndicators: lazy(() => import('@/components/RealTimeNotifications/LiveUpdateIndicators') as any),
  PriorityNotifications: lazy(() => import('@/components/RealTimeNotifications/PriorityNotifications') as any),

  // Enhanced Search Components
  EnhancedSearchInterface: lazy(() => import('@/components/EnhancedSearch/EnhancedSearchInterface') as any),
  SearchResultsView: lazy(() => import('@/components/EnhancedSearch/SearchResultsView') as any),
  DiscoveryDashboard: lazy(() => import('@/components/EnhancedSearch/DiscoveryDashboard') as any),
  TrendingSection: lazy(() => import('@/components/EnhancedSearch/TrendingSection') as any),

  // Performance Components
  VirtualScrollManager: lazy(() => import('@/components/Performance/VirtualScrollManager') as any),
  ProgressiveLoader: lazy(() => import('@/components/Performance/ProgressiveLoader') as any),
  OfflineCacheManager: lazy(() => import('@/components/Performance/OfflineCacheManager') as any),
  IntelligentLazyLoader: lazy(() => import('@/components/Performance/IntelligentLazyLoader') as any),

  // Content Preview Components
  InlinePreviewRenderer: lazy(() => import('@/components/InlinePreviews/InlinePreviewRenderer') as any),
  NFTPreview: lazy(() => import('@/components/InlinePreviews/NFTPreview') as any),
  LinkPreview: lazy(() => import('@/components/InlinePreviews/LinkPreview') as any),
  ProposalPreview: lazy(() => import('@/components/InlinePreviews/ProposalPreview') as any),

  // Mobile Components
  MobileEnhancedPostComposer: lazy(() => import('@/components/Mobile/MobileEnhancedPostComposer') as any),
  MobileNavigationSidebar: lazy(() => import('@/components/Mobile/MobileNavigationSidebar') as any),
  MobileEnhancedFeed: lazy(() => import('@/components/Mobile/MobileEnhancedFeed') as any),
  MobileFloatingActionButton: lazy(() => import('@/components/Mobile/MobileFloatingActionButton') as any),

  // Visual Polish Components
  VisualPolishIntegration: lazy(() => import('@/components/VisualPolish/VisualPolishIntegration') as any),
  GlassmorphismCard: lazy(() => import('@/components/VisualPolish/GlassmorphismCard') as any),
  SmoothAnimations: lazy(() => import('@/components/VisualPolish/SmoothAnimations') as any),
  EnhancedThemeSystem: lazy(() => import('@/components/VisualPolish/EnhancedThemeSystem') as any),
};

// Route-based code splitting
export const DynamicPages = {
  Profile: lazy(() => import('@/pages/profile') as any),
  Communities: lazy(() => import('@/pages/communities') as any),
  Governance: lazy(() => import('@/pages/governance') as any),
  Marketplace: lazy(() => import('@/pages/marketplace') as any),
  Analytics: lazy(() => import('@/pages/analytics') as any),
  Search: lazy(() => import('@/pages/search') as any),
  Recommendations: lazy(() => import('@/pages/recommendations') as any),
};

// Feature-based code splitting
export const DynamicFeatures = {
  // Advanced features that can be loaded on demand
  AdvancedAnalytics: lazy(() => import('@/components/Analytics/AnalyticsDashboard') as any),
  ProjectManagement: lazy(() => import('@/components/Marketplace/ProjectManagement') as any),
  DigitalAssetManager: lazy(() => import('@/components/DigitalAssetManager') as any),
  TrustLayer: lazy(() => import('@/components/Trust/TrustLayer') as any),
  SecurityProvider: lazy(() => import('@/components/Security/SecurityProvider') as any),
};

// Utility function to create suspense wrapper with loading skeleton
// Note: Moved to separate .tsx file to avoid JSX in .ts file
export const withSuspense = <T extends React.ComponentType<any>>(
  Component: T,
  fallback?: React.ComponentType
) => {
  // This would need to be implemented in a .tsx file
  return Component;
};

// Preload function for critical components
export const preloadComponent = (componentName: keyof typeof DynamicComponents) => {
  const component = DynamicComponents[componentName];
  // Use optional chaining to safely access preload method
  (component as any)?.preload?.();
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
/**
 * Community Components Index
 * Exports all community-related components
 */

export { default as ModerationDashboard } from './ModerationDashboard';
export { default as GovernanceSystem } from './GovernanceSystem';
export { default as CommunityPerformanceOptimizer } from './CommunityPerformanceOptimizer';
export { default as CommunityStatsWidget } from './CommunityStatsWidget';
export { default as AboutCommunityWidget } from './AboutCommunityWidget';
export { default as CommunityJoinButton } from './CommunityJoinButton';
export { default as CommunityPostCreator } from './CommunityPostCreator';
export { default as CommunityModerationDashboard } from './CommunityModerationDashboard';

// Enhanced Community Components
export { default as CommunityCardEnhanced } from './CommunityCardEnhanced';
export { default as CommunityPostCardEnhanced } from './CommunityPostCardEnhanced';

// Enhanced Feed Components
export { default as VirtualFeedEnhanced } from '../Feed/VirtualFeedEnhanced';

// Legacy Components (for backward compatibility)
// export { default as CommunityCard } from './CommunityCard';  // Removed as part of enhancement
// export { default as CommunityPostCard } from '../CommunityPostCard';  // Removed as part of enhancement
export { default as CommunityLoadingSkeletons } from './CommunityLoadingSkeletons';

// Export individual skeleton components
export { CommunityCardSkeleton, CommunityFeedSkeleton } from './CommunityLoadingSkeletons';

// Re-export services
export { communityCacheService } from '../../services/communityCacheService';
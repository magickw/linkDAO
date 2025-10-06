/**
 * Community Components Index
 * Exports all community-related components
 */

export { default as CommunityPage } from './CommunityPage';
export { default as CommunityHeader } from './CommunityHeader';
export { default as CommunityPostList } from './CommunityPostList';
export { default as CommunitySidebar } from './CommunitySidebar';
export { default as CommunityRules } from './CommunityRules';
export { default as CommunityMembers } from './CommunityMembers';
export { default as CommunityDiscovery } from './CommunityDiscovery';
export { default as CommunityCard } from './CommunityCard';
export { default as ModerationDashboard } from './ModerationDashboard';
export { default as GovernanceSystem } from './GovernanceSystem';
export { default as CommunityPerformanceOptimizer } from './CommunityPerformanceOptimizer';

// Re-export services
export { communityCacheService } from '../../services/communityCacheService';

// Re-export types
export type {
  CommunityPageProps,
  CommunityHeaderProps,
  CommunityPostListProps,
  CommunitySidebarProps,
  CommunityRulesProps,
  CommunityMembersProps
} from './types';
/**
 * Community Enhancements - Shared Components
 * Export all shared components and utilities
 */

// Core Components
export { default as MiniProfileCard } from './MiniProfileCard';
export { default as LoadingSkeletons } from './LoadingSkeletons';
export { default as PreviewModal } from './PreviewModal';

// Animation System
export { 
  AnimationProvider, 
  useAnimation, 
  withAnimation 
} from './AnimationProvider';

// Micro Interactions
export { 
  MicroInteractionLayer,
  TipAnimation,
  VoteAnimation,
} from './MicroInteractionLayer';

// Individual Skeleton Components
export {
  Skeleton,
  CommunityIconSkeleton,
  PostCardSkeleton,
  SidebarWidgetSkeleton,
  GovernanceProposalSkeleton,
  FilterBarSkeleton,
  ActivityFeedItemSkeleton,
  CommunityListSkeleton,
  PostFeedSkeleton,
  GovernanceWidgetSkeleton,
  ActivityFeedSkeleton,
} from './LoadingSkeletons';

// Types
export type { 
  MiniProfileCardProps,
  UserProfile,
  AnimationConfig,
} from '../../../types/communityEnhancements';
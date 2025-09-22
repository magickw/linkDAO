/**
 * Loading Skeletons
 * Skeleton loading components that match final content layouts
 */

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

// Base Skeleton Component
export const Skeleton: React.FC<SkeletonProps & React.HTMLAttributes<HTMLDivElement>> = ({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--ce-radius-sm)',
  className = '',
  ...props
}) => (
  <div 
    className={`ce-skeleton ${className}`}
    style={{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      borderRadius,
    }}
    {...props}
  />
);

// Community Icon Skeleton
export const CommunityIconSkeleton: React.FC = () => (
  <div className="ce-community-icon-skeleton">
    <Skeleton width={40} height={40} borderRadius="var(--ce-radius-full)" />
    <div className="ce-community-text-skeleton">
      <Skeleton width="80%" height="0.875rem" />
      <Skeleton width="60%" height="0.75rem" />
    </div>
    
    <style jsx>{`
      .ce-community-icon-skeleton {
        display: flex;
        align-items: center;
        gap: var(--ce-space-sm);
        padding: var(--ce-space-sm);
      }
      
      .ce-community-text-skeleton {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--ce-space-xs);
      }
    `}</style>
  </div>
);

// Post Card Skeleton
export const PostCardSkeleton: React.FC = () => (
  <div className="ce-post-card-skeleton">
    <div className="ce-post-header-skeleton">
      <Skeleton width={32} height={32} borderRadius="var(--ce-radius-full)" />
      <div className="ce-post-meta-skeleton">
        <Skeleton width="120px" height="0.875rem" />
        <Skeleton width="80px" height="0.75rem" />
      </div>
    </div>
    
    <div className="ce-post-content-skeleton">
      <Skeleton width="100%" height="1.25rem" />
      <Skeleton width="90%" height="1rem" />
      <Skeleton width="95%" height="1rem" />
    </div>
    
    <div className="ce-post-preview-skeleton">
      <Skeleton width="100%" height="200px" borderRadius="var(--ce-radius-md)" />
    </div>
    
    <div className="ce-post-actions-skeleton">
      <Skeleton width="60px" height="32px" borderRadius="var(--ce-radius-md)" />
      <Skeleton width="60px" height="32px" borderRadius="var(--ce-radius-md)" />
      <Skeleton width="60px" height="32px" borderRadius="var(--ce-radius-md)" />
    </div>
    
    <style jsx>{`
      .ce-post-card-skeleton {
        padding: var(--ce-space-lg);
        background: var(--ce-bg-secondary);
        border: 1px solid var(--ce-border-light);
        border-radius: var(--ce-radius-lg);
        margin-bottom: var(--ce-space-md);
      }
      
      .ce-post-header-skeleton {
        display: flex;
        align-items: center;
        gap: var(--ce-space-sm);
        margin-bottom: var(--ce-space-md);
      }
      
      .ce-post-meta-skeleton {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--ce-space-xs);
      }
      
      .ce-post-content-skeleton {
        margin-bottom: var(--ce-space-md);
        display: flex;
        flex-direction: column;
        gap: var(--ce-space-sm);
      }
      
      .ce-post-preview-skeleton {
        margin-bottom: var(--ce-space-md);
      }
      
      .ce-post-actions-skeleton {
        display: flex;
        gap: var(--ce-space-sm);
      }
    `}</style>
  </div>
);

// Sidebar Widget Skeleton
export const SidebarWidgetSkeleton: React.FC<{ title?: boolean }> = ({ title = true }) => (
  <div className="ce-sidebar-widget-skeleton">
    {title && (
      <div className="ce-widget-header-skeleton">
        <Skeleton width="70%" height="1.125rem" />
      </div>
    )}
    
    <div className="ce-widget-content-skeleton">
      <Skeleton width="100%" height="1rem" />
      <Skeleton width="85%" height="1rem" />
      <Skeleton width="92%" height="1rem" />
    </div>
    
    <style jsx>{`
      .ce-sidebar-widget-skeleton {
        padding: var(--ce-space-lg);
        background: var(--ce-bg-secondary);
        border: 1px solid var(--ce-border-light);
        border-radius: var(--ce-radius-lg);
        margin-bottom: var(--ce-space-md);
      }
      
      .ce-widget-header-skeleton {
        margin-bottom: var(--ce-space-md);
        padding-bottom: var(--ce-space-sm);
        border-bottom: 1px solid var(--ce-border-light);
      }
      
      .ce-widget-content-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--ce-space-sm);
      }
    `}</style>
  </div>
);

// Governance Proposal Skeleton
export const GovernanceProposalSkeleton: React.FC = () => (
  <div className="ce-governance-proposal-skeleton">
    <div className="ce-proposal-header-skeleton">
      <Skeleton width="90%" height="1rem" />
      <Skeleton width="60px" height="20px" borderRadius="var(--ce-radius-full)" />
    </div>
    
    <div className="ce-proposal-progress-skeleton">
      <Skeleton width="100%" height="8px" borderRadius="var(--ce-radius-full)" />
      <div className="ce-proposal-stats-skeleton">
        <Skeleton width="40px" height="0.75rem" />
        <Skeleton width="50px" height="0.75rem" />
      </div>
    </div>
    
    <style jsx>{`
      .ce-governance-proposal-skeleton {
        padding: var(--ce-space-md);
        background: var(--ce-bg-tertiary);
        border-radius: var(--ce-radius-md);
        margin-bottom: var(--ce-space-sm);
      }
      
      .ce-proposal-header-skeleton {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--ce-space-sm);
      }
      
      .ce-proposal-progress-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--ce-space-xs);
      }
      
      .ce-proposal-stats-skeleton {
        display: flex;
        justify-content: space-between;
      }
    `}</style>
  </div>
);

// Filter Bar Skeleton
export const FilterBarSkeleton: React.FC = () => (
  <div className="ce-filter-bar-skeleton">
    <div className="ce-filter-tabs-skeleton">
      <Skeleton width="60px" height="32px" borderRadius="var(--ce-radius-md)" />
      <Skeleton width="50px" height="32px" borderRadius="var(--ce-radius-md)" />
      <Skeleton width="55px" height="32px" borderRadius="var(--ce-radius-md)" />
      <Skeleton width="65px" height="32px" borderRadius="var(--ce-radius-md)" />
    </div>
    
    <div className="ce-filter-actions-skeleton">
      <Skeleton width="80px" height="32px" borderRadius="var(--ce-radius-md)" />
    </div>
    
    <style jsx>{`
      .ce-filter-bar-skeleton {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--ce-space-md);
        background: var(--ce-bg-secondary);
        border: 1px solid var(--ce-border-light);
        border-radius: var(--ce-radius-lg);
        margin-bottom: var(--ce-space-md);
      }
      
      .ce-filter-tabs-skeleton {
        display: flex;
        gap: var(--ce-space-sm);
      }
      
      .ce-filter-actions-skeleton {
        display: flex;
        gap: var(--ce-space-sm);
      }
    `}</style>
  </div>
);

// Activity Feed Item Skeleton
export const ActivityFeedItemSkeleton: React.FC = () => (
  <div className="ce-activity-item-skeleton">
    <Skeleton width={24} height={24} borderRadius="var(--ce-radius-full)" />
    <div className="ce-activity-content-skeleton">
      <Skeleton width="100%" height="0.875rem" />
      <Skeleton width="70%" height="0.75rem" />
    </div>
    
    <style jsx>{`
      .ce-activity-item-skeleton {
        display: flex;
        align-items: flex-start;
        gap: var(--ce-space-sm);
        padding: var(--ce-space-sm);
        border-bottom: 1px solid var(--ce-border-light);
      }
      
      .ce-activity-item-skeleton:last-child {
        border-bottom: none;
      }
      
      .ce-activity-content-skeleton {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--ce-space-xs);
      }
    `}</style>
  </div>
);

// Composite Loading States
export const CommunityListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="ce-community-list-skeleton">
    {Array.from({ length: count }, (_, i) => (
      <CommunityIconSkeleton key={i} />
    ))}
  </div>
);

export const PostFeedSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="ce-post-feed-skeleton">
    <FilterBarSkeleton />
    {Array.from({ length: count }, (_, i) => (
      <PostCardSkeleton key={i} />
    ))}
  </div>
);

export const GovernanceWidgetSkeleton: React.FC<{ proposalCount?: number }> = ({ proposalCount = 3 }) => (
  <div className="ce-governance-widget-skeleton">
    <SidebarWidgetSkeleton title={true} />
    {Array.from({ length: proposalCount }, (_, i) => (
      <GovernanceProposalSkeleton key={i} />
    ))}
  </div>
);

export const ActivityFeedSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="ce-activity-feed-skeleton">
    <SidebarWidgetSkeleton title={true} />
    {Array.from({ length: count }, (_, i) => (
      <ActivityFeedItemSkeleton key={i} />
    ))}
  </div>
);

// Main LoadingSkeletons component that exports all skeletons
const LoadingSkeletons = {
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
};

export default LoadingSkeletons;
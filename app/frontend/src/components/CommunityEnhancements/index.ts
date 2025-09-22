/**
 * Community Page Enhancements - Main Export File
 * Exports all enhanced community components and utilities
 */

// Main Enhanced Community Page Component
export { default as CommunityPageEnhanced } from './CommunityPageEnhanced';

// Enhanced Left Sidebar Components (placeholders for future implementation)
export * from './EnhancedLeftSidebar';

// Enhanced Central Feed Components (placeholders for future implementation)
export * from './EnhancedCentralFeed';

// Enhanced Right Sidebar Components (placeholders for future implementation)
// export * from './EnhancedRightSidebar';

// Shared Components
export * from './SharedComponents';

// Error Boundaries
export * from './ErrorBoundaries';

// Types
export * from '../../types/communityEnhancements';

// Re-export commonly used components for convenience
export { default as MiniProfileCard } from './SharedComponents/MiniProfileCard';
export { default as LoadingSkeletons } from './SharedComponents/LoadingSkeletons';
export { default as AnimationProvider, useAnimation, withAnimation } from './SharedComponents/AnimationProvider';
export { default as PreviewModal } from './SharedComponents/PreviewModal';
export { default as CommunityEnhancementErrorBoundary } from './ErrorBoundaries/CommunityEnhancementErrorBoundary';
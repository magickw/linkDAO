// Core error handling
export { ErrorManager, errorManager } from '../../utils/errorHandling/ErrorManager';
export { ErrorCategory, ErrorSeverity } from '../../utils/errorHandling/ErrorManager';
export type { ErrorContext, RetryConfig } from '../../utils/errorHandling/ErrorManager';

// Error boundaries
export {
  ErrorBoundary,
  ContentCreationErrorBoundary,
  WalletErrorBoundary,
  FeedErrorBoundary,
  NavigationErrorBoundary,
  ReputationErrorBoundary,
  TokenReactionErrorBoundary,
  PerformanceErrorBoundary
} from './ErrorBoundary';

// Marketplace-specific error handling
export { MarketplaceErrorBoundary } from './MarketplaceErrorBoundary';
export {
  ProductNotFoundFallback,
  SellerNotFoundFallback,
  ServerErrorFallback,
  GenericMarketplaceErrorFallback
} from './MarketplaceErrorFallback';

// Error UI components
export {
  ErrorFallbackUI,
  GenericNetworkErrorFallback as NetworkErrorFallback,
  WalletErrorFallback,
  ContentLoadingErrorFallback,
  PerformanceErrorFallback
} from './ErrorFallbackUI';

// Graceful degradation
export { default as GracefulDegradation } from './GracefulDegradation';

// Fallback content
export {
  FallbackContent,
  CachedContentFallback,
  ProgressiveLoadingFallback,
  MaintenanceFallback
} from './FallbackContent';

// Offline support
export { OfflineManager, offlineManager } from '../../services/OfflineManager';
export type { QueuedAction, OfflineState } from '../../services/OfflineManager';

export {
  OfflineIndicator,
  OfflineQueueViewer,
  OfflineBanner
} from './OfflineIndicator';

// Hooks
export { useErrorHandler } from '../../hooks/useErrorHandler';
export {
  useOfflineSupport,
  useOfflinePostCreation,
  useOfflineReactions,
  useOfflineTipping,
  useOfflineProfileUpdate,
  useOfflineCommunityActions
} from '../../hooks/useOfflineSupport';

// Legacy exports
export { PostCardErrorBoundary } from './PostCardErrorBoundary';
export { SidebarErrorBoundary } from './SidebarErrorBoundary';
export { default as RetryHandler } from './RetryHandler';

// Loading Skeletons
export { PostCardSkeleton } from '../LoadingSkeletons/PostCardSkeleton';
export { SidebarWidgetSkeleton } from '../LoadingSkeletons/SidebarWidgetSkeleton';
export { CommunityHeaderSkeleton } from '../LoadingSkeletons/CommunityHeaderSkeleton';
export { PostListSkeleton } from '../LoadingSkeletons/PostListSkeleton';

// Types
export interface ErrorHandlingProps {
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallback?: React.ReactNode;
}

export interface RetryableError {
  message: string;
  retryable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
}
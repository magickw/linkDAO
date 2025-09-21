/**
 * Error Handling Components Index
 * Exports all error handling components and utilities
 */

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

// Error UI components
export {
  ErrorFallbackUI,
  NetworkErrorFallback,
  WalletErrorFallback,
  ContentLoadingErrorFallback,
  PerformanceErrorFallback
} from './ErrorFallbackUI';

// Graceful degradation
export {
  GracefulDegradation,
  EnhancedPostComposerWithFallback,
  TokenReactionsWithFallback,
  WalletDashboardWithFallback,
  NotificationsWithFallback,
  SearchWithFallback,
  VirtualScrollWithFallback,
  ReputationWithFallback,
  ContentPreviewsWithFallback
} from './GracefulDegradation';

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
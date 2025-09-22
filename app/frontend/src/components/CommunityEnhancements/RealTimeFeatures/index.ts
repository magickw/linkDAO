/**
 * Real-Time Features Components
 * Export all real-time update components
 */

export { LiveUpdateIndicators, ConnectionStatusIndicator, InlineUpdateNotification } from './LiveUpdateIndicators';
export { default as LiveCommentUpdates } from './LiveCommentUpdates';
export { 
  ConnectionStatusIndicators, 
  ConnectionStatusBadge, 
  ConnectionQualityIndicator 
} from './ConnectionStatusIndicators';
export { default as NotificationCategorization } from './NotificationCategorization';
export { default as OfflineNotificationQueue } from './OfflineNotificationQueue';

// Re-export services and hooks for convenience
export { communityRealTimeUpdateService } from '../../../services/communityRealTimeUpdateService';
export { notificationCategorizationService } from '../../../services/notificationCategorizationService';
export { offlineSyncService } from '../../../services/offlineSyncService';

export { 
  useCommunityRealTimeUpdates,
  usePostRealTimeUpdates,
  useCommunityRealTimeUpdates as useCommunityUpdates
} from '../../../hooks/useCommunityRealTimeUpdates';
export { 
  useNotificationCategorization,
  useNotificationFiltering,
  useNotificationGrouping,
  useNotificationHistory
} from '../../../hooks/useNotificationCategorization';
export { 
  useOfflineSync,
  useOfflineActions,
  useSyncStatus
} from '../../../hooks/useOfflineSync';

// Types
export type { 
  LiveContentUpdate,
  ContentUpdateIndicator 
} from '../../../services/communityRealTimeUpdateService';
export type {
  NotificationFilter,
  NotificationGroup,
  CategoryConfig,
  EnhancedNotificationCategory
} from '../../../services/notificationCategorizationService';
export type {
  OfflineAction,
  SyncResult,
  ConflictResolutionStrategy
} from '../../../services/offlineSyncService';
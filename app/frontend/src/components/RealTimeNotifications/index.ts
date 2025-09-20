export { default as RealTimeNotificationSystem } from './RealTimeNotificationSystem';
export { default as NotificationCategorization } from './NotificationCategorization';
export { default as LiveUpdateIndicators } from './LiveUpdateIndicators';
export { default as ImmediateNotificationSystem } from './ImmediateNotificationSystem';
export { default as PriorityNotifications } from './PriorityNotifications';
export { default as LiveCommentUpdates } from './LiveCommentUpdates';
export { default as CommunityEventNotifications } from './CommunityEventNotifications';
export { default as OfflineNotificationQueue } from './OfflineNotificationQueue';

// Re-export types
export type {
  RealTimeNotification,
  NotificationCategory,
  NotificationPriority,
  NotificationUrgency,
  MentionNotification,
  TipNotification,
  GovernanceNotification,
  CommunityNotification,
  ReactionNotification,
  NotificationQueue,
  NotificationSettings,
  LiveUpdateIndicator,
  NotificationState
} from '../../types/realTimeNotifications';

// Re-export hook
export { useRealTimeNotifications } from '../../hooks/useRealTimeNotifications';

// Re-export service
export { default as realTimeNotificationService } from '../../services/realTimeNotificationService';
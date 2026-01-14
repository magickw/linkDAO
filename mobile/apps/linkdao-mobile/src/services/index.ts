/**
 * Services Index
 * Export all API services
 */

export { postsService } from './postsService';
export { communitiesService } from './communitiesService';
export { messagingService } from './messagingService';
export { webSocketService } from './webSocketService';
export { walletService } from './walletConnectService';
export { offlineManager } from './offlineManager';
export { marketplaceService } from './marketplaceService';
export { paymentService } from './paymentService';
export { socialMediaService } from './socialMediaService';

export {
  isBiometricAvailable,
  enableBiometrics,
  disableBiometrics,
  authenticateWithBiometrics,
  getBiometricConfig,
  getBiometryTypeName,
  createBiometricKeys,
  deleteBiometricKeys,
  signWithBiometrics,
} from './biometricService';

export {
  pushNotificationService,
  registerForPushNotifications,
  unregisterFromPushNotifications,
  sendLocalNotification,
  scheduleNotification,
  cancelScheduledNotification,
  cancelAllScheduledNotifications,
  setBadgeCount,
  getBadgeCount,
  checkPermissions,
  requestPermissions,
  isEnabled,
  getToken,
} from './pushNotificationService';

export type { CreatePostData, PostsResponse } from './postsService';
export type { CreateCommunityData, JoinCommunityResponse } from './communitiesService';
export type { CreateMessageData, CreateConversationData } from './messagingService';
export type { WebSocketEvent } from './webSocketService';
export type { BiometricAuthResult, BiometricConfig } from './biometricService';
export type { CacheEntry, OfflineAction } from './offlineManager';
export type { PushNotificationConfig, NotificationPermissions } from './pushNotificationService';
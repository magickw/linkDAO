/**
 * Services Index
 * Export all API services
 */

export { postsService } from './postsService';
export { communitiesService } from './communitiesService';
export { messagingService } from './messagingService';
export { webSocketService } from './webSocketService';
export { walletService } from './walletConnectService';

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

export type { CreatePostData, PostsResponse } from './postsService';
export type { CreateCommunityData, JoinCommunityResponse } from './communitiesService';
export type { CreateMessageData, CreateConversationData } from './messagingService';
export type { WebSocketEvent } from './webSocketService';
export type { BiometricAuthResult, BiometricConfig } from './biometricService';
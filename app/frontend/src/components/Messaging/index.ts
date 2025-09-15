/**
 * Messaging Components - Centralized exports
 * Comprehensive wallet-to-wallet messaging system
 */

export { default as MessagingInterface } from './MessagingInterface';
export { default as MessagingWidget } from './MessagingWidget';
export { default as AddressSearch } from './AddressSearch';

// Re-export services for convenience
export { default as messagingService } from '../../services/messagingService';
export { default as nftNegotiationBot } from '../../services/nftNegotiationBot';
export { default as multichainResolver } from '../../services/multichainResolver';
export { default as notificationService } from '../../services/notificationService';

// Export types
export type {
  ChatMessage,
  ChatConversation,
  UserPresence,
  BlockedUser,
  MessageNotification
} from '../../services/messagingService';

export type {
  NFTOffer,
  BotResponse
} from '../../services/nftNegotiationBot';

export type {
  ChainInfo,
  ResolvedAddress,
  AddressSearchResult
} from '../../services/multichainResolver';

export type {
  NotificationSettings,
  MessageNotificationData,
  BlockExplorerNotification
} from '../../services/notificationService';
/**
 * Shared Services
 * All business logic services that can be shared between apps
 */

// API Client
export { apiClient } from './apiClient';
export type { ApiResponse, ApiError } from './apiClient';

// Auth Service
export { authService } from './authService';
export type { AuthUser, AuthResponse, LoginCredentials, RegisterData } from './authService';

// Messaging Services
// export { UnifiedMessagingService } from './unifiedMessagingService';
// export { messagingService } from './messagingService';

// Wallet Services
// export { WalletService } from './walletService';
// export { localWalletTransactionService } from './localWalletTransactionService';

// Offline Support
// export { OfflineManager, offlineManager } from './OfflineManager';

// Additional services will be exported here as they are migrated

export {};
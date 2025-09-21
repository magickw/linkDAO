/**
 * Security Module Index
 * Exports all security components and utilities
 */

// Core Security Classes
export { default as InputSanitizer } from './inputSanitizer';
export { default as MediaValidator } from './mediaValidator';
export { default as LinkPreviewSecurity } from './linkPreviewSecurity';
export { default as TokenTransactionSecurity } from './tokenTransactionSecurity';
export { default as WalletSecurity } from './walletSecurity';
export { default as SecurityManager } from './securityManager';

// Types and Interfaces
export type {
  SanitizationConfig,
  SanitizedContent
} from './inputSanitizer';

export type {
  MediaValidationConfig,
  MediaValidationResult,
  ProcessedMedia,
  MediaMetadata
} from './mediaValidator';

export type {
  LinkPreviewConfig,
  LinkPreviewResult,
  SandboxedPreview
} from './linkPreviewSecurity';

export type {
  TransactionValidationConfig,
  TransactionValidationResult,
  SecurityCheck,
  SmartContractValidation,
  ContractFunction
} from './tokenTransactionSecurity';

export type {
  WalletSecurityConfig,
  SecureSession,
  WalletPermission,
  SessionMetadata,
  WalletSecurityResult,
  SecurityEvent
} from './walletSecurity';

export type {
  SecurityManagerConfig,
  SecurityValidationResult,
  SecurityContext
} from './securityManager';

// React Components and Hooks
export { default as SecurityProvider, useSecurityContext } from '../components/Security/SecurityProvider';
export { default as SecurityAlert } from '../components/Security/SecurityAlert';
export { default as SecurityValidationWrapper } from '../components/Security/SecurityValidationWrapper';
export { default as useSecurity } from '../hooks/useSecurity';

// Utility Functions
export const SecurityUtils = {
  /**
   * Generate security context
   */
  createSecurityContext: (overrides: Partial<import('./securityManager').SecurityContext> = {}) => {
    return {
      timestamp: new Date(),
      userAgent: typeof window !== 'undefined' && typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ...overrides
    };
  },

  /**
   * Get risk level color
   */
  getRiskLevelColor: (level: 'low' | 'medium' | 'high' | 'critical'): string => {
    switch (level) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'critical': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  },

  /**
   * Get risk level background color
   */
  getRiskLevelBgColor: (level: 'low' | 'medium' | 'high' | 'critical'): string => {
    switch (level) {
      case 'low': return 'bg-green-50 dark:bg-green-900/20';
      case 'medium': return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'high': return 'bg-orange-50 dark:bg-orange-900/20';
      case 'critical': return 'bg-red-50 dark:bg-red-900/20';
      default: return 'bg-gray-50 dark:bg-gray-900/20';
    }
  }
};

// Default export
export { default } from './securityManager';
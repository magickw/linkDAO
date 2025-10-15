// Mobile Web3 Components
export { default as Web3MobileBottomNavigation } from '../Web3MobileBottomNavigation';
export { default as Web3SwipeGestureHandler } from '../Web3SwipeGestureHandler';
export { default as CollapsibleWeb3Sidebar } from '../CollapsibleWeb3Sidebar';
export { default as CompactWeb3PostCard } from '../CompactWeb3PostCard';
export { default as MobileWalletConnection } from '../MobileWalletConnection';
export { default as MobileWeb3DataDisplay } from '../MobileWeb3DataDisplay';
export { default as MobileGovernanceVoting } from '../MobileGovernanceVoting';
export { default as MobileTokenAmountInput } from '../MobileTokenAmountInput';
export { default as MobileWeb3ErrorHandler, useWeb3ErrorHandler } from '../MobileWeb3ErrorHandler';

// Types
export interface Web3MobileConfig {
  walletConnected: boolean;
  userBalance: number;
  stakingRewards: number;
  governanceNotifications: number;
  networkName: string;
  gasPrice: number;
}

export interface MobileWeb3Theme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  errorColor: string;
  successColor: string;
  warningColor: string;
}

// Constants
export const WEB3_MOBILE_CONSTANTS = {
  SWIPE_THRESHOLD: 80,
  HAPTIC_FEEDBACK_ENABLED: true,
  AUTO_RETRY_ENABLED: true,
  MAX_RETRIES: 3,
  RETRY_DELAY: 3000,
  ANIMATION_DURATION: 300,
  TOUCH_TARGET_SIZE: 44, // iOS HIG minimum
} as const;

// Utility functions
export const formatWeb3Number = (value: number, decimals: number = 2): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(decimals)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(decimals)}K`;
  return value.toFixed(decimals);
};

export const formatWeb3Currency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

export const formatWeb3Percentage = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const truncateAddress = (address: string, startChars: number = 6, endChars: number = 4): string => {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

export const getWeb3ErrorMessage = (error: any): string => {
  if (error?.code === 4001) return 'Transaction cancelled by user';
  if (error?.message?.includes('insufficient funds')) return 'Insufficient funds';
  if (error?.message?.includes('gas')) return 'Gas estimation failed';
  if (error?.message?.includes('network')) return 'Network error';
  if (error?.message?.includes('timeout')) return 'Request timed out';
  return error?.message || 'Unknown error occurred';
};
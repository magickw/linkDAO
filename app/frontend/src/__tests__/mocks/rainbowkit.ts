// Mock for @rainbow-me/rainbowkit library to avoid ES module parsing issues in Jest
import React from 'react';

export const ConnectButton = ({ children }: { children?: React.ReactNode }) => 
  React.createElement('button', { 'data-testid': 'connect-button' }, children || 'Connect Wallet');

export const RainbowKitProvider = ({ children }: { children: React.ReactNode }) => children;

export const getDefaultWallets = jest.fn(() => ({
  connectors: [],
  wallets: [],
}));

export const configureChains = jest.fn(() => ({
  chains: [],
  publicClient: {},
  webSocketPublicClient: {},
}));

export const createConfig = jest.fn(() => ({}));

export const WalletButton = ({ wallet, onClick }: { wallet: any; onClick?: () => void }) => 
  React.createElement('button', { 
    onClick, 
    'data-testid': `wallet-${wallet?.id || 'unknown'}` 
  }, wallet?.name || 'Wallet');

export const useConnectModal = jest.fn(() => ({
  openConnectModal: jest.fn(),
  connectModalOpen: false,
}));

export const useAccountModal = jest.fn(() => ({
  openAccountModal: jest.fn(),
  accountModalOpen: false,
}));

export const useChainModal = jest.fn(() => ({
  openChainModal: jest.fn(),
  chainModalOpen: false,
}));

export const useAddRecentTransaction = jest.fn(() => jest.fn());

export const lightTheme = jest.fn(() => ({}));
export const darkTheme = jest.fn(() => ({}));
export const midnightTheme = jest.fn(() => ({}));

export const cssStringFromTheme = jest.fn(() => '');

// Default export for compatibility
export default {
  ConnectButton,
  RainbowKitProvider,
  getDefaultWallets,
  configureChains,
  createConfig,
  WalletButton,
  useConnectModal,
  useAccountModal,
  useChainModal,
  useAddRecentTransaction,
  lightTheme,
  darkTheme,
  midnightTheme,
  cssStringFromTheme,
};
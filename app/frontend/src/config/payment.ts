import { PaymentToken, ChainConfig } from '../types/payment';
import { mainnet, polygon, arbitrum } from 'wagmi/chains';

// Native tokens
export const ETH: PaymentToken = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  chainId: mainnet.id,
  isNative: true,
  logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
};

export const MATIC: PaymentToken = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'MATIC',
  name: 'Polygon',
  decimals: 18,
  chainId: polygon.id,
  isNative: true,
  logoURI: 'https://tokens.1inch.io/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png'
};

// Stablecoins
export const USDC_MAINNET: PaymentToken = {
  address: '0xA0b86a33E6441c8C06DD2b7c94b7E6E8b8b8b8b8',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  chainId: mainnet.id,
  logoURI: 'https://tokens.1inch.io/0xa0b86a33e6441c8c06dd2b7c94b7e6e8b8b8b8b8.png'
};

export const USDC_POLYGON: PaymentToken = {
  address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  chainId: polygon.id,
  logoURI: 'https://tokens.1inch.io/0xa0b86a33e6441c8c06dd2b7c94b7e6e8b8b8b8b8.png'
};

export const USDC_ARBITRUM: PaymentToken = {
  address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  chainId: arbitrum.id,
  logoURI: 'https://tokens.1inch.io/0xa0b86a33e6441c8c06dd2b7c94b7e6e8b8b8b8b8.png'
};

export const USDT_MAINNET: PaymentToken = {
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  symbol: 'USDT',
  name: 'Tether USD',
  decimals: 6,
  chainId: mainnet.id,
  logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png'
};

export const USDT_POLYGON: PaymentToken = {
  address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  symbol: 'USDT',
  name: 'Tether USD',
  decimals: 6,
  chainId: polygon.id,
  logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png'
};

// Chain configurations
export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    chainId: mainnet.id,
    name: 'Ethereum',
    nativeCurrency: ETH,
    rpcUrls: ['https://eth.llamarpc.com'],
    blockExplorerUrls: ['https://etherscan.io'],
    supportedTokens: [ETH, USDC_MAINNET, USDT_MAINNET]
  },
  {
    chainId: polygon.id,
    name: 'Polygon',
    nativeCurrency: MATIC,
    rpcUrls: ['https://polygon.llamarpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
    supportedTokens: [MATIC, USDC_POLYGON, USDT_POLYGON]
  },
  {
    chainId: arbitrum.id,
    name: 'Arbitrum',
    nativeCurrency: { ...ETH, chainId: arbitrum.id },
    rpcUrls: ['https://arbitrum.llamarpc.com'],
    blockExplorerUrls: ['https://arbiscan.io'],
    supportedTokens: [{ ...ETH, chainId: arbitrum.id }, USDC_ARBITRUM]
  }
];

// Get all supported tokens across all chains
export const getAllSupportedTokens = (): PaymentToken[] => {
  return SUPPORTED_CHAINS.flatMap(chain => chain.supportedTokens);
};

// Get supported tokens for a specific chain
export const getTokensForChain = (chainId: number): PaymentToken[] => {
  const chain = SUPPORTED_CHAINS.find(c => c.chainId === chainId);
  return chain?.supportedTokens || [];
};

// Get chain configuration
export const getChainConfig = (chainId: number): ChainConfig | undefined => {
  return SUPPORTED_CHAINS.find(c => c.chainId === chainId);
};

// Payment configuration
export const PAYMENT_CONFIG = {
  // Transaction confirmation requirements
  CONFIRMATION_BLOCKS: {
    [mainnet.id]: 12,
    [polygon.id]: 20,
    [arbitrum.id]: 1
  },
  
  // Gas price multipliers for different priority levels
  GAS_PRICE_MULTIPLIERS: {
    slow: 1.0,
    standard: 1.1,
    fast: 1.25,
    instant: 1.5
  },
  
  // Maximum retry attempts for failed transactions
  MAX_RETRY_ATTEMPTS: 3,
  
  // Transaction timeout in milliseconds
  TRANSACTION_TIMEOUT: 300000, // 5 minutes
  
  // Minimum confirmation time in milliseconds
  MIN_CONFIRMATION_TIME: 30000, // 30 seconds
  
  // Gas limit buffers
  GAS_LIMIT_BUFFER: 1.2, // 20% buffer
  
  // Slippage tolerance for gas price estimation
  GAS_PRICE_SLIPPAGE: 0.1 // 10%
};
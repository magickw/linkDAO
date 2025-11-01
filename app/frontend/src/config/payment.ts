import { PaymentToken, ChainConfig } from '../types/payment';
import { mainnet, polygon, arbitrum, sepolia, base, baseSepolia } from 'wagmi/chains';

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

// Sepolia testnet tokens
export const ETH_SEPOLIA: PaymentToken = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  name: 'Sepolia Ethereum',
  decimals: 18,
  chainId: sepolia.id,
  isNative: true,
  logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
};

export const USDC_SEPOLIA: PaymentToken = {
  address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  symbol: 'USDC',
  name: 'USD Coin (Sepolia)',
  decimals: 6,
  chainId: sepolia.id,
  logoURI: 'https://tokens.1inch.io/0xa0b86a33e6441c8c06dd2b7c94b7e6e8b8b8b8b8.png'
};

// Base network tokens
export const USDC_BASE: PaymentToken = {
  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  chainId: base.id,
  logoURI: 'https://tokens.1inch.io/0xa0b86a33e6441c8c06dd2b7c94b7e6e8b8b8b8b8.png'
};

export const USDC_BASE_SEPOLIA: PaymentToken = {
  address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  symbol: 'USDC',
  name: 'USD Coin (Base Sepolia)',
  decimals: 6,
  chainId: baseSepolia.id,
  logoURI: 'https://tokens.1inch.io/0xa0b86a33e6441c8c06dd2b7c94b7e6e8b8b8b8b8.png'
};

// Chain configurations
export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    chainId: mainnet.id,
    name: 'Ethereum',
    nativeCurrency: ETH,
    rpcUrls: ['https://eth.llamarpc.com'],
    blockExplorerUrls: ['https://etherscan.io'],
    supportedTokens: [USDC_MAINNET, USDT_MAINNET, ETH] // Prioritize stablecoins
  },
  {
    chainId: polygon.id,
    name: 'Polygon',
    nativeCurrency: MATIC,
    rpcUrls: ['https://polygon.llamarpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
    supportedTokens: [USDC_POLYGON, USDT_POLYGON, MATIC] // Prioritize stablecoins
  },
  {
    chainId: arbitrum.id,
    name: 'Arbitrum',
    nativeCurrency: { ...ETH, chainId: arbitrum.id },
    rpcUrls: ['https://arbitrum.llamarpc.com'],
    blockExplorerUrls: ['https://arbiscan.io'],
    supportedTokens: [USDC_ARBITRUM, { ...ETH, chainId: arbitrum.id }] // Prioritize stablecoins
  },
  {
    chainId: base.id,
    name: 'Base',
    nativeCurrency: { ...ETH, chainId: base.id },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    supportedTokens: [USDC_BASE, { ...ETH, chainId: base.id }] // Prioritize stablecoins
  },
  {
    chainId: sepolia.id,
    name: 'Sepolia Testnet',
    nativeCurrency: ETH_SEPOLIA,
    rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    supportedTokens: [USDC_SEPOLIA, ETH_SEPOLIA] // Prioritize stablecoins
  },
  {
    chainId: baseSepolia.id,
    name: 'Base Sepolia',
    nativeCurrency: { ...ETH, chainId: baseSepolia.id },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    supportedTokens: [USDC_BASE_SEPOLIA, { ...ETH, chainId: baseSepolia.id }] // Prioritize stablecoins
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
  // Escrow contract address
  ESCROW_CONTRACT_ADDRESS: {
    [sepolia.id]: '0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1',
  },

  // Transaction confirmation requirements
  CONFIRMATION_BLOCKS: {
    [mainnet.id]: 12,
    [polygon.id]: 20,
    [arbitrum.id]: 1,
    [base.id]: 1,
    [sepolia.id]: 3,
    [baseSepolia.id]: 1
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
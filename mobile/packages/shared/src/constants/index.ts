/**
 * Shared Constants
 * All constants and configuration that can be shared between apps
 */

// Environment Configuration
export { ENV_CONFIG } from './environment';

// Chain Configuration
export const SUPPORTED_CHAINS = {
  ETHEREUM: { chainId: 1, name: 'Ethereum', symbol: 'ETH', rpcUrl: 'https://eth.llamarpc.com' },
  SEPOLIA: { chainId: 11155111, name: 'Sepolia', symbol: 'ETH', rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com' },
  BASE: { chainId: 8453, name: 'Base', symbol: 'ETH', rpcUrl: 'https://mainnet.base.org' },
  BASE_SEPOLIA: { chainId: 84532, name: 'Base Sepolia', symbol: 'ETH', rpcUrl: 'https://sepolia.base.org' },
  POLYGON: { chainId: 137, name: 'Polygon', symbol: 'MATIC', rpcUrl: 'https://polygon-rpc.com' },
  ARBITRUM: { chainId: 42161, name: 'Arbitrum', symbol: 'ETH', rpcUrl: 'https://arb1.arbitrum.io/rpc' },
} as const;

// Token Addresses
export const TOKEN_ADDRESSES = {
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
} as const;

// Additional constants will be added here as needed
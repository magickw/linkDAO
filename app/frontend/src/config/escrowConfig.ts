/**
 * Escrow Contract Configuration
 * Deployed contract addresses across different networks
 *
 * IMPORTANT: Update the Sepolia address with your actual deployed contract address
 */

import { Address } from 'viem';

export interface EscrowConfig {
  address: Address;
  deployedAt: string; // ISO date string
  deployer?: string;
  verified: boolean;
  blockNumber?: number;
}

export const ESCROW_CONTRACT_CONFIG: Record<number, EscrowConfig> = {
  // Ethereum Mainnet
  1: {
    address: '0x0000000000000000000000000000000000000000' as Address,
    deployedAt: '',
    verified: false
  },

  // Sepolia Testnet
  11155111: {
    address: '0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1' as Address,
    deployedAt: new Date().toISOString(),
    deployer: '0xEe034b53D4cCb101b2a4faec27708be507197350',
    verified: false
  },

  // Polygon Mainnet
  137: {
    address: '0x0000000000000000000000000000000000000000' as Address,
    deployedAt: '',
    verified: false
  },

  // Arbitrum One
  42161: {
    address: '0x0000000000000000000000000000000000000000' as Address,
    deployedAt: '',
    verified: false
  },

  // Base Mainnet
  8453: {
    address: '0x0000000000000000000000000000000000000000' as Address,
    deployedAt: '',
    verified: false
  },

  // Base Sepolia Testnet
  84532: {
    address: '0x0000000000000000000000000000000000000000' as Address,
    deployedAt: '',
    verified: false
  }
};

/**
 * Get escrow contract address for a given chain ID
 */
export function getEscrowAddress(chainId: number): Address | null {
  const config = ESCROW_CONTRACT_CONFIG[chainId];
  if (!config || config.address === '0x0000000000000000000000000000000000000000') {
    return null;
  }
  return config.address;
}

/**
 * Check if escrow is deployed on a given chain
 */
export function isEscrowDeployed(chainId: number): boolean {
  return getEscrowAddress(chainId) !== null;
}

/**
 * Get all chains where escrow is deployed
 */
export function getDeployedChains(): number[] {
  return Object.keys(ESCROW_CONTRACT_CONFIG)
    .map(Number)
    .filter(chainId => isEscrowDeployed(chainId));
}

/**
 * Network names for user-friendly display
 */
export const NETWORK_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia Testnet',
  137: 'Polygon',
  42161: 'Arbitrum One',
  8453: 'Base',
  84532: 'Base Sepolia Testnet'
};

/**
 * Get user-friendly network name
 */
export function getNetworkName(chainId: number): string {
  return NETWORK_NAMES[chainId] || `Chain ${chainId}`;
}

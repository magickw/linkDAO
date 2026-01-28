/**
 * Network Configuration
 * Maps chain IDs to RPC URLs and contract addresses for multi-network support
 */

export interface NetworkConfig {
    chainId: number;
    name: string;
    rpcUrl: string;
    fallbackRpcUrls?: string[];
    escrowContractAddress: string;
    marketplaceContractAddress?: string;
    isTestnet: boolean;
}

/**
 * Network configurations for all supported chains
 */
export const NETWORK_CONFIGS: Record<number, NetworkConfig> = {
    // Ethereum Mainnet
    1: {
        chainId: 1,
        name: 'Ethereum Mainnet',
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
        fallbackRpcUrls: ['https://rpc.ankr.com/eth', 'https://cloudflare-eth.com'],
        escrowContractAddress: process.env.ETHEREUM_ESCROW_CONTRACT || '0x0000000000000000000000000000000000000000',
        marketplaceContractAddress: process.env.ETHEREUM_MARKETPLACE_CONTRACT || '',
        isTestnet: false
    },

    // Sepolia Testnet
    11155111: {
        chainId: 11155111,
        name: 'Sepolia Testnet',
        rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.ankr.com/eth_sepolia',
        fallbackRpcUrls: [
            'https://ethereum-sepolia-rpc.publicnode.com',
            'https://eth-sepolia.public.blastapi.io',
            'https://sepolia.drpc.org'
        ],
        escrowContractAddress: process.env.SEPOLIA_ESCROW_CONTRACT || '0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1',
        marketplaceContractAddress: process.env.SEPOLIA_MARKETPLACE_CONTRACT || '',
        isTestnet: true
    },

    // Polygon
    137: {
        chainId: 137,
        name: 'Polygon',
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
        escrowContractAddress: process.env.POLYGON_ESCROW_CONTRACT || '0x0000000000000000000000000000000000000000',
        marketplaceContractAddress: process.env.POLYGON_MARKETPLACE_CONTRACT || '',
        isTestnet: false
    },

    // Arbitrum One
    42161: {
        chainId: 42161,
        name: 'Arbitrum One',
        rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arbitrum.llamarpc.com',
        escrowContractAddress: process.env.ARBITRUM_ESCROW_CONTRACT || '0x0000000000000000000000000000000000000000',
        marketplaceContractAddress: process.env.ARBITRUM_MARKETPLACE_CONTRACT || '',
        isTestnet: false
    },

    // Optimism
    10: {
        chainId: 10,
        name: 'Optimism',
        rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://optimism.llamarpc.com',
        escrowContractAddress: process.env.OPTIMISM_ESCROW_CONTRACT || '0x0000000000000000000000000000000000000000',
        marketplaceContractAddress: process.env.OPTIMISM_MARKETPLACE_CONTRACT || '',
        isTestnet: false
    },

    // Base
    8453: {
        chainId: 8453,
        name: 'Base',
        rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
        escrowContractAddress: process.env.BASE_ESCROW_CONTRACT || '0x0000000000000000000000000000000000000000',
        marketplaceContractAddress: process.env.BASE_MARKETPLACE_CONTRACT || '',
        isTestnet: false
    },

    // Base Sepolia
    84532: {
        chainId: 84532,
        name: 'Base Sepolia',
        rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
        escrowContractAddress: process.env.BASE_SEPOLIA_ESCROW_CONTRACT || '0x0000000000000000000000000000000000000000',
        marketplaceContractAddress: process.env.BASE_SEPOLIA_MARKETPLACE_CONTRACT || '',
        isTestnet: true
    }
};

/**
 * Get network configuration by chain ID
 */
export function getNetworkConfig(chainId: number): NetworkConfig | null {
    return NETWORK_CONFIGS[chainId] || null;
}

/**
 * Get default network configuration (Sepolia for testing)
 */
export function getDefaultNetworkConfig(): NetworkConfig {
    return NETWORK_CONFIGS[11155111]; // Sepolia
}

/**
 * Check if a chain ID is supported
 */
export function isChainSupported(chainId: number): boolean {
    return chainId in NETWORK_CONFIGS;
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
    return Object.keys(NETWORK_CONFIGS).map(Number);
}

/**
 * Get testnet chain IDs
 */
export function getTestnetChainIds(): number[] {
    return Object.values(NETWORK_CONFIGS)
        .filter(config => config.isTestnet)
        .map(config => config.chainId);
}

/**
 * Get mainnet chain IDs
 */
export function getMainnetChainIds(): number[] {
    return Object.values(NETWORK_CONFIGS)
        .filter(config => !config.isTestnet)
        .map(config => config.chainId);
}

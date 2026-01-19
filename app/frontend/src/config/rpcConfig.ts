// RPC Configuration with fallbacks and rate limiting
// Add this to your .env file:
// INFURA_API_KEY=your_infura_key
// ALCHEMY_API_KEY=your_alchemy_key

export const RPC_CONFIG = {
    // Mainnet
    1: {
        name: 'Ethereum Mainnet',
        rpcs: [
            process.env.INFURA_API_KEY ? `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}` : null,
            process.env.ALCHEMY_API_KEY ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : null,
            'https://eth.llamarpc.com',
            'https://rpc.ankr.com/eth',
        ].filter(Boolean),
        blockTime: 12000,
    },

    // Sepolia Testnet
    11155111: {
        name: 'Sepolia',
        rpcs: [
            process.env.INFURA_API_KEY ? `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}` : null,
            process.env.ALCHEMY_API_KEY ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : null,
            'https://rpc.sepolia.org',
            'https://rpc2.sepolia.org',
        ].filter(Boolean),
        blockTime: 12000,
    },

    // Base
    8453: {
        name: 'Base',
        rpcs: [
            process.env.ALCHEMY_API_KEY ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : null,
            'https://mainnet.base.org',
            'https://base.llamarpc.com',
        ].filter(Boolean),
        blockTime: 2000,
    },

    // Base Sepolia
    84532: {
        name: 'Base Sepolia',
        rpcs: [
            process.env.ALCHEMY_API_KEY ? `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : null,
            'https://sepolia.base.org',
            'https://base-sepolia-rpc.publicnode.com',
        ].filter(Boolean),
        blockTime: 2000,
    },

    // Polygon
    137: {
        name: 'Polygon',
        rpcs: [
            process.env.INFURA_API_KEY ? `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}` : null,
            process.env.ALCHEMY_API_KEY ? `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : null,
            'https://polygon.llamarpc.com',
            'https://rpc.ankr.com/polygon',
        ].filter(Boolean),
        blockTime: 2000,
    },

    // Arbitrum
    42161: {
        name: 'Arbitrum One',
        rpcs: [
            process.env.INFURA_API_KEY ? `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}` : null,
            process.env.ALCHEMY_API_KEY ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : null,
            'https://arb1.arbitrum.io/rpc',
            'https://arbitrum.llamarpc.com',
        ].filter(Boolean),
        blockTime: 250,
    },
};

/**
 * Get RPC URL with automatic fallback
 * Rotates through available RPCs if one fails
 */
export function getRpcUrl(chainId: number, attemptIndex: number = 0): string {
    const config = RPC_CONFIG[chainId as keyof typeof RPC_CONFIG];

    if (!config) {
        throw new Error(`No RPC configuration for chain ID ${chainId}`);
    }

    const rpcs = config.rpcs;
    if (rpcs.length === 0) {
        throw new Error(`No RPC endpoints configured for ${config.name} (${chainId})`);
    }

    // Rotate through RPCs on failures
    const rpcIndex = attemptIndex % rpcs.length;
    return rpcs[rpcIndex] as string;
}

/**
 * Get all RPC URLs for a chain
 */
export function getAllRpcUrls(chainId: number): string[] {
    const config = RPC_CONFIG[chainId as keyof typeof RPC_CONFIG];
    return config ? (config.rpcs as string[]) : [];
}

/**
 * Get chain name
 */
export function getChainName(chainId: number): string {
    const config = RPC_CONFIG[chainId as keyof typeof RPC_CONFIG];
    return config?.name || `Chain ${chainId}`;
}

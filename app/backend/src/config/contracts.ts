/**
 * Contract Configuration
 * Stores contract addresses for DEX integration and other core features per chain
 */

export interface ContractConfig {
    uniswapRouter: string;
    uniswapQuoter: string;
    uniswapFactory: string;
    linkDaoEscrow?: string;
    linkDaoMarketplace?: string;
}

export const CONTRACT_ADDRESSES: Record<number, ContractConfig> = {
    // Ethereum Mainnet
    1: {
        uniswapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // SwapRouter02
        uniswapQuoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e', // QuoterV2
        uniswapFactory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        linkDaoEscrow: process.env.ETHEREUM_ESCROW_CONTRACT
    },

    // Sepolia Testnet
    11155111: {
        uniswapRouter: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E', // SwapRouter02
        uniswapQuoter: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3', // QuoterV2
        uniswapFactory: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
        linkDaoEscrow: process.env.SEPOLIA_ESCROW_CONTRACT
    },

    // Base Mainnet
    8453: {
        uniswapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481', // SwapRouter02
        uniswapQuoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a', // QuoterV2
        uniswapFactory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
        linkDaoEscrow: process.env.BASE_ESCROW_CONTRACT
    },

    // Polygon
    137: {
        uniswapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // SwapRouter02
        uniswapQuoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e', // QuoterV2
        uniswapFactory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        linkDaoEscrow: process.env.POLYGON_ESCROW_CONTRACT
    },

    // Arbitrum One
    42161: {
        uniswapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // SwapRouter02
        uniswapQuoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e', // QuoterV2
        uniswapFactory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        linkDaoEscrow: process.env.ARBITRUM_ESCROW_CONTRACT
    },

    // Optimism
    10: {
        uniswapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // SwapRouter02
        uniswapQuoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e', // QuoterV2
        uniswapFactory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        linkDaoEscrow: process.env.OPTIMISM_ESCROW_CONTRACT
    }
};

/**
 * Get contract addresses for a specific chain
 */
export function getContractAddresses(chainId: number): ContractConfig {
    return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[1]; // Default to Mainnet if not found
}

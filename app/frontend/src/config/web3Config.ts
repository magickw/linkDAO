import { ENV_CONFIG } from './environment';

export interface NetworkConfig {
    chainId: number;
    name: string;
    shortName: string;
    rpcUrl: string;
    blockExplorer: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    isTestnet: boolean;
    // Specific contract overrides for this network if needed
    contracts?: {
        tipRouter?: string;
        ldaoToken?: string;
        usdcToken?: string;
        usdtToken?: string;
    };
}

export const NETWORKS: Record<number, NetworkConfig> = {
    // Ethereum Mainnet
    1: {
        chainId: 1,
        name: 'Ethereum Mainnet',
        shortName: 'Ethereum',
        rpcUrl: ENV_CONFIG.MAINNET_RPC_URL,
        blockExplorer: 'https://etherscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        isTestnet: false,
        contracts: {
            usdcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            usdtToken: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
        }
    },
    // Ethereum Sepolia
    11155111: {
        chainId: 11155111,
        name: 'Ethereum Sepolia',
        shortName: 'Sepolia',
        rpcUrl: ENV_CONFIG.SEPOLIA_RPC_URL,
        blockExplorer: 'https://sepolia.etherscan.io',
        nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
        isTestnet: true,
        contracts: {
            ldaoToken: ENV_CONFIG.LDAO_TOKEN_ADDRESS,
            tipRouter: ENV_CONFIG.TIP_ROUTER_ADDRESS,
            usdcToken: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
            usdtToken: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0' // Sepolia USDT
        }
    },
    // Base Mainnet
    8453: {
        chainId: 8453,
        name: 'Base Mainnet',
        shortName: 'Base',
        rpcUrl: ENV_CONFIG.BASE_RPC_URL,
        blockExplorer: 'https://basescan.org',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        isTestnet: false,
        contracts: {
            usdcToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
        }
    },
    // Base Sepolia
    84532: {
        chainId: 84532,
        name: 'Base Sepolia',
        shortName: 'Base Sepolia',
        rpcUrl: 'https://sepolia.base.org',
        blockExplorer: 'https://sepolia.basescan.org',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        isTestnet: true,
        contracts: {
            usdcToken: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
        }
    },
    // Polygon Mainnet
    137: {
        chainId: 137,
        name: 'Polygon Mainnet',
        shortName: 'Polygon',
        rpcUrl: 'https://polygon-rpc.com',
        blockExplorer: 'https://polygonscan.com',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        isTestnet: false,
        contracts: {
            usdcToken: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
            usdtToken: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
        }
    }
};

/**
 * Returns the list of enabled networks.
 * In the future, this can validat against IS_PRODUCTION to filter out testnets if desired.
 * For now, per user request, we return all configured networks to allow user choice.
 */
export const getEnabledNetworks = (): NetworkConfig[] => {
    return Object.values(NETWORKS);
};

export const getNetwork = (chainId: number): NetworkConfig | undefined => {
    return NETWORKS[chainId];
};

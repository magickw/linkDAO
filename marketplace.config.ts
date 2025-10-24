/**
 * LinkDAO Platform Configuration
 * Central configuration for the Web3 social platform with integrated marketplace
 */

export const linkdaoConfig = {
  // Network Configuration
  networks: {
    development: {
      chainId: 31337,
      name: 'Hardhat Local',
      rpcUrl: 'http://127.0.0.1:8545',
      blockExplorer: 'http://localhost:8545',
    },
    goerli: {
      chainId: 5,
      name: 'Goerli Testnet',
      rpcUrl: process.env.GOERLI_RPC_URL || '',
      blockExplorer: 'https://goerli.etherscan.io',
    },
    polygon: {
      chainId: 137,
      name: 'Polygon Mainnet',
      rpcUrl: process.env.POLYGON_RPC_URL || '',
      blockExplorer: 'https://polygonscan.com',
    },
  },

  // Contract Addresses (will be populated after deployment)
  contracts: {
    marketplace: process.env.MARKETPLACE_CONTRACT_ADDRESS || '',
    enhancedEscrow: process.env.ENHANCED_ESCROW_CONTRACT_ADDRESS || '',
    ldaoToken: process.env.LDAO_TOKEN_CONTRACT_ADDRESS || '',
    governance: process.env.GOVERNANCE_CONTRACT_ADDRESS || '',
  },

  // API Configuration
  api: {
    backend: {
      url: process.env.BACKEND_URL || 'http://localhost:10000',
      wsUrl: process.env.BACKEND_WS_URL || 'ws://localhost:10000',
    },
    ipfs: {
      gateway: process.env.IPFS_GATEWAY || 'http://localhost:8080',
      api: process.env.IPFS_API || 'http://localhost:5001',
    },
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/linkdao',
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Platform Settings
  platform: {
    feePercentage: 2.5, // 2.5% platform fee
    minReputationScore: 50,
    deliveryDeadlineDays: 14,
    auctionExtensionTime: 300, // 5 minutes in seconds
  },

  // Supported Tokens
  supportedTokens: [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0x0000000000000000000000000000000000000000', // Native ETH
      decimals: 18,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: process.env.USDC_CONTRACT_ADDRESS || '',
      decimals: 6,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: process.env.USDT_CONTRACT_ADDRESS || '',
      decimals: 6,
    },
    {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      address: process.env.DAI_CONTRACT_ADDRESS || '',
      decimals: 18,
    },
  ],

  // Feature Flags
  features: {
    escrowEnabled: true,
    auctionsEnabled: true,
    nftSupportEnabled: true,
    reputationSystemEnabled: true,
    communityModerationEnabled: true,
    aiModerationEnabled: true,
  },
} as const;

export type LinkDAOConfig = typeof linkdaoConfig;
export default linkdaoConfig;
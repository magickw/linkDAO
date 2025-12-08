import { base, baseSepolia } from 'wagmi/chains';

// Base network configurations
export const BASE_MAINNET = {
  ...base,
  name: 'Base',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    public: {
      http: ['https://mainnet.base.org'],
    },
    default: {
      http: ['https://mainnet.base.org'],
    },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org' },
  },
  testnet: false,
};

export const BASE_SEPOLIA = {
  ...baseSepolia,
  name: 'Base Sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    public: {
      http: ['https://sepolia.base.org'],
    },
    default: {
      http: ['https://sepolia.base.org'],
    },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
};

// Network configuration for LinkDAO
export const NETWORK_CONFIG = {
  [BASE_MAINNET.id]: {
    ...BASE_MAINNET,
    chainId: BASE_MAINNET.id,
    networkName: 'Base Mainnet',
    isTestnet: false,
    gasPrice: 'auto',
    blockTime: 2, // 2 seconds
    features: {
      staking: true,
      marketplace: true,
      governance: true,
      treasury: true,
    },
  },
  [BASE_SEPOLIA.id]: {
    ...BASE_SEPOLIA,
    chainId: BASE_SEPOLIA.id,
    networkName: 'Base Sepolia',
    isTestnet: true,
    gasPrice: 'auto',
    blockTime: 2, // 2 seconds
    features: {
      staking: true,
      marketplace: true,
      governance: true,
      treasury: true,
    },
  },
};

// Get network configuration by chain ID
export const getNetworkConfig = (chainId?: number) => {
  if (!chainId) return null;
  return NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG] || null;
};

// Check if network is supported
export const isSupportedNetwork = (chainId?: number) => {
  return chainId ? !!NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG] : false;
};

// Get current network features
export const getNetworkFeatures = (chainId?: number) => {
  const config = getNetworkConfig(chainId);
  return config?.features || null;
};

// Gas estimation helpers
export const GAS_ESTIMATES = {
  // LDAOToken operations
  approve: 50000n,
  transfer: 65000n,
  
  // Staking operations
  stake: 150000n,
  unstake: 120000n,
  claimRewards: 80000n,
  
  // Marketplace operations
  createListing: 100000n,
  buyListing: 180000n,
  
  // Governance operations
  createProposal: 200000n,
  vote: 60000n,
  executeProposal: 150000n,
  
  // Treasury operations
  deposit: 80000n,
  withdraw: 90000n,
};

// Calculate estimated gas cost in ETH
export const estimateGasCost = (gasLimit: bigint, gasPrice?: bigint) => {
  const defaultGasPrice = gasPrice || 1000000000n; // 1 gwei in wei
  return (gasLimit * defaultGasPrice) / 1000000000000000000n; // Convert to ETH
};

// Transaction helpers
export const TRANSACTION_HELPERS = {
  // Add Base network to MetaMask
  addBaseToMetaMask: async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${BASE_MAINNET.id.toString(16)}`,
            chainName: BASE_MAINNET.name,
            nativeCurrency: BASE_MAINNET.nativeCurrency,
            rpcUrls: BASE_MAINNET.rpcUrls,
            blockExplorerUrls: BASE_MAINNET.blockExplorers,
          },
        ],
      });
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected the request');
      }
      throw error;
    }
  },

  // Switch to Base network
  switchToBase: async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${BASE_MAINNET.id.toString(16)}` }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not found, try adding it
        await TRANSACTION_HELPERS.addBaseToMetaMask();
      } else if (error.code === 4001) {
        throw new Error('User rejected the request');
      }
      throw error;
    }
  },

  // Add Base Sepolia to MetaMask
  addBaseSepoliaToMetaMask: async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${BASE_SEPOLIA.id.toString(16)}`,
            chainName: BASE_SEPOLIA.name,
            nativeCurrency: BASE_SEPOLIA.nativeCurrency,
            rpcUrls: BASE_SEPOLIA.rpcUrls,
            blockExplorerUrls: BASE_SEPOLIA.blockExplorers,
          },
        ],
      });
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected the request');
      }
      throw error;
    }
  },

  // Switch to Base Sepolia
  switchToBaseSepolia: async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${BASE_SEPOLIA.id.toString(16)}` }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not found, try adding it
        await TRANSACTION_HELPERS.addBaseSepoliaToMetaMask();
      } else if (error.code === 4001) {
        throw new Error('User rejected the request');
      }
      throw error;
    }
  },
};

// Network status helpers
export const getNetworkStatus = async (chainId?: number) => {
  if (!chainId) return { status: 'unknown', message: 'No network selected' };

  const config = getNetworkConfig(chainId);
  if (!config) {
    return { status: 'unsupported', message: 'Network not supported' };
  }

  try {
    // Check if RPC is responsive
    const response = await fetch(config.rpcUrls.default.http[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });

    if (response.ok) {
      return {
        status: 'healthy',
        message: `${config.networkName} is operational`,
        blockTime: config.blockTime,
      };
    } else {
      return {
        status: 'error',
        message: `${config.networkName} RPC is not responding`,
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Failed to connect to ${config.networkName}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Export default network (Base mainnet for production)
export const DEFAULT_NETWORK = BASE_MAINNET;
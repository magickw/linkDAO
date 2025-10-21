// Mock for wagmi library to avoid ES module parsing issues in Jest

export const useAccount = jest.fn(() => ({
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  isConnecting: false,
  isDisconnected: false,
  isReconnecting: false,
  status: 'connected',
  connector: {
    id: 'mock-connector',
    name: 'Mock Connector',
  },
}));

export const useConnect = jest.fn(() => ({
  connect: jest.fn(),
  connectors: [
    {
      id: 'mock-connector',
      name: 'Mock Connector',
      ready: true,
    },
  ],
  error: null,
  isLoading: false,
  pendingConnector: null,
}));

export const useDisconnect = jest.fn(() => ({
  disconnect: jest.fn(),
  error: null,
  isLoading: false,
}));

export const useBalance = jest.fn(() => ({
  data: {
    decimals: 18,
    formatted: '1.0',
    symbol: 'ETH',
    value: BigInt('1000000000000000000'),
  },
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: true,
}));

export const useContractRead = jest.fn(() => ({
  data: null,
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: true,
}));

export const useContractWrite = jest.fn(() => ({
  data: null,
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: true,
  write: jest.fn(),
  writeAsync: jest.fn(),
}));

export const usePrepareContractWrite = jest.fn(() => ({
  config: {},
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: true,
}));

export const useWaitForTransaction = jest.fn(() => ({
  data: null,
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: true,
}));

export const useNetwork = jest.fn(() => ({
  chain: {
    id: 1,
    name: 'Ethereum',
    network: 'homestead',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: { http: ['https://eth-mainnet.alchemyapi.io/v2/demo'] },
      public: { http: ['https://eth-mainnet.alchemyapi.io/v2/demo'] },
    },
  },
  chains: [],
  error: null,
  isLoading: false,
  pendingChainId: null,
  switchNetwork: jest.fn(),
  switchNetworkAsync: jest.fn(),
}));

export const useSwitchNetwork = jest.fn(() => ({
  chains: [],
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: true,
  pendingChainId: null,
  switchNetwork: jest.fn(),
  switchNetworkAsync: jest.fn(),
}));

export const useEnsName = jest.fn(() => ({
  data: null,
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: true,
}));

export const useEnsAddress = jest.fn(() => ({
  data: null,
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: true,
}));

export const useSignMessage = jest.fn(() => ({
  data: null,
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: true,
  signMessage: jest.fn(),
  signMessageAsync: jest.fn(),
}));

export const useToken = jest.fn(() => ({
  data: null,
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: true,
}));

export const WagmiConfig = ({ children }: { children: React.ReactNode }) => children;

export const createConfig = jest.fn(() => ({}));

export const configureChains = jest.fn(() => ({
  chains: [],
  publicClient: {},
  webSocketPublicClient: {},
}));

export const mainnet = {
  id: 1,
  name: 'Ethereum',
  network: 'homestead',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://eth-mainnet.alchemyapi.io/v2/demo'] },
    public: { http: ['https://eth-mainnet.alchemyapi.io/v2/demo'] },
  },
};

export const sepolia = {
  id: 11155111,
  name: 'Sepolia',
  network: 'sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'SEP',
  },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia.org'] },
    public: { http: ['https://rpc.sepolia.org'] },
  },
};

export const localhost = {
  id: 31337,
  name: 'Localhost',
  network: 'localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
};

// Default export for compatibility
export default {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
  useWaitForTransaction,
  useNetwork,
  useSwitchNetwork,
  useEnsName,
  useEnsAddress,
  useSignMessage,
  useToken,
  WagmiConfig,
  createConfig,
  configureChains,
  mainnet,
  sepolia,
  localhost,
};
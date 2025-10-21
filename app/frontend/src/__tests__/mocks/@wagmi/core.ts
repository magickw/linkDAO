// Mock for @wagmi/core library to avoid ES module parsing issues in Jest

export const getAccount = jest.fn(() => ({
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

export const getNetwork = jest.fn(() => ({
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
}));

export const connect = jest.fn(async () => ({
  account: '0x1234567890123456789012345678901234567890',
  chain: {
    id: 1,
    name: 'Ethereum',
  },
  connector: {
    id: 'mock-connector',
    name: 'Mock Connector',
  },
}));

export const disconnect = jest.fn(async () => {});

export const switchNetwork = jest.fn(async () => ({
  id: 1,
  name: 'Ethereum',
}));

export const fetchBalance = jest.fn(async () => ({
  decimals: 18,
  formatted: '1.0',
  symbol: 'ETH',
  value: BigInt('1000000000000000000'),
}));

export const readContract = jest.fn(async () => null);

export const writeContract = jest.fn(async () => ({
  hash: '0x1234567890123456789012345678901234567890123456789012345678901234',
}));

export const prepareWriteContract = jest.fn(async () => ({
  request: {},
}));

export const waitForTransaction = jest.fn(async () => ({
  blockHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
  blockNumber: BigInt(1),
  contractAddress: null,
  cumulativeGasUsed: BigInt(21000),
  effectiveGasPrice: BigInt(20000000000),
  from: '0x1234567890123456789012345678901234567890',
  gasUsed: BigInt(21000),
  logs: [],
  logsBloom: '0x',
  status: 'success',
  to: '0x1234567890123456789012345678901234567890',
  transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
  transactionIndex: 0,
  type: 'legacy',
}));

export const signMessage = jest.fn(async () => '0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890');

export const fetchEnsName = jest.fn(async () => null);

export const fetchEnsAddress = jest.fn(async () => null);

export const fetchToken = jest.fn(async () => ({
  address: '0x1234567890123456789012345678901234567890',
  decimals: 18,
  name: 'Mock Token',
  symbol: 'MOCK',
  totalSupply: {
    formatted: '1000000',
    value: BigInt('1000000000000000000000000'),
  },
}));

export const multicall = jest.fn(async () => []);

export const watchAccount = jest.fn(() => () => {});

export const watchNetwork = jest.fn(() => () => {});

export const watchBlockNumber = jest.fn(() => () => {});

// Configuration
export const createConfig = jest.fn(() => ({
  autoConnect: true,
  connectors: [],
  publicClient: {},
  webSocketPublicClient: {},
}));

export const configureChains = jest.fn(() => ({
  chains: [],
  publicClient: {},
  webSocketPublicClient: {},
}));

// Default export for compatibility
export default {
  getAccount,
  getNetwork,
  connect,
  disconnect,
  switchNetwork,
  fetchBalance,
  readContract,
  writeContract,
  prepareWriteContract,
  waitForTransaction,
  signMessage,
  fetchEnsName,
  fetchEnsAddress,
  fetchToken,
  multicall,
  watchAccount,
  watchNetwork,
  watchBlockNumber,
  createConfig,
  configureChains,
};
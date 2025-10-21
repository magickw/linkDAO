// Mock for viem library to avoid ES module parsing issues in Jest

export const createPublicClient = jest.fn(() => ({
  readContract: jest.fn(),
  multicall: jest.fn(),
  getBalance: jest.fn(),
  getBlockNumber: jest.fn(),
  getTransaction: jest.fn(),
  getTransactionReceipt: jest.fn(),
  waitForTransactionReceipt: jest.fn(),
  simulateContract: jest.fn(),
  estimateGas: jest.fn(),
  getGasPrice: jest.fn(),
  getFeeHistory: jest.fn(),
}));

export const createWalletClient = jest.fn(() => ({
  writeContract: jest.fn(),
  sendTransaction: jest.fn(),
  signMessage: jest.fn(),
  signTypedData: jest.fn(),
  deployContract: jest.fn(),
  account: '0x1234567890123456789012345678901234567890',
  chain: {
    id: 1,
    name: 'Ethereum',
  },
}));

export const http = jest.fn(() => ({}));

export const webSocket = jest.fn(() => ({}));

export const parseEther = jest.fn((value: string) => BigInt(parseFloat(value) * 1e18));

export const formatEther = jest.fn((value: bigint) => (Number(value) / 1e18).toString());

export const parseUnits = jest.fn((value: string, decimals: number) => 
  BigInt(parseFloat(value) * Math.pow(10, decimals))
);

export const formatUnits = jest.fn((value: bigint, decimals: number) => 
  (Number(value) / Math.pow(10, decimals)).toString()
);

export const parseAbi = jest.fn((abi: string[]) => abi);

export const encodeFunctionData = jest.fn(() => '0x');

export const decodeFunctionResult = jest.fn(() => []);

export const encodeAbiParameters = jest.fn(() => '0x');

export const decodeAbiParameters = jest.fn(() => []);

export const keccak256 = jest.fn(() => '0x');

export const toHex = jest.fn((value: any) => `0x${value.toString(16)}`);

export const fromHex = jest.fn((value: string) => parseInt(value, 16));

export const isAddress = jest.fn((address: string) => 
  /^0x[a-fA-F0-9]{40}$/.test(address)
);

export const getAddress = jest.fn((address: string) => address.toLowerCase());

export const checksumAddress = jest.fn((address: string) => address);

export const zeroAddress = '0x0000000000000000000000000000000000000000';

export const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

// Chain definitions
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

// Error classes
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaseError';
  }
}

export class ContractFunctionExecutionError extends BaseError {
  constructor(message: string) {
    super(message);
    this.name = 'ContractFunctionExecutionError';
  }
}

export class TransactionExecutionError extends BaseError {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionExecutionError';
  }
}

// Default export for compatibility
export default {
  createPublicClient,
  createWalletClient,
  http,
  webSocket,
  parseEther,
  formatEther,
  parseUnits,
  formatUnits,
  parseAbi,
  encodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  decodeAbiParameters,
  keccak256,
  toHex,
  fromHex,
  isAddress,
  getAddress,
  checksumAddress,
  zeroAddress,
  maxUint256,
  mainnet,
  sepolia,
  localhost,
  BaseError,
  ContractFunctionExecutionError,
  TransactionExecutionError,
};
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { mockData, mockWeb3ServiceResponses, createMockWebSocket } from '../mocks/web3MockData';

/**
 * Web3-specific test setup
 * Configures mocks and utilities for Web3 component testing
 */

// Configure testing library for Web3 components
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 10000, // Longer timeout for Web3 operations
  computedStyleSupportsPseudoElements: true,
});

// Mock Web3 global objects
Object.defineProperty(window, 'ethereum', {
  writable: true,
  value: {
    request: jest.fn(() => Promise.resolve(['0x1234567890abcdef1234567890abcdef12345678'])),
    on: jest.fn(),
    removeListener: jest.fn(),
    isMetaMask: true,
    selectedAddress: '0x1234567890abcdef1234567890abcdef12345678',
    chainId: '0x1',
    networkVersion: '1',
    enable: jest.fn(() => Promise.resolve(['0x1234567890abcdef1234567890abcdef12345678'])),
    send: jest.fn(),
    sendAsync: jest.fn(),
  },
});

// Mock Web3 provider
Object.defineProperty(window, 'web3', {
  writable: true,
  value: {
    currentProvider: window.ethereum,
    eth: {
      getAccounts: jest.fn(() => Promise.resolve(['0x1234567890abcdef1234567890abcdef12345678'])),
      getBalance: jest.fn(() => Promise.resolve('1000000000000000000')), // 1 ETH
      getBlockNumber: jest.fn(() => Promise.resolve(18500000)),
      getGasPrice: jest.fn(() => Promise.resolve('20000000000')), // 20 gwei
    },
  },
});

// Mock WebSocket for real-time updates
global.WebSocket = jest.fn(() => createMockWebSocket()) as any;

// Mock crypto APIs for Web3
Object.defineProperty(global, 'crypto', {
  value: {
    ...global.crypto,
    getRandomValues: jest.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: jest.fn(() => '12345678-1234-1234-1234-123456789abc'),
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      sign: jest.fn(),
      verify: jest.fn(),
      generateKey: jest.fn(),
      importKey: jest.fn(),
      exportKey: jest.fn(),
      deriveBits: jest.fn(),
      deriveKey: jest.fn(),
    },
  },
});

// Mock BigInt for Web3 calculations
if (typeof BigInt === 'undefined') {
  global.BigInt = jest.fn((value: any) => ({
    toString: () => value.toString(),
    valueOf: () => Number(value),
  })) as any;
}

// Mock performance API for Web3 performance testing
Object.defineProperty(window, 'performance', {
  value: {
    ...window.performance,
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    },
  },
});

// Mock navigator for Web3 features
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Web3TestEnvironment) AppleWebKit/537.36',
  writable: true,
});

Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  writable: true,
});

// Mock clipboard API for address copying
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('0x1234567890abcdef')),
  },
  writable: true,
});

// Mock geolocation for location-based features
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 100,
        },
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
  writable: true,
});

// Mock network information
Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
  },
  writable: true,
});

// Mock Web3 service modules
jest.mock('@/services/web3/tokenService', () => mockWeb3ServiceResponses);
jest.mock('@/services/web3/governanceService', () => mockWeb3ServiceResponses);
jest.mock('@/services/web3/stakingService', () => mockWeb3ServiceResponses);
jest.mock('@/services/web3/onChainVerificationService', () => mockWeb3ServiceResponses);

// Mock Web3 hooks
jest.mock('@/hooks/useWeb3', () => ({
  useWeb3: () => ({
    address: '0x1234567890abcdef1234567890abcdef12345678',
    isConnected: true,
    chainId: 1,
    balance: '1.0',
    connect: jest.fn(),
    disconnect: jest.fn(),
    switchNetwork: jest.fn(),
  }),
}));

jest.mock('@/hooks/useTokenPrice', () => ({
  useTokenPrice: () => ({
    price: mockData.token.priceUSD,
    change24h: mockData.token.priceChange24h,
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/hooks/useStaking', () => ({
  useStaking: () => ({
    stakingInfo: mockData.stakingInfo,
    stake: jest.fn(),
    unstake: jest.fn(),
    isLoading: false,
    error: null,
  }),
}));

// Mock React Query for Web3 data fetching
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(() => ({
    data: mockData.token,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isLoading: false,
    error: null,
  })),
  QueryClient: jest.fn(() => ({
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  })),
  QueryClientProvider: ({ children }: any) => children,
}));

// Mock framer-motion for animations
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
  }),
}));

// Mock chart libraries for analytics
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

// Global test utilities for Web3
global.web3TestUtils = {
  // Format addresses for testing
  formatAddress: (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`,
  
  // Format token amounts
  formatTokenAmount: (amount: number, decimals = 18) => 
    (amount / Math.pow(10, decimals)).toFixed(4),
  
  // Generate random addresses
  generateAddress: () => 
    '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
  
  // Generate transaction hashes
  generateTxHash: () => 
    '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
  
  // Wait for Web3 operations
  waitForWeb3: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock transaction receipt
  mockTransactionReceipt: {
    transactionHash: '0xabc123def456',
    blockNumber: 18500001,
    gasUsed: '21000',
    status: 1,
  },
};

// Custom matchers for Web3 testing
expect.extend({
  toBeValidAddress(received: string) {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(received);
    return {
      message: () => `expected ${received} to be a valid Ethereum address`,
      pass: isValid,
    };
  },
  
  toBeValidTxHash(received: string) {
    const isValid = /^0x[a-fA-F0-9]{64}$/.test(received);
    return {
      message: () => `expected ${received} to be a valid transaction hash`,
      pass: isValid,
    };
  },
  
  toHaveWeb3Props(received: any, expectedProps: string[]) {
    const hasAllProps = expectedProps.every(prop => prop in received);
    return {
      message: () => `expected object to have Web3 properties: ${expectedProps.join(', ')}`,
      pass: hasAllProps,
    };
  },
});

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidAddress(): R;
      toBeValidTxHash(): R;
      toHaveWeb3Props(expectedProps: string[]): R;
    }
  }
  
  var web3TestUtils: {
    formatAddress: (address: string) => string;
    formatTokenAmount: (amount: number, decimals?: number) => string;
    generateAddress: () => string;
    generateTxHash: () => string;
    waitForWeb3: (ms?: number) => Promise<void>;
    mockTransactionReceipt: any;
  };
}

// Setup and teardown hooks
beforeAll(() => {
  console.log('🔧 Setting up Web3 test environment...');
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Reset Web3 state
  if (window.ethereum) {
    (window.ethereum as any).selectedAddress = '0x1234567890abcdef1234567890abcdef12345678';
    (window.ethereum as any).chainId = '0x1';
  }
});

afterEach(() => {
  // Clean up any pending timers
  jest.clearAllTimers();
  
  // Clean up DOM
  document.body.innerHTML = '';
});

afterAll(() => {
  console.log('✅ Web3 test environment cleaned up');
});
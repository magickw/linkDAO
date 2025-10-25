// Add TextEncoder and TextDecoder polyfills for Node.js < 16
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useConnect: jest.fn(),
  useChainId: jest.fn(),
  useSwitchChain: jest.fn()
}));
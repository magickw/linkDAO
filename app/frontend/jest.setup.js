// Add TextEncoder and TextDecoder polyfills for Node.js < 16
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Use Node.js built-in webcrypto module for proper crypto support
if (typeof global.crypto === 'undefined' || !global.crypto.getRandomValues) {
  const webcrypto = require('crypto').webcrypto;
  global.crypto = webcrypto;
}

// Ensure crypto is available globally
global.crypto = global.crypto || {};

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useConnect: jest.fn(),
  useChainId: jest.fn(),
  useSwitchChain: jest.fn()
}));
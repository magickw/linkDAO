import '@testing-library/jest-dom';

// Polyfills for viem
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
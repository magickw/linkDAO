const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'Seller Integration Tests',
  testMatch: [
    '<rootDir>/src/__tests__/integration/seller/**/*.test.{ts,tsx}'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/integration/seller/setup/sellerTestSetup.ts',
    '<rootDir>/src/__tests__/integration/seller/setup/customMatchers.ts'
  ],
  testTimeout: 60000, // 60 seconds for integration tests
  
  // Transform ignore patterns to handle Web3 ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(wagmi|@wagmi|viem|abitype|@tanstack/react-query|@rainbow-me|@walletconnect|@coinbase|@metamask|@noble|@scure|@adraffy|@safe-global|@stablelib|@lit-protocol|@web3modal)/)'
  ],
  
  // Module transformation
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Extensible module formats
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  collectCoverageFrom: [
    'src/components/Marketplace/Seller/**/*.{ts,tsx}',
    'src/services/seller*.{ts,tsx}',
    'src/services/unified*.{ts,tsx}',
    'src/hooks/useSeller*.{ts,tsx}',
    'src/hooks/useUnified*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/mocks/**',
    '!src/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    // Seller-specific components
    './src/services/unifiedSellerAPIClient.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/sellerCacheManager.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/sellerService.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/components/Marketplace/Seller/SellerOnboarding.tsx': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/components/Marketplace/Seller/SellerProfilePage.tsx': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/components/Marketplace/Dashboard/SellerDashboard.tsx': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/components/Marketplace/Seller/SellerStorePage.tsx': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  coverageDirectory: '<rootDir>/coverage/seller-integration',
  
  // Test environment configuration
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Mock WebSocket and other browser APIs for testing
  setupFiles: [
    '<rootDir>/src/__tests__/integration/seller/setup/sellerMocks.ts'
  ],
  
  // Module name mapping for seller-specific imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/context/(.*)$': '<rootDir>/src/context/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/contracts/(.*)$': '<rootDir>/src/types/typechain/$1',
    '^@/seller/(.*)$': '<rootDir>/src/components/Marketplace/Seller/$1',
    '^@/marketplace/(.*)$': '<rootDir>/src/components/Marketplace/$1',
    '^@/seller-services/(.*)$': '<rootDir>/src/services/seller$1',
    // Mock CSS and static files
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/__tests__/__mocks__/fileMock.js',
    
    // Mock wagmi and Web3 modules
    '^wagmi$': '<rootDir>/src/__tests__/mocks/wagmi.ts',
    '^@wagmi/core$': '<rootDir>/src/__tests__/mocks/@wagmi/core.ts',
    '^viem$': '<rootDir>/src/__tests__/mocks/viem.ts',
    '^@rainbow-me/rainbowkit$': '<rootDir>/src/__tests__/mocks/rainbowkit.ts',
  },
  
  // Verbose output for integration tests
  verbose: true,
  
  // Fail fast on first test failure in CI
  bail: process.env.CI ? 1 : 0,
  
  // Parallel test execution
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // Performance monitoring
  reporters: [
    'default',
    ['<rootDir>/src/__tests__/integration/seller/setup/testResultsProcessor.js', {}]
  ],
  
  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest/seller-integration',
  
  // Clear cache before running tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/test-reports/',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);